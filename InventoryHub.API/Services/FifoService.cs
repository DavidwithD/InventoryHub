using InventoryHub.API.Data;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.API.Services;

public interface IFifoService
{
    Task<FifoResult> CalculateAsync();
}

public class FifoService : IFifoService
{
    private readonly AppDbContext _context;

    public FifoService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<FifoResult> CalculateAsync()
    {
        var batches = await _context.Inventory
            .Where(i => !i.IsDeleted)
            .Select(i => new FifoBatch(i.Id, i.ProductId, i.PurchaseDate, i.InitialStock, i.PriceJpy))
            .ToListAsync();

        var sales = await _context.OrderDetails
            .Where(d => !d.IsDeleted && !d.Order.IsDeleted)
            .Select(d => new FifoSale(d.Id, d.ProductId, d.Order.TransactionTime, d.Quantity))
            .ToListAsync();

        return FifoCalculator.Calculate(batches, sales);
    }
}
