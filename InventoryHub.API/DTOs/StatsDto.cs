namespace InventoryHub.API.DTOs;

// ── Dashboard ──────────────────────────────────────────────

public class StatsDashboardKpiDto
{
    public decimal TotalRevenue { get; set; }
    public decimal TotalProfit { get; set; }
    public decimal AvgMarginPct { get; set; }
    public int OrdersCount { get; set; }
    public decimal AvgOrderValue { get; set; }
    public decimal StockValue { get; set; }
    public int LowStockItems { get; set; }

    // Period-over-period changes (percentage points for margin, % for others)
    public decimal? RevenuePctChange { get; set; }
    public decimal? ProfitPctChange { get; set; }
    public decimal? MarginPpChange { get; set; }
    public decimal? OrdersCountPctChange { get; set; }
    public decimal? AvgOrderValuePctChange { get; set; }
}

public class StatsTrendPointDto
{
    public string Label { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal Profit { get; set; }
}

public class StatsCategorySalesDto
{
    public string Category { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public double Pct { get; set; }
}

public class StatsTopProductDto
{
    public int ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal Profit { get; set; }
    public decimal MarginPct { get; set; }
    public int UnitsSold { get; set; }
}

// ── Inventory Health ───────────────────────────────────────

public class StatsStockLevelDto
{
    public int ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int StockQty { get; set; }
    public int PurchaseQty { get; set; }
    public double StockPct { get; set; }
    public string Status { get; set; } = string.Empty; // healthy | low | critical
}

public class StatsCategoryStockDto
{
    public string Category { get; set; } = string.Empty;
    public decimal StockValue { get; set; }
    public decimal CapitalLockup { get; set; }
    public double TurnoverRate { get; set; }
}

public class StatsDeadStockDto
{
    public int ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Qty { get; set; }
    public decimal Value { get; set; }
    public int DaysSinceLastSale { get; set; }
}

public class StatsSlowMoverDto
{
    public int ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int UnitsSold { get; set; }
    public int RemainingQty { get; set; }
    public double VelocityPerWeek { get; set; }
    public double WeeksToClear { get; set; }
    public double AvgDaysToSell { get; set; }
}

public class StatsInventoryHealthDto
{
    public List<StatsStockLevelDto> StockLevels { get; set; } = new();
    public List<StatsCategoryStockDto> ByCategory { get; set; } = new();
    public List<StatsDeadStockDto> DeadStock { get; set; } = new();
    public List<StatsSlowMoverDto> SlowMovers { get; set; } = new();
}

// ── Product Performance ────────────────────────────────────

public class StatsProductPerformanceDto
{
    public int ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal Profit { get; set; }
    public decimal MarginPct { get; set; }
    public int UnitsSold { get; set; }
}

public class StatsUnsoldProductDto
{
    public int ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int StockQty { get; set; }
    public decimal StockValue { get; set; }
    public DateTime? PurchaseDate { get; set; }
}

public class StatsProductsPageDto
{
    public List<StatsProductPerformanceDto> Products { get; set; } = new();
    public List<StatsUnsoldProductDto> UnsoldProducts { get; set; } = new();
}

// ── Purchase & Supply ──────────────────────────────────────

public class StatsSpendingPeriodDto
{
    public string Period { get; set; } = string.Empty;
    public List<StatsSupplierSpendDto> BySupplier { get; set; } = new();
}

public class StatsSupplierSpendDto
{
    public string Supplier { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class StatsExchangeRatePointDto
{
    public string Date { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public string Supplier { get; set; } = string.Empty;
}

public class StatsUnitCostPointDto
{
    public string PurchaseNo { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public decimal UnitCost { get; set; }
}

public class StatsSupplierConcentrationDto
{
    public string SupplierName { get; set; } = string.Empty;
    public decimal TotalSpend { get; set; }
    public double Pct { get; set; }
}

public class StatsPurchasesPageDto
{
    public List<StatsSpendingPeriodDto> SpendingTrend { get; set; } = new();
    public List<string> SupplierNames { get; set; } = new();
    public List<StatsExchangeRatePointDto> ExchangeRates { get; set; } = new();
    public List<StatsUnitCostPointDto> UnitCostTrend { get; set; } = new();
    public List<StatsSupplierConcentrationDto> SupplierConcentration { get; set; } = new();
    public List<string> Products { get; set; } = new();
}
