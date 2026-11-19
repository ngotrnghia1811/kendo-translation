// Unit VW115 (Q-A 3:93.5, accepted design row 6 in Q-A 3:94.2): the rules of the Loading pop-up as plain functions without React.
// "One small box at the top center, 'Loading…' with a turning circle. It shows on every screen when a page change or a slow load takes more than 0.15 seconds,
// so fast moves show nothing." The component is components/LoadingPopup.tsx.

/** The pop-up shows after this time. A move that ends sooner shows nothing. */
export const LOADING_DELAY_MS = 150;

/** A safety stop: a move that never ends (a link to the same address, an error) stops the pop-up after this time. [unit default VW115] */
export const LOADING_GIVE_UP_MS = 30000;

/** Name of the browser event that a code-driven move (an arrow key, a select) sends before it asks the router to move. */
export const NAVIGATE_EVENT = "vw115:navigate";

/** The pop-up is visible when a move runs and the time since its start is more than the delay. */
export function popupVisible(moving: boolean, elapsedMs: number): boolean {
  return moving && elapsedMs >= LOADING_DELAY_MS;
}

/** The part of a click event that the rule needs. */
export interface ClickLike {
  button?: number;
  defaultPrevented?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

/** The part of a link that the rule needs. `href` is the full address that the browser resolved. */
export interface LinkLike {
  href: string;
  target?: string;
  download?: boolean;
}

/**
 * True when a click starts a move to another address of this site, so that the pop-up can wait for it.
 * The router link calls preventDefault for its own moves, so a click that the router did not take (`defaultPrevented` false) does not count:
 * the browser loads that page itself and shows its own load mark. A click to the same address, a new tab, a download and a click with a key do not count.
 */
export function startsMove(click: ClickLike, link: LinkLike | null, here: { origin: string; href: string }): boolean {
  if (!link || !click.defaultPrevented) return false;
  if (click.button !== undefined && click.button !== 0) return false;
  if (click.altKey || click.ctrlKey || click.metaKey || click.shiftKey) return false;
  if (link.download || (link.target && link.target !== "_self")) return false;
  let to: URL;
  try {
    to = new URL(link.href);
  } catch {
    return false;
  }
  if (to.origin !== here.origin) return false;
  const from = new URL(here.href);
  // A link to another place of the same page (the anchor only) is not a move.
  if (to.pathname === from.pathname && to.search === from.search) return false;
  return true;
}

/**
 * Tell the Loading pop-up that a code-driven move starts (an arrow key, a select, a slider). Call it right before `router.push`.
 * A click on a router link needs no call: components/NavigationLoading.tsx sees the click itself.
 */
export function markNavigating(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(NAVIGATE_EVENT));
}
