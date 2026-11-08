using InventoryHub.API.DTOs;
using InventoryHub.API.Services;
using InventoryHub.Tests.Support;
using Xunit;

namespace InventoryHub.Tests.Unit;

// Tests for the category and product services.
public class CatalogServiceTests : IDisposable
{
    private readonly TestDb _db = new();

    public void Dispose() => _db.Dispose();

    private CategoryService NewCategoryService() => new(_db.NewContext(), TestDb.Mapper);

    private ProductService NewProductService() => new(_db.NewContext(), TestDb.Mapper);

    [Fact]
    public async Task Category_name_must_be_unique()
    {
        await NewCategoryService().CreateAsync(new CreateCategoryDto { Name = "Cards" });

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => NewCategoryService().CreateAsync(new CreateCategoryDto { Name = "Cards" }));
    }

    [Fact]
    public async Task Category_can_be_saved_with_its_own_name()
    {
        var category = await NewCategoryService().CreateAsync(new CreateCategoryDto { Name = "Cards" });

        var updated = await NewCategoryService().UpdateAsync(category.Id, new UpdateCategoryDto { Name = "Cards" });

        Assert.NotNull(updated);
    }

    [Fact]
    public async Task Category_rename_rejects_another_category_name()
    {
        await NewCategoryService().CreateAsync(new CreateCategoryDto { Name = "Cards" });
        var figures = await NewCategoryService().CreateAsync(new CreateCategoryDto { Name = "Figures" });

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => NewCategoryService().UpdateAsync(figures.Id, new UpdateCategoryDto { Name = "Cards" }));
    }

    [Fact]
    public async Task Category_with_products_cannot_be_deleted()
    {
        var product = _db.AddProduct();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => NewCategoryService().DeleteAsync(product.CategoryId));
    }

    [Fact]
    public async Task Deleted_category_is_hidden_from_the_list()
    {
        var category = await NewCategoryService().CreateAsync(new CreateCategoryDto { Name = "Cards" });

        Assert.True(await NewCategoryService().DeleteAsync(category.Id));

        Assert.Empty(await NewCategoryService().GetAllAsync());
        Assert.Null(await NewCategoryService().GetByIdAsync(category.Id));
    }

    [Fact]
    public async Task Categories_are_listed_by_name()
    {
        await NewCategoryService().CreateAsync(new CreateCategoryDto { Name = "B" });
        await NewCategoryService().CreateAsync(new CreateCategoryDto { Name = "A" });

        var names = (await NewCategoryService().GetAllAsync()).Select(c => c.Name);

        Assert.Equal(new[] { "A", "B" }, names);
    }

    [Fact]
    public async Task Product_needs_an_existing_category()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => NewProductService().CreateAsync(new CreateProductDto { CategoryId = 999, Name = "Card" }));
    }

    [Fact]
    public async Task Product_name_must_be_unique()
    {
        var product = _db.AddProduct("Card");

        await Assert.ThrowsAsync<InvalidOperationException>(() => NewProductService().CreateAsync(
            new CreateProductDto { CategoryId = product.CategoryId, Name = "Card" }));
    }

    [Fact]
    public async Task Product_update_keeps_the_image_when_none_is_sent()
    {
        var product = _db.AddProduct("Card");
        await NewProductService().UpdateAsync(product.Id,
            new UpdateProductDto { CategoryId = product.CategoryId, Name = "Card", ImageUrl = "https://img/1.jpg" });

        var updated = await NewProductService().UpdateAsync(product.Id,
            new UpdateProductDto { CategoryId = product.CategoryId, Name = "Card v2" });

        Assert.NotNull(updated);
        Assert.Equal("Card v2", updated.Name);
        Assert.Equal("https://img/1.jpg", updated.ImageUrl);
    }

    [Fact]
    public async Task Product_with_inventory_cannot_be_deleted()
    {
        var product = _db.AddProduct();
        _db.AddBatch(product.Id, null, 1, 100m);

        await Assert.ThrowsAsync<InvalidOperationException>(() => NewProductService().DeleteAsync(product.Id));
    }

    [Fact]
    public async Task Product_without_records_can_be_deleted()
    {
        var product = _db.AddProduct();

        Assert.True(await NewProductService().DeleteAsync(product.Id));
        Assert.False(await NewProductService().ExistsAsync(product.Id));
    }
}
