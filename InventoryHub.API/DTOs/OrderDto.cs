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
    public bool HasDetails { get; set; }
    public bool HasUnknownCost { get; set; }
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
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal PackagingCost { get; set; }
    public decimal OtherCost { get; set; }
    public decimal SubtotalCost { get; set; } // 由 FIFO 计算
    public int UnmatchedQuantity { get; set; }
    public List<OrderDetailAllocationDto> Allocations { get; set; } = new();
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class OrderDetailAllocationDto
{
    public int InventoryId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public DateTime? PurchaseDate { get; set; }
}

public class CreateOrderDetailDto
{
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal PackagingCost { get; set; }
    public decimal OtherCost { get; set; }
    public string? Notes { get; set; }
}

public class UpdateOrderDetailDto
{
    public int ProductId { get; set; }
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
