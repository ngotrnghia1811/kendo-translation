// Unit VW117 (Q-A 3:95.2 and 3:96.6): the order rules of the panels and of the page columns, as plain functions without React,
// so that scripts/vw117-test.mjs can test them. The drag and the buttons are in components/PanelDragBar.tsx. The store is in components/usePanelOrder.ts.
// Owner words (Q-A 3:95.2, 2026-11-19): "Also I should be able to drag each panel around to reorder them, and the should snap into place when I do so"
// Owner pick (Q-A 3:96.6, 2026-11-19 10:30 PST): "Also page columns". Reading stored by aki-main: every page section follows the same column order.
// Terms: drop marker = a colored bar that shows where a dragged panel lands. snap = the panel slides into its new place when you let go.

import { PAGE_COLUMNS, type Size } from "./panel-size";

/** The panels of the Monitor page view /page/<book>/<page>, in the old order from left to right. */
export const PAGE_PANEL_IDS = ["image", "text", "qa"] as const;
/** The 3 big panels of /translate/<book>, in the old order from left to right. */
export const TRANSLATE_PANEL_IDS = ["index", "pages", "tl3"] as const;
/** The columns of a page on /translate/<book>, in the old order of the header bar (HEADER_COLUMNS in components/HtvBook.tsx). */
export const COLUMN_IDS = ["ja", "agent", "own", "comments", "versions"] as const;
/** The columns that a read-only viewer (the reader role) does not see. */
export const WRITER_COLUMNS: readonly string[] = ["own", "comments", "versions"];

/** The storage key prefix of a saved order. The size keys of unit VW115 start with `vw115:size:`. */
export const ORDER_KEY_PREFIX = "vw117:order";
/** The storage key of the order of one group of panels on one screen. [unit default VW117] One key for each screen and group, like the keys of unit VW115. */
export const orderKey = (screen: string, what: string): string => `${ORDER_KEY_PREFIX}:${screen}:${what}`;
/** The window event that "Reset layout" sends, so that every hook of the screen reads the old values again. `detail.screen` names the screen. */
export const RESET_EVENT = "vw117:layout-reset";

/**
 * A stored value as a full order of `ids`. An id that the app does not know drops out, a repeat drops out,
 * and an id that the stored list lacks goes to the end, in the old order. A value that is not a list gives the old order.
 */
export function normalizeOrder(value: unknown, ids: readonly string[]): string[] {
  const known = new Set(ids);
  const out: string[] = [];
  if (Array.isArray(value)) {
    for (const v of value) if (typeof v === "string" && known.has(v) && !out.includes(v)) out.push(v);
  }
  for (const id of ids) if (!out.includes(id)) out.push(id);
  return out;
}

/** Read an order from the stored text. A missing or broken text gives the old order. */
export function parseOrder(text: string | null | undefined, ids: readonly string[]): string[] {
  if (!text) return [...ids];
  try {
    return normalizeOrder(JSON.parse(text), ids);
  } catch {
    return [...ids];
  }
}

/** The text that goes into storage. The old order gives null: the caller removes the key. */
export function serializeOrder(order: readonly string[], ids: readonly string[]): string | null {
  const full = normalizeOrder(order, ids);
  return full.every((id, i) => id === ids[i]) ? null : JSON.stringify(full);
}

/** A copy of the list after the item at `from` moves to the place `to` (the place that it has in the new list). A move outside the list changes nothing. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = [...list];
  if (from === to || from < 0 || to < 0 || from >= out.length || to >= out.length) return out;
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

/**
 * The full order after a move among the visible items. `visible` is the part of `order` that the screen draws (in the same order).
 * An item that the screen does not draw (the page image when it is off, a writer column for a reader) keeps its place in the full order.
 */
export function moveVisible(order: readonly string[], visible: readonly string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= visible.length || to >= visible.length) return [...order];
  const moved = moveItem(visible, from, to);
  const drawn = new Set(visible);
  let k = 0;
  return order.map((id) => (drawn.has(id) ? moved[k++] : id));
}

/** The place after a step of a ◀ or ▶ button, or null at the end of the row (the button is not drawn there). */
export function stepTarget(index: number, delta: -1 | 1, count: number): number | null {
  const to = index + delta;
  return index < 0 || to < 0 || to >= count ? null : to;
}

/** The part of an element rectangle that the drop rule needs. DOMRect fits. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const rightOf = (b: Box): number => b.left + b.width;
const bottomOf = (b: Box): number => b.top + b.height;

/**
 * The gap that a pointer at (x, y) points to, from 0 (before the first item) to boxes.length (after the last item).
 * `boxes` are in the order of the items. An item is "before the pointer" when it stands on a line above the pointer,
 * or on the line of the pointer with its middle left of the pointer. A row that wraps onto a second line works the same way.
 */
