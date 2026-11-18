import "server-only";
import { loadMonitor } from "./book-status";
import { lineText, progressText } from "./book-status-rules";
import { parseChapterRows } from "./chapters";
import { loadConfig } from "./config";
import { listBookRows } from "./htv-books";
import { readJsonl } from "./json";
import { bookTocCounts, bookTocRecords, catalogWorks, magazineChapterRows } from "./pb";
import { buildFolds, digitsOf, findFold, isHidden, matchWorks, type Dashboard } from "./reader-folds";
import { foldQuery } from "./reader-search";
import { buildTocRows, tocSlugOf, type TocCount, type TocRecord, type TocRow } from "./reader-toc";
import type { DashChapter, DashMonitorFacts, DashWork } from "./reader-types";
import { articleMonitorFacts, bookMonitorFacts, dashChapters, fileTocCounts, filesWorks, listedTocCounts, serverWorks, tocRecordsOfFile, withStaffFacts, withTocAgent, type FullMetaRow, type ListedWork } from "./translate-dash";

/*
 * Unit VW112 (round 98, plan P47): the data of the fold tree of the human translation view /translate.
 * Owner words (Q-A 3:76.5 note): "The /translate should have the same dashboard view as /read". Owner pick Q-A 3:78.4, rows 1-6.
 * The works are the rows of the book list (lib/htv-books.ts listBookRows), with the metadata of the catalog:
 *   files mode       item-metadata/items.filled.jsonl and item-metadata/magazine-chapters.jsonl of the Translator data folder
 *   PocketBase mode  the collections catalog_items and magazine_chapters (the public site)
 * One fold builder (buildFolds in lib/reader-folds.ts) draws both screens. The hidden rule of /read applies here too (Q-A 3:78.4 row 5).
 * The Monitor facts exist only in files mode with the Monitor on. In PocketBase mode the rows show none and no error.
 */

export interface TranslateSearch {
  query: string;
  hits: DashWork[];
}

export interface TranslateDash {
  dash: Dashboard;
  search: TranslateSearch | null;
  /** "" or one line about the Monitor facts: off in PocketBase mode, or a failed read. */
  monitorNote: string;
  mode: "files" | "pocketbase";
  /** Files mode: the usable rows of item-metadata/book-toc.jsonl. PocketBase mode: null, because the rows of one book come from book_toc. */
  tocFile: TocRecord[] | null;
}

/** Words under the total line when the rows show no Monitor facts [unit default VW112]. */
export const MONITOR_OFF_NOTE = "The Monitor dashboard facts show only on this Mac (files mode).";
export const MONITOR_FAILED_NOTE = "The Monitor dashboard facts could not be read.";

async function metadataRows(): Promise<FullMetaRow[]> {
  const rows = await readJsonl<FullMetaRow>("item-metadata/items.filled.jsonl");
  return rows.length ? rows : readJsonl<FullMetaRow>("item-metadata/items.draft.jsonl");
}

/**
 * The Monitor facts by slug. A book folder takes its book row. A web article takes its phase 2 line when one exists [unit default VW112],
 * because the phase 2 run is the newer run of an article; else its book row (an older pilot run).
 */
async function monitorFacts(): Promise<Map<string, DashMonitorFacts>> {
  const m = await loadMonitor();
  const out = new Map<string, DashMonitorFacts>();
  if (!m.ok) throw new Error(m.error ?? "no data");
  for (const r of m.rows) out.set(r.slug, bookMonitorFacts(r, progressText(r), lineText(r.line2, m.generatedAt)));
  for (const a of m.phase2Articles?.articles ?? []) out.set(a.shortId, articleMonitorFacts(a));
  return out;
}

/** The fold tree of /translate, and the search hits when `rawQuery` holds a query. `marks` are the run marks (lib/pb.ts runMarks). */
export async function loadTranslateDashboard(token: string, marks: Map<string, string>, rawQuery: string): Promise<TranslateDash> {
  const cfg = await loadConfig();
  const listed: ListedWork[] = (await listBookRows(marks, token)).map((r) => ({ slug: r.slug, pages: r.pages, taggedPages: r.taggedPages ?? [] }));
  let works: DashWork[];
  let chapters: DashChapter[];
  if (cfg.runSource === "pocketbase") {
    works = serverWorks(await catalogWorks(token), listed);
    chapters = await magazineChapterRows(token);
  } else {
    works = filesWorks(await metadataRows(), listed);
    chapters = dashChapters(parseChapterRows(await readJsonl<unknown>("item-metadata/magazine-chapters.jsonl")));
  }
  let monitor = new Map<string, DashMonitorFacts>();
  let monitorNote = "";
  if (cfg.runSource !== "files" || !cfg.monitor) monitorNote = MONITOR_OFF_NOTE;
  else {
    try {
      monitor = await monitorFacts();
    } catch {
      monitorNote = MONITOR_FAILED_NOTE;
    }
  }
  const visible = works.filter((w) => !isHidden(w, works));
  const opens = new Set(listed.map((l) => l.slug));
  withStaffFacts(works, visible, opens, monitor);
  // Fix round (Q-A 3:80.3): a book with table of contents rows is a ToC fold, as on /read (unit VW77e). Same builder, same counts.
  // Files mode reads item-metadata/book-toc.jsonl, PocketBase mode reads the collection book_toc. A failed read leaves the books as rows, as on /read.
  let tocFile: TocRecord[] | null = null;
  let tocBooks = new Map<string, TocCount>();
  try {
    if (cfg.runSource === "pocketbase") tocBooks = listedTocCounts(await bookTocCounts(token), opens);
    else {
      tocFile = tocRecordsOfFile(await readJsonl<unknown>("item-metadata/book-toc.jsonl"));
      tocBooks = listedTocCounts(fileTocCounts(tocFile), opens);
    }
  } catch {
    tocBooks = new Map();
  }
  const dash = buildFolds(works, chapters, undefined, tocBooks);
  const folded = foldQuery(rawQuery);
  const search = folded ? { query: rawQuery.trim(), hits: matchWorks(dash.visible, folded) } : null;
  return { dash, search, monitorNote, mode: cfg.runSource === "pocketbase" ? "pocketbase" : "files", tocFile };
}

/**
 * The rows of the ToC fold `id` (toc-<slug>) on /translate, with the agent translation count of each chapter row, or null when the fold does not exist
 * (no such book, a hidden book, or a book without ToC rows). The page (?open=toc-<slug>) and GET /api/translate/toc share it.
 */
export async function translateTocRows(token: string, td: TranslateDash, id: string): Promise<TocRow[] | null> {
  const slug = tocSlugOf(id);
  const fold = slug ? findFold(td.dash.folds, id) : null;
  if (!slug || !fold?.toc || !fold.head) return null;
  const records = td.tocFile ? (td.tocFile.filter((r) => r.book === slug) as unknown as Record<string, unknown>[]) : await bookTocRecords(token, slug);
  const work = fold.head.work;
  return withTocAgent(buildTocRows(records, digitsOf(fold.head.pages)), work.translated, fold.head.pages);
}
