// Rules and types of the Details view `/monitor/<slug>` (unit VW77c, round 86). Pure functions: no file access, no clock of their own, no server-only import.
// The server code (book-detail.ts) reads the files and passes the facts in. A test runs this file with plain node and the resolve hook.
// Use only erasable TypeScript syntax here (no enum, no parameter property).
//
// Sources:
//   VISION-viewer.md 15.24.5 (the 7 parts), 15.27.4 (stop flag), 15.27.5 (Archived runs, Critique share), 15.32.5 (run ID forms).
//   Q-A 2026-11-02 round 86 answer 21 (l205): the first column of Archived runs is named "Run ID" and shows the run start in PST.
//   <T2>/data/scripts/translator/store.py run_id_folder: 2026-11-04T00:15:00-08:00 gives the folder 20261104T001500-0800.
import type { MonitorRow } from "./book-status-rules";
import type { ShareResult, StopFlag } from "./critique-share";
import type { BookRunPlace } from "./book-run-rules";

export const BOX_TYPES = ["TS", "TL", "ED", "QA"] as const;
export type BoxType = (typeof BOX_TYPES)[number];

export const NO_ERROR_TEXT = "No error stored for this book."; // VISION 15.24.5, part 2
export const NO_LIST_TEXT = "No list folder holds this book.";
export const NO_ARCHIVE_TEXT = "No archived run.";
export const NO_SHARE_TEXT = "No update point ended in the current run.";
export const NO_CRITIQUE_TEXT = "No page of this book has critique counts yet.";

// ---------------------------------------------------------------- archived runs

/** The run ID in folder form `20261104T001500-0800` as screen text `2026-11-04 00:15 PST`. Any other form (for example `20261105T093000Z`) stays as plain text. */
export function archiveRunText(folder: string): { text: string; isRunId: boolean } {
  const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)-0800$/.exec(folder);
  if (!m) return { text: folder, isRunId: false };
  const [, y, mo, d, hh, mm] = m;
  const month = +mo;
  const day = +d;
  if (month < 1 || month > 12 || day < 1 || day > 31 || +hh > 23 || +mm > 59) return { text: folder, isRunId: false };
  return { text: `${y}-${mo}-${d} ${hh}:${mm} PST`, isRunId: true };
}

/** "80 of 169". Without a total, the count alone. Null for the count gives "Not stored". */
export function pagesDoneText(done: number | null, total: number | null): string {
  if (done === null) return "Not stored";
  return total ? `${done} of ${total}` : String(done);
}

export interface ArchivedRun {
  folder: string;
  /** "2026-11-04 00:15 PST" for a folder in run ID form, else the folder name as it is. */
  runText: string;
  runIdForm: boolean;
  phase: string | null;
  pagesDone: number | null;
  pagesTotal: number | null;
  pagesText: string;
  promptsStart: string;
  promptsEnd: string;
}

/**
 * One row of the table "Runs" (unit VW77e, Q-A 3:11.3 V1 and V2). The 5 built columns keep their values.
 * Place, Readers, and the button come after them. The run ID is the folder form (Q-A 3:11.2 D1).
 */
export interface BookRunRow extends ArchivedRun {
  /** Key of the row: the place and the folder. */
  key: string;
  place: BookRunPlace;
  placeText: string;
  /** Folder form of the run ID. It is the run_id of the open record. Null when the run holds no usable run ID: then the row has no button. */
  runId: string | null;
  /** Why the row has no run ID and no button. Null when runId is set. */
  noRunIdReason: string | null;
  /** Pages of this run that S2 takes: pointer with accepted true and verdict PASS (D2). */
  passPages: number;
  /** Pointer files of this run (the pages that the run wrote). */
  totalPages: number;
}

export const NO_RUNS_TEXT = "No run in the book store.";
export const NO_RUN_ID_TEXT = "No run ID";

/**
 * The two prompt cells of an archived run (VISION 15.27.5). Only the boxes whose label changed during the run show, for example
 * "ED_2 v4.1.0, TL_1 v4.1.0" at the start and "ED_2 v4.1.6, TL_1 v4.1.2" at the end [unit default VW77c].
 * `start` and `end` map a box to its label. A missing map gives "Not stored". No changed box gives "No update, all boxes keep <label>" on both cells.
 */
export function promptsCells(start: Record<string, string> | null, end: Record<string, string> | null): { start: string; end: string } {
  if (!start || !end) return { start: start ? listLabels(start, Object.keys(start)) : "Not stored", end: end ? listLabels(end, Object.keys(end)) : "Not stored" };
  const changed = Object.keys(end).filter((b) => start[b] !== undefined && start[b] !== end[b]);
  if (changed.length === 0) {
    const labels = [...new Set(Object.values(end))];
    const same = labels.length === 1 ? ` ${labels[0]}` : "";
    return { start: `No update, all boxes keep their label${same}`, end: `No update, all boxes keep their label${same}` };
  }
  return { start: listLabels(start, changed), end: listLabels(end, changed) };
}

function listLabels(map: Record<string, string>, boxes: string[]): string {
  return boxes.map((b) => `${b} ${map[b]}`).join(", ");
}

// ---------------------------------------------------------------- pages of the lists

export interface DetailPage {
  pageId: string;
  page: string; // "p050"
  state: string;
  running: string[];
  callsDone: number;
  callsTotal: number;
  callsFailed: number;
  usd: number;
  minutes: number | null;
  qa3Verdict: string | null;
  qa3Score: number | null;
  /** Link to the page view. Null when the page has no run folder. */
  href: string | null;
  /** Pairs that the page wrote into the book translation memory. Null when the list summary has no such key. */
  pairs: number | null;
  memoryWritten: boolean | null;
}

