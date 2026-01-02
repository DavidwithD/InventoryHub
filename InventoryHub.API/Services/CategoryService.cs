using AutoMapper;
using InventoryHub.API.Data;
using InventoryHub.API.DTOs;
using InventoryHub.API.Models;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.API.Services;

public class CategoryService : ICategoryService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;

    public CategoryService(AppDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<IEnumerable<CategoryDto>> GetAllAsync()
    {
        var categories = await _context.Categories
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.Name)
            .ToListAsync();

        return _mapper.Map<IEnumerable<CategoryDto>>(categories);
    }

    public async Task<CategoryDto?> GetByIdAsync(int id)
    {
        var category = await _context.Categories
            .Where(c => c.Id == id && !c.IsDeleted)
            .FirstOrDefaultAsync();

        return category == null ? null : _mapper.Map<CategoryDto>(category);
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryDto createDto)
    {
        // Check if category name already exists
        if (await ExistsAsync(createDto.Name))
        {
            throw new InvalidOperationException($"分类名称 '{createDto.Name}' 已存在");
        }

        var category = new Category
        {
            Name = createDto.Name
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return _mapper.Map<CategoryDto>(category);
    }

    public async Task<CategoryDto?> UpdateAsync(int id, UpdateCategoryDto updateDto)
    {
        var category = await _context.Categories
            .Where(c => c.Id == id && !c.IsDeleted)
            .FirstOrDefaultAsync();

        if (category == null)
        {
            return null;
        }

        // Check if new name already exists (excluding current category)
        if (await ExistsAsync(updateDto.Name, id))
        {
            throw new InvalidOperationException($"分类名称 '{updateDto.Name}' 已存在");
        }

        category.Name = updateDto.Name;
        category.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();

        return _mapper.Map<CategoryDto>(category);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var category = await _context.Categories
            .Include(c => c.Products)
            .Where(c => c.Id == id && !c.IsDeleted)
            .FirstOrDefaultAsync();

        if (category == null)
        {
            return false;
        }

        // Check if category has associated products
        if (category.Products.Any(p => !p.IsDeleted))
        {
            throw new InvalidOperationException("无法删除：该分类下还有商品");
        }

        // Soft delete
        category.IsDeleted = true;
        category.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ExistsAsync(string name, int? excludeId = null)
    {
        var query = _context.Categories
            .Where(c => !c.IsDeleted && c.Name == name);

        if (excludeId.HasValue)
        {
            query = query.Where(c => c.Id != excludeId.Value);
        }

        return await query.AnyAsync();
    }
}
