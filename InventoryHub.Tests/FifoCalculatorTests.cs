using InventoryHub.API.Services;
using Xunit;

namespace InventoryHub.Tests;

public class FifoCalculatorTests
{
    private const int Product = 1;

    private static DateTime Day(int month, int day) => new(2026, month, day);

    private static FifoBatch Batch(int id, DateTime? date, int stock, decimal price, int product = Product) =>
        new(id, product, date, stock, price);

    private static FifoSale Sale(int detailId, DateTime time, int quantity, int product = Product) =>
        new(detailId, product, time, quantity);

    [Fact]
    public void Sale_takes_the_oldest_batch_first()
    {
        var result = FifoCalculator.Calculate(
            new[] { Batch(2, Day(2, 1), 5, 200m), Batch(1, Day(1, 1), 5, 100m) },
            new[] { Sale(10, Day(3, 1), 2) });

        var allocation = Assert.Single(result.Allocations(10));
        Assert.Equal(1, allocation.InventoryId);
        Assert.Equal(200m, result.BatchCost(10));
        Assert.Equal(3, result.Remaining(1));
        Assert.Equal(5, result.Remaining(2));
    }

    [Fact]
    public void Sale_can_span_several_batches()
    {
        var result = FifoCalculator.Calculate(
            new[] { Batch(1, Day(1, 1), 1, 100m), Batch(2, Day(2, 1), 5, 200m) },
            new[] { Sale(10, Day(3, 1), 3) });

        Assert.Equal(2, result.Allocations(10).Count);
        Assert.Equal(500m, result.BatchCost(10));
        Assert.Equal(0, result.Remaining(1));
        Assert.Equal(3, result.Remaining(2));
        Assert.Equal(0, result.Unmatched(10));
    }

    [Fact]
    public void Entry_order_does_not_change_the_result()
    {
        var batches = new[] { Batch(1, Day(1, 1), 1, 100m), Batch(2, Day(2, 1), 1, 200m) };

        // Detail 10 was entered first but sold later.
        var result = FifoCalculator.Calculate(
            batches,
            new[] { Sale(10, Day(2, 15), 1), Sale(11, Day(1, 15), 1) });

        Assert.Equal(100m, result.BatchCost(11));
        Assert.Equal(200m, result.BatchCost(10));
        Assert.Equal(0, result.Unmatched(10));
        Assert.Equal(0, result.Unmatched(11));
    }

    [Fact]
    public void Sale_skips_a_batch_purchased_after_the_sale()
    {
        var result = FifoCalculator.Calculate(
            new[] { Batch(1, Day(2, 23), 5, 100m) },
            new[] { Sale(10, Day(1, 4), 2) });

        Assert.Empty(result.Allocations(10));
        Assert.Equal(2, result.Unmatched(10));
        Assert.Equal(0m, result.BatchCost(10));
        Assert.Equal(5, result.Remaining(1));
    }

    [Fact]
    public void Sale_at_the_exact_purchase_time_can_use_the_batch()
    {
        var result = FifoCalculator.Calculate(
            new[] { Batch(1, Day(1, 1), 1, 100m) },
            new[] { Sale(10, Day(1, 1), 1) });

        Assert.Equal(0, result.Unmatched(10));
    }

    [Fact]
    public void Shortage_keeps_the_matched_part_and_reports_the_rest()
    {
        var result = FifoCalculator.Calculate(
            new[] { Batch(1, Day(1, 1), 2, 100m) },
            new[] { Sale(10, Day(2, 1), 5) });

        Assert.Equal(200m, result.BatchCost(10));
        Assert.Equal(3, result.Unmatched(10));
        Assert.Equal(0, result.Remaining(1));
    }

    [Fact]
    public void Batch_with_negative_stock_is_skipped()
    {
        var result = FifoCalculator.Calculate(
            new[] { Batch(1, Day(1, 1), -3, 100m), Batch(2, Day(1, 2), 5, 200m) },
            new[] { Sale(10, Day(2, 1), 2) });

        var allocation = Assert.Single(result.Allocations(10));
        Assert.Equal(2, allocation.InventoryId);
        Assert.Equal(2, allocation.Quantity);
        Assert.Equal(-3, result.Remaining(1));
        Assert.Equal(3, result.Remaining(2));
    }

