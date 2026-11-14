// Live Phase 2 row of the Monitor dashboard "/" (unit VW91, round 91). Pure functions: no file access, no clock of their own, no server-only import.
// Owner pick Q-A 3:4.6 (2026-11-11 10:42 PST): "Small live row now (VW91)". Owner note Q-A 3:4.2: "Count the token usage (not the USD)".
// The server code (lib/phase2-load.ts) reads <data>/book-store/paired-dataset/status.json and history.jsonl, checks the pid, and passes the facts and the clock in.
// A test runs this file with plain node and the resolve hook (scripts/phase2-row-test.mjs). Use only erasable TypeScript syntax here (no enum, no parameter property).
//
// Sources:
//   <T2>/data/scripts/translator/store.py: new_status (the keys), BookStore.update, BookStore.history (rows {utc, event, ...}), utc_iso (form "2026-11-11T08:40:00Z").
//   The key tokens_phase {input, output, reasoning, cache_read, cache_write, calls} comes from the Translator unit TR91. An old status.json has no such key.
// State, stop and stale rules are NOT new: this file calls baseLabelOf, LABELS, errorLine, pageShort, and agoText of lib/book-status-rules.ts (the books rows use them too).
// This file adds no export to book-status-rules.ts, because the dev server keeps old module instances (see the note of lib/pst.ts).
import type { BaseKey, StatusFile } from "./book-status-rules";
import { LABELS, agoText, baseLabelOf, errorLine, pageShort } from "./book-status-rules";
import { jsonViewHref } from "./json-view";
import { parseUtcIso, pstStamp } from "./pst";
// Unit VW92 (round 91), Q-A 3:7.6: the quota wait (key "waiting" of status.json). The rules sit in the new file lib/phase2-wait.ts.
import { waitOf } from "./phase2-wait";
import type { Phase2Wait } from "./phase2-wait";
// Unit VW103 (round 91), Q-A 3:36.4: a content filter wait gets its own words (lib/phase2-wait-reason.ts), and the running update point is a field of the view (lib/update-live.ts).
import { waitExtraOf, waitTexts } from "./phase2-wait-reason";
import type { WaitExtra } from "./phase2-wait-reason";
import type { UpdateLive } from "./update-live";

/** Folder of the phase 2 store below the Translator data folder (PHASE2_BOOK in book-status.ts, prompts.py:26). */
export const PHASE2_DIR = "book-store/paired-dataset";
export const PHASE2_STATUS_REL = `${PHASE2_DIR}/status.json`;
export const PHASE2_HISTORY_REL = `${PHASE2_DIR}/history.jsonl`;
/** Title of the row. The same words as the old fixed line PHASE2_LINE (VISION 15.24.4.4). */
export const PHASE2_TITLE = "Phase 2 (paired dataset)";
/** [unit default VW91] The error line holds at most this many characters. A longer text ends with "…". The JSON viewer link opens the whole file. */
export const ERROR_MAX = 160;
/** [unit default VW91] The server reads this many bytes from the end of history.jsonl to find the last event. */
export const HISTORY_TAIL_BYTES = 65_536;

/** The five token counts of the key tokens_phase and the number of calls. A missing or wrong key is null. */
export interface Phase2Tokens {
  input: number | null;
  output: number | null;
  reasoning: number | null;
  cache_read: number | null;
  cache_write: number | null;
  calls: number | null;
}

/** What the server learns from the files. `file` is "missing" (no status.json), "bad" (exists, cannot be used), or "ok". */
export interface Phase2Input {
  file: "missing" | "bad" | "ok";
  status: unknown;
  pidAlive: boolean;
  pauseExists: boolean;
  /** The last row of history.jsonl, or null when the file is missing, empty, or holds no valid row. */
  lastEvent: Record<string, unknown> | null;
  historyExists: boolean;
}

