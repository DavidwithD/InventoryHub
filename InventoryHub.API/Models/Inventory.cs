namespace InventoryHub.API.Models;

public class Inventory : BaseEntity
{
    public int ProductId { get; set; }
    public int PurchaseQuantity { get; set; }
    public decimal PriceJpy { get; set; } // 日元单价
    public decimal? PriceCny { get; set; } // 人民币单价
    public int InitialStock { get; set; } // 入库时的可售数量

    // Denormalized purchase-level fields
    public int? SupplierId { get; set; }
    public DateTime? PurchaseDate { get; set; }
    public string? PurchaseNo { get; set; }

    // Navigation properties
    public Product Product { get; set; } = null!;
}
