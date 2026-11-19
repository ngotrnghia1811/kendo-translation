// Unit VW115 (Q-A 3:93.5, accepted design row 3 in Q-A 3:94.2): the rules of "Previous page" and "Next page" as plain functions without React.
// The arrow key rules moved here from components/ReaderBook.tsx (unit RC5, round 72), so that the Reader dashboard page view /read/<book> and the
// Monitor page view /page/<book>/<page> use one copy. The components are in components/PageMoveLinks.tsx and components/ReaderBook.tsx.

/**
 * Arrow keys of the page views (unit RC5, round 72). Round 71 answer 1, owner words: "Add key-arrow for navigation".
 * The direction is a reading pending owner check: the Left arrow key opens the previous page and the Right arrow key opens the next page.
 * A Japanese book reads right to left on paper, so the owner may want the other direction. To flip it, swap the two values in this one line.
 */
export const PAGE_KEYS = { previous: "ArrowLeft", next: "ArrowRight" } as const;
export const KEY_NAME: Record<string, string> = { ArrowLeft: "Left arrow key", ArrowRight: "Right arrow key" };
/** Title of the Previous and Next links. It names the key, so a reader finds the key without a help page. */
export const PREVIOUS_TITLE = `Previous page (${KEY_NAME[PAGE_KEYS.previous]})`;
export const NEXT_TITLE = `Next page (${KEY_NAME[PAGE_KEYS.next]})`;

/** The part of an element that the key rule needs. A DOM element fits, and so does a plain object in a test. */
export interface KeyTarget {
  isContentEditable?: boolean;
  closest(selector: string): unknown;
}

/**
 * The controls that use the arrow keys themselves. A button does not count.
 * Unit VW117 (Q-A 3:96.6 row 5): the buttons ◀ ▶ that move a panel or a column count. After a keyboard move the focus stays on one of them,
 * and a Left or Right key there must not open another page. The other buttons (Previous page, Next page, the stage tabs) still let the keys through.
 */
const OWN_KEYS = "input, textarea, select, [role=slider], [role=separator], [role=tablist], [role=listbox], [role=menu], [data-panel-move], [data-column-move]";
const OWN_KEYS_NO_TABS = "input, textarea, select, [role=slider], [role=separator], [role=listbox], [role=menu], [data-panel-move], [data-column-move]";

/**
 * True when the focus sits in a control that uses the arrow keys itself (text box, range slider, list, menu, tabs, splitter, editable text).
 * `tabsOwnKeys` false: the tabs of the screen are plain buttons that do not handle the arrow keys (the stage tabs of the Monitor page view),
 * so the page keys still work while a tab has the focus. [unit default VW115]
 */
export function ownsArrowKeys(target: KeyTarget | EventTarget | null, tabsOwnKeys = true): boolean {
  const t = target as KeyTarget | null;
  if (!t || typeof t.closest !== "function") return false;
  return Boolean(t.isContentEditable) || Boolean(t.closest(tabsOwnKeys ? OWN_KEYS : OWN_KEYS_NO_TABS));
}

/** The part of a key event that the rule needs. */
export interface KeyLike {
  key: string;
  defaultPrevented?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  target?: KeyTarget | EventTarget | null;
}

/** The direction that a key event asks for, or null. A held key, a text composition and a key with a modifier do nothing. */
export function pageKeyDirection(e: KeyLike, tabsOwnKeys = true): "previous" | "next" | null {
  if (e.defaultPrevented || e.repeat || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return null;
  if (e.key !== PAGE_KEYS.previous && e.key !== PAGE_KEYS.next) return null;
  if (ownsArrowKeys(e.target ?? null, tabsOwnKeys)) return null;
  return e.key === PAGE_KEYS.previous ? "previous" : "next";
}

/** The number of a page name such as "p006". Null for any other text. */
export function pageNumber(name: string): number | null {
  const m = /^p(\d+)$/.exec(name);
  return m ? Number(m[1]) : null;
}

/**
 * The pages of a book that are candidates for "Previous page" or "Next page", nearest first. `numbers` is the list of page numbers of the book in any order.
 * The server then takes the first candidate that has at least one run, because a page with no run gives "not found" (Q-A 3:94.2 row 3).
 */
export function neighborCandidates(numbers: number[], current: number, direction: "previous" | "next"): number[] {
  const unique = [...new Set(numbers)];
  return direction === "previous" ? unique.filter((n) => n < current).sort((a, b) => b - a) : unique.filter((n) => n > current).sort((a, b) => a - b);
}

/** The first candidate that has a run, or null at the end of the book. */
export function pickNeighbor(numbers: number[], current: number, direction: "previous" | "next", hasRun: (n: number) => boolean): number | null {
  for (const n of neighborCandidates(numbers, current, direction)) if (hasRun(n)) return n;
  return null;
}
