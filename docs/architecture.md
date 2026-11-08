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

### 6. FIFO Calculation

The database stores purchases and sales. It does not store batch links, line costs or current stock. `FifoCalculator` calculates those values on each read.

For each product:

1. Sort batches by purchase date, then by id. Batches with no purchase date go last.
2. Sort sales by order transaction time, then by detail id.
3. Each sale takes units from the oldest batch that has stock and was purchased on or before the sale.
4. Units with no matching batch become unmatched. They add no cost and do not reduce stock.

The result does not depend on entry order. A backdated sale or a corrected purchase updates all related costs.

Past costs are not frozen. An earlier edit can change the profit of a closed month.

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

### Test Database

The tests run the API on SQLite. Production uses MySQL. These parts of the code support SQLite:

| File | What it does |
|------|--------------|
| `Program.cs` | Uses SQLite when `ConnectionStrings:Sqlite` is set. Creates the tables at startup. Reads allowed origins from `Cors:Origins`. The default is `http://localhost:3000`. |
| `Data/AppDbContext.cs` | On SQLite, uses a plain `CURRENT_TIMESTAMP` default for `updated_at`. Adds the table name to each index name, because SQLite needs index names unique across the database. |
| `inventory-hub-frontend/next.config.ts` | Reads the build folder from `NEXT_DIST_DIR`. The E2E web server uses `.next-e2e`. |

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
        │    ├── Validate product and quantity
        │    └── Create OrderDetail record
        │
        ├──► Calculate cost with FIFO
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

### Updating Inventory

```
1. PUT /api/inventory/{id}
        │
        ▼
2. InventoryService.UpdateAsync()
        │
        ├──► Fetch current inventory
        │
        ├──► Validate product and quantities
        │
        └──► Save changes
```

## Concurrency Considerations

### Stock Management

Stock has no stored counter to protect. Each read calculates stock from committed purchases and sales.

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
