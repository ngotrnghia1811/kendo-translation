// Unit VW106: the vector map of the prompt points. Pure rules, no file read, so scripts/vw106-test.mjs can import them.
// Owner words (Q-A 3:62.4, 2026-11-15): "hard add a point in the map, soft move the value of a current point on the map."
// Owner definitions (Q-A 3:63.3, 2026-11-16): "Importance should be how much the point is emphasize the prompt instruction.
// Comprehensiveness should be how detailed the point is described in the prompt instruction."
// Owner pick Q-A 3:64.4 "Both, side by side": program counts (this file) next to a model score (score files of point_scores.py).
// Owner pick Q-A 3:64.5 "Accept all rows": 16 maps, identity by number then by text, scatter chart, slider, arrows, rings, click details.

/** One numbered instruction of a prompt version. */
export interface PromptPoint {
  /** The point number as written, for example "2.4". */
  num: string;
  /** The point line plus the following lines up to the next point line, each line trimmed, joined with single spaces. */
  text: string;
}

/** The program counts of one point (Q-A 3:64.4). Values are percent of the whole prompt. */
export interface PointValues extends PromptPoint {
  /** Characters of the point text / characters of the whole prompt text, in percent. */
  comp: number;
  /** Emphasis marks of the point / sum of the emphasis marks of all points, in percent. 0 when the sum is 0. */
  imp: number;
  /** Citations of this point by other points plus strong words in the point plus its direct sub-points (Q-A 3:81.4). */
  marks: number;
}

// Q-A 3:64.4 program counts: a point starts at a line that matches this regex ("2." and "2.4." are both points).
const POINT_LINE = /^\s*(\d+(?:\.\d+)*)\.\s/;
// Q-A 3:64.4: a citation is "point 2.4" or "points 2.4" in the text of another point.
const CITATION = /points? (\d+\.\d+)/g;
// Q-A 3:64.4: strong words, case-insensitive. Sub-points: Q-A 3:81.4 (see SUB_POINT_MODE).
const STRONG = /\b(must|never|always|only|do not|every)\b/gi;

/** Split a prompt text into its numbered points. Text before the first point line belongs to no point. */
export function parsePoints(text: string): PromptPoint[] {
  const out: { num: string; lines: string[] }[] = [];
  for (const line of text.split("\n")) {
    const m = POINT_LINE.exec(line);
    if (m) out.push({ num: m[1], lines: [line.trim()] });
    else if (out.length > 0) out[out.length - 1].lines.push(line.trim());
  }
  return out.map((p) => ({ num: p.num, text: p.lines.filter((l) => l !== "").join(" ") }));
}

/**
 * Unit VW113, owner pick Q-A 3:81.4 "Add sub-points": each numbered sub-point under a point counts as one emphasis mark of that point.
 * "none" is the rule of VW106 (citations and strong words only), kept for the measurement of check c6.
 * "direct" counts the sub-points one level below: 2.4.1 and 2.4.2 for point 2.4, and 2.1 to 2.9 for point 2.
 * "deep" counts every sub-point below, to the fourth level (2.4.1.1 also counts for 2.4).
 */
export type SubPointMode = "none" | "direct" | "deep";
/** Unit default VW113: the direct sub-points (see report.md, c6: "deep" is not higher by 0.02). */
export const SUB_POINT_MODE: SubPointMode = "direct";

/** The sub-point count of each point number. A point with no sub-point has no entry. */
export function subPointCounts(points: PromptPoint[], mode: SubPointMode = SUB_POINT_MODE): Map<string, number> {
  const out = new Map<string, number>();
  if (mode === "none") return out;
  for (const p of points) {
    const parts = p.num.split(".");
    // direct: the parent only (all parts but the last). deep: every ancestor that has at least one part.
    if (parts.length < 2) continue; // a top-level point has no parent
    const from = mode === "direct" ? parts.length - 1 : 1;
    for (let k = parts.length - 1; k >= from; k--) {
      const parent = parts.slice(0, k).join(".");
      out.set(parent, (out.get(parent) ?? 0) + 1);
    }
  }
  return out;
}

/** The emphasis marks of each point, in the order of `points`: citations by other points, strong words, and sub-points (Q-A 3:64.4, 3:81.4). */
export function emphasisMarks(points: PromptPoint[], mode: SubPointMode = SUB_POINT_MODE): number[] {
  const cited = new Map<string, number>();
  points.forEach((p) => {
    for (const m of p.text.matchAll(CITATION)) {
      // A point does not cite itself.
      if (m[1] !== p.num) cited.set(m[1], (cited.get(m[1]) ?? 0) + 1);
    }
  });
  const subs = subPointCounts(points, mode);
  return points.map((p) => (cited.get(p.num) ?? 0) + (p.text.match(STRONG)?.length ?? 0) + (subs.get(p.num) ?? 0));
}

