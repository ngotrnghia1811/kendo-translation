// Unit VW132 (plan item P54.3). Q-A 3:140.3 "Build now": the call count of a page counts only the model calls that run.
// Q-A 3:139.3 "All 4 hold" (Monitor time fix later). Source of the rule: Translator unit TR105 (commit 93f3984).
//   - The box-critic call of a frozen box is skipped when the box has no open target box: freeze.py critic_skip_boxes (l156-164) and target_of (l125-142).
//   - The Translator takes the frozen set at the start of each page: translator_run.py l4159 (skip_now).
//   - A page that ended records the skipped calls: progress.json calls_skipped (progress.py page_end) and summary.json critic_skipped_boxes (translator_run.py l2086-2087).
// The page row of progress.json keeps the planned total (32 for a book page, 24 for a web page, progress.py calls_for) while the page runs.
// This file is pure: no file access, no server import. One rule for every screen: the Lists page /runs, the run view /runs/<stamp>, the Details view /monitor/<slug>.
// The loader that reads the frozen set from the data folder is lib/page-calls-load.ts.

/** The four stages of the forward run, in Translator order (prompts_model STAGES). A level goes from 0 to MAX_LEVEL (freeze.py MAX_LEVEL). */
const STAGES = ["TS", "TL", "ED", "QA"] as const;
const MAX_LEVEL = 3;

/** The 16 boxes of the grid in Translator order (prompts.BOXES: stage first, then level). Not the level-first order of lib/run-store.ts. */
export const GRID_BOXES: string[] = STAGES.flatMap((s) => [0, 1, 2, 3].map((n) => `${s}_${n}`));

const BOX_PATTERN = /^(TS|TL|ED|QA)_[0-3]$/;

/** Port of freeze.py target_of: the open box that takes the critiques of a frozen box, or null when no open box is left. */
export function criticTargetOf(box: string, frozen: ReadonlySet<string>): string | null {
  const [stage, levelText] = box.split("_");
  const level = Number(levelText);
  for (let lv = level + 1; lv <= MAX_LEVEL; lv++) {
    const cand = `${stage}_${lv}`;
    if (!frozen.has(cand)) return cand; // step (a): the same stage, the next higher open level
  }
  for (const later of STAGES.slice(STAGES.indexOf(stage as (typeof STAGES)[number]) + 1)) {
    const cand = `${later}_${level}`;
    if (!frozen.has(cand)) return cand; // step (b): the same level in a later stage. No wrap to an earlier stage.
  }
  return null;
}

/**
 * Port of freeze.py critic_skip_boxes: the frozen boxes that get no box-critic call, in grid order. A frozen box with no open target has
 * no box to take its critiques. With all 16 boxes frozen, the list holds all 16 boxes. An empty frozen set gives an empty list.
 */
export function criticSkipBoxes(frozen: readonly string[] | null | undefined): string[] {
  const set = new Set((frozen ?? []).filter((b) => BOX_PATTERN.test(b)));
  return GRID_BOXES.filter((b) => set.has(b) && criticTargetOf(b, set) === null);
}

/** A web page has no TS stage (progress.py calls_for: 3 stages). A book page has all four. */
export function isWebPage(kind: string): boolean {
  return kind === "web";
}

/**
 * The skipped boxes that count for one page: valid box codes, each once, and no TS box on a web page.
 * The count cannot be larger than the number of critic calls of the page (half of the planned total), so a broken list cannot give a negative total.
 */
export function countedSkipBoxes(kind: string, boxes: readonly string[] | null | undefined, plannedTotal: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of boxes ?? []) {
    if (typeof b !== "string" || !BOX_PATTERN.test(b) || seen.has(b)) continue;
    if (isWebPage(kind) && b.startsWith("TS_")) continue;
    seen.add(b);
    out.push(b);
  }
  const room = Math.max(0, Math.floor(plannedTotal / 2));
  return out.slice(0, room);
}

/** Where the total of a page comes from. */
export type PageCallsBasis =
  | "recorded" // the page ended: the numbers of progress.json (calls_skipped)
  | "summary" // the page failed or stopped: critic_skipped_boxes of its summary.json
  | "forecast" // the page runs or waits: the frozen boxes of the book now [unit default VW132]
  | "planned"; // nothing is known: the planned total of progress.json

export interface PageCallsInput {
  /** State of the page row: waiting, running, done, failed, interrupted. */
  state: string;
  /** "book" or "web" (key kind of the page row). */
  kind: string;
  callsDone: number;
  /** The planned total of progress.json (calls_total): 32 for a book page, 24 for a web page. */
  callsTotal: number;
  /** Key calls_skipped of progress.json. 0 in an old row. */
  callsSkipped: number;
  /** Key critic_skipped_boxes of the page summary.json. Null when the file or the key is missing. */
  summaryBoxes: readonly string[] | null;
  /** Text of skipped_reason: the list did not run this page, so the planned total stays. */
  skippedReason: string | null;
  /** The frozen boxes that have no critic call now (criticSkipBoxes of the frozen set of the book), or null when the list is not live or has no freeze. */
  forecastBoxes: readonly string[] | null;
}

