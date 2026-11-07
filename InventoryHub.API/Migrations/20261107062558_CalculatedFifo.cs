using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryHub.API.Migrations
{
    /// <summary>
    /// Stores starting stock on each batch and removes stored batch links and costs.
    /// FIFO calculates those values when they are read.
    /// </summary>
    public partial class CalculatedFifo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Keep the old values for comparison and manual recovery.
            migrationBuilder.Sql("CREATE TABLE order_details_pre_fifo AS SELECT * FROM order_details;");
            migrationBuilder.Sql("CREATE TABLE inventory_pre_fifo AS SELECT * FROM inventory;");

            migrationBuilder.AddColumn<int>(
                name: "initial_stock",
                table: "inventory",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Starting stock is current stock plus the units sold from the batch.
            migrationBuilder.Sql(@"
                UPDATE inventory i
                LEFT JOIN (
                    SELECT d.inventory_id, SUM(d.quantity) AS sold
                    FROM order_details d
                    JOIN orders o ON o.id = d.order_id
                    WHERE d.is_deleted = 0 AND o.is_deleted = 0
                    GROUP BY d.inventory_id
                ) s ON s.inventory_id = i.id
                SET i.initial_stock = i.stock_quantity + COALESCE(s.sold, 0);");

            // Merge lines for the same order and product into the lowest line id.
            migrationBuilder.Sql(@"
                UPDATE order_details keep
                JOIN (
                    SELECT MIN(id) AS keep_id,
                           SUM(quantity) AS quantity,
                           SUM(packaging_cost) AS packaging_cost,
                           SUM(other_cost) AS other_cost,
                           GROUP_CONCAT(NULLIF(notes, '') ORDER BY id SEPARATOR '; ') AS notes
                    FROM order_details
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
                    FROM order_details
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

            migrationBuilder.DropIndex(
                name: "idx_inventory_id",
                table: "order_details");

            migrationBuilder.DropIndex(
                name: "idx_order_details_order_inventory",
                table: "order_details");

            migrationBuilder.DropColumn(
                name: "inventory_id",
                table: "order_details");

            migrationBuilder.DropColumn(
                name: "subtotal_cost",
                table: "order_details");

            migrationBuilder.DropColumn(
                name: "unit_price",
                table: "order_details");

            migrationBuilder.DropColumn(
                name: "stock_quantity",
                table: "inventory");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException(
                "This migration merges order details and cannot be reversed. Restore a database backup instead.");
        }
    }
}
