using InventoryHub.API.Data;
using Microsoft.EntityFrameworkCore;

namespace InventoryHub.API.Services;

public interface IFifoService
{
    Task<FifoResult> CalculateAsync();

    // Calculates how sales change when one batch is replaced. A null replacement removes the batch.
    Task<FifoImpact> CalculateImpactAsync(int inventoryId, FifoBatch? replacement);
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
        var batches = await LoadBatchesAsync();
        var sales = await LoadSalesAsync();
        return FifoCalculator.Calculate(batches, sales);
    }

    public async Task<FifoImpact> CalculateImpactAsync(int inventoryId, FifoBatch? replacement)
    {
        var batches = await LoadBatchesAsync();
        var sales = await LoadSalesAsync();

        var changedBatches = batches.Where(b => b.Id != inventoryId).ToList();
        if (replacement != null)
        {
            changedBatches.Add(replacement);
        }

        return FifoCalculator.Compare(
            FifoCalculator.Calculate(batches, sales),
            FifoCalculator.Calculate(changedBatches, sales));
    }

    private Task<List<FifoBatch>> LoadBatchesAsync() =>
        _context.Inventory
            .Where(i => !i.IsDeleted)
            .Select(i => new FifoBatch(i.Id, i.ProductId, i.PurchaseDate, i.InitialStock, i.PriceJpy))
            .ToListAsync();

    private Task<List<FifoSale>> LoadSalesAsync() =>
        _context.OrderDetails
            .Where(d => !d.IsDeleted && !d.Order.IsDeleted)
            .Select(d => new FifoSale(d.Id, d.ProductId, d.Order.TransactionTime, d.Quantity))
            .ToListAsync();
}
