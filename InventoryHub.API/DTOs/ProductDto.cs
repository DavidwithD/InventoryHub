namespace InventoryHub.API.DTOs;

public class ProductDto
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateProductDto
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class UpdateProductDto
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
}