export function dropGap(boxes: readonly Box[], x: number, y: number): number {
  let gap = 0;
  for (const b of boxes) {
    const before = y > bottomOf(b) || (y >= b.top && x > b.left + b.width / 2);
    if (!before) break;
    gap++;
  }
  return gap;
}

/** The place that the dragged item has after a drop in `gap`. The item at `from` leaves its place first, so a gap after it counts one less. */
export const finalIndex = (from: number, gap: number): number => (gap > from ? gap - 1 : gap);

const sameLine = (a: Box, b: Box): boolean => a.top < bottomOf(b) && b.top < bottomOf(a);

/** Where the drop marker stands for a gap: the x position of the bar and the top and the height of the line that it marks. Null for no items. */
export function markerSpot(boxes: readonly Box[], gap: number): { x: number; top: number; height: number } | null {
  const n = boxes.length;
  if (n === 0) return null;
  const g = Math.min(n, Math.max(0, gap));
  if (g === n) {
    const last = boxes[n - 1];
    return { x: rightOf(last), top: last.top, height: last.height };
  }
  const next = boxes[g];
  if (g > 0 && sameLine(boxes[g - 1], next)) {
    const prev = boxes[g - 1];
    return { x: next.left >= rightOf(prev) ? (rightOf(prev) + next.left) / 2 : next.left, top: next.top, height: next.height };
  }
  return { x: next.left, top: next.top, height: next.height };
}

/** The storage keys that "Reset layout" of one screen removes: the order keys and the size keys of unit VW115 of that screen, and no other key. */
export function resetKeys(screen: string, keys: readonly string[]): string[] {
  const prefixes = [`vw115:size:${screen}:`, `${ORDER_KEY_PREFIX}:${screen}:`];
  return keys.filter((k) => prefixes.some((p) => k.startsWith(p)));
}

/** The side of a panel that faces the anchor panel (the panel that takes the free width). A border handle sits on that side. Null for the anchor itself. */
export function edgeToward(order: readonly string[], id: string, anchor: string): "left" | "right" | null {
  if (id === anchor) return null;
  const a = order.indexOf(anchor);
  const i = order.indexOf(id);
  if (a < 0 || i < 0) return null;
  return i < a ? "right" : "left";
}

/**
 * The grid columns of the Monitor page view in the order of the panels. With the old order this is the string of pageColumns in lib/panel-size.ts.
 * The text panel takes the rest, unless the reader gave it a width.
 */
export function pageGrid(order: readonly string[], sizes: { image?: Size; text?: Size; qa?: Size }): string {
  return order
    .map((id) => {
      if (id === "image") return `${sizes.image?.w ?? PAGE_COLUMNS.image}px`;
      if (id === "qa") return `${sizes.qa?.w ?? PAGE_COLUMNS.qa}px`;
      return sizes.text?.w !== undefined ? `${sizes.text.w}px` : "minmax(0,1fr)";
    })
    .join(" ");
}

/** The columns that the header bar and the page sections show, in the saved order. A read-only viewer does not see the writer columns. */
export function shownColumns(order: readonly string[], readOnly: boolean): string[] {
  return order.filter((id) => !readOnly || !WRITER_COLUMNS.includes(id));
}

/**
 * One block of a row (one sentence group) in a page section.
 *   texts  Japanese and Agent translation. Two columns next to each other stand side by side. A column alone has its own line.
 *   own    Your translation (the box, the agree tick, the copy button). `withComments`: the Comments button stands in its line, as in the old layout.
 *   comments  The Comments button and the comments, when Comments does not follow Your translation.
 * Version history is one box for the whole page section, not for a row, so it is not a block of a row. It stays above the rows. [unit default VW117]
 */
export type RowGroup = { kind: "texts"; ids: Array<"ja" | "agent"> } | { kind: "own"; withComments: boolean } | { kind: "comments" };

/** The blocks of a row, from the column order. With the old order: Japanese and Agent translation side by side, then Your translation with its Comments button. */
export function rowGroups(order: readonly string[], readOnly: boolean): RowGroup[] {
  const seq = shownColumns(order, readOnly).filter((id) => id === "ja" || id === "agent" || id === "own" || id === "comments");
  const out: RowGroup[] = [];
  for (let i = 0; i < seq.length; i++) {
    const id = seq[i];
    if (id === "ja" || id === "agent") {
      const next = seq[i + 1];
      if (next === "ja" || next === "agent") {
        out.push({ kind: "texts", ids: [id, next] });
        i++;
      } else out.push({ kind: "texts", ids: [id] });
    } else if (id === "own") {
      if (seq[i + 1] === "comments") {
        out.push({ kind: "own", withComments: true });
        i++;
      } else out.push({ kind: "own", withComments: false });
    } else out.push({ kind: "comments" });
  }
  return out;
}
