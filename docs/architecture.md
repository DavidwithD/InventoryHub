# Architecture

This document describes the system architecture, design patterns, and data flow in InventoryHub.

## System Overview

InventoryHub follows a classic three-tier architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
│                  (Next.js + React + TypeScript)                 │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  Pages  │  │Components│  │  Hooks  │  │  Store  │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST (JSON)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend Layer                            │
│                     (ASP.NET Core 9.0)                          │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │ Controllers │  │  Services  │  │    DTOs    │               │
│  └────────────┘  └────────────┘  └────────────┘               │
│         │               │               ▲                       │
│         └───────────────┼───────────────┘                       │
│                         │ AutoMapper                            │
│                         ▼                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   Data Access Layer                     │    │
│  │            (Entity Framework Core + Models)             │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │ MySQL Protocol
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Database Layer                            │
│                        (MySQL 8.x)                              │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Categories│ │ Products │ │Inventory │ │  Orders  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Design Patterns

### 1. Repository Pattern (via Entity Framework)

Entity Framework's `DbContext` serves as an abstraction over database operations:

```csharp
public class AppDbContext : DbContext
{
    public DbSet<Category> Categories { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Inventory> Inventory { get; set; }
    public DbSet<Order> Orders { get; set; }
    // ...
}
```

### 2. Service Layer Pattern

Business logic is encapsulated in service classes:

```
Controller → Service → DbContext → Database
```

Services handle:
- Business rule validation
- Transaction management
- Complex operations spanning multiple entities

### 3. DTO Pattern (Data Transfer Object)

Separation between domain models and API contracts:

```
Entity (Database) ←→ DTO (API) ←→ Frontend
```

Benefits:
- Hide internal entity structure
- Control exactly what data is exposed
- Allow API evolution without database changes

### 4. Dependency Injection

All dependencies are injected via constructor:

```csharp
public class OrderService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public OrderService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }
}
```

Registration in `Program.cs`:
```csharp
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<InventoryService>();
// ...
```

### 5. Soft Delete Pattern

All entities inherit from `BaseEntity`:

```csharp
public class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
}
```

Benefits:
- Audit trail preservation
- Data recovery capability
- Referential integrity maintained

### 6. Snapshot Pattern

Historical data is preserved via snapshots:

```
Inventory.unit_cost    → Snapshot at purchase time
OrderDetail.unit_price → Snapshot from inventory at order time
```

This ensures profit calculations remain accurate even if costs change later.

## Frontend Architecture

### Component Structure

```
app/
├── page.tsx                 # Dashboard (home)
├── layout.tsx               # Root layout with navigation
├── orders/
│   ├── page.tsx             # Order list
│   └── [orderId]/
│       └── edit/
│           └── page.tsx     # Order detail editor
├── inventory/
│   └── page.tsx             # Inventory management
├── purchases/
│   └── page.tsx             # Purchase management
├── products/
│   └── page.tsx             # Product management
├── categories/
│   └── page.tsx             # Category management
└── suppliers/
    └── page.tsx             # Supplier management
```

### State Management Strategy

| State Type | Solution | Use Case |
|------------|----------|----------|
| Server State | React Query / Axios | API data fetching and caching |
| Global State | Zustand | Cross-page shared state |
| Local State | useState | Component-specific state |
| Form State | React Hook Form | Form inputs and validation |

### Data Fetching Pattern

Custom hooks encapsulate API calls:

```typescript
// lib/hooks/useOrders.ts
export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = async (filters?: OrderFilters) => {
    const response = await axios.get('/orders', { params: filters });
    setOrders(response.data);
  };

  const createOrder = async (order: CreateOrderDto) => {
    return axios.post('/orders', order);
  };

  return { orders, fetchOrders, createOrder };
}
```

## Backend Architecture

### Layer Responsibilities

| Layer | Responsibility |
|-------|---------------|
| Controllers | HTTP handling, request validation, routing |
| Services | Business logic, transactions, orchestration |
| Data (DbContext) | Database operations, entity mapping |
| Models | Entity definitions, database schema |
| DTOs | API request/response shapes |
| Mappings | Entity ↔ DTO transformations |

### Service Layer Design

```csharp
public class OrderService
{
    // Dependencies
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly InventoryService _inventoryService;

    // CRUD Operations
    public async Task<List<OrderDto>> GetAllOrdersAsync(DateTime? start, DateTime? end);
    public async Task<OrderDto?> GetOrderByIdAsync(int id);
    public async Task<OrderDto> CreateOrderWithDetailsAsync(CreateOrderDto dto);
    public async Task<OrderDto?> UpdateOrderAsync(int id, UpdateOrderDto dto);
    public async Task<bool> DeleteOrderAsync(int id);

    // Order Details
    public async Task<List<OrderDetailDto>> GetOrderDetailsAsync(int orderId);
    public async Task<OrderDetailDto> CreateOrderDetailAsync(CreateOrderDetailDto dto);

    // Specialized Operations
    public async Task<ImportResultDto> ImportFromMercariAsync(string curlCommand);
}
```

