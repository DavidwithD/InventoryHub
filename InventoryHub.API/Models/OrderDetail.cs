namespace InventoryHub.API.Models;

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
    public Order Order { get; set; } = null!;
    public Inventory Inventory { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
