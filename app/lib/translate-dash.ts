/*
 * Unit VW112 (round 98, plan P47): the human translation view /translate shows the fold tree of the Reader dashboard /read.
 * Owner words (Q-A 3:76.5 note): "The /translate should have the same dashboard view as /read".
 * Owner pick (Q-A 3:78.4) "Rows 1-7 as written", with the note: "Also so the metadata of the books in the dashboard (for /translate, also show the monitor metadata)".
 * The fold builder stays one function (buildFolds in lib/reader-folds.ts). This file holds the pure rules that only /translate adds:
 * the works of the list, the words of the progress lines, the metadata line, the Monitor facts, and the links.
 * No server-only import, so the page, the month route, and the test script share it.
 */
import type { DashChapter, DashMonitorFacts, DashWork } from "./reader-types";
import type { ChapterRow } from "./types";
import { cleanTitle, equalTitleSlugs, rowsByKey, shortId, WEB_ARTICLE } from "./htv-titles";
import { tocCountsOf, tocRecordOf, type TocCount, type TocRecord, type TocRow } from "./reader-toc";

/** The screen that a fold tree serves: the Reader dashboard /read, or the human translation view /translate. The rows and the links follow it. */
export type DashTarget = "read" | "translate";

/**
 * The month chapters of files mode (item-metadata/magazine-chapters.jsonl, parsed by lib/chapters.ts) in the form of PocketBase mode.
 * The same rules as magazineChapterRows in lib/pb.ts: a month or a year of 0 is null, the marker "*" leaves the English article title.
 */
export function dashChapters(rows: ChapterRow[]): DashChapter[] {
  return rows.map((r) => ({
    chapter: r.chapter,
    book: r.book,
    month: r.month && r.month > 0 ? r.month : null,
    year: r.year && r.year > 0 ? r.year : null,
    titleEn: r.chapterTitleEn ?? "",
    pageStart: r.pageStart ?? 0,
    pageEnd: r.pageEnd ?? 0,
    articles: r.articles.map((a) => ({ order: a.order ?? 0, titleEn: a.titleEn.replace(/\*/g, ""), titleJa: a.titleJa, pageStart: a.pageStart ?? 0, pageEnd: a.pageEnd ?? a.pageStart ?? 0 })),
  }));
}

/**
 * Which web articles the fold tree of /translate holds [unit default VW112].
 *   "listed"  the works of the book list of /translate (lib/htv-books.ts listBookRows): the book folders and every work with a finished run.
 *             Every row then opens its book screen /translate/<book>. A web article with no run has no book screen (loadBookIndex gives null).
 *   "all"     every web article of the metadata, as on /read. A web article with no run shows its title with no link.
 * Change the value here to switch.
 */
export type TranslateWebSet = "listed" | "all";
export const TRANSLATE_WEB_SET: TranslateWebSet = "listed";

/** Words of the progress line of a work on /translate (row 2 of Q-A 3:78.4): "Agent translation: 6 of 120 pages". */
export const AGENT_WORDS = "Agent translation";

/** The progress line of one work: "Agent translation: 6 of 120 pages". The page count has no thousands separator, like progressLine of /read. */
export function agentLine(translated: number, pages: number): string {
  return `${AGENT_WORDS}: ${translated} of ${pages} ${pages === 1 ? "page" : "pages"}`;
}

/** The progress text of a fold (row 3 of Q-A 3:78.4): "Agent translation: 20 of 4,821 pages", with thousands separators. */
export function agentFoldLine(translated: number, pages: number): string {
  return `${AGENT_WORDS}: ${translated.toLocaleString("en-US")} of ${pages.toLocaleString("en-US")} ${pages === 1 ? "page" : "pages"}`;
}

/** The book screen of a work: /translate/<book>. */
export function translateHref(slug: string): string {
  return `/translate/${encodeURIComponent(slug)}`;
}

/** One page of the book screen: /translate/<book>?at=p048#p048. The server loads the pages around p048 first, and the anchor scrolls to it. */
export function translatePageHref(book: string, n: number, digits: number): string {
  const name = "p" + String(n).padStart(digits, "0");
  return `${translateHref(book)}?at=${name}#${name}`;
}

/**
 * The metadata line of a work row on /translate: author · publisher · year (a web article: its web date) · pages.
 * The owner note (Q-A 3:78.4): "Also so the metadata of the books in the dashboard". /read shows author · year · pages (components/ReaderRows.tsx WorkItem).
 * /translate adds the publisher [unit default VW112] and the page count of a web article too.
 */
export function metadataLine(w: DashWork, pages: number): string {
  const when = w.kind === WEB_ARTICLE ? w.webDate || w.year : w.year;
  return [w.author, w.publisher, when, pages ? `${pages} ${pages === 1 ? "page" : "pages"}` : ""].filter(Boolean).join(" · ");
}

