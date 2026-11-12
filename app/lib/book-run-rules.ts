// Book runs: pure rules (unit VW77e, Q-A 3:11.1 O1 and O2, Q-A 3:11.2 D1 to D4).
// No import of server code, no server-only marker, no file access, so S2, the Details view code, and a test script load it.
// The file reader that uses these rules is lib/book-runs.ts.
//
// Words of the owner that the rules rest on:
//   Round 78 answer 7 (2026-11-01): the run ID is "option 1, but PST time".
//   Round 76 answer 11: an open run with a FAIL page shows nothing for that page. A closed run is removed at the next S2 run.
//   Round 78 answer 8: one reader_opens record per book run, with the source "book-store".
//   Q-A 3:11.1 O1 and O2 (accepted): the run mark first, then the newest open book run with PASS, then the newest open pilot run with PASS. Newest = start time.
//   Q-A 3:11.2 D1 to D4 (accepted): run ID in folder form, page filter accepted + PASS, no read of paired-dataset, three places.

export const BOOK_STORE = "book-store";
/** D3: the phase 2 training store. It is no book. S2 and the Details view never read it. */
export const TRAINING_STORE = "paired-dataset";
/** The source value of reader_opens for a book run. Same text as OPEN_SOURCES of reader-opens-rule.ts. */
export const BOOK_RUN_SOURCE = "book-store";

/** D4: the three places of a book run in a book store folder. */
export type BookRunPlace = "current" | "archive" | "agent-phase-3";
export const PLACE_ORDER: BookRunPlace[] = ["current", "archive", "agent-phase-3"];
/** The folder of the phase 3 store (store.py move_phase puts the old phase there). */
export const PHASE3_FOLDER = "agent-phase-3";
export const ARCHIVE_FOLDER = "archive";

/** Text of the Place column. The phase 3 store shows its folder name. */
export function placeText(place: BookRunPlace): string {
  return place;
}

// ---------------------------------------------------------------- run ID forms (D1)

/** The folder form of a run ID, for example 20261111T183021-0800. It is the name of the archive folder (store.py run_id_folder). */
export const RUN_ID_FOLDER_RULE = /^\d{8}T\d{6}-0800$/;
/** The form in status.json, for example 2026-11-11T18:30:21-08:00. */
const RUN_ID_ISO_RULE = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)-08:00$/;

export function isRunIdFolder(s: unknown): s is string {
  return typeof s === "string" && RUN_ID_FOLDER_RULE.test(s);
}

/** "2026-11-11T18:30:21-08:00" gives "20261111T183021-0800". Any other text gives null (store.py raises on it). */
export function runIdFolderOf(iso: unknown): string | null {
  if (typeof iso !== "string") return null;
  const m = RUN_ID_ISO_RULE.exec(iso);
  return m ? `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6]}-0800` : null;
}

