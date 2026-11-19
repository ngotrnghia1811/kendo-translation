// Unit VW115 (Q-A 3:93.5, accepted design rows 1, 2 and 4 in Q-A 3:94.2): the size rules of the resizable panels, as plain functions without React,
// so that scripts/vw115-test.mjs can test them. The handle components are in components/PanelResize.tsx.
// Term: handle = a thin bar on a panel edge that you drag (Q-A 3:94.2).

/** A panel size in px. A missing key means "the old size" (the size that the layout gives the panel). */
export interface Size {
  w?: number;
  h?: number;
}

/** The limits of a panel size in px. */
export interface SizeLimits {
  w: { min: number; max: number };
  h: { min: number; max: number };
}

/**
 * Limits of a size in px. [unit default VW115] The Monitor page view uses these. The Reader and translate panels keep their own width range (PANEL_WIDTH, TL3_WIDTH, INDEX_WIDTH).
 * The height limit is high on purpose: the text panel of a long page is 5000 px tall or more, and a drag must not snap it to the limit at the first move.
 */
export const SIZE_LIMITS: SizeLimits = { w: { min: 200, max: 1200 }, h: { min: 120, max: 20000 } };

/** The step of an arrow key on a focused handle, in px. The old width handle (DragHandle in components/HtvPanelFrame.tsx) uses the same step. */
export const KEY_STEP = 16;

/** The panel layout rows start at this screen width (Tailwind lg, 1024 px). Below it the panels stand one under the other and have no handles (Q-A 3:94.2 row 7). [unit default VW115] */
export const STACK_BELOW_PX = 1024;

/** Round a value and keep it between min and max. */
export const clampTo = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, Math.round(value)));

/** The storage key of the size of one panel on one screen. One set of keys for each screen (Q-A 3:94.2 row 2). */
export const sizeKey = (screen: string, panel: string): string => `vw115:size:${screen}:${panel}`;

/** Read a size from the stored text. A missing, broken or out of range value gives no size for that part, so the old size shows. */
export function parseSize(text: string | null | undefined, limits: SizeLimits = SIZE_LIMITS): Size {
  if (!text) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {};
  }
  if (typeof raw !== "object" || raw === null) return {};
  const out: Size = {};
  const r = raw as Record<string, unknown>;
  if (typeof r.w === "number" && Number.isFinite(r.w)) out.w = clampTo(r.w, limits.w.min, limits.w.max);
  if (typeof r.h === "number" && Number.isFinite(r.h)) out.h = clampTo(r.h, limits.h.min, limits.h.max);
  return out;
}

/** The text that goes into storage. An empty size gives null: the caller removes the key. */
export function serializeSize(size: Size): string | null {
  const out: Size = {};
  if (size.w !== undefined) out.w = size.w;
  if (size.h !== undefined) out.h = size.h;
  return out.w === undefined && out.h === undefined ? null : JSON.stringify(out);
}

/** Merge a change into a size. A value of null removes that part (the old size comes back). */
export function mergeSize(size: Size, patch: { w?: number | null; h?: number | null }): Size {
  const out: Size = { ...size };
  if (patch.w !== undefined) {
    if (patch.w === null) delete out.w;
    else out.w = patch.w;
  }
  if (patch.h !== undefined) {
    if (patch.h === null) delete out.h;
    else out.h = patch.h;
  }
  return out;
}

/** The new size after a drag. `start` is the size at the start of the drag, `dx` and `dy` the move of the pointer in px. */
export function dragSize(start: { w: number; h: number }, dx: number, dy: number, limits: SizeLimits = SIZE_LIMITS): { w: number; h: number } {
  return { w: clampTo(start.w + dx, limits.w.min, limits.w.max), h: clampTo(start.h + dy, limits.h.min, limits.h.max) };
}

/**
 * What an arrow key does on a focused corner handle: Right and Left change the width, Down and Up change the height, Home sets the old size again.
 * Returns null for any other key, so the caller leaves the key alone.
 */
export function cornerKey(key: string): { dw: number; dh: number; reset: boolean } | null {
  if (key === "ArrowRight") return { dw: KEY_STEP, dh: 0, reset: false };
  if (key === "ArrowLeft") return { dw: -KEY_STEP, dh: 0, reset: false };
  if (key === "ArrowDown") return { dw: 0, dh: KEY_STEP, reset: false };
  if (key === "ArrowUp") return { dw: 0, dh: -KEY_STEP, reset: false };
  if (key === "Home") return { dw: 0, dh: 0, reset: true };
  return null;
}

/**
 * What an arrow key does on a focused border handle. `side` is the edge of the panel that holds the handle: a drag away from the panel makes it wider.
 * Returns the change of the width in px, "reset" for Home, or null for any other key.
 */
export function edgeKey(key: string, side: "left" | "right"): number | "reset" | null {
  if (key === "Home") return "reset";
  const wider = side === "left" ? "ArrowLeft" : "ArrowRight";
  const narrower = side === "left" ? "ArrowRight" : "ArrowLeft";
  if (key === wider) return KEY_STEP;
  if (key === narrower) return -KEY_STEP;
  return null;
}

/**
 * The grid columns of the Monitor page view from the stored sizes. The image panel and the right panel have a width of their own (old sizes 300 and 340 px).
 * The text panel takes the rest, unless the reader gave it a width. Used from the lg width on (the panels stack below it).
 */
export const PAGE_COLUMNS = { image: 300, qa: 340 } as const;
export function pageColumns(showImage: boolean, sizes: { image?: Size; text?: Size; qa?: Size }): string {
  const cols: string[] = [];
  if (showImage) cols.push(`${sizes.image?.w ?? PAGE_COLUMNS.image}px`);
  cols.push(sizes.text?.w !== undefined ? `${sizes.text.w}px` : "minmax(0,1fr)");
  cols.push(`${sizes.qa?.w ?? PAGE_COLUMNS.qa}px`);
  return cols.join(" ");
}
