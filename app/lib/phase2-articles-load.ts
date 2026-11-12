import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  PHASE2_BOOK,
  acceptedBeforeRestart,
  articleNames,
  buildArticles,
  isPhase2List,
  listPageIds,
  parseHistory,
  parseTitleRecords,
  phase2History,
  shortIdOf,
  type AcceptedBefore,
  type ArticleName,
  type Phase2ArticlesView,
  type Phase2History,
  type TitleRecord,
} from "./phase2-articles";

/**
 * Server side of the phase 2 articles (unit VW94, round 91, Q-A 3:17.4 and 3:17.5). It reads files and writes none.
 * Files: <data>/item-metadata/items.filled.jsonl (titles), <data>/book-store/paired-dataset/status.json and history.jsonl, and the progress.json
 * of the list folders (the Monitor passes the lists that it already read).
 * The 3 s poll stays cheap: the titles file (0.6 MB) and history.jsonl are parsed again only when their modification time or size changed.
 * status.json is small and is read at each poll. No page folder is read.
 * A missing or broken file gives empty data, never an error: the screen then shows a grey line.
 */

interface Cached<T> {
  mtimeMs: number;
  size: number;
  value: T;
}
const titleCache = new Map<string, Cached<TitleRecord[]>>();
const historyCache = new Map<string, Cached<{ history: Phase2History; last: Record<string, unknown> | null }>>();

async function readWithCache<T>(file: string, cache: Map<string, Cached<T>>, parse: (text: string) => T): Promise<T | null> {
  let st;
  try {
    st = await fs.stat(file);
  } catch {
    cache.delete(file);
    return null;
  }
  if (!st.isFile()) return null;
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit.value;
  let text: string;
  try {
    text = await fs.readFile(file, "utf-8");
  } catch {
    cache.delete(file);
    return null;
  }
  const value = parse(text);
  cache.set(file, { mtimeMs: st.mtimeMs, size: st.size, value });
  return value;
}

/** The title records. items.filled.jsonl first, else items.draft.jsonl (the rule of loadTitles in book-status.ts). */
export async function loadTitleRecords(root: string): Promise<TitleRecord[]> {
  for (const name of ["items.filled.jsonl", "items.draft.jsonl"]) {
    const v = await readWithCache(path.join(root, "item-metadata", name), titleCache, parseTitleRecords);
    if (v) return v;
  }
  return [];
}

/** The start rows and page rows of the phase 2 history, and its last row. */
export async function loadPhase2History(root: string): Promise<{ history: Phase2History; last: Record<string, unknown> | null }> {
  const v = await readWithCache(path.join(root, "book-store", PHASE2_BOOK, "history.jsonl"), historyCache, (text) => {
    const rows = parseHistory(text);
    return { history: phase2History(rows), last: rows.length > 0 ? rows[rows.length - 1] : null };
  });
  return v ?? { history: { listRun: new Map(), lastRunId: null, pageEvents: [] }, last: null };
}

async function readStatus(root: string): Promise<Record<string, unknown> | null> {
  try {
    const v = JSON.parse(await fs.readFile(path.join(root, "book-store", PHASE2_BOOK, "status.json"), "utf-8"));
    return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Names of the short IDs of a list of page IDs. */
export async function loadArticleNames(root: string, pageIds: string[]): Promise<Map<string, ArticleName>> {
  const ids = new Set<string>();
  for (const p of pageIds) {
    const s = shortIdOf(p);
    if (s) ids.add(s);
  }
  if (ids.size === 0) return new Map();
  return articleNames(ids, await loadTitleRecords(root));
}

/**
 * The grouped row of the Monitor dashboard. `lists` are the list folders that loadLists read (stamp and progress).
 * The newest list is the one of status.json (key list_stamp), else the newest list folder of phase 2.
 */
export async function loadPhase2Articles(root: string, lists: { stamp: string; progress: unknown }[], runActive: boolean): Promise<Phase2ArticlesView | null> {
  try {
    const ph2 = lists.filter((l) => isPhase2List(l.progress)).sort((a, b) => (a.stamp < b.stamp ? 1 : a.stamp > b.stamp ? -1 : 0));
    const status = await readStatus(root);
    if (ph2.length === 0 && !status) return null;
    const stamp = typeof status?.list_stamp === "string" ? status.list_stamp : null;
    const list = ph2.find((l) => l.stamp === stamp) ?? ph2[0] ?? null;
    const order = list ? listPageIds(list.progress) : [];
    const { history, last } = await loadPhase2History(root);
    return buildArticles({ order, listStamp: list?.stamp ?? null, status, runActive, history, lastRow: last, names: await loadArticleNames(root, order) });
  } catch {
    return null;
  }
}

/** Extras of the run view: the names of the articles, and the pages that an earlier list of the same phase 2 run accepted. */
export async function loadRunExtras(root: string, stamp: string, progress: unknown, pageIds: string[]): Promise<{ names: Map<string, ArticleName>; before: Map<string, AcceptedBefore>; runId: string | null }> {
  const empty = { names: new Map<string, ArticleName>(), before: new Map<string, AcceptedBefore>(), runId: null };
  try {
    const names = await loadArticleNames(root, pageIds);
    if (!isPhase2List(progress)) return { ...empty, names };
    const { history } = await loadPhase2History(root);
    return { names, before: acceptedBeforeRestart(stamp, history), runId: history.listRun.get(stamp) ?? null };
  } catch {
    return empty;
  }
}
