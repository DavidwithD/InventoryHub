using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryHub.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCurrencyTypeAndExchangeRateFromInventory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "currency_type",
                table: "inventory");

            migrationBuilder.DropColumn(
                name: "exchange_rate",
                table: "inventory");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "currency_type",
                table: "inventory",
                type: "varchar(10)",
                maxLength: 10,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "exchange_rate",
                table: "inventory",
                type: "decimal(10,4)",
                nullable: true);
        }
    }
}
