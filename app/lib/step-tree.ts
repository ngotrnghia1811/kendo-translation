// Unit VW95 (round 91): the step view of the phase 2 run. Pure: no file read (lib/step-tree-load.ts reads the files).
// Owner words, Q-A 3:17.1 note (2026-11-11): "I want to be able to `view the FULL process step-by-step`: Display like a tree going down each step
// of the script. In chronological order: p1 -> p2 -> p3 ..., inside a page I can unfold to view full detail: input -> TL output -> ED output ->
// QA output, layer 0 -> 1 -> 2 -> 3, then loss function, then backward pass, then prompt update".
// Q-A 3:17.7 and 3:18.2: three levels (pages, steps of a page, data of a step), run order across restarts.
// Q-A 3:17.4: every ID and every state gets a readable label. Q-A 3:18.5: box codes stay, the hover gives the name (components/BoxCode.tsx).
// Words of the docs: docs/agents/translator.md "Training model": the reference-diff-critic is the loss at the end of the forward pass,
// the box critics and their critiques are the backward pass, and the update point rewrites the prompt of a box.

import { parseUtcIso } from "./pst";
import { tokenCounts, sumTokens, type TokenCounts } from "./tokens-sum";
import type { PageEvent } from "./phase2-articles";
import type { FrozenBox } from "./run-store"; // unit VW85

type Rec = Record<string, unknown>;

function rec(v: unknown): Rec | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ---------------------------------------------------------------- words

/** A plain word on a pill and its hover help. `pill` picks the color of components/Pills.tsx (StatePill). */
export interface Word {
  pill: string;
  label: string;
  help: string;
}

export const STEP_WORDS: Record<string, Word> = {
  done: { pill: "done", label: "Done", help: "Done: the call of this step ended without an error." },
  failed: { pill: "failed", label: "Failed", help: "Failed: the call of this step ended with an error. See the data of the step." },
  running: { pill: "running", label: "Working now", help: "Working now: the Translator waits for the answer of this call." },
  waiting: { pill: "waiting", label: "Not started yet", help: "Not started yet: the page runs, and this step comes later." },
  missing: {
    pill: "interrupted",
    label: "No call record",
    help: "No call record: the page run folder holds no call of this step. A failed critic call or a stop before the end gives this.",
  },
  program: { pill: "done", label: "Done (program)", help: "Done (program): a program made this output. No model call." },
  ended: { pill: "done", label: "Ended", help: "Ended: the update point ended (history.jsonl event update-point-ended). See the result." },
  "update-running": { pill: "running", label: "Working now", help: "Working now: the update point started and did not end yet." },
};

/** The word of a step state key. The summary sends the key only, so each 3 s update stays small. */
export function stepWord(key: string): Word {
  return STEP_WORDS[key] ?? { pill: key, label: key, help: `Step state "${key}". The Viewer has no plain word for it.` };
}

/** The word of a page state key. */
export function pageWordOf(key: string): Word {
  return PAGE_WORDS[key] ?? { pill: key, label: key, help: `Page state "${key}". The Viewer has no plain word for it.` };
}

export const PAGE_WORDS: Record<string, Word> = {
  accepted: { pill: "done", label: "Accepted", help: "Accepted: the page run ended, and the run accepted the page (history.jsonl event page-done, QA_3 verdict PASS)." },
  "accepted-fail": {
    pill: "completed with failures",
    label: "Accepted with verdict FAIL",
    help: "Accepted with verdict FAIL: the page run ended and counts as done, but the QA_3 verdict is FAIL (status.json fail_pages).",
  },
  failed: { pill: "failed", label: "Failed", help: "Failed: the page run ended with an error (history.jsonl event page-failed)." },
  running: { pill: "running", label: "Translating now", help: "Translating now: the Translator works on this page now." },
  stopped: { pill: "interrupted", label: "Stopped before the end", help: "Stopped before the end: the run stopped while this page ran. A restart runs the page again." },
  "not-started": { pill: "waiting", label: "Not started yet", help: "Not started yet: the run did not start this page yet." },
};