    [Fact]
    public void Stock_value_and_low_stock_use_remaining_units()
    {
        var result = FifoCalculator.Calculate(
            new[] { Batch(1, Day(1, 1), 6, 100m), Batch(2, Day(1, 2), 10, 200m), Batch(3, Day(1, 3), 2, 50m) },
            new[] { Sale(10, Day(2, 1), 9), Sale(11, Day(2, 2), 2, product: 2) });

        // Batch 1 is empty, batch 2 has 7 left and batch 3 has 2 left.
        Assert.Equal(7 * 200m + 2 * 50m, result.StockValue());
        Assert.Equal(1, result.LowStockBatchCount());
        Assert.Equal(2, result.Sales.Count);
    }

    [Fact]
    public void Undated_batch_is_used_only_after_dated_batches()
    {
        var result = FifoCalculator.Calculate(
            new[] { Batch(1, null, 5, 999m), Batch(2, Day(1, 1), 1, 100m) },
            new[] { Sale(10, Day(2, 1), 2) });

        Assert.Equal(1099m, result.BatchCost(10));
        Assert.Equal(4, result.Remaining(1));
        Assert.Equal(0, result.Remaining(2));
    }

    [Fact]
    public void Same_sale_time_uses_detail_id_order()
    {
        var result = FifoCalculator.Calculate(
            new[] { Batch(1, Day(1, 1), 1, 100m), Batch(2, Day(1, 2), 1, 200m) },
            new[] { Sale(11, Day(2, 1), 1), Sale(10, Day(2, 1), 1) });

        Assert.Equal(100m, result.BatchCost(10));
        Assert.Equal(200m, result.BatchCost(11));
    }

    [Fact]
    public void Products_do_not_share_batches()
    {
        var result = FifoCalculator.Calculate(
            new[] { Batch(1, Day(1, 1), 5, 100m, product: 1) },
            new[] { Sale(10, Day(2, 1), 1, product: 2) });

        Assert.Equal(1, result.Unmatched(10));
        Assert.Equal(5, result.Remaining(1));
    }

    [Fact]
    public void Compare_finds_no_change_when_an_unused_batch_is_removed()
    {
        var sales = new[] { Sale(10, Day(3, 1), 2) };
        var before = FifoCalculator.Calculate(
            new[] { Batch(1, Day(1, 1), 5, 100m), Batch(2, Day(2, 1), 5, 200m) }, sales);
        var after = FifoCalculator.Calculate(new[] { Batch(1, Day(1, 1), 5, 100m) }, sales);

        var impact = FifoCalculator.Compare(before, after);

        Assert.Empty(impact.ChangedDetailIds);
        Assert.Equal(0, impact.NewlyUnmatched);
        Assert.Equal(0m, impact.CostChange);
    }

    [Fact]
    public void Compare_reports_a_sale_moved_to_another_batch()
    {
        var sales = new[] { Sale(10, Day(3, 1), 2) };
        var before = FifoCalculator.Calculate(
            new[] { Batch(1, Day(1, 1), 5, 100m), Batch(2, Day(2, 1), 5, 200m) }, sales);
        var after = FifoCalculator.Calculate(new[] { Batch(2, Day(2, 1), 5, 200m) }, sales);

        var impact = FifoCalculator.Compare(before, after);

        Assert.Equal(new[] { 10 }, impact.ChangedDetailIds);
        Assert.Equal(0, impact.NewlyUnmatched);
        Assert.Equal(200m, impact.CostChange);
    }

    [Fact]
    public void Compare_counts_units_that_lose_their_batch()
    {
        var sales = new[] { Sale(10, Day(3, 1), 3) };
        var before = FifoCalculator.Calculate(new[] { Batch(1, Day(1, 1), 5, 100m) }, sales);
        var after = FifoCalculator.Calculate(new[] { Batch(1, Day(1, 1), 1, 100m) }, sales);

        var impact = FifoCalculator.Compare(before, after);

        Assert.Equal(new[] { 10 }, impact.ChangedDetailIds);
        Assert.Equal(2, impact.NewlyUnmatched);
        Assert.Equal(-200m, impact.CostChange);
    }

    [Fact]
    public void Compare_reports_a_price_change()
    {
        var sales = new[] { Sale(10, Day(3, 1), 2) };
        var before = FifoCalculator.Calculate(new[] { Batch(1, Day(1, 1), 5, 100m) }, sales);
        var after = FifoCalculator.Calculate(new[] { Batch(1, Day(1, 1), 5, 50m) }, sales);

        var impact = FifoCalculator.Compare(before, after);

        Assert.Equal(new[] { 10 }, impact.ChangedDetailIds);
        Assert.Equal(-100m, impact.CostChange);
    }
}
