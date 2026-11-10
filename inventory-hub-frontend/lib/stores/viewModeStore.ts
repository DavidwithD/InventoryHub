'use client';

import { useEffect, useState } from 'react';
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

/**
 * Returns the saved view mode of one list page, a setter for it and a `hydrated` flag.
 * `hydrated` is false until the saved value has loaded.
 * Render the list only when it is true. Otherwise a saved card view first shows the table.
 */
export function useViewMode(page: ViewModePage) {
  const mode = useViewModeStore((s) => s.modes[page]);
  const setMode = useViewModeStore((s) => s.setMode);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsubscribe = useViewModeStore.persist.onFinishHydration(() => setHydrated(true));
    useViewModeStore.persist.rehydrate();
    return unsubscribe;
  }, []);

  return [mode, (next: ViewMode) => setMode(page, next), hydrated] as const;
}