/** The program counts of every point of a prompt text (Q-A 3:64.4, 3:81.4). */
export function pointValues(text: string): PointValues[] {
  const points = parsePoints(text);
  const total = text.length;
  const marks = emphasisMarks(points);
  const sum = marks.reduce((a, b) => a + b, 0);
  return points.map((p, i) => ({
    ...p,
    comp: total > 0 ? (p.text.length / total) * 100 : 0,
    imp: sum > 0 ? (marks[i] / sum) * 100 : 0,
    marks: marks[i],
  }));
}

/** One decimal, as the screen and check c6 show it. */
export const oneDecimal = (v: number): string => (Math.round(v * 10) / 10).toFixed(1);

// ---------------------------------------------------------------- identity of a point between a version and its parent

/** Unit default: two texts are the same point at a similarity of 0.5 or more. */
export const SAME_POINT_RATIO = 0.5;

const words = (t: string): string[] => t.toLowerCase().split(/\s+/).filter(Boolean);

/** The point text without its number, so a renumbered point with the same words counts as the same text. */
export const pointBody = (t: string): string => t.replace(POINT_LINE, "");

/**
 * Similarity of two texts from 0 to 1: 2 * (words in the longest common subsequence) / (words of both texts).
 * The same formula as the ratio of Python difflib, on words. The point number at the start does not count.
 */
export function similarity(a: string, b: string): number {
  const x = words(pointBody(a));
  const y = words(pointBody(b));
  if (x.length + y.length === 0) return 1;
  if (x.length === 0 || y.length === 0) return 0;
  let prev = new Uint32Array(y.length + 1);
  let cur = new Uint32Array(y.length + 1);
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) cur[j] = x[i - 1] === y[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    [prev, cur] = [cur, prev];
  }
  return (2 * prev[y.length]) / (x.length + y.length);
}

/** The match of each child point to a parent point (index), or -1 for a new point. Each parent point is used once. */
export interface PointMatch {
  parentOf: number[];
  /** Indexes of the parent points without a match: removed points. */
  removed: number[];
}

/**
 * Q-A 3:64.5 row 2: "A point keeps its identity across versions by its number. If an inserted point shifts the numbers,
 * the program matches the most similar text." Unit default: same number and similarity 0.5 or more first. Then the most similar
 * free parent point at 0.5 or more (the best pairs first). Else the point is new (a hard add).
 */
export function matchPoints(parent: PromptPoint[], child: PromptPoint[], minRatio = SAME_POINT_RATIO): PointMatch {
  const parentOf = child.map(() => -1);
  const used = new Set<number>();
  const byNum = new Map(parent.map((p, i) => [p.num, i]));
  child.forEach((c, ci) => {
    const pi = byNum.get(c.num);
    if (pi === undefined || used.has(pi)) return;
    if (pointBody(parent[pi].text) === pointBody(c.text) || similarity(parent[pi].text, c.text) >= minRatio) {
      parentOf[ci] = pi;
      used.add(pi);
    }
  });
  const pairs: { ci: number; pi: number; r: number }[] = [];
  child.forEach((c, ci) => {
    if (parentOf[ci] !== -1) return;
    parent.forEach((p, pi) => {
      if (used.has(pi)) return;
      const r = pointBody(p.text) === pointBody(c.text) ? 1 : similarity(p.text, c.text);
      if (r >= minRatio) pairs.push({ ci, pi, r });
    });
  });
  pairs.sort((a, b) => b.r - a.r || a.ci - b.ci || a.pi - b.pi);
  for (const { ci, pi } of pairs) {
    if (parentOf[ci] !== -1 || used.has(pi)) continue;
    parentOf[ci] = pi;
    used.add(pi);
  }
  return { parentOf, removed: parent.map((_, i) => i).filter((i) => !used.has(i)) };
}

// ---------------------------------------------------------------- order of the versions

/** Natural order of version labels: v2.1.9 before v2.1.10. */
export function compareVersions(a: string, b: string): number {
  const x = a.replace(/^v/, "").split(".").map(Number);
  const y = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d !== 0 && !Number.isNaN(d)) return d;
  }
  return a.localeCompare(b);
}

