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

    [Fact]
    public async Task Purchases_page_keeps_suppliers_with_the_same_name_apart()
    {
        var product = _db.AddProduct();
        // Names are unique per is_deleted value, so a name repeats only after a soft delete.
        var first = _db.AddSupplier("Taobao");
        using (var context = _db.NewContext())
        {
            context.Suppliers.Find(first.Id)!.IsDeleted = true;
            context.SaveChanges();
        }
        var second = _db.AddSupplier("Taobao");
        var named = _db.AddSupplier("未指定供应商");
        _db.AddBatch(product.Id, new DateTime(2026, 1, 5), 1, 100m, first.Id);
        _db.AddBatch(product.Id, new DateTime(2026, 1, 6), 1, 200m, second.Id);
        _db.AddBatch(product.Id, new DateTime(2026, 1, 7), 1, 300m, named.Id);
        _db.AddBatch(product.Id, new DateTime(2026, 1, 8), 1, 400m);

        var page = await NewService().GetPurchasesPageAsync(
            new DateTime(2026, 1, 1), new DateTime(2026, 2, 1), "month", null);

        Assert.Equal(
            new Dictionary<string, decimal>
            {
                [$"Taobao (#{first.Id})"] = 100m,
                [$"Taobao (#{second.Id})"] = 200m,
                [$"未指定供应商 (#{named.Id})"] = 300m,
                ["未指定供应商"] = 400m,
            },
            page.SupplierConcentration.ToDictionary(s => s.SupplierName, s => s.TotalSpend));
    }

    [Fact]
    public async Task Purchases_page_unit_cost_is_the_batch_unit_price()
    {
        var card = _db.AddProduct("Card");
        var sleeve = _db.AddProduct("Sleeve");
        _db.AddBatch(card.Id, new DateTime(2026, 1, 5), 2, 100m);
        _db.AddBatch(sleeve.Id, new DateTime(2026, 1, 6), 4, 30m);
        var deleted = _db.AddBatch(card.Id, new DateTime(2026, 1, 7), 1, 999m);
        using (var context = _db.NewContext())
        {
            context.Inventory.Find(deleted.Id)!.IsDeleted = true;
            context.SaveChanges();
        }

        var all = await NewService().GetPurchasesPageAsync(
            new DateTime(2026, 1, 1), new DateTime(2026, 2, 1), "month", null);
        var cardOnly = await NewService().GetPurchasesPageAsync(
            new DateTime(2026, 1, 1), new DateTime(2026, 2, 1), "month", card.Id);

        Assert.Equal(new[] { 100m, 30m }, all.UnitCostTrend.Select(p => p.UnitCost));
        Assert.Equal(new[] { "Card", "Sleeve" }, all.Products);
        Assert.Equal(2 * 100m + 4 * 30m, all.SupplierConcentration.Sum(s => s.TotalSpend));
        Assert.Equal(new[] { 100m }, cardOnly.UnitCostTrend.Select(p => p.UnitCost));
        Assert.Equal(new[] { "Card", "Sleeve" }, cardOnly.Products);
    }
}
