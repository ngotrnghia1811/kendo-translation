// Unit VW85 (round 91), Q-A 3:26.3 "Book runs, frozen boxes, overflow". Pure functions: no file access, no server-only import.
// A client component and a plain node test (scripts/vw85-test.mjs) can import this file. Use only erasable TypeScript syntax here.
//
// Owner words (Q-A 3:26.3):
//   (a) "The step view and the training monitor work for a book run too."
//   (b) "A frozen box shows "Frozen since page n" in the step view, in the training monitor header, and in the Details view."
//   (c) "The Details view shows the overflow count. The training monitor of the start box lists each overflow critique with its content and its start point."
// Owner words for the overflow queue (round 87 answer 3): "option 1. Create an overflow queue for critique for monitoring. For critique that move
// through the whole grid but not resolved, record its content and its starting point".
//
// File facts of the Translator (read only, <T2>/data/scripts, read 2026-11-12):
//   - Store folder of a book: data/book-store/<book>/ (translator_run.py:130 BOOK_STORE_ROOT). Phase 2 uses the book "paired-dataset".
//   - A phase change moves status.json, pages/, prompts/, rubric-tables/, update-points/, critiques/ and more into <book>/<old phase>/.
//     history.jsonl stays in <book>/ (translator/store.py:280-297 move_phase).
//   - File name part of a page: the full page ID with "_" in paired-dataset, the short form "p060" in a book (store.py:239-248 page_name).
//   - Event "box-frozen" in history.jsonl: {utc, event, box, phase, page (page ID of the update point), pages (the K = 3 pages)}
//     (translator/freeze.py:33 BOX_FROZEN, freeze.py:90-91 check_box, store.py:222-229 history row). Phase agent-phase-4 only (freeze.py:31).
//   - The frozen boxes of a run are the box-frozen events after the last reset event "restart" or "phase-changed"
//     (freeze.py:42-47 frozen_boxes, translator/critique_queue.py:38 RESET_EVENTS and 42-48 current_run_events).
//   - Overflow record, one JSON per line in <store>/critiques/overflow.jsonl: {queue_id, content (the critique object of the queue row:
//     critique_id, failure_mode, evidence, reason, note_for_next_step), start_box, page} (critique_queue.py:266-287 record_overflow, 153-154 queue row).
import { PHASE2_BOOK } from "./phase2-articles";
import { parseUtcIso } from "./pst";

