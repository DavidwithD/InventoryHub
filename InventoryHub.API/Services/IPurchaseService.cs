using InventoryHub.API.DTOs;

namespace InventoryHub.API.Services;

public interface IPurchaseService
{
    Task<IEnumerable<PurchaseDto>> GetAllAsync(
        string? purchaseNo = null,
        int? supplierId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        string sortBy = "purchaseDate",
        string sortOrder = "desc");
    Task<PurchaseDto?> GetByIdAsync(int id);
    Task<PurchaseDto> CreateAsync(CreatePurchaseDto dto);
    Task<PurchaseDto?> UpdateAsync(int id, UpdatePurchaseDto dto);
    Task<bool> DeleteAsync(int id);
    Task<bool> ExistsAsync(int id);
}
