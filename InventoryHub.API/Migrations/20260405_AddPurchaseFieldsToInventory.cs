using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InventoryHub.API.Migrations
{
    public partial class _20260405_AddPurchaseFieldsToInventory : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "currency_type",
                table: "inventory",
                type: "varchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "exchange_rate",
                table: "inventory",
                type: "decimal(10,4)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "purchase_total_amount",
                table: "inventory",
                type: "decimal(15,2)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "supplier_id",
                table: "inventory");

            migrationBuilder.DropColumn(
                name: "purchase_date",
                table: "inventory");

            migrationBuilder.DropColumn(
                name: "purchase_no",
                table: "inventory");

            migrationBuilder.DropColumn(
                name: "currency_type",
                table: "inventory");

            migrationBuilder.DropColumn(
                name: "exchange_rate",
                table: "inventory");

            migrationBuilder.DropColumn(
                name: "purchase_total_amount",
                table: "inventory");
        }
    }
}
