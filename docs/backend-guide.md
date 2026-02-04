# Backend Guide

This document describes the backend architecture, services, and development patterns used in InventoryHub.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| ASP.NET Core | 9.0 | Web framework |
| C# | 13.0 | Programming language |
| Entity Framework Core | 9.0.0 | ORM |
| Pomelo.EntityFrameworkCore.MySql | 9.0.0 | MySQL provider |
| AutoMapper | 12.0.1 | Object mapping |
| MySQL | 8.x | Database |

## Project Structure

```
InventoryHub.API/
├── Controllers/              # API endpoints
│   ├── OrdersController.cs
│   ├── InventoryController.cs
│   ├── PurchaseController.cs
│   ├── ProductController.cs
│   ├── CategoryController.cs
│   ├── SupplierController.cs
│   └── DashboardController.cs
│
├── Services/                 # Business logic
│   ├── OrderService.cs
│   ├── InventoryService.cs
│   ├── PurchaseService.cs
│   ├── ProductService.cs
│   ├── CategoryService.cs
│   ├── SupplierService.cs
│   ├── MercariService.cs
│   └── DashboardService.cs
│
├── Models/                   # Entity models
│   ├── BaseEntity.cs
│   ├── Category.cs
│   ├── Supplier.cs
│   ├── Product.cs
│   ├── Purchase.cs
│   ├── Inventory.cs
│   ├── Order.cs
│   └── OrderDetail.cs
│
├── DTOs/                     # Data transfer objects
│   ├── CategoryDto.cs
│   ├── SupplierDto.cs
│   ├── ProductDto.cs
│   ├── PurchaseDto.cs
│   ├── InventoryDto.cs
│   ├── OrderDto.cs
│   └── OrderDetailDto.cs
│
├── Data/                     # Database context
│   └── AppDbContext.cs
│
├── Mappings/                 # AutoMapper profiles
│   └── MappingProfile.cs
│
├── Properties/
│   └── launchSettings.json
│
├── appsettings.json          # Configuration
├── appsettings.Development.json
└── Program.cs                # Application startup
```

## Entity Models

### BaseEntity

All entities inherit from BaseEntity:

```csharp
// Models/BaseEntity.cs
public class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
}
```

### Category

```csharp
// Models/Category.cs
public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    // Navigation property
    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
```

### Product

```csharp
// Models/Product.cs
public class Product : BaseEntity
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;

    // Navigation properties
    public virtual Category Category { get; set; } = null!;
    public virtual ICollection<Inventory> InventoryItems { get; set; } = new List<Inventory>();
}
```

### Purchase

```csharp
// Models/Purchase.cs
public class Purchase : BaseEntity
{
    public int SupplierId { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string PurchaseNo { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string CurrencyType { get; set; } = "JPY";
    public decimal ExchangeRate { get; set; } = 1.0m;

    // Navigation properties
    public virtual Supplier Supplier { get; set; } = null!;
    public virtual ICollection<Inventory> InventoryItems { get; set; } = new List<Inventory>();
}
```

### Inventory

```csharp
// Models/Inventory.cs
public class Inventory : BaseEntity
{
    public int ProductId { get; set; }
    public int PurchaseId { get; set; }
    public decimal PurchaseAmountJpy { get; set; }
    public decimal? PurchaseAmountCny { get; set; }
    public int PurchaseQuantity { get; set; }
    public decimal UnitCost { get; set; }
    public int StockQuantity { get; set; }

    // Navigation properties
    public virtual Product Product { get; set; } = null!;
    public virtual Purchase Purchase { get; set; } = null!;
    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}
```

### Order

```csharp
// Models/Order.cs
public class Order : BaseEntity
{
    public string OrderNo { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? ImageUrl { get; set; }
    public decimal Revenue { get; set; }
    public decimal? TotalCost { get; set; }
    public decimal? ShippingFee { get; set; }
    public DateTime TransactionTime { get; set; }

    // Navigation property
    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}
```

