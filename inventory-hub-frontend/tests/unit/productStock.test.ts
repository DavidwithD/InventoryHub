import { describe, expect, it } from 'vitest';
import type { Inventory } from '@/types';
import {
  countProductsByStatus,
  filterByStock,
  productStockTotals,
  stockStatus,
} from '@/app/inventory/utils/productStock';

const batch = (id: number, productId: number, stockQuantity: number): Inventory => ({
  id,
  productId,
  stockQuantity,
  purchaseQuantity: 10,
  initialStock: 10,
  priceJpy: 100,
  productName: `P${productId}`,
  createdAt: '',
  updatedAt: '',
  isDeleted: false,
});

// Product 1: three small batches, 9 in total. Product 2: 4 in total, one batch is empty.
// Product 3: sold out.
const inventories = [
  batch(1, 1, 3),
  batch(2, 1, 3),
  batch(3, 1, 3),
  batch(4, 2, 0),
  batch(5, 2, 4),
  batch(6, 3, 0),
];
const totals = productStockTotals(inventories);
const ids = (list: Inventory[]) => list.map((i) => i.id);

describe('product stock', () => {
  it('sums the stock of each product', () => {
    expect([...totals]).toEqual([
      [1, 9],
      [2, 4],
      [3, 0],
    ]);
  });

  it('sets the status from the product total', () => {
    expect(stockStatus(0)).toBe('out');
    expect(stockStatus(-1)).toBe('out');
    expect(stockStatus(1)).toBe('low');
    expect(stockStatus(4)).toBe('low');
    expect(stockStatus(5)).toBe('ok');
  });

  it('counts products, not batches', () => {
    expect(countProductsByStatus(totals)).toEqual({ out: 1, low: 1, ok: 1 });
  });

  it('hides empty batches by default', () => {
    expect(ids(filterByStock(inventories, totals, 'all', false))).toEqual([1, 2, 3, 5]);
    expect(ids(filterByStock(inventories, totals, 'all', true))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('filters low stock by the product total', () => {
    // The small batches of product 1 are not low. Its total is 9.
    expect(ids(filterByStock(inventories, totals, 'low', false))).toEqual([5]);
    expect(ids(filterByStock(inventories, totals, 'low', true))).toEqual([4, 5]);
  });

  it('shows the empty batches of sold-out products', () => {
    // Batch 4 is empty, but product 2 still has stock.
    expect(ids(filterByStock(inventories, totals, 'out', false))).toEqual([6]);
  });
});