/** The Monitor facts as one line: "Monitor dashboard: Completed · 120 of 120 pages · Stopped 3 h ago". */
export function monitorText(m: DashMonitorFacts): string {
  const head = m.source === "phase 2" ? "Monitor dashboard, phase 2" : "Monitor dashboard";
  return `${head}: ${[m.state, m.progress && m.progress !== "–" ? m.progress : "", m.line].filter(Boolean).join(" · ")}`;
}

// ---------------------------------------------------------------- works in files mode

/** One row of items.filled.jsonl: the keys that a work row reads. */
export interface FullMetaRow {
  item_id?: unknown;
  kind?: unknown;
  title_en?: unknown;
  title_ja?: unknown;
  author_en?: unknown;
  author_ja?: unknown;
  publisher?: unknown;
  publish_year?: unknown;
  publish_date_text?: unknown;
  part_of?: unknown;
  part_title_en?: unknown;
  part_title_ja?: unknown;
  synopsis?: unknown;
  isbn?: unknown;
}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : v === null || v === undefined ? "" : String(v));

/** The web date "2019-10-21" of a metadata row, or "". The same rule as webDateOf in lib/pb.ts. */
export function webDateText(v: unknown): string {
  const t = typeof v === "string" ? v : "";
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : "";
}

/** One listed work of /translate: the slug, the page count, and the pages with a finished run (from lib/htv-books.ts listBookRows). */
export interface ListedWork {
  slug: string;
  pages: number;
  taggedPages: number[];
}

/**
 * A work of the fold tree in files mode, from its metadata row (or no row). The row of a web article matches by the 8-character rule
 * (rowsByKey in lib/htv-titles.ts, unit VW111). The kind falls back to web-article for a slug of 8 hex digits, else book.
 */
export function workOfMeta(slug: string, meta: FullMetaRow | undefined, pages: number, taggedPages: number[]): DashWork {
  const kind = text(meta?.kind) || (/^[0-9a-f]{8}$/.test(slug) ? WEB_ARTICLE : "book");
  const webDate = kind === WEB_ARTICLE ? webDateText(meta?.publish_date_text) : "";
  return {
    slug,
    kind,
    titleEn: cleanTitle(meta?.title_en),
    titleJa: cleanTitle(meta?.title_ja),
    author: text(meta?.author_en) || text(meta?.author_ja),
    publisher: text(meta?.publisher),
    year: text(meta?.publish_year),
    pages,
    synopsis: "",
    isbn: text(meta?.isbn),
    partOf: text(meta?.part_of),
    partTitleEn: text(meta?.part_title_en),
    partTitleJa: text(meta?.part_title_ja),
    webDate,
    placement: { webYear: webDate ? Number(webDate.slice(0, 4)) : null, webMonth: webDate ? Number(webDate.slice(5, 7)) : null, printYear: null, printMonth: null },
    translated: [...taggedPages].sort((a, b) => a - b),
    known: true,
    resumeAt: null,
  };
}

/** The metadata rows by key: the full item_id, and the 8-character short ID of a web article (one shared rule, unit VW111). */
export function metaByKey(rows: FullMetaRow[]): Map<string, FullMetaRow> {
  return rowsByKey(rows, (r) => text(r.item_id), (r) => r.kind === WEB_ARTICLE);
}

/**
 * The works of the fold tree in files mode. `listed` are the rows of the book list. With the set "all", every web article of the metadata
 * that has a single short ID joins with its run pages (none).
 */
export function filesWorks(rows: FullMetaRow[], listed: ListedWork[], set: TranslateWebSet = TRANSLATE_WEB_SET): DashWork[] {
  const byKey = metaByKey(rows);
  const out = listed.map((l) => workOfMeta(l.slug, byKey.get(l.slug), l.pages, l.taggedPages));
  if (set === "all") {
    const have = new Set(listed.map((l) => l.slug));
    for (const r of rows) {
      if (r.kind !== WEB_ARTICLE) continue;
      const key = shortId(text(r.item_id));
      if (have.has(key) || byKey.get(key) !== r) continue;
      have.add(key);
      out.push(workOfMeta(key, r, 0, []));
    }
  }
  return out;
}