### OrderDetail

```csharp
// Models/OrderDetail.cs
public class OrderDetail : BaseEntity
{
    public int OrderId { get; set; }
    public int InventoryId { get; set; }
    public int ProductId { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal PackagingCost { get; set; } = 0;
    public decimal OtherCost { get; set; } = 0;
    public decimal SubtotalCost { get; set; }
    public string? Notes { get; set; }

    // Navigation properties
    public virtual Order Order { get; set; } = null!;
    public virtual Inventory Inventory { get; set; } = null!;
    public virtual Product Product { get; set; } = null!;
}
```

## Database Context

```csharp
// Data/AppDbContext.cs
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

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
            entity.HasIndex(e => e.Name).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
        });

        // Product configuration
        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasIndex(e => e.CategoryId);
            entity.HasOne(p => p.Category)
                  .WithMany(c => c.Products)
                  .HasForeignKey(p => p.CategoryId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Purchase configuration
        modelBuilder.Entity<Purchase>(entity =>
        {
            entity.ToTable("purchases");
            entity.HasIndex(e => e.PurchaseNo).IsUnique();
            entity.HasIndex(e => e.SupplierId);
            entity.HasIndex(e => e.PurchaseDate);
            entity.Property(e => e.TotalAmount).HasPrecision(15, 2);
            entity.Property(e => e.ExchangeRate).HasPrecision(10, 4);
        });

        // Inventory configuration
        modelBuilder.Entity<Inventory>(entity =>
        {
            entity.ToTable("inventory");
            entity.HasIndex(e => e.ProductId);
            entity.HasIndex(e => e.PurchaseId);
            entity.Property(e => e.PurchaseAmountJpy).HasPrecision(15, 2);
            entity.Property(e => e.UnitCost).HasPrecision(15, 2);
            entity.HasOne(i => i.Product)
                  .WithMany(p => p.InventoryItems)
                  .HasForeignKey(i => i.ProductId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(i => i.Purchase)
                  .WithMany(p => p.InventoryItems)
                  .HasForeignKey(i => i.PurchaseId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Order configuration
        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
            entity.HasIndex(e => e.OrderNo).IsUnique();
            entity.HasIndex(e => e.TransactionTime);
            entity.Property(e => e.Revenue).HasPrecision(15, 2);
            entity.Property(e => e.TotalCost).HasPrecision(15, 2);
        });

        // OrderDetail configuration
        modelBuilder.Entity<OrderDetail>(entity =>
        {
            entity.ToTable("order_details");
            entity.HasIndex(e => e.OrderId);
            entity.HasIndex(e => e.InventoryId);
            entity.HasOne(d => d.Order)
                  .WithMany(o => o.OrderDetails)
                  .HasForeignKey(d => d.OrderId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(d => d.Inventory)
                  .WithMany(i => i.OrderDetails)
                  .HasForeignKey(d => d.InventoryId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Global query filter for soft delete
        modelBuilder.Entity<Category>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Supplier>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Product>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Purchase>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Inventory>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Order>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<OrderDetail>().HasQueryFilter(e => !e.IsDeleted);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Update timestamps
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
```

## Services

### OrderService

