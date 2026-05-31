'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SortField, SortOrder } from '@/app/inventory/components/InventoryTable';

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
  setSearchOrderNo: (v: string) => void;
  setCostStatus: (v: CostStatus) => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  reset: () => void;
}

const orderDefaults = {
  searchOrderNo: '',
  costStatus: 'all' as CostStatus,
  startDate: '',
  endDate: '',
};

export const useOrderFilterStore = create<OrderFilterState>()(
  persist(
    (set) => ({
      ...orderDefaults,
      setSearchOrderNo: (searchOrderNo) => set({ searchOrderNo }),
      setCostStatus: (costStatus) => set({ costStatus }),
      setStartDate: (startDate) => set({ startDate }),
      setEndDate: (endDate) => set({ endDate }),
      reset: () => set(orderDefaults),
    }),
    { name: 'order-filters', skipHydration: true }
  )
);
