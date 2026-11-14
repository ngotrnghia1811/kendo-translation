import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PathError, isSafeSegment, resolveInside } from "./safe-path";
import { PHASE2_BOOK, isPhase2List, listLabel, pageOfArticle, pageText, parseHistory, phase2History, shortIdOf, stampEpoch, type Phase2History } from "./phase2-articles";
import { loadArticleNames } from "./phase2-articles-load";
import { callsTokens, sumTokens } from "./tokens-sum";
import { pstDateTime } from "./pst";
import { pageHref } from "./format";
import { jsonViewHref, sizeMb } from "./json-view";
import { lineDiff, diffCounts } from "./line-diff";
import {
  UPDATE_ROLE_WORDS,
  pageSteps,
  pageState,
  pagesInRunOrder,
  runWord,
  updatePoints,
  versionChange,
  type ListLite,
  type ListRowLite,
  type PageFiles,
  type PageNode,
  type StepSummary,
  type UpdatePoint,
} from "./step-tree";
import { stepDataSections, type StepData, type Section } from "./step-data";
// Unit VW85 (Q-A 3:26.3 (a)): "The step view and the training monitor work for a book run too." Each loader takes the store of the run.
// The default is the phase 2 store, so the phase 2 screens read the same files as before.
import { PHASE2_STORE, bookPageNumber, bookPageText, frozenBoxes, listOfStore, pageName, phaseWord, type RunStore } from "./run-store";
import { bookTitleAt } from "./run-store-load";
import { loadUpdateLive } from "./update-live-load"; // unit VW103

/**
 * Server side of the step view (unit VW95, round 91). It reads files and writes none (Q-A 3:19.3 D4).
 * Q-A 3:19.3 D2: one light summary call gives levels 1 and 2. The data of one step loads only when the owner opens it (loadStepData).
 * The summary reads history.jsonl, status.json, the progress.json of the phase 2 lists, and per started page the light files of its page run
 * folder (calls.jsonl, reference-diff-critic/calls.jsonl, critiques/, summary.json or results/QA_n.json). The big files (messages/, parsed/) stay closed.
 * Files of a page run that ended do not change, so their parse stays in memory. The running page is read again at each call.
 * A missing or broken file gives empty data or a plain message, never an error page.
 */

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

// Unit VW85: the store folder comes from a RunStore (lib/run-store.ts). PHASE2_STORE.dir is "book-store/paired-dataset" (PHASE2_BOOK).
void PHASE2_BOOK;
const LISTS = path.join("pilot-run", "lists");

// ---------------------------------------------------------------- small readers below the data root

async function full(root: string, rel: string): Promise<string> {
  return resolveInside(rel, root);
}

async function readTextRel(root: string, rel: string): Promise<string | null> {
  try {
    return await fs.readFile(await full(root, rel), "utf-8");
  } catch (e) {
    if (e instanceof PathError) throw e;
    return null;
  }
}

async function readJsonRel(root: string, rel: string): Promise<unknown> {
  const t = await readTextRel(root, rel);
  if (t === null) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function parseJsonl(text: string | null): unknown[] {
  const out: unknown[] = [];
  for (const line of (text ?? "").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* skip a broken line */
    }
  }
  return out;
}

async function listDirRel(root: string, rel: string): Promise<string[]> {
  try {
    return await fs.readdir(await full(root, rel));
  } catch (e) {
    if (e instanceof PathError) throw e;
    return [];
  }
}

interface Cached<T> {
  key: string;
  value: T;
}

/** Parse a file again only when its modification time or size changed. */
async function cachedParse<T>(root: string, rel: string, cache: Map<string, Cached<T>>, parse: (text: string | null) => T): Promise<T> {
  const file = await full(root, rel);
  let key = "missing";
  try {
    const st = await fs.stat(file);
    key = `${st.mtimeMs}:${st.size}`;
  } catch {
    /* missing file */
  }
  const hit = cache.get(file);
  if (hit && hit.key === key) return hit.value;
  const value = parse(key === "missing" ? null : await readTextRel(root, rel));
  cache.set(file, { key, value });
  return value;
}

