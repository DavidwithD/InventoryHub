namespace InventoryHub.API.DTOs;

public class DashboardStatsDto
{
    // 总库存价值（日元）
    public decimal TotalInventoryValue { get; set; }

    // 本月利润（日元）
    public decimal MonthlyProfit { get; set; }

    // 订单总数
    public int TotalOrders { get; set; }

    // 待补充成本的订单数（totalCost 为 NULL）
    public int OrdersWithoutCost { get; set; }

    // 当前月份
    public string CurrentMonth { get; set; } = string.Empty;

    // 低库存商品数量（库存 < 5）
    public int LowStockProductsCount { get; set; }

    // 本月订单数
    public int MonthlyOrders { get; set; }
}
