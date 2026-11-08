using InventoryHub.API.Services;
using InventoryHub.Tests.Support;
using Xunit;

namespace InventoryHub.Tests.Unit;

public class StatsServiceTests : IDisposable
{
    private readonly TestDb _db = new();

    public void Dispose() => _db.Dispose();

    private StatsService NewService()
    {
        var context = _db.NewContext();
        return new StatsService(context, new FifoService(context));
    }

    [Fact]
    public async Task Purchases_page_sums_batch_spend_by_supplier()
    {
        var product = _db.AddProduct();
        var taobao = _db.AddSupplier("Taobao");
        var pdd = _db.AddSupplier("Pinduoduo");
        _db.AddBatch(product.Id, new DateTime(2026, 1, 5), 2, 100m, taobao.Id);
        _db.AddBatch(product.Id, new DateTime(2026, 1, 20), 3, 50m, taobao.Id);
        _db.AddBatch(product.Id, new DateTime(2026, 2, 3), 4, 25m, pdd.Id);
        _db.AddBatch(product.Id, new DateTime(2026, 2, 10), 1, 10m);
        // Outside the period.
        _db.AddBatch(product.Id, new DateTime(2026, 4, 1), 9, 999m, taobao.Id);

        var page = await NewService().GetPurchasesPageAsync(
            new DateTime(2026, 1, 1), new DateTime(2026, 3, 1), "month", null);

        Assert.Equal(new[] { "Pinduoduo", "Taobao", "未指定供应商" }, page.SupplierNames);
        Assert.Equal(2, page.SpendingTrend.Count);
        var january = Assert.Single(page.SpendingTrend[0].BySupplier);
        Assert.Equal("Taobao", january.Supplier);
        Assert.Equal(2 * 100m + 3 * 50m, january.Amount);
        Assert.Equal(
            new Dictionary<string, decimal> { ["Pinduoduo"] = 100m, ["未指定供应商"] = 10m },
            page.SpendingTrend[1].BySupplier.ToDictionary(s => s.Supplier, s => s.Amount));

        Assert.Equal(new[] { "Taobao", "Pinduoduo", "未指定供应商" }, page.SupplierConcentration.Select(s => s.SupplierName));
        Assert.Equal(350m, page.SupplierConcentration[0].TotalSpend);
        Assert.Equal(76.1, page.SupplierConcentration[0].Pct);
    }
}
