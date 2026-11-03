// Rules of the Monitor dashboard (unit VW77a, round 80, buttons added by unit VW77b1, round 81, Restart and Clear mark added by unit VW77b2, round 82). Pure functions: no file access, no clock of their own, no server-only import.
// The server code (book-status.ts) reads the files, checks the pid, and passes the facts and the clock in. A test runs this file with plain node
// and the resolve hook (scripts/ts-resolve-hook.mjs). Use only erasable TypeScript syntax here (no enum, no parameter property).
//
// Sources:
//   VISION-viewer.md 15.24.4.2 (states and exact rules), 15.24.4.3 (one book row), 15.29.2 (Stopped), 15.30.3 and 15.31.5 and 15.32.6 (Restart rows).
//   <T2>/data/scripts/translator/store.py: STATES, STOP_REASONS, LABELS, label_of, HEARTBEAT_S 30, STALE_S 120, write_mark.
//   Q-A 2026-11-01: round 76 answer 4 (l7), round 77 answer 9 (l40), round 78 answer 10 (l72), round 79 answers 11 and 13 (l103, l105),
//   round 80 answers 11, 14, 16, 19 (l133, l136, l138, l141).
//   Q-A 2026-11-02 (round 81): answers 15 and 16 (l20, l21: refused Restart), 19 (l24: grayed Run and Resume), 21 (l26: no "1 error"), 22 (l27: empty phase cell).
//   VISION 15.27.3 (buttons table), 15.29.2 (buttons for each state), 15.33.3 (Running row), 15.33.4 (refused Restart).
// If VISION and store.py disagree, store.py and the newer answer win (see the notes at "running-pause" and "restart_requested_utc").
import { parseUtcIso, pstClock, pstDateTime, pstStamp, relativeTime, runIdText } from "./pst";
import { clearOffReason } from "./clear-mark-rule";
import { orderRows } from "./row-order";

export const HEARTBEAT_S = 30; // store.py:31
export const STALE_S = 120; // store.py:32. A heartbeat older than this means the process is gone.
export const DERIVED_STALE_S = 1800; // VISION 15.24.4.2, notes: the call timeout 1500 s plus 300 s. A derived row older than this is "Stopped unexpectedly".
export const WARN_AFTER_S = 600; // VISION 15.24.4.2, notes: from 600 s to 1800 s a Running row shows the warning.
export const STATES = ["not-started", "running", "stopped", "completed"]; // store.py:33
export const STOP_REASONS = ["ctrl-c", "target-reached", "forward-failure", "cost-guard", "rule", "pause", "restart"]; // store.py:35
export const FAILURE_REASONS = ["forward-failure", "cost-guard", "rule"]; // store.py:47
export const MARK_ACTIONS = ["run", "resume", "restart"]; // store.py:38

export const GROUPS = ["Needs attention", "Waiting for a run", "Running", "Stopped", "Completed", "Not started"] as const;
export type GroupName = (typeof GROUPS)[number];

/** The seven labels of store.py:42-46 plus two labels that only the Viewer shows. */
export type BaseKey = "running" | "running-pause" | "stopped" | "unexpected" | "failure" | "completed" | "not-started";
export type LabelKey = BaseKey | "mark-waiting" | "unreadable";

// Text and group of a base label equal LABELS in store.py:42-46 word for word. Symbols: VISION 15.24.4.2 and 15.24.8. The symbols differ in shape.
// store.py says "Running with pause requested". VISION 15.24.4.2 says "Running, pause requested". store.py wins (it is the built code), and the
// owner can pick the other text (open item in the report of unit VW77a).
export const LABELS: Record<LabelKey, { text: string; group: GroupName; symbol: string }> = {
  running: { text: "Running", group: "Running", symbol: "●" },
  "running-pause": { text: "Running with pause requested", group: "Running", symbol: "●" },
  stopped: { text: "Stopped", group: "Stopped", symbol: "■" },
  unexpected: { text: "Stopped unexpectedly", group: "Needs attention", symbol: "▲" },
  failure: { text: "Stopped by failure", group: "Needs attention", symbol: "▲" },
  completed: { text: "Completed", group: "Completed", symbol: "✓" },
  "not-started": { text: "Not started", group: "Not started", symbol: "○" },
  // VISION 15.24.4.2 (Stopped by a Pause): "the row shows the state Mark waiting". The symbol is a unit default of VW77a.
  "mark-waiting": { text: "Mark waiting", group: "Waiting for a run", symbol: "◇" },
  // VISION 15.24.4.6: "A broken status.json shows the row with the label 'Status file unreadable'". The group is a unit default of VW77a.
  unreadable: { text: "Status file unreadable", group: "Needs attention", symbol: "?" },
};

// ---------------------------------------------------------------- input types

/** status.json of one book (store.py new_status). Every key is optional here, because a file can come from an older or a broken run. */
export interface StatusFile {
  book?: string;
  phase?: string | null;
  state?: string;
  stop_reason?: string | null;
  stop_text?: string | null;
  list_stamp?: string | null;
  pid?: number | null;
  heartbeat_utc?: string | null;
  running_page?: string | null;
  running_boxes?: string[];
  last_accepted_page?: string | null;
  next_page?: string | null;
  pages_done?: number;
  pages_total?: number;
  book_pages?: number;
  fail_pages?: string[];
  cost_usd_models_phase?: number;
  seconds_phase?: number;
  last_error?: { page?: string | null; box?: string | null; text?: string | null; file?: string | null; utc?: string | null } | null;
  started_utc?: string | null;
  run_id?: string | null;
  updated_utc?: string | null;
}

/** request.json (store.py write_mark). */
export interface MarkFile {
  action?: string;
  phase?: string;
  after?: string | null;
  restart_requested_utc?: string | null;
  requested_utc?: string | null;
  requested_by?: string;
}

export interface DerivedError {
  page: string; // "ogawa_lecture_part2/p089"
  box: string | null; // "box-critic.TS_3"
  text: string; // the text after "box-critic.TS_3: "
  file: string | null; // path below the data folder, for example pilot-run/ogawa_lecture_part2_p089/<run folder>/failed/box-critic.TS_3.json
}

