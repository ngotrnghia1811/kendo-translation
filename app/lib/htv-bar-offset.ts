// Unit VW113 (Q-A 3:81.2 row 4): the page heading must not hide under the sticky bar of column buttons on the book screen /translate/<book>.
// Cause: every page section and chapter heading had a fixed scroll-margin-top of 3.5 rem (Tailwind scroll-mt-14). The bar takes one line at 1280 px (about 36 px)
// but three lines at 390 px (about 90 px), so a jump to a page ended with the heading under the bar.
// Rule: the bar writes its own height into the custom property below on the element that holds the sections. Every jump target reads it.
// The browser uses scroll-margin-top for #p045 links, for scrollIntoView and for the index links, so one rule covers all of them.

/** The custom property that the sticky bar sets. */
export const BAR_VAR = "--htv-bar-h";
/** Before the bar measures itself (the server draw, one line of the bar). */
export const BAR_FALLBACK = "3.5rem";
/** A small gap between the bar and the heading, in px. */
export const BAR_GAP_PX = 4;

/** The scroll-margin-top value of a jump target. */
export function barOffsetCss(): string {
  return `calc(var(${BAR_VAR}, ${BAR_FALLBACK}) + ${BAR_GAP_PX}px)`;
}

/** The value that the bar writes: its height in whole pixels, rounded up. A bar that is not drawn gives 0 px, which falls back to the old value. */
export function barHeightValue(heightPx: number): string | null {
  if (!Number.isFinite(heightPx) || heightPx <= 0) return null;
  return `${Math.ceil(heightPx)}px`;
}
