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

    public OrderService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    // 订单 CRUD
    public async Task<IEnumerable<OrderDto>> GetAllOrdersAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.Orders.Where(o => !o.IsDeleted);

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

        return _mapper.Map<IEnumerable<OrderDto>>(orders);
    }

    public async Task<OrderDto?> GetOrderByIdAsync(int id)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);

        return order == null ? null : _mapper.Map<OrderDto>(order);
    }

    public async Task<OrderDto> CreateOrderWithDetailsAsync(CreateOrderWithDetailsDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. 创建订单
            var order = new Order
            {
                OrderNo = dto.OrderNo,
                ImageUrl = dto.ImageUrl,
                Revenue = dto.Revenue,
                TransactionTime = dto.TransactionTime,
                TotalCost = 0 // 先初始化为0，后面计算
            };

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            decimal totalCost = 0;

            // 2. 创建订单详细并扣减库存
            foreach (var detailDto in dto.Details)
            {
                // 验证库存
                var inventory = await _context.Inventory
                    .FirstOrDefaultAsync(i => i.Id == detailDto.InventoryId && !i.IsDeleted);

                if (inventory == null)
                {
                    throw new InvalidOperationException($"库存记录 ID {detailDto.InventoryId} 不存在");
                }

                if (inventory.StockQuantity < detailDto.Quantity)
                {
                    throw new InvalidOperationException(
                        $"库存不足：商品 ID {detailDto.ProductId}，可用库存 {inventory.StockQuantity}，需要 {detailDto.Quantity}");
                }

                // 计算小计成本：(库存单位成本 * 数量) + 包装成本 + 其他成本
                var subtotalCost = (inventory.UnitCost * detailDto.Quantity)
                                 + detailDto.PackagingCost
                                 + detailDto.OtherCost;

                // 创建订单详细
                var orderDetail = new OrderDetail
                {
                    OrderId = order.Id,
                    InventoryId = detailDto.InventoryId,
                    ProductId = detailDto.ProductId,
                    UnitPrice = detailDto.UnitPrice,
                    Quantity = detailDto.Quantity,
                    PackagingCost = detailDto.PackagingCost,
                    OtherCost = detailDto.OtherCost,
                    SubtotalCost = subtotalCost,
                    Notes = detailDto.Notes
                };

                _context.OrderDetails.Add(orderDetail);

                // 扣减库存
                inventory.StockQuantity -= detailDto.Quantity;
                inventory.UpdatedAt = DateTime.UtcNow;

                totalCost += subtotalCost;
            }

            // 3. 更新订单总成本
            order.TotalCost = totalCost;
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return _mapper.Map<OrderDto>(order);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
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
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var order = await _context.Orders
                .Include(o => o.OrderDetails)
                .FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);

            if (order == null)
            {
                return false;
            }

            // 恢复库存
            foreach (var detail in order.OrderDetails.Where(d => !d.IsDeleted))
            {
                var inventory = await _context.Inventory
                    .FirstOrDefaultAsync(i => i.Id == detail.InventoryId && !i.IsDeleted);

                if (inventory != null)
                {
                    inventory.StockQuantity += detail.Quantity;
                    inventory.UpdatedAt = DateTime.UtcNow;
                }

                detail.IsDeleted = true;
                detail.UpdatedAt = DateTime.UtcNow;
            }

            order.IsDeleted = true;
            order.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // 订单详细 CRUD
    public async Task<IEnumerable<OrderDetailDto>> GetOrderDetailsAsync(int orderId)
    {
        var details = await _context.OrderDetails
            .Where(d => d.OrderId == orderId && !d.IsDeleted)
            .Include(d => d.Product)
            .OrderBy(d => d.Id)
            .ToListAsync();

        return details.Select(d => new OrderDetailDto
        {
            Id = d.Id,
            OrderId = d.OrderId,
            InventoryId = d.InventoryId,
            ProductId = d.ProductId,
            ProductName = d.Product?.Name ?? "",
            UnitPrice = d.UnitPrice,
            Quantity = d.Quantity,
            PackagingCost = d.PackagingCost,
            OtherCost = d.OtherCost,
            SubtotalCost = d.SubtotalCost,
            Notes = d.Notes,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt
        });
    }

    public async Task<OrderDetailDto?> GetOrderDetailByIdAsync(int id)
    {
        var detail = await _context.OrderDetails
            .Include(d => d.Product)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

        if (detail == null) return null;

        return new OrderDetailDto
        {
            Id = detail.Id,
            OrderId = detail.OrderId,
            InventoryId = detail.InventoryId,
            ProductId = detail.ProductId,
            ProductName = detail.Product?.Name ?? "",
            UnitPrice = detail.UnitPrice,
            Quantity = detail.Quantity,
            PackagingCost = detail.PackagingCost,
            OtherCost = detail.OtherCost,
            SubtotalCost = detail.SubtotalCost,
            Notes = detail.Notes,
            CreatedAt = detail.CreatedAt,
            UpdatedAt = detail.UpdatedAt
        };
    }

    public async Task<OrderDetailDto> CreateOrderDetailAsync(CreateOrderDetailDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 验证库存
            var inventory = await _context.Inventory
                .FirstOrDefaultAsync(i => i.Id == dto.InventoryId && !i.IsDeleted);

            if (inventory == null)
            {
                throw new InvalidOperationException($"库存记录 ID {dto.InventoryId} 不存在");
            }

            if (inventory.StockQuantity < dto.Quantity)
            {
                throw new InvalidOperationException(
                    $"库存不足：可用库存 {inventory.StockQuantity}，需要 {dto.Quantity}");
            }

            // 计算小计成本
            var subtotalCost = (inventory.UnitCost * dto.Quantity)
                             + dto.PackagingCost
                             + dto.OtherCost;

            var orderDetail = new OrderDetail
            {
                OrderId = dto.OrderId,
                InventoryId = dto.InventoryId,
                ProductId = dto.ProductId,
                UnitPrice = dto.UnitPrice,
                Quantity = dto.Quantity,
                PackagingCost = dto.PackagingCost,
                OtherCost = dto.OtherCost,
                SubtotalCost = subtotalCost,
                Notes = dto.Notes
            };

            _context.OrderDetails.Add(orderDetail);

            // 扣减库存
            inventory.StockQuantity -= dto.Quantity;
            inventory.UpdatedAt = DateTime.UtcNow;

            // 更新订单总成本
            var order = await _context.Orders.FindAsync(dto.OrderId);
            if (order != null)
            {
                order.TotalCost += subtotalCost;
                order.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return (await GetOrderDetailByIdAsync(orderDetail.Id))!;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<OrderDetailDto?> UpdateOrderDetailAsync(int id, UpdateOrderDetailDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var orderDetail = await _context.OrderDetails
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (orderDetail == null)
            {
                return null;
            }

            // 恢复旧的库存
            var oldInventory = await _context.Inventory
                .FirstOrDefaultAsync(i => i.Id == orderDetail.InventoryId && !i.IsDeleted);
            if (oldInventory != null)
            {
                oldInventory.StockQuantity += orderDetail.Quantity;
            }

            // 扣减新的库存
            var newInventory = await _context.Inventory
                .FirstOrDefaultAsync(i => i.Id == dto.InventoryId && !i.IsDeleted);

            if (newInventory == null)
            {
                throw new InvalidOperationException($"库存记录 ID {dto.InventoryId} 不存在");
            }

            if (newInventory.StockQuantity < dto.Quantity)
            {
                throw new InvalidOperationException(
                    $"库存不足：可用库存 {newInventory.StockQuantity}，需要 {dto.Quantity}");
            }

            newInventory.StockQuantity -= dto.Quantity;
            newInventory.UpdatedAt = DateTime.UtcNow;

            // 更新订单总成本（减去旧的，加上新的）
            var order = await _context.Orders.FindAsync(orderDetail.OrderId);
            if (order != null)
            {
                order.TotalCost -= orderDetail.SubtotalCost;

                var newSubtotalCost = (newInventory.UnitCost * dto.Quantity)
                                    + dto.PackagingCost
                                    + dto.OtherCost;

                order.TotalCost += newSubtotalCost;
                order.UpdatedAt = DateTime.UtcNow;

                orderDetail.SubtotalCost = newSubtotalCost;
            }

            // 更新订单详细
            orderDetail.InventoryId = dto.InventoryId;
            orderDetail.ProductId = dto.ProductId;
            orderDetail.UnitPrice = dto.UnitPrice;
            orderDetail.Quantity = dto.Quantity;
            orderDetail.PackagingCost = dto.PackagingCost;
            orderDetail.OtherCost = dto.OtherCost;
            orderDetail.Notes = dto.Notes;
            orderDetail.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return await GetOrderDetailByIdAsync(id);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> DeleteOrderDetailAsync(int id)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var orderDetail = await _context.OrderDetails
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (orderDetail == null)
            {
                return false;
            }

            // 恢复库存
            var inventory = await _context.Inventory
                .FirstOrDefaultAsync(i => i.Id == orderDetail.InventoryId && !i.IsDeleted);

            if (inventory != null)
            {
                inventory.StockQuantity += orderDetail.Quantity;
                inventory.UpdatedAt = DateTime.UtcNow;
            }

            // 更新订单总成本
            var order = await _context.Orders.FindAsync(orderDetail.OrderId);
            if (order != null)
            {
                order.TotalCost -= orderDetail.SubtotalCost;
                order.UpdatedAt = DateTime.UtcNow;
            }

            orderDetail.IsDeleted = true;
            orderDetail.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
