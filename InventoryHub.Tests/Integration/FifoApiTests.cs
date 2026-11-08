using System.Net;
using System.Net.Http.Json;
using InventoryHub.API.DTOs;
using InventoryHub.Tests.Support;
using Xunit;

namespace InventoryHub.Tests.Integration;

// Each test gets its own database, because the dashboard and stats sum over all rows.
public class FifoApiTests : IDisposable
{
    private readonly ApiFactory _factory = new();
    private readonly ApiClient _api;

    public FifoApiTests()
    {
        _api = new ApiClient(_factory.CreateClient());
    }

    public void Dispose() => _factory.Dispose();

    private static readonly DateTime Jan1 = new(2026, 1, 1);
    private static readonly DateTime Jan2 = new(2026, 1, 2);
    private static readonly DateTime Feb1 = new(2026, 2, 1);

    [Fact]
    public async Task Order_cost_and_stock_follow_fifo_across_batches()
    {
        var product = await _api.CreateProductAsync("Card", "Cards");
        var first = await _api.CreateBatchAsync(product.Id, Jan1, 2, 100m);
        var second = await _api.CreateBatchAsync(product.Id, Jan2, 5, 150m);

        var order = await _api.CreateOrderAsync("M1", Feb1, 1000m, product.Id, 3);

        Assert.Equal(2 * 100m + 1 * 150m, order.TotalCost);
        Assert.False(order.HasUnknownCost);
        Assert.Equal(0, (await _api.GetAsync<InventoryDto>($"/api/inventory/{first.Id}")).StockQuantity);
        Assert.Equal(4, (await _api.GetAsync<InventoryDto>($"/api/inventory/{second.Id}")).StockQuantity);

        var detail = Assert.Single(await _api.GetAsync<List<OrderDetailDto>>($"/api/orders/{order.Id}/details"));
        Assert.Equal(new[] { first.Id, second.Id }, detail.Allocations.Select(a => a.InventoryId));
        Assert.Equal(new[] { 2, 1 }, detail.Allocations.Select(a => a.Quantity));
    }

    [Fact]
    public async Task Sale_before_any_purchase_has_unknown_cost()
    {
        var product = await _api.CreateProductAsync("Card", "Cards");
        await _api.CreateBatchAsync(product.Id, Feb1, 5, 100m);

        var order = await _api.CreateOrderAsync("M1", Jan1, 1000m, product.Id, 1);

        Assert.True(order.HasUnknownCost);
        var detail = Assert.Single(await _api.GetAsync<List<OrderDetailDto>>($"/api/orders/{order.Id}/details"));
        Assert.Equal(1, detail.UnmatchedQuantity);
    }

    [Fact]
    public async Task Delete_impact_matches_what_the_delete_does()
    {
        var product = await _api.CreateProductAsync("Card", "Cards");
        var first = await _api.CreateBatchAsync(product.Id, Jan1, 2, 100m);
        await _api.CreateBatchAsync(product.Id, Jan2, 5, 150m);
        var order = await _api.CreateOrderAsync("M1", Feb1, 1000m, product.Id, 2);

        var impact = await _api.GetAsync<InventoryImpactDto>($"/api/inventory/{first.Id}/delete-impact");
        Assert.Equal(1, impact.AffectedOrders);
        Assert.Equal(100m, impact.CostChange);

        var deleted = await _api.Http.DeleteAsync($"/api/inventory/{first.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        var after = await _api.GetAsync<OrderDto>($"/api/orders/{order.Id}");
        Assert.Equal(200m + impact.CostChange, after.TotalCost);
    }

    [Fact]
    public async Task Update_impact_does_not_save_the_change()
    {
        var product = await _api.CreateProductAsync("Card", "Cards");
        var batch = await _api.CreateBatchAsync(product.Id, Jan1, 3, 100m);
        await _api.CreateOrderAsync("M1", Feb1, 1000m, product.Id, 3);
        var change = new UpdateInventoryDto
        {
            ProductId = product.Id,
            PurchaseDate = Jan1,
            PurchaseQuantity = 3,
            InitialStock = 3,
            PriceJpy = 120m
        };

        var impact = await _api.PostAsync<InventoryImpactDto>($"/api/inventory/{batch.Id}/update-impact", change);

        Assert.Equal(60m, impact.CostChange);
        Assert.Equal(100m, (await _api.GetAsync<InventoryDto>($"/api/inventory/{batch.Id}")).PriceJpy);
    }

    [Fact]
    public async Task Invalid_order_returns_bad_request_and_saves_nothing()
    {
        var product = await _api.CreateProductAsync("Card", "Cards");

        var response = await _api.Http.PostAsJsonAsync("/api/orders", new CreateOrderWithDetailsDto
        {
            OrderNo = "BAD",
            TransactionTime = Feb1,
            Details = new() { new CreateOrderDetailDto { ProductId = product.Id, Quantity = 0 } }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await _api.GetAsync<List<OrderDto>>("/api/orders"));
    }

    [Fact]
    public async Task Order_list_filters_by_date_range()
    {
        var product = await _api.CreateProductAsync("Card", "Cards");
        await _api.CreateOrderAsync("JAN", Jan1, 100m, product.Id, 1);
        await _api.CreateOrderAsync("FEB", Feb1, 100m, product.Id, 1);

        var orders = await _api.GetAsync<List<OrderDto>>("/api/orders?startDate=2026-01-15&endDate=2026-02-15");

        Assert.Equal("FEB", Assert.Single(orders).OrderNo);
    }

    [Fact]
    public async Task Dashboard_counts_stock_value_and_orders_without_cost()
    {
        var product = await _api.CreateProductAsync("Card", "Cards");
        await _api.CreateBatchAsync(product.Id, Jan1, 5, 100m);
        await _api.CreateOrderAsync("M1", Feb1, 1000m, product.Id, 2);
        await _api.CreateOrderAsync("M2", Feb1.AddDays(1), 1000m, product.Id, 10);

        var stats = await _api.GetAsync<DashboardStatsDto>("/api/dashboard/stats");

        // M1 takes 2 units. M2 takes the last 3 and is short 7. No stock is left.
        Assert.Equal(0m, stats.TotalInventoryValue);
        Assert.Equal(2, stats.TotalOrders);
        Assert.Equal(1, stats.OrdersWithoutCost);
    }

    [Theory]
    [InlineData("/api/stats/dashboard/kpi?startDate=2026-01-01&endDate=2026-03-01")]
    [InlineData("/api/stats/dashboard/trend?startDate=2026-01-01&endDate=2026-03-01&granularity=week")]
    [InlineData("/api/stats/dashboard/category-sales?startDate=2026-01-01&endDate=2026-03-01")]
    [InlineData("/api/stats/dashboard/top-products?startDate=2026-01-01&endDate=2026-03-01")]
    [InlineData("/api/stats/inventory")]
    [InlineData("/api/stats/products?startDate=2026-01-01&endDate=2026-03-01")]
    [InlineData("/api/stats/purchases?startDate=2026-01-01&endDate=2026-03-01")]
    public async Task Stats_endpoints_answer_with_data_present(string url)
    {
        var product = await _api.CreateProductAsync("Card", "Cards");
        await _api.CreateBatchAsync(product.Id, Jan1, 5, 100m);
        await _api.CreateOrderAsync("M1", Feb1, 1000m, product.Id, 2);

        var response = await _api.Http.GetAsync(url);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