export interface DetailList {
  stamp: string;
  listKind: string;
  criticMode: string | null;
  bookJobs: number | null;
  state: string;
  startedEpoch: number | null;
  updatedEpoch: number | null;
  /** True while the list runs or waits on a pause. The fold heading then shows "running" for the end. */
  live: boolean;
  pages: DetailPage[];
}

export function pageShortName(pageId: string): string {
  const i = pageId.lastIndexOf("/");
  return i >= 0 ? pageId.slice(i + 1) : pageId;
}

// ---------------------------------------------------------------- critiques against N, settings used

export interface PageFacts {
  pageId: string;
  page: string;
  /** Key `critiques_by_box_type` of summary.json: critiques of each box type and whether a box of the type reached N. */
  byType: Record<string, { critiques: number; reached: boolean }>;
  n: number | null;
  /** "L0 gemini-3.8-flash-high high, L1 claude-haiku-5-5 xhigh" from `models` of run.json. Null when run.json is missing. */
  models: string | null;
  settingsSha1: string | null;
}

export interface CritiqueRow {
  pageId: string;
  page: string;
  counts: Record<BoxType, number>;
  reached: Record<BoxType, boolean>;
  n: number | null;
}

export interface SettingsRow {
  pageId: string;
  page: string;
  n: number | null;
  models: string | null;
  /** "Settings changed before this page" (VISION 15.24.5 part 7), true when N, the models, or the settings sha1 differ from the page before. */
  changed: boolean;
}

export const SETTINGS_CHANGED_TEXT = "Settings changed before this page";

function pageNumber(page: string): number {
  const m = /(\d+)$/.exec(page);
  return m ? +m[1] : Number.MAX_SAFE_INTEGER;
}

/** Pages in page order. */
export function sortPages<T extends { page: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => pageNumber(a.page) - pageNumber(b.page) || (a.page < b.page ? -1 : a.page > b.page ? 1 : 0));
}

export function critiqueRows(facts: PageFacts[]): CritiqueRow[] {
  return sortPages(facts.filter((f) => Object.keys(f.byType).length > 0)).map((f) => {
    const counts = {} as Record<BoxType, number>;
    const reached = {} as Record<BoxType, boolean>;
    for (const t of BOX_TYPES) {
      counts[t] = f.byType[t]?.critiques ?? 0;
      reached[t] = f.byType[t]?.reached === true;
    }
    return { pageId: f.pageId, page: f.page, counts, reached, n: f.n };
  });
}

/** The total row: the sum of each box type. `n` is the N of the pages when all pages share one value, else null (VISION 15.24.5, part 6: "against N = 2"). */
export function critiqueTotals(rows: CritiqueRow[]): { counts: Record<BoxType, number>; n: number | null; nMixed: boolean } {
  const counts = { TS: 0, TL: 0, ED: 0, QA: 0 } as Record<BoxType, number>;
  const ns = new Set<number | null>();
  for (const r of rows) {
    for (const t of BOX_TYPES) counts[t] += r.counts[t];
    ns.add(r.n);
  }
  const list = [...ns];
  return { counts, n: list.length === 1 ? list[0] : null, nMixed: list.length > 1 };
}

export function settingsRows(facts: PageFacts[]): SettingsRow[] {
  const sorted = sortPages(facts.filter((f) => f.n !== null || f.models !== null));
  const key = (f: PageFacts) => JSON.stringify([f.n, f.models, f.settingsSha1]);
  return sorted.map((f, i) => ({ pageId: f.pageId, page: f.page, n: f.n, models: f.models, changed: i > 0 && key(f) !== key(sorted[i - 1]) }));
}

/** "L0 gemini-3.8-flash-high high, L1 ..., critic claude-opus-5-5 medium" from the `models` block of run.json. Null when the block is missing. */
export function modelsText(models: unknown): string | null {
  if (models === null || typeof models !== "object" || Array.isArray(models)) return null;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(models as Record<string, unknown>)) {
    if (!Array.isArray(v) || typeof v[0] !== "string") continue;
    const model = v[0].includes("/") ? v[0].slice(v[0].indexOf("/") + 1) : v[0];
    const variant = typeof v[1] === "string" ? ` ${v[1]}` : "";
    const m = /^level_(\d)$/.exec(k);
    parts.push(`${m ? "L" + m[1] : k === "box-critic" ? "critic" : k} ${model}${variant}`);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

// ---------------------------------------------------------------- the whole answer

export interface LastError {
  /** The red line of the row: "Error on p089, box box-critic.TS_3: invalid JSON: ...". */
  text: string;
  /** Path below the data folder of the failed file. Null when no such file exists. */
  file: string | null;
  /** Time of the error in epoch seconds (key last_error.utc of status.json). Null when none is stored. */
  epoch: number | null;
}

export interface BookDetail {
  ok: true;
  generatedAt: number;
  /** The row of the Monitor dashboard `/`: the same facts, labels, sentence, and buttons. */
  row: MonitorRow;
  lastError: LastError | null;
  lists: DetailList[];
  critiques: CritiqueRow[];
  settings: SettingsRow[];
  share: ShareResult | null;
  flags: StopFlag[];
  /** The archived runs only. Kept for the API of unit VW77c. The Details view shows `runs`. */
  archived: ArchivedRun[];
  /** Unit VW77e: the current run, the archived runs (newest first), and the phase 3 run (Q-A 3:11.3 V1). */
  runs: BookRunRow[];
}
