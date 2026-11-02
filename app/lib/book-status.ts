import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { dataRoot } from "./config";
import { isSafeSegment } from "./safe-path";
import {
  DATA_ERROR_TEXT,
  buildRow,
  deriveFacts,
  isFinalListState,
  runNumberOf,
  summarize,
  type BookFacts,
  type ListInput,
  type MarkFile,
  type MonitorData,
  type MonitorRow,
  type StatusFile,
} from "./book-status-rules";

/**
 * Server side of the Monitor dashboard (unit VW77a, round 80). It reads files and the clock, and calls the pure rules of book-status-rules.ts.
 * VISION-viewer.md 15.24.9, "How the Viewer reads it":
 *   - Book set: the slugs of pilot-sample/book-slugs.json, plus any book ID in a status.json or in a list folder.
 *   - A status.json is the truth when it exists. The pid check uses signal 0. A book without status.json gets a derived row from the list folders.
 *   - The Viewer reads a file again only when its modification time changed. The poll runs every 3 s.
 *   - A broken status.json gives the row "Status file unreadable". It never stops the page.
 * This code only reads. It writes no file. The buttons write through lib/book-actions.ts (unit VW77b1, round 81).
 * Unit VW77b1: a `fresh` read skips the cache, the write routes use it for the state check. The facts also hold phase2Ready and the refusal of a Restart.
 */

const STORE = "book-store";
const PHASE2_BOOK = "paired-dataset"; // prompts.py:26
const LISTS = path.join("pilot-run", "lists");
// The 16 boxes in the order of prompts.py:20-21 (stage TS, TL, ED, QA, each with level 0 to 3).
const BOXES = ["TS", "TL", "ED", "QA"].flatMap((s) => [0, 1, 2, 3].map((l) => `${s}_${l}`));


// ---------------------------------------------------------------- cache by modification time

interface Entry {
  mtimeMs: number;
  size: number;
  ino: number;
  text: string;
  json: { ok: true; value: unknown } | { ok: false };
}
const cache = new Map<string, Entry>();

/** Read a file again only when its modification time, size, or inode changed. Returns null when the file does not exist. */
async function readCached(file: string, fresh = false): Promise<Entry | null> {
  let st;
  try {
    st = await fs.stat(file);
  } catch {
    cache.delete(file);
    return null;
  }
  if (!st.isFile()) return null;
  const hit = fresh ? undefined : cache.get(file);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size && hit.ino === st.ino) return hit;
  let text: string;
  try {
    text = await fs.readFile(file, "utf-8");
  } catch {
    cache.delete(file);
    return null;
  }
  let json: Entry["json"];
  try {
    json = { ok: true, value: JSON.parse(text) };
  } catch {
    json = { ok: false };
  }
  const e: Entry = { mtimeMs: st.mtimeMs, size: st.size, ino: st.ino, text, json };
  cache.set(file, e);
  return e;
}

/** JSON of a file: "missing", "bad" (exists, cannot be parsed), or the value. */
async function readJsonFile(file: string, fresh = false): Promise<"missing" | "bad" | { value: unknown }> {
  const e = await readCached(file, fresh);
  if (!e) return "missing";
  return e.json.ok ? { value: e.json.value } : "bad";
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.stat(file);
    return true;
  } catch {
    return false;
  }
}

async function dirNames(dir: string): Promise<string[]> {
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    return items.filter((i) => i.isDirectory()).map((i) => i.name);
  } catch {
    return [];
  }
}

/** Same check as pid_alive in store.py:77-87: signal 0 sends no signal. EPERM means the process exists. */
export function pidAlive(pid: unknown): boolean {
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
  return true;
}

function obj(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------- titles and book pages

/** item_id to the English title (else the Japanese title) from item-metadata/items.filled.jsonl, else items.draft.jsonl. Same rule as bookTitle in books.ts. */
async function loadTitles(root: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const name of ["items.filled.jsonl", "items.draft.jsonl"]) {
    const e = await readCached(path.join(root, "item-metadata", name));
    if (!e) continue;
    let titles = titleCache.get(e);
    if (!titles) {
      titles = new Map();
      for (const line of e.text.split("\n")) {
        if (!line.trim()) continue;
        try {
          const r = JSON.parse(line) as Record<string, unknown>;
          const t = (typeof r.title_en === "string" && r.title_en) || (typeof r.title_ja === "string" && r.title_ja) || "";
          if (r.item_id !== undefined) titles.set(String(r.item_id), t);
        } catch {
          /* skip a broken line */
        }
      }
      titleCache.set(e, titles);
    }
    for (const [k, v] of titles) out.set(k, v);
    break;
  }
  return out;
}
const titleCache = new WeakMap<Entry, Map<string, string>>();

