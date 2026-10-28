import "server-only";
import { listDir, readJson, readJsonl } from "./json";
import { isSafeSegment, PathError } from "./safe-path";
import { compareMatchesList, memoryPathFromRow, memoryPathInList, parseChains, parseCompare, parseMemoryRows, type CompareView, type MemoryPage } from "./chain";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

const LISTS = "pilot-run/lists";
const COMPARE = "critic-compare";

export interface MemoryBook {
  book: string;
  /** Path of the memory file relative to the data folder. Null when the chain table names no usable file. */
  file: string | null;
  /** False when the file is absent or empty. A chain with no accepted page has no memory file yet. */
  found: boolean;
  pairCount: number;
  pages: MemoryPage[];
}

/** Book names of the chains table (list.json first, then list-summary.json). */
async function chainsOf(stamp: string) {
  const listJson = await readJson<J>(`${LISTS}/${stamp}/list.json`);
  const summaryJson = await readJson<J>(`${LISTS}/${stamp}/list-summary.json`);
  return parseChains(listJson?.chains) ?? parseChains(summaryJson?.chains) ?? [];
}

/**
 * Round 48 answer 9 (Q-A 2026-10-27 l55): the book translation memory pairs of one book of a chain list, grouped by page.
 * The file is book-memory/<book>.jsonl in the list folder (translator_run.py l1928). The chains table names the same file in memory_file.
 * Read only. The book must be a book of the chains table, so a request cannot name any other file.
 */
export async function loadMemoryBook(stamp: string, book: string): Promise<MemoryBook | null> {
  if (!isSafeSegment(stamp) || !isSafeSegment(book)) throw new PathError("Bad name.");
  const chain = (await chainsOf(stamp)).find((c) => c.book === book);
  if (!chain) return null;
  const candidates = [memoryPathInList(`${LISTS}/${stamp}`, book), memoryPathFromRow(chain.memoryFile)].filter((x): x is string => !!x);
  for (const file of candidates) {
    const rows = await readJsonl<unknown>(file);
    if (rows.length > 0) {
      const pages = parseMemoryRows(rows);
      return { book, file, found: true, pairCount: pages.reduce((n, p) => n + p.pairs.length, 0), pages };
    }
  }
  return { book, file: candidates[0] ?? null, found: false, pairCount: 0, pages: [] };
}

/**
 * Round 48 answer 9: the compare table of critic_compare.py for one list.
 * critic-compare/<name>/compare.json belongs to the list when the folder name equals the list stamp or an input path ends with the stamp.
 * Newest compare first. A broken file is skipped.
 */
export async function loadCompares(stamp: string): Promise<CompareView[]> {
  if (!isSafeSegment(stamp)) throw new PathError("Bad list name.");
  const out: CompareView[] = [];
  const names = (await listDir(COMPARE)).filter(isSafeSegment).sort().reverse();
  for (const name of names) {
    const doc = await readJson<J>(`${COMPARE}/${name}/compare.json`);
    if (!doc || !compareMatchesList(name, doc, stamp)) continue;
    const view = parseCompare(name, doc);
    if (view) out.push(view);
  }
  return out;
}
