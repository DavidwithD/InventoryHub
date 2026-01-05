using AutoMapper;
using InventoryHub.API.Data;
using InventoryHub.API.DTOs;
using InventoryHub.API.Models;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.API.Services;

public class PurchaseService : IPurchaseService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public PurchaseService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<IEnumerable<PurchaseDto>> GetAllAsync(
        string? purchaseNo = null,
        int? supplierId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        string sortBy = "purchaseDate",
        string sortOrder = "desc")
    {
        var query = _context.Purchases
            .Where(p => !p.IsDeleted);

        // 单号模糊搜索
        if (!string.IsNullOrWhiteSpace(purchaseNo))
        {
            query = query.Where(p => p.PurchaseNo.Contains(purchaseNo));
        }

        // 供应商筛选
        if (supplierId.HasValue)
        {
            query = query.Where(p => p.SupplierId == supplierId.Value);
        }

        // 日期范围筛选
        if (startDate.HasValue)
        {
            query = query.Where(p => p.PurchaseDate >= startDate.Value);
        }
        if (endDate.HasValue)
        {
            query = query.Where(p => p.PurchaseDate <= endDate.Value);
        }

        // 动态排序
        query = query.Include(p => p.Supplier);

        query = sortBy.ToLower() switch
        {
            "purchaseno" => sortOrder.ToLower() == "asc"
                ? query.OrderBy(p => p.PurchaseNo)
                : query.OrderByDescending(p => p.PurchaseNo),
            "totalamount" => sortOrder.ToLower() == "asc"
                ? query.OrderBy(p => p.TotalAmount)
                : query.OrderByDescending(p => p.TotalAmount),
            _ => sortOrder.ToLower() == "asc"
                ? query.OrderBy(p => p.PurchaseDate).ThenBy(p => p.Id)
                : query.OrderByDescending(p => p.PurchaseDate).ThenByDescending(p => p.Id)
        };

        var purchases = await query.ToListAsync();

        return purchases.Select(p => new PurchaseDto
        {
            Id = p.Id,
            SupplierId = p.SupplierId,
            SupplierName = p.Supplier?.Name ?? "",
            PurchaseDate = p.PurchaseDate,
            PurchaseNo = p.PurchaseNo,
            TotalAmount = p.TotalAmount,
            CurrencyType = p.CurrencyType,
            ExchangeRate = p.ExchangeRate,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        });
    }

    public async Task<PurchaseDto?> GetByIdAsync(int id)
    {
        var purchase = await _context.Purchases
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        if (purchase == null) return null;

        return new PurchaseDto
        {
            Id = purchase.Id,
            SupplierId = purchase.SupplierId,
            SupplierName = purchase.Supplier?.Name ?? "",
            PurchaseDate = purchase.PurchaseDate,
            PurchaseNo = purchase.PurchaseNo,
            TotalAmount = purchase.TotalAmount,
            CurrencyType = purchase.CurrencyType,
            ExchangeRate = purchase.ExchangeRate,
            CreatedAt = purchase.CreatedAt,
            UpdatedAt = purchase.UpdatedAt
        };
    }

    public async Task<PurchaseDto> CreateAsync(CreatePurchaseDto dto)
    {
        // 验证供应商是否存在
        var supplierExists = await _context.Suppliers
            .AnyAsync(s => s.Id == dto.SupplierId && !s.IsDeleted);
        if (!supplierExists)
        {
            throw new InvalidOperationException($"供应商 ID {dto.SupplierId} 不存在");
        }

        // 检查进货单号是否已存在
        var exists = await _context.Purchases
            .AnyAsync(p => p.PurchaseNo == dto.PurchaseNo && !p.IsDeleted);
        if (exists)
        {
            throw new InvalidOperationException($"进货单号 '{dto.PurchaseNo}' 已存在");
        }

        var purchase = _mapper.Map<Purchase>(dto);
        _context.Purchases.Add(purchase);
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(purchase.Id))!;
    }

    public async Task<PurchaseDto?> UpdateAsync(int id, UpdatePurchaseDto dto)
    {
        var purchase = await _context.Purchases
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        if (purchase == null)
        {
            return null;
        }

        // 验证供应商是否存在
        var supplierExists = await _context.Suppliers
            .AnyAsync(s => s.Id == dto.SupplierId && !s.IsDeleted);
        if (!supplierExists)
        {
            throw new InvalidOperationException($"供应商 ID {dto.SupplierId} 不存在");
        }

        // 检查进货单号是否与其他进货重复
        var exists = await _context.Purchases
            .AnyAsync(p => p.PurchaseNo == dto.PurchaseNo && p.Id != id && !p.IsDeleted);
        if (exists)
        {
            throw new InvalidOperationException($"进货单号 '{dto.PurchaseNo}' 已存在");
        }

        _mapper.Map(dto, purchase);
        purchase.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var purchase = await _context.Purchases
            .Include(p => p.InventoryItems)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        if (purchase == null)
        {
            return false;
        }

        // 检查是否有关联的库存记录
        if (purchase.InventoryItems.Any())
        {
            throw new InvalidOperationException("该进货单下有关联的库存记录，无法删除");
        }

        purchase.IsDeleted = true;
        purchase.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Purchases
            .AnyAsync(p => p.Id == id && !p.IsDeleted);
    }
}
