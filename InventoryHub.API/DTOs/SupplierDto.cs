namespace InventoryHub.API.DTOs;

public class SupplierDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateSupplierDto
{
    public string Name { get; set; } = string.Empty;
}

public class UpdateSupplierDto
{
    public string Name { get; set; } = string.Empty;
}
