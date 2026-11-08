using System.Net.Http.Json;
using InventoryHub.API.DTOs;

namespace InventoryHub.Tests.Support;

// Typed calls for the API endpoints the integration tests use. Each call fails the test on an error status.
public class ApiClient(HttpClient http)
{
    public HttpClient Http { get; } = http;

    public async Task<T> GetAsync<T>(string url)
    {
        var response = await Http.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    public async Task<T> PostAsync<T>(string url, object body)
    {
        var response = await Http.PostAsJsonAsync(url, body);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    public Task<CategoryDto> CreateCategoryAsync(string name) =>
        PostAsync<CategoryDto>("/api/categories", new CreateCategoryDto { Name = name });

    public async Task<ProductDto> CreateProductAsync(string name, string category)
    {
        var categoryDto = await CreateCategoryAsync(category);
        return await PostAsync<ProductDto>("/api/products", new CreateProductDto { CategoryId = categoryDto.Id, Name = name });
    }

    public Task<InventoryDto> CreateBatchAsync(int productId, DateTime purchaseDate, int stock, decimal priceJpy) =>
        PostAsync<InventoryDto>("/api/inventory", new CreateInventoryDto
        {
            ProductId = productId,
            PurchaseDate = purchaseDate,
            PurchaseQuantity = stock,
            InitialStock = stock,
            PriceJpy = priceJpy
        });

    public Task<OrderDto> CreateOrderAsync(string orderNo, DateTime time, decimal revenue, int productId, int quantity) =>
        PostAsync<OrderDto>("/api/orders", new CreateOrderWithDetailsDto
        {
            OrderNo = orderNo,
            TransactionTime = time,
            Revenue = revenue,
            Details = new() { new CreateOrderDetailDto { ProductId = productId, Quantity = quantity } }
        });
}
