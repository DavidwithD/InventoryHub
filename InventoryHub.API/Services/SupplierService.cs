using AutoMapper;
using InventoryHub.API.Data;
using InventoryHub.API.DTOs;
using InventoryHub.API.Models;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.API.Services;

public class SupplierService : ISupplierService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public SupplierService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<IEnumerable<SupplierDto>> GetAllAsync()
    {
        var suppliers = await _context.Suppliers
            .Where(s => !s.IsDeleted)
            .OrderBy(s => s.Name)
            .ToListAsync();
        return _mapper.Map<IEnumerable<SupplierDto>>(suppliers);
    }

    public async Task<SupplierDto?> GetByIdAsync(int id)
    {
        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        return supplier == null ? null : _mapper.Map<SupplierDto>(supplier);
    }

    public async Task<SupplierDto> CreateAsync(CreateSupplierDto dto)
    {
        // 检查名称是否已存在
        var exists = await _context.Suppliers
            .AnyAsync(s => s.Name == dto.Name && !s.IsDeleted);
        if (exists)
        {
            throw new InvalidOperationException($"供应商名称 '{dto.Name}' 已存在");
        }

        var supplier = _mapper.Map<Supplier>(dto);
        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();

        return _mapper.Map<SupplierDto>(supplier);
    }

    public async Task<SupplierDto?> UpdateAsync(int id, UpdateSupplierDto dto)
    {
        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
        if (supplier == null)
        {
            return null;
        }

        // 检查名称是否与其他供应商重复
        var exists = await _context.Suppliers
            .AnyAsync(s => s.Name == dto.Name && s.Id != id && !s.IsDeleted);
        if (exists)
        {
            throw new InvalidOperationException($"供应商名称 '{dto.Name}' 已存在");
        }

        _mapper.Map(dto, supplier);
        supplier.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return _mapper.Map<SupplierDto>(supplier);
    }

    // 不需要删除供应商的操作 
    // public async Task<bool> DeleteAsync(int id)
    // {
    //     var supplier = await _context.Suppliers
    //         .Include(s => s.Products)
    //         .Include(s => s.Purchases)
    //         .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);

    //     if (supplier == null)
    //     {
    //         return false;
    //     }

    //     // 检查是否有关联的商品或采购记录
    //     if (supplier.Products.Any() || supplier.Purchases.Any())
    //     {
    //         throw new InvalidOperationException("该供应商下有关联的商品或采购记录，无法删除");
    //     }

    //     supplier.IsDeleted = true;
    //     supplier.UpdatedAt = DateTime.UtcNow;
    //     await _context.SaveChangesAsync();

    //     return true;
    // }

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Suppliers
            .AnyAsync(s => s.Id == id && !s.IsDeleted);
    }
}
