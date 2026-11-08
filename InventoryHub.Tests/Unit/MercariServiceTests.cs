using System.Net;
using System.Text.Json;
using InventoryHub.API.Services;
using InventoryHub.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace InventoryHub.Tests.Unit;

public class MercariServiceTests : IDisposable
{
    private const string Curl =
        "curl 'https://api.mercari.jp/sold_histories?limit=20&offset=0' " +
        "-H 'authorization: Bearer test-token' -H 'x-platform: web'";

    private readonly TestDb _db = new();
    private readonly FakeMercari _mercari = new();

    public void Dispose() => _db.Dispose();

    private MercariService NewService() =>
        new(_db.NewContext(), new FakeHttpClientFactory(_mercari), NullLogger<MercariService>.Instance);

    [Fact]
    public async Task Import_creates_one_order_per_sold_item()
    {
        _mercari.Items.Add(("m1", "Card A", 1000, 200, 1767225600)); // 2026-01-01 00:00 UTC

        var result = await NewService().ImportOrdersFromCurlAsync(Curl, skipExisting: true);

        Assert.Equal(1, result.Total);
        Assert.Equal(1, result.Success);
        Assert.Empty(result.Errors);
        using var context = _db.NewContext();
        var order = await context.Orders.SingleAsync();
        Assert.Equal("m1", order.OrderNo);
        Assert.Equal("Card A", order.Name);
        Assert.Equal(1000m, order.Revenue);
        Assert.Equal(200m, order.ShippingFee);
        Assert.Equal(new DateTime(2026, 1, 1, 0, 0, 0), order.TransactionTime);
    }

    [Fact]
    public async Task Import_sends_the_curl_headers_and_asks_for_100_rows()
    {
        _mercari.Items.Add(("m1", "Card A", 1000, 0, 1767225600));

        await NewService().ImportOrdersFromCurlAsync(Curl, skipExisting: true);

        var request = Assert.Single(_mercari.Requests);
        Assert.Contains("limit=100", request.Url);
        Assert.Contains("offset=0", request.Url);
        Assert.Equal("Bearer test-token", request.Authorization);
    }

    [Fact]
    public async Task Import_pages_until_every_row_is_read()
    {
        for (var i = 0; i < 150; i++)
        {
            _mercari.Items.Add(($"m{i}", $"Card {i}", 100, 0, 1767225600 + i));
        }

        var result = await NewService().ImportOrdersFromCurlAsync(Curl, skipExisting: true);

        Assert.Equal(2, _mercari.Requests.Count);
        Assert.Contains("offset=100", _mercari.Requests[1].Url);
        Assert.Equal(150, result.Success);
    }

    [Fact]
    public async Task Import_skips_orders_that_already_exist()
    {
        _db.AddOrder("m1", new DateTime(2026, 1, 1), 1m);
        _mercari.Items.Add(("m1", "Card A", 1000, 0, 1767225600));
        _mercari.Items.Add(("m2", "Card B", 1000, 0, 1767225600));

        var result = await NewService().ImportOrdersFromCurlAsync(Curl, skipExisting: true);

        Assert.Equal(1, result.Skipped);
        Assert.Equal(1, result.Success);
    }

    [Fact]
    public async Task Import_reports_a_command_without_url()
    {
        var result = await NewService().ImportOrdersFromCurlAsync("not a curl command", skipExisting: true);

        Assert.Single(result.Errors);
        Assert.Empty(_mercari.Requests);
    }

    [Fact]
    public async Task Import_reports_a_failed_api_call()
    {
        _mercari.Status = HttpStatusCode.Unauthorized;

        var result = await NewService().ImportOrdersFromCurlAsync(Curl, skipExisting: true);

        Assert.Single(result.Errors);
        Assert.Equal(0, result.Success);
    }

    // Serves the items as Mercari sold_histories pages and records each request.
    private sealed class FakeMercari : HttpMessageHandler
    {
        public List<(string Id, string Name, int Profit, int Shipping, long FinishedAt)> Items { get; } = new();
        public List<(string Url, string? Authorization)> Requests { get; } = new();
        public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var url = request.RequestUri!.ToString();
            Requests.Add((url, request.Headers.TryGetValues("authorization", out var auth) ? auth.Single() : null));

            var query = System.Web.HttpUtility.ParseQueryString(request.RequestUri.Query);
            var offset = int.Parse(query["offset"] ?? "0");
            var limit = int.Parse(query["limit"] ?? "20");
            var page = Items.Skip(offset).Take(limit).Select(i => new
            {
                item = new { item_id = i.Id, name = i.Name, photo_thumbnail_url = $"https://img/{i.Id}.jpg" },
                sales_profit = i.Profit,
                seller_shipping_fee = i.Shipping,
                transaction_finished_at = i.FinishedAt
            });
            var body = JsonSerializer.Serialize(new
            {
                result = "OK",
                data = new { sold_histories = page, total_count = Items.Count }
            });

            return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(body) });
        }
    }

    private sealed class FakeHttpClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }
}
