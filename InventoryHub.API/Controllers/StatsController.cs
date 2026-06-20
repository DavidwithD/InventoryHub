using InventoryHub.API.DTOs;
using InventoryHub.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace InventoryHub.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatsController : ControllerBase
{
    private readonly IStatsService _stats;

    public StatsController(IStatsService stats)
    {
        _stats = stats;
    }

    // Default period helpers
    private static (DateTime start, DateTime end) ParsePeriod(string? startDate, string? endDate)
    {
        var end = endDate != null ? DateTime.Parse(endDate).Date.AddDays(1) : DateTime.Now.Date.AddDays(1);
        var start = startDate != null ? DateTime.Parse(startDate).Date : DateTime.Now.Date.AddDays(-29);
        return (start, end);
    }

    [HttpGet("dashboard/kpi")]
    public async Task<ActionResult<StatsDashboardKpiDto>> GetKpi(
        [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        var (start, end) = ParsePeriod(startDate, endDate);
        return Ok(await _stats.GetDashboardKpiAsync(start, end));
    }

    [HttpGet("dashboard/trend")]
    public async Task<ActionResult<List<StatsTrendPointDto>>> GetTrend(
        [FromQuery] string? startDate, [FromQuery] string? endDate,
        [FromQuery] string granularity = "week")
    {
        var (start, end) = ParsePeriod(startDate, endDate);
        return Ok(await _stats.GetRevenueProfitTrendAsync(start, end, granularity));
    }

    [HttpGet("dashboard/category-sales")]
    public async Task<ActionResult<List<StatsCategorySalesDto>>> GetCategorySales(
        [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        var (start, end) = ParsePeriod(startDate, endDate);
        return Ok(await _stats.GetCategorySalesAsync(start, end));
    }

    [HttpGet("dashboard/top-products")]
    public async Task<ActionResult<List<StatsTopProductDto>>> GetTopProducts(
        [FromQuery] string? startDate, [FromQuery] string? endDate,
        [FromQuery] int count = 5)
    {
        var (start, end) = ParsePeriod(startDate, endDate);
        return Ok(await _stats.GetTopProductsAsync(start, end, count));
    }

    [HttpGet("inventory")]
    public async Task<ActionResult<StatsInventoryHealthDto>> GetInventoryHealth(
        [FromQuery] int windowDays = 60)
    {
        return Ok(await _stats.GetInventoryHealthAsync(windowDays));
    }

    [HttpGet("products")]
    public async Task<ActionResult<StatsProductsPageDto>> GetProducts(
        [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        var (start, end) = ParsePeriod(startDate, endDate);
        return Ok(await _stats.GetProductsPageAsync(start, end));
    }

    [HttpGet("purchases")]
    public async Task<ActionResult<StatsPurchasesPageDto>> GetPurchases(
        [FromQuery] string? startDate, [FromQuery] string? endDate,
        [FromQuery] string granularity = "month",
        [FromQuery] int? productId = null)
    {
        var (start, end) = ParsePeriod(startDate, endDate);
        return Ok(await _stats.GetPurchasesPageAsync(start, end, granularity, productId));
    }
}
