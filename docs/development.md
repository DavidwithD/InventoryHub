# Development Guidelines

This document provides guidelines for contributing to and maintaining the InventoryHub project.

## Development Environment

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18.x+ | Frontend runtime |
| npm | 9.x+ | Package manager |
| .NET SDK | 9.0+ | Backend framework |
| MySQL | 8.x | Database |
| Git | Latest | Version control |
| VS Code / Rider | Latest | IDE (recommended) |

### Recommended VS Code Extensions

- C# Dev Kit
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- MySQL (cweijan)

## Code Style

### C# (.NET Backend)

Follow Microsoft's C# coding conventions:

```csharp
// Use PascalCase for class names, methods, properties
public class OrderService
{
    public async Task<OrderDto> GetOrderAsync(int id)
    {
        // Use camelCase for local variables
        var order = await _context.Orders.FindAsync(id);
        return _mapper.Map<OrderDto>(order);
    }
}

// Use _camelCase for private fields
private readonly AppDbContext _context;

// Use async/await consistently
public async Task<List<T>> GetAllAsync()
{
    return await _context.Set<T>().ToListAsync();
}
```

### TypeScript (Frontend)

```typescript
// Use PascalCase for interfaces, types, components
interface OrderDto {
  id: number;
  orderNo: string;
  revenue: number;
}

// Use camelCase for variables, functions
const orderService = {
  async getOrders(): Promise<OrderDto[]> {
    const response = await api.get('/orders');
    return response.data;
  }
};

// Use arrow functions for components
const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<OrderDto[]>([]);

  return (
    <DataGrid rows={orders} />
  );
};
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| C# files | PascalCase | `OrderService.cs` |
| React components | PascalCase | `OrderList.tsx` |
| TypeScript utils | camelCase | `exchangeRate.ts` |
| CSS/styles | camelCase | `orderList.module.css` |
| Documentation | kebab-case | `getting-started.md` |

## Git Workflow

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/mercari-import` |
| Bug fix | `fix/description` | `fix/stock-calculation` |
| Refactor | `refactor/description` | `refactor/order-service` |
| Documentation | `docs/description` | `docs/api-reference` |

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(orders): add batch import from Mercari

fix(inventory): correct stock calculation on order update

docs(api): add endpoint documentation for orders

refactor(services): extract common validation logic
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with meaningful commits
3. Ensure tests pass
4. Update documentation if needed
5. Create pull request with description
6. Request review
7. Address feedback
8. Merge after approval

## Testing

### Backend Testing

```csharp
// Unit test example
[Fact]
public async Task CreateOrder_ShouldDeductStock()
{
    // Arrange
    var service = new OrderService(_context, _mapper);
    var dto = new CreateOrderDto { /* ... */ };

    // Act
    var result = await service.CreateOrderWithDetailsAsync(dto);

    // Assert
    var inventory = await _context.Inventory.FindAsync(1);
    Assert.Equal(expectedStock, inventory.StockQuantity);
}
```

### Frontend Testing

```typescript
// Component test example
import { render, screen } from '@testing-library/react';
import { OrderList } from './OrderList';

describe('OrderList', () => {
  it('should display orders', async () => {
    render(<OrderList />);

    expect(await screen.findByText('Order #123')).toBeInTheDocument();
  });
});
```

## Database Migrations

### Creating Migrations

```bash
# Backend (.NET)
cd InventoryHub.API
dotnet ef migrations add MigrationName
```

### Applying Migrations

```bash
dotnet ef database update
```

### Migration Best Practices

1. **One change per migration** - Keep migrations focused
2. **Descriptive names** - Use clear migration names
3. **Test migrations** - Apply to test database first
4. **Data migrations** - Handle data carefully in migrations
5. **Never edit applied migrations** - Create new migrations instead

## Error Handling

### Backend

```csharp
// Service layer
public async Task<OrderDto> CreateOrderAsync(CreateOrderDto dto)
{
    // Validate business rules
    if (dto.Details.Count == 0)
        throw new InvalidOperationException("Order must have at least one detail");

    // Check stock availability
    foreach (var detail in dto.Details)
    {
        var inventory = await _context.Inventory.FindAsync(detail.InventoryId);
        if (inventory == null)
            throw new InvalidOperationException($"Inventory {detail.InventoryId} not found");

        if (inventory.StockQuantity < detail.Quantity)
            throw new InvalidOperationException(
                $"Insufficient stock. Available: {inventory.StockQuantity}");
    }

    // Proceed with creation...
}

// Controller layer
[HttpPost]
public async Task<ActionResult<OrderDto>> Create([FromBody] CreateOrderDto dto)
{
    try
    {
        var order = await _orderService.CreateOrderAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }
    catch (InvalidOperationException ex)
    {
        return BadRequest(new { detail = ex.Message });
    }
}
```

