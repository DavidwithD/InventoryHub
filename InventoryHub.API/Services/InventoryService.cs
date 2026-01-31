using AutoMapper;
using InventoryHub.API.Data;
using InventoryHub.API.DTOs;
using InventoryHub.API.Models;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.API.Services;

public class InventoryService : IInventoryService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public InventoryService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<IEnumerable<InventoryDto>> GetAllAsync(int? purchaseId = null)
    {
        var query = _context.Inventory
            .Where(i => !i.IsDeleted);

        // 按进货单筛选
        if (purchaseId.HasValue)
        {
            query = query.Where(i => i.PurchaseId == purchaseId.Value);
        }

        var inventories = await query
            .Include(i => i.Product)
                .ThenInclude(p => p.Category)
            .Include(i => i.Purchase)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        // 获取所有被订单引用的库存 ID
        var inventoryIds = inventories.Select(i => i.Id).ToList();
        var referencedIds = await _context.OrderDetails
            .Where(od => inventoryIds.Contains(od.InventoryId) && !od.IsDeleted)
            .Select(od => od.InventoryId)
            .Distinct()
            .ToListAsync();

        return inventories.Select(i => new InventoryDto
        {
            Id = i.Id,
            ProductId = i.ProductId,
            ProductName = i.Product?.Name ?? "",
            CategoryId = i.Product?.CategoryId ?? 0,
            CategoryName = i.Product?.Category?.Name ?? "",
            PurchaseId = i.PurchaseId,
            PurchaseNo = i.Purchase?.PurchaseNo ?? "",
            PurchaseAmount = i.PurchaseAmount,
            PurchaseAmountCny = i.PurchaseAmountCny,
            PurchaseQuantity = i.PurchaseQuantity,
            UnitCost = i.UnitCost,
            StockQuantity = i.StockQuantity,
            IsReferenced = referencedIds.Contains(i.Id),
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt
        });
    }

    public async Task<InventoryDto?> GetByIdAsync(int id)
    {
        var inventory = await _context.Inventory
            .Include(i => i.Product)
                .ThenInclude(p => p.Category)
            .Include(i => i.Purchase)
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);

        if (inventory == null) return null;

        // 检查是否被订单引用
        var isReferenced = await _context.OrderDetails
            .AnyAsync(od => od.InventoryId == id && !od.IsDeleted);

        return new InventoryDto
        {
            Id = inventory.Id,
            ProductId = inventory.ProductId,
            ProductName = inventory.Product?.Name ?? "",
            CategoryId = inventory.Product?.CategoryId ?? 0,
            CategoryName = inventory.Product?.Category?.Name ?? "",
            PurchaseId = inventory.PurchaseId,
            PurchaseNo = inventory.Purchase?.PurchaseNo ?? "",
            PurchaseAmount = inventory.PurchaseAmount,
            PurchaseAmountCny = inventory.PurchaseAmountCny,
            PurchaseQuantity = inventory.PurchaseQuantity,
            UnitCost = inventory.UnitCost,
            StockQuantity = inventory.StockQuantity,
            IsReferenced = isReferenced,
            CreatedAt = inventory.CreatedAt,
            UpdatedAt = inventory.UpdatedAt
        };
    }

    public async Task<InventoryDto> CreateAsync(CreateInventoryDto dto)
    {
        // 验证商品是否存在
        var productExists = await _context.Products
            .AnyAsync(p => p.Id == dto.ProductId && !p.IsDeleted);
        if (!productExists)
        {
            throw new InvalidOperationException($"商品 ID {dto.ProductId} 不存在");
        }

        // 验证进货单是否存在并获取汇率
        var purchase = await _context.Purchases
            .FirstOrDefaultAsync(p => p.Id == dto.PurchaseId && !p.IsDeleted);
        if (purchase == null)
        {
            throw new InvalidOperationException($"进货单 ID {dto.PurchaseId} 不存在");
        }

        // 验证数量
        if (dto.PurchaseQuantity <= 0)
        {
            throw new InvalidOperationException("进货数量必须大于 0");
        }
        if (dto.StockQuantity < 0)
        {
            throw new InvalidOperationException("库存数量不能为负数");
        }

        // 创建库存记录
        var inventory = new Inventory
        {
            ProductId = dto.ProductId,
            PurchaseId = dto.PurchaseId,
            PurchaseQuantity = dto.PurchaseQuantity,
            StockQuantity = dto.StockQuantity,
            // 保存原始人民币金额
            PurchaseAmountCny = dto.PurchaseAmountCny,
            // 将人民币转换为日元：CNY × 汇率 = JPY
            PurchaseAmount = dto.PurchaseAmountCny * purchase.ExchangeRate,
            // 计算日元单位成本
            UnitCost = (dto.PurchaseAmountCny * purchase.ExchangeRate) / dto.PurchaseQuantity
        };

        _context.Inventory.Add(inventory);
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(inventory.Id))!;
    }

    public async Task<IEnumerable<InventoryDto>> BatchCreateAsync(List<CreateInventoryDto> dtos)
    {
        var createdItems = new List<InventoryDto>();

        foreach (var dto in dtos)
        {
            var item = await CreateAsync(dto);
            createdItems.Add(item);
        }

        return createdItems;
    }

    public async Task<InventoryDto?> UpdateAsync(int id, UpdateInventoryDto dto)
    {
        var inventory = await _context.Inventory
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);
        if (inventory == null)
        {
            return null;
        }

        // 检查是否被订单引用
        var isReferenced = await _context.OrderDetails
            .AnyAsync(od => od.InventoryId == id && !od.IsDeleted);

        if (isReferenced)
        {
            throw new InvalidOperationException("该库存已被订单引用，无法修改");
        }

        // 验证商品是否存在
        var productExists = await _context.Products
            .AnyAsync(p => p.Id == dto.ProductId && !p.IsDeleted);
        if (!productExists)
        {
            throw new InvalidOperationException($"商品 ID {dto.ProductId} 不存在");
        }

        // 验证进货单是否存在并获取汇率
        var purchase = await _context.Purchases
            .FirstOrDefaultAsync(p => p.Id == dto.PurchaseId && !p.IsDeleted);
        if (purchase == null)
        {
            throw new InvalidOperationException($"进货单 ID {dto.PurchaseId} 不存在");
        }

        // 验证数量
        if (dto.PurchaseQuantity <= 0)
        {
            throw new InvalidOperationException("进货数量必须大于 0");
        }
        if (dto.StockQuantity < 0)
        {
            throw new InvalidOperationException("库存数量不能为负数");
        }

        // 更新库存记录
        inventory.ProductId = dto.ProductId;
        inventory.PurchaseId = dto.PurchaseId;
        inventory.PurchaseQuantity = dto.PurchaseQuantity;
        inventory.StockQuantity = dto.StockQuantity;
        // 保存原始人民币金额
        inventory.PurchaseAmountCny = dto.PurchaseAmountCny;
        // 将人民币转换为日元
        inventory.PurchaseAmount = dto.PurchaseAmountCny * purchase.ExchangeRate;
        // 重新计算日元单位成本
        inventory.UnitCost = inventory.PurchaseAmount / dto.PurchaseQuantity;
        inventory.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var inventory = await _context.Inventory
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);

        if (inventory == null)
        {
            return false;
        }

        // 检查是否被订单引用
        var isReferenced = await _context.OrderDetails
            .AnyAsync(od => od.InventoryId == id && !od.IsDeleted);

        if (isReferenced)
        {
            throw new InvalidOperationException("该库存已被订单引用，无法删除");
        }

        inventory.IsDeleted = true;
        inventory.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<decimal> GetPurchaseTotalAmountAsync(int purchaseId)
    {
        // 返回该进货单的日元总额（用于验证）
        var total = await _context.Inventory
            .Where(i => i.PurchaseId == purchaseId && !i.IsDeleted)
            .SumAsync(i => i.PurchaseAmount);
        return total;
    }

    public async Task<decimal> GetPurchaseExpectedTotalJpyAsync(int purchaseId)
    {
        // 获取进货单的期望日元总额：人民币总额 × 汇率
        var purchase = await _context.Purchases
            .FirstOrDefaultAsync(p => p.Id == purchaseId && !p.IsDeleted);
        if (purchase == null) return 0;
        return purchase.TotalAmount * purchase.ExchangeRate;
    }
}
