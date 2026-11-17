import { moved, pointHistory, type BoxMap, type MapPoint, type ModelValue } from "./vector-map-rules";

// VW107, Q-A 3:68.2 and 3:68.3. These rules do not change the VW106 measures or identity rule.
export type Axes = "program" | "model";
export type PointFilter = "all" | "moved" | "new";
export type WordPart = { kind: "same" | "added" | "removed"; text: string };

/** Word-level LCS. Keep the exact whitespace of each side in the result. */
export function wordDiff(start: string, end: string): { start: WordPart[]; end: WordPart[] } {
  const tokens = (s: string) => s.match(/\s*\S+\s*/g) ?? [];
  const a = tokens(start), b = tokens(end);
  const rows = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      rows[i][j] = a[i].trim() === b[j].trim() ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]);
    }
  }
  const left: WordPart[] = [], right: WordPart[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i].trim() === b[j].trim()) {
      left.push({ kind: "same", text: a[i++] });
      right.push({ kind: "same", text: b[j++] });
    } else if (i < a.length && (j === b.length || rows[i + 1][j] >= rows[i][j + 1])) {
      left.push({ kind: "removed", text: a[i++] });
    } else {
      right.push({ kind: "added", text: b[j++] });
    }
  }
  // A whitespace-only prompt point is unusual, but it must not lose its text.
  return { start: a.length ? left : [{ kind: "same", text: start }], end: b.length ? right : [{ kind: "same", text: end }] };
}

/** Start and end cover the whole stored lifetime, not just the slider version. */
export function pointEnds(map: BoxMap, id: string) {
  const { steps, removedIn } = pointHistory(map, id);
  if (!steps.length) return null;
  return { start: steps[0], end: steps[steps.length - 1], removedIn };
}

export const valuesOf = (p: MapPoint, axes: Axes): ModelValue | null => axes === "program" ? p : p.model;
export const previousOf = (p: MapPoint, axes: Axes): ModelValue | null => axes === "program" ? p.prev : p.modelPrev;

export function filterPoints(points: MapPoint[], filter: PointFilter, axes: Axes): MapPoint[] {
  return points.filter((p) => {
    const v = valuesOf(p, axes);
    return v !== null && (filter === "all" || (filter === "new" ? p.added : moved(v, previousOf(p, axes))));
  });
}

/** Rank moves by Euclidean distance in percentage points. Ties keep the point-number order. */
export function biggestMoves(points: MapPoint[], axes: Axes) {
  return points.flatMap((p) => {
    const v = valuesOf(p, axes), prev = previousOf(p, axes);
    if (!v || !prev || !moved(v, prev)) return [];
    const comp = v.comp - prev.comp, imp = v.imp - prev.imp;
    return [{ point: p, comp, imp, distance: Math.hypot(comp, imp) }];
  }).sort((a, b) => b.distance - a.distance || a.point.num.localeCompare(b.point.num, "en", { numeric: true })).slice(0, 10);
}

/** Exactly the first 80 Unicode characters, with no extra ellipsis in the text. */
export const hoverText = (text: string): string => Array.from(text).slice(0, 80).join("");

export interface ZoomBounds { x0: number; x1: number; y0: number; y1: number }
export interface PlotBox { left: number; top: number; width: number; height: number }

/** Convert a drag in plot pixels to ordered, clamped data bounds. Ignore tiny drags. */
export function zoomBox(a: { x: number; y: number }, b: { x: number; y: number }, plot: PlotBox, bounds: ZoomBounds): ZoomBounds | null {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const x = (v: number) => bounds.x0 + clamp((v - plot.left) / plot.width) * (bounds.x1 - bounds.x0);
  const y = (v: number) => bounds.y1 - clamp((v - plot.top) / plot.height) * (bounds.y1 - bounds.y0);
  const x0 = Math.min(x(a.x), x(b.x)), x1 = Math.max(x(a.x), x(b.x));
  const y0 = Math.min(y(a.y), y(b.y)), y1 = Math.max(y(a.y), y(b.y));
  if (Math.abs(a.x - b.x) < 8 || Math.abs(a.y - b.y) < 8 || x1 <= x0 || y1 <= y0) return null;
  return { x0, x1, y0, y1 };
}

/** Show the lower-left 80% of points, with 10% headroom. */
export function crowdedCorner(points: MapPoint[], axes: Axes, full: ZoomBounds): ZoomBounds {
  const values = points.flatMap((p) => valuesOf(p, axes) ?? []);
  const upper = (key: "comp" | "imp", max: number) => {
    const sorted = values.map((p) => p[key]).sort((a, b) => a - b);
    return Math.min(max, Math.max(1, (sorted[Math.max(0, Math.ceil(sorted.length * 0.8) - 1)] ?? max) * 1.1));
  };
  return { x0: 0, y0: 0, x1: upper("comp", full.x1), y1: upper("imp", full.y1) };
}

/** The exact point range in the whole prompt, including its continuation lines. */
export function promptRange(text: string, num: string): { before: string; point: string; after: string } | null {
  const re = /^\s*(\d+(?:\.\d+)*)\.\s/gm;
  const starts = [...text.matchAll(re)];
  const i = starts.findIndex((m) => m[1] === num);
  if (i < 0) return null;
  const from = starts[i].index!, to = starts[i + 1]?.index ?? text.length;
  return { before: text.slice(0, from), point: text.slice(from, to), after: text.slice(to) };
}
