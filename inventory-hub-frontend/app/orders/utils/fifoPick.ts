import { Inventory } from '@/types';

export interface FifoAllocation {
  inventoryId: number;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  purchaseDate?: string;
}

export interface FifoResult {
  allocations: FifoAllocation[];
  shortfall: number;
}

export function pickBatchesFIFO(
  productId: number,
  qty: number,
  inventories: Inventory[],
): FifoResult {
  const batches = inventories
    .filter((inv) => inv.productId === productId && inv.stockQuantity > 0)
    .slice()
    .sort((a, b) => {
      const aTime = a.purchaseDate ? new Date(a.purchaseDate).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.purchaseDate ? new Date(b.purchaseDate).getTime() : Number.POSITIVE_INFINITY;
      if (aTime !== bTime) return aTime - bTime;
      return a.id - b.id;
    });

  const allocations: FifoAllocation[] = [];
  let remaining = qty;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, batch.stockQuantity);
    allocations.push({
      inventoryId: batch.id,
      productId: batch.productId,
      productName: batch.productName,
      unitPrice: batch.priceJpy,
      quantity: take,
      purchaseDate: batch.purchaseDate,
    });
    remaining -= take;
  }

  return { allocations, shortfall: Math.max(0, remaining) };
}

export function totalStockForProduct(productId: number, inventories: Inventory[]): number {
  return inventories
    .filter((inv) => inv.productId === productId)
    .reduce((sum, inv) => sum + inv.stockQuantity, 0);
}
