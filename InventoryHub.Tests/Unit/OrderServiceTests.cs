using InventoryHub.API.DTOs;
using InventoryHub.API.Services;
using InventoryHub.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace InventoryHub.Tests.Unit;

public class OrderServiceTests : IDisposable
{
    private readonly TestDb _db = new();

    public void Dispose() => _db.Dispose();

    private OrderService NewService()
    {
        var context = _db.NewContext();
        return new OrderService(context, TestDb.Mapper, new FifoService(context));
    }

    private static CreateOrderWithDetailsDto NewOrder(string orderNo, params (int productId, int quantity)[] lines) => new()
    {
        OrderNo = orderNo,
        Revenue = 1000m,
        TransactionTime = new DateTime(2026, 3, 1),
        Details = lines.Select(l => new CreateOrderDetailDto { ProductId = l.productId, Quantity = l.quantity }).ToList()
    };

    [Fact]
    public async Task Create_order_reports_fifo_cost_and_extra_costs()
    {
        var product = _db.AddProduct();
        _db.AddBatch(product.Id, new DateTime(2026, 1, 1), 5, 100m);
        var dto = NewOrder("M1", (product.Id, 2));
        dto.Details[0].PackagingCost = 30m;
        dto.Details[0].OtherCost = 5m;

        var order = await NewService().CreateOrderWithDetailsAsync(dto);

        Assert.Equal(2 * 100m + 30m + 5m, order.TotalCost);
        Assert.True(order.HasDetails);
        Assert.False(order.HasUnknownCost);
    }

    [Fact]
    public async Task Create_order_marks_unknown_cost_when_stock_is_short()
    {
        var product = _db.AddProduct();
        _db.AddBatch(product.Id, new DateTime(2026, 1, 1), 1, 100m);

        var order = await NewService().CreateOrderWithDetailsAsync(NewOrder("M1", (product.Id, 3)));

        Assert.True(order.HasUnknownCost);
        var detail = Assert.Single(await NewService().GetOrderDetailsAsync(order.Id));
        Assert.Equal(2, detail.UnmatchedQuantity);
        Assert.Equal(100m, detail.SubtotalCost);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Create_order_rejects_a_quantity_below_one(int quantity)
    {
        var product = _db.AddProduct();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => NewService().CreateOrderWithDetailsAsync(NewOrder("M1", (product.Id, quantity))));
    }

    [Fact]
    public async Task Create_order_rejects_an_unknown_product()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => NewService().CreateOrderWithDetailsAsync(NewOrder("M1", (999, 1))));
    }

    [Fact]
    public async Task Create_order_rejects_the_same_product_twice()
    {
        var product = _db.AddProduct();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => NewService().CreateOrderWithDetailsAsync(NewOrder("M1", (product.Id, 1), (product.Id, 2))));
    }

    [Fact]
    public async Task Add_detail_rejects_a_product_already_in_the_order()
    {
        var product = _db.AddProduct();
        var order = _db.AddOrder("M1", new DateTime(2026, 3, 1), 1000m, (product.Id, 1));

        await Assert.ThrowsAsync<InvalidOperationException>(() => NewService().CreateOrderDetailAsync(
            new CreateOrderDetailDto { OrderId = order.Id, ProductId = product.Id, Quantity = 1 }));
    }

    [Fact]
    public async Task Update_detail_can_keep_its_own_product()
    {
        var product = _db.AddProduct();
        var order = _db.AddOrder("M1", new DateTime(2026, 3, 1), 1000m, (product.Id, 1));
        var detailId = order.OrderDetails.Single().Id;

        var updated = await NewService().UpdateOrderDetailAsync(
            detailId, new UpdateOrderDetailDto { ProductId = product.Id, Quantity = 4 });

        Assert.NotNull(updated);
        Assert.Equal(4, updated.Quantity);
    }

    [Fact]
    public async Task Delete_order_soft_deletes_the_order_and_its_details()
    {
        var product = _db.AddProduct();
        var order = _db.AddOrder("M1", new DateTime(2026, 3, 1), 1000m, (product.Id, 1));

        Assert.True(await NewService().DeleteOrderAsync(order.Id));

        using var context = _db.NewContext();
        Assert.True((await context.Orders.SingleAsync()).IsDeleted);
        Assert.True((await context.OrderDetails.SingleAsync()).IsDeleted);
        Assert.Null(await NewService().GetOrderByIdAsync(order.Id));
    }

    [Fact]
    public async Task Deleted_order_frees_its_stock()
    {
        var product = _db.AddProduct();
        var batch = _db.AddBatch(product.Id, new DateTime(2026, 1, 1), 5, 100m);
        var order = _db.AddOrder("M1", new DateTime(2026, 3, 1), 1000m, (product.Id, 2));
        await NewService().DeleteOrderAsync(order.Id);

        var fifo = await new FifoService(_db.NewContext()).CalculateAsync();

        Assert.Equal(5, fifo.Remaining(batch.Id));
    }

    [Fact]
    public async Task Get_all_filters_by_transaction_time()
    {
        _db.AddOrder("JAN", new DateTime(2026, 1, 15), 100m);
        _db.AddOrder("FEB", new DateTime(2026, 2, 15), 100m);
        _db.AddOrder("MAR", new DateTime(2026, 3, 15), 100m);

        var orders = await NewService().GetAllOrdersAsync(new DateTime(2026, 2, 1), new DateTime(2026, 2, 28));

        Assert.Equal("FEB", Assert.Single(orders).OrderNo);
    }
}
