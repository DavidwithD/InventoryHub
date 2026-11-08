using AutoMapper;
using InventoryHub.API.Data;
using InventoryHub.API.Mappings;
using InventoryHub.API.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.Tests.Support;

// An in-memory SQLite database for one test. It lives as long as the open connection.
public sealed class TestDb : IDisposable
{
    private readonly SqliteConnection _connection;

    public TestDb()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        using var context = NewContext();
        context.Database.EnsureCreated();
    }

    public static IMapper Mapper { get; } =
        new MapperConfiguration(c => c.AddProfile<MappingProfile>()).CreateMapper();

    // Each call returns a new context. Use a second context to check what was saved.
    public AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);

    public void Dispose() => _connection.Dispose();

    public Product AddProduct(string name = "Card", string category = "Cards")
    {
        using var context = NewContext();
        var categoryRow = context.Categories.FirstOrDefault(c => c.Name == category)
            ?? context.Categories.Add(new Category { Name = category }).Entity;
        var product = new Product { Name = name, Category = categoryRow };
        context.Products.Add(product);
        context.SaveChanges();
        return product;
    }

    public Supplier AddSupplier(string name)
    {
        using var context = NewContext();
        var supplier = context.Suppliers.Add(new Supplier { Name = name }).Entity;
        context.SaveChanges();
        return supplier;
    }

    public Inventory AddBatch(int productId, DateTime? purchaseDate, int stock, decimal priceJpy, int? supplierId = null)
    {
        using var context = NewContext();
        var batch = new Inventory
        {
            ProductId = productId,
            PurchaseDate = purchaseDate,
            PurchaseQuantity = stock,
            InitialStock = stock,
            PriceJpy = priceJpy,
            SupplierId = supplierId
        };
        context.Inventory.Add(batch);
        context.SaveChanges();
        return batch;
    }

    public Order AddOrder(string orderNo, DateTime time, decimal revenue, params (int productId, int quantity)[] lines)
    {
        using var context = NewContext();
        var order = new Order
        {
            OrderNo = orderNo,
            Revenue = revenue,
            TransactionTime = time,
            OrderDetails = lines
                .Select(l => new OrderDetail { ProductId = l.productId, Quantity = l.quantity })
                .ToList()
        };
        context.Orders.Add(order);
        context.SaveChanges();
        return order;
    }
}
