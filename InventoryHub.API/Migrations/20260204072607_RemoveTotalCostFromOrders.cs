using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryHub.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveTotalCostFromOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_orders_cost_time",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "total_cost",
                table: "orders");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "total_cost",
                table: "orders",
                type: "decimal(15,2)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "idx_orders_cost_time",
                table: "orders",
                columns: new[] { "total_cost", "transaction_time" });
        }
    }
}