/**
 * Unit default: follow the parent chain from the first version (the version without a parent).
 * If the chain breaks (no single first version, a fork, a missing parent, a version off the chain), the natural sort of the labels is used.
 */
export function orderVersions(items: { version: string; parent: string | null }[]): { order: string[]; fallback: boolean } {
  const natural = items.map((i) => i.version).sort(compareVersions);
  const roots = items.filter((i) => !i.parent);
  const kids = new Map<string, string[]>();
  for (const i of items) if (i.parent) kids.set(i.parent, [...(kids.get(i.parent) ?? []), i.version]);
  if (roots.length !== 1) return { order: natural, fallback: items.length > 0 };
  const order = [roots[0].version];
  const seen = new Set(order);
  for (;;) {
    const next = kids.get(order[order.length - 1]) ?? [];
    if (next.length === 0) break;
    if (next.length > 1 || seen.has(next[0])) return { order: natural, fallback: true };
    order.push(next[0]);
    seen.add(next[0]);
  }
  if (order.length !== items.length) return { order: natural, fallback: true };
  return { order, fallback: false };
}

// ---------------------------------------------------------------- the map of one box type

/** One mark of the prompt audit (audit.marks of a version file). */
export interface AuditMark {
  group_id: string;
  mark: string;
  covering_quote: string;
}

/** The fields of one version file that the map needs. */
export interface VersionInput {
  version: string;
  parent: string | null;
  sha1: string;
  text: string;
  created_utc: string | null;
  update_point: string | null;
  group_ids: string[];
  critique_ids: string[];
  marks: AuditMark[];
}

/** A model score of one point (score file of point_scores.py, Q-A 3:65.6). Percent of the whole prompt. */
export interface ModelValue {
  comp: number;
  imp: number;
}

/** One point in one version of the map. */
export interface MapPoint {
  /** Identity across versions: "<first version>#<number in that version>". */
  id: string;
  num: string;
  text: string;
  comp: number;
  imp: number;
  /** The values in the parent version, when the point existed there. */
  prev: { comp: number; imp: number; num: string } | null;
  /** True for a point without a match in the parent (a hard add). Never true in the first version. */
  added: boolean;
  /** True when the text differs from the parent text (the point number does not count). */
  changed: boolean;
  /** Model score values, or null (Not measured). */
  model: ModelValue | null;
  modelPrev: ModelValue | null;
}

export interface MapVersion {
  version: string;
  /** Exact prompt text for the start/end whole-prompt view (VW107). */
  text: string;
  parent: string | null;
  created_utc: string | null;
  update_point: string | null;
  chars: number;
  marksSum: number;
  groupCount: number;
  critiqueCount: number;
  auditMarks: AuditMark[];
  points: MapPoint[];
  /** Points of the parent without a match here. */
  removed: { id: string; num: string; text: string }[];
  /** True when a model score file exists for this version. */
  measured: boolean;
}

export interface BoxMap {
  box: string;
  versions: MapVersion[];
  /** True when the parent chain broke and the natural sort gave the order. */
  fallback: boolean;
  /** The largest value of the box on each axis, so the chart keeps one scale for all versions. */
  max: { comp: number; imp: number; modelComp: number; modelImp: number };
}

/** Unit default: an arrow shows a move of at least 0.1 percentage points on one axis. */
export const MOVE_MIN = 0.1;

export function moved(a: { comp: number; imp: number }, b: { comp: number; imp: number } | null): boolean {
  if (!b) return false;
  return Math.abs(a.comp - b.comp) >= MOVE_MIN || Math.abs(a.imp - b.imp) >= MOVE_MIN;
}

