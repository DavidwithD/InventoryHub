namespace InventoryHub.API.DTOs;

public class InventoryDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int PurchaseId { get; set; }
    public string PurchaseNo { get; set; } = string.Empty;
    public decimal PurchaseAmount { get; set; }
    public int PurchaseQuantity { get; set; }
    public decimal UnitCost { get; set; }
    public int StockQuantity { get; set; }
    public bool IsReferenced { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateInventoryDto
{
    public int ProductId { get; set; }
    public int PurchaseId { get; set; }
    public decimal PurchaseAmountCny { get; set; } // 用户输入的人民币金额
    public int PurchaseQuantity { get; set; }
    public int StockQuantity { get; set; }
}

public class UpdateInventoryDto
{
    public int ProductId { get; set; }
    public int PurchaseId { get; set; }
    public decimal PurchaseAmountCny { get; set; } // 用户输入的人民币金额
    public int PurchaseQuantity { get; set; }
    public int StockQuantity { get; set; }
}

public class BatchCreateInventoryDto
{
    public List<CreateInventoryDto> Items { get; set; } = new();
}
