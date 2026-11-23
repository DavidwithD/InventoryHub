/** The parts of a mouse event that openOnClick reads. */
interface ClickKeys {
  metaKey: boolean;
  ctrlKey: boolean;
}

/**
 * Opens a page from a click on a whole row or card.
 * It does nothing when the user has selected text. The click then ends a text selection.
 * A Cmd or Ctrl click opens the page in a new tab.
 * Any other click calls push.
 */
export function openOnClick(e: ClickKeys, href: string, push: (href: string) => void): void {
  if (window.getSelection()?.toString()) return;
  if (e.metaKey || e.ctrlKey) {
    window.open(href, '_blank', 'noopener');
    return;
  }
  push(href);
}
