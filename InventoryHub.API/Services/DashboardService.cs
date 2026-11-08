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
    private readonly IFifoService _fifoService;

    public DashboardService(AppDbContext context, IFifoService fifoService)
    {
        _context = context;
        _fifoService = fifoService;
    }

    public async Task<DashboardStatsDto> GetDashboardStatsAsync()
    {
        var now = DateTime.Now;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1);

        // 总库存价値 = SUM(库存数量 × 单件日元价)
        var fifo = await _fifoService.CalculateAsync();
        var totalInventoryValue = fifo.StockValue();

        // 本月订单（包含订单详细以计算成本）
        var monthlyOrders = await _context.Orders
            .Include(o => o.OrderDetails.Where(d => !d.IsDeleted))
            .Where(o => !o.IsDeleted && o.TransactionTime >= startOfMonth && o.TransactionTime < endOfMonth)
            .ToListAsync();

        // 本月利润 = 本月订单的 (营业额 - 成本) 总和
        var monthlyProfit = monthlyOrders
            .Where(o => o.OrderDetails.Any() && !o.OrderDetails.Any(d => fifo.Unmatched(d.Id) > 0))
            .Sum(o => o.Revenue - o.OrderDetails.Sum(fifo.LineCost));

        // 订单总数
        var totalOrders = await _context.Orders
            .Where(o => !o.IsDeleted)
            .CountAsync();

        // 待补充成本的订单数（没有订单详细，或有商品未匹配到批次）
        var detailIdsByOrder = await _context.Orders
            .Where(o => !o.IsDeleted)
            .Select(o => o.OrderDetails.Where(d => !d.IsDeleted).Select(d => d.Id).ToList())
            .ToListAsync();
        var ordersWithoutCost = detailIdsByOrder
            .Count(ids => ids.Count == 0 || ids.Any(id => fifo.Unmatched(id) > 0));

        // 低库存商品数量（库存 < 5）
        var lowStockProductsCount = fifo.LowStockBatchCount();

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