/** The answer of the API for the row. JSON-safe. Epoch values are seconds. */
export interface Phase2View {
  kind: "status" | "unreadable";
  key: BaseKey | "unreadable";
  label: string;
  symbol: string;
  pagesDone: number | null;
  pagesTotal: number | null;
  /** Short page name: "p057". */
  runningPage: string | null;
  runningBoxes: string[];
  lastAccepted: string | null;
  /** Words after "Stop reason:". Null unless the state is Stopped or Stopped by failure. */
  stopReason: string | null;
  heartbeat: number | null;
  updated: number | null;
  /** Line of the state Stopped unexpectedly, made at the clock of the read (the same words as the books rows). */
  silentText: string | null;
  /** The error line, already short. */
  error: string | null;
  /** Path below the Translator data folder. The server sets it to null when the file does not exist. */
  errorFile: string | null;
  tokens: Phase2Tokens | null;
  lastEvent: { name: string; epoch: number | null } | null;
  /**
   * The quota wait (key "waiting" of status.json), or null. [unit default VW92] It is set only while the state is Running or Running with pause requested.
   * A key that stays in the file after a stop or a crash shows nothing, because the process no longer waits.
   */
  waiting: Phase2Wait | null;
  /** Unit VW103: the extra fields of the key "waiting" (wait n of 4, role). Missing or null when the key has none. */
  waitExtra?: WaitExtra | null;
  /** Unit VW103: the running update point, set by lib/phase2-load.ts. Null or missing when no update point runs. */
  update?: UpdateLive | null;
  statusHref: string;
  historyHref: string | null;
}

// ---------------------------------------------------------------- helpers

