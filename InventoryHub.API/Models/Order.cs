namespace InventoryHub.API.Models;

public class Order : BaseEntity
{
    public string OrderNo { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public decimal Revenue { get; set; }
    public decimal ShippingFee { get; set; } = 0;
    public DateTime TransactionTime { get; set; }

    // Navigation property
    public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}