/** "20261111T183021-0800" gives "2026-11-11T18:30:21-08:00". Any other text gives null. */
export function runIdIsoOf(folder: unknown): string | null {
  if (!isRunIdFolder(folder)) return null;
  const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)-0800$/.exec(folder)!;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}-08:00`;
}

/** Same rule as isSafeSegment in lib/safe-path.ts (letters, digits, dot, dash, underscore; no "..", no leading dot). Copied here so that this file has no import. */
export function safeName(s: unknown): s is string {
  return typeof s === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s) && !s.includes("..");
}

/** True when the folder of the book store can hold book runs. D3: paired-dataset never does. */
export function isBookStoreName(name: unknown): name is string {
  return safeName(name) && name !== TRAINING_STORE;
}

// ---------------------------------------------------------------- pointer files (D2)

const PAGE_ID_RULE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/p\d+$/;

/** One pointer file pages/<page>.json of a book run, with the keys that S2 needs. */
export interface BookPointer {
  pageId: string;
  accepted: boolean;
  verdict: string | null;
  /** The page run folder, path below the data folder, for example pilot-run/94380515_p001/20261112T023022Z-r41. Null when the key is missing or unsafe. */
  folder: string | null;
}

function recordOf(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** The page run folder of a pointer: "data/pilot-run/<page folder>/<run folder>" gives "pilot-run/<page folder>/<run folder>". Anything else gives null. */
export function pointerFolderOf(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const parts = raw.replace(/^\/+/, "").replace(/^data\//, "").split("/");
  if (parts.length !== 3 || parts[0] !== "pilot-run") return null;
  return parts.every(safeName) ? parts.join("/") : null;
}

/** The page run folder name (last part) of a pointer folder, or null. */
export function pageRunNameOf(folder: string | null): string | null {
  return folder ? folder.split("/")[2] : null;
}

/** Parse one pointer file. Null when the page ID is missing or has a bad form. */
export function parsePointer(raw: unknown): BookPointer | null {
  const r = recordOf(raw);
  if (!r) return null;
  const pageId = typeof r.page_id === "string" ? r.page_id : "";
  if (!PAGE_ID_RULE.test(pageId)) return null;
  return {
    pageId,
    accepted: r.accepted === true,
    verdict: typeof r.verdict === "string" ? r.verdict : null,
    folder: pointerFolderOf(r.folder),
  };
}

/** D2: S2 takes a page of a book run only if its pointer has accepted true and the verdict PASS. */
export function pointerTakesPage(p: BookPointer): boolean {
  return p.accepted === true && p.verdict === "PASS";
}

// ---------------------------------------------------------------- order of the runs of one book (V1)

export interface PlacedRun {
  place: BookRunPlace;
  /** Folder form of the run ID, or null when the folder holds no readable start time (a phase 3 store with no run ID). */
  runId: string | null;
}

/**
 * V1: the current run first, then the archived runs (newest first), then the phase 3 run.
 * A run ID that appears twice keeps its first place (current, then archive, then phase 3) and the later copy goes into `duplicates`.
 */
export function orderBookRuns<T extends PlacedRun>(runs: T[]): { runs: T[]; duplicates: T[] } {
  const rank = (r: T) => PLACE_ORDER.indexOf(r.place);
  const sorted = [...runs].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.place === "archive") return (b.runId ?? "") < (a.runId ?? "") ? -1 : (b.runId ?? "") > (a.runId ?? "") ? 1 : 0;
    return 0;
  });
  const seen = new Set<string>();
  const kept: T[] = [];
  const duplicates: T[] = [];
  for (const r of sorted) {
    if (r.runId !== null && seen.has(r.runId)) {
      duplicates.push(r);
      continue;
    }
    if (r.runId !== null) seen.add(r.runId);
    kept.push(r);
  }
  return { runs: kept, duplicates };
}

// ---------------------------------------------------------------- the picker (O1 and O2)

export type CandidateSource = "pilot-run" | "book-store";

/** One finished run of one page that can give the Agent text. */
export interface ReaderCandidate<T> {
  source: CandidateSource;
  /** The page run folder name (the key of run_marks and of reader_pages.run_id). */
  pageRunId: string;
  /** The folder form of the book run ID. Null for a pilot candidate. */
  bookRunId: string | null;
  verdict: string;
  x: T;
}

export type PickWhy = "run mark" | "newest open book-run PASS" | "newest open PASS";

/**
 * Q-A 3:11.1 O1 and O2. The Agent text that readers see for one page:
 *   1. the run of the admin run mark, if that run is open (also with a FAIL verdict, as before)
 *   2. else the newest open book run with PASS on this page (newest = largest folder-form run ID = latest start time)
 *   3. else the newest open pilot run with PASS (`pilotNewestFirst` order, as today)
 *   4. else null: readers see no Agent text
 * `isOpen` gets the candidate. With no book candidate the result equals pickReaderRun of reader-opens-rule.ts.
 */
export function pickReaderCandidate<T>(
  book: ReaderCandidate<T>[],
  pilotNewestFirst: ReaderCandidate<T>[],
  markedRunId: string | null | undefined,
  isOpen: (c: ReaderCandidate<T>) => boolean,
): { cand: ReaderCandidate<T>; why: PickWhy } | null {
  if (markedRunId) {
    const hit = pilotNewestFirst.find((c) => c.pageRunId === markedRunId && isOpen(c)) ?? book.find((c) => c.pageRunId === markedRunId && isOpen(c));
    if (hit) return { cand: hit, why: "run mark" };
  }
  const books = book
    .filter((c) => c.verdict === "PASS" && c.bookRunId !== null && isOpen(c))
    .sort((a, b) => (a.bookRunId! < b.bookRunId! ? 1 : a.bookRunId! > b.bookRunId! ? -1 : 0));
  if (books.length > 0) return { cand: books[0], why: "newest open book-run PASS" };
  const pilot = pilotNewestFirst.find((c) => c.verdict === "PASS" && isOpen(c));
  return pilot ? { cand: pilot, why: "newest open PASS" } : null;
}

// ---------------------------------------------------------------- list kind (V4)

export type ListKind = "chain" | "book-run" | "list";

/** Text of the tag on the Details view: "book-run" for a book that has a run-book run, else "pilot list" for a derived pilot row, else no tag. */
export function bookTagText(hasBookRun: boolean, pilot: boolean): "book-run" | "pilot list" | null {
  if (hasBookRun) return "book-run";
  return pilot ? "pilot list" : null;
}