function rec(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/** A count: a whole number of 0 or more, else null. */
function asCount(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
}

/** "1234567" gives "1,234,567". The pattern, not the locale of the browser, so the server and the browser give the same text. */
export function thousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** One line of text with at most `max` characters. */
export function shorten(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

function stripData(p: string): string {
  return p.replace(/^\/+/, "").replace(/^data\//, "");
}

/** Path of the error file below the data folder, as the books rows do (strip "/" and "data/"). Null for an empty path or a path with "..". */
export function errorFilePath(file: unknown): string | null {
  const f = asStr(file);
  if (!f) return null;
  const rel = stripData(f.trim());
  return rel === "" || rel.split("/").includes("..") ? null : rel;
}

function boxesText(boxes: string[]): string {
  return boxes.length === 0 ? "" : boxes.length === 1 ? `, box ${boxes[0]}` : `, boxes ${boxes.join(", ")}`;
}

/** The token counts of status.json (key tokens_phase). Null when the key is missing or holds no valid count. */
export function tokensOf(v: unknown): Phase2Tokens | null {
  const t = rec(v);
  if (!t) return null;
  const out: Phase2Tokens = {
    input: asCount(t.input),
    output: asCount(t.output),
    reasoning: asCount(t.reasoning),
    cache_read: asCount(t.cache_read),
    cache_write: asCount(t.cache_write),
    calls: asCount(t.calls),
  };
  return Object.values(out).every((x) => x === null) ? null : out;
}

/**
 * Words for the stop reason. ctrl-c, pause, and restart use the same words as the books rows ("Stopped by Ctrl-C").
 * Another reason uses stop_text (store.py writes "stopped: ..."), else the stop_reason with spaces.
 */
export function stopReasonText(st: StatusFile): string | null {
  switch (st.stop_reason) {
    case "ctrl-c":
      return "Ctrl-C";
    case "pause":
      return "Pause";
    case "restart":
      return "Restart";
    default:
      break;
  }
  const text = asStr(st.stop_text);
  if (text) return shorten(text.replace(/^stopped:\s*/i, "").replace(/[.\s]+$/, ""), ERROR_MAX);
  const reason = asStr(st.stop_reason);
  return reason ? reason.replace(/-/g, " ") : null;
}

/** The last valid JSON object row in a text from the end of history.jsonl. `cut` is true when the text starts in the middle of the file: the first line may be partial. */
export function lastHistoryRow(text: string, cut: boolean): Record<string, unknown> | null {
  const lines = text.split("\n");
  if (cut) lines.shift();
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (!t) continue;
    try {
      const v = rec(JSON.parse(t));
      if (v) return v; // a row that the writer cut in the middle fails to parse and the loop goes on to the row before
    } catch {
      /* skip a broken or partial line */
    }
  }
  return null;
}

// ---------------------------------------------------------------- the view

/**
 * The row from the files. Returns null when status.json does not exist: the dashboard then shows the old fixed line (PHASE2_LINE).
 * A file that is not a JSON object gives the view "Status file unreadable" (the words of the books rows). The page never stops.
 */
export function buildPhase2(input: Phase2Input, now: number): Phase2View | null {
  if (input.file === "missing") return null;
  const statusHref = jsonViewHref(PHASE2_STATUS_REL);
  const historyHref = input.historyExists ? jsonViewHref(PHASE2_HISTORY_REL) : null;
  const base = { statusHref, historyHref };
  const raw = input.file === "ok" ? rec(input.status) : null;
  const st = raw as StatusFile | null;
  if (!raw || !st) {
    return {
      kind: "unreadable", key: "unreadable", label: LABELS.unreadable.text, symbol: LABELS.unreadable.symbol,
      pagesDone: null, pagesTotal: null, runningPage: null, runningBoxes: [], lastAccepted: null, stopReason: null, heartbeat: null, updated: null,
      silentText: null, error: null, errorFile: null, tokens: null, lastEvent: null, waiting: null, ...base,
    };
  }
  const key = baseLabelOf(st, input.pauseExists, input.pidAlive, now);
  const hb = parseUtcIso(st.heartbeat_utc);
  const le = rec(st.last_error);
  const lt = asStr(le?.text);
  const ev = input.lastEvent;
  const evName = ev ? asStr(ev.event) : null;
  let silentText: string | null = null;
  if (key === "unexpected") {
    const who = input.pidAlive ? "the process is silent" : "the process is gone";
    silentText = hb === null ? `No update is stored: ${who}.` : `No update for ${Math.floor((now - hb) / 60)} min: ${who}.`;
  }
  const boxes = Array.isArray(st.running_boxes) ? st.running_boxes.filter((b): b is string => typeof b === "string" && b !== "") : [];
  return {
    kind: "status",
    key,
    label: LABELS[key].text,
    symbol: LABELS[key].symbol,
    pagesDone: asNum(st.pages_done) ?? 0, // the same default as the books rows (statusRow)
    pagesTotal: asNum(st.pages_total) || null,
    runningPage: pageShort(asStr(st.running_page)),
    runningBoxes: boxes,
    lastAccepted: pageShort(asStr(st.last_accepted_page)),
    stopReason: key === "stopped" || key === "failure" ? stopReasonText(st) : null,
    heartbeat: hb,
    updated: parseUtcIso(st.updated_utc),
    silentText,
    error: le && lt ? shorten(errorLine(asStr(le.page), asStr(le.box), lt), ERROR_MAX) : null,
    errorFile: le && lt ? errorFilePath(le.file) : null,
    tokens: tokensOf(raw.tokens_phase),
    lastEvent: ev && evName ? { name: shorten(evName, 60), epoch: parseUtcIso(ev.utc) } : null,
    waiting: key === "running" || key === "running-pause" ? waitOf(raw.waiting) : null,
    waitExtra: key === "running" || key === "running-pause" ? waitExtraOf(raw.waiting) : null,
    update: null,
    ...base,
  };
}

// ---------------------------------------------------------------- the text of the row

export interface Phase2Link {
  text: string;
  href: string;
}

export interface Phase2Line {
  /** Name of the line for a test and for data-phase2-item. */
  key: string;
  text: string;
  /** Links that follow the text on the same line. */
  links?: Phase2Link[];
  error?: boolean;
}

export interface Phase2Text {
  lead: string;
  symbol: string;
  label: string;
  /** The title as one text: "Phase 2 (paired dataset): ● Running". */
  title: string;
  lines: Phase2Line[];
}

/**
 * The token line: "Tokens: input 1,234 · output 56 · reasoning 7 · cache read 8,901 · cache write 234 · 12 calls".
 * [unit default VW91] All five counts show on their own. A total would hide that cache reads are most of it. The USD cost does not show (Q-A 3:4.2).
 */
export function tokensText(t: Phase2Tokens | null): string {
  if (!t) return "Tokens: not recorded yet";
  const n = (v: number | null) => (v === null ? "–" : thousands(v));
  const calls = t.calls === null ? "–" : thousands(t.calls);
  return `Tokens: input ${n(t.input)} · output ${n(t.output)} · reasoning ${n(t.reasoning)} · cache read ${n(t.cache_read)} · cache write ${n(t.cache_write)} · ${calls} ${t.calls === 1 ? "call" : "calls"}`;
}

/** The text of the row at the clock `now` (epoch seconds). The browser calls this every 30 s with its own clock, so "12 s ago" moves with no request. */
export function phase2Text(v: Phase2View, now: number): Phase2Text {
  const lines: Phase2Line[] = [];
  const out = (key: string, text: string, extra: Partial<Phase2Line> = {}) => lines.push({ key, text, ...extra });
  const statusLink: Phase2Link = { text: "status.json", href: v.statusHref };
  const jsonLinks: Phase2Link[] = v.historyHref ? [statusLink, { text: "history.jsonl", href: v.historyHref }] : [statusLink];
  const head = { lead: PHASE2_TITLE + ":", symbol: v.symbol, label: v.label };
  const title = `${head.lead} ${v.symbol} ${v.label}`;
  if (v.kind === "unreadable") {
    out("unreadable", "The file status.json cannot be read as a JSON object. Open it in the JSON viewer to see the error.");
    out("links", "JSON viewer: ", { links: [statusLink] });
    return { ...head, title, lines };
  }
  if (v.key === "not-started") {
    out("no-run", "No run yet.");
    out("links", "JSON viewer: ", { links: jsonLinks });
    return { ...head, title, lines };
  }
  const done = v.pagesDone === null ? "–" : thousands(v.pagesDone);
  out("progress", v.pagesTotal === null ? `Pages done: ${done}` : `Pages done: ${done} of ${thousands(v.pagesTotal)}`);
  if (v.key === "running" || v.key === "running-pause") {
    if (v.key === "running-pause") out("pause", "Pause requested. The process finishes the current page, then ends.");
    if (v.runningPage) out("now", `Now: ${v.runningPage}${boxesText(v.runningBoxes)}.`);
    if (v.waiting) {
      // Unit VW92: the quota wait. The heartbeat stays fresh during a wait, so the state stays Running and these lines add the reason.
      const w = waitTexts(v.waiting, v.waitExtra, now); // unit VW103: a quota wait keeps its text, a content filter wait gets its own words
      out("waiting", w.main);
      if (w.detail) out("waiting-detail", w.detail);
    }
    if (v.heartbeat !== null) out("alive", `Last sign of life ${agoText(v.heartbeat, now, true)}.`);
  } else if (v.key === "unexpected" && v.silentText) {
    out("silent", v.silentText);
  }
  if (v.lastAccepted) out("last-accepted", `Last accepted page: ${v.lastAccepted}.`);
  else out("last-accepted", "No page accepted yet.");
  if (v.key === "stopped" || v.key === "failure") {
    const when = v.updated === null ? "" : ` (${pstStamp(v.updated)}, ${agoText(v.updated, now)})`;
    out("stop", `Stop reason: ${v.stopReason ?? "not stored"}${when}.`);
  } else if (v.key === "completed" && v.updated !== null) {
    out("completed", `Completed ${pstStamp(v.updated)} (${agoText(v.updated, now)}).`);
  }
  if (v.error) out("error", v.error, { error: true, links: v.errorFile ? [{ text: `File: ${v.errorFile}`, href: jsonViewHref(v.errorFile) }] : undefined });
  out("tokens", tokensText(v.tokens));
  if (v.lastEvent) {
    out("last-event", v.lastEvent.epoch === null ? `Last event: ${v.lastEvent.name}` : `Last event: ${v.lastEvent.name}, ${pstStamp(v.lastEvent.epoch)} (${agoText(v.lastEvent.epoch, now)})`);
  }
  out("links", "JSON viewer: ", { links: jsonLinks });
  return { ...head, title, lines };
}
