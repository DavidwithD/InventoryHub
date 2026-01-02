namespace InventoryHub.API.Models;

public class Purchase : BaseEntity
{
    public int SupplierId { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string PurchaseNo { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string CurrencyType { get; set; } = "JPY";
    public decimal ExchangeRate { get; set; }

    // Navigation properties
    public Supplier Supplier { get; set; } = null!;
    public ICollection<Inventory> InventoryItems { get; set; } = new List<Inventory>();
}
