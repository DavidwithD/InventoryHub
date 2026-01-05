namespace InventoryHub.API.Models;

public class Inventory : BaseEntity
{
    public int ProductId { get; set; }
    public int PurchaseId { get; set; }
    public decimal PurchaseAmount { get; set; } // 进货金额(日元)
    public decimal PurchaseAmountCny { get; set; } // 进货金额(人民币)
    public int PurchaseQuantity { get; set; }
    public decimal UnitCost { get; set; }
    public int StockQuantity { get; set; }

    // Navigation properties
    public Product Product { get; set; } = null!;
    public Purchase Purchase { get; set; } = null!;
    public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}
