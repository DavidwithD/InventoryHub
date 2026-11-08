using System.Net;
using System.Net.Http.Json;
using InventoryHub.API.DTOs;
using InventoryHub.Tests.Support;
using Xunit;

namespace InventoryHub.Tests.Integration;

public class CatalogApiTests : IClassFixture<ApiFactory>
{
    private readonly ApiClient _api;

    public CatalogApiTests(ApiFactory factory)
    {
        _api = new ApiClient(factory.CreateClient());
    }

    [Fact]
    public async Task Health_endpoint_reports_ok()
    {
        var response = await _api.Http.GetAsync("/api/health");

        response.EnsureSuccessStatusCode();
        Assert.Contains("OK", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Category_lifecycle_create_read_rename_delete()
    {
        var created = await _api.Http.PostAsJsonAsync("/api/categories", new CreateCategoryDto { Name = "Lifecycle" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var category = (await created.Content.ReadFromJsonAsync<CategoryDto>())!;
        Assert.NotNull(created.Headers.Location);

        var renamed = await _api.Http.PutAsJsonAsync($"/api/categories/{category.Id}", new UpdateCategoryDto { Name = "Lifecycle 2" });
        renamed.EnsureSuccessStatusCode();
        Assert.Equal("Lifecycle 2", (await _api.GetAsync<CategoryDto>($"/api/categories/{category.Id}")).Name);

        var deleted = await _api.Http.DeleteAsync($"/api/categories/{category.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _api.Http.GetAsync($"/api/categories/{category.Id}")).StatusCode);
    }

    [Fact]
    public async Task Duplicate_category_name_returns_bad_request()
    {
        await _api.CreateCategoryAsync("Duplicate");

        var response = await _api.Http.PostAsJsonAsync("/api/categories", new CreateCategoryDto { Name = "Duplicate" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Category_with_a_product_cannot_be_deleted()
    {
        var product = await _api.CreateProductAsync("Guarded product", "Guarded");

        var response = await _api.Http.DeleteAsync($"/api/categories/{product.CategoryId}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Product_with_unknown_category_returns_bad_request()
    {
        var response = await _api.Http.PostAsJsonAsync("/api/products", new CreateProductDto { CategoryId = 99999, Name = "Orphan" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Product_list_includes_the_category_name()
    {
        var product = await _api.CreateProductAsync("Listed product", "Listed");

        var products = await _api.GetAsync<List<ProductDto>>("/api/products");

        Assert.Contains(products, p => p.Id == product.Id && p.CategoryName == "Listed");
    }

    [Theory]
    [InlineData("/api/categories/99999")]
    [InlineData("/api/products/99999")]
    [InlineData("/api/inventory/99999")]
    [InlineData("/api/orders/99999")]
    [InlineData("/api/inventory/99999/delete-impact")]
    public async Task Missing_records_return_not_found(string url)
    {
        var response = await _api.Http.GetAsync(url);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
