import type { Theme } from '@mui/material';

/** Background color of the main content area in AppLayout. */
export const PAGE_BACKGROUND = 'grey.100';

/**
 * Sticky position just under the fixed app bar of AppLayout.
 * The app bar uses a default Toolbar. Its height comes from theme.mixins.toolbar.
 * The offset copies that height for each screen size.
 */
export function stickyBelowAppBar(theme: Theme) {
  return {
    position: 'sticky',
    ...toolbarHeightAsTop(theme.mixins.toolbar as Record<string, unknown>),
  };
}

/**
 * Copies each minHeight of the toolbar mixin to `top`.
 * Media queries can be nested. The default mixin nests a landscape rule in the xs query.
 */
export function toolbarHeightAsTop(mixin: Record<string, unknown>): Record<string, unknown> {
  const style: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(mixin)) {
    if (key === 'minHeight') style.top = value;
    else if (key.startsWith('@media') && value && typeof value === 'object') {
      style[key] = toolbarHeightAsTop(value as Record<string, unknown>);
    }
  }
  return style;
}
