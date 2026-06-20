using InventoryHub.API.Data;
using InventoryHub.API.DTOs;
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

    public StatsService(AppDbContext db)
    {
        _db = db;
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static decimal PctChange(decimal prev, decimal curr) =>
        prev == 0 ? 0 : Math.Round((curr - prev) / prev * 100, 1);

    private static decimal OrderProfit(decimal revenue, IEnumerable<decimal> subtotalCosts) =>
        revenue - subtotalCosts.Sum();

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

        decimal revenue = orders.Sum(o => o.Revenue);
        decimal profit = orders.Sum(o => OrderProfit(o.Revenue, o.OrderDetails.Select(d => d.SubtotalCost)));
        decimal margin = revenue > 0 ? Math.Round(profit / revenue * 100, 1) : 0;
        int count = orders.Count;
        decimal aov = count > 0 ? Math.Round(revenue / count, 0) : 0;

        decimal prevRevenue = prevOrders.Sum(o => o.Revenue);
        decimal prevProfit = prevOrders.Sum(o => OrderProfit(o.Revenue, o.OrderDetails.Select(d => d.SubtotalCost)));
        decimal prevMargin = prevRevenue > 0 ? Math.Round(prevProfit / prevRevenue * 100, 1) : 0;
        int prevCount = prevOrders.Count;
        decimal prevAov = prevCount > 0 ? Math.Round(prevRevenue / prevCount, 0) : 0;

        var stockValue = await _db.Inventory
            .Where(i => !i.IsDeleted)
            .SumAsync(i => i.StockQuantity * i.PriceJpy);

        var lowStockItems = await _db.Inventory
            .Where(i => !i.IsDeleted && i.StockQuantity > 0 && i.StockQuantity < 5)
            .CountAsync();

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
                Profit = g.Sum(o => OrderProfit(o.Revenue, o.OrderDetails.Select(d => d.SubtotalCost))),
            })
            .ToList();

        return grouped;
    }

    // ── Category Sales ────────────────────────────────────────────────────────

    public async Task<List<StatsCategorySalesDto>> GetCategorySalesAsync(DateTime start, DateTime end)
    {
        var data = await _db.OrderDetails
            .Include(d => d.Product).ThenInclude(p => p.Category)
            .Include(d => d.Order)
            .Where(d => !d.IsDeleted && !d.Order.IsDeleted
                     && d.Order.TransactionTime >= start && d.Order.TransactionTime < end)
            .GroupBy(d => d.Product.Category.Name)
            .Select(g => new { Category = g.Key, Revenue = g.Sum(d => d.UnitPrice * d.Quantity) })
            .ToListAsync();

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
        var data = await _db.OrderDetails
            .Include(d => d.Product).ThenInclude(p => p.Category)
            .Include(d => d.Order)
            .Where(d => !d.IsDeleted && !d.Order.IsDeleted
                     && d.Order.TransactionTime >= start && d.Order.TransactionTime < end)
            .GroupBy(d => new { d.ProductId, d.Product.Name, Category = d.Product.Category.Name })
            .Select(g => new StatsTopProductDto
            {
                ProductId = g.Key.ProductId,
                Name = g.Key.Name,
                Category = g.Key.Category,
                Revenue = g.Sum(d => d.UnitPrice * d.Quantity),
                Profit = g.Sum(d => d.UnitPrice * d.Quantity - d.SubtotalCost),
                UnitsSold = g.Sum(d => d.Quantity),
            })
            .OrderByDescending(x => x.Revenue)
            .Take(count)
            .ToListAsync();

        foreach (var item in data)
            item.MarginPct = item.Revenue > 0 ? Math.Round(item.Profit / item.Revenue * 100, 1) : 0;

        return data;
    }

    // ── Inventory Health ──────────────────────────────────────────────────────

    public async Task<StatsInventoryHealthDto> GetInventoryHealthAsync(int windowDays)
    {
        var cutoff = DateTime.Now.AddDays(-windowDays);

        var inventories = await _db.Inventory
            .Include(i => i.Product).ThenInclude(p => p.Category)
            .Include(i => i.OrderDetails.Where(d => !d.IsDeleted))
                .ThenInclude(d => d.Order)
            .Where(i => !i.IsDeleted)
            .ToListAsync();

        // Stock levels (aggregated per product across all inventory lots)
        var stockLevels = inventories
            .GroupBy(i => new { i.ProductId, i.Product.Name, Category = i.Product.Category.Name })
            .Select(g =>
            {
                int stockQty = g.Sum(i => i.StockQuantity);
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
        var salesInWindow = inventories
            .ToDictionary(
                i => i.Id,
                i => i.OrderDetails
                    .Where(d => d.Order != null && !d.Order.IsDeleted && d.Order.TransactionTime >= cutoff)
                    .Sum(d => d.Quantity)
            );

        var lastSaleDateById = inventories
            .ToDictionary(
                i => i.Id,
                i => i.OrderDetails
                    .Where(d => d.Order != null && !d.Order.IsDeleted)
                    .Select(d => (DateTime?)d.Order.TransactionTime)
                    .Max()
            );

        // Aggregate by product for dead stock
        var byProduct = inventories.GroupBy(i => new { i.ProductId, i.Product.Name, Category = i.Product.Category.Name });

        var deadStock = byProduct
            .Where(g => g.Sum(i => i.StockQuantity) > 0
                     && g.All(i => salesInWindow[i.Id] == 0))
            .Select(g =>
            {
                var lastSale = g.Select(i => lastSaleDateById[i.Id]).Where(d => d != null).Max();
                int daysSince = lastSale.HasValue
                    ? (int)(DateTime.Now - lastSale.Value).TotalDays
                    : windowDays + 1;
                return new StatsDeadStockDto
                {
                    ProductId = g.Key.ProductId,
                    Name = g.Key.Name,
                    Category = g.Key.Category,
                    Qty = g.Sum(i => i.StockQuantity),
                    Value = g.Sum(i => i.StockQuantity * i.PriceJpy),
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
                int sold = g.Sum(i => salesInWindow[i.Id]);
                int remaining = g.Sum(i => i.StockQuantity);
                double velocity = windowWeeks > 0 ? sold / windowWeeks : 0;
                double weeksToClear = velocity > 0 ? remaining / velocity : double.MaxValue;
                // "slow" = has some sales AND >52 weeks to clear
                return sold > 0 && remaining > 0 && weeksToClear > 52;
            })
            .Select(g =>
            {
                int sold = g.Sum(i => salesInWindow[i.Id]);
                int remaining = g.Sum(i => i.StockQuantity);
                double velocity = windowWeeks > 0 ? Math.Round(sold / windowWeeks, 1) : 0;
                double weeksToClear = velocity > 0 ? Math.Round(remaining / velocity, 0) : 9999;

                // Avg days to sell: avg days from purchase_date to sale date
                var avgDays = g
                    .Where(i => i.PurchaseDate.HasValue)
                    .SelectMany(i =>
                        i.OrderDetails
                            .Where(d => d.Order != null && !d.Order.IsDeleted)
                            .Select(d => (d.Order.TransactionTime - i.PurchaseDate!.Value).TotalDays))
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
                decimal stockVal = g.Sum(i => i.StockQuantity * i.PriceJpy);
                decimal lockup = g
                    .Where(i => deadProductIds.Contains(i.ProductId) || slowProductIds.Contains(i.ProductId))
                    .Sum(i => i.StockQuantity * i.PriceJpy);

                int totalSold = g.Sum(i => salesInWindow[i.Id]);
                decimal avgStock = g.Average(i => (decimal)(i.PurchaseQuantity + i.StockQuantity) / 2);
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
        var details = await _db.OrderDetails
            .Include(d => d.Product).ThenInclude(p => p.Category)
            .Include(d => d.Order)
            .Where(d => !d.IsDeleted && !d.Order.IsDeleted
                     && d.Order.TransactionTime >= start && d.Order.TransactionTime < end)
            .ToListAsync();

        var products = details
            .GroupBy(d => new { d.ProductId, d.Product.Name, Category = d.Product.Category.Name })
            .Select(g =>
            {
                decimal rev = g.Sum(d => d.UnitPrice * d.Quantity);
                decimal cost = g.Sum(d => d.SubtotalCost);
                decimal profit = rev - cost;
                return new StatsProductPerformanceDto
                {
                    ProductId = g.Key.ProductId,
                    Name = g.Key.Name,
                    Category = g.Key.Category,
                    Revenue = rev,
                    Profit = profit,
                    MarginPct = rev > 0 ? Math.Round(profit / rev * 100, 1) : 0,
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

        var unsold = await _db.Inventory
            .Include(i => i.Product).ThenInclude(p => p.Category)
            .Where(i => !i.IsDeleted && i.StockQuantity > 0 && !soldSet.Contains(i.ProductId))
            .GroupBy(i => new { i.ProductId, i.Product.Name, Category = i.Product.Category.Name })
            .Select(g => new StatsUnsoldProductDto
            {
                ProductId = g.Key.ProductId,
                Name = g.Key.Name,
                Category = g.Key.Category,
                StockQty = g.Sum(i => i.StockQuantity),
                StockValue = g.Sum(i => i.StockQuantity * i.PriceJpy),
                PurchaseDate = g.Min(i => i.PurchaseDate),
            })
            .OrderByDescending(x => x.StockValue)
            .ToListAsync();

        return new StatsProductsPageDto { Products = products, UnsoldProducts = unsold };
    }

    // ── Purchase & Supply ─────────────────────────────────────────────────────

    public async Task<StatsPurchasesPageDto> GetPurchasesPageAsync(DateTime start, DateTime end, string granularity, int? productId)
    {
        var purchases = await _db.Purchases
            .Include(p => p.Supplier)
            .Where(p => !p.IsDeleted && p.PurchaseDate >= start && p.PurchaseDate < end)
            .OrderBy(p => p.PurchaseDate)
            .ToListAsync();

        // Spending trend by supplier
        var spendGrouped = purchases
            .GroupBy(p => TruncateTo(p.PurchaseDate, granularity))
            .OrderBy(g => g.Key)
            .Select(g => new StatsSpendingPeriodDto
            {
                Period = PeriodLabel(g.Key, granularity),
                BySupplier = g
                    .GroupBy(p => p.Supplier.Name)
                    .Select(sg => new StatsSupplierSpendDto
                    {
                        Supplier = sg.Key,
                        Amount = sg.Sum(p => p.TotalAmount),
                    })
                    .ToList(),
            })
            .ToList();

        var supplierNames = purchases.Select(p => p.Supplier.Name).Distinct().OrderBy(x => x).ToList();

        // Exchange rate history (CNY purchases only)
        var exchangeRates = purchases
            .Where(p => p.CurrencyType == "CNY" && p.ExchangeRate > 0)
            .OrderBy(p => p.PurchaseDate)
            .Select(p => new StatsExchangeRatePointDto
            {
                Date = p.PurchaseDate.ToString("yyyy/MM/dd"),
                Rate = p.ExchangeRate,
                Supplier = p.Supplier.Name,
            })
            .ToList();

        // Unit cost trend per product (from Inventory table)
        var inventoryQuery = _db.Inventory
            .Include(i => i.Product)
            .Where(i => !i.IsDeleted && i.PurchaseDate >= start && i.PurchaseDate < end && i.PurchaseQuantity > 0);

        if (productId.HasValue)
            inventoryQuery = inventoryQuery.Where(i => i.ProductId == productId.Value);

        var inventoryLots = await inventoryQuery
            .OrderBy(i => i.PurchaseDate)
            .ToListAsync();

        var unitCostTrend = inventoryLots
            .Select(i => new StatsUnitCostPointDto
            {
                PurchaseNo = i.PurchaseNo ?? string.Empty,
                Date = i.PurchaseDate.HasValue ? i.PurchaseDate.Value.ToString("yyyy/MM/dd") : string.Empty,
                UnitCost = Math.Round(i.PriceJpy / i.PurchaseQuantity, 2),
            })
            .ToList();

        // Supplier concentration
        decimal totalSpend = purchases.Sum(p => p.TotalAmount);
        var concentration = purchases
            .GroupBy(p => p.Supplier.Name)
            .Select(g => new StatsSupplierConcentrationDto
            {
                SupplierName = g.Key,
                TotalSpend = g.Sum(p => p.TotalAmount),
                Pct = totalSpend > 0 ? Math.Round((double)(g.Sum(p => p.TotalAmount) / totalSpend) * 100, 1) : 0,
            })
            .OrderByDescending(x => x.TotalSpend)
            .ToList();

        // Product list for the product selector
        var products = await _db.Inventory
            .Include(i => i.Product)
            .Where(i => !i.IsDeleted && i.PurchaseDate >= start && i.PurchaseDate < end)
            .Select(i => i.Product.Name)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync();

        return new StatsPurchasesPageDto
        {
            SpendingTrend = spendGrouped,
            SupplierNames = supplierNames,
            ExchangeRates = exchangeRates,
            UnitCostTrend = unitCostTrend,
            SupplierConcentration = concentration,
            Products = products,
        };
    }
}
