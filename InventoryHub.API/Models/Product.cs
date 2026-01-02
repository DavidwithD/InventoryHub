namespace InventoryHub.API.Models;

public class Product : BaseEntity
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;

    // Navigation properties
    public Category Category { get; set; } = null!;
    public ICollection<Inventory> Inventories { get; set; } = new List<Inventory>();
    public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}
