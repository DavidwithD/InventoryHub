namespace InventoryHub.API.DTOs;

public class PurchaseDto
{
    public int Id { get; set; }
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public DateTime PurchaseDate { get; set; }
    public string PurchaseNo { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string CurrencyType { get; set; } = "JPY";
    public decimal ExchangeRate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreatePurchaseDto
{
    public int SupplierId { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string PurchaseNo { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string CurrencyType { get; set; } = "JPY";
    public decimal ExchangeRate { get; set; }
}

public class UpdatePurchaseDto
{
    public int SupplierId { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string PurchaseNo { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string CurrencyType { get; set; } = "JPY";
    public decimal ExchangeRate { get; set; }
}
