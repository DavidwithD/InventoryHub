using InventoryHub.API.Models;

namespace InventoryHub.API.Services;

public record FifoBatch(int Id, int ProductId, DateTime? PurchaseDate, int InitialStock, decimal PriceJpy);

public record FifoSale(int DetailId, int ProductId, DateTime SaleTime, int Quantity);

public record FifoAllocation(int InventoryId, int Quantity, decimal UnitCost, DateTime? PurchaseDate);

// CostChange covers matched units only. NewlyUnmatched counts units that lose their batch.
public record FifoImpact(IReadOnlyList<int> ChangedDetailIds, int NewlyUnmatched, decimal CostChange);

public class FifoResult
{
    private static readonly IReadOnlyList<FifoAllocation> NoAllocations = Array.Empty<FifoAllocation>();

    // A batch with fewer units than this counts as low stock.
    public const int LowStockThreshold = 5;

    public FifoResult(IReadOnlyList<FifoBatch> batches, IReadOnlyList<FifoSale> sales)
    {
        Batches = batches;
        Sales = sales;
    }

    // The batches and sales this result was calculated from.
    public IReadOnlyList<FifoBatch> Batches { get; }
    public IReadOnlyList<FifoSale> Sales { get; }

    public Dictionary<int, List<FifoAllocation>> AllocationsByDetail { get; } = new();
    public Dictionary<int, int> UnmatchedByDetail { get; } = new();
    public Dictionary<int, int> RemainingByBatch { get; } = new();

    public IReadOnlyList<FifoAllocation> Allocations(int detailId) =>
        AllocationsByDetail.TryGetValue(detailId, out var allocations) ? allocations : NoAllocations;

    public int Unmatched(int detailId) => UnmatchedByDetail.GetValueOrDefault(detailId);

    public int Remaining(int batchId) => RemainingByBatch.GetValueOrDefault(batchId);

    // Cost of the matched units only. Unmatched units add no cost.
    public decimal BatchCost(int detailId) => Allocations(detailId).Sum(a => a.Quantity * a.UnitCost);

    public decimal LineCost(OrderDetail detail) => BatchCost(detail.Id) + detail.PackagingCost + detail.OtherCost;

    // Value of the remaining units at each batch's JPY price.
    public decimal StockValue() => Batches.Sum(b => Remaining(b.Id) * b.PriceJpy);

    public int LowStockBatchCount() =>
        Batches.Count(b => Remaining(b.Id) > 0 && Remaining(b.Id) < LowStockThreshold);
}

public static class FifoCalculator
{
    // Sales run in sale-time order. Each sale takes units from the oldest batch that has stock
    // and was purchased on or before the sale. Batches with no purchase date are used last.
    public static FifoResult Calculate(IEnumerable<FifoBatch> batches, IEnumerable<FifoSale> sales)
    {
        var batchList = batches.ToList();
        var saleList = sales.ToList();
        var result = new FifoResult(batchList, saleList);
        var batchesByProduct = batchList
            .GroupBy(b => b.ProductId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(b => b.PurchaseDate.HasValue ? 0 : 1)
                    .ThenBy(b => b.PurchaseDate)
                    .ThenBy(b => b.Id)
                    .ToList());

        foreach (var batch in batchesByProduct.Values.SelectMany(b => b))
        {
            result.RemainingByBatch[batch.Id] = batch.InitialStock;
        }

        foreach (var sale in saleList.OrderBy(s => s.SaleTime).ThenBy(s => s.DetailId))
        {
            var allocations = new List<FifoAllocation>();
            var needed = sale.Quantity;

            foreach (var batch in batchesByProduct.GetValueOrDefault(sale.ProductId) ?? new List<FifoBatch>())
            {
                if (needed == 0) break;
                if (batch.PurchaseDate > sale.SaleTime) continue;

                var taken = Math.Min(needed, result.RemainingByBatch[batch.Id]);
                if (taken <= 0) continue;

                result.RemainingByBatch[batch.Id] -= taken;
                needed -= taken;
                allocations.Add(new FifoAllocation(batch.Id, taken, batch.PriceJpy, batch.PurchaseDate));
            }

            result.AllocationsByDetail[sale.DetailId] = allocations;
            if (needed > 0)
            {
                result.UnmatchedByDetail[sale.DetailId] = needed;
            }
        }

        return result;
    }

    // Compares two results for the same sales. A line changes when its allocations or unmatched units differ.
    public static FifoImpact Compare(FifoResult before, FifoResult after)
    {
        var changed = new List<int>();
        var newlyUnmatched = 0;
        var costChange = 0m;

        foreach (var detailId in before.AllocationsByDetail.Keys.OrderBy(id => id))
        {
            var unmatchedBefore = before.Unmatched(detailId);
            var unmatchedAfter = after.Unmatched(detailId);
            var sameAllocations = before.Allocations(detailId).SequenceEqual(after.Allocations(detailId));
            if (sameAllocations && unmatchedBefore == unmatchedAfter) continue;

            changed.Add(detailId);
            newlyUnmatched += Math.Max(0, unmatchedAfter - unmatchedBefore);
            costChange += after.BatchCost(detailId) - before.BatchCost(detailId);
        }

        return new FifoImpact(changed, newlyUnmatched, costChange);
    }
}
