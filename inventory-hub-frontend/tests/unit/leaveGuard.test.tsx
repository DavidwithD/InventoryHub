import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmLeave, leaveTo, useLeaveGuard } from '@/lib/leaveGuard';

let page = 0;

// Each test starts on a new URL with an earlier history entry.
// A copy left by an earlier test is then not on top.
beforeEach(() => {
  page += 1;
  window.history.pushState(null, '', `/orders/${page}`);
});

afterEach(() => vi.restoreAllMocks());

function fakeRouter() {
  return { push: vi.fn(), replace: vi.fn() };
}

describe('useLeaveGuard', () => {
  it('lets the user leave without a question when nothing is pending', () => {
    const confirm = vi.spyOn(window, 'confirm');
    renderHook(() => useLeaveGuard(null));

    expect(confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before leaving while a message is set, and stops after unmount', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { unmount } = renderHook(() => useLeaveGuard('unsaved'));

    expect(confirmLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledWith('unsaved');

    unmount();
    expect(confirmLeave()).toBe(true);
  });

  it('keeps the page on Back when the user cancels', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const pushState = vi.spyOn(window.history, 'pushState');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useLeaveGuard('unsaved'));
    expect(pushState).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(pushState).toHaveBeenCalledTimes(2);
    expect(back).not.toHaveBeenCalled();
  });

  it('goes back one more step on Back when the user confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useLeaveGuard('unsaved'));

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('removes its history copy when the guard turns off on the page', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const { rerender } = renderHook(({ message }) => useLeaveGuard(message), {
      initialProps: { message: 'unsaved' as string | null },
    });

    rerender({ message: null });

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('adds no copy in a tab with no earlier history entry', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    const pushState = vi.spyOn(window.history, 'pushState');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const { rerender } = renderHook(({ message }) => useLeaveGuard(message), {
      initialProps: { message: 'unsaved' as string | null },
    });

    expect(pushState).not.toHaveBeenCalled();
    rerender({ message: null });
    expect(back).not.toHaveBeenCalled();
  });

  it('asks nothing when Back skips past the page', () => {
    const confirm = vi.spyOn(window, 'confirm');
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useLeaveGuard('unsaved'));
    const pushState = vi.spyOn(window.history, 'pushState');

    // The browser moved to another page before popstate fires.
    window.history.replaceState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(confirm).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
  });
});

describe('leaveTo', () => {
  it('replaces the history copy when the user confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderHook(() => useLeaveGuard('unsaved'));
    const router = fakeRouter();

    expect(leaveTo('/orders', router)).toBe(true);

    expect(router.replace).toHaveBeenCalledWith('/orders');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('stays on the page when the user cancels', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderHook(() => useLeaveGuard('unsaved'));
    const router = fakeRouter();

    expect(leaveTo('/orders', router)).toBe(false);

    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('pushes the new page when there is no guard', () => {
    const confirm = vi.spyOn(window, 'confirm');
    renderHook(() => useLeaveGuard(null));
    const router = fakeRouter();

    expect(leaveTo('/orders', router)).toBe(true);

    expect(router.push).toHaveBeenCalledWith('/orders');
    expect(router.replace).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });
});
