import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PathError, isSafeSegment, resolveInside } from "./safe-path";
import { PHASE2_BOOK } from "./phase2-articles";
import { loadTitleRecords } from "./phase2-articles-load";
import { PHASE2_STORE, bookStore, parseOverflow, type OverflowRow, type RunStore } from "./run-store";

/**
 * Unit VW85 (round 91), Q-A 3:26.3: server side of the store choice. It reads files and writes none.
 * The step view and the training monitor read the store of the list (run view /runs/<stamp>) or of the book (step view /monitor/<slug>/steps).
 * A list names its book in progress.json (translator_run.py:3290-3293 BookProgress meta {kind: "book-run", book, phase}).
 * New file on purpose: the dev server keeps old module instances (guideline build-units.md, "Viewer units: app copy").
 */

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

async function readTextRel(root: string, rel: string): Promise<string | null> {
  try {
    return await fs.readFile(await resolveInside(rel, root), "utf-8");
  } catch (e) {
    if (e instanceof PathError) throw e;
    return null;
  }
}

async function isDir(root: string, rel: string): Promise<boolean> {
  try {
    return (await fs.stat(await resolveInside(rel, root))).isDirectory();
  } catch (e) {
    if (e instanceof PathError) throw e;
    return false;
  }
}

/**
 * The store of the list `stamp`. A list of phase 2, a list with no book, or a missing list gives the phase 2 store, as before unit VW85.
 * After a phase change the files of the old phase sit in book-store/<book>/<phase>/ (store.py:280-297 move_phase). That folder wins when it exists.
 */
export async function storeOfList(root: string, stamp: string): Promise<RunStore> {
  if (!isSafeSegment(stamp)) return PHASE2_STORE;
  let progress: Rec | null = null;
  try {
    progress = rec(JSON.parse((await readTextRel(root, path.join("pilot-run", "lists", stamp, "progress.json"))) ?? "null"));
  } catch {
    progress = null;
  }
  const book = str(progress?.book);
  if (!book || book === PHASE2_BOOK || !isSafeSegment(book)) return PHASE2_STORE;
  const phase = str(progress?.phase);
  const moved = phase && isSafeSegment(phase) && (await isDir(root, path.join("book-store", book, phase))) ? phase : null;
  return bookStore(book, phase, moved);
}

/** The store of an API query: ?list=<stamp> wins, else ?book=<slug>, else the phase 2 store. A name that is not safe gives an error text. */
export async function storeOfQuery(root: string, list: string | null, book: string | null): Promise<RunStore | { error: string }> {
  if (list !== null) {
    if (!isSafeSegment(list)) return { error: "The list name is not valid." };
    return storeOfList(root, list);
  }
  if (book !== null) {
    if (!isSafeSegment(book)) return { error: "The book name is not valid." };
    return bookStore(book);
  }
  return PHASE2_STORE;
}

/**
 * The title of a book: title_en, else title_ja, of the metadata row whose item_id is the slug (the rule of lib/books.ts bookTitle).
 * It reads below `root`, so a test with a made-up data folder gets its own titles. Null when no row matches.
 */
export async function bookTitleAt(root: string, slug: string): Promise<string | null> {
  const hit = (await loadTitleRecords(root)).find((r) => r.id === slug);
  return hit ? (hit.en ?? hit.ja ?? null) : null;
}

/** The rows of <store>/critiques/overflow.jsonl (critique_queue.py:270). A missing file gives an empty list. */
export async function loadOverflowRows(root: string, store: RunStore): Promise<OverflowRow[]> {
  if (store.phase2) return [];
  return parseOverflow(await readTextRel(root, path.join(store.dir, "critiques", "overflow.jsonl")));
}
