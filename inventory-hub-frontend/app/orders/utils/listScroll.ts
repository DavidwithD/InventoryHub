// The orders list saves its scroll position when the user opens an order.
// The list restores it once on the next visit, after the orders load.
// AppLayout removes it when the user goes to a page outside the orders section.
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

/** Removes the saved position. Call it when the user goes to a page outside the orders section. */
export function clearOrdersListScroll(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Storage can be blocked. Nothing is saved then.
  }
}

/** Returns true for the orders list and the order pages. The saved position is kept only on these paths. */
export function isOrdersPath(pathname: string): boolean {
  return pathname === '/orders' || pathname.startsWith('/orders/');
}