/** The works of the fold tree in PocketBase mode: the catalog works (lib/pb.ts catalogWorks) with the page count and run pages of the book list. */
export function serverWorks(catalog: DashWork[], listed: ListedWork[], set: TranslateWebSet = TRANSLATE_WEB_SET): DashWork[] {
  const byListed = new Map(listed.map((l) => [l.slug, l]));
  const bySlug = new Map(catalog.map((w) => [w.slug, w]));
  const out: DashWork[] = [];
  for (const l of listed) {
    const w = bySlug.get(l.slug) ?? workOfMeta(l.slug, undefined, l.pages, []);
    out.push({ ...w, synopsis: "", pages: l.pages, translated: [...l.taggedPages].sort((a, b) => a - b), known: true, resumeAt: null });
  }
  if (set === "all") for (const w of catalog) if (w.kind === WEB_ARTICLE && !byListed.has(w.slug)) out.push({ ...w, synopsis: "", translated: [], known: true, resumeAt: null });
  return out;
}

/**
 * Add the /translate facts to each work: whether its book screen opens, whether its file name shows (equal titles among the works that the
 * screen shows, Q-A 3:74.3), and its Monitor facts. `visible` are the works that the folds show (hidden works left out).
 */
export function withStaffFacts(works: DashWork[], visible: DashWork[], opens: Set<string>, monitor: Map<string, DashMonitorFacts>): DashWork[] {
  const same = equalTitleSlugs(visible.map((w) => ({ slug: w.slug, titleEn: w.titleEn, titleJa: w.titleJa })));
  for (const w of works) w.staff = { opens: opens.has(w.slug), showFile: same.has(w.slug), monitor: monitor.get(w.slug) ?? null };
  return works;
}

// ---------------------------------------------------------------- Monitor facts

/** The Monitor facts of a book row (lib/book-status-rules.ts MonitorRow). `line` is lineText(row.line2, now). */
export function bookMonitorFacts(row: { label: string; pagesDone: number | null; pagesTotal: number | null }, progress: string, line: string): DashMonitorFacts {
  return { source: "book", state: row.label, progress: row.pagesDone === null ? "" : progress, line };
}

/** The Monitor facts of a phase 2 article (lib/phase2-articles.ts ArticleLine). The state text already holds the pages ("Accepted: 4 of 4 pages"). */
export function articleMonitorFacts(a: { stateText: string }): DashMonitorFacts {
  return { source: "phase 2", state: a.stateText, progress: "", line: "" };
}

// ---------------------------------------------------------------- table of contents folds (fix round of VW112, Q-A 3:80.3)

/*
 * Owner words (Q-A 3:80.3): "/translate has no table-of-contents folds inside a book, unlike /read? I literlly said use the same fold use /read for navigation".
 * /translate now uses the ToC folds of /read (unit VW77e): the same fold builder, the same rows, and links into /translate/<book>.
 */

/**
 * The usable records of item-metadata/book-toc.jsonl in files mode. The rule is the rule of sync command S2 (scripts/sync-runs.mjs loadBookToc),
 * so files mode and PocketBase mode show the same rows: tocRecordOf keeps a row, and a second row with the same book and order is dropped.
 */
export function tocRecordsOfFile(raw: unknown[]): TocRecord[] {
  const out: TocRecord[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const rec = tocRecordOf(r);
    if (!rec) continue;
    const key = `${rec.book}|${rec.order}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(rec);
  }
  return out;
}

/** The ToC counts of the books that /translate lists. A book without a screen on /translate stays a row [unit default VW112]. */
export function listedTocCounts(counts: ReadonlyMap<string, TocCount>, listed: Set<string>): Map<string, TocCount> {
  return new Map([...counts].filter(([slug]) => listed.has(slug)));
}

/** The ToC counts of the rows of book-toc.jsonl (files mode), with the counting rule of /read (tocCountsOf). */
export function fileTocCounts(records: TocRecord[]): Map<string, TocCount> {
  return tocCountsOf(records as unknown as Record<string, unknown>[]);
}

/**
 * The agent translation counts of the chapter rows (level 1) of one book [unit default VW112].
 * A chapter runs from its PDF page to the page before the next chapter row with a later PDF page, or to the last page of the book.
 * A sub-row (level 2) and a row without a PDF page get no count, because the file gives no end page.
 */
export function withTocAgent(rows: TocRow[], translated: number[], bookPages: number): TocRow[] {
  const done = new Set(translated);
  const starts = rows.filter((r) => r.level === 1 && r.pageNo > 0).map((r) => r.pageNo);
  return rows.map((r) => {
    if (r.level !== 1 || r.pageNo <= 0) return r;
    const next = starts.filter((p) => p > r.pageNo).reduce((a, b) => Math.min(a, b), Number.POSITIVE_INFINITY);
    const end = Number.isFinite(next) ? next - 1 : Math.max(bookPages, r.pageNo);
    let hits = 0;
    for (let p = r.pageNo; p <= end; p++) if (done.has(p)) hits++;
    return { ...r, agent: { translated: hits, pages: end - r.pageNo + 1 } };
  });
}
