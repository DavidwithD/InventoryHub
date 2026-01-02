using InventoryHub.API.DTOs;

namespace InventoryHub.API.Services;

public interface ICategoryService
{
    Task<IEnumerable<CategoryDto>> GetAllAsync();
    Task<CategoryDto?> GetByIdAsync(int id);
    Task<CategoryDto> CreateAsync(CreateCategoryDto createDto);
    Task<CategoryDto?> UpdateAsync(int id, UpdateCategoryDto updateDto);
    Task<bool> DeleteAsync(int id);
    Task<bool> ExistsAsync(string name, int? excludeId = null);
}