```csharp
// Services/OrderService.cs
public class OrderService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public OrderService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<OrderDto>> GetAllOrdersAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.Orders.AsQueryable();

        if (startDate.HasValue)
            query = query.Where(o => o.TransactionTime >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(o => o.TransactionTime <= endDate.Value);

        var orders = await query
            .OrderByDescending(o => o.TransactionTime)
            .ToListAsync();

        return _mapper.Map<List<OrderDto>>(orders);
    }

    public async Task<OrderDto?> GetOrderByIdAsync(int id)
    {
        var order = await _context.Orders.FindAsync(id);
        return order != null ? _mapper.Map<OrderDto>(order) : null;
    }

    public async Task<OrderDto> CreateOrderWithDetailsAsync(CreateOrderDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            // Create order
            var order = new Order
            {
                OrderNo = dto.OrderNo,
                Name = dto.Name,
                ImageUrl = dto.ImageUrl,
                Revenue = dto.Revenue,
                ShippingFee = dto.ShippingFee,
                TransactionTime = dto.TransactionTime
            };

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            decimal totalCost = 0;

            // Create order details
            foreach (var detailDto in dto.Details)
            {
                var inventory = await _context.Inventory.FindAsync(detailDto.InventoryId);
                if (inventory == null)
                    throw new InvalidOperationException($"Inventory {detailDto.InventoryId} not found");

                if (inventory.StockQuantity < detailDto.Quantity)
                    throw new InvalidOperationException(
                        $"Insufficient stock for inventory {detailDto.InventoryId}. " +
                        $"Available: {inventory.StockQuantity}, Requested: {detailDto.Quantity}");

                // Calculate subtotal
                var subtotal = (inventory.UnitCost * detailDto.Quantity) +
                               (detailDto.PackagingCost ?? 0) +
                               (detailDto.OtherCost ?? 0);

                var detail = new OrderDetail
                {
                    OrderId = order.Id,
                    InventoryId = detailDto.InventoryId,
                    ProductId = detailDto.ProductId,
                    UnitPrice = inventory.UnitCost,  // Snapshot!
                    Quantity = detailDto.Quantity,
                    PackagingCost = detailDto.PackagingCost ?? 0,
                    OtherCost = detailDto.OtherCost ?? 0,
                    SubtotalCost = subtotal,
                    Notes = detailDto.Notes
                };

                _context.OrderDetails.Add(detail);

                // Deduct stock
                inventory.StockQuantity -= detailDto.Quantity;

                totalCost += subtotal;
            }

            // Update order total cost
            order.TotalCost = totalCost;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return _mapper.Map<OrderDto>(order);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> DeleteOrderAsync(int id)
    {
        var order = await _context.Orders
            .Include(o => o.OrderDetails)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return false;

        // Restore stock for each detail
        foreach (var detail in order.OrderDetails)
        {
            var inventory = await _context.Inventory.FindAsync(detail.InventoryId);
            if (inventory != null)
            {
                inventory.StockQuantity += detail.Quantity;
            }
            detail.IsDeleted = true;
        }

        order.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }
}
```

### InventoryService

```csharp
// Services/InventoryService.cs
public class InventoryService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public InventoryService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<List<InventoryDto>> GetAllAsync(int? purchaseId = null)
    {
        var query = _context.Inventory
            .Include(i => i.Product)
                .ThenInclude(p => p.Category)
            .Include(i => i.Purchase)
            .AsQueryable();

        if (purchaseId.HasValue)
            query = query.Where(i => i.PurchaseId == purchaseId.Value);

        var items = await query.ToListAsync();
        var dtos = _mapper.Map<List<InventoryDto>>(items);

        // Check if each item is referenced in order details
        foreach (var dto in dtos)
        {
            dto.IsReferenced = await _context.OrderDetails
                .AnyAsync(d => d.InventoryId == dto.Id && !d.IsDeleted);
        }

        return dtos;
    }

    public async Task<InventoryDto> CreateAsync(CreateInventoryDto dto)
    {
        var purchase = await _context.Purchases.FindAsync(dto.PurchaseId);
        if (purchase == null)
            throw new InvalidOperationException("Purchase not found");

        var inventory = new Inventory
        {
            ProductId = dto.ProductId,
            PurchaseId = dto.PurchaseId,
            PurchaseAmountJpy = dto.PurchaseAmountJpy,
            PurchaseAmountCny = dto.PurchaseAmountCny,
            PurchaseQuantity = dto.PurchaseQuantity,
            UnitCost = dto.PurchaseAmountJpy / dto.PurchaseQuantity,
            StockQuantity = dto.PurchaseQuantity
        };

        _context.Inventory.Add(inventory);
        await _context.SaveChangesAsync();

        return _mapper.Map<InventoryDto>(inventory);
    }

    public async Task<decimal> GetPurchaseTotalAmountAsync(int purchaseId)
    {
        return await _context.Inventory
            .Where(i => i.PurchaseId == purchaseId)
            .SumAsync(i => i.PurchaseAmountJpy);
    }
}
```