/** The groups of a page, in the order of the owner (Q-A 3:17.1 note). */
export const GROUP_WORDS: Record<string, { label: string; help: string }> = {
  input: { label: "Input", help: "Input of the page: TS_0 reads the page and writes its Japanese text." },
  "level-0": { label: "Grid level 0", help: "Level 0 of 4 (0 weakest model, 3 strongest model): TS, TL, ED and QA of this level." },
  "level-1": { label: "Grid level 1", help: "Level 1 of 4 (0 weakest model, 3 strongest model): TS, TL, ED and QA of this level." },
  "level-2": { label: "Grid level 2", help: "Level 2 of 4 (0 weakest model, 3 strongest model): TS, TL, ED and QA of this level." },
  "level-3": { label: "Grid level 3", help: "Level 3 of 4 (0 weakest model, 3 strongest model): TS, TL, ED and QA of this level." },
  loss: {
    label: "Loss function",
    help: "Loss function: the reference-diff-critic compares the final ED_3 English with the human English of the dataset. Its critiques go to the boxes.",
  },
  backward: {
    label: "Backward pass",
    help: "Backward pass: one box critic per box reads the output of its box and writes critiques for the next prompt update.",
  },
  update: {
    label: "Prompt update",
    help: "Prompt update: an update point that ran after this page. It groups the critiques of a box and rewrites the prompt of that box.",
  },
};

/** Readable text of a step kind. The box code stays in front and has its own hover (Q-A 3:18.5). */
export function stepKindText(code: string): string {
  if (code === "TS_0") return "input: page transcription";
  if (code === "reference-diff-critic") return "compares the JA units, the human EN and the final ED_3 EN";
  const m = /^(box-critic\.)?(TS|TL|ED|QA)_([0-3])$/.exec(code);
  if (!m) return code;
  if (m[1]) return `critiques of ${m[2]}_${m[3]}`;
  if (m[2] === "TS") return "transcription step";
  return `${m[2]} output`;
}

/** Plain words of the roles of an update point call (calls.jsonl key update_role of update-points/). [unit default VW95] */
export const UPDATE_ROLE_WORDS: Record<string, string> = {
  "critique-grouper": "groups the critiques of the box",
  "critique-group-check-judge": "checks one critique group",
  "prompt-rewrite-optimizer": "writes the new prompt",
  "prompt-audit-judge": "checks the new prompt",
};

// ---------------------------------------------------------------- tree types

export interface StepNode {
  /** Request key of the data of the step: "box:TL_2", "critic:TL_2", "loss", "update:TL_3". */
  id: string;
  /** The code on the screen: "TL_2", "box-critic.ED_2", "reference-diff-critic", or the box of an update point. */
  code: string;
  text: string;
  /** Key of STEP_WORDS. */
  state: string;
  model: string | null;
  seconds: number | null;
  tokens: TokenCounts | null;
  calls: number;
  verdict: string | null;
  score: number | null;
  /** A short fact line, for example "3 critiques" or "v2.1.0 -> v2.1.1, rewrite live". */
  note: string | null;
  startedEpoch: number | null;
  running: boolean;
}

export interface StepGroup {
  key: string;
  label: string;
  help: string;
  steps: StepNode[];
}

// ---------------------------------------------------------------- calls of a page run

const GRID = [0, 1, 2, 3].flatMap((n) => ["TS", "TL", "ED", "QA"].map((s) => `${s}_${n}`));
/** Order of the box critics when a call record is missing: the reverse of the grid, without TS (no critic for TS). */
const CRITIC_FALLBACK = [...GRID].reverse().filter((b) => !b.startsWith("TS_"));

/** The light files of one page run folder that the tree needs. */
export interface PageFiles {
  /** Rows of calls.jsonl. */
  calls: unknown[];
  /** Rows of reference-diff-critic/calls.jsonl. */
  lossCalls: unknown[];
  /** critiques/reference.json, or null. */
  reference: unknown;
  /** Box to the number of box-critic critiques in critiques/queue-<BOX>.jsonl. */
  criticCounts: Record<string, number>;
  /** QA box to its score of results/<QA box>.json: { verdict, page_score }. */
  qa: Record<string, { verdict: string | null; score: number | null }>;
}

export interface PageCtx {
  /** The page runs now (no end event, the run is active). */
  running: boolean;
  /** status.json running_boxes, when this page is the running page. */
  runningBoxes: string[];
}

interface CallInfo {
  model: string | null;
  seconds: number | null;
  tokens: TokenCounts | null;
  ok: boolean;
  calls: number;
  startedEpoch: number | null;
  program: boolean;
  error: string | null;
}