// ---------------------------------------------------------------- history, status, lists

interface HistoryParts {
  history: Phase2History;
  updates: UpdatePoint[];
  /** Unit VW85: all rows, for the box-frozen events (freeze.py:33) and the phase of each start row (translator_run.py:3263). */
  rows: Record<string, unknown>[];
}
const historyCache = new Map<string, Cached<HistoryParts>>();
const listCache = new Map<string, Cached<unknown>>();
const updateCallsCache = new Map<string, Cached<unknown[]>>();

async function loadHistoryParts(root: string, store: RunStore = PHASE2_STORE): Promise<HistoryParts> {
  // history.jsonl stays in book-store/<book>/ after a phase change (store.py:281), so it comes from store.historyRel.
  return cachedParse(root, store.historyRel, historyCache, (text) => {
    const rows = parseHistory(text ?? "");
    return { history: phase2History(rows), updates: updatePoints(rows), rows };
  });
}

function listRows(progress: unknown): ListRowLite[] {
  const pages = rec(progress)?.pages;
  if (!Array.isArray(pages)) return [];
  const out: ListRowLite[] = [];
  for (const p0 of pages) {
    const p = rec(p0);
    const page = str(p?.page_id);
    if (!p || !page) continue;
    const folder = str(p.folder);
    out.push({
      page,
      state: str(p.state) ?? "waiting",
      folder: folder ? folder.replace(/^\/+/, "").replace(/^data\//, "") : null,
      startedEpoch: num(p.started_epoch),
      endedEpoch: num(p.ended_epoch),
      callsDone: num(p.calls_done),
      callsTotal: num(p.calls_total),
      seconds: num(p.seconds_sum),
    });
  }
  return out;
}

async function loadPhase2Lists(root: string, store: RunStore = PHASE2_STORE): Promise<ListLite[]> {
  const out: ListLite[] = [];
  for (const stamp of (await listDirRel(root, LISTS)).sort()) {
    if (!isSafeSegment(stamp)) continue;
    const progress = await cachedParse(root, path.join(LISTS, stamp, "progress.json"), listCache, (t) => {
      try {
        return t === null ? null : JSON.parse(t);
      } catch {
        return null;
      }
    });
    // Unit VW85: a book run takes the lists whose progress.json names its book (translator_run.py:3290-3293).
    if (store.phase2 ? isPhase2List(progress) : listOfStore(progress, store)) out.push({ stamp, rows: listRows(progress) });
  }
  return out;
}

// ---------------------------------------------------------------- page run folders

const endedPages = new Map<string, PageFiles>();

async function loadPageFiles(root: string, folder: string, ended: boolean): Promise<PageFiles> {
  const hit = ended ? endedPages.get(folder) : undefined;
  if (hit) return hit;
  const calls = parseJsonl(await readTextRel(root, path.join(folder, "calls.jsonl")));
  const lossCalls = parseJsonl(await readTextRel(root, path.join(folder, "reference-diff-critic", "calls.jsonl")));
  const reference = await readJsonRel(root, path.join(folder, "critiques", "reference.json"));
  const criticCounts: Record<string, number> = {};
  for (const name of await listDirRel(root, path.join(folder, "critiques"))) {
    const m = /^queue-((?:TS|TL|ED|QA)_[0-3])\.jsonl$/.exec(name);
    if (!m) continue;
    let n = 0;
    for (const r of parseJsonl(await readTextRel(root, path.join(folder, "critiques", name)))) {
      if (rec(r)?.source_type === "box-critic") n++;
    }
    criticCounts[m[1]] = n;
  }
  const qa: PageFiles["qa"] = {};
  const summary = rec(await readJsonRel(root, path.join(folder, "summary.json")));
  const sq = rec(summary?.qa);
  for (const n of [0, 1, 2, 3]) {
    const box = `QA_${n}`;
    const s = rec(sq?.[box]);
    if (s) {
      qa[box] = { verdict: str(s.verdict), score: num(s.page_score) };
      continue;
    }
    const r = rec(rec(await readJsonRel(root, path.join(folder, "results", `${box}.json`)))?.score);
    if (r) qa[box] = { verdict: str(r.verdict), score: num(r.page_score) };
  }
  const files: PageFiles & { wallSeconds?: number | null } = { calls, lossCalls, reference, criticCounts, qa };
  files.wallSeconds = num(summary?.wall_seconds);
  if (ended) endedPages.set(folder, files);
  return files;
}

async function fillUpdateCalls(root: string, u: UpdatePoint, store: RunStore = PHASE2_STORE): Promise<void> {
  // Folder update-points/<page name> (store.py:253-255): "94380515_p001" in phase 2, "p060" in a book (store.py:239-248).
  const dir = pageName(store, u.page);
  if (!isSafeSegment(dir)) return;
  const rows = await cachedParse(root, path.join(store.dir, "update-points", dir, "calls.jsonl"), updateCallsCache, parseJsonl);
  const mine = rows.filter((r) => {
    const tag = str(rec(r)?.tag);
    return tag !== null && tag.startsWith(`${u.box}-`) && rec(r)?.kind === "model";
  });
  const t = callsTokens(mine);
  u.calls = mine.length;
  u.tokens = t.tokens;
  const opt = mine.find((r) => rec(r)?.update_role === "prompt-rewrite-optimizer") ?? mine[0];
  u.model = str(rec(opt)?.model);
}

// ---------------------------------------------------------------- summary

/**
 * Levels 1 and 2 of the tree. `listStamp` picks the run of that list (run view `/runs/<stamp>`), else the run of status.json.
 * `openPages`: the pages that are open on the screen. Only these and the running page carry their steps (null: all pages).
 * Measured on live data (2026-11-12): all steps of 30 pages gave 0.4 MB per call, too much for a call every 3 s.
 */
export async function loadStepSummary(
  root: string,
  listStamp: string | null = null,
  openPages: Set<string> | null = null,
  store: RunStore = PHASE2_STORE,
): Promise<StepSummary> {
  const t0 = Date.now();
  // Unit VW85: a book run names its book by its title (Q-A 3:17.4 "Annotate the names intuitively and properly ... Apply this for EVERYTHING.").
  const bookTitle = store.phase2 ? null : await bookTitleAt(root, store.book);
  const bookName = bookTitle ?? store.book;
  const empty: StepSummary = {
    runId: null,
    runLabel: store.phase2 ? "phase 2 run" : `book run of ${bookName}`,
    runWord: runWord(null),
    lists: [],
    pages: [],
    notStarted: [],
    updates: [],
    generatedEpoch: Math.floor(t0 / 1000),
    millis: 0,
    error: null,
  };
  try {
    const status = rec(await readJsonRel(root, path.join(store.dir, "status.json")));
    const { history, updates, rows: historyRows } = await loadHistoryParts(root, store);
    const allLists = await loadPhase2Lists(root, store);
    let runId: string | null = null;
    if (listStamp) runId = history.listRun.get(listStamp) ?? null;
    else runId = str(status?.run_id) ?? history.lastRunId;
    let lists = allLists.filter((l) => runId !== null && history.listRun.get(l.stamp) === runId);
    if (listStamp && lists.length === 0) lists = allLists.filter((l) => l.stamp === listStamp);
    if (lists.length === 0 && !runId) {
      return {
        ...empty,
        error: store.phase2
          ? "No phase 2 run found: status.json and history.jsonl hold no run, and no phase 2 list exists."
          : `No run of the book ${bookName} found: status.json and history.jsonl hold no run, and no list of this book exists.`,
      };
    }
    const newest = lists.length ? lists[lists.length - 1] : null;
    const statusState = str(status?.state);
    const runActive = statusState === "running" && str(status?.run_id) === runId && (newest === null || str(status?.list_stamp) === newest.stamp);
    const runningBoxes = Array.isArray(status?.running_boxes) ? status.running_boxes.filter((b): b is string => typeof b === "string") : [];
    const failPages = new Set(Array.isArray(status?.fail_pages) ? status.fail_pages.filter((b): b is string => typeof b === "string") : []);
    // Unit VW103 (Q-A 3:36.4): the update point that runs now. It runs after a page that history.jsonl already shows as accepted, so that page gets its steps
    // and its first line even when the owner did not open it. The 3 s poll stays small: one more page of steps, and about 1 KB for the live part.
    const live = runActive ? await loadUpdateLive(root, store, status, t0) : null;
    const ordered = pagesInRunOrder(history.pageEvents, runId, lists, runActive);
    const order = newest ? newest.rows.map((r) => r.page) : ordered.map((p) => p.page);
    const names = store.phase2 ? await loadArticleNames(root, ordered.map((p) => p.page)) : new Map();
    const runUpdates = updates.filter((u) => u.runId === runId);
    for (const u of runUpdates) await fillUpdateCalls(root, u, store);
    const pages: PageNode[] = [];
    const notStarted: StepSummary["notStarted"] = [];
    for (const p of ordered) {
      const s = store.phase2 ? shortIdOf(p.page) : null;
      const name = s ? names.get(s) : undefined;
      // Unit VW85: a book page shows the book title and "page 12" (the rule of the run view, lib/runs.ts getRun, unit VW96).
      const found = store.phase2 ? name?.match === "one" : bookTitle !== null;
      const state = pageState(p, failPages);
      const runFolder = p.folder ? (p.folder.split("/").pop() ?? null) : null;
      const node: PageNode = {
        pageId: p.page,
        title: !store.phase2 ? (bookTitle ?? "title not found") : found ? (name?.en ?? name?.ja ?? "title not found") : "title not found",
        titleJa: store.phase2 && found && name?.en ? (name?.ja ?? null) : null,
        titleFound: found,
        pageOf: store.phase2 ? pageOfArticle(p.page, order) : bookPageNumber(p.page),
        state,
        verdict: p.event?.verdict ?? null,
        score: null,
        seconds: p.row?.seconds ?? null,
        calls: 0,
        tokens: null,
        folder: p.folder,
        runFolder,
        listLabel: p.listStamp ? listLabel(p.listStamp) : null,
        listStamp: p.listStamp,
        epoch: p.event?.epoch ?? p.row?.startedEpoch ?? null,
        running: p.kind === "running",
        runningBoxes: p.kind === "running" ? runningBoxes : [],
        groups: [],
        stepsShown: openPages === null || openPages.has(p.page) || p.kind === "running" || (live !== null && live.page === p.page),
        error: null,
      };
      if (p.kind === "not-started") {
        notStarted.push({ pageId: node.pageId, title: node.title, pageOf: node.pageOf });
        continue;
      }
      const pageUpdates = runUpdates.filter((u) => u.page === p.page);
      if (p.folder) {
        try {
          const files = (await loadPageFiles(root, p.folder, p.kind !== "running")) as PageFiles & { wallSeconds?: number | null };
          const ctx = { running: p.kind === "running", runningBoxes: node.runningBoxes };
          if (node.stepsShown) node.groups = pageSteps(files, ctx, pageUpdates);
          const qa3 = files.qa.QA_3;
          if (qa3) {
            node.verdict = node.verdict ?? qa3.verdict;
            node.score = qa3.score;
          }
          const tok = sumTokens([callsTokens(files.calls).tokens, callsTokens(files.lossCalls).tokens]);
          node.tokens = tok.tokens;
          node.calls = tok.tokens?.calls ?? 0;
          node.seconds = files.wallSeconds ?? (p.kind === "running" && p.row?.startedEpoch ? Math.max(0, t0 / 1000 - p.row.startedEpoch) : node.seconds);
        } catch {
          node.error = `The page run folder ${p.folder} cannot be read.`;
        }
      } else {
        node.error = "No page run folder is stored for this page.";
        node.groups = pageUpdates.length ? pageSteps({ calls: [], lossCalls: [], reference: null, criticCounts: {}, qa: {} }, { running: false, runningBoxes: [] }, pageUpdates) : [];
      }
      pages.push(node);
    }
    const startEpoch = runId ? Date.parse(runId) / 1000 : null;
    const firstList = lists[0]?.stamp ?? null;
    const runStart = startEpoch !== null && Number.isFinite(startEpoch) ? startEpoch : stampEpoch(firstList);
    const word = runActive ? runWord("running") : runWord(statusState === "running" ? "stopped" : statusState);
    if (store.phase2) {
      return {
        runId,
        runLabel: runStart !== null ? `phase 2 run started ${pstDateTime(runStart)}` : "phase 2 run",
        runWord: word,
        lists: lists.map((l) => ({ stamp: l.stamp, label: listLabel(l.stamp) })),
        pages,
        notStarted,
        updates: runUpdates.map((u) => ({ ...u, pageText: pageText(u.page, order, names) })),
        generatedEpoch: Math.floor(t0 / 1000),
        millis: Date.now() - t0,
        error: null,
        updateLive: live,
      };
    }
    // Unit VW85: a book run. The phase comes from the start row of the run (translator_run.py:3263), else from status.json.
    const startRow = [...historyRows].reverse().find((r) => r.event === "start" && r.run_id === runId);
    const phase = str(startRow?.phase) ?? str(status?.phase) ?? store.phase;
    const kind = `${phaseWord(phase) ?? "book"} run of ${bookName}`;
    return {
      runId,
      runLabel: runStart !== null ? `${kind} started ${pstDateTime(runStart)}` : kind,
      runWord: { ...word, help: word.help.replace("the phase 2 run", "the book run") },
      lists: lists.map((l) => ({ stamp: l.stamp, label: listLabel(l.stamp) })),
      pages,
      notStarted,
      updates: runUpdates.map((u) => ({ ...u, pageText: bookPageText(u.page, bookTitle) })),
      generatedEpoch: Math.floor(t0 / 1000),
      millis: Date.now() - t0,
      error: null,
      book: { slug: store.book, title: bookTitle, phase },
      updateLive: live,
      // Q-A 3:26.3 (b): "A frozen box shows "Frozen since page n" in the step view". The events of this run only (freeze.py:42-47).
      frozen: frozenBoxes(historyRows, runId),
    };
  } catch (e) {
    const what = store.phase2 ? "the phase 2 files" : `the files of the book ${bookName}`;
    return { ...empty, millis: Date.now() - t0, error: `The step view cannot read ${what}: ${(e as Error).message}` };
  }
}

// ---------------------------------------------------------------- data of one step (level 3)

export interface StepQuery {
  /** "pilot-run/<a>_<p>/<run>" for a step of a page run. */
  folder: string | null;
  /** "box:TL_2", "critic:TL_2", "loss", "update:TL_3". */
  step: string | null;
  /** Page ID for an update point. */
  page: string | null;
  /** Box and version for a prompt diff of the run view. */
  diff: string | null;
  version: string | null;
}

const BOX = /^(?:TS|TL|ED|QA)_[0-3]$/;

/** A folder of a page run: "pilot-run/<page folder>/<run folder>", each part a safe segment. */
export function safeRunFolder(folder: string | null): string | null {
  if (!folder) return null;
  const parts = folder.replace(/^\/+/, "").replace(/^data\//, "").split("/");
  if (parts.length !== 3 || parts[0] !== "pilot-run" || !parts.every(isSafeSegment)) return null;
  return parts.join("/");
}

function safePage(page: string | null): string | null {
  if (!page) return null;
  const parts = page.split("/");
  return parts.length === 2 && parts.every(isSafeSegment) ? page : null;
}

function textSection(title: string, text: string | null, file: string): Section {
  if (text === null) return { kind: "note", text: `${title}: the file ${file} does not exist.` };
  return { kind: "text", title, text, mb: sizeMb(Buffer.byteLength(text, "utf-8")), file };
}

/** The data of one step. A wrong query gives a plain message. */
export async function loadStepData(root: string, q: StepQuery, store: RunStore = PHASE2_STORE): Promise<StepData> {
  try {
    // Unit VW85: a prompt diff and an update point read the store of the run. A page run folder is the same for phase 2 and a book.
    if (q.diff) return await loadPromptDiff(root, q.diff, q.version, store);
    const step = q.step ?? "";
    if (step.startsWith("update:")) return await loadUpdateData(root, safePage(q.page), step.slice(7), store);
    const folder = safeRunFolder(q.folder);
    if (!folder) return { title: "Step data", sections: [{ kind: "note", text: "The request names no valid page run folder." }] };
    const calls = parseJsonl(await readTextRel(root, path.join(folder, "calls.jsonl")));
    const page = str(rec(await readJsonRel(root, path.join(folder, "run.json")))?.page);
    const pageLink = page ? [{ text: "Page view of this page run", href: pageHref(page, folder.split("/")[2]) }] : [];
    if (step === "loss") {
      const base = path.join(folder, "reference-diff-critic");
      const parsed = await readJsonRel(root, path.join(base, "parsed", "reference-diff-critic.json"));
      const reference = await readJsonRel(root, path.join(folder, "critiques", "reference.json"));
      const lossCalls = parseJsonl(await readTextRel(root, path.join(base, "calls.jsonl")));
      const msgRel = path.join(base, "messages", "reference-diff-critic.txt");
      const sections = stepDataSections({ kind: "loss", code: "reference-diff-critic", calls: lossCalls, parsed, reference });
      sections.push(textSection("Exact text sent", await readTextRel(root, msgRel), msgRel));
      sections.push({
        kind: "links",
        title: "Files",
        links: [
          ...pageLink,
          { text: "parsed/reference-diff-critic.json", href: jsonViewHref(path.join(base, "parsed", "reference-diff-critic.json")) },
          { text: "critiques/reference.json", href: jsonViewHref(path.join(folder, "critiques", "reference.json")) },
          { text: "messages/reference-diff-critic.txt", href: jsonViewHref(msgRel) },
          { text: "reference-diff-critic/calls.jsonl", href: jsonViewHref(path.join(base, "calls.jsonl")) },
        ],
      });
      return { title: "Loss function: reference-diff-critic", sections };
    }
    const m = /^(box|critic):(.+)$/.exec(step);
    if (!m || !BOX.test(m[2])) return { title: "Step data", sections: [{ kind: "note", text: `The request names no valid step: ${JSON.stringify(step)}.` }] };
    const box = m[2];
    const tag = m[1] === "critic" ? `box-critic.${box}` : box;
    const parsedRel = path.join(folder, "parsed", `${tag}.json`);
    const resultsRel = path.join(folder, "results", `${box}.json`);
    const msgRel = path.join(folder, "messages", `${tag}.txt`);
    const parsed = await readJsonRel(root, parsedRel);
    const links = [...pageLink, { text: `parsed/${tag}.json`, href: jsonViewHref(parsedRel) }, { text: `messages/${tag}.txt`, href: jsonViewHref(msgRel) }];
    if (m[1] === "critic") {
      const queue = parseJsonl(await readTextRel(root, path.join(folder, "critiques", `queue-${box}.jsonl`)));
      const sections = stepDataSections({ kind: "critic", code: tag, calls, parsed, queue });
      sections.push(textSection("Exact text sent", await readTextRel(root, msgRel), msgRel));
      links.push({ text: `critiques/queue-${box}.jsonl`, href: jsonViewHref(path.join(folder, "critiques", `queue-${box}.jsonl`)) });
      sections.push({ kind: "links", title: "Files", links });
      return { title: `Backward pass: box-critic.${box}`, code: tag, sections };
    }
    const results = await readJsonRel(root, resultsRel);
    const programs: { name: string; value: unknown; rel: string }[] = [];
    for (const name of (await listDirRel(root, path.join(folder, "programs"))).sort()) {
      if (!name.endsWith(`.${box}.json`)) continue;
      const rel = path.join(folder, "programs", name);
      programs.push({ name, value: await readJsonRel(root, rel), rel });
    }
    const sections = stepDataSections({ kind: "box", code: box, calls, parsed, results, programs });
    const sent = await readTextRel(root, msgRel);
    if (sent !== null || !box.startsWith("TS_")) sections.push(textSection("Exact text sent", sent, msgRel));
    links.push({ text: `results/${box}.json`, href: jsonViewHref(resultsRel) });
    for (const p of programs) links.push({ text: `programs/${p.name}`, href: jsonViewHref(p.rel) });
    links.push({ text: "calls.jsonl", href: jsonViewHref(path.join(folder, "calls.jsonl")) }, { text: "Page run folder", href: jsonViewHref(folder) });
    sections.push({ kind: "links", title: "Files", links });
    return { title: box, code: box, sections };
  } catch (e) {
    return { title: "Step data", sections: [{ kind: "note", text: `The step data cannot be read: ${(e as Error).message}` }] };
  }
}

async function loadPromptDiff(root: string, box: string, version: string | null, store: RunStore = PHASE2_STORE): Promise<StepData> {
  if (!BOX.test(box) || !version || !/^v[0-9][0-9.]*$/.test(version)) return { title: "Prompt diff", sections: [{ kind: "note", text: "The request names no valid box and version." }] };
  const newRel = path.join(store.dir, "prompts", box, `${version}.json`);
  const v = rec(await readJsonRel(root, newRel));
  if (!v) return { title: "Prompt diff", sections: [{ kind: "note", text: `The prompt file ${newRel} does not exist.` }] };
  const parentVersion = str(v.parent) ?? str(rec(v.parent)?.version);
  const oldRel = parentVersion && /^v[0-9][0-9.]*$/.test(parentVersion) ? path.join(store.dir, "prompts", box, `${parentVersion}.json`) : null;
  const old = oldRel ? rec(await readJsonRel(root, oldRel)) : null;
  const lines = lineDiff(str(old?.text) ?? "", str(v.text) ?? "");
  const sections: Section[] = [
    {
      kind: "diff",
      title: `Prompt text ${versionChange(parentVersion, version)}`,
      lines,
      counts: diffCounts(lines),
    },
    {
      kind: "links",
      title: "Files",
      links: [
        ...(oldRel ? [{ text: `prompts/${box}/${parentVersion}.json`, href: jsonViewHref(oldRel) }] : []),
        { text: `prompts/${box}/${version}.json`, href: jsonViewHref(newRel) },
      ],
    },
  ];
  if (!old) sections.unshift({ kind: "note", text: "No parent version file exists, so every line shows as added." });
  return { title: `Prompt diff of ${box}`, code: box, sections };
}

async function loadUpdateData(root: string, page: string | null, box: string, store: RunStore = PHASE2_STORE): Promise<StepData> {
  if (!page || !BOX.test(box)) return { title: "Prompt update", sections: [{ kind: "note", text: "The request names no valid page and box." }] };
  const dir = path.join(store.dir, "update-points", pageName(store, page));
  const calls = parseJsonl(await readTextRel(root, path.join(dir, "calls.jsonl"))).filter((r) => (str(rec(r)?.tag) ?? "").startsWith(`${box}-`));
  const commitRel = path.join(dir, `commit-${box}.json`);
  const commit = rec(await readJsonRel(root, commitRel));
  const { updates } = await loadHistoryParts(root, store);
  const u = [...updates].reverse().find((x) => x.page === page && x.box === box) ?? null;
  const sections: Section[] = [];
  const rows: [string, string][] = [];
  if (u) {
    rows.push(["Started", u.startedEpoch !== null ? pstDateTime(u.startedEpoch) : "–"], ["Ended", u.endedEpoch !== null ? pstDateTime(u.endedEpoch) : "not ended yet"]);
    rows.push(["Result", u.result ?? "no result yet"], ["Prompt version", versionChange(u.parent, u.version) ?? "no new version went live"]);
    if (u.rubric) rows.push(["Rubric table version", versionChange(u.rubric.parent, u.rubric.version) ?? "–"], ["Rubric table changes", u.rubric.changeIds.join(", ") || "–"]);
    rows.push(["Critiques in the queue", String(u.queueCount)], ["Critique groups", `${u.softGroups ?? 0} soft, ${u.hardGroups ?? 0} hard`]);
  } else rows.push(["History", "history.jsonl holds no update point of this box after this page."]);
  if (commit) rows.push(["Audit verdict", str(rec(commit.audit)?.verdict) ?? "–"], ["New label", str(commit.new_label) ?? "–"]);
  sections.push({ kind: "pairs", title: "Update point", rows });
  const groups = Array.isArray(rec(commit?.ctx)?.groups) ? (rec(commit?.ctx)?.groups as unknown[]) : [];
  if (groups.length) {
    sections.push({
      kind: "units",
      title: "Critique groups",
      rows: groups.map((g) => ({ id: str(rec(g)?.group_id) ?? "?", text: str(rec(g)?.name) ?? JSON.stringify(g).slice(0, 400) })),
    });
  }
  sections.push({
    kind: "units",
    title: "Calls of the update point",
    rows: calls.map((r0) => {
      const r = rec(r0) ?? {};
      const role = str(r.update_role) ?? "";
      const word = UPDATE_ROLE_WORDS[role] ? `${role} (${UPDATE_ROLE_WORDS[role]})` : role || "role not stored";
      return { id: str(r.tag) ?? "?", text: `${word}, model ${str(r.model) ?? "–"}, ${num(r.seconds) ?? "–"} s${r.ok === false ? ", FAILED" : ""}` };
    }),
  });
  if (u?.version) {
    const d = await loadPromptDiff(root, box, u.version, store);
    sections.push(...d.sections.filter((s) => s.kind !== "links"));
  }
  if (u?.rubric?.changeIds.length) {
    const changes = parseJsonl(await readTextRel(root, path.join(store.dir, "rubric-tables", "changes.jsonl")));
    for (const c0 of changes) {
      const c = rec(c0);
      if (!c || !u.rubric.changeIds.includes(str(c.change_id) ?? "")) continue;
      const before = JSON.stringify(c.text_before ?? null, null, 2);
      const after = JSON.stringify(c.text_after ?? null, null, 2);
      const lines = lineDiff(before, after);
      sections.push({ kind: "diff", title: `Rubric table change ${str(c.change_id)}: ${str(c.kind) ?? "change"}, row ${num(c.row) ?? "?"}`, lines, counts: diffCounts(lines) });
    }
  }
  const links = [{ text: `commit-${box}.json`, href: jsonViewHref(commitRel) }, { text: "Update point folder", href: jsonViewHref(dir) }];
  for (const r of calls) {
    const tag = str(rec(r)?.tag);
    if (tag) links.push({ text: `messages/${tag}.txt`, href: jsonViewHref(path.join(dir, "messages", `${tag}.txt`)) });
  }
  sections.push({ kind: "links", title: "Files", links });
  return { title: `Prompt update of ${box} after page ${page}`, code: box, sections };
}