/** What the Viewer learns about one book from the pilot list folders (progress.json, list.json, list-summary.json). Built by deriveFacts. */
export interface DerivedFacts {
  listCount: number;
  pagesDone: number; // distinct page IDs in the state "done" (VISION 15.24.4.2, notes)
  costUsd: number; // models_usd of every page row of every list folder (VISION 15.24.4.3, item 5)
  seconds: number; // sum of ended_epoch minus started_epoch of the page rows (the page time with no pauses, item 6)
  lastEventEpoch: number | null; // the latest ended_epoch of the book (VISION 15.24.9)
  newest: {
    stamp: string;
    state: string;
    final: boolean;
    updatedEpoch: number | null;
    startedEpoch: number | null;
    pauseFile: boolean;
    chainState: string | null;
    runningPage: string | null;
    runningBoxes: string[];
    anyRunning: boolean;
    anyWaiting: boolean;
    stopPage: string | null; // the page with the latest ended_epoch in the newest list
    nextPage: string | null; // the first page in the state waiting in the newest list
    errors: DerivedError[];
    forwardFailure: DerivedError | null;
  };
}

/** The input list folder of deriveFacts. The server reads the three files and passes the parsed JSON (null when a file is missing or broken). */
export interface ListInput {
  stamp: string;
  progress: unknown;
  list: unknown;
  summary: unknown;
  pauseExists: boolean;
}

export interface BookFacts {
  slug: string;
  title: string;
  bookPages: number | null;
  status: StatusFile | null; // parsed status.json, null when the file does not exist
  statusUnreadable: boolean; // the file exists but cannot be read or parsed
  statusFile: string; // the path text for the unreadable row, below the data folder, never a Mac path
  pauseExists: boolean; // the file PAUSE in the book folder
  mark: MarkFile | null; // parsed request.json
  markUnreadable: boolean;
  pidAlive: boolean; // process.kill(pid, 0) answered (the server computes it from status.pid)
  runNumber: number | null; // from the current pointer of the prompt files
  derived: DerivedFacts | null;
  /** True when the 16 files book-store/paired-dataset/prompts/<BOX>/current exist (round 78 answer 16, Q-A 2026-11-01 l78: "Wait for phase 2 files"). */
  phase2Ready: boolean;
  /** The newest event `restart-refused` of history.jsonl (round 81 answer 16, Q-A 2026-11-02 l21). Null when the book has none. */
  refusal: { reason: string | null; requested_utc: string | null } | null;
}

// ---------------------------------------------------------------- output types

/** A piece of line 2: text, or a time that the browser can recompute every 30 s with no request (VISION 15.24.4.6). */
export type Seg = string | { ago: number; secs?: boolean };

export type ActionId = "pause" | "restart" | "run" | "run4" | "resume" | "clear";
export const ACTION_LABELS: Record<ActionId, string> = { pause: "Pause", restart: "Restart", run: "Run", run4: "Run phase 4", resume: "Resume", clear: "Clear mark" };

/**
 * One button of a book row (VISION 15.27.3 and 15.29.2).
 * show: the row draws the button. enabled: the button can be pressed. reason: the words of a grayed button (null when enabled).
 * stateReason: why the action does not fit the book, with request.json out of the picture (null when it fits). The write routes answer 409 with it.
 */
export interface ActionButton {
  id: ActionId;
  label: string;
  show: boolean;
  enabled: boolean;
  reason: string | null;
  stateReason: string | null;
}

export interface MonitorRow {
  slug: string;
  title: string;
  key: LabelKey;
  label: string; // the label that the row shows
  baseLabel: string; // the label that store.py label_of gives for the same file values (equals label unless key is mark-waiting or unreadable)
  symbol: string;
  group: GroupName;
  pilot: boolean; // a derived row from a pilot list
  phase: string | null;
  /** The phase key of status.json ("agent-phase-3"), for the body of a Resume press. Null when the book has no status.json. */
  phaseId: string | null;
  run: string | null;
  pagesDone: number | null;
  pagesTotal: number | null;
  cost: number | null;
  minutes: number | null;
  line2: Seg[];
  note: string | null;
  warning: string | null;
  error: string | null;
  errorFile: string | null;
  errorCount: number;
  eventEpoch: number | null;
  statusFile: string | null;
  /** The buttons in the order of the row: Pause, Restart, Run, Run phase 4, Resume, Clear mark (VISION 15.29.2 lists Pause, Restart first). Six entries, `show` tells which ones the row draws. */
  buttons: ActionButton[];
  /** The mark in words for the Clear mark dialog: "Restart requested 08:40 PST". Null when request.json does not exist [unit default VW77b2]. */
  markText: string | null;
  /** The key requested_utc of the mark, for the Clear mark press (the route compares it with the file). Null when the mark has none. */
  markUtc: string | null;
  /** Second line of a refused Restart: "Restart refused: ED_2 v4.1.3 has no file". Null otherwise. */
  refused: string | null;
}

export interface MonitorSummary {
  counts: Record<GroupName, number>;
  errors: number;
  costUsd: number;
  text: string;
  costText: string;
}


/** The answer of GET /api/monitor/books and the first paint of "/". */
export interface MonitorData {
  ok: boolean;
  /** The message of the page when the data folder is not readable (VISION 15.24.4.6). Null otherwise. */
  error: string | null;
  /** The clock of the server in epoch seconds, at the read. */
  generatedAt: number;
  rows: MonitorRow[];
  summary: MonitorSummary;
  /** The end of the newest list folder that is no longer running (epoch seconds), or null. */
  lastListEnd: number | null;
  /** True when no list folder and no status.json exists (VISION 15.24.4.6, "Empty"). */
  noRun: boolean;
}

// ---------------------------------------------------------------- helpers

function asNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asStr(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

function rec(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** "mental_full/p015" gives "p015". A text without a slash stays as it is. */
export function pageShort(id: string | null | undefined): string | null {
  if (!id) return null;
  const i = id.lastIndexOf("/");
  return i >= 0 ? id.slice(i + 1) : id;
}

export function money(v: number | null): string {
  return v === null ? "–" : "$" + v.toFixed(2);
}

/** Minutes with the unit: "54 min", and "2 h 5 min" from 120 min. */
function duration(seconds: number): string {
  const min = Math.max(0, Math.floor(seconds / 60));
  if (min < 120) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** "N s ago" under one minute, else the relative time of VISION 15.24.4.6. */
export function agoText(epoch: number, now: number, secs?: boolean): string {
  const s = Math.max(0, Math.floor(now - epoch));
  if (secs && s < 60) return `${s} s ago`;
  return relativeTime(epoch, now);
}

/** Line 2 as plain text at the clock `now`. The browser calls this every 30 s. */
export function lineText(segs: Seg[], now: number): string {
  return segs.map((s) => (typeof s === "string" ? s : agoText(s.ago, now, s.secs))).join("");
}

export function progressText(r: Pick<MonitorRow, "pagesDone" | "pagesTotal">): string {
  if (r.pagesDone === null) return "–";
  return r.pagesTotal ? `${r.pagesDone} of ${r.pagesTotal} pages` : `${r.pagesDone} page${r.pagesDone === 1 ? "" : "s"}`;
}

/** Phase column (VISION 15.24.4.3, item 3): "Phase 3 · warm initialization", "Phase 4 · production run". */
export function phaseText(phase: string | null | undefined): string | null {
  switch (phase) {
    case "agent-phase-2":
      return "Phase 2";
    case "agent-phase-3":
      return "Phase 3 · warm initialization";
    case "agent-phase-4":
      return "Phase 4 · production run";
    default:
      return null;
  }
}

function phaseNumber(phase: string | null | undefined): number | null {
  const m = /^agent-phase-([234])$/.exec(phase ?? "");
  return m ? +m[1] : null;
}

/** Label form v<phase>.<run>.<updates> (prompts.py:27). Returns null for any other text. */
export function parseLabel(text: unknown): { phase: number; run: number; updates: number } | null {
  const m = typeof text === "string" ? /^v([234])\.([1-9][0-9]*)\.(0|[1-9][0-9]*)$/.exec(text.trim()) : null;
  return m ? { phase: +m[1], run: +m[2], updates: +m[3] } : null;
}

/**
 * Round 80 answer 11 (Q-A l133): the run number comes from the labels. "v4.2.3" means phase 4, run 2, 3 updates.
 * `labels` are the contents of the pointer files `prompts/<BOX>/current`. The first label of the wanted phase wins. No label gives null.
 */
export function runNumberOf(labels: string[], phase: string | null | undefined): number | null {
  const want = phaseNumber(phase);
  for (const l of labels) {
    const p = parseLabel(l);
    if (p && (want === null || p.phase === want)) return p.run;
  }
  return null;
}

/** Text under the Phase column, round 80 answer 16 (Q-A l138): "phase 4 run 1, started 2026-11-04 00:15 PST". PST only. */
export function runText(status: StatusFile, runNumber: number | null): string | null {
  const n = phaseNumber(status.phase);
  if (n === null) return null;
  let start = runIdText(status.run_id);
  if (start === null) {
    const e = parseUtcIso(status.started_utc);
    start = e === null ? null : pstDateTime(e);
  }
  if (runNumber === null && start === null) return null;
  return `phase ${n}` + (runNumber === null ? "" : ` run ${runNumber}`) + (start === null ? "" : `, started ${start}`);
}

// ---------------------------------------------------------------- label of a status.json (the same as label_of in store.py)

/**
 * Same label as `label_of` of store.py:102-127 for the same input. `alive` is the answer of the pid check.
 * No status or state not-started: Not started. State running: Stopped unexpectedly if the pid is gone or the heartbeat is older than 120 s,
 * else Running (Running with pause requested if the file PAUSE exists). State stopped: Stopped by failure for the failure reasons, else Stopped.
 * State completed: Completed. Any other state: Not started.
 */
export function baseLabelOf(status: StatusFile | null, pauseExists: boolean, alive: boolean, now: number): BaseKey {
  if (!status || status.state === "not-started") return "not-started";
  if (status.state === "running") {
    const hb = parseUtcIso(status.heartbeat_utc);
    const age = hb === null ? STALE_S + 1 : now - hb;
    if (!alive || age > STALE_S) return "unexpected";
    return pauseExists ? "running-pause" : "running";
  }
  if (status.state === "stopped") return FAILURE_REASONS.includes(status.stop_reason ?? "") ? "failure" : "stopped";
  if (status.state === "completed") return "completed";
  return "not-started";
}

// ---------------------------------------------------------------- marks

/**
 * The word and the press time of a mark. Round 78 answer 11 (Q-A l73): the Run mark that a Restart leaves keeps the word Restart (key `after`).
 * Round 79 answer 11 (Q-A l103): the row shows the press time. Round 80 answer 14 (Q-A l136): the press time will move into `requested_utc`
 * and `restart_requested_utc` goes away. The code of TR77c still writes both keys, so this function reads `restart_requested_utc` when it is
 * present and else `requested_utc`. The row is right before and after the code change [aki-main proposal in the brief of VW77a].
 */
export function markInfo(mark: MarkFile | null): { word: "Run" | "Resume" | "Restart"; epoch: number | null } | null {
  if (!mark) return null;
  if (mark.action === "restart") return { word: "Restart", epoch: parseUtcIso(mark.requested_utc) };
  if (mark.action === "run") {
    if (mark.after === "restart") return { word: "Restart", epoch: parseUtcIso(mark.restart_requested_utc) ?? parseUtcIso(mark.requested_utc) };
    return { word: "Run", epoch: parseUtcIso(mark.requested_utc) };
  }
  if (mark.action === "resume") return { word: "Resume", epoch: parseUtcIso(mark.requested_utc) };
  return null;
}

// ---------------------------------------------------------------- derived facts from pilot lists

const FINAL_LIST_STATES = ["completed", "completed with failures", "interrupted"]; // progress.py:16
const CRITIC_PREFIX = "box-critic.";

function stripData(p: string): string {
  return p.replace(/^\/+/, "").replace(/^data\//, "");
}

function failureStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x : (asStr(rec(x)?.text) ?? ""))).filter((x) => x !== "");
}

function errorOf(page: string, folder: string | null, raw: string): DerivedError {
  const i = raw.indexOf(": ");
  const tag = i > 0 ? raw.slice(0, i).trim() : "";
  const isBox = /^(box-critic\.)?(TS|TL|ED|QA)_[0-3]$/.test(tag);
  return {
    page,
    box: isBox ? tag : null,
    text: isBox ? raw.slice(i + 2) : raw,
    file: isBox && folder ? `${stripData(folder)}/failed/${tag}.json` : null,
  };
}

/**
 * Facts of one book from the list folders that hold it. `lists` can hold lists of other books too. A list holds the book when a page row
 * has an ID that starts with `slug/`. Returns null when no list holds the book. The newest list is the one with the highest stamp.
 */
export function deriveFacts(slug: string, lists: ListInput[]): DerivedFacts | null {
  const held = [...lists].filter((l) => pagesOf(l, slug).length > 0).sort((a, b) => (a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : 0));
  if (held.length === 0) return null;
  const done = new Set<string>();
  let cost = 0;
  let seconds = 0;
  let last: number | null = null;
  for (const l of held) {
    for (const p of pagesOf(l, slug)) {
      const id = String(p.page_id);
      if (p.state === "done") done.add(id);
      cost += asNum(p.models_usd) ?? 0;
      const s = asNum(p.started_epoch);
      const e = asNum(p.ended_epoch);
      if (s !== null && e !== null && e >= s) seconds += e - s;
      if (e !== null && (last === null || e > last)) last = e;
    }
  }
  const n = held[0];
  const rows = pagesOf(n, slug);
  const prog = rec(n.progress) ?? {};
  const chain = chainOf(n, slug);
  let stop: { id: string; e: number } | null = null;
  for (const p of rows) {
    const e = asNum(p.ended_epoch);
    if ((p.state === "done" || p.state === "failed") && e !== null && (stop === null || e > stop.e)) stop = { id: String(p.page_id), e };
  }
  const running = rows.find((p) => p.state === "running");
  const waiting = rows.find((p) => p.state === "waiting");
  // Failure texts of the book in the newest list. Newer lists store forward_failures and critic_failures. Older lists store `failures` only,
  // and the prefix "box-critic." marks a critic failure.
  const errors: DerivedError[] = [];
  let forward: DerivedError | null = null;
  const sumPagesRaw = rec(n.summary)?.pages;
  const sumPages: unknown[] = Array.isArray(sumPagesRaw) ? sumPagesRaw : [];
  for (const sp of sumPages) {
    const s = rec(sp);
    const id = asStr(s?.page_id);
    if (!s || !id || !id.startsWith(slug + "/")) continue;
    const folder = asStr(s.folder) ?? asStr(rows.find((p) => p.page_id === id)?.folder);
    const hasSplit = Array.isArray(s.forward_failures) || Array.isArray(s.critic_failures);
    const fwd = hasSplit ? failureStrings(s.forward_failures) : failureStrings(s.failures).filter((t) => !t.startsWith(CRITIC_PREFIX));
    const crit = hasSplit ? failureStrings(s.critic_failures) : failureStrings(s.failures).filter((t) => t.startsWith(CRITIC_PREFIX));
    for (const t of fwd) {
      const e = errorOf(id, folder, t);
      errors.push(e);
      if (forward === null) forward = e;
    }
    for (const t of crit) errors.push(errorOf(id, folder, t));
  }
  // A failed page row with no stored text still counts as one error.
  if (errors.length === 0) {
    const failed = rows.find((p) => p.state === "failed");
    if (failed) errors.push({ page: String(failed.page_id), box: null, text: "The page ended with a failure. No text is stored.", file: null });
  }
  const state = asStr(prog.state) ?? "unknown";
  return {
    listCount: held.length,
    pagesDone: done.size,
    costUsd: cost,
    seconds,
    lastEventEpoch: last,
    newest: {
      stamp: n.stamp,
      state,
      final: !["running", "paused"].includes(state),
      updatedEpoch: asNum(prog.updated_epoch),
      startedEpoch: asNum(prog.started_epoch),
      pauseFile: n.pauseExists,
      chainState: chain,
      runningPage: running ? String(running.page_id) : null,
      runningBoxes: Array.isArray(running?.running) ? (running.running as unknown[]).map(String) : [],
      anyRunning: !!running,
      anyWaiting: !!waiting,
      stopPage: stop ? stop.id : null,
      nextPage: waiting ? String(waiting.page_id) : null,
      errors,
      forwardFailure: forward,
    },
  };
}

function pagesOf(l: ListInput, slug: string): Record<string, unknown>[] {
  const pages = rec(l.progress)?.pages;
  if (!Array.isArray(pages)) return [];
  return pages.filter((p): p is Record<string, unknown> => rec(p) !== null && typeof rec(p)?.page_id === "string" && String(rec(p)?.page_id).startsWith(slug + "/"));
}

function chainOf(l: ListInput, slug: string): string | null {
  for (const src of [rec(l.list), rec(l.summary)]) {
    const chains = src?.chains;
    if (Array.isArray(chains)) {
      const c = chains.map(rec).find((x) => x?.book === slug);
      if (c && typeof c.state === "string") return c.state;
    }
  }
  return null;
}

/** Final state words of a list folder, used by the server to find "the last list ended" (VISION 15.24.4.1). */
export function isFinalListState(state: string): boolean {
  return FINAL_LIST_STATES.includes(state) || !["running", "paused"].includes(state);
}

// ---------------------------------------------------------------- rows

function blankRow(f: BookFacts, key: LabelKey): MonitorRow {
  const l = LABELS[key];
  return {
    slug: f.slug,
    title: f.title || f.slug,
    key,
    label: l.text,
    baseLabel: l.text,
    symbol: l.symbol,
    group: l.group,
    pilot: false,
    phase: null,
    phaseId: null,
    run: null,
    pagesDone: null,
    pagesTotal: null,
    cost: null,
    minutes: null,
    line2: [],
    note: null,
    warning: null,
    error: null,
    errorFile: null,
    errorCount: 0,
    eventEpoch: null,
    statusFile: null,
    buttons: [],
    refused: null,
    markText: null,
    markUtc: null,
  };
}

/** Third line (VISION 15.24.4.3): "Error on p089, box box-critic.TS_3: invalid JSON: ...". The text is never cut. The word "Error" is always there. */
export function errorLine(page: string | null | undefined, box: string | null | undefined, text: string): string {
  const t = box && text.startsWith(box + ": ") ? text.slice(box.length + 2) : text;
  const p = pageShort(page);
  return `Error${p ? ` on ${p}` : ""}${box ? `, box ${box}` : ""}: ${t}`;
}

function sentence(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : t + ".";
}

function stripStopped(text: string): string {
  return text.replace(/^stopped:\s*/i, "");
}

function boxesText(boxes: string[] | undefined): string {
  const b = (boxes ?? []).filter((x) => typeof x === "string" && x !== "");
  return b.length === 0 ? "" : b.length === 1 ? `, box ${b[0]}` : `, boxes ${b.join(", ")}`;
}

function statusRow(f: BookFacts, st: StatusFile, now: number): MonitorRow {
  const key = baseLabelOf(st, f.pauseExists, f.pidAlive, now);
  const r = blankRow(f, key);
  const upd = parseUtcIso(st.updated_utc);
  r.eventEpoch = upd;
  if (key === "not-started") {
    r.line2 = ["No run yet."];
    return r;
  }
  r.phase = phaseText(st.phase) ?? "Phase not stored";
  r.run = runText(st, f.runNumber);
  r.pagesDone = asNum(st.pages_done) ?? 0;
  r.pagesTotal = asNum(st.pages_total) || null;
  r.cost = asNum(st.cost_usd_models_phase);
  const sec = asNum(st.seconds_phase);
  r.minutes = sec === null ? null : Math.round(sec / 60);
  const next = pageShort(st.next_page);
  const last = pageShort(st.last_accepted_page);
  const at = upd === null ? "" : ` at ${pstClock(upd)}`;
  const segs: Seg[] = [];
  if (key === "running" || key === "running-pause") {
    const hb = parseUtcIso(st.heartbeat_utc);
    const start = parseUtcIso(st.started_utc);
    const page = pageShort(st.running_page);
    const parts: string[] = [];
    if (key === "running-pause") parts.push("Pause requested. The process finishes the current page, then ends.");
    if (page) parts.push(`Now: ${page}${boxesText(st.running_boxes)}.`);
    if (start !== null) parts.push(`Running since ${pstStamp(start)} (${duration(now - start)}).`);
    segs.push(parts.join(" "));
    if (hb !== null) segs.push(parts.length ? " Last sign of life " : "Last sign of life ", { ago: hb, secs: true }, ".");
    if (next) segs.push(` Next page: ${next}.`);
  } else if (key === "unexpected") {
    const hb = parseUtcIso(st.heartbeat_utc);
    const who = f.pidAlive ? "the process is silent" : "the process is gone";
    segs.push(hb === null ? `No update is stored: ${who}.` : `No update for ${Math.floor((now - hb) / 60)} min: ${who}.`);
    segs.push(last ? ` Last page done: ${last}.` : " No page done yet.");
  } else if (key === "stopped") {
    if (st.stop_reason === "pause") {
      segs.push(`Stopped by Pause${at}. ` + (last ? `Last saved page ${last}.` : "No page saved yet.") + " " + (next ? `Resume starts at ${next}.` : "Resume start page not stored."));
    } else if (st.stop_reason === "ctrl-c") {
      segs.push(`Stopped by Ctrl-C${at}. ` + (next ? `Page ${next} was not saved. Resume starts at ${next}.` : "Resume start page not stored."));
    } else if (st.stop_reason === "restart") {
      segs.push(`Stopped by Restart${at}. The run files moved to the archive folder.`);
    } else {
      segs.push(`Stopped${at}.` + (st.stop_text ? ` ${sentence(stripStopped(st.stop_text))}` : "") + (next ? ` Resume starts at ${next}.` : ""));
    }
  } else if (key === "failure") {
    // stop_text names the cause (store.py writes "stopped: ..."). Without it, the row names the stop reason from the file.
    const why = (st.stop_reason ?? "").replace("-", " ");
    segs.push(`Stopped by failure${at}.` + (st.stop_text ? ` ${sentence(stripStopped(st.stop_text))}` : ` Reason: ${why}.`) + (last ? ` Last saved page ${last}.` : "") + (next ? ` Resume starts at ${next}.` : ""));
  } else if (key === "completed") {
    segs.push(`Completed${upd === null ? "" : " at " + pstStamp(upd)}`);
    if (upd !== null) segs.push(", ", { ago: upd });
    segs.push(`. ${r.pagesDone}${r.pagesTotal ? " of " + r.pagesTotal : ""} pages done.`);
  }
  r.line2 = segs;
  const le = st.last_error;
  const lt = asStr(le?.text);
  if (le && lt) {
    r.error = errorLine(le.page, le.box, lt);
    r.errorFile = asStr(le.file) ? stripData(le.file as string) : null;
    r.errorCount = 1;
  }
  return r;
}

function chainStop(chainState: string): { reason: string; page: string | null } {
  const m = /^stopped:\s*(.*?)(?:\s+on\s+([^\s/]+\/p\d+))?\s*$/.exec(chainState);
  const reason = m ? m[1] : chainState;
  return { reason: reason === "QA_3 FAIL" ? "QA_3 FAIL (old rule)" : reason, page: m?.[2] ?? null };
}

function derivedRow(f: BookFacts, d: DerivedFacts, now: number): MonitorRow {
  const n = d.newest;
  const chainStopped = n.chainState !== null && n.chainState.startsWith("stopped:") && n.chainState !== "stopped: interrupted";
  const bookRuns = !n.final && (n.chainState === "running" || n.anyRunning || (n.chainState === null && n.anyWaiting));
  const age = n.updatedEpoch === null ? DERIVED_STALE_S + 1 : now - n.updatedEpoch;
  let key: BaseKey;
  if (bookRuns) key = age > DERIVED_STALE_S ? "unexpected" : n.state === "paused" || n.pauseFile ? "running-pause" : "running";
  else if (chainStopped) key = "failure";
  // A forward failure with no chain state: not a Ctrl-C (VISION 15.24.4.2: Ctrl-C needs "no page of the book has a forward failure"), so a failure [unit default VW77a].
  else if (n.forwardFailure !== null) key = "failure";
  else key = "stopped";
  const r = blankRow(f, key);
  r.pilot = true;
  // Round 81 answer 22 (Q-A 2026-11-02 l27): "Empty cell". A pilot row shows an empty phase cell, not "Phase not stored". The status row (statusRow) keeps its text.
  r.phase = null;
  r.pagesDone = d.pagesDone;
  r.pagesTotal = f.bookPages;
  r.cost = d.costUsd;
  r.minutes = Math.round(d.seconds / 60);
  r.eventEpoch = d.lastEventEpoch;
  const stopPage = pageShort(n.stopPage);
  const segs: Seg[] = [];
  if (key === "running" || key === "running-pause") {
    const parts: string[] = [];
    if (key === "running-pause") parts.push("Pause requested. The list waits before each call.");
    const page = pageShort(n.runningPage);
    if (page) parts.push(`Now: ${page}${boxesText(n.runningBoxes)}.`);
    if (n.startedEpoch !== null) parts.push(`Running since ${pstStamp(n.startedEpoch)} (${duration(now - n.startedEpoch)}).`);
    segs.push(parts.join(" "));
    if (n.updatedEpoch !== null) segs.push(parts.length ? " Last sign of life " : "Last sign of life ", { ago: n.updatedEpoch, secs: true }, ".");
    const next = pageShort(n.nextPage);
    if (next) segs.push(` Next page: ${next}.`);
    // VISION 15.24.4.2, notes: between 600 s and 1800 s a Running row shows the warning.
    if (age >= WARN_AFTER_S) r.warning = `No update for ${Math.floor(age / 60)} min. A long call can take 25 min.`;
  } else if (key === "unexpected") {
    segs.push(n.updatedEpoch === null ? "No update is stored: the process is gone." : `No update for ${Math.floor(age / 60)} min: the process is gone.`);
    segs.push(stopPage ? ` Last page done: ${stopPage}.` : " No page done yet.");
  } else {
    // Stopped or Stopped by failure: "Stopped at p050: the list finished. Oct 28 23:50 PST, 21 h ago. 3 list folders. Next page: not stored."
    const cs = chainStopped ? chainStop(n.chainState as string) : null;
    const at = pageShort(cs?.page ?? null) ?? stopPage;
    let why: string;
    if (cs) why = cs.reason;
    else if (n.forwardFailure) why = `failure${n.forwardFailure.box ? ` in box ${n.forwardFailure.box}` : ""}: ${n.forwardFailure.text}`;
    else if (n.errors.length > 0) why = `the list ended with ${n.errors.length} error${n.errors.length === 1 ? "" : "s"}`;
    else if (n.chainState === "interrupted" || n.chainState === "stopped: interrupted" || n.state === "interrupted") why = "the list was interrupted";
    else why = n.final ? "the list finished" : "its pages in the list finished";
    segs.push(`Stopped${at ? ` at ${at}` : ""}: ${why}.`);
    if (d.lastEventEpoch !== null) segs.push(` ${pstStamp(d.lastEventEpoch)}, `, { ago: d.lastEventEpoch }, ".");
    if (d.listCount > 1) segs.push(` ${d.listCount} list folders.`);
    // The sketches of VISION 15.24.8 show "Next page" on the rows without an error text, not on the row of ogawa_lecture_part2 [agent inference].
    if (n.errors.length === 0) segs.push(` Next page: ${pageShort(n.nextPage) ?? "not stored"}.`);
  }
  r.line2 = segs;
  // Error line: the first error of the newest list. Round 70 and VISION 15.24.4.3: the third line is red and shows the text in full.
  const e = n.errors[0];
  if (e) {
    r.error = errorLine(e.page, e.box, e.text);
    r.errorFile = e.file;
    r.errorCount = n.errors.length;
  }
  return r;
}

function unreadableRow(f: BookFacts): MonitorRow {
  const r = blankRow(f, "unreadable");
  r.statusFile = f.statusFile;
  r.line2 = [`The file ${f.statusFile} cannot be read. The other books are not affected.`];
  return r;
}

// ---------------------------------------------------------------- buttons

export const PHASE2_GATE_REASON = "Run is off until phase 2 prompt files exist"; // [aki-main proposal in the brief of VW77b1]

function pidText(f: BookFacts): string {
  const pid = f.status?.pid;
  return typeof pid === "number" && Number.isInteger(pid) && pid > 0 ? ` (pid ${pid})` : "";
}

/**
 * The four buttons of one row (VISION 15.27.3, 15.29.2, 15.33.3). Round 81 answers 19 and 25 (Q-A 2026-11-02 l24, l30), brief of unit VW77b1.
 *   Not started (no status.json, or state not-started) and pilot rows: Run (phase agent-phase-3). A pilot list is no real run [unit default VW77b1].
 *   Running: Pause, with Run and Resume grayed ("Resume is off because this book runs now (pid 4821)", VISION 4003).
 *   Running with pause requested: Pause grayed ("Pause is already requested") [unit default VW77b1].
 *   Running while a Restart mark waits: no buttons (round 79 answer 13, Q-A 2026-11-01 l105). A refused Restart mark does not count.
 *   A mark waits (request.json exists, no process): Run and Resume grayed ("A mark waits: Run requested 08:40 PST") [unit default VW77b1].
 *   Stopped (Pause or Ctrl-C), Stopped by failure, Stopped unexpectedly: Resume (VISION 15.29.2 lists Resume for all three).
 *   Completed in phase 3: Run phase 4. Run (phase 3) is grayed until the 16 phase 2 prompt files exist [aki-main proposal in the brief of VW77b1].
 * Unit VW77b2 (round 82) adds two buttons:
 *   Restart (VISION 15.29.2, 15.29.3; round 76 answer 5): in every state with a run (Running, Stopped, Stopped by failure, Stopped unexpectedly, Completed).
 *     Not on a Not started row, a Waiting for a run row (VISION 15.29.3, last lines), a pilot row, an unreadable row, or a Running row while a Restart mark waits.
 *     While another mark waits (request.json exists) it shows grayed with the reason in words: a Running row with a Run mark, a row with a refused Restart mark.
 *   Clear mark (round 82 answer 10): on a row where request.json exists and no live process runs the book (a Waiting for a run row, a row with a refused Restart).
 *     Never on a Running row. Never on an unreadable-status row.
 * Unit TF83 (round 83 answer 11, round 84 answer 2): on a Run mark with `after: "restart"` the Clear mark button shows grayed with the reason
 *   "Clear mark is off because this mark starts the new run after a Restart." The route answers 409 with the same words. Other marks keep their rules.
 * The link Details is no button: components/BookRow.tsx draws it on every row, also on a row with no button (unit VW77c, round 86).
 */
export function actionButtons(f: BookFacts, r: Pick<MonitorRow, "pilot" | "baseLabel">, base: LabelKey, mark: ReturnType<typeof markInfo>, refusedNow: boolean): ActionButton[] {
  const unreadable = base === "unreadable";
  const runs = base === "running" || base === "running-pause";
  const markPresent = f.mark !== null || f.markUnreadable;
  const when = mark && mark.epoch !== null ? ` ${pstClock(mark.epoch)}` : "";
  const waitReason = !markPresent ? null : mark ? `A mark waits: ${mark.word} requested${when}${refusedNow ? " (refused)" : ""}` : "A mark waits: the file request.json is there";
  const restartWaits = runs && mark?.word === "Restart" && !refusedNow;
  const noRealRun = !unreadable && (!f.status || base === "not-started");
  const stopReason = f.status?.stop_reason ?? null;
  const here = `This book is: ${r.baseLabel}.`;
  const canRestart = !unreadable && !r.pilot && !noRealRun;

  // Why the action does not fit the book state. Null means it fits.
  const why: Record<ActionId, string | null> = {
    restart: unreadable
      ? "The file status.json cannot be read."
      : r.pilot
        ? "Restart is for a real run. A pilot list is no real run."
        : noRealRun
          ? "Restart is for a book with a run. This book has no run yet."
          : restartWaits
            ? "A Restart is requested already."
            : null,
    clear: unreadable
      ? "The file status.json cannot be read."
      : !markPresent
      ? "There is no mark to clear."
      : runs
        ? `Clear mark is for a book with no live process. This book runs now${pidText(f)}`
        : clearOffReason(f.mark), // unit TF83 (round 83 answer 11, round 84 answer 2): grayed on the Run mark that a Restart leaves
    pause: unreadable
      ? "The file status.json cannot be read."
      : r.pilot && runs
        ? "Pause of a pilot list is on the Lists tab."
        : !runs
          ? `Pause is for a Running book. ${here}`
          : restartWaits
            ? "Pause is off because a Restart mark waits."
            : base === "running-pause"
              ? "Pause is already requested"
              : null,
    run: unreadable
      ? "The file status.json cannot be read."
      : r.pilot && runs
        ? "Run is off because a pilot list runs this book now. Use Pause on the Lists tab."
        : runs
          ? `Run is off because this book runs now${pidText(f)}`
          : !noRealRun
            ? `Run is for a book with no run yet. ${here}`
            : !f.phase2Ready
              ? PHASE2_GATE_REASON
              : null,
    run4: unreadable
      ? "The file status.json cannot be read."
      : base === "completed" && f.status?.phase === "agent-phase-3"
        ? null
        : `Run phase 4 is for a Completed book of phase 3. ${here}`,
    resume: unreadable
      ? "The file status.json cannot be read."
      : runs
        ? `Resume is off because this book runs now${pidText(f)}`
        : noRealRun
          ? "Resume is for a stopped book. This book has no run yet."
          : r.pilot
            ? "Resume is for a stopped book. A pilot list is no real run."
            : base === "failure" || base === "unexpected"
              ? null
              : base === "stopped" && (stopReason === "pause" || stopReason === "ctrl-c")
                ? null
                : base === "stopped"
                  ? `Resume does not fit this stop (${stopReason ?? "no reason is stored"}).`
                  : `Resume is for a stopped book. ${here}`,
  };

  let show: ActionId[] = [];
  if (unreadable || restartWaits) show = [];
  else if (runs && r.pilot) show = ["run"];
  else if (runs) show = ["pause", "restart", "run", "resume"];
  // A mark waits and no process runs: the row is in Waiting for a run (no Restart button there) or it holds a refused Restart (Restart grayed, VISION 15.34.5).
  else if (markPresent) show = [...(canRestart && refusedNow ? (["restart"] as ActionId[]) : []), "run", "resume", "clear"];
  else if (noRealRun) show = ["run"];
  else show = [...(canRestart ? (["restart"] as ActionId[]) : []), ...(why.run4 === null ? (["run4"] as ActionId[]) : why.resume === null ? (["resume"] as ActionId[]) : [])];

  return (["pause", "restart", "run", "run4", "resume", "clear"] as ActionId[]).map((id) => {
    const shown = show.includes(id);
    // Pause is no mark: a mark on a running book does not block it. Clear mark removes the mark. Every other action waits while request.json exists.
    const blockedByMark = id !== "pause" && id !== "clear" && markPresent;
    const enabled = shown && why[id] === null && !blockedByMark;
    // Clear mark is the one button that the mark itself does not block, so its own reason comes first (unit TF83).
    const reason = !shown || enabled ? null : runs || id === "clear" ? (why[id] ?? waitReason) : (waitReason ?? why[id]);
    return { id, label: ACTION_LABELS[id], show: shown, enabled, reason, stateReason: why[id] };
  });
}

/** Build the row of one book. `now` is the clock in epoch seconds. */
export function buildRow(f: BookFacts, now: number): MonitorRow {
  if (f.statusUnreadable) {
    const u = unreadableRow(f);
    u.buttons = actionButtons(f, u, "unreadable", null, false);
    return u;
  }
  let r: MonitorRow;
  if (f.status) r = statusRow(f, f.status, now);
  else if (f.derived) r = derivedRow(f, f.derived, now);
  else {
    r = blankRow(f, "not-started");
    r.line2 = [];
  }
  const baseKey = r.key;
  const m = markInfo(f.mark);
  // Unit VW77b2: the words of the mark for the Clear mark dialog, and its press time for the Clear mark press.
  if (m) r.markText = `${m.word} requested${m.epoch === null ? "" : " " + pstClock(m.epoch)}`;
  else if (f.markUnreadable) r.markText = "request.json (cannot be read)";
  else if (f.mark) r.markText = "request.json (unknown action)";
  r.markUtc = typeof f.mark?.requested_utc === "string" ? f.mark.requested_utc : null;
  // Round 81 answers 15 and 16 (Q-A 2026-11-02 l20, l21): a Restart mark that the Translator refused keeps the group of the book state.
  // The Viewer finds it from the newest event `restart-refused`, which holds the `requested_utc` of the same mark.
  const refusedNow = !!(f.mark && f.mark.action === "restart" && f.refusal && f.refusal.requested_utc !== null && f.refusal.requested_utc === f.mark.requested_utc);
  if (refusedNow && f.refusal) {
    r.refused = `Restart refused: ${f.refusal.reason && f.refusal.reason.trim() !== "" ? f.refusal.reason.trim() : "no reason is stored."}`;
  } else if (m) {
    const runs = r.key === "running" || r.key === "running-pause";
    const when = m.epoch === null ? "" : ` ${pstClock(m.epoch)}`;
    const text = `${m.word} requested${when}`;
    if (runs) {
      // Round 78 answer 10 (Q-A l72): a Running row with a Restart mark stays Running, with the note "Restart requested 16:40".
      // Other marks on a running book: the same note [unit default VW77a]. The Monitor dashboard grays out Run and Resume there (round 80 answer 13).
      r.note = text;
    } else {
      // VISION 15.24.4.2: "Mark waiting: Resume requested HH:MM" in the group Waiting for a run.
      r.key = "mark-waiting";
      r.label = LABELS["mark-waiting"].text;
      r.symbol = LABELS["mark-waiting"].symbol;
      r.group = LABELS["mark-waiting"].group;
      r.line2 = [`Mark waiting: ${text}`];
      if (m.epoch !== null) r.eventEpoch = m.epoch;
      if (r.phase === null && f.mark?.phase) r.phase = phaseText(f.mark.phase);
    }
  } else if (f.markUnreadable) {
    r.warning = "The file request.json cannot be read.";
  } else if (f.mark) {
    r.warning = "The file request.json holds an action that this page does not know.";
  }
  r.phaseId = typeof f.status?.phase === "string" ? f.status.phase : null;
  r.buttons = actionButtons(f, r, baseKey, m, refusedNow);
  return r;
}

// ---------------------------------------------------------------- groups and summary

/**
 * Order of the rows (VISION 15.24.4.1, line 3916): the groups in GROUPS order. Inside a group the newest event comes first. Not started books sort by slug.
 * Unit TF85 (owner round 87 answer 9): the comparator lives in lib/row-order.ts and is a strict total order (group first, then the VISION rule).
 * The old comparator mixed the slug rule and the time rule across groups and gave a different order in Node and in Firefox (React error #418).
 */
export function sortRows(rows: MonitorRow[]): MonitorRow[] {
  return orderRows(rows, GROUPS);
}

export function groupRows(rows: MonitorRow[]): { group: GroupName; rows: MonitorRow[] }[] {
  const sorted = sortRows(rows);
  return GROUPS.map((g) => ({ group: g, rows: sorted.filter((r) => r.group === g) }));
}

/**
 * Whether a group shows (VISION 15.24.4.1): Needs attention, Running, and Not started always show. Waiting for a run, Stopped, and Completed show
 * when they hold a row [unit default of DD73 for Waiting for a run].
 */
export function groupShows(g: GroupName, count: number): boolean {
  return g === "Needs attention" || g === "Running" || g === "Not started" || count > 0;
}

/** Open or closed at the first visit: Needs attention, Waiting for a run, Running, and Stopped open. Completed and Not started closed (VISION 15.24.4.1). */
export function groupStartsOpen(g: GroupName): boolean {
  return g !== "Completed" && g !== "Not started";
}

/**
 * Summary line (VISION 15.24.4.1): "1 needs attention · 0 waiting for a run · 0 running · 11 stopped · 0 completed · 25 not started".
 * Round 81 answer 21 (Q-A 2026-11-02 l26): "Drop it (Recommended)". The line has no error count. The row keeps its red error line, and `errors` stays in the data.
 * The cost is the model cost of all rows.
 */
export function summarize(rows: MonitorRow[]): MonitorSummary {
  const counts = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<GroupName, number>;
  let errors = 0;
  let cost = 0;
  for (const r of rows) {
    counts[r.group] += 1;
    errors += r.errorCount;
    cost += r.cost ?? 0;
  }
  const text =
    `${counts["Needs attention"]} needs attention · ${counts["Waiting for a run"]} waiting for a run · ${counts["Running"]} running · ` +
    `${counts["Stopped"]} stopped · ${counts["Completed"]} completed · ${counts["Not started"]} not started`;
  return { counts, errors, costUsd: cost, text, costText: `Model cost of all books: ${money(cost)}` };
}

/** Tab title (VISION 15.24.4.1): "(1) Monitor dashboard" with the count of Needs attention. No prefix at 0. */
export function tabTitle(needsAttention: number): string {
  return needsAttention > 0 ? `(${needsAttention}) Monitor dashboard` : "Monitor dashboard";
}

/** Line of an empty group (VISION 15.24.4.1). `lastListEnd` is the end of the newest list folder that is no longer running, or null. */
export function emptyLine(g: GroupName, lastListEnd: number | null, now: number): string | null {
  if (g === "Needs attention") return "Nothing needs attention.";
  if (g === "Running") {
    return lastListEnd === null ? "Nothing runs now." : `Nothing runs now. The last list ended ${pstStamp(lastListEnd)} (${relativeTime(lastListEnd, now)}).`;
  }
  return null;
}

export const NO_RUN_TEXT = "No run found. Press Run on a book. The button writes a mark. Ask an opencode agent to run it."; // VISION 15.24.4.6
export const DATA_ERROR_TEXT = "The Monitor dashboard cannot read the Translator data folder. Check the key translatorDataDir in viewer.config.json."; // VISION 15.24.4.6
export const PHASE2_LINE = "Phase 2 (paired dataset): no run record yet."; // VISION 15.24.4.4