/** The model calls of a calls.jsonl, by tag, in the order of their first row. Several rows of one tag (a new try) add up. */
export function callsByTag(rows: unknown[]): Map<string, CallInfo> {
  const out = new Map<string, CallInfo>();
  for (const r0 of rows) {
    const r = rec(r0);
    if (!r || r.kind !== "model") continue;
    const tag = str(r.tag) ?? str(r.box);
    if (!tag) continue;
    const program = r.model === "program";
    const t = program ? null : tokenCounts(r.tokens, 1);
    const prev = out.get(tag);
    const started = parseUtcIso(r.started_utc);
    const info: CallInfo = {
      model: str(r.model),
      seconds: num(r.seconds),
      tokens: t ? { ...t, calls: 1 } : null,
      ok: r.ok !== false,
      calls: 1,
      startedEpoch: started,
      program,
      error: str(r.error),
    };
    if (prev) {
      const sum = sumTokens([prev.tokens, info.tokens]).tokens;
      out.set(tag, {
        ...info,
        seconds: (prev.seconds ?? 0) + (info.seconds ?? 0),
        tokens: sum,
        calls: prev.calls + 1,
        startedEpoch: prev.startedEpoch ?? started,
      });
    } else out.set(tag, info);
  }
  return out;
}

function stepOf(id: string, code: string, info: CallInfo | undefined, ctx: PageCtx, extra: Partial<StepNode> = {}): StepNode {
  const running = ctx.running && ctx.runningBoxes.includes(code);
  let state: string;
  if (running) state = "running";
  else if (!info) state = ctx.running ? "waiting" : "missing";
  else if (!info.ok) state = "failed";
  else if (info.program) state = "program";
  else state = "done";
  return {
    id,
    code,
    text: stepKindText(code),
    state,
    model: info ? (info.program ? "program" : info.model) : null,
    seconds: info?.seconds ?? null,
    tokens: info?.tokens ?? null,
    calls: info && !info.program ? info.calls : 0,
    verdict: null,
    score: null,
    note: info?.error ? `error: ${info.error}` : null,
    startedEpoch: info?.startedEpoch ?? null,
    running,
    ...extra,
  };
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Text of the loss step: "4 critiques, 2 units skipped, chrF 61.2". */
export function lossNote(reference: unknown): string | null {
  const r = rec(reference);
  if (!r) return null;
  const parts: string[] = [];
  const q = Array.isArray(r.queue) ? r.queue.length : null;
  if (q !== null) parts.push(plural(q, "critique", "critiques"));
  const s = Array.isArray(r.skipped_units) ? r.skipped_units.length : null;
  if (s !== null) parts.push(`${plural(s, "unit", "units")} skipped`);
  const chrf = num(rec(r.trend)?.chrf);
  if (chrf !== null) parts.push(`chrF ${chrf.toFixed(1)}`);
  return parts.length ? parts.join(", ") : null;
}

/**
 * The step groups of one page run in the order of the owner: input, grid levels 0 to 3, loss function, backward pass, prompt update.
 * [unit default VW95] This order holds even when the files show another clock order (the box critics ran before the reference-diff-critic).
 * Each step shows its start time, so the clock order stays visible.
 */
export function pageSteps(files: PageFiles, ctx: PageCtx, updates: UpdatePoint[]): StepGroup[] {
  const calls = callsByTag(files.calls);
  const groups: StepGroup[] = [];
  const grp = (key: string, steps: StepNode[]) => groups.push({ key, ...GROUP_WORDS[key], steps });
  grp("input", [stepOf("box:TS_0", "TS_0", calls.get("TS_0"), ctx)]);
  for (const n of [0, 1, 2, 3]) {
    const steps: StepNode[] = [];
    for (const s of ["TS", "TL", "ED", "QA"]) {
      const code = `${s}_${n}`;
      if (code === "TS_0") continue;
      const info = calls.get(code);
      // A TS step of level 1 to 3 shows only when the page run has its record (it is a program step, Q-A 3:17.7 "where they exist").
      if (s === "TS" && !info) continue;
      const qa = s === "QA" ? files.qa[code] : undefined;
      steps.push(stepOf(`box:${code}`, code, info, ctx, qa ? { verdict: qa.verdict, score: qa.score } : {}));
    }
    grp(`level-${n}`, steps);
  }
  const loss = callsByTag(files.lossCalls).get("reference-diff-critic");
  grp("loss", [stepOf("loss", "reference-diff-critic", loss, ctx, { note: lossNote(files.reference) })]);
  const critics: StepNode[] = [];
  const seen = new Set<string>();
  for (const [tag, info] of calls) {
    const m = /^box-critic\.((?:TS|TL|ED|QA)_[0-3])$/.exec(tag);
    if (!m) continue;
    seen.add(m[1]);
    critics.push(stepOf(`critic:${m[1]}`, tag, info, ctx, { note: criticNote(files.criticCounts[m[1]]) }));
  }
  for (const box of CRITIC_FALLBACK) {
    if (seen.has(box)) continue;
    const code = `box-critic.${box}`;
    // A running page shows the critics that come later. An ended page shows a missing critic only when other critics ran.
    if (!ctx.running && critics.length === 0) continue;
    critics.push(stepOf(`critic:${box}`, code, undefined, ctx, { note: criticNote(files.criticCounts[box]) }));
  }
  grp("backward", critics);
  grp("update", updates.map(updateStep));
  return groups;
}

function criticNote(n: number | undefined): string | null {
  return n === undefined ? null : plural(n, "critique", "critiques");
}

// ---------------------------------------------------------------- update points (history.jsonl)

export interface UpdatePoint {
  box: string;
  /** The page after which the update point ran. */
  page: string;
  runId: string | null;
  startedEpoch: number | null;
  endedEpoch: number | null;
  result: string | null;
  queueCount: number;
  hardGroups: number | null;
  softGroups: number | null;
  seconds: number | null;
  /** prompt-live: the new prompt version and its parent. */
  version: string | null;
  parent: string | null;
  /** rubric-table-live of the same update point, else null. */
  rubric: { version: string | null; parent: string | null; changeIds: string[] } | null;
  /** Other events of the box while the update point ran (prompt-rejected, box-frozen, ...). */
  events: string[];
  /** Calls of update-points/<page>/calls.jsonl of this box (the loader fills them). */
  calls: number;
  tokens: TokenCounts | null;
  model: string | null;
}

/** The update points of history.jsonl, in file order. Each belongs to the run of the "start" row before it. */
export function updatePoints(rows: Rec[]): UpdatePoint[] {
  const out: UpdatePoint[] = [];
  const open = new Map<string, UpdatePoint>();
  let runId: string | null = null;
  for (const r of rows) {
    const ev = r.event;
    if (ev === "start") {
      runId = str(r.run_id);
      open.clear();
      continue;
    }
    const box = str(r.box);
    if (!box) continue;
    if (ev === "update-point-started") {
      const u: UpdatePoint = {
        box,
        page: str(r.page) ?? "",
        runId,
        startedEpoch: parseUtcIso(r.utc),
        endedEpoch: null,
        result: null,
        queueCount: Array.isArray(r.queue_ids) ? r.queue_ids.length : 0,
        hardGroups: null,
        softGroups: null,
        seconds: null,
        version: null,
        parent: null,
        rubric: null,
        events: [],
        calls: 0,
        tokens: null,
        model: null,
      };
      out.push(u);
      open.set(box, u);
      continue;
    }
    const u = open.get(box);
    if (!u) continue;
    if (ev === "prompt-live") {
      u.version = str(r.version);
      u.parent = str(r.parent) ?? str(rec(r.parent)?.version);
    } else if (ev === "rubric-table-live") {
      u.rubric = {
        version: str(r.version),
        parent: str(r.parent) ?? str(rec(r.parent)?.version),
        changeIds: Array.isArray(r.change_ids) ? r.change_ids.filter((x): x is string => typeof x === "string") : [],
      };
    } else if (ev === "update-point-ended") {
      u.endedEpoch = parseUtcIso(r.utc);
      u.result = str(r.result);
      u.seconds = num(r.seconds);
      u.hardGroups = num(r.hard_groups);
      u.softGroups = num(r.soft_groups);
      if (Array.isArray(r.queue_ids)) u.queueCount = r.queue_ids.length;
      open.delete(box);
    } else if (typeof ev === "string") {
      u.events.push(ev);
    }
  }
  return out;
}

/** "v2.1.0 -> v2.1.1", or null when no new version went live. */
export function versionChange(from: string | null, to: string | null): string | null {
  if (!to) return null;
  return `${from ?? "no earlier version"} -> ${to}`;
}

/** "3 soft, 0 hard critique groups", or null. */
export function groupsText(u: UpdatePoint): string | null {
  if (u.softGroups === null && u.hardGroups === null) return null;
  return `critique groups: ${u.softGroups ?? 0} soft, ${u.hardGroups ?? 0} hard`;
}

/** The fact line of an update point: "v2.1.0 -> v2.1.1, rewrite live, critique groups: 3 soft, 0 hard, 4 critiques". */
export function updateNote(u: UpdatePoint): string {
  const parts: string[] = [];
  const v = versionChange(u.parent, u.version);
  if (v) parts.push(`prompt ${v}`);
  if (u.rubric) parts.push(`rubric table ${versionChange(u.rubric.parent, u.rubric.version) ?? "changed"}`);
  parts.push(u.result ?? (u.endedEpoch === null ? "no result yet" : "result not stored"));
  const g = groupsText(u);
  if (g) parts.push(g);
  parts.push(plural(u.queueCount, "critique", "critiques"));
  if (u.events.length) parts.push(`events: ${u.events.join(", ")}`);
  return parts.join(", ");
}

export function updateStep(u: UpdatePoint): StepNode {
  const running = u.endedEpoch === null;
  return {
    id: `update:${u.box}`,
    code: u.box,
    text: `prompt update of ${u.box}`,
    state: running ? "update-running" : "ended",
    model: u.model,
    seconds: u.seconds,
    tokens: u.tokens,
    calls: u.calls,
    verdict: null,
    score: null,
    note: updateNote(u),
    startedEpoch: u.startedEpoch,
    running,
  };
}

// ---------------------------------------------------------------- pages in run order

export interface ListRowLite {
  page: string;
  state: string;
  /** Folder below the data folder ("pilot-run/<a>_<p>/<run>"), or null. */
  folder: string | null;
  startedEpoch: number | null;
  endedEpoch: number | null;
  callsDone: number | null;
  callsTotal: number | null;
  seconds: number | null;
}

export interface ListLite {
  stamp: string;
  rows: ListRowLite[];
}

export interface OrderedPage {
  page: string;
  kind: "event" | "running" | "stopped" | "not-started";
  event: PageEvent | null;
  row: ListRowLite | null;
  listStamp: string | null;
  folder: string | null;
}

/**
 * The pages of one phase 2 run in run order across restarts (Q-A 3:18.2).
 * - Pages with an end event of this run (history.jsonl page-done or page-failed). The last event of a page wins.
 * - Pages that a list of this run started and did not end (the run stopped or restarted). The newest such row wins.
 * - The running page of the newest list, when the run is active.
 * These three kinds sort by time: the end time of the event, the start time of the row, and the running page last.
 * - Then the pages that the newest list did not start yet, in list order.
 * `lists` are the list folders of the run, oldest first.
 */
export function pagesInRunOrder(events: PageEvent[], runId: string | null, lists: ListLite[], runActive: boolean): OrderedPage[] {
  const ended = new Map<string, PageEvent>();
  for (const e of events) {
    if (e.runId !== runId) continue;
    ended.delete(e.page);
    ended.set(e.page, e);
  }
  const timed: { t: number; p: OrderedPage }[] = [];
  for (const e of ended.values()) {
    timed.push({ t: e.epoch ?? 0, p: { page: e.page, kind: "event", event: e, row: null, listStamp: e.listStamp, folder: e.folder } });
  }
  const newest = lists.length ? lists[lists.length - 1] : null;
  const started = new Map<string, { row: ListRowLite; stamp: string }>();
  for (const l of lists) {
    for (const r of l.rows) {
      if (ended.has(r.page) || !r.folder) continue;
      if (r.state === "done" || r.state === "waiting") continue;
      started.set(r.page, { row: r, stamp: l.stamp });
    }
  }
  for (const [page, s] of started) {
    const running = runActive && newest !== null && s.stamp === newest.stamp && s.row.state === "running";
    timed.push({
      t: running ? Number.MAX_SAFE_INTEGER : (s.row.startedEpoch ?? s.row.endedEpoch ?? 0),
      p: { page, kind: running ? "running" : "stopped", event: null, row: s.row, listStamp: s.stamp, folder: s.row.folder },
    });
  }
  timed.sort((a, b) => a.t - b.t);
  const out = timed.map((x) => x.p);
  const shown = new Set(out.map((p) => p.page));
  for (const r of newest?.rows ?? []) {
    if (shown.has(r.page)) continue;
    shown.add(r.page);
    out.push({ page: r.page, kind: "not-started", event: null, row: r, listStamp: newest?.stamp ?? null, folder: null });
  }
  return out;
}

/** The plain state of a page of the tree: a key of PAGE_WORDS. */
export function pageState(p: OrderedPage, failPages: Set<string>): string {
  if (p.kind === "running") return "running";
  if (p.kind === "stopped") return "stopped";
  if (p.kind === "not-started") return "not-started";
  if (p.event && !p.event.accepted) return "failed";
  if (p.event?.verdict === "FAIL" || failPages.has(p.page)) return "accepted-fail";
  return "accepted";
}

// ---------------------------------------------------------------- summary sent to the screen

export interface PageNode {
  pageId: string;
  title: string;
  titleJa: string | null;
  titleFound: boolean;
  pageOf: string | null;
  /** Key of PAGE_WORDS. */
  state: string;
  verdict: string | null;
  score: number | null;
  seconds: number | null;
  calls: number;
  tokens: TokenCounts | null;
  /** Folder below the data folder: "pilot-run/94380515_p002/20261112T044149Z-r41", or null. */
  folder: string | null;
  runFolder: string | null;
  /** "list started 2026-11-11 20:41 PST", and the raw stamp. */
  listLabel: string | null;
  listStamp: string | null;
  /** Clock time of the end (accepted pages) or the start (other pages). */
  epoch: number | null;
  running: boolean;
  runningBoxes: string[];
  groups: StepGroup[];
  /** False when the summary left out the steps (the page is closed on the screen). [unit default VW95] keeps each 3 s update small. */
  stepsShown: boolean;
  /** A plain message when the page run folder cannot be read. */
  error: string | null;
}

export interface StepSummary {
  runId: string | null;
  /** "phase 2 run started 2026-11-11 18:30 PST". */
  runLabel: string;
  runWord: Word;
  lists: { stamp: string; label: string }[];
  pages: PageNode[];
  /** Pages that the run did not start yet: only the names (they have no steps). */
  notStarted: { pageId: string; title: string; pageOf: string | null }[];
  updates: (UpdatePoint & { pageText: string })[];
  generatedEpoch: number;
  /** Milliseconds of the summary call on the server. */
  millis: number;
  error: string | null;
  /** Unit VW85 (Q-A 3:26.3): the book of a book run. Missing for the phase 2 run. */
  book?: { slug: string; title: string | null; phase: string | null };
  /** Unit VW85 (Q-A 3:26.3 (b)): the frozen boxes of a book run (event box-frozen, freeze.py:33). Missing for the phase 2 run. */
  frozen?: FrozenBox[];
}

export const RUN_WORDS: Record<string, Word> = {
  running: { pill: "running", label: "Translating now", help: "Translating now (status.json state running): the phase 2 run works now." },
  stopped: { pill: "interrupted", label: "Stopped", help: "Stopped (status.json state stopped): the run stopped. A restart goes on from the next page." },
  completed: { pill: "completed", label: "Translated", help: "Translated (status.json state completed): the run ended all its pages." },
};

export function runWord(state: string | null): Word {
  return (state && RUN_WORDS[state]) || { pill: state ?? "unknown", label: state ?? "unknown", help: `State "${state ?? "unknown"}" of status.json. The Viewer has no plain word for it.` };
}

/** "3 min 20 s" or "45 s". */
export function secondsText(s: number | null): string {
  if (s === null) return "–";
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${Math.round(s - m * 60)} s`;
}

/** The value of the query key "open": the open page IDs, sorted, joined by commas. */
export function openParam(pageIds: string[]): string {
  return [...new Set(pageIds)].sort().join(",");
}

/** The open page IDs of a query value. Each ID must look like "<article>/<page>" with safe characters. */
export function parseOpenParam(v: string | null): Set<string> {
  const out = new Set<string>();
  for (const p of (v ?? "").split(",")) if (/^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(p)) out.add(p);
  return out;
}

/** Fold state of the tree: the running page is open by default (Q-A 3:17.7). An open or closed choice of the owner wins. */
export function isOpen(key: string, choices: Record<string, boolean>, runningDefault: boolean): boolean {
  return key in choices ? choices[key] : runningDefault;
}
