'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'table' | 'card';
export type ViewModePage = 'orders' | 'products';

interface ViewModeState {
  modes: Record<ViewModePage, ViewMode>;
  setMode: (page: ViewModePage, mode: ViewMode) => void;
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set) => ({
      modes: { orders: 'table', products: 'table' },
      setMode: (page, mode) => set((s) => ({ modes: { ...s.modes, [page]: mode } })),
    }),
    // The first render uses the defaults. The saved value loads after mount.
    // This avoids a hydration mismatch.
    { name: 'list-view-modes', skipHydration: true }
  )
);

/** Returns the saved view mode of one list page and a setter for it. */
export function useViewMode(page: ViewModePage) {
  const mode = useViewModeStore((s) => s.modes[page]);
  const setMode = useViewModeStore((s) => s.setMode);

  useEffect(() => {
    useViewModeStore.persist.rehydrate();
  }, []);

  return [mode, (next: ViewMode) => setMode(page, next)] as const;
}
