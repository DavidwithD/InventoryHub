namespace InventoryHub.API.Models;

public class Supplier : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    // Navigation property
    public ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
}
