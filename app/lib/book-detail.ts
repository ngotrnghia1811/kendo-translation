import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { loadBookFresh } from "./book-status";
import { getRun, listRuns } from "./runs";
import { readJson, readJsonl, readText } from "./json";
import { isSafeSegment, stripDataPrefix } from "./safe-path";
import { parseUtcIso } from "./pst";
import { BOXES, PHASE_NUMBER, pageNumberOf, parseVersionLabel } from "./restart-rules";
import { critiqueShare, stopFlags, type HistoryEvent } from "./critique-share";
import { placeText } from "./book-run-rules";
import { passCounts, readBookRuns } from "./book-runs";
import {
  critiqueRows,
  modelsText,
  pageShortName,
  pagesDoneText,
  promptsCells,
  settingsRows,
  archiveRunText,
  NO_RUN_ID_TEXT,
  type ArchivedRun,
  type BookDetail,
  type BookRunRow,
  type DetailList,
  type DetailPage,
  type LastError,
  type PageFacts,
} from "./book-detail-rules";

/**
 * Server side of the Details view `/monitor/<slug>` (unit VW77c, round 86). VISION-viewer 15.24.5, 15.27.4, 15.27.5.
 * It reads files and writes none. New file on purpose: the dev server keeps old module instances (see the note in lib/pst.ts).
 * The row (title, label, sentence, buttons) comes from loadBookFresh of lib/book-status.ts, so the Details view and the Monitor dashboard `/` follow the same rules.
 *
 * Where each part comes from:
 *   header, last error  the row, and last_error.utc of book-store/<slug>/status.json
 *   list folders        pilot-run/lists/<stamp>/ for every list whose progress.json holds a page of the book (lib/runs.ts getRun), the page rows of this book only
 *   critiques, settings summary.json (update_N, critiques_by_box_type) and run.json (models, settings.sha1) of each page folder. A real book names its page folders
 *                       in book-store/<slug>/pages/<pid>.json (the current run). A pilot book takes them from the page rows of its lists, the newest list wins.
 *   critique share      history.jsonl events update-point-ended of the current run (lib/critique-share.ts)
 *   stop flag           history.jsonl events box-stopped, prompt-rejected, update-point-started
 *   archived runs       book-store/<slug>/archive/<run ID folder>/ : status.json, prompts/<BOX>/current, and run.json of the first page
 *   runs (VW77e)        the current run (book-store/<slug>/), the archived runs, and the phase 3 run (book-store/<slug>/agent-phase-3/), read by lib/book-runs.ts.
 *                       The same files as an archived run. The pointer files give the PASS count for the dialog of the button Open to readers.
 * Parts 4 (box grid) and 5 (list of memory pairs) of VISION 15.24.5 are not built. A page row links to the page view, and a list folder links to the run view.
 */

const STORE = "book-store";
const LISTS = "pilot-run/lists";

