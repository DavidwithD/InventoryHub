'use client';

import { useEffect } from 'react';

// The question to ask before the user leaves the page. Null means leaving is safe.
// Only one page is open at a time, so one module-level value is enough.
let leaveMessage: string | null = null;

// URL of the history copy that the guard added. Null when there is no copy.
// The copy is on top of the history while this URL is the current URL.
let copyUrl: string | null = null;

function copyOnTop(): boolean {
  return copyUrl !== null && copyUrl === window.location.href;
}

/** The router methods that leaveTo uses. useRouter() from next/navigation has both. */
interface LeaveRouter {
  push: (href: string) => void;
  replace: (href: string) => void;
}

/**
 * Asks the user before an in-app navigation.
 * Returns true when leaving is safe or the user confirmed.
 */
export function confirmLeave(): boolean {
  return leaveMessage === null || window.confirm(leaveMessage);
}

/**
 * Leaves the page through the app router. It asks first with confirmLeave.
 * Every in-app link or menu item that leaves a guarded page must use it.
 *
 * When the guard's history copy is on top, the new page replaces the copy.
 * Then one Back press from the new page returns to the guarded page.
 * Returns false when the user chose to stay.
 */
export function leaveTo(href: string, router: LeaveRouter): boolean {
  if (!confirmLeave()) return false;
  if (copyOnTop()) {
    copyUrl = null;
    router.replace(href);
  } else {
    router.push(href);
  }
  return true;
}

/**
 * Guards the page while message is not null.
 * It covers three ways to leave:
 * - in-app links and menu items that call leaveTo;
 * - closing or reloading the tab, through beforeunload;
 * - the browser Back button.
 *
 * For the Back button, the hook adds one copy of the current history entry.
 * Back then lands on the same URL and fires popstate.
 * The hook asks the question there.
 * On cancel, it adds the copy again. On confirm, it goes back one more step.
 * When the guard turns off on the page, the hook removes the copy.
 *
 * A tab with no earlier history entry gets no copy.
 * Back has nowhere to go in that tab.
 */
export function useLeaveGuard(message: string | null): void {
  const active = message !== null;

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
      copyUrl = window.location.href;
    };

    const onPopState = () => {
      if (copyUrl === null) return;
      const onPage = window.location.href === copyUrl;
      copyUrl = null;
      // Back skipped past the page, for example from the long-press Back menu.
      // The router already shows the other page. The guard lets it stay.
      if (!onPage) {
        window.removeEventListener('popstate', onPopState);
        return;
      }
      if (confirmLeave()) {
        window.removeEventListener('popstate', onPopState);
        window.history.back();
      } else {
        addCopy();
      }
    };

    // React Strict Mode runs this effect twice. The check keeps it to one copy.
    if (!copyOnTop() && window.history.length > 1) addCopy();
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
    if (active || !copyOnTop()) return;
    copyUrl = null;
    window.history.back();
  }, [active]);
}
