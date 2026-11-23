// The orders list saves its scroll position when the user opens an order.
// The list restores it once on the next visit, after the orders load.
// sessionStorage keeps the value for this browser tab only.

const KEY = 'orders-list-scroll';

/** Saves the current window scroll position. Call it before opening an order. */
export function saveOrdersListScroll(): void {
  try {
    sessionStorage.setItem(KEY, String(window.scrollY));
  } catch {
    // Storage can be blocked. The list then opens at the top.
  }
}

/** Returns the saved position and removes it. Returns null when nothing is saved. */
export function takeOrdersListScroll(): number | null {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const y = Number(value);
    return value !== null && Number.isFinite(y) && y > 0 ? y : null;
  } catch {
    return null;
  }
}