// ---------------------------------------------------------------- the whole read

/** The labels of the current pointers of the prompt files give the run number (round 80 answer 11). No prompt file gives null. */
async function runNumberOfBook(bookDir: string, phase: string | null | undefined): Promise<number | null> {
  for (const box of BOXES) {
    const e = await readCached(path.join(bookDir, "prompts", box, "current"));
    if (!e) continue;
    const n = runNumberOf([e.text], phase);
    if (n !== null) return n;
  }
  return null;
}

/**
 * Round 78 answer 16 (Q-A 2026-11-01 l78): "Wait for phase 2 files". A real book cannot start phase 3 until the 16 pointer files
 * book-store/paired-dataset/prompts/<BOX>/current exist (PHASE2_BOOK in prompts.py:26, CURRENT in prompts.py:25). The Run button waits for them [aki-main proposal in the brief of VW77b1].
 */
async function phase2Ready(root: string): Promise<boolean> {
  for (const box of BOXES) if (!(await exists(path.join(root, STORE, PHASE2_BOOK, "prompts", box, "current")))) return false;
  return true;
}

/** The newest event `restart-refused` of the file history.jsonl (round 81 answer 16: fields `reason` and `requested_utc`). Null when there is none. */
async function readRefusal(dir: string, fresh: boolean): Promise<BookFacts["refusal"]> {
  const e = await readCached(path.join(dir, "history.jsonl"), fresh);
  if (!e) return null;
  let out: BookFacts["refusal"] = null;
  for (const line of e.text.split("\n")) {
    if (!line.includes("restart-refused")) continue;
    try {
      const v = obj(JSON.parse(line));
      if (v && v.event === "restart-refused") out = { reason: typeof v.reason === "string" ? v.reason : null, requested_utc: typeof v.requested_utc === "string" ? v.requested_utc : null };
    } catch {
      /* skip a broken line */
    }
  }
  return out;
}

/** List folders of the pilot lists (derived rows). */
async function loadLists(root: string): Promise<{ lists: ListInput[]; lastListEnd: number | null }> {
  const lists: ListInput[] = [];
  let lastListEnd: number | null = null;
  for (const stamp of (await dirNames(path.join(root, LISTS))).filter(isSafeSegment)) {
    const dir = path.join(root, LISTS, stamp);
    const p = await readJsonFile(path.join(dir, "progress.json"));
    if (p === "missing" || p === "bad") continue;
    const l = await readJsonFile(path.join(dir, "list.json"));
    const s = await readJsonFile(path.join(dir, "list-summary.json"));
    lists.push({
      stamp,
      progress: p.value,
      list: typeof l === "string" ? null : l.value,
      summary: typeof s === "string" ? null : s.value,
      pauseExists: await exists(path.join(dir, "PAUSE")),
    });
    const prog = obj(p.value);
    const state = typeof prog?.state === "string" ? prog.state : "";
    const upd = typeof prog?.updated_epoch === "number" ? prog.updated_epoch : null;
    if (upd !== null && isFinalListState(state) && (lastListEnd === null || upd > lastListEnd)) lastListEnd = upd;
  }
  return { lists, lastListEnd };
}

/**
 * The book set: the slugs of pilot-sample/book-slugs.json, plus any book folder of the store, plus any book ID in a list folder.
 * The store folder of phase 2 (paired-dataset) is no book: a phase 2 run has no book row (VISION 15.24.4.4) [unit default VW77b1].
 */
async function loadBookSet(root: string, lists: ListInput[]): Promise<Map<string, number | null>> {
  const bookPages = new Map<string, number | null>();
  const slugsFile = await readJsonFile(path.join(root, "pilot-sample", "book-slugs.json"));
  if (typeof slugsFile !== "string") {
    const books = obj(slugsFile.value)?.books;
    if (Array.isArray(books)) {
      for (const b of books) {
        const r = obj(b);
        if (r && typeof r.slug === "string" && isSafeSegment(r.slug)) bookPages.set(r.slug, typeof r.pages === "number" ? r.pages : null);
      }
    }
  }
  const storeDirs = (await dirNames(path.join(root, STORE))).filter(isSafeSegment);
  for (const b of storeDirs) if (!bookPages.has(b)) bookPages.set(b, null);
  for (const l of lists) {
    const pages = obj(l.progress)?.pages;
    if (!Array.isArray(pages)) continue;
    for (const p of pages) {
      const id = obj(p)?.page_id;
      const b = typeof id === "string" ? id.split("/")[0] : "";
      if (b && isSafeSegment(b) && !bookPages.has(b)) bookPages.set(b, null);
    }
  }
  bookPages.delete(PHASE2_BOOK);
  return bookPages;
}

