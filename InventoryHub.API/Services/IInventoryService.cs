using InventoryHub.API.DTOs;

namespace InventoryHub.API.Services;

public interface IInventoryService
{
    Task<IEnumerable<InventoryDto>> GetAllAsync();
    Task<InventoryDto?> GetByIdAsync(int id);
    Task<InventoryDto> CreateAsync(CreateInventoryDto dto);
    Task<IEnumerable<InventoryDto>> BatchCreateAsync(List<CreateInventoryDto> dtos);
    Task<InventoryDto?> UpdateAsync(int id, UpdateInventoryDto dto);
    Task<bool> DeleteAsync(int id);
}
