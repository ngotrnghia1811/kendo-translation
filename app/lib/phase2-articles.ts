// Phase 2 articles: readable names and states (unit VW94, round 91). Pure functions: no file access, no clock of their own, no server-only import.
// Owner pick Q-A 3:17.4 (2026-11-11): "One grouped row": the 40 articles show as one closed group "Phase 2 articles (40)" below the phase 2 row.
// Owner note on that pick: "Annotate the names intuitively and properly. I cant understand what they are if you just write `Running` and each name is a long id number. Apply this for EVERYTHING."
// Owner pick Q-A 3:17.5: "Mark it in the run view": a page that an earlier list of the same phase 2 run accepted shows "accepted before restart".
// The server code (lib/phase2-articles-load.ts) reads the files and passes their text or JSON in. A test runs this file with plain node (scripts/vw94-test.mjs).
// Use only erasable TypeScript syntax here (no enum, no parameter property).
//
// File facts (read 2026-11-11 23:30 PST):
//   - <T2>/data/book-store/paired-dataset/status.json: keys run_id, list_stamp, running_page, running_boxes, accepted, fail_pages, last_accepted_page.
//   - history.jsonl of that folder: rows {utc, event, ...}. "start" holds run_id and list_stamp. "page-done" (accepted) and "page-failed" hold page, folder, verdict.
//     translator_run.py settle(): an accepted page gets "page-done", else "page-failed". An accepted page can hold the verdict FAIL (status.json fail_pages).
//   - <T2>/data/pilot-run/lists/<stamp>/progress.json: keys book ("paired-dataset"), phase ("agent-phase-2"), pages [{page_id: "94380515/p001", state, ...}].
//   - <T2>/data/item-metadata/items.filled.jsonl: item_id (UUID), title_en, title_ja. A phase 2 page ID starts with the first 8 hex digits of item_id.
//   - Box codes stay codes (Q-A 3:18.5). Their hover text: lib/box-names.ts.
import { pageHref } from "./format";
import { parseUtcIso, pstDateTime, pstStamp, relativeTime } from "./pst";

/** The store folder and the book of phase 2 (PHASE2_BOOK in book-status.ts, prompts.py:26). */
export const PHASE2_BOOK = "paired-dataset";
export const PHASE2_PHASE = "agent-phase-2";
/** Title of the grouped row (Q-A 3:17.4). */
export const ARTICLES_TITLE = "Phase 2 articles";
export const TITLE_NOT_FOUND = "title not found";
/** Source of the titles. The file says status "draft, not checked by the owner". */
export const TITLES_NOTE = "Titles come from item-metadata/items.filled.jsonl. The owner did not check these titles yet.";

function rec(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x !== "") : [];
}

// ---------------------------------------------------------------- list folders

/** True for a list folder of phase 2: progress.json holds the book "paired-dataset". Such a list holds articles, not books, so it gives no book row. */
export function isPhase2List(progress: unknown): boolean {
  return rec(progress)?.book === PHASE2_BOOK;
}

/** Page IDs of a progress.json, in list order. */
export function listPageIds(progress: unknown): string[] {
  const pages = rec(progress)?.pages;
  if (!Array.isArray(pages)) return [];
  const out: string[] = [];
  for (const p of pages) {
    const id = asStr(rec(p)?.page_id);
    if (id) out.push(id);
  }
  return out;
}

