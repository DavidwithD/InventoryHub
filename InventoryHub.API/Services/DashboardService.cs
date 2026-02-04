using InventoryHub.API.Data;
using InventoryHub.API.DTOs;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.API.Services;

public interface IDashboardService
{
    Task<DashboardStatsDto> GetDashboardStatsAsync();
}

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _context;

    public DashboardService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardStatsDto> GetDashboardStatsAsync()
    {
        var now = DateTime.Now;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1);

        // 总库存价值 = SUM(库存数量 × 单件成本)
        var totalInventoryValue = await _context.Inventory
            .Where(i => !i.IsDeleted)
            .SumAsync(i => i.StockQuantity * i.UnitCost);

        // 本月订单（包含订单详细以计算成本）
        var monthlyOrders = await _context.Orders
            .Include(o => o.OrderDetails.Where(d => !d.IsDeleted))
            .Where(o => !o.IsDeleted && o.TransactionTime >= startOfMonth && o.TransactionTime < endOfMonth)
            .ToListAsync();

        // 本月利润 = 本月订单的 (营业额 - 成本) 总和
        var monthlyProfit = monthlyOrders
            .Where(o => o.OrderDetails.Any())
            .Sum(o => o.Revenue - o.OrderDetails.Sum(d => d.SubtotalCost));

        // 订单总数
        var totalOrders = await _context.Orders
            .Where(o => !o.IsDeleted)
            .CountAsync();

        // 待补充成本的订单数（没有订单详细的订单）
        var ordersWithoutCost = await _context.Orders
            .Include(o => o.OrderDetails.Where(d => !d.IsDeleted))
            .Where(o => !o.IsDeleted && !o.OrderDetails.Any())
            .CountAsync();

        // 低库存商品数量（库存 < 5）
        var lowStockProductsCount = await _context.Inventory
            .Where(i => !i.IsDeleted && i.StockQuantity < 5 && i.StockQuantity > 0)
            .CountAsync();

        return new DashboardStatsDto
        {
            TotalInventoryValue = totalInventoryValue,
            MonthlyProfit = monthlyProfit,
            TotalOrders = totalOrders,
            OrdersWithoutCost = ordersWithoutCost,
            CurrentMonth = now.ToString("yyyy年MM月"),
            LowStockProductsCount = lowStockProductsCount,
            MonthlyOrders = monthlyOrders.Count
        };
    }
}