/** Build the map of one box type. `scores` gives the model values of a version by point number, when a score file exists. */
export function buildBoxMap(box: string, inputs: VersionInput[], scores: (version: string) => Map<string, ModelValue> | null = () => null): BoxMap {
  const { order, fallback } = orderVersions(inputs.map((i) => ({ version: i.version, parent: i.parent })));
  const byVersion = new Map(inputs.map((i) => [i.version, i]));
  const versions: MapVersion[] = [];
  let prevPoints: MapPoint[] = [];
  const max = { comp: 0, imp: 0, modelComp: 0, modelImp: 0 };
  for (const v of order) {
    const input = byVersion.get(v)!;
    const values = pointValues(input.text);
    const model = scores(v);
    const match = matchPoints(prevPoints, values);
    const points: MapPoint[] = values.map((p, i) => {
      const pi = match.parentOf[i];
      const parent = pi >= 0 ? prevPoints[pi] : null;
      const m = model?.get(p.num) ?? null;
      return {
        id: parent ? parent.id : `${v}#${p.num}`,
        num: p.num,
        text: p.text,
        comp: p.comp,
        imp: p.imp,
        prev: parent ? { comp: parent.comp, imp: parent.imp, num: parent.num } : null,
        added: !parent && versions.length > 0,
        changed: parent ? pointBody(parent.text) !== pointBody(p.text) : false,
        model: m,
        modelPrev: parent?.model ?? null,
      };
    });
    for (const p of points) {
      max.comp = Math.max(max.comp, p.comp);
      max.imp = Math.max(max.imp, p.imp);
      if (p.model) {
        max.modelComp = Math.max(max.modelComp, p.model.comp);
        max.modelImp = Math.max(max.modelImp, p.model.imp);
      }
    }
    versions.push({
      version: v,
      text: input.text,
      parent: input.parent,
      created_utc: input.created_utc,
      update_point: input.update_point,
      chars: input.text.length,
      marksSum: values.reduce((a, p) => a + p.marks, 0),
      groupCount: input.group_ids.length,
      critiqueCount: input.critique_ids.length,
      auditMarks: input.marks,
      points,
      removed: match.removed.map((i) => ({ id: prevPoints[i].id, num: prevPoints[i].num, text: prevPoints[i].text })),
      measured: model !== null,
    });
    prevPoints = points;
  }
  return { box, versions, fallback, max };
}

/** One line of the click details: the point in one version. */
export interface PointStep {
  version: string;
  num: string;
  text: string;
  comp: number;
  imp: number;
  model: ModelValue | null;
  /** "added" (hard add), "changed" (new text), "moved" (same text, other values), "same", or "first" (the first version). */
  kind: "added" | "changed" | "moved" | "same" | "first";
  /** The audit marks of the version, shown for "added" and "changed" (Q-A 3:64.5 row 3). */
  marks: AuditMark[];
  groupCount: number;
  critiqueCount: number;
}

/** The history of one point across the versions of the map, and the version where it was removed, if any. */
export function pointHistory(map: BoxMap, id: string): { steps: PointStep[]; removedIn: string | null } {
  const steps: PointStep[] = [];
  let removedIn: string | null = null;
  for (const v of map.versions) {
    const p = v.points.find((x) => x.id === id);
    if (!p) {
      if (steps.length > 0 && !removedIn && v.removed.some((r) => r.id === id)) removedIn = v.version;
      continue;
    }
    const kind: PointStep["kind"] = p.added ? "added" : !p.prev ? "first" : p.changed ? "changed" : moved(p, p.prev) ? "moved" : "same";
    steps.push({
      version: v.version,
      num: p.num,
      text: p.text,
      comp: p.comp,
      imp: p.imp,
      model: p.model,
      kind,
      marks: kind === "added" || kind === "changed" ? v.auditMarks : [],
      groupCount: v.groupCount,
      critiqueCount: v.critiqueCount,
    });
  }
  return { steps, removedIn };
}

// ---------------------------------------------------------------- the score file of point_scores.py (Q-A 3:65.6)

/**
 * Read the model values of a score file. Return null for a file of another prompt text (sha1) or a bad shape.
 * Shape: { box, version, sha1, points: [{ num, importance_pct, comprehensiveness_pct, ... }] }.
 */
export function parseScoreFile(raw: unknown, sha1: string): Map<string, ModelValue> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { sha1?: unknown; points?: unknown };
  if (r.sha1 !== sha1 || !Array.isArray(r.points)) return null;
  const out = new Map<string, ModelValue>();
  for (const p of r.points as Record<string, unknown>[]) {
    const comp = p?.comprehensiveness_pct;
    const imp = p?.importance_pct;
    if (typeof p?.num !== "string" || typeof comp !== "number" || typeof imp !== "number") return null;
    out.set(p.num, { comp, imp });
  }
  return out;
}

// ---------------------------------------------------------------- the 16 box types

export const BOX_TYPES = ["TS_0", "TS_1", "TS_2", "TS_3", "TL_0", "TL_1", "TL_2", "TL_3", "ED_0", "ED_1", "ED_2", "ED_3", "QA_0", "QA_1", "QA_2", "QA_3"] as const;

export const isBoxType = (v: unknown): v is (typeof BOX_TYPES)[number] => typeof v === "string" && (BOX_TYPES as readonly string[]).includes(v);
