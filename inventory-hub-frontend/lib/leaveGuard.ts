'use client';

import { useEffect, useRef } from 'react';

// The question to ask before the user leaves the page. Null means leaving is safe.
// Only one page is open at a time, so one module-level value is enough.
let leaveMessage: string | null = null;

/**
 * Asks the user before an in-app navigation.
 * Returns true when leaving is safe or the user confirmed.
 * Links and menu items call it before they navigate.
 */
export function confirmLeave(): boolean {
  return leaveMessage === null || window.confirm(leaveMessage);
}

/**
 * Guards the page while message is not null.
 * It covers three ways to leave:
 * - in-app links and menu items that call confirmLeave;
 * - closing or reloading the tab, through beforeunload;
 * - the browser Back button.
 *
 * For the Back button, the hook adds one copy of the current history entry.
 * Back then lands on the same URL and fires popstate.
 * The hook asks the question there.
 * On cancel, it adds the copy again. On confirm, it goes back one more step.
 * When the guard turns off on the page, the hook removes the copy.
 */
export function useLeaveGuard(message: string | null): void {
  const active = message !== null;
  // URL of the copy on top of the history. Null when no copy is there.
  const copyUrl = useRef<string | null>(null);

  useEffect(() => {
    leaveMessage = message;
    return () => {
      leaveMessage = null;
    };
  }, [message]);

  useEffect(() => {
    if (!active) return;

    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const addCopy = () => {
      window.history.pushState(window.history.state, '', window.location.href);
      copyUrl.current = window.location.href;
    };

    const onPopState = () => {
      if (copyUrl.current === null) return;
      copyUrl.current = null;
      if (confirmLeave()) {
        window.removeEventListener('popstate', onPopState);
        window.history.back();
      } else {
        addCopy();
      }
    };

    if (copyUrl.current === null) addCopy();
    window.addEventListener('beforeunload', warn);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('popstate', onPopState);
    };
  }, [active]);

  // The guard turned off while the page is still open, for example after a save.
  // Remove the copy, so one Back press leaves the page again.
  // This effect body does not run on unmount, so it never undoes a navigation.
  useEffect(() => {
    if (active || copyUrl.current !== window.location.href) return;
    copyUrl.current = null;
    window.history.back();
  }, [active]);
}