function rec(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

// ---------------------------------------------------------------- the store of a run

export interface RunStore {
  /** "paired-dataset" (phase 2) or the slug of a book. */
  book: string;
  /** Folder below the data folder: "book-store/<book>", or "book-store/<book>/<phase>" after a phase change moved the files. */
  dir: string;
  /** history.jsonl stays in "book-store/<book>" (store.py:281). */
  historyRel: string;
  /** True for the phase 2 store (paired-dataset). */
  phase2: boolean;
  /** The phase of the list that picked this store ("agent-phase-3"), or null when unknown. */
  phase: string | null;
}

/** The store of phase 2: book-store/paired-dataset. */
export const PHASE2_STORE: RunStore = {
  book: PHASE2_BOOK,
  dir: `book-store/${PHASE2_BOOK}`,
  historyRel: `book-store/${PHASE2_BOOK}/history.jsonl`,
  phase2: true,
  phase: null,
};

/** The store of a book. `movedPhase`: the phase folder that holds the files after a phase change (store.py:290), else null. */
export function bookStore(book: string, phase: string | null = null, movedPhase: string | null = null): RunStore {
  if (book === PHASE2_BOOK) return PHASE2_STORE;
  const base = `book-store/${book}`;
  return { book, dir: movedPhase ? `${base}/${movedPhase}` : base, historyRel: `${base}/history.jsonl`, phase2: false, phase };
}

/** The file name part of a page in a store (store.py:239-248 page_name): "94380515_p001" in paired-dataset, "p060" in a book. */
export function pageName(store: RunStore, pageId: string): string {
  return store.phase2 ? pageId.replace("/", "_") : (pageId.split("/").pop() ?? pageId);
}

/** True when a progress.json belongs to the store: the key book names it. Phase 2 keeps the old rule (lib/phase2-articles.ts isPhase2List). */
export function listOfStore(progress: unknown, store: RunStore): boolean {
  return rec(progress)?.book === store.book;
}

/**
 * The book of a book-run list of a real book, else null. progress.json of `run-book` holds {kind: "book-run", book, phase}
 * (translator_run.py:3290-3293). Phase 2 runs the same code with the book "paired-dataset", so that book gives null here.
 */
export function bookRunBookOf(progress: unknown): string | null {
  const p = rec(progress);
  if (!p || p.kind !== "book-run") return null;
  const book = asStr(p.book);
  if (!book || book === PHASE2_BOOK || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(book)) return null;
  return book;
}

/** The query part that names the store for the step and monitor APIs. Phase 2 sends nothing, so its addresses stay as before (VW95, VW98). */
export function storeQuery(store: { book: string | null; list: string | null }): string | null {
  if (!store.book || store.book === PHASE2_BOOK) return null;
  return store.list ? `list=${encodeURIComponent(store.list)}` : `book=${encodeURIComponent(store.book)}`;
}

/** "agent-phase-3" gives "phase 3". Another text stays as it is. */
export function phaseWord(phase: string | null): string | null {
  if (!phase) return null;
  const m = /^agent-phase-(\d+)$/.exec(phase);
  return m ? `phase ${m[1]}` : phase;
}

// ---------------------------------------------------------------- readable page names of a book

/** "page 12" of "<slug>/p012" (the rule of lib/readable-names.ts pageNumberText, repeated here so that this file has no other import). */
export function bookPageNumber(pageId: string): string {
  const last = pageId.split("/").pop() ?? pageId;
  const m = /^p(\d+)$/.exec(last);
  return m ? `page ${Number(m[1])}` : pageId;
}

/** Readable text of a book page: "<book title>, page 12 (<slug>/p012)". Without a title: "page 12 (<slug>/p012)". */
export function bookPageText(pageId: string, title: string | null): string {
  const n = bookPageNumber(pageId);
  return title ? `${title}, ${n} (${pageId})` : `${n} (${pageId})`;
}

// ---------------------------------------------------------------- frozen boxes (owner item b)

export interface FrozenBox {
  box: string;
  /** Page ID of the update point that froze the box (freeze.py:90 key page). */
  page: string | null;
  /** The K = 3 pages of the soft row (freeze.py:90 key pages). */
  pages: string[];
  phase: string | null;
  epoch: number | null;
  /** "Frozen since page 12" (owner words, Q-A 3:26.3). */
  text: string;
}

export const FROZEN_HELP =
  "Frozen: in phase 4 the Translator stops the prompt updates of this box after K = 3 update points in a row with no hard critique group. " +
  "The source is the event box-frozen in history.jsonl (freeze.py).";

const BOX_ORDER: string[] = [0, 1, 2, 3].flatMap((n) => ["TS", "TL", "ED", "QA"].map((s) => `${s}_${n}`));

/** "Frozen since page 12". Without a page: "Frozen (page not stored)". */
export function frozenText(page: string | null): string {
  return page ? `Frozen since ${bookPageNumber(page)}` : "Frozen (page not stored)";
}

/**
 * The frozen boxes of one run, in grid order. `runId`: the run ID of the "start" rows. Null takes the current run: the rows after the last
 * reset event "restart" or "phase-changed" (critique_queue.py:42-48). A box frozen twice keeps its first event.
 */
export function frozenBoxes(rows: Record<string, unknown>[], runId: string | null): FrozenBox[] {
  let run: string | null = null;
  let found = new Map<string, FrozenBox>();
  for (const r of rows) {
    if (r.event === "restart" || r.event === "phase-changed") {
      run = null;
      if (runId === null) found = new Map();
      continue;
    }
    if (r.event === "start") {
      run = asStr(r.run_id);
      continue;
    }
    if (r.event !== "box-frozen") continue;
    const box = asStr(r.box);
    if (!box || found.has(box)) continue;
    if (runId !== null && run !== runId) continue;
    const page = asStr(r.page);
    found.set(box, {
      box,
      page,
      pages: Array.isArray(r.pages) ? r.pages.filter((x): x is string => typeof x === "string") : [],
      phase: asStr(r.phase),
      epoch: parseUtcIso(r.utc),
      text: frozenText(page),
    });
  }
  return BOX_ORDER.filter((b) => found.has(b)).map((b) => found.get(b) as FrozenBox);
}

// ---------------------------------------------------------------- overflow critiques (owner item c)

export interface OverflowRow {
  queueId: string;
  /** The box where the critique started (record key start_box). */
  startBox: string | null;
  /** The page where the critique started (record key page). */
  page: string | null;
  critiqueId: string | null;
  failureMode: string | null;
  evidence: string | null;
  reason: string | null;
  noteForNextStep: string | null;
  /** The whole content object, for the full view. */
  content: unknown;
}

export const OVERFLOW_HELP =
  "Overflow critique: a critique that moved through the whole grid and was not resolved. Its box is frozen, and no box that is not frozen takes it. " +
  "The Translator records its content and its start point in critiques/overflow.jsonl (phase 4 only, critique_queue.py record_overflow).";

/** The rows of critiques/overflow.jsonl, in file order. A broken line or a row without queue_id is skipped. */
export function parseOverflow(text: string | null): OverflowRow[] {
  const out: OverflowRow[] = [];
  for (const line of (text ?? "").split("\n")) {
    if (!line.trim()) continue;
    let r: Record<string, unknown> | null = null;
    try {
      r = rec(JSON.parse(line));
    } catch {
      continue;
    }
    const queueId = asStr(r?.queue_id);
    if (!r || !queueId) continue;
    const c = rec(r.content);
    out.push({
      queueId,
      startBox: asStr(r.start_box),
      page: asStr(r.page),
      critiqueId: asStr(c?.critique_id),
      failureMode: asStr(c?.failure_mode),
      evidence: asStr(c?.evidence),
      reason: asStr(c?.reason),
      noteForNextStep: asStr(c?.note_for_next_step),
      content: r.content ?? null,
    });
  }
  return out;
}

/** The number of overflow critiques per start box, in grid order. Rows without a start box count as "start box not stored". */
export function overflowByBox(rows: OverflowRow[]): { box: string; n: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.startBox ?? "start box not stored", (m.get(r.startBox ?? "start box not stored") ?? 0) + 1);
  const known = BOX_ORDER.filter((b) => m.has(b)).map((b) => ({ box: b, n: m.get(b) as number }));
  const other = [...m].filter(([b]) => !BOX_ORDER.includes(b)).map(([box, n]) => ({ box, n }));
  return [...known, ...other];
}