/** The facts of one book. `fresh` reads status.json, request.json, and history.jsonl again, with no cache. Returns the facts and whether status.json exists. */
async function readFacts(root: string, slug: string, pages: number | null, titles: Map<string, string>, lists: ListInput[], ph2: boolean, fresh: boolean): Promise<{ facts: BookFacts; hasStatusFile: boolean }> {
  const dir = path.join(root, STORE, slug);
  const rel = `${STORE}/${slug}/status.json`;
  const sf = await readJsonFile(path.join(dir, "status.json"), fresh);
  const statusUnreadable = sf === "bad" || (typeof sf !== "string" && obj(sf.value) === null);
  const status = typeof sf === "string" || statusUnreadable ? null : (obj(sf.value) as StatusFile);
  const mf = await readJsonFile(path.join(dir, "request.json"), fresh);
  const markUnreadable = mf === "bad" || (typeof mf !== "string" && obj(mf.value) === null);
  const mark = typeof mf === "string" || markUnreadable ? null : (obj(mf.value) as MarkFile);
  const facts: BookFacts = {
    slug,
    title: titles.get(slug) ?? "",
    bookPages: pages ?? (typeof status?.book_pages === "number" && status.book_pages > 0 ? status.book_pages : null),
    status,
    statusUnreadable,
    statusFile: rel,
    pauseExists: await exists(path.join(dir, "PAUSE")),
    mark,
    markUnreadable,
    pidAlive: status ? pidAlive(status.pid) : false,
    runNumber: status ? await runNumberOfBook(dir, status.phase) : null,
    derived: status || statusUnreadable ? null : deriveFacts(slug, lists),
    phase2Ready: ph2,
    refusal: mark?.action === "restart" ? await readRefusal(dir, fresh) : null,
  };
  return { facts, hasStatusFile: sf !== "missing" };
}

/** A link to a failed file must point at a file that exists (VISION 15.24.4.3: "A link opens the file"). */
async function checkErrorFile(root: string, row: MonitorRow): Promise<void> {
  if (row.errorFile && (row.errorFile.split("/").includes("..") || path.isAbsolute(row.errorFile) || !(await exists(path.join(root, row.errorFile))))) row.errorFile = null;
}

export async function loadMonitor(nowMs: number = Date.now()): Promise<MonitorData> {
  const now = nowMs / 1000;
  const empty = (error: string): MonitorData => ({ ok: false, error, generatedAt: now, rows: [], summary: summarize([]), lastListEnd: null, noRun: false });
  let root: string;
  try {
    root = await dataRoot();
    if (!(await fs.stat(root)).isDirectory()) return empty(DATA_ERROR_TEXT);
  } catch {
    return empty(DATA_ERROR_TEXT);
  }
  const { lists, lastListEnd } = await loadLists(root);
  const bookPages = await loadBookSet(root, lists);
  const titles = await loadTitles(root);
  const ph2 = await phase2Ready(root);
  const rows: MonitorRow[] = [];
  let statusFiles = 0;
  for (const [slug, pages] of bookPages) {
    const { facts, hasStatusFile } = await readFacts(root, slug, pages, titles, lists, ph2, false);
    if (hasStatusFile) statusFiles++;
    const row = buildRow(facts, now);
    await checkErrorFile(root, row);
    rows.push(row);
  }
  return { ok: true, error: null, generatedAt: now, rows, summary: summarize(rows), lastListEnd, noRun: lists.length === 0 && statusFiles === 0 };
}

/**
 * One book row for the write routes (unit VW77b1). The state check of a press needs a fresh read, so status.json, request.json, history.jsonl
 * are read again with no cache. Returns null when the slug is not in the book set (the route answers 404).
 * `root` is the data folder and 
 */
export async function loadBookFresh(slug: string, nowMs: number = Date.now()): Promise<{ row: MonitorRow; root: string } | null> {
  const root = await dataRoot();
  const { lists } = await loadLists(root);
  const bookPages = await loadBookSet(root, lists);
  if (!bookPages.has(slug)) return null;
  const titles = await loadTitles(root);
  const { facts } = await readFacts(root, slug, bookPages.get(slug) ?? null, titles, lists, await phase2Ready(root), true);
  return { row: buildRow(facts, nowMs / 1000), root };
}
