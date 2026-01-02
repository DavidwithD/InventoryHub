using InventoryHub.API.DTOs;

namespace InventoryHub.API.Services;

public interface ISupplierService
{
    Task<IEnumerable<SupplierDto>> GetAllAsync();
    Task<SupplierDto?> GetByIdAsync(int id);
    Task<SupplierDto> CreateAsync(CreateSupplierDto dto);
    Task<SupplierDto?> UpdateAsync(int id, UpdateSupplierDto dto);
    // 不需要删除操作
    // Task<bool> DeleteAsync(int id);
    Task<bool> ExistsAsync(int id);
}
