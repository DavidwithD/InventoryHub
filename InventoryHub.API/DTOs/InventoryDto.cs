namespace InventoryHub.API.DTOs;

public class InventoryDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string? PurchaseNo { get; set; }
    public int PurchaseQuantity { get; set; }
    public decimal PriceJpy { get; set; } // 日元单价
    public decimal? PriceCny { get; set; } // 人民币单价
    public int StockQuantity { get; set; }
    // Denormalized purchase-level fields
    public int? SupplierId { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public bool IsReferenced { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateInventoryDto
{
    public int ProductId { get; set; }
    public int PurchaseQuantity { get; set; }
    public int StockQuantity { get; set; }
    public decimal PriceJpy { get; set; } // 日元单价
    public decimal? PriceCny { get; set; } // 人民币单价
    // Optional purchase-level fields
    public int? SupplierId { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public string? PurchaseNo { get; set; }
}

public class UpdateInventoryDto
{
    public int ProductId { get; set; }
    public int PurchaseQuantity { get; set; }
    public int StockQuantity { get; set; }
    public decimal PriceJpy { get; set; } // 日元单价
    public decimal? PriceCny { get; set; } // 人民币单价
    // Optional purchase-level fields
    public int? SupplierId { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public string? PurchaseNo { get; set; }
}

public class BatchCreateInventoryDto
{
    public List<CreateInventoryDto> Items { get; set; } = new();
}
