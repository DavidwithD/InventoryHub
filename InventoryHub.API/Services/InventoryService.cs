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
    private readonly IFifoService _fifoService;

    public InventoryService(AppDbContext context, IMapper mapper, IFifoService fifoService)
    {
        _context = context;
        _mapper = mapper;
        _fifoService = fifoService;
    }

    public async Task<IEnumerable<InventoryDto>> GetAllAsync()
    {
        var inventories = await _context.Inventory
            .Where(i => !i.IsDeleted)
            .Include(i => i.Product)
                .ThenInclude(p => p.Category)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var fifo = await _fifoService.CalculateAsync();

        return inventories.Select(i => new InventoryDto
        {
            Id = i.Id,
            ProductId = i.ProductId,
            ProductName = i.Product?.Name ?? "",
            CategoryId = i.Product?.CategoryId ?? 0,
            CategoryName = i.Product?.Category?.Name ?? "",
            PurchaseNo = i.PurchaseNo,
            SupplierId = i.SupplierId,
            PurchaseDate = i.PurchaseDate,
            PurchaseQuantity = i.PurchaseQuantity,
            PriceJpy = i.PriceJpy,
            PriceCny = i.PriceCny,
            InitialStock = i.InitialStock,
            StockQuantity = fifo.Remaining(i.Id),
            IsReferenced = fifo.Remaining(i.Id) < i.InitialStock,
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt
        });
    }

    public async Task<InventoryDto?> GetByIdAsync(int id)
    {
        var inventory = await _context.Inventory
            .Include(i => i.Product)
                .ThenInclude(p => p.Category)
            .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);

        if (inventory == null) return null;

        var fifo = await _fifoService.CalculateAsync();

        return new InventoryDto
        {
            Id = inventory.Id,
            ProductId = inventory.ProductId,
            ProductName = inventory.Product?.Name ?? "",
            CategoryId = inventory.Product?.CategoryId ?? 0,
            CategoryName = inventory.Product?.Category?.Name ?? "",
            PurchaseNo = inventory.PurchaseNo,
            SupplierId = inventory.SupplierId,
            PurchaseDate = inventory.PurchaseDate,
            PurchaseQuantity = inventory.PurchaseQuantity,
            PriceJpy = inventory.PriceJpy,
            PriceCny = inventory.PriceCny,
            InitialStock = inventory.InitialStock,
            StockQuantity = fifo.Remaining(inventory.Id),
            IsReferenced = fifo.Remaining(inventory.Id) < inventory.InitialStock,
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

        // 验证数量
        if (dto.PurchaseQuantity <= 0)
        {
            throw new InvalidOperationException("进货数量必须大于 0");
        }
        if (dto.InitialStock < 0)
        {
            throw new InvalidOperationException("库存数量不能为负数");
        }

        // 创建库存记录
        var inventory = new Inventory
        {
            ProductId = dto.ProductId,
            PurchaseQuantity = dto.PurchaseQuantity,
            InitialStock = dto.InitialStock,
            PriceJpy = dto.PriceJpy,
            PriceCny = dto.PriceCny,
            SupplierId = dto.SupplierId,
            PurchaseDate = dto.PurchaseDate,
            PurchaseNo = dto.PurchaseNo,
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

        // 验证商品是否存在
        var productExists = await _context.Products
            .AnyAsync(p => p.Id == dto.ProductId && !p.IsDeleted);
        if (!productExists)
        {
            throw new InvalidOperationException($"商品 ID {dto.ProductId} 不存在");
        }

        // 验证数量
        if (dto.PurchaseQuantity <= 0)
        {
            throw new InvalidOperationException("进货数量必须大于 0");
        }
        if (dto.InitialStock < 0)
        {
            throw new InvalidOperationException("库存数量不能为负数");
        }

        // 更新库存记录
        inventory.ProductId = dto.ProductId;
        inventory.PurchaseQuantity = dto.PurchaseQuantity;
        inventory.InitialStock = dto.InitialStock;
        inventory.PriceJpy = dto.PriceJpy;
        inventory.PriceCny = dto.PriceCny;
        inventory.SupplierId = dto.SupplierId;
        inventory.PurchaseDate = dto.PurchaseDate;
        inventory.PurchaseNo = dto.PurchaseNo;
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

        // 检查是否已有销售分配到该批次
        var fifo = await _fifoService.CalculateAsync();
        if (fifo.Remaining(id) < inventory.InitialStock)
        {
            throw new InvalidOperationException("该库存已被订单引用，无法删除");
        }

        inventory.IsDeleted = true;
        inventory.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return true;
    }
}