/** "20261112T044136Z" gives its epoch seconds, else null. */
export function stampEpoch(stamp: string | null | undefined): number | null {
  const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/.exec(stamp ?? "");
  return m ? parseUtcIso(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`) : null;
}

/** Readable name of a list folder: "list started 2026-11-11 20:41 PST". A stamp of another form stays as it is. */
export function listLabel(stamp: string): string {
  const e = stampEpoch(stamp);
  return e === null ? `list ${stamp}` : `list started ${pstDateTime(e)}`;
}

// ---------------------------------------------------------------- article names

/** The first part of a page ID, when it is 8 hex digits: "94380515/p001" gives "94380515". Else null. */
export function shortIdOf(pageId: string): string | null {
  const first = pageId.split("/")[0];
  return /^[0-9a-f]{8}$/.test(first) ? first : null;
}

export interface TitleRecord {
  id: string;
  en: string | null;
  ja: string | null;
}

/** The records of items.filled.jsonl (one JSON object per line). A broken line is skipped. */
export function parseTitleRecords(text: string): TitleRecord[] {
  const out: TitleRecord[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = rec(JSON.parse(line));
      const id = r && typeof r.item_id === "string" ? r.item_id : null;
      if (r && id) out.push({ id, en: asStr(r.title_en), ja: asStr(r.title_ja) });
    } catch {
      /* skip a broken line */
    }
  }
  return out;
}

export interface ArticleName {
  shortId: string;
  /** English title, or null when no single item matches. */
  en: string | null;
  ja: string | null;
  /** "one": exactly one item_id starts with the short ID. "none" and "several" show the text "title not found". */
  match: "one" | "none" | "several";
}

/** The name of each short ID. A short ID that matches no item_id or more than one item_id gets no title. */
export function articleNames(shortIds: Iterable<string>, records: TitleRecord[]): Map<string, ArticleName> {
  const out = new Map<string, ArticleName>();
  for (const s of shortIds) {
    if (out.has(s)) continue;
    const hits = records.filter((r) => r.id.startsWith(s));
    if (hits.length === 1) out.set(s, { shortId: s, en: hits[0].en, ja: hits[0].ja, match: "one" });
    else out.set(s, { shortId: s, en: null, ja: null, match: hits.length === 0 ? "none" : "several" });
  }
  return out;
}

/** Main label of an article: the English title, else the Japanese title, else "title not found". */
export function nameMain(n: ArticleName | undefined): string {
  if (!n || n.match !== "one") return TITLE_NOT_FOUND;
  return n.en ?? n.ja ?? TITLE_NOT_FOUND;
}

/** "page 2 of 4" for a page ID in the list order of its article. Null when the page is not in the list. */
export function pageOfArticle(pageId: string, order: string[]): string | null {
  const art = pageId.split("/")[0];
  const pages = order.filter((p) => p.split("/")[0] === art);
  const i = pages.indexOf(pageId);
  return i < 0 ? null : `page ${i + 1} of ${pages.length}`;
}

/** Readable text of a page ID: "Koda Kunihide’s ... Part 1: Basic movement, page 1 of 3 (94380515/p001)". */
export function pageText(pageId: string, order: string[], names: Map<string, ArticleName>): string {
  const s = shortIdOf(pageId);
  const of = pageOfArticle(pageId, order);
  const title = s ? nameMain(names.get(s)) : null;
  if (!title) return of ? `${of} (${pageId})` : pageId;
  return `${title}, ${of ?? pageId.split("/").slice(1).join("/")} (${pageId})`;
}

// ---------------------------------------------------------------- box names

// Unit VW94 fix round, Q-A 3:18.5 "Keep codes, explain on hover": box codes stay as codes in all texts of this file.
// The hover text comes from lib/box-names.ts (boxHelp), and components/BoxCode.tsx (BoxText) adds it on the screen.

// ---------------------------------------------------------------- history.jsonl

/** All JSON object rows of history.jsonl, in file order. A broken line is skipped. Each line is parsed on its own. */
export function parseHistory(text: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const v = rec(JSON.parse(t));
      if (v) out.push(v);
    } catch {
      /* skip a broken or partial line */
    }
  }
  return out;
}

export interface PageEvent {
  page: string;
  accepted: boolean;
  verdict: string | null;
  /** Folder below the data folder: "pilot-run/94380515_p001/20261112T023022Z-r41". */
  folder: string | null;
  /** Folder name of the page run: "20261112T023022Z-r41". */
  runFolder: string | null;
  epoch: number | null;
  /** List folder and run ID of the "start" row before this row. Null when no start row comes before it. */
  listStamp: string | null;
  runId: string | null;
}

export interface Phase2History {
  /** List stamp to run ID, from the "start" rows. */
  listRun: Map<string, string>;
  /** Run ID of the last "start" row, or null. */
  lastRunId: string | null;
  /** "page-done" and "page-failed" rows, in file order. */
  pageEvents: PageEvent[];
}

function folderRel(v: unknown): string | null {
  const f = asStr(v);
  if (!f) return null;
  const rel = f.replace(/^\/+/, "").replace(/^data\//, "");
  return rel.split("/").includes("..") ? null : rel;
}

/** The start rows and the page rows of history.jsonl. Each page row belongs to the run of the start row before it. */
export function phase2History(rows: Record<string, unknown>[]): Phase2History {
  const listRun = new Map<string, string>();
  const pageEvents: PageEvent[] = [];
  let listStamp: string | null = null;
  let runId: string | null = null;
  for (const r of rows) {
    if (r.event === "start") {
      listStamp = asStr(r.list_stamp);
      runId = asStr(r.run_id);
      if (listStamp && runId) listRun.set(listStamp, runId);
      continue;
    }
    if (r.event !== "page-done" && r.event !== "page-failed") continue;
    const page = asStr(r.page);
    if (!page) continue;
    const folder = folderRel(r.folder);
    pageEvents.push({
      page,
      accepted: r.event === "page-done",
      verdict: asStr(r.verdict),
      folder,
      runFolder: folder ? (folder.split("/").pop() ?? null) : null,
      epoch: parseUtcIso(r.utc),
      listStamp,
      runId,
    });
  }
  return { listRun, lastRunId: runId, pageEvents };
}

/** The last page row of each page in one run. */
export function lastPageEvents(h: Phase2History, runId: string | null): Map<string, PageEvent> {
  const out = new Map<string, PageEvent>();
  if (!runId) return out;
  for (const e of h.pageEvents) if (e.runId === runId) out.set(e.page, e);
  return out;
}

// ---------------------------------------------------------------- run view: accepted before restart

export interface AcceptedBefore {
  verdict: string | null;
  epoch: number | null;
  /** The list folder that accepted the page. */
  listStamp: string;
  runFolder: string | null;
  /** Page view of that page run: "/page/94380515/p001?run=20261112T023022Z-r41". */
  href: string;
}

/**
 * Pages that an earlier list of the same phase 2 run accepted (Q-A 3:17.5). The run of a list comes from its "start" row.
 * A page counts when its last page row in an earlier list of that run is "page-done". A list with no start row gives an empty map.
 */
export function acceptedBeforeRestart(stamp: string, h: Phase2History): Map<string, AcceptedBefore> {
  const out = new Map<string, AcceptedBefore>();
  const runId = h.listRun.get(stamp);
  if (!runId) return out;
  const last = new Map<string, PageEvent>();
  for (const e of h.pageEvents) {
    if (e.runId !== runId || !e.listStamp || e.listStamp >= stamp) continue;
    last.set(e.page, e);
  }
  for (const [page, e] of last) {
    if (!e.accepted || !e.listStamp) continue;
    out.set(page, { verdict: e.verdict, epoch: e.epoch, listStamp: e.listStamp, runFolder: e.runFolder, href: pageHref(page, e.runFolder ?? undefined) });
  }
  return out;
}

/** The mark applies to a row that this list shows as not started (state waiting, 0 calls done). */
export function showsAcceptedBefore(row: { state: string; callsDone: number }): boolean {
  return row.state === "waiting" && row.callsDone === 0;
}

/** Text of the mark: "Accepted before restart: verdict PASS, Nov 11 18:53 PST, in the list started 2026-11-11 18:30 PST." */
export function acceptedBeforeText(a: AcceptedBefore): string {
  const verdict = a.verdict ? `verdict ${a.verdict}` : "verdict not stored";
  const when = a.epoch === null ? "" : `, ${pstStamp(a.epoch)}`;
  return `Accepted before restart: ${verdict}${when}, in the ${listLabel(a.listStamp)}.`;
}

/** Help text of the mark. */
export const ACCEPTED_BEFORE_HELP =
  "This list shows the page as not started yet (state waiting) with 0 calls, because the run restarted with a new list folder. history.jsonl of the phase 2 run holds the event page-done for this page.";

// Page states of a list in the run view: lib/run-view-words.ts (fix round).

// ---------------------------------------------------------------- the grouped row

export type ArticleStateKey = "translating" | "accepted" | "partly" | "stopped" | "failed" | "not-started";

/** The help line of each state word (shown as a legend in the open group and as the title attribute of the state). */
export const ARTICLE_STATE_HELP: Record<ArticleStateKey, string> = {
  translating: "Translating now: the phase 2 run works on this page of the article now.",
  accepted: "Accepted: the phase 2 run accepted every page of the article (event page-done in history.jsonl).",
  partly: "Partly accepted: the run accepted some pages of the article. The next page waits for its turn.",
  stopped: "Stopped: the run stopped before it accepted every page of the article.",
  failed: "Not accepted: the run wrote the event page-failed for a page of the article.",
  "not-started": "Not started yet: the run did not reach this article. The run takes the articles in list order.",
};

export interface ArticlePage {
  pageId: string;
  /** "page 2" */
  label: string;
  state: "accepted" | "translating" | "failed" | "waiting";
  verdict: string | null;
  /** Page view of the accepting page run, or null. */
  href: string | null;
}

export interface ArticleLine {
  shortId: string;
  name: ArticleName;
  pagesTotal: number;
  acceptedCount: number;
  /** Accepted pages with the verdict FAIL. */
  failVerdicts: number;
  key: ArticleStateKey;
  /** "Translating now: page 2 of 4" */
  stateText: string;
  pages: ArticlePage[];
}

export interface Phase2ArticlesView {
  /** "ok", or "no-list" when no list folder of phase 2 exists (the group shows a grey "no data" line). */
  kind: "ok" | "no-list";
  /** Newest list folder of the phase 2 run, for the link "Run view". */
  listStamp: string | null;
  runViewHref: string | null;
  /** Page IDs of the newest list, in list order. */
  order: string[];
  articles: ArticleLine[];
  /** Short IDs with no single title (none or several item_ids). */
  missingTitles: string[];
  /** Readable names of the IDs of the phase 2 row, built on the server. */
  running: { pageId: string; text: string; boxes: string[] } | null;
  lastAccepted: { pageId: string; text: string; href: string | null } | null;
  lastEvent: { text: string; epoch: number | null } | null;
  acceptedArticles: number;
}

export interface ArticlesInput {
  /** Page IDs of the newest phase 2 list, in list order. Empty when no list exists. */
  order: string[];
  listStamp: string | null;
  /** status.json of the phase 2 store, or null. */
  status: Record<string, unknown> | null;
  /** True while the phase 2 row shows Running or Running with pause requested. */
  runActive: boolean;
  history: Phase2History;
  /** The last row of history.jsonl, or null. */
  lastRow: Record<string, unknown> | null;
  names: Map<string, ArticleName>;
}

function articleOrder(order: string[]): { id: string; pages: string[] }[] {
  const out: { id: string; pages: string[] }[] = [];
  const at = new Map<string, number>();
  for (const p of order) {
    const a = p.split("/")[0];
    let i = at.get(a);
    if (i === undefined) {
      i = out.length;
      at.set(a, i);
      out.push({ id: a, pages: [] });
    }
    out[i].pages.push(p);
  }
  return out;
}

/** The state of one article from the accepted pages, the running page, and the failed pages. */
export function articleState(pages: string[], accepted: Set<string>, failed: Set<string>, runningPage: string | null, runActive: boolean): { key: ArticleStateKey; text: string } {
  const n = pages.length;
  const a = pages.filter((p) => accepted.has(p)).length;
  const ri = runActive && runningPage ? pages.indexOf(runningPage) : -1;
  if (ri >= 0) return { key: "translating", text: `Translating now: page ${ri + 1} of ${n}` };
  if (a === n && n > 0) return { key: "accepted", text: `Accepted: ${n} of ${n} ${n === 1 ? "page" : "pages"}` };
  const fi = pages.findIndex((p) => failed.has(p) && !accepted.has(p));
  if (fi >= 0) return { key: "failed", text: `Not accepted: page ${fi + 1} of ${n}` };
  if (a > 0) return runActive ? { key: "partly", text: `Partly accepted: ${a} of ${n} pages` } : { key: "stopped", text: `Stopped: ${a} of ${n} pages accepted` };
  return { key: "not-started", text: "Not started yet" };
}

/** Readable text of the last row of history.jsonl. The event name stays, and its fields give the readable part. */
export function eventText(row: Record<string, unknown>, order: string[], names: Map<string, ArticleName>): string {
  const ev = asStr(row.event) ?? "unknown event";
  const page = asStr(row.page);
  const box = asStr(row.box);
  const pt = page ? pageText(page, order, names) : null;
  switch (ev) {
    case "page-done":
      return `${ev} (page accepted: ${pt ?? "page not stored"}, verdict ${asStr(row.verdict) ?? "not stored"})`;
    case "page-failed":
      return `${ev} (page not accepted: ${pt ?? "page not stored"})`;
    case "update-point-started":
      return `${ev} (prompt update of box ${box ?? "not stored"} started${pt ? ` after ${pt}` : ""})`;
    case "update-point-ended":
      return `${ev} (prompt update of box ${box ?? "not stored"} ended, result: ${asStr(row.result) ?? "not stored"})`;
    case "prompt-live":
      return `${ev} (prompt version ${asStr(row.version) ?? "not stored"} of box ${box ?? "not stored"} is live)`;
    case "start":
      return `${ev} (the run started the ${listLabel(asStr(row.list_stamp) ?? "")})`;
    case "stopped":
      return `${ev} (the run stopped${asStr(row.text) ? `: ${String(row.text).replace(/^stopped:\s*/i, "").slice(0, 140)}` : ""})`;
    default:
      return box ? `${ev} (box ${box})` : ev;
  }
}

/** The view of the grouped row and the readable names of the phase 2 row. */
export function buildArticles(input: ArticlesInput): Phase2ArticlesView {
  const st = input.status;
  const runId = asStr(st?.run_id) ?? input.history.lastRunId;
  const events = lastPageEvents(input.history, runId);
  const acceptedList = st && Array.isArray(st.accepted) ? strList(st.accepted) : [...events.values()].filter((e) => e.accepted).map((e) => e.page);
  const accepted = new Set(acceptedList);
  const failVerdict = new Set(strList(st?.fail_pages));
  const failed = new Set([...events.values()].filter((e) => !e.accepted).map((e) => e.page));
  const runningPage = asStr(st?.running_page);
  const order = input.order;
  const runViewHref = input.listStamp ? `/runs/${encodeURIComponent(input.listStamp)}` : null;
  const articles: ArticleLine[] = [];
  for (const art of articleOrder(order)) {
    const name = input.names.get(art.id) ?? { shortId: art.id, en: null, ja: null, match: "none" as const };
    const s = articleState(art.pages, accepted, failed, runningPage, input.runActive);
    const pages: ArticlePage[] = art.pages.map((p, i) => {
      const e = events.get(p);
      const isAcc = accepted.has(p);
      const state: ArticlePage["state"] = isAcc ? "accepted" : input.runActive && p === runningPage ? "translating" : failed.has(p) ? "failed" : "waiting";
      return { pageId: p, label: `page ${i + 1}`, state, verdict: e?.verdict ?? null, href: isAcc && e?.accepted ? pageHref(p, e.runFolder ?? undefined) : null };
    });
    articles.push({
      shortId: art.id,
      name,
      pagesTotal: art.pages.length,
      acceptedCount: art.pages.filter((p) => accepted.has(p)).length,
      failVerdicts: art.pages.filter((p) => accepted.has(p) && failVerdict.has(p)).length,
      key: s.key,
      stateText: s.text,
      pages,
    });
  }
  const boxes = strList(st?.running_boxes);
  const running = input.runActive && runningPage ? { pageId: runningPage, text: pageText(runningPage, order, input.names), boxes } : null;
  const lastAcc = asStr(st?.last_accepted_page) ?? (acceptedList.length > 0 ? acceptedList[acceptedList.length - 1] : null);
  const lastAccEvent = lastAcc ? events.get(lastAcc) : undefined;
  return {
    kind: order.length > 0 ? "ok" : "no-list",
    listStamp: input.listStamp,
    runViewHref,
    order,
    articles,
    missingTitles: articles.filter((a) => a.name.match !== "one").map((a) => a.shortId),
    running,
    lastAccepted: lastAcc ? { pageId: lastAcc, text: pageText(lastAcc, order, input.names), href: lastAccEvent?.accepted ? pageHref(lastAcc, lastAccEvent.runFolder ?? undefined) : null } : null,
    lastEvent: input.lastRow ? { text: eventText(input.lastRow, order, input.names), epoch: parseUtcIso(input.lastRow.utc) } : null,
    acceptedArticles: articles.filter((a) => a.key === "accepted").length,
  };
}

/** Count line of the closed group: "3 accepted · 1 translating now · 36 not started yet". Zero counts do not show. */
export function articlesCountText(v: Phase2ArticlesView): string {
  const words: [ArticleStateKey, string][] = [
    ["accepted", "accepted"],
    ["translating", "translating now"],
    ["partly", "partly accepted"],
    ["stopped", "stopped"],
    ["failed", "not accepted"],
    ["not-started", "not started yet"],
  ];
  const parts: string[] = [];
  for (const [k, w] of words) {
    const n = v.articles.filter((a) => a.key === k).length;
    if (n > 0) parts.push(`${n} ${w}`);
  }
  return parts.join(" · ");
}

// ---------------------------------------------------------------- readable lines of the phase 2 row

/** Plain words for the state of the phase 2 row (the label stays, these words follow it). Keys of BaseKey in book-status-rules.ts. */
export const PHASE2_STATE_HELP: Record<string, string> = {
  running: "the Translator process is alive and translates one page at a time.",
  "running-pause": "a pause is requested. The process ends after the current page.",
  stopped: "the process ended. See the stop reason below.",
  unexpected: "the process gives no sign of life. See the line below.",
  failure: "the process ended because of a failure. See the error below.",
  completed: "the run accepted every page of its list.",
  // "not-started" and "unreadable" get no words here: the first line of the row already explains them ("No run yet.", "The file status.json cannot be read").
};

export interface RowOverride {
  text: string;
  links?: { text: string; href: string }[];
}

/**
 * Readable texts for lines of the phase 2 row, by the line key of phase2Text (lib/phase2-row.ts). The component uses these in place of the old texts.
 * New line "run-view" holds the link "Run view". `now` is epoch seconds.
 */
export function phase2Overrides(v: Phase2ArticlesView, now: number, pagesDone: number | null, pagesTotal: number | null): Record<string, RowOverride> {
  const out: Record<string, RowOverride> = {};
  if (pagesDone !== null && v.articles.length > 0) {
    const total = pagesTotal === null ? "" : ` of ${pagesTotal}`;
    out.progress = { text: `Pages done: ${pagesDone}${total} (articles accepted: ${v.acceptedArticles} of ${v.articles.length})` };
  }
  if (v.running) {
    const boxes = v.running.boxes.length === 0 ? "" : v.running.boxes.length === 1 ? `, box ${v.running.boxes[0]}` : `, boxes ${v.running.boxes.join(", ")}`;
    out.now = { text: `Now: ${v.running.text}${boxes}.` };
  }
  if (v.lastAccepted) {
    out["last-accepted"] = v.lastAccepted.href
      ? { text: `Last accepted page: ${v.lastAccepted.text}. `, links: [{ text: "Page view", href: v.lastAccepted.href }] }
      : { text: `Last accepted page: ${v.lastAccepted.text}.` };
  }
  if (v.lastEvent) {
    const e = v.lastEvent.epoch;
    out["last-event"] = { text: e === null ? `Last event: ${v.lastEvent.text}` : `Last event: ${v.lastEvent.text}, ${pstStamp(e)} (${relativeTime(e, now)})` };
  }
  if (v.runViewHref && v.listStamp) {
    out["run-view"] = { text: `Run view of the newest list (${listLabel(v.listStamp)}): `, links: [{ text: "Run view", href: v.runViewHref }] };
  }
  return out;
}

/** Text after "Running" or another state word of the running group when no book runs but phase 2 runs. */
export function runningGroupNote(phase2Key: string | null | undefined): string | null {
  return phase2Key === "running" || phase2Key === "running-pause" ? "No book runs now. The phase 2 run runs: see the row Phase 2 (paired dataset) below." : null;
}
