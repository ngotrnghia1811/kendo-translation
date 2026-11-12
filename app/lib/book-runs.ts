// File reader for book runs (unit VW77e, Q-A 3:11.2 D1 to D4). Shared by the sync command S2 (scripts/sync-runs.mjs) and the Details view (lib/book-detail.ts).
// It reads files and writes none. It has no server-only marker, so plain Node can load it. The rules are in lib/book-run-rules.ts.
//
// A book store is <data folder>/book-store/<book>/. A book run lives in one of 3 places (D4):
//   current        the book folder itself:           status.json, pages/<page>.json
//   archive        archive/<run ID folder>/:         the same files (store.py archive_run moves them there when a run ends)
//   agent-phase-3  agent-phase-3/:                   the same files (store.py move_phase moves the phase 3 store there when phase 4 starts)
// D3: the folder book-store/paired-dataset (the phase 2 training store) is never read.
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  ARCHIVE_FOLDER,
  BOOK_STORE,
  PHASE3_FOLDER,
  isBookStoreName,
  isRunIdFolder,
  orderBookRuns,
  parsePointer,
  pointerTakesPage,
  runIdFolderOf,
  safeName,
  type BookPointer,
  type BookRunPlace,
} from "./book-run-rules";

export interface BookRunFacts {
  book: string;
  place: BookRunPlace;
  /** Folder of the run below the data folder, for example book-store/left_foot_full/archive/20261104T001500-0800. */
  dir: string;
  /** Folder form of the run ID (D1). Null when the folder holds no run ID in a readable form. */
  runId: string | null;
  /** Why runId is null, in words for a screen or a report. Null when runId is set. */
  noRunIdReason: string | null;
  phase: string | null;
  state: string | null;
  pagesDone: number | null;
  pagesTotal: number | null;
  pointers: BookPointer[];
  /** Files in pages/ that are not a readable pointer file. */
  badPointers: number;
}

function rec(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function readJsonAt(abs: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(abs, "utf-8"));
  } catch {
    return null;
  }
}

async function names(abs: string, dirs: boolean): Promise<string[]> {
  try {
    return (await fs.readdir(abs, { withFileTypes: true })).filter((i) => (dirs ? i.isDirectory() : i.isFile())).map((i) => i.name).sort();
  } catch {
    return [];
  }
}

async function exists(abs: string): Promise<boolean> {
  try {
    await fs.stat(abs);
    return true;
  } catch {
    return false;
  }
}

async function mapLimit<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/** The pointer files of one run folder: pages/<page>.json. Files that fail to parse count as bad. */
async function readPointers(runAbs: string): Promise<{ pointers: BookPointer[]; bad: number }> {
  const files = (await names(path.join(runAbs, "pages"), false)).filter((n) => n.endsWith(".json") && safeName(n));
  const docs = await mapLimit(files, 16, async (f) => parsePointer(await readJsonAt(path.join(runAbs, "pages", f))));
  const pointers = docs.filter((d): d is BookPointer => d !== null);
  return { pointers, bad: docs.length - pointers.length };
}

async function factsOf(dataDir: string, book: string, place: BookRunPlace, dir: string, idFromFolder: string | null): Promise<BookRunFacts | null> {
  const abs = path.join(dataDir, dir);
  const statusDoc = await readJsonAt(path.join(abs, "status.json"));
  const status = rec(statusDoc);
  const { pointers, bad } = await readPointers(abs);
  let runId: string | null = null;
  let reason: string | null = null;
  if (idFromFolder !== null) {
    // An archive folder is named by the run ID in folder form.
    runId = isRunIdFolder(idFromFolder) ? idFromFolder : null;
    reason = runId ? null : "The folder name is not a run ID in folder form.";
  } else {
    const fromStatus = status ? runIdFolderOf(status.run_id) : null;
    runId = fromStatus;
    reason = fromStatus ? null : status ? "status.json has no run_id in the form 2026-11-04T00:15:00-08:00." : "status.json is missing or cannot be read.";
  }
  // A current run or a phase 3 store with no status.json and no pointer is no run.
  if (place !== "archive" && !status && pointers.length === 0) return null;
  // A current run that has not started (run_id null) and has no pointer is no run yet.
  if (place === "current" && runId === null && pointers.length === 0) return null;
  return {
    book,
    place,
    dir,
    runId,
    noRunIdReason: reason,
    phase: typeof status?.phase === "string" ? status.phase : null,
    state: typeof status?.state === "string" ? status.state : null,
    pagesDone: num(status?.pages_done),
    pagesTotal: num(status?.pages_total),
    pointers,
    badPointers: bad,
  };
}

/** The book store folders that can hold book runs. D3: paired-dataset is left out. */
export async function listBookStoreBooks(dataDir: string): Promise<string[]> {
  return (await names(path.join(dataDir, BOOK_STORE), true)).filter(isBookStoreName);
}

export interface BookRunsRead {
  runs: BookRunFacts[];
  /** Runs left out because an earlier place holds the same run ID. */
  duplicates: BookRunFacts[];
}

/**
 * The book runs of one book in the 3 places, in the order of V1: current, archive (newest first), agent-phase-3.
 * A name that is not a book store folder (paired-dataset, D3, or an unsafe name) gives no run.
 */
export async function readBookRuns(dataDir: string, book: string): Promise<BookRunsRead> {
  if (!isBookStoreName(book)) return { runs: [], duplicates: [] };
  const base = `${BOOK_STORE}/${book}`;
  const found: BookRunFacts[] = [];
  const current = await factsOf(dataDir, book, "current", base, null);
  if (current) found.push(current);
  for (const name of (await names(path.join(dataDir, base, ARCHIVE_FOLDER), true)).filter(safeName)) {
    const r = await factsOf(dataDir, book, "archive", `${base}/${ARCHIVE_FOLDER}/${name}`, name);
    if (r) found.push(r);
  }
  if (await exists(path.join(dataDir, base, PHASE3_FOLDER))) {
    const r = await factsOf(dataDir, book, "agent-phase-3", `${base}/${PHASE3_FOLDER}`, null);
    if (r) found.push(r);
  }
  return orderBookRuns(found);
}

/** True when the run (folder-form run ID) of the book exists in one of the 3 places. */
export async function bookRunExistsOnDisk(dataDir: string, book: string, runId: string): Promise<boolean> {
  if (!isRunIdFolder(runId)) return false;
  const { runs } = await readBookRuns(dataDir, book);
  return runs.some((r) => r.runId === runId);
}

/** The count of pages that S2 takes from a run (D2) and the count of all pointer files. */
export function passCounts(run: Pick<BookRunFacts, "pointers">): { pass: number; total: number } {
  return { pass: run.pointers.filter(pointerTakesPage).length, total: run.pointers.length };
}