### MercariService

```csharp
// Services/MercariService.cs
public class MercariService
{
    private readonly AppDbContext _context;
    private readonly HttpClient _httpClient;

    public MercariService(AppDbContext context, IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task<ImportResultDto> ImportFromCurlAsync(string curlCommand)
    {
        var result = new ImportResultDto();

        // Parse cURL command
        var (url, headers) = ParseCurlCommand(curlCommand);

        // Set limit to 100 for batch fetching
        url = SetLimitParameter(url, 100);

        int offset = 0;
        int total = 0;

        do
        {
            var pageUrl = SetOffsetParameter(url, offset);

            // Make request
            var request = new HttpRequestMessage(HttpMethod.Get, pageUrl);
            foreach (var header in headers)
            {
                request.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }

            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<MercariResponse>(json);

            if (offset == 0)
            {
                total = data.Meta.TotalCount;
                result.Total = total;
            }

            // Process each order
            foreach (var item in data.Data.SoldHistories)
            {
                // Check if order already exists
                var exists = await _context.Orders
                    .AnyAsync(o => o.OrderNo == item.Item.ItemId);

                if (exists)
                {
                    result.Skipped++;
                    continue;
                }

                // Create new order
                var order = new Order
                {
                    OrderNo = item.Item.ItemId,
                    Name = item.Item.Name,
                    ImageUrl = item.PhotoThumbnailUrl,
                    Revenue = item.SalesProfit,
                    TransactionTime = DateTimeOffset.FromUnixTimeSeconds(
                        item.TransactionFinishedAt).DateTime
                };

                _context.Orders.Add(order);
                result.Success++;
            }

            await _context.SaveChangesAsync();
            offset += 100;

        } while (offset < total);

        return result;
    }

    private (string url, Dictionary<string, string> headers) ParseCurlCommand(string curl)
    {
        // Implementation to parse cURL command
        // Extract URL and headers
        // ...
    }
}
```

## Controllers

### OrdersController

```csharp
// Controllers/OrdersController.cs
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly OrderService _orderService;

    public OrdersController(OrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet]
    public async Task<ActionResult<List<OrderDto>>> GetAll(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var orders = await _orderService.GetAllOrdersAsync(startDate, endDate);
        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> GetById(int id)
    {
        var order = await _orderService.GetOrderByIdAsync(id);
        if (order == null) return NotFound();
        return Ok(order);
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create([FromBody] CreateOrderDto dto)
    {
        try
        {
            var order = await _orderService.CreateOrderWithDetailsAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { detail = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<OrderDto>> Update(int id, [FromBody] UpdateOrderDto dto)
    {
        var order = await _orderService.UpdateOrderAsync(id, dto);
        if (order == null) return NotFound();
        return Ok(order);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await _orderService.DeleteOrderAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpGet("{orderId}/details")]
    public async Task<ActionResult<List<OrderDetailDto>>> GetDetails(int orderId)
    {
        var details = await _orderService.GetOrderDetailsAsync(orderId);
        return Ok(details);
    }

    [HttpPost("import-from-curl")]
    public async Task<ActionResult<ImportResultDto>> ImportFromCurl(
        [FromBody] ImportCurlDto dto,
        [FromServices] MercariService mercariService)
    {
        try
        {
            var result = await mercariService.ImportFromCurlAsync(dto.CurlCommand);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { detail = ex.Message });
        }
    }
}
```

## DTOs

### OrderDto

