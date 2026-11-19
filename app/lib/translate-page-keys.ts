import { pageKeyDirection, type KeyLike } from "./page-move";

// Unit VW116 (Q-A 3:95.4 row a, Q-A 3:95.7): the Left and Right arrow keys in the page view of the human translation view /translate/<book>.
// The key rule is the one copy in lib/page-move.ts (unit RC5 and VW115). This file only turns a key event into a page number for that screen.
// It has no React, so a test can run it.

/**
 * The page that a key event asks for in the page view of /translate/<book>, or null when the key does nothing.
 * - `cur` is the page now and `pages` is the page count of the book. A move past the first or the last page does nothing, so the browser keeps its own key.
 * - `dialogOpen` is true while a pop-up (the term pop-up, the cog box of a pane) is open. The keys do nothing then, as on /read (unit RC5).
 * - The focus rules (text box, textarea, select, editable text, slider, splitter handle, list, menu) are the ones of pageKeyDirection.
 *   The translator writes in the textarea of a row, so the arrow keys must stay there.
 */
export function translateKeyTarget(e: KeyLike, cur: number, pages: number, dialogOpen: boolean): number | null {
  if (dialogOpen) return null;
  const direction = pageKeyDirection(e);
  if (!direction) return null;
  const to = direction === "previous" ? cur - 1 : cur + 1;
  return to < 1 || to > pages ? null : to;
}
