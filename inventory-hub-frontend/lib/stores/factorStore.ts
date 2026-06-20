'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FactorStore {
  /** Last conversion factor the user applied, keyed by productId. */
  factors: Record<number, number>;
  getFactor: (productId: number) => number;
  setFactor: (productId: number, factor: number) => void;
}

const DEFAULT_FACTOR = 1;

/**
 * Centralizes per-product conversion factor persistence. The `persist` middleware
 * is the only place that touches localStorage, so feature code never has to.
 */
export const useFactorStore = create<FactorStore>()(
  persist(
    (set, get) => ({
      factors: {},
      getFactor: (productId) => get().factors[productId] ?? DEFAULT_FACTOR,
      setFactor: (productId, factor) =>
        set((state) => ({ factors: { ...state.factors, [productId]: factor } })),
    }),
    { name: 'inventory-factors' }
  )
);
