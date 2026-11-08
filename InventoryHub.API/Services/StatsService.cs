using InventoryHub.API.Data;
using InventoryHub.API.DTOs;
using InventoryHub.API.Models;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.API.Services;

public interface IStatsService
{
    Task<StatsDashboardKpiDto> GetDashboardKpiAsync(DateTime start, DateTime end);
    Task<List<StatsTrendPointDto>> GetRevenueProfitTrendAsync(DateTime start, DateTime end, string granularity);
    Task<List<StatsCategorySalesDto>> GetCategorySalesAsync(DateTime start, DateTime end);
    Task<List<StatsTopProductDto>> GetTopProductsAsync(DateTime start, DateTime end, int count = 5);
    Task<StatsInventoryHealthDto> GetInventoryHealthAsync(int windowDays);
    Task<StatsProductsPageDto> GetProductsPageAsync(DateTime start, DateTime end);
    Task<StatsPurchasesPageDto> GetPurchasesPageAsync(DateTime start, DateTime end, string granularity, int? productId);
}

public class StatsService : IStatsService
{
    private readonly AppDbContext _db;
    private readonly IFifoService _fifoService;

    public StatsService(AppDbContext db, IFifoService fifoService)
    {
        _db = db;
        _fifoService = fifoService;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static decimal PctChange(decimal prev, decimal curr) =>
        prev == 0 ? 0 : Math.Round((curr - prev) / prev * 100, 1);

    private static decimal OrderProfit(decimal revenue, IEnumerable<decimal> subtotalCosts) =>
        revenue - subtotalCosts.Sum();

    // An order with unmatched units has an unknown cost. Profit and margin leave it out.
    private static bool HasKnownCost(Order order, FifoResult fifo) =>
        !order.OrderDetails.Any(d => fifo.Unmatched(d.Id) > 0);

    // Revenue is stored per order. Each line gets a share in proportion to its quantity.
    // The details must hold every live line of each order, with Order loaded.
    private static Dictionary<int, decimal> LineRevenue(IEnumerable<OrderDetail> details) =>
        details
            .GroupBy(d => d.OrderId)
            .SelectMany(g =>
            {
                int totalQuantity = g.Sum(d => d.Quantity);
                return g.Select(d => new
                {
                    d.Id,
                    Revenue = totalQuantity > 0 ? d.Order.Revenue * d.Quantity / totalQuantity : 0,
                });
            })
            .ToDictionary(x => x.Id, x => x.Revenue);

    // Profit counts only lines with a known cost. Margin uses the revenue of those lines.
    private static (decimal Profit, decimal MarginPct) LineProfit(
        IEnumerable<OrderDetail> lines, Dictionary<int, decimal> lineRevenue, FifoResult fifo)
    {
        var costed = lines.Where(d => fifo.Unmatched(d.Id) == 0).ToList();
        decimal costedRevenue = costed.Sum(d => lineRevenue[d.Id]);
        decimal profit = costed.Sum(d => lineRevenue[d.Id] - fifo.LineCost(d));
        decimal margin = costedRevenue > 0 ? Math.Round(profit / costedRevenue * 100, 1) : 0;
        return (profit, margin);
    }

    private string PeriodLabel(DateTime date, string granularity) => granularity switch
    {
        "day" => date.ToString("MM/dd"),
        "week" => $"W{System.Globalization.ISOWeek.GetWeekOfYear(date)}",
        "month" => date.ToString("yyyy/MM"),
        "quarter" => $"{date.Year}Q{(date.Month - 1) / 3 + 1}",
        _ => date.ToString("MM/dd"),
    };

    private DateTime TruncateTo(DateTime date, string granularity) => granularity switch
    {
        "day" => date.Date,
        "week" => date.Date.AddDays(-(int)date.DayOfWeek + (int)DayOfWeek.Monday),
        "month" => new DateTime(date.Year, date.Month, 1),
        "quarter" => new DateTime(date.Year, ((date.Month - 1) / 3) * 3 + 1, 1),
        _ => date.Date,
    };

    // ── Dashboard KPI ─────────────────────────────────────────────────────────

    public async Task<StatsDashboardKpiDto> GetDashboardKpiAsync(DateTime start, DateTime end)
    {
        var fifo = await _fifoService.CalculateAsync();
        var periodLen = end - start;
        var prevStart = start - periodLen;
        var prevEnd = start;

        var orders = await _db.Orders
            .Include(o => o.OrderDetails.Where(d => !d.IsDeleted))
            .Where(o => !o.IsDeleted && o.TransactionTime >= start && o.TransactionTime < end)
            .ToListAsync();

        var prevOrders = await _db.Orders
            .Include(o => o.OrderDetails.Where(d => !d.IsDeleted))
            .Where(o => !o.IsDeleted && o.TransactionTime >= prevStart && o.TransactionTime < prevEnd)
            .ToListAsync();

        var costedOrders = orders.Where(o => HasKnownCost(o, fifo)).ToList();
        var prevCostedOrders = prevOrders.Where(o => HasKnownCost(o, fifo)).ToList();

        decimal revenue = orders.Sum(o => o.Revenue);
        decimal costedRevenue = costedOrders.Sum(o => o.Revenue);
        decimal profit = costedOrders.Sum(o => OrderProfit(o.Revenue, o.OrderDetails.Select(fifo.LineCost)));
        decimal margin = costedRevenue > 0 ? Math.Round(profit / costedRevenue * 100, 1) : 0;
        int count = orders.Count;
        decimal aov = count > 0 ? Math.Round(revenue / count, 0) : 0;

        decimal prevRevenue = prevOrders.Sum(o => o.Revenue);
        decimal prevCostedRevenue = prevCostedOrders.Sum(o => o.Revenue);
        decimal prevProfit = prevCostedOrders.Sum(o => OrderProfit(o.Revenue, o.OrderDetails.Select(fifo.LineCost)));
        decimal prevMargin = prevCostedRevenue > 0 ? Math.Round(prevProfit / prevCostedRevenue * 100, 1) : 0;
        int prevCount = prevOrders.Count;
        decimal prevAov = prevCount > 0 ? Math.Round(prevRevenue / prevCount, 0) : 0;

        var stockValue = fifo.StockValue();
        var lowStockItems = fifo.LowStockBatchCount();

        return new StatsDashboardKpiDto
        {
            TotalRevenue = revenue,
            TotalProfit = profit,
            AvgMarginPct = margin,
            OrdersCount = count,
            AvgOrderValue = aov,
            StockValue = stockValue,
            LowStockItems = lowStockItems,
            RevenuePctChange = PctChange(prevRevenue, revenue),
            ProfitPctChange = PctChange(prevProfit, profit),
            MarginPpChange = Math.Round(margin - prevMargin, 1),
            OrdersCountPctChange = PctChange(prevCount, count),
            AvgOrderValuePctChange = PctChange(prevAov, aov),
        };
    }

    // ── Revenue vs Profit Trend ───────────────────────────────────────────────

    public async Task<List<StatsTrendPointDto>> GetRevenueProfitTrendAsync(DateTime start, DateTime end, string granularity)
    {
        var fifo = await _fifoService.CalculateAsync();
        var orders = await _db.Orders
            .Include(o => o.OrderDetails.Where(d => !d.IsDeleted))
            .Where(o => !o.IsDeleted && o.TransactionTime >= start && o.TransactionTime < end)
            .ToListAsync();

        var grouped = orders
            .GroupBy(o => TruncateTo(o.TransactionTime, granularity))
            .OrderBy(g => g.Key)
            .Select(g => new StatsTrendPointDto
            {
                Label = PeriodLabel(g.Key, granularity),
                Revenue = g.Sum(o => o.Revenue),
                Profit = g.Where(o => HasKnownCost(o, fifo))
                    .Sum(o => OrderProfit(o.Revenue, o.OrderDetails.Select(fifo.LineCost))),
            })
            .ToList();

        return grouped;
    }

    // ── Category Sales ────────────────────────────────────────────────────────

    public async Task<List<StatsCategorySalesDto>> GetCategorySalesAsync(DateTime start, DateTime end)
    {
        var fifo = await _fifoService.CalculateAsync();

        var details = await _db.OrderDetails
            .Include(d => d.Product).ThenInclude(p => p.Category)
            .Include(d => d.Order)
            .Where(d => !d.IsDeleted && !d.Order.IsDeleted
                     && d.Order.TransactionTime >= start && d.Order.TransactionTime < end)
            .ToListAsync();

        var lineRevenue = LineRevenue(details);
        var data = details
            .GroupBy(d => d.Product.Category.Name)
            .Select(g => new { Category = g.Key, Revenue = g.Sum(d => lineRevenue[d.Id]) })
            .ToList();

        var total = data.Sum(x => x.Revenue);
        return data
            .OrderByDescending(x => x.Revenue)
            .Select(x => new StatsCategorySalesDto
            {
                Category = x.Category,
                Revenue = x.Revenue,
                Pct = total > 0 ? Math.Round((double)(x.Revenue / total) * 100, 1) : 0,
            })
            .ToList();
    }

    // ── Top Products ──────────────────────────────────────────────────────────

    public async Task<List<StatsTopProductDto>> GetTopProductsAsync(DateTime start, DateTime end, int count = 5)
    {
        var fifo = await _fifoService.CalculateAsync();

        var details = await _db.OrderDetails
            .Include(d => d.Product).ThenInclude(p => p.Category)
            .Include(d => d.Order)
            .Where(d => !d.IsDeleted && !d.Order.IsDeleted
                     && d.Order.TransactionTime >= start && d.Order.TransactionTime < end)
            .ToListAsync();

        var lineRevenue = LineRevenue(details);
        return details
            .GroupBy(d => new { d.ProductId, d.Product.Name, Category = d.Product.Category.Name })
            .Select(g =>
            {
                var (profit, margin) = LineProfit(g, lineRevenue, fifo);
                return new StatsTopProductDto
                {
                    ProductId = g.Key.ProductId,
                    Name = g.Key.Name,
                    Category = g.Key.Category,
                    Revenue = g.Sum(d => lineRevenue[d.Id]),
                    Profit = profit,
                    MarginPct = margin,
                    UnitsSold = g.Sum(d => d.Quantity),
                };
            })
            .OrderByDescending(x => x.Revenue)
            .Take(count)
            .ToList();
    }

    // ── Inventory Health ──────────────────────────────────────────────────────

    public async Task<StatsInventoryHealthDto> GetInventoryHealthAsync(int windowDays)
    {
        var cutoff = DateTime.Now.AddDays(-windowDays);

        var fifo = await _fifoService.CalculateAsync();

        var inventories = await _db.Inventory
            .Include(i => i.Product).ThenInclude(p => p.Category)
            .Where(i => !i.IsDeleted)
            .ToListAsync();

        var sales = fifo.Sales;

        // Stock levels (aggregated per product across all inventory lots)
        var stockLevels = inventories
            .GroupBy(i => new { i.ProductId, i.Product.Name, Category = i.Product.Category.Name })
            .Select(g =>
            {
                int stockQty = g.Sum(i => fifo.Remaining(i.Id));
                int purchaseQty = g.Sum(i => i.PurchaseQuantity);
                double pct = purchaseQty > 0
                    ? Math.Round((double)stockQty / purchaseQty * 100, 1)
                    : 0;
                string status = pct >= 50 ? "healthy" : pct >= 20 ? "low" : "critical";
                return new StatsStockLevelDto
                {
                    ProductId = g.Key.ProductId,
                    Name = g.Key.Name,
                    Category = g.Key.Category,
                    StockQty = stockQty,
                    PurchaseQty = purchaseQty,
                    StockPct = pct,
                    Status = status,
                };
            })
            .OrderBy(x => x.StockPct)
            .ToList();

        // Dead stock per product (no sales in window, but has stock)
        var salesInWindow = sales
            .Where(d => d.SaleTime >= cutoff)
            .GroupBy(d => d.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(d => d.Quantity));

        var lastSaleDateByProduct = sales
            .GroupBy(d => d.ProductId)
            .ToDictionary(g => g.Key, g => g.Max(d => d.SaleTime));

        var salesByProduct = sales.ToLookup(d => d.ProductId);

        // Aggregate by product for dead stock
        var byProduct = inventories.GroupBy(i => new { i.ProductId, i.Product.Name, Category = i.Product.Category.Name });

        var deadStock = byProduct
            .Where(g => g.Sum(i => fifo.Remaining(i.Id)) > 0
                     && salesInWindow.GetValueOrDefault(g.Key.ProductId) == 0)
            .Select(g =>
            {
                int daysSince = lastSaleDateByProduct.TryGetValue(g.Key.ProductId, out var lastSale)
                    ? (int)(DateTime.Now - lastSale).TotalDays
                    : windowDays + 1;
                return new StatsDeadStockDto
                {
                    ProductId = g.Key.ProductId,
                    Name = g.Key.Name,
                    Category = g.Key.Category,
                    Qty = g.Sum(i => fifo.Remaining(i.Id)),
                    Value = g.Sum(i => fifo.Remaining(i.Id) * i.PriceJpy),
                    DaysSinceLastSale = daysSince,
                };
            })
            .OrderByDescending(x => x.Value)
            .ToList();

        // Slow movers: has some sales but velocity is low relative to remaining stock
        // Velocity = units sold in window / (windowDays / 7) weeks
        double windowWeeks = windowDays / 7.0;
        var slowMovers = byProduct
            .Where(g =>
            {
                int sold = salesInWindow.GetValueOrDefault(g.Key.ProductId);
                int remaining = g.Sum(i => fifo.Remaining(i.Id));
                double velocity = windowWeeks > 0 ? sold / windowWeeks : 0;
                double weeksToClear = velocity > 0 ? remaining / velocity : double.MaxValue;
                // "slow" = has some sales AND >52 weeks to clear
                return sold > 0 && remaining > 0 && weeksToClear > 52;
            })
            .Select(g =>
            {
                int sold = salesInWindow.GetValueOrDefault(g.Key.ProductId);
                int remaining = g.Sum(i => fifo.Remaining(i.Id));
                double velocity = windowWeeks > 0 ? Math.Round(sold / windowWeeks, 1) : 0;
                double weeksToClear = velocity > 0 ? Math.Round(remaining / velocity, 0) : 9999;

                // Avg days to sell: avg days from purchase_date to sale date
                var avgDays = salesByProduct[g.Key.ProductId]
                    .SelectMany(d => fifo.Allocations(d.DetailId)
                        .Where(a => a.PurchaseDate.HasValue)
                        .Select(a => (d.SaleTime - a.PurchaseDate!.Value).TotalDays))
                    .DefaultIfEmpty(0)
                    .Average();

                return new StatsSlowMoverDto
                {
                    ProductId = g.Key.ProductId,
                    Name = g.Key.Name,
                    Category = g.Key.Category,
                    UnitsSold = sold,
                    RemainingQty = remaining,
                    VelocityPerWeek = velocity,
                    WeeksToClear = weeksToClear,
                    AvgDaysToSell = Math.Round(avgDays, 0),
                };
            })
            .OrderBy(x => x.VelocityPerWeek)
            .ToList();

        // By category: stock value, capital lock-up (dead + slow), turnover rate
        var deadProductIds = deadStock.Select(x => x.ProductId).ToHashSet();
        var slowProductIds = slowMovers.Select(x => x.ProductId).ToHashSet();

        var byCategory = inventories
            .GroupBy(i => i.Product.Category.Name)
            .Select(g =>
            {
                decimal stockVal = g.Sum(i => fifo.Remaining(i.Id) * i.PriceJpy);
                decimal lockup = g
                    .Where(i => deadProductIds.Contains(i.ProductId) || slowProductIds.Contains(i.ProductId))
                    .Sum(i => fifo.Remaining(i.Id) * i.PriceJpy);

                int totalSold = g.Select(i => i.ProductId).Distinct().Sum(id => salesInWindow.GetValueOrDefault(id));
                decimal avgStock = g.Average(i => (decimal)(i.PurchaseQuantity + fifo.Remaining(i.Id)) / 2);
                double turnover = avgStock > 0 ? Math.Round(totalSold / (double)avgStock, 2) : 0;

                return new StatsCategoryStockDto
                {
                    Category = g.Key,
                    StockValue = stockVal,
                    CapitalLockup = lockup,
                    TurnoverRate = turnover,
                };
            })
            .OrderByDescending(x => x.StockValue)
            .ToList();

        return new StatsInventoryHealthDto
        {
            StockLevels = stockLevels,
            ByCategory = byCategory,
            DeadStock = deadStock,
            SlowMovers = slowMovers,
        };
    }

    // ── Product Performance ───────────────────────────────────────────────────

    public async Task<StatsProductsPageDto> GetProductsPageAsync(DateTime start, DateTime end)
    {
        var fifo = await _fifoService.CalculateAsync();

        var details = await _db.OrderDetails
            .Include(d => d.Product).ThenInclude(p => p.Category)
            .Include(d => d.Order)
            .Where(d => !d.IsDeleted && !d.Order.IsDeleted
                     && d.Order.TransactionTime >= start && d.Order.TransactionTime < end)
            .ToListAsync();

        var lineRevenue = LineRevenue(details);
        var products = details
            .GroupBy(d => new { d.ProductId, d.Product.Name, Category = d.Product.Category.Name })
            .Select(g =>
            {
                var (profit, margin) = LineProfit(g, lineRevenue, fifo);
                return new StatsProductPerformanceDto
                {
                    ProductId = g.Key.ProductId,
                    Name = g.Key.Name,
                    Category = g.Key.Category,
                    Revenue = g.Sum(d => lineRevenue[d.Id]),
                    Profit = profit,
                    MarginPct = margin,
                    UnitsSold = g.Sum(d => d.Quantity),
                };
            })
            .OrderByDescending(x => x.Revenue)
            .ToList();

        // Unsold: in inventory but no order details ever
        var soldProductIds = await _db.OrderDetails
            .Where(d => !d.IsDeleted)
            .Select(d => d.ProductId)
            .Distinct()
            .ToListAsync();

        var soldSet = soldProductIds.ToHashSet();

        var unsoldBatches = await _db.Inventory
            .Include(i => i.Product).ThenInclude(p => p.Category)
            .Where(i => !i.IsDeleted && !soldSet.Contains(i.ProductId))
            .ToListAsync();

        var unsold = unsoldBatches
            .Where(i => fifo.Remaining(i.Id) > 0)
            .GroupBy(i => new { i.ProductId, i.Product.Name, Category = i.Product.Category.Name })
            .Select(g => new StatsUnsoldProductDto
            {
                ProductId = g.Key.ProductId,
                Name = g.Key.Name,
                Category = g.Key.Category,
                StockQty = g.Sum(i => fifo.Remaining(i.Id)),
                StockValue = g.Sum(i => fifo.Remaining(i.Id) * i.PriceJpy),
                PurchaseDate = g.Min(i => i.PurchaseDate),
            })
            .OrderByDescending(x => x.StockValue)
            .ToList();

        return new StatsProductsPageDto { Products = products, UnsoldProducts = unsold };
    }

    // ── Purchase & Supply ─────────────────────────────────────────────────────

    // Label for batches with no supplier.
    private const string NoSupplierName = "未指定供应商";

    public async Task<StatsPurchasesPageDto> GetPurchasesPageAsync(DateTime start, DateTime end, string granularity, int? productId)
    {
        // price_jpy is a unit price. Spend per batch is price_jpy × purchase_quantity, in JPY.
        var batches = await _db.Inventory
            .Where(i => !i.IsDeleted && i.PurchaseDate >= start && i.PurchaseDate < end)
            .OrderBy(i => i.PurchaseDate)
            .Select(i => new
            {
                i.ProductId,
                ProductName = i.Product.Name,
                i.SupplierId,
                PurchaseDate = i.PurchaseDate!.Value,
                i.PurchaseNo,
                i.PurchaseQuantity,
                i.PriceJpy,
            })
            .ToListAsync();

        var supplierIds = batches.Where(b => b.SupplierId.HasValue).Select(b => b.SupplierId!.Value).Distinct().ToList();
        var supplierNameById = await _db.Suppliers
            .Where(s => supplierIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Name);

        // Charts key series by label. A name shared by two suppliers, or equal to NoSupplierName,
        // gets the supplier ID added so each supplier keeps its own series.
        var sharedNames = supplierNameById.Values
            .GroupBy(n => n)
            .Where(g => g.Count() > 1 || g.Key == NoSupplierName)
            .Select(g => g.Key)
            .ToHashSet();
        var supplierLabelById = supplierNameById.ToDictionary(
            kv => kv.Key,
            kv => sharedNames.Contains(kv.Value) ? $"{kv.Value} (#{kv.Key})" : kv.Value);

        var purchases = batches
            .Select(b => new
            {
                b.PurchaseDate,
                Spend = b.PriceJpy * b.PurchaseQuantity,
                Supplier = b.SupplierId.HasValue && supplierLabelById.TryGetValue(b.SupplierId.Value, out var label)
                    ? label
                    : NoSupplierName,
            })
            .ToList();

        // Spending trend by supplier
        var spendGrouped = purchases
            .GroupBy(p => TruncateTo(p.PurchaseDate, granularity))
            .OrderBy(g => g.Key)
            .Select(g => new StatsSpendingPeriodDto
            {
                Period = PeriodLabel(g.Key, granularity),
                BySupplier = g
                    .GroupBy(p => p.Supplier)
                    .Select(sg => new StatsSupplierSpendDto
                    {
                        Supplier = sg.Key,
                        Amount = sg.Sum(p => p.Spend),
                    })
                    .ToList(),
            })
            .ToList();

        var supplierNames = purchases.Select(p => p.Supplier).Distinct().OrderBy(x => x).ToList();

        // Unit cost trend per product
        var unitCostTrend = batches
            .Where(b => b.PurchaseQuantity > 0 && (!productId.HasValue || b.ProductId == productId.Value))
            .Select(b => new StatsUnitCostPointDto
            {
                PurchaseNo = b.PurchaseNo ?? string.Empty,
                Date = b.PurchaseDate.ToString("yyyy/MM/dd"),
                UnitCost = Math.Round(b.PriceJpy, 2),
            })
            .ToList();

        // Supplier concentration
        decimal totalSpend = purchases.Sum(p => p.Spend);
        var concentration = purchases
            .GroupBy(p => p.Supplier)
            .Select(g => new StatsSupplierConcentrationDto
            {
                SupplierName = g.Key,
                TotalSpend = g.Sum(p => p.Spend),
                Pct = totalSpend > 0 ? Math.Round((double)(g.Sum(p => p.Spend) / totalSpend) * 100, 1) : 0,
            })
            .OrderByDescending(x => x.TotalSpend)
            .ToList();

        // Product list for the product selector
        var products = batches.Select(b => b.ProductName).Distinct().OrderBy(x => x).ToList();

        return new StatsPurchasesPageDto
        {
            SpendingTrend = spendGrouped,
            SupplierNames = supplierNames,
            UnitCostTrend = unitCostTrend,
            SupplierConcentration = concentration,
            Products = products,
        };
    }
}
