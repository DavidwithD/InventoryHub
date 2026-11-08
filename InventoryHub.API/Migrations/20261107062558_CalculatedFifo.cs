using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryHub.API.Migrations
{
    /// <summary>
    /// Stores starting stock on each batch and removes stored batch links and costs.
    /// FIFO calculates those values when they are read.
    /// </summary>
    /// <remarks>
    /// MySQL commits each schema change on its own, so a failed run can stop halfway.
    /// Every step checks the schema first, and the data steps read the backup tables.
    /// A second run then finishes the work and gives the same result.
    /// </remarks>
    public partial class CalculatedFifo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Keep the old values for comparison and manual recovery.
            // A second run keeps the first copy, which holds the data from before the merge.
            migrationBuilder.Sql("CREATE TABLE IF NOT EXISTS order_details_pre_fifo AS SELECT * FROM order_details;");
            migrationBuilder.Sql("CREATE TABLE IF NOT EXISTS inventory_pre_fifo AS SELECT * FROM inventory;");

            RunIfNot(migrationBuilder, "add_initial_stock",
                ColumnExists("inventory", "initial_stock"),
                "ALTER TABLE inventory ADD COLUMN initial_stock int NOT NULL DEFAULT 0");

            // Starting stock is old stock plus the units sold from the batch.
            migrationBuilder.Sql(@"
                UPDATE inventory i
                JOIN inventory_pre_fifo old ON old.id = i.id
                LEFT JOIN (
                    SELECT d.inventory_id, SUM(d.quantity) AS sold
                    FROM order_details_pre_fifo d
                    JOIN orders o ON o.id = d.order_id
                    WHERE d.is_deleted = 0 AND o.is_deleted = 0
                    GROUP BY d.inventory_id
                ) s ON s.inventory_id = i.id
                SET i.initial_stock = old.stock_quantity + COALESCE(s.sold, 0);");

            // Merge lines for the same order and product into the lowest line id.
            // The default GROUP_CONCAT limit of 1024 bytes would cut long notes.
            migrationBuilder.Sql(@"
                SET SESSION group_concat_max_len = 1000000;
                UPDATE order_details keep
                JOIN (
                    SELECT MIN(id) AS keep_id,
                           SUM(quantity) AS quantity,
                           SUM(packaging_cost) AS packaging_cost,
                           SUM(other_cost) AS other_cost,
                           GROUP_CONCAT(NULLIF(notes, '') ORDER BY id SEPARATOR '; ') AS notes
                    FROM order_details_pre_fifo
                    WHERE is_deleted = 0
                    GROUP BY order_id, product_id
                    HAVING COUNT(*) > 1
                ) merged ON merged.keep_id = keep.id
                SET keep.quantity = merged.quantity,
                    keep.packaging_cost = merged.packaging_cost,
                    keep.other_cost = merged.other_cost,
                    keep.notes = merged.notes;");

            migrationBuilder.Sql(@"
                UPDATE order_details extra
                JOIN (
                    SELECT MIN(id) AS keep_id, order_id, product_id
                    FROM order_details_pre_fifo
                    WHERE is_deleted = 0
                    GROUP BY order_id, product_id
                    HAVING COUNT(*) > 1
                ) merged ON merged.order_id = extra.order_id AND merged.product_id = extra.product_id
                SET extra.is_deleted = 1
                WHERE extra.is_deleted = 0 AND extra.id <> merged.keep_id;");

            // The foreign key and check names differ between databases, so read them from the schema.
            migrationBuilder.Sql(@"
                SET @drop_fk = COALESCE((
                    SELECT CONCAT('ALTER TABLE order_details DROP FOREIGN KEY `', CONSTRAINT_NAME, '`')
                    FROM information_schema.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'order_details'
                      AND COLUMN_NAME = 'inventory_id'
                      AND REFERENCED_TABLE_NAME IS NOT NULL
                    LIMIT 1), 'SELECT 1');
                PREPARE drop_fk FROM @drop_fk;
                EXECUTE drop_fk;
                DEALLOCATE PREPARE drop_fk;");

            migrationBuilder.Sql(@"
                SET @drop_check = COALESCE((
                    SELECT CONCAT('ALTER TABLE inventory DROP CHECK `', tc.CONSTRAINT_NAME, '`')
                    FROM information_schema.TABLE_CONSTRAINTS tc
                    JOIN information_schema.CHECK_CONSTRAINTS cc
                      ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
                     AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
                    WHERE tc.TABLE_SCHEMA = DATABASE()
                      AND tc.TABLE_NAME = 'inventory'
                      AND tc.CONSTRAINT_TYPE = 'CHECK'
                      AND cc.CHECK_CLAUSE LIKE '%stock_quantity%'
                    LIMIT 1), 'SELECT 1');
                PREPARE drop_check FROM @drop_check;
                EXECUTE drop_check;
                DEALLOCATE PREPARE drop_check;");

            RunIf(migrationBuilder, "drop_idx_inventory",
                IndexExists("order_details", "idx_inventory_id"),
                "ALTER TABLE order_details DROP INDEX `idx_inventory_id`");

            RunIf(migrationBuilder, "drop_idx_order_inventory",
                IndexExists("order_details", "idx_order_details_order_inventory"),
                "ALTER TABLE order_details DROP INDEX `idx_order_details_order_inventory`");

            RunIf(migrationBuilder, "drop_inventory_id",
                ColumnExists("order_details", "inventory_id"),
                "ALTER TABLE order_details DROP COLUMN `inventory_id`");

            RunIf(migrationBuilder, "drop_subtotal_cost",
                ColumnExists("order_details", "subtotal_cost"),
                "ALTER TABLE order_details DROP COLUMN `subtotal_cost`");

            RunIf(migrationBuilder, "drop_unit_price",
                ColumnExists("order_details", "unit_price"),
                "ALTER TABLE order_details DROP COLUMN `unit_price`");

            RunIf(migrationBuilder, "drop_stock_quantity",
                ColumnExists("inventory", "stock_quantity"),
                "ALTER TABLE inventory DROP COLUMN `stock_quantity`");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException(
                "This migration merges order details and cannot be reversed. Restore a database backup instead.");
        }

        private static string ColumnExists(string table, string column) => $@"
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table}' AND COLUMN_NAME = '{column}'";

        private static string IndexExists(string table, string index) => $@"
            SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table}' AND INDEX_NAME = '{index}'";

        // Runs the statement when the count query returns more than 0.
        private static void RunIf(MigrationBuilder migrationBuilder, string name, string countQuery, string statement) =>
            migrationBuilder.Sql($@"
                SET @{name} = IF(({countQuery}) > 0, '{statement}', 'SELECT 1');
                PREPARE {name} FROM @{name};
                EXECUTE {name};
                DEALLOCATE PREPARE {name};");

        // Runs the statement when the count query returns 0.
        private static void RunIfNot(MigrationBuilder migrationBuilder, string name, string countQuery, string statement) =>
            migrationBuilder.Sql($@"
                SET @{name} = IF(({countQuery}) = 0, '{statement}', 'SELECT 1');
                PREPARE {name} FROM @{name};
                EXECUTE {name};
                DEALLOCATE PREPARE {name};");
    }
}
