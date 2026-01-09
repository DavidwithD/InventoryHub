using InventoryHub.API.Models;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Category> Categories { get; set; }
    public DbSet<Supplier> Suppliers { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Purchase> Purchases { get; set; }
    public DbSet<Inventory> Inventory { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderDetail> OrderDetails { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Category configuration
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);

            entity.HasIndex(e => new { e.Name, e.IsDeleted }).HasDatabaseName("unique_category_name").IsUnique();
        });

        // Supplier configuration
        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.ToTable("suppliers");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);

            entity.HasIndex(e => new { e.Name, e.IsDeleted }).HasDatabaseName("unique_supplier_name").IsUnique();
        });

        // Product configuration
        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);

            entity.HasOne(p => p.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.CategoryId).HasDatabaseName("idx_category_id");
        });

        // Purchase configuration
        modelBuilder.Entity<Purchase>(entity =>
        {
            entity.ToTable("purchases");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.SupplierId).HasColumnName("supplier_id").IsRequired();
            entity.Property(e => e.PurchaseDate).HasColumnName("purchase_date").IsRequired();
            entity.Property(e => e.PurchaseNo).HasColumnName("purchase_no").HasMaxLength(100).IsRequired();
            entity.Property(e => e.TotalAmount).HasColumnName("total_amount").HasColumnType("decimal(15,2)").IsRequired();
            entity.Property(e => e.CurrencyType).HasColumnName("currency_type").HasMaxLength(10).IsRequired();
            entity.Property(e => e.ExchangeRate).HasColumnName("exchange_rate").HasColumnType("decimal(10,4)").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);

            entity.HasOne(p => p.Supplier)
                .WithMany(s => s.Purchases)
                .HasForeignKey(p => p.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.PurchaseNo).HasDatabaseName("unique_purchase_no").IsUnique();
            entity.HasIndex(e => e.SupplierId).HasDatabaseName("idx_supplier_id");
            entity.HasIndex(e => e.PurchaseDate).HasDatabaseName("idx_purchase_date");
        });

        // Inventory configuration
        modelBuilder.Entity<Inventory>(entity =>
        {
            entity.ToTable("inventory");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ProductId).HasColumnName("product_id").IsRequired();
            entity.Property(e => e.PurchaseId).HasColumnName("purchase_id").IsRequired();
            entity.Property(e => e.PurchaseAmount).HasColumnName("purchase_amount").HasColumnType("decimal(15,2)").IsRequired();
            entity.Property(e => e.PurchaseAmountCny).HasColumnName("purchase_amount_cny").HasColumnType("decimal(15,2)").IsRequired();
            entity.Property(e => e.PurchaseQuantity).HasColumnName("purchase_quantity").IsRequired();
            entity.Property(e => e.UnitCost).HasColumnName("unit_cost").HasColumnType("decimal(15,2)").IsRequired();
            entity.Property(e => e.StockQuantity).HasColumnName("stock_quantity").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);

            entity.HasOne(i => i.Product)
                .WithMany(p => p.Inventories)
                .HasForeignKey(i => i.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(i => i.Purchase)
                .WithMany(p => p.InventoryItems)
                .HasForeignKey(i => i.PurchaseId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.ProductId).HasDatabaseName("idx_product_id");
            entity.HasIndex(e => e.PurchaseId).HasDatabaseName("idx_purchase_id");
        });

        // Order configuration
        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.OrderNo).HasColumnName("order_no").HasMaxLength(100).IsRequired();
            entity.Property(e => e.ImageUrl).HasColumnName("image_url").HasMaxLength(500);
            entity.Property(e => e.Revenue).HasColumnName("revenue").HasColumnType("decimal(15,2)").IsRequired();
            entity.Property(e => e.TotalCost).HasColumnName("total_cost").HasColumnType("decimal(15,2)");
            entity.Property(e => e.ShippingFee).HasColumnName("shipping_fee").HasColumnType("decimal(15,2)").HasDefaultValue(0);
            entity.Property(e => e.TransactionTime).HasColumnName("transaction_time").IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);

            entity.HasIndex(e => e.OrderNo).HasDatabaseName("unique_order_no").IsUnique();
            entity.HasIndex(e => e.TransactionTime).HasDatabaseName("idx_transaction_time");
            entity.HasIndex(e => new { e.TotalCost, e.TransactionTime }).HasDatabaseName("idx_orders_cost_time");
        });

        // OrderDetail configuration
        modelBuilder.Entity<OrderDetail>(entity =>
        {
            entity.ToTable("order_details");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.OrderId).HasColumnName("order_id").IsRequired();
            entity.Property(e => e.InventoryId).HasColumnName("inventory_id").IsRequired();
            entity.Property(e => e.ProductId).HasColumnName("product_id").IsRequired();
            entity.Property(e => e.UnitPrice).HasColumnName("unit_price").HasColumnType("decimal(15,2)").IsRequired();
            entity.Property(e => e.Quantity).HasColumnName("quantity").IsRequired();
            entity.Property(e => e.PackagingCost).HasColumnName("packaging_cost").HasColumnType("decimal(15,2)").HasDefaultValue(0);
            entity.Property(e => e.OtherCost).HasColumnName("other_cost").HasColumnType("decimal(15,2)").HasDefaultValue(0);
            entity.Property(e => e.SubtotalCost).HasColumnName("subtotal_cost").HasColumnType("decimal(15,2)").IsRequired();
            entity.Property(e => e.Notes).HasColumnName("notes").HasColumnType("text");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);

            entity.HasOne(od => od.Order)
                .WithMany(o => o.OrderDetails)
                .HasForeignKey(od => od.OrderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(od => od.Inventory)
                .WithMany(i => i.OrderDetails)
                .HasForeignKey(od => od.InventoryId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(od => od.Product)
                .WithMany(p => p.OrderDetails)
                .HasForeignKey(od => od.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.OrderId).HasDatabaseName("idx_order_id");
            entity.HasIndex(e => e.InventoryId).HasDatabaseName("idx_inventory_id");
            entity.HasIndex(e => e.ProductId).HasDatabaseName("idx_product_id");
            entity.HasIndex(e => new { e.OrderId, e.InventoryId }).HasDatabaseName("idx_order_details_order_inventory");
        });
    }
}
