using AutoMapper;
using InventoryHub.API.Data;
using InventoryHub.API.DTOs;
using InventoryHub.API.Models;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.API.Services;

public class OrderService : IOrderService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IFifoService _fifoService;

    public OrderService(AppDbContext context, IMapper mapper, IFifoService fifoService)
    {
        _context = context;
        _mapper = mapper;
        _fifoService = fifoService;
    }

    private static OrderDto ToOrderDto(Order order, FifoResult fifo)
    {
        var details = order.OrderDetails.Where(d => !d.IsDeleted).ToList();
        return new OrderDto
        {
            Id = order.Id,
            OrderNo = order.OrderNo,
            Name = order.Name,
            ImageUrl = order.ImageUrl,
            Revenue = order.Revenue,
            TotalCost = details.Sum(fifo.LineCost),
            HasDetails = details.Count > 0,
            HasUnknownCost = details.Any(d => fifo.Unmatched(d.Id) > 0),
            ShippingFee = order.ShippingFee,
            TransactionTime = order.TransactionTime,
            CreatedAt = order.CreatedAt,
            UpdatedAt = order.UpdatedAt
        };
    }

    private static OrderDetailDto ToOrderDetailDto(OrderDetail detail, FifoResult fifo)
    {
        return new OrderDetailDto
        {
            Id = detail.Id,
            OrderId = detail.OrderId,
            ProductId = detail.ProductId,
            ProductName = detail.Product?.Name ?? "",
            Quantity = detail.Quantity,
            PackagingCost = detail.PackagingCost,
            OtherCost = detail.OtherCost,
            SubtotalCost = fifo.LineCost(detail),
            UnmatchedQuantity = fifo.Unmatched(detail.Id),
            Allocations = fifo.Allocations(detail.Id)
                .Select(a => new OrderDetailAllocationDto
                {
                    InventoryId = a.InventoryId,
                    Quantity = a.Quantity,
                    UnitCost = a.UnitCost,
                    PurchaseDate = a.PurchaseDate
                })
                .ToList(),
            Notes = detail.Notes,
            CreatedAt = detail.CreatedAt,
            UpdatedAt = detail.UpdatedAt
        };
    }

    // 验证商品和数量
    private async Task ValidateDetailAsync(int productId, int quantity)
    {
        var productExists = await _context.Products
            .AnyAsync(p => p.Id == productId && !p.IsDeleted);

        if (!productExists)
        {
            throw new InvalidOperationException($"商品 ID {productId} 不存在");
        }

        if (quantity <= 0)
        {
            throw new InvalidOperationException("数量必须大于 0");
        }
    }

    // 订单 CRUD
    public async Task<IEnumerable<OrderDto>> GetAllOrdersAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.Orders
            .Include(o => o.OrderDetails)
            .Where(o => !o.IsDeleted);

        if (startDate.HasValue)
        {
            query = query.Where(o => o.TransactionTime >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(o => o.TransactionTime <= endDate.Value);
        }

        var orders = await query
            .OrderByDescending(o => o.TransactionTime)
            .ToListAsync();

        var fifo = await _fifoService.CalculateAsync();

        return orders.Select(o => ToOrderDto(o, fifo)).ToList();
    }

    public async Task<OrderDto?> GetOrderByIdAsync(int id)
    {
        var order = await _context.Orders
            .Include(o => o.OrderDetails)
            .FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);

        if (order == null) return null;

        var fifo = await _fifoService.CalculateAsync();

        return ToOrderDto(order, fifo);
    }

    public async Task<OrderDto> CreateOrderWithDetailsAsync(CreateOrderWithDetailsDto dto)
    {
        foreach (var detailDto in dto.Details)
        {
            await ValidateDetailAsync(detailDto.ProductId, detailDto.Quantity);
        }

        var order = new Order
        {
            OrderNo = dto.OrderNo,
            ImageUrl = dto.ImageUrl,
            Revenue = dto.Revenue,
            TransactionTime = dto.TransactionTime,
            OrderDetails = dto.Details
                .Select(d => new OrderDetail
                {
                    ProductId = d.ProductId,
                    Quantity = d.Quantity,
                    PackagingCost = d.PackagingCost,
                    OtherCost = d.OtherCost,
                    Notes = d.Notes
                })
                .ToList()
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        return (await GetOrderByIdAsync(order.Id))!;
    }

    public async Task<OrderDto?> UpdateOrderAsync(int id, UpdateOrderDto dto)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);

        if (order == null)
        {
            return null;
        }

        order.OrderNo = dto.OrderNo;
        order.ImageUrl = dto.ImageUrl;
        order.Revenue = dto.Revenue;
        order.TransactionTime = dto.TransactionTime;
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return _mapper.Map<OrderDto>(order);
    }

    public async Task<bool> DeleteOrderAsync(int id)
    {
        var order = await _context.Orders
            .Include(o => o.OrderDetails)
            .FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);

        if (order == null)
        {
            return false;
        }

        foreach (var detail in order.OrderDetails.Where(d => !d.IsDeleted))
        {
            detail.IsDeleted = true;
            detail.UpdatedAt = DateTime.UtcNow;
        }

        order.IsDeleted = true;
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    // 订单详细 CRUD
    public async Task<IEnumerable<OrderDetailDto>> GetOrderDetailsAsync(int orderId)
    {
        var details = await _context.OrderDetails
            .Where(d => d.OrderId == orderId && !d.IsDeleted)
            .Include(d => d.Product)
            .OrderBy(d => d.Id)
            .ToListAsync();

        var fifo = await _fifoService.CalculateAsync();

        return details.Select(d => ToOrderDetailDto(d, fifo)).ToList();
    }

    public async Task<OrderDetailDto?> GetOrderDetailByIdAsync(int id)
    {
        var detail = await _context.OrderDetails
            .Include(d => d.Product)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (detail == null) return null;

        var fifo = await _fifoService.CalculateAsync();

        return ToOrderDetailDto(detail, fifo);
    }

    public async Task<OrderDetailDto> CreateOrderDetailAsync(CreateOrderDetailDto dto)
    {
        await ValidateDetailAsync(dto.ProductId, dto.Quantity);

        var orderExists = await _context.Orders
            .AnyAsync(o => o.Id == dto.OrderId && !o.IsDeleted);

        if (!orderExists)
        {
            throw new InvalidOperationException($"订单 ID {dto.OrderId} 不存在");
        }

        var orderDetail = new OrderDetail
        {
            OrderId = dto.OrderId,
            ProductId = dto.ProductId,
            Quantity = dto.Quantity,
            PackagingCost = dto.PackagingCost,
            OtherCost = dto.OtherCost,
            Notes = dto.Notes
        };

        _context.OrderDetails.Add(orderDetail);
        await _context.SaveChangesAsync();

        return (await GetOrderDetailByIdAsync(orderDetail.Id))!;
    }

    public async Task<OrderDetailDto?> UpdateOrderDetailAsync(int id, UpdateOrderDetailDto dto)
    {
        var orderDetail = await _context.OrderDetails
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (orderDetail == null)
        {
            return null;
        }

        await ValidateDetailAsync(dto.ProductId, dto.Quantity);

        orderDetail.ProductId = dto.ProductId;
        orderDetail.Quantity = dto.Quantity;
        orderDetail.PackagingCost = dto.PackagingCost;
        orderDetail.OtherCost = dto.OtherCost;
        orderDetail.Notes = dto.Notes;
        orderDetail.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetOrderDetailByIdAsync(id);
    }

    public async Task<bool> DeleteOrderDetailAsync(int id)
    {
        var orderDetail = await _context.OrderDetails
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (orderDetail == null)
        {
            return false;
        }

        orderDetail.IsDeleted = true;
        orderDetail.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
}
