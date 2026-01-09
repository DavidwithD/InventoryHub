namespace InventoryHub.API.DTOs;

public class OrderDto
{
    public int Id { get; set; }
    public string OrderNo { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public decimal Revenue { get; set; }
    public decimal TotalCost { get; set; }
    public decimal ShippingFee { get; set; }
    public DateTime TransactionTime { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateOrderDto
{
    public string OrderNo { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public decimal Revenue { get; set; }
    public DateTime TransactionTime { get; set; }
}

public class UpdateOrderDto
{
    public string OrderNo { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public decimal Revenue { get; set; }
    public decimal ShippingFee { get; set; }
    public DateTime TransactionTime { get; set; }
}

public class OrderDetailDto
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int InventoryId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal PackagingCost { get; set; }
    public decimal OtherCost { get; set; }
    public decimal SubtotalCost { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateOrderDetailDto
{
    public int OrderId { get; set; }
    public int InventoryId { get; set; }
    public int ProductId { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal PackagingCost { get; set; }
    public decimal OtherCost { get; set; }
    public string? Notes { get; set; }
}

public class UpdateOrderDetailDto
{
    public int InventoryId { get; set; }
    public int ProductId { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal PackagingCost { get; set; }
    public decimal OtherCost { get; set; }
    public string? Notes { get; set; }
}

// 用于创建订单和订单详细的组合DTO
public class CreateOrderWithDetailsDto
{
    public string OrderNo { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public decimal Revenue { get; set; }
    public DateTime TransactionTime { get; set; }
    public List<CreateOrderDetailDto> Details { get; set; } = new();
}