/** "2 overflow critiques" or "No overflow critiques". */
export function overflowCountText(n: number): string {
  if (n === 0) return "No overflow critiques";
  return `${n} overflow ${n === 1 ? "critique" : "critiques"}`;
}

/** Start point of an overflow critique: "TL_2, page 12 (<slug>/p012)" with the book title when known. */
export function overflowStartText(r: OverflowRow, title: string | null): string {
  const page = r.page ? bookPageText(r.page, title) : "page not stored";
  return `${r.startBox ?? "start box not stored"}, ${page}`;
}

// ---------------------------------------------------------------- the part of the Details view `/monitor/<slug>`

export interface BookWatch {
  /** The step view of the book run: "/monitor/<slug>/steps". */
  stepsHref: string;
  /** The training monitor in the run view of the list of the current run: "/runs/<stamp>#training-monitor", or null when no list is known. */
  monitorHref: string | null;
  monitorStamp: string | null;
  frozen: FrozenBox[];
  overflow: { count: number; byBox: { box: string; n: number }[] };
}

/**
 * The list of the current run of a book, for the link "Training monitor": status.json list_stamp (store.py:138-147 new_status) when it is a
 * book-run list of the book, else the newest book-run list of the book. A pilot list or a phase 2 list never counts, because the training
 * monitor of such a list reads another store.
 */
export function watchListStamp(statusListStamp: unknown, lists: { stamp: string; listKind: string; phase2List?: boolean }[]): string | null {
  const runs = lists.filter((l) => l.listKind === "book-run" && l.phase2List !== true).map((l) => l.stamp);
  const fromStatus = asStr(statusListStamp);
  if (fromStatus && runs.includes(fromStatus)) return fromStatus;
  return runs.length ? [...runs].sort().pop() ?? null : null;
}

/** True when the Details view shows the part "Steps, training monitor, frozen boxes, overflow": the book has a store or a book-run list. */
export function showsWatch(hasStatus: boolean, historyRows: number, listStamp: string | null): boolean {
  return hasStatus || historyRows > 0 || listStamp !== null;
}

/** The data of the Details view part "Steps, training monitor, frozen boxes, overflow". `listStamp`: status.json list_stamp, else the newest list. */
export function bookWatch(slug: string, rows: Record<string, unknown>[], overflow: OverflowRow[], listStamp: string | null): BookWatch {
  const stamp = listStamp && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(listStamp) ? listStamp : null;
  return {
    stepsHref: `/monitor/${encodeURIComponent(slug)}/steps`,
    monitorHref: stamp ? `/runs/${stamp}#training-monitor` : null,
    monitorStamp: stamp,
    frozen: frozenBoxes(rows, null),
    overflow: { count: overflow.length, byBox: overflowByBox(overflow) },
  };
}
