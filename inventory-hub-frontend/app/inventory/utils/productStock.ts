import type { Inventory } from '@/types';

/** A product with fewer units than this in all its batches is low stock. The API uses the same limit. */
export const LOW_STOCK_THRESHOLD = 5;

export type StockStatus = 'out' | 'low' | 'ok';

/**
 * Sums the remaining stock of each product over its batches.
 * A batch with negative stock adds 0. The API uses the same rule.
 */
export function productStockTotals(inventories: Inventory[]): Map<number, number> {
  const totals = new Map<number, number>();
  for (const inv of inventories) {
    totals.set(inv.productId, (totals.get(inv.productId) ?? 0) + Math.max(0, inv.stockQuantity));
  }
  return totals;
}

/** Status of a product from its total stock. 0 or less is out of stock. */
export function stockStatus(total: number): StockStatus {
  if (total <= 0) return 'out';
  if (total < LOW_STOCK_THRESHOLD) return 'low';
  return 'ok';
}

/**
 * Keeps the batches that match the stock filter. The filter uses the product total, not the batch stock.
 * Empty batches are hidden unless showEmpty is set. The 'out' filter keeps them, because its batches are all empty.
 */
export function filterByStock(
  inventories: Inventory[],
  totals: Map<number, number>,
  filter: 'all' | 'low' | 'out',
  showEmpty: boolean
): Inventory[] {
  return inventories.filter((inv) => {
    const status = stockStatus(totals.get(inv.productId) ?? inv.stockQuantity);
    if (filter !== 'all' && status !== filter) return false;
    if (filter !== 'out' && !showEmpty && inv.stockQuantity <= 0) return false;
    return true;
  });
}

/** Counts the products in each status. */
export function countProductsByStatus(totals: Map<number, number>): Record<StockStatus, number> {
  const counts: Record<StockStatus, number> = { out: 0, low: 0, ok: 0 };
  for (const total of totals.values()) counts[stockStatus(total)] += 1;
  return counts;
}
