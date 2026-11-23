import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Each test sets the current route here before it renders the layout.
let pathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import AppLayout from '@/components/layout/AppLayout';
import { saveOrdersListScroll, takeOrdersListScroll } from '@/app/orders/utils/listScroll';

function renderAt(path: string) {
  pathname = path;
  return render(
    <AppLayout>
      <div />
    </AppLayout>
  );
}

function saveScroll(y: number) {
  window.scrollY = y;
  saveOrdersListScroll();
  window.scrollY = 0;
}

describe('AppLayout and the orders list scroll', () => {
  beforeEach(() => sessionStorage.clear());

  it('keeps the saved scroll on an order page', () => {
    saveScroll(800);
    renderAt('/orders/42');

    expect(takeOrdersListScroll()).toBe(800);
  });

  it('keeps the saved scroll on the orders list', () => {
    saveScroll(800);
    renderAt('/orders');

    expect(takeOrdersListScroll()).toBe(800);
  });

  it('clears the saved scroll when the route leaves the orders section', () => {
    saveScroll(800);
    const { rerender } = renderAt('/orders/42');

    pathname = '/products';
    rerender(
      <AppLayout>
        <div />
      </AppLayout>
    );

    expect(takeOrdersListScroll()).toBeNull();
  });
});