### Frontend

```typescript
// API call with error handling
const createOrder = async (order: CreateOrderDto) => {
  try {
    const response = await api.post('/orders', order);
    showSuccess('Order created successfully');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Failed to create order';
      showError(message);
    }
    throw error;
  }
};
```

## Security Guidelines

### Input Validation

Always validate input on both frontend and backend:

```csharp
// Backend validation
public class CreateOrderDto
{
    [Required]
    [StringLength(100)]
    public string OrderNo { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Revenue { get; set; }
}
```

```typescript
// Frontend validation with Zod
const orderSchema = z.object({
  orderNo: z.string().min(1).max(100),
  revenue: z.number().positive(),
});
```

### SQL Injection Prevention

Always use parameterized queries (EF Core handles this):

```csharp
// Good - EF Core parameterizes automatically
var orders = await _context.Orders
    .Where(o => o.OrderNo == orderNo)
    .ToListAsync();

// Avoid raw SQL when possible
// If needed, use parameters:
var orders = await _context.Orders
    .FromSqlInterpolated($"SELECT * FROM orders WHERE order_no = {orderNo}")
    .ToListAsync();
```

### XSS Prevention

React automatically escapes rendered content. For dangerouslySetInnerHTML, sanitize first:

```typescript
import DOMPurify from 'dompurify';

const SafeHTML = ({ html }: { html: string }) => (
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
);
```

## Performance Guidelines

### Database Queries

```csharp
// Good - Select only needed columns
var orderNumbers = await _context.Orders
    .Select(o => o.OrderNo)
    .ToListAsync();

// Good - Use Include for related data
var orders = await _context.Orders
    .Include(o => o.OrderDetails)
    .ToListAsync();

// Avoid N+1 queries - don't loop and query
// Bad:
foreach (var order in orders)
{
    order.Details = await _context.OrderDetails
        .Where(d => d.OrderId == order.Id)
        .ToListAsync();
}
```

### Frontend Performance

```typescript
// Memoize expensive calculations
const totalProfit = useMemo(() =>
  orders.reduce((sum, o) => sum + (o.revenue - o.totalCost), 0),
  [orders]
);

// Memoize callbacks passed to children
const handleDelete = useCallback((id: number) => {
  deleteOrder(id);
}, [deleteOrder]);

// Use virtualization for long lists
<VirtualizedList
  items={orders}
  renderItem={(order) => <OrderRow order={order} />}
/>
```

## Documentation

### Code Comments

```csharp
/// <summary>
/// Creates an order with details and updates inventory stock.
/// </summary>
/// <param name="dto">The order creation data transfer object.</param>
/// <returns>The created order.</returns>
/// <exception cref="InvalidOperationException">
/// Thrown when stock is insufficient or inventory not found.
/// </exception>
public async Task<OrderDto> CreateOrderWithDetailsAsync(CreateOrderDto dto)
```

### API Documentation

Document all endpoints in the API reference:
- HTTP method and path
- Request/response formats
- Required parameters
- Error responses

## Debugging

### Backend Logging

```csharp
// Use ILogger
private readonly ILogger<OrderService> _logger;

public async Task<OrderDto> CreateOrderAsync(CreateOrderDto dto)
{
    _logger.LogInformation("Creating order {OrderNo}", dto.OrderNo);

    try
    {
        // ...
        _logger.LogInformation("Order {OrderNo} created with ID {OrderId}",
            dto.OrderNo, order.Id);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to create order {OrderNo}", dto.OrderNo);
        throw;
    }
}
```

### Frontend Debugging

```typescript
// Use console for development
if (process.env.NODE_ENV === 'development') {
  console.log('Orders fetched:', orders);
}

// Use React DevTools for component state
// Use Network tab for API calls
```

## Deployment Checklist

Before deploying:

- [ ] All tests pass
- [ ] No console errors in browser
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] CORS settings updated for production
- [ ] API URLs updated
- [ ] SSL certificates configured
- [ ] Error handling in place
- [ ] Logging configured

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Update documentation
6. Submit a pull request

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] No unnecessary complexity
- [ ] Error handling is appropriate
- [ ] Tests cover new functionality
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance is acceptable