```csharp
// DTOs/OrderDto.cs
public class OrderDto
{
    public int Id { get; set; }
    public string OrderNo { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? ImageUrl { get; set; }
    public decimal Revenue { get; set; }
    public decimal? TotalCost { get; set; }
    public decimal? ShippingFee { get; set; }
    public DateTime TransactionTime { get; set; }
}

public class CreateOrderDto
{
    public string OrderNo { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? ImageUrl { get; set; }
    public decimal Revenue { get; set; }
    public decimal? ShippingFee { get; set; }
    public DateTime TransactionTime { get; set; }
    public List<CreateOrderDetailDto> Details { get; set; } = new();
}

public class UpdateOrderDto
{
    public string? Name { get; set; }
    public decimal? Revenue { get; set; }
    public decimal? ShippingFee { get; set; }
}
```

## AutoMapper Profile

```csharp
// Mappings/MappingProfile.cs
public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // Category mappings
        CreateMap<Category, CategoryDto>()
            .ForMember(d => d.ProductCount, opt => opt.MapFrom(s => s.Products.Count));

        // Product mappings
        CreateMap<Product, ProductDto>()
            .ForMember(d => d.CategoryName, opt => opt.MapFrom(s => s.Category.Name));

        // Purchase mappings
        CreateMap<Purchase, PurchaseDto>()
            .ForMember(d => d.SupplierName, opt => opt.MapFrom(s => s.Supplier.Name));

        // Inventory mappings
        CreateMap<Inventory, InventoryDto>()
            .ForMember(d => d.ProductName, opt => opt.MapFrom(s => s.Product.Name))
            .ForMember(d => d.CategoryId, opt => opt.MapFrom(s => s.Product.CategoryId))
            .ForMember(d => d.CategoryName, opt => opt.MapFrom(s => s.Product.Category.Name))
            .ForMember(d => d.PurchaseNo, opt => opt.MapFrom(s => s.Purchase.PurchaseNo));

        // Order mappings
        CreateMap<Order, OrderDto>();

        // OrderDetail mappings
        CreateMap<OrderDetail, OrderDetailDto>()
            .ForMember(d => d.ProductName, opt => opt.MapFrom(s => s.Product.Name))
            .ForMember(d => d.CategoryName, opt => opt.MapFrom(s => s.Product.Category.Name))
            .ForMember(d => d.AvailableStock, opt => opt.MapFrom(s => s.Inventory.StockQuantity));
    }
}
```

## Program.cs (Startup)

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))
    ));

// AutoMapper
builder.Services.AddAutoMapper(typeof(MappingProfile));

// HTTP Client
builder.Services.AddHttpClient();

// Services
builder.Services.AddScoped<CategoryService>();
builder.Services.AddScoped<SupplierService>();
builder.Services.AddScoped<ProductService>();
builder.Services.AddScoped<PurchaseService>();
builder.Services.AddScoped<InventoryService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<MercariService>();
builder.Services.AddScoped<DashboardService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Middleware pipeline
app.UseCors();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

## Best Practices

### Transaction Management

Always use transactions for multi-step operations:

```csharp
using var transaction = await _context.Database.BeginTransactionAsync();
try
{
    // Multiple operations
    await _context.SaveChangesAsync();
    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

### Soft Delete

Use soft delete for audit trails:

```csharp
public async Task<bool> DeleteAsync(int id)
{
    var entity = await _context.Entity.FindAsync(id);
    if (entity == null) return false;

    entity.IsDeleted = true;  // Soft delete
    await _context.SaveChangesAsync();
    return true;
}
```

### Validation

Validate business rules in services:

```csharp
if (inventory.StockQuantity < requestedQuantity)
    throw new InvalidOperationException("Insufficient stock");
```

### Async/Await

Always use async operations for I/O:

```csharp
public async Task<List<OrderDto>> GetAllAsync()
{
    return await _context.Orders
        .Select(o => _mapper.Map<OrderDto>(o))
        .ToListAsync();
}
```
