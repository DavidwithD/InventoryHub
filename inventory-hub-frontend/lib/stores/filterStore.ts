'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SortField, SortOrder } from '@/app/inventory/components/InventoryTable';
import {
  DEFAULT_ORDER_SORT,
  ORDER_SORT_LABELS,
  type OrderSort,
} from '@/app/orders/utils/sortOrders';

export type StockFilter = 'all' | 'low' | 'out';

interface InventoryFilterState {
  search: string;
  categoryId: number | '';
  stockFilter: StockFilter;
  sortField: SortField;
  sortOrder: SortOrder;
  setSearch: (v: string) => void;
  setCategoryId: (v: number | '') => void;
  setStockFilter: (v: StockFilter) => void;
  setSortField: (v: SortField) => void;
  setSortOrder: (v: SortOrder) => void;
  reset: () => void;
}

const inventoryDefaults = {
  search: '',
  categoryId: '' as number | '',
  stockFilter: 'all' as StockFilter,
  sortField: 'id' as SortField,
  sortOrder: 'asc' as SortOrder,
};

export const useInventoryFilterStore = create<InventoryFilterState>()(
  persist(
    (set) => ({
      ...inventoryDefaults,
      setSearch: (search) => set({ search }),
      setCategoryId: (categoryId) => set({ categoryId }),
      setStockFilter: (stockFilter) => set({ stockFilter }),
      setSortField: (sortField) => set({ sortField }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      reset: () => set(inventoryDefaults),
    }),
    // skipHydration + a mount-time rehydrate() keeps server/first-client render on
    // defaults, then loads persisted values — avoids hydration mismatches on inputs.
    { name: 'inventory-filters', skipHydration: true }
  )
);

type CostStatus = 'all' | 'null' | 'hasValue';

interface OrderFilterState {
  searchOrderNo: string;
  costStatus: CostStatus;
  startDate: string;
  endDate: string;
  sort: OrderSort;
  setSearchOrderNo: (v: string) => void;
  setCostStatus: (v: CostStatus) => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  setSort: (v: OrderSort) => void;
  /** Clears the filters. The sort stays. */
  reset: () => void;
}

const orderDefaults = {
  searchOrderNo: '',
  costStatus: 'all' as CostStatus,
  startDate: '',
  endDate: '',
};

/** Returns the saved sort when its field and direction are known. Otherwise returns the default sort. */
export function validOrderSort(value: unknown): OrderSort {
  const sort = value as Partial<OrderSort> | null | undefined;
  const fieldOk = typeof sort?.field === 'string' && Object.hasOwn(ORDER_SORT_LABELS, sort.field);
  const directionOk = sort?.direction === 'asc' || sort?.direction === 'desc';
  return fieldOk && directionOk
    ? { field: sort.field!, direction: sort.direction! }
    : DEFAULT_ORDER_SORT;
}

export const useOrderFilterStore = create<OrderFilterState>()(
  persist(
    (set) => ({
      ...orderDefaults,
      sort: DEFAULT_ORDER_SORT,
      setSearchOrderNo: (searchOrderNo) => set({ searchOrderNo }),
      setCostStatus: (costStatus) => set({ costStatus }),
      setStartDate: (startDate) => set({ startDate }),
      setEndDate: (endDate) => set({ endDate }),
      setSort: (sort) => set({ sort }),
      reset: () => set(orderDefaults),
    }),
    {
      name: 'order-filters',
      skipHydration: true,
      // A saved sort with an unknown field or direction falls back to the default sort.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<OrderFilterState>;
        return { ...current, ...saved, sort: validOrderSort(saved.sort) };
      },
    }
  )
);