export interface PageCalls {
  /** The model calls that run for this page: the number after the slash. */
  total: number;
  /** The planned total of progress.json. */
  planned: number;
  /** The boxes whose critic call is skipped. */
  boxes: string[];
  basis: PageCallsBasis;
}

/** A whole number of calls, never negative. A missing or broken number gives 0. */
function whole(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/**
 * The model calls that run for one page [unit VW132, Q-A 3:140.3].
 *   - done: the recorded numbers. Total = planned - calls_skipped. For a page that ended well this equals calls_done. An old page has calls_skipped 0 and keeps 32.
 *   - failed, interrupted, other ended state: planned - the boxes of summary.json. Without that list the planned total stays.
 *   - running: planned - the critic calls of the frozen boxes now. The Translator reads the frozen set at the page start and changes it only between pages.
 *   - waiting: the same forecast, but only while the list is live and the page has no skipped_reason [unit default VW132]. A page that the list skipped keeps its planned total.
 * The total is never below calls_done.
 */
export function pageCalls(row: PageCallsInput): PageCalls {
  const planned = whole(row.callsTotal);
  const done = whole(row.callsDone);
  const keep = (basis: PageCallsBasis, boxes: string[], total: number): PageCalls => ({ total: Math.max(done, total), planned, boxes, basis });
  if (row.state === "done") {
    const skipped = whole(row.callsSkipped);
    const boxes = countedSkipBoxes(row.kind, row.summaryBoxes, planned);
    return keep(skipped > 0 ? "recorded" : "planned", skipped > 0 ? boxes : [], planned - skipped);
  }
  if (row.state === "running" || (row.state === "waiting" && !row.skippedReason)) {
    const boxes = countedSkipBoxes(row.kind, row.forecastBoxes, planned);
    return keep(boxes.length > 0 ? "forecast" : "planned", boxes, planned - boxes.length);
  }
  if (row.state === "waiting") return keep("planned", [], planned);
  const boxes = countedSkipBoxes(row.kind, row.summaryBoxes, planned);
  return keep(boxes.length > 0 ? "summary" : "planned", boxes, planned - boxes.length);
}

/** True while a list can start a page: running, or paused (the Translator list state "paused after page" and "paused"). */
export function listIsLive(state: string): boolean {
  return state === "running" || state.startsWith("paused");
}

/**
 * The total of a list: the planned total of progress.json minus the calls that its pages skip.
 * A list with no skipped call keeps the planned total exactly, even when its page rows do not add up to it.
 */
export function listCallsTotal(pages: readonly { total: number; planned: number }[], listPlanned: number): number {
  const skipped = pages.reduce((n, p) => n + Math.max(0, p.planned - p.total), 0);
  return Math.max(0, listPlanned - skipped);
}

function recOf(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function numOf(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** The key critic_skipped_boxes of a page summary.json as a list of text. Null when the file or the key is missing. */
export function summaryBoxesOf(summary: unknown): string[] | null {
  const list = recOf(summary)?.critic_skipped_boxes;
  return Array.isArray(list) ? list.filter((b): b is string => typeof b === "string") : null;
}

/** The input of pageCalls for one raw page row of progress.json. `forecastBoxes` is null for a list that is not live or has no freeze. */
export function pageInputOf(pg: unknown, summaryBoxes: readonly string[] | null, forecastBoxes: readonly string[] | null): PageCallsInput {
  const r = recOf(pg) ?? {};
  const reason = r.skipped_reason;
  return {
    state: String(r.state ?? ""),
    kind: String(r.kind ?? ""),
    callsDone: numOf(r.calls_done),
    callsTotal: numOf(r.calls_total),
    callsSkipped: numOf(r.calls_skipped),
    summaryBoxes,
    skippedReason: typeof reason === "string" && reason !== "" ? reason : null,
    forecastBoxes,
  };
}

/** Hover text of "done / total". Empty when the page has no skipped call, so the old screen stays as it was. */
export function callsTitle(c: { total: number; planned: number; boxes: readonly string[]; basis: PageCallsBasis }): string | null {
  if (c.boxes.length === 0 && c.total >= c.planned) return null;
  const skipped = Math.max(0, c.planned - c.total);
  const why =
    c.basis === "forecast"
      ? `${c.boxes.length} box-critic ${c.boxes.length === 1 ? "call is" : "calls are"} skipped because ${c.boxes.length === 1 ? "its box is" : "their boxes are"} frozen: ${c.boxes.join(", ")}.`
      : c.boxes.length > 0
        ? `${c.boxes.length} box-critic ${c.boxes.length === 1 ? "call was" : "calls were"} skipped because ${c.boxes.length === 1 ? "its box was" : "their boxes were"} frozen: ${c.boxes.join(", ")}.`
        : `${skipped} planned ${skipped === 1 ? "call was" : "calls were"} skipped.`;
  return `Model calls that run: ${c.total} (planned ${c.planned}). ${why}`;
}

/** Hover text of the list total: the pages added up. Empty when no page of the list skips a call. */
export function listCallsTitle(total: number, planned: number): string | null {
  if (total >= planned) return null;
  return `Model calls that run in this list: ${total} (planned ${planned}). Box-critic calls of frozen boxes are skipped.`;
}