function rec(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
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

async function dirNames(abs: string): Promise<string[]> {
  try {
    return (await fs.readdir(abs, { withFileTypes: true })).filter((i) => i.isDirectory()).map((i) => i.name);
  } catch {
    return [];
  }
}

async function fileNames(abs: string): Promise<string[]> {
  try {
    return (await fs.readdir(abs, { withFileTypes: true })).filter((i) => i.isFile()).map((i) => i.name);
  } catch {
    return [];
  }
}

/** Read a JSON file below the data folder. A path that leaves the folder, a missing file, and a broken file all give null. */
async function safeJson(rel: string): Promise<unknown | null> {
  try {
    return await readJson(rel);
  } catch {
    return null;
  }
}

/** summary.json and run.json of one page folder (path below the data folder). */
async function pageFacts(pageId: string, folderRel: string | null): Promise<PageFacts | null> {
  if (!folderRel) return null;
  const summary = rec(await safeJson(`${folderRel}/summary.json`));
  const run = rec(await safeJson(`${folderRel}/run.json`));
  if (!summary && !run) return null;
  const byType: PageFacts["byType"] = {};
  const cbt = rec(summary?.critiques_by_box_type);
  if (cbt) {
    for (const [type, v] of Object.entries(cbt)) {
      const d = rec(v);
      if (d) byType[type] = { critiques: num(d.critiques) ?? 0, reached: d.reached_N === true };
    }
  }
  const first = cbt ? Object.values(cbt).map(rec).find((d) => d && num(d.N) !== null) : null;
  return {
    pageId,
    page: pageShortName(pageId),
    byType,
    n: num(summary?.update_N) ?? (first ? num(first.N) : null),
    models: modelsText(run?.models),
    settingsSha1: typeof rec(run?.settings)?.sha1 === "string" ? (rec(run?.settings)?.sha1 as string) : null,
  };
}

/** The page folders of the current run of a real book: pages/<pid>.json of the book store (translator_run.py settle). */
async function pointerFolders(root: string, slug: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const dir = path.join(root, STORE, slug, "pages");
  for (const name of (await fileNames(dir)).filter((n) => n.endsWith(".json"))) {
    const doc = rec(await safeJson(`${STORE}/${slug}/pages/${name}`));
    if (doc && typeof doc.page_id === "string" && typeof doc.folder === "string" && doc.folder !== "") out.set(doc.page_id, stripDataPrefix(doc.folder));
  }
  return out;
}

/** The list folders that hold a page of the book, newest first, with the page rows of the book. */
async function loadLists(slug: string): Promise<{ lists: DetailList[]; folders: Map<string, string> }> {
  const lists: DetailList[] = [];
  const folders = new Map<string, string>(); // page ID to page folder, the newest list wins
  const oldestFirst = [...(await listRuns())].reverse(); // listRuns gives the newest first
  for (const s of oldestFirst) {
    const progress = rec(await safeJson(`${LISTS}/${s.stamp}/progress.json`));
    const rows = Array.isArray(progress?.pages) ? (progress.pages as unknown[]).map(rec).filter((r): r is Record<string, unknown> => r !== null) : [];
    const mine = rows.filter((r) => typeof r.page_id === "string" && r.page_id.startsWith(slug + "/"));
    if (mine.length === 0) continue;
    for (const r of mine) if (typeof r.folder === "string" && r.folder !== "") folders.set(r.page_id as string, stripDataPrefix(r.folder));
    const run = await getRun(s.stamp);
    if (!run) continue;
    const pages: DetailPage[] = run.pages
      .filter((p) => p.pageId.startsWith(slug + "/"))
      .map((p) => ({
        pageId: p.pageId,
        page: pageShortName(p.pageId),
        state: p.state,
        running: p.running,
        callsDone: p.callsDone,
        callsTotal: p.callsTotal,
        callsFailed: p.callsFailed,
        usd: p.usd,
        minutes: p.minutes,
        qa3Verdict: p.qa3Verdict,
        qa3Score: p.qa3Score,
        href: p.runFolder ? p.href : null,
        pairs: p.bookMemory ? p.bookMemory.pairs : null,
        memoryWritten: p.bookMemory ? p.bookMemory.written : null,
      }));
    lists.push({
      stamp: s.stamp,
      listKind: s.listKind,
      criticMode: s.criticMode,
      bookJobs: s.bookJobs,
      state: s.state,
      startedEpoch: s.startedEpoch,
      updatedEpoch: s.updatedEpoch,
      live: s.state === "running" || s.state === "paused",
      pages,
    });
  }
  return { lists: lists.reverse(), folders };
}

/** The prompts block of the run.json in a page folder: box to label. Null when the file or the block is missing. */
async function usedLabels(folderRel: string | null): Promise<Record<string, string> | null> {
  if (!folderRel) return null;
  const block = rec(rec(await safeJson(`${folderRel}/run.json`))?.prompts);
  if (!block) return null;
  const out: Record<string, string> = {};
  for (const b of BOXES) {
    const v = rec(block[b])?.version;
    if (typeof v === "string") out[b] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** The prompt labels at the end of a run: the pointer files prompts/<BOX>/current in the run folder. A label of another phase counts as not stored. */
async function endLabels(dir: string, phase: string | null): Promise<Record<string, string> | null> {
  const phaseNum = phase ? (PHASE_NUMBER[phase] ?? null) : null;
  const end: Record<string, string> = {};
  for (const b of BOXES) {
    let text: string | null = null;
    try {
      text = await readText(`${dir}/prompts/${b}/current`);
    } catch {
      text = null;
    }
    const label = text?.trim() ?? "";
    const p = parseVersionLabel(label);
    if (p && (phaseNum === null || p.phase === phaseNum)) end[b] = label;
  }
  return Object.keys(end).length > 0 ? end : null;
}

/** One archived run: the facts that status.json, the pointer files, and the first page record give. Nothing that is missing is guessed. */
async function loadArchive(root: string, slug: string): Promise<ArchivedRun[]> {
  const base = `${STORE}/${slug}/archive`;
  const names = (await dirNames(path.join(root, base))).filter(isSafeSegment).sort();
  const out: ArchivedRun[] = [];
  for (const name of names) {
    const dir = `${base}/${name}`;
    const status = rec(await safeJson(`${dir}/status.json`));
    const phase = typeof status?.phase === "string" ? status.phase : null;
    // Prompts at the end: the pointer files of the archived run.
    const end = await endLabels(dir, phase);
    // Prompts at the start: the prompts block of run.json of the first archived page (translator-design.md 9.23.5, item 10).
    let start: Record<string, string> | null = null;
    const pageDocs: { n: number; folder: string }[] = [];
    for (const f of (await fileNames(path.join(root, dir, "pages"))).filter((n) => n.endsWith(".json"))) {
      const doc = rec(await safeJson(`${dir}/pages/${f}`));
      const n = pageNumberOf(typeof doc?.page_id === "string" ? doc.page_id : null);
      if (doc && n !== null && typeof doc.folder === "string" && doc.folder !== "") pageDocs.push({ n, folder: stripDataPrefix(doc.folder) });
    }
    pageDocs.sort((a, b) => a.n - b.n);
    if (pageDocs.length > 0) start = await usedLabels(pageDocs[0].folder);
    const cells = promptsCells(start, end);
    const done = num(status?.pages_done);
    const total = num(status?.pages_total);
    const t = archiveRunText(name);
    out.push({ folder: name, runText: t.text, runIdForm: t.isRunId, phase, pagesDone: done, pagesTotal: total, pagesText: pagesDoneText(done, total), promptsStart: cells.start, promptsEnd: cells.end });
  }
  return out;
}

/** The cell "Prompts at end" of a current run that has not ended. */
const NOT_ENDED_TEXT = "The run has not ended";

/**
 * Unit VW77e (Q-A 3:11.3 V1 and V2): the rows of the table "Runs". The current run first, then the archived runs (newest first), then the phase 3 run.
 * The 5 built columns follow the rule of loadArchive. A current run that has not ended shows "The run has not ended" at the end [unit default VW77e].
 * An archived run keeps the same cells as in `archived`.
 */
async function loadRuns(root: string, slug: string): Promise<BookRunRow[]> {
  const { runs } = await readBookRuns(root, slug);
  const out: BookRunRow[] = [];
  for (const r of runs) {
    const dirRel = r.dir;
    const pageDocs = r.pointers
      .map((p) => ({ n: pageNumberOf(p.pageId), folder: p.folder }))
      .filter((p): p is { n: number; folder: string } => p.n !== null && p.folder !== null)
      .sort((a, b) => a.n - b.n);
    const start = pageDocs.length > 0 ? await usedLabels(pageDocs[0].folder) : null;
    const ended = r.place !== "current" || r.state === "completed";
    const end = ended ? await endLabels(dirRel, r.phase) : null;
    const cells = promptsCells(start, end);
    const { pass, total } = passCounts(r);
    const folder = r.place === "archive" ? path.posix.basename(dirRel) : null;
    const t = r.runId ? archiveRunText(r.runId) : folder ? archiveRunText(folder) : { text: NO_RUN_ID_TEXT, isRunId: false };
    out.push({
      key: `${r.place}:${folder ?? r.runId ?? "none"}`,
      place: r.place,
      placeText: placeText(r.place),
      folder: folder ?? "",
      runText: t.text,
      runIdForm: t.isRunId,
      runId: r.runId,
      noRunIdReason: r.noRunIdReason,
      phase: r.phase,
      pagesDone: r.pagesDone,
      pagesTotal: r.pagesTotal,
      pagesText: pagesDoneText(r.pagesDone, r.pagesTotal),
      promptsStart: cells.start,
      promptsEnd: ended ? cells.end : NOT_ENDED_TEXT,
      passPages: pass,
      totalPages: total,
    });
  }
  return out;
}

export async function loadBookDetail(slug: string, nowMs: number = Date.now()): Promise<BookDetail | null> {
  if (!isSafeSegment(slug)) return null;
  const found = await loadBookFresh(slug, nowMs);
  if (!found) return null;
  const { row, root } = found;
  const bookRel = `${STORE}/${slug}`;
  const history = (await readJsonl<HistoryEvent>(`${bookRel}/history.jsonl`)).filter((e) => rec(e) !== null);
  const share = critiqueShare(history);
  const status = rec(await safeJson(`${bookRel}/status.json`));

  let lastError: LastError | null = null;
  if (row.error) lastError = { text: row.error, file: row.errorFile, epoch: parseUtcIso(rec(status?.last_error)?.utc) };

  const { lists, folders: listFolders } = await loadLists(slug);
  // The page folders of parts 6 and 7: the current run of a real book (page records), else the page rows of the lists.
  const pointers = await pointerFolders(root, slug);
  const sources = pointers.size > 0 ? pointers : listFolders;
  const facts = (await mapLimit([...sources.entries()], 24, ([pageId, folder]) => pageFacts(pageId, folder))).filter((f): f is PageFacts => f !== null);

  return {
    ok: true,
    generatedAt: nowMs / 1000,
    row,
    lastError,
    lists,
    critiques: critiqueRows(facts),
    settings: settingsRows(facts),
    share: Object.keys(share.boxes).length > 0 ? share : null,
    flags: stopFlags(history),
    archived: await loadArchive(root, slug),
    runs: await loadRuns(root, slug),
  };
}