### Transaction Management

Critical operations use explicit transactions:

```csharp
public async Task<OrderDto> CreateOrderWithDetailsAsync(CreateOrderDto dto)
{
    using var transaction = await _context.Database.BeginTransactionAsync();

    try
    {
        // 1. Create order
        var order = _mapper.Map<Order>(dto);
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // 2. Create order details and update inventory
        foreach (var detail in dto.Details)
        {
            // Validate stock
            var inventory = await _context.Inventory.FindAsync(detail.InventoryId);
            if (inventory.StockQuantity < detail.Quantity)
                throw new InvalidOperationException("Insufficient stock");

            // Deduct stock
            inventory.StockQuantity -= detail.Quantity;

            // Create detail with cost snapshot
            var orderDetail = new OrderDetail
            {
                OrderId = order.Id,
                InventoryId = detail.InventoryId,
                UnitPrice = inventory.UnitCost,  // Snapshot!
                Quantity = detail.Quantity
            };
            _context.OrderDetails.Add(orderDetail);
        }

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
```

## Data Flow Examples

### Creating an Order

```
1. User fills order form in frontend
        │
        ▼
2. Frontend validates with Zod schema
        │
        ▼
3. POST /api/orders with order data
        │
        ▼
4. OrdersController receives request
        │
        ▼
5. OrderService.CreateOrderWithDetailsAsync()
        │
        ├──► Begin Transaction
        │
        ├──► Create Order record
        │
        ├──► For each detail:
        │    ├── Validate inventory exists
        │    ├── Check stock availability
        │    ├── Snapshot unit_cost to unit_price
        │    ├── Create OrderDetail record
        │    └── Decrement stock_quantity
        │
        ├──► Calculate total_cost
        │
        ├──► Commit Transaction
        │
        └──► Return OrderDto
        │
        ▼
6. Frontend updates UI with new order
```

### Importing from Mercari

```
1. User pastes cURL command
        │
        ▼
2. POST /api/orders/import-from-curl
        │
        ▼
3. MercariService parses cURL
        │
        ├──► Extract URL and headers
        │
        ├──► Set limit=100, offset=0
        │
        └──► Loop until all pages fetched:
             │
             ├── Call Mercari API
             │
             ├── For each sold item:
             │   ├── Check if order_no exists (skip if exists)
             │   ├── Map Mercari fields to Order
             │   └── Save Order (no details yet)
             │
             └── Increment offset by 100
        │
        ▼
4. Return import summary
   {total, success, skipped, failed}
```

### Updating Inventory with Validation

```
1. PUT /api/inventory/{id}
        │
        ▼
2. InventoryService.UpdateAsync()
        │
        ├──► Fetch current inventory
        │
        ├──► Check if referenced by OrderDetails
        │    │
        │    ├── If YES and reducing stock below used amount:
        │    │   └── Reject update (400 Bad Request)
        │    │
        │    └── If NO or safe change:
        │        └── Allow update
        │
        ├──► Validate stock_quantity >= 0
        │
        └──► Save changes
```

## Concurrency Considerations

### Stock Management

Stock updates are protected by:
1. **Database transactions** - Atomic operations
2. **Validation checks** - Verify stock before deduction
3. **Constraint enforcement** - `stock_quantity >= 0` at database level

### Optimistic vs Pessimistic Locking

Current implementation uses **optimistic concurrency**:
- No explicit row locks
- Relies on transaction isolation
- Suitable for moderate concurrent access

For high-concurrency scenarios, consider adding:
```csharp
// Entity
public byte[] RowVersion { get; set; }

// Fluent API
modelBuilder.Entity<Inventory>()
    .Property(e => e.RowVersion)
    .IsRowVersion();
```

## Security Architecture

### Current Implementation

| Layer | Security Measure |
|-------|-----------------|
| Frontend | Input validation (Zod), XSS prevention (React) |
| API | CORS configuration, Input validation |
| Database | Parameterized queries (EF Core), Constraint enforcement |

### Recommended Additions

1. **Authentication**: JWT or OAuth 2.0
2. **Authorization**: Role-based access control
3. **Rate Limiting**: Prevent API abuse
4. **Audit Logging**: Track sensitive operations
5. **Input Sanitization**: Additional server-side validation

## Performance Considerations

### Database Optimization

- **Indexes** on foreign keys and frequently queried columns
- **Soft delete** filtered in queries (prevents full table scans)
- **Pagination** for large result sets

### Frontend Optimization

- **Component memoization** with React.memo
- **Virtualization** for large lists (DataGrid)
- **Code splitting** via Next.js dynamic imports

### API Optimization

- **Response compression**
- **DTO projections** (select only needed fields)
- **Async/await** throughout for non-blocking I/O
