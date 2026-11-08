using InventoryHub.API.DTOs;
using InventoryHub.API.Services;
using InventoryHub.Tests.Support;
using Xunit;

namespace InventoryHub.Tests.Unit;

public class InventoryServiceTests : IDisposable
{
    private readonly TestDb _db = new();

    public void Dispose() => _db.Dispose();

    private InventoryService NewService()
    {
        var context = _db.NewContext();
        return new InventoryService(context, TestDb.Mapper, new FifoService(context));
    }

    private static UpdateInventoryDto Edit(int productId, DateTime? date, int stock, decimal price) => new()
    {
        ProductId = productId,
        PurchaseDate = date,
        PurchaseQuantity = Math.Max(stock, 1),
        InitialStock = stock,
        PriceJpy = price
    };

    [Fact]
    public async Task Stock_quantity_is_initial_stock_minus_fifo_sales()
    {
        var product = _db.AddProduct();
        var batch = _db.AddBatch(product.Id, new DateTime(2026, 1, 1), 5, 100m);
        _db.AddOrder("M1", new DateTime(2026, 2, 1), 1000m, (product.Id, 2));

        var dto = await NewService().GetByIdAsync(batch.Id);

        Assert.NotNull(dto);
        Assert.Equal(5, dto.InitialStock);
        Assert.Equal(3, dto.StockQuantity);
        Assert.Equal("Cards", dto.CategoryName);
    }

    [Fact]
    public async Task Create_rejects_zero_purchase_quantity()
    {
        var product = _db.AddProduct();

        await Assert.ThrowsAsync<InvalidOperationException>(() => NewService().CreateAsync(
            new CreateInventoryDto { ProductId = product.Id, PurchaseQuantity = 0, InitialStock = 0 }));
    }

    [Fact]
    public async Task Create_rejects_negative_stock()
    {
        var product = _db.AddProduct();

        await Assert.ThrowsAsync<InvalidOperationException>(() => NewService().CreateAsync(
            new CreateInventoryDto { ProductId = product.Id, PurchaseQuantity = 1, InitialStock = -1 }));
    }

    [Fact]
    public async Task Create_rejects_an_unknown_product()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() => NewService().CreateAsync(
            new CreateInventoryDto { ProductId = 999, PurchaseQuantity = 1, InitialStock = 1 }));
    }

    [Fact]
    public async Task Batch_create_returns_every_created_row()
    {
        var product = _db.AddProduct();
        var items = Enumerable.Range(1, 3)
            .Select(i => new CreateInventoryDto { ProductId = product.Id, PurchaseQuantity = i, InitialStock = i, PriceJpy = 10m * i })
            .ToList();

        var created = (await NewService().BatchCreateAsync(items)).ToList();

        Assert.Equal(3, created.Count);
        Assert.Equal(new[] { 1, 2, 3 }, created.Select(c => c.StockQuantity));
    }

    [Fact]
    public async Task Preview_delete_counts_lines_that_move_to_another_batch()
    {
        var product = _db.AddProduct();
        var first = _db.AddBatch(product.Id, new DateTime(2026, 1, 1), 2, 100m);
        _db.AddBatch(product.Id, new DateTime(2026, 1, 2), 5, 150m);
        _db.AddOrder("M1", new DateTime(2026, 2, 1), 1000m, (product.Id, 2));
        _db.AddOrder("M2", new DateTime(2026, 2, 2), 1000m, (product.Id, 1));

        var impact = await NewService().PreviewDeleteAsync(first.Id);

        Assert.NotNull(impact);
        // M1 moves from the 100 batch to the 150 batch. M2 already used the 150 batch and keeps it.
        Assert.Equal(1, impact.AffectedOrders);
        Assert.Equal(1, impact.AffectedLines);
        Assert.Equal(0, impact.NewlyUnmatchedQuantity);
        Assert.Equal(2 * 50m, impact.CostChange);
    }

    [Fact]
    public async Task Preview_update_reports_units_that_lose_their_batch()
    {
        var product = _db.AddProduct();
        var batch = _db.AddBatch(product.Id, new DateTime(2026, 1, 1), 3, 100m);
        _db.AddOrder("M1", new DateTime(2026, 2, 1), 1000m, (product.Id, 3));

        var impact = await NewService().PreviewUpdateAsync(batch.Id, Edit(product.Id, new DateTime(2026, 1, 1), 1, 100m));

        Assert.NotNull(impact);
        Assert.Equal(2, impact.NewlyUnmatchedQuantity);
        Assert.Equal(-200m, impact.CostChange);
    }

    [Fact]
    public async Task Preview_does_not_change_saved_data()
    {
        var product = _db.AddProduct();
        var batch = _db.AddBatch(product.Id, new DateTime(2026, 1, 1), 3, 100m);

        await NewService().PreviewUpdateAsync(batch.Id, Edit(product.Id, null, 0, 1m));
        await NewService().PreviewDeleteAsync(batch.Id);

        var saved = await NewService().GetByIdAsync(batch.Id);
        Assert.NotNull(saved);
        Assert.Equal(3, saved.InitialStock);
        Assert.Equal(100m, saved.PriceJpy);
    }

    [Fact]
    public async Task Preview_returns_null_for_a_missing_batch()
    {
        Assert.Null(await NewService().PreviewDeleteAsync(999));
    }

    [Fact]
    public async Task Deleted_batch_is_hidden_and_sales_move_to_the_next_batch()
    {
        var product = _db.AddProduct();
        var first = _db.AddBatch(product.Id, new DateTime(2026, 1, 1), 2, 100m);
        var second = _db.AddBatch(product.Id, new DateTime(2026, 1, 2), 5, 150m);
        _db.AddOrder("M1", new DateTime(2026, 2, 1), 1000m, (product.Id, 2));

        Assert.True(await NewService().DeleteAsync(first.Id));

        Assert.Null(await NewService().GetByIdAsync(first.Id));
        Assert.Equal(3, (await NewService().GetByIdAsync(second.Id))!.StockQuantity);
    }
}
