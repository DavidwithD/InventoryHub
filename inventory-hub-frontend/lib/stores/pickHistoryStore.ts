'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PickHistoryStore {
  /** Recently picked productIds, most-recent first. */
  history: number[];
  addToHistory: (productId: number) => void;
}

const MAX_HISTORY = 30;

/**
 * Remembers which products the user has added to orders, so the picker can offer
 * a quick "选择历史" shortcut instead of a category filter. The `persist`
 * middleware is the only place that touches localStorage.
 */
export const usePickHistoryStore = create<PickHistoryStore>()(
  persist(
    (set) => ({
      history: [],
      addToHistory: (productId) =>
        set((state) => ({
          history: [
            productId,
            ...state.history.filter((id) => id !== productId),
          ].slice(0, MAX_HISTORY),
        })),
    }),
    { name: 'product-pick-history' }
  )
);
