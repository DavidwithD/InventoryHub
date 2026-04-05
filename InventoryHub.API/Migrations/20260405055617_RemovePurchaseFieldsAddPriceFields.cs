using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryHub.API.Migrations
{
    /// <inheritdoc />
    public partial class RemovePurchaseFieldsAddPriceFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // FK name as created by raw SQL (not EF convention)
            migrationBuilder.DropForeignKey(
                name: "inventory_ibfk_2",
                table: "inventory");

            migrationBuilder.DropIndex(
                name: "idx_purchase_id",
                table: "inventory");

            migrationBuilder.DropColumn(
                name: "purchase_amount",
                table: "inventory");

            migrationBuilder.DropColumn(
                name: "purchase_amount_cny",
                table: "inventory");

            migrationBuilder.DropColumn(
                name: "purchase_id",
                table: "inventory");

            // purchase_total_amount was never applied to the DB (20260405_AddPurchaseFieldsToInventory
            // was registered in history but not executed), so we skip dropping it.

            migrationBuilder.RenameColumn(
                name: "unit_cost",
                table: "inventory",
                newName: "price_jpy");

            // Add price_cny (new field)
            migrationBuilder.AddColumn<decimal>(
                name: "price_cny",
                table: "inventory",
                type: "decimal(15,2)",
                nullable: true);

            // Add denormalized purchase-level fields that were never applied to DB
            migrationBuilder.AddColumn<int>(
                name: "supplier_id",
                table: "inventory",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "purchase_date",
                table: "inventory",
                type: "datetime",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "purchase_no",
                table: "inventory",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "price_cny",
                table: "inventory");

            migrationBuilder.RenameColumn(
                name: "price_jpy",
                table: "inventory",
                newName: "unit_cost");

            migrationBuilder.AddColumn<decimal>(
                name: "purchase_total_amount",
                table: "inventory",
                type: "decimal(15,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "purchase_amount",
                table: "inventory",
                type: "decimal(15,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "purchase_amount_cny",
                table: "inventory",
                type: "decimal(15,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "purchase_id",
                table: "inventory",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "idx_purchase_id",
                table: "inventory",
                column: "purchase_id");

            migrationBuilder.AddForeignKey(
                name: "FK_inventory_purchases_purchase_id",
                table: "inventory",
                column: "purchase_id",
                principalTable: "purchases",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
