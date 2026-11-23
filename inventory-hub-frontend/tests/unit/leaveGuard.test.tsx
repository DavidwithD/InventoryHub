import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmLeave, useLeaveGuard } from '@/lib/leaveGuard';

afterEach(() => vi.restoreAllMocks());

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
});
