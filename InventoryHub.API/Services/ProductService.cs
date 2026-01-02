using AutoMapper;
using InventoryHub.API.Data;
using InventoryHub.API.DTOs;
using InventoryHub.API.Models;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.API.Services;

public class ProductService : IProductService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public ProductService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<IEnumerable<ProductDto>> GetAllAsync()
    {
        var products = await _context.Products
            .Where(p => !p.IsDeleted)
            .Include(p => p.Category)
            .OrderBy(p => p.Name)
            .ToListAsync();

        return products.Select(p => new ProductDto
        {
            Id = p.Id,
            CategoryId = p.CategoryId,
            CategoryName = p.Category?.Name ?? "",
            Name = p.Name,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        });
    }

    public async Task<ProductDto?> GetByIdAsync(int id)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        if (product == null) return null;

        return new ProductDto
        {
            Id = product.Id,
            CategoryId = product.CategoryId,
            CategoryName = product.Category?.Name ?? "",
            Name = product.Name,
            CreatedAt = product.CreatedAt,
            UpdatedAt = product.UpdatedAt
        };
    }

    public async Task<ProductDto> CreateAsync(CreateProductDto dto)
    {
        // 验证分类是否存在
        var categoryExists = await _context.Categories
            .AnyAsync(c => c.Id == dto.CategoryId && !c.IsDeleted);
        if (!categoryExists)
        {
            throw new InvalidOperationException($"分类 ID {dto.CategoryId} 不存在");
        }

        // 检查名称是否已存在
        var exists = await _context.Products
            .AnyAsync(p => p.Name == dto.Name && !p.IsDeleted);
        if (exists)
        {
            throw new InvalidOperationException($"商品名称 '{dto.Name}' 已存在");
        }

        var product = _mapper.Map<Product>(dto);
        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(product.Id))!;
    }

    public async Task<ProductDto?> UpdateAsync(int id, UpdateProductDto dto)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        if (product == null)
        {
            return null;
        }

        // 验证分类是否存在
        var categoryExists = await _context.Categories
            .AnyAsync(c => c.Id == dto.CategoryId && !c.IsDeleted);
        if (!categoryExists)
        {
            throw new InvalidOperationException($"分类 ID {dto.CategoryId} 不存在");
        }

        // 检查名称是否与其他商品重复
        var exists = await _context.Products
            .AnyAsync(p => p.Name == dto.Name && p.Id != id && !p.IsDeleted);
        if (exists)
        {
            throw new InvalidOperationException($"商品名称 '{dto.Name}' 已存在");
        }

        _mapper.Map(dto, product);
        product.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var product = await _context.Products
            .Include(p => p.Inventories)
            .Include(p => p.OrderDetails)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);

        if (product == null)
        {
            return false;
        }

        // 检查是否有关联的库存或订单记录
        if (product.Inventories.Any() || product.OrderDetails.Any())
        {
            throw new InvalidOperationException("该商品下有关联的库存或订单记录，无法删除");
        }

        product.IsDeleted = true;
        product.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Products
            .AnyAsync(p => p.Id == id && !p.IsDeleted);
    }
}
