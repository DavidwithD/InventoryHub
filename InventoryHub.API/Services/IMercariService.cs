using InventoryHub.API.DTOs;

namespace InventoryHub.API.Services;

public interface IMercariService
{
    Task<ImportResultDto> ImportOrdersFromCurlAsync(string curlCommand, bool skipExisting);
}
