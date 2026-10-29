import "server-only";
import { readJson, readJsonl } from "./json";
import { loadConfig } from "./config";
import { chaptersOf, parseChapterRows } from "./chapters";
import { loadHtvPage, listFinishedPages } from "./htv-runs";
import { catalogInfo, listComments, magazineChapters, PbError, runMarkOf, savedRows, savedVersions } from "./pb";
import type { ChapterHead, HtvBookIndex, HtvBookPage, HtvBookRow, HtvPageTag, SessionUser } from "./htv-types";

/*
 * Book screen of the human-translation-view (unit UXC step D, round 59).
 * Round 58 answer 3 (Q-A 2026-10-28 l201): "Not just translated pages. All pages. With agent translated pages tagged."
 * One screen for each book shows ALL pages of the book. The server sends the page index at once (page count, tags, month headings).
 * The rows of a page load later, in a window around the page in view (GET /api/htv/page).
 * The page count comes from catalog_items.pages (runSource pocketbase) or items.filled.jsonl (runSource files).
 * The rule that turns the run reads into rows sits in htv-runs.ts. This file adds the index and the saved data of the user.
 */

/**
 * Which books the book list shows.
 *   "with-runs"  only the books that have a finished run.
 *   "all"        the 36 book folders of book-slugs.json (runSource files) or all rows of catalog_items (runSource pocketbase), plus every item with a finished run.
 * Round 60 answer 3 (Q-A 2026-10-28 l240): "All 36 book folders". Round 61 answer 6 (l266): "36 books plus web article (Recommended)".
 * So the value is "all". The list then holds 36 books and the web article 18d4ac29 (37 rows), and the 311 other web articles of items.filled.jsonl stay out.
 * The sync command S2 fills catalog_items with the same 36 books plus the items of the finished runs.
 */
export type BookListMode = "with-runs" | "all";
export const BOOK_LIST_MODE: BookListMode = "all";

/** The page window: a section loads its rows when it is within this many pages of the screen (VISION-viewer 15.16.2). */
export const WINDOW_PAGES = 2;

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

/** "p048" to 48. */
export function pageNumber(page: string): number {
  return parseInt(page.slice(1), 10);
}

/** Digits of a page ID: 4 when the folder holds more than 999 pages, else 3 (pages.py id_digits). */
export function idDigits(pages: number): number {
  return pages > 999 ? 4 : 3;
}

export function pageName(n: number, digits: number): string {
  return "p" + String(n).padStart(digits, "0");
}

interface BookFacts {
  title: string;
  pages: number;
}

async function fromServer(): Promise<boolean> {
  return (await loadConfig()).runSource === "pocketbase";
}

/** Title and page count of books. With a slug the map holds that book only. */
async function bookFacts(token: string, slug?: string): Promise<Map<string, BookFacts>> {
  if (await fromServer()) return catalogInfo(token, slug);
  let rows = await readJsonl<J>("item-metadata/items.filled.jsonl");
  if (rows.length === 0) rows = await readJsonl<J>("item-metadata/items.draft.jsonl");
  const slugs = await readJson<J>("pilot-sample/book-slugs.json");
  const out = new Map<string, BookFacts>();
  for (const b of (slugs?.books ?? []) as J[]) {
    if (typeof b?.slug === "string") out.set(b.slug, { title: "", pages: typeof b.pages === "number" ? b.pages : 0 });
  }
  // Only the rows of the 36 book folders count. items.filled.jsonl holds 347 rows, and 311 of them are web articles with long IDs.
  for (const r of rows) {
    const id = String(r.item_id);
    const old = out.get(id);
    if (!old) continue;
    out.set(id, { title: String(r.title_en || r.title_ja || ""), pages: typeof r.pages === "number" ? r.pages : old.pages });
  }
  if (slug) return new Map([...out].filter(([k]) => k === slug));
  return out;
}

function tagOf(row: { page: string; verdict: "PASS" | "FAIL"; score: number | null; shownRunId: string; marked: boolean }): HtvPageTag {
  return { n: pageNumber(row.page), verdict: row.verdict, score: row.score, shownRunId: row.shownRunId, marked: row.marked };
}

/** The books of the book list. */
export async function listBookRows(marks: Map<string, string>, token: string): Promise<HtvBookRow[]> {
  const finished = await listFinishedPages(marks, token);
  const facts = await bookFacts(token);
  const tagged = new Map<string, HtvPageTag[]>();
  for (const r of finished) {
    const l = tagged.get(r.slug);
    if (l) l.push(tagOf(r));
    else tagged.set(r.slug, [tagOf(r)]);
  }
  const slugs = BOOK_LIST_MODE === "all" ? new Set([...facts.keys(), ...tagged.keys()]) : new Set(tagged.keys());
  const rows: HtvBookRow[] = [];
  for (const slug of [...slugs].sort()) {
    const tags = tagged.get(slug) ?? [];
    const f = facts.get(slug);
    rows.push({ slug, title: f?.title ?? "", pages: pageCount(f?.pages ?? 0, tags), tagged: tags.length });
  }
  return rows;
}

/** Page count of a book. A web article has pages 0 and one page with a run, so the count is at least the last tagged page, and at least 1. */
function pageCount(pages: number, tags: HtvPageTag[]): number {
  return Math.max(pages, ...tags.map((t) => t.n), tags.length > 0 ? 1 : 0);
}

async function chaptersFor(slug: string, token: string): Promise<ChapterHead[]> {
  if (await fromServer()) return (await magazineChapters(token, slug)).filter((c) => c.pageStart > 0);
  const rows = chaptersOf(parseChapterRows(await readJsonl<unknown>("item-metadata/magazine-chapters.jsonl")), slug);
  const out: ChapterHead[] = [];
  for (const c of rows) {
    if (c.pageStart === null || c.pageStart < 1) continue;
    out.push({ chapter: c.chapter, month: c.month, year: c.year, titleEn: c.chapterTitleEn, pageStart: c.pageStart, pageEnd: c.pageEnd ?? c.pageStart });
  }
  return out;
}

/** The page index of one book, or null when the book is unknown (no finished run, and not in the list mode). */
export async function loadBookIndex(slug: string, marks: Map<string, string>, token: string): Promise<HtvBookIndex | null> {
  const mine = (await listFinishedPages(marks, token)).filter((r) => r.slug === slug);
  const tags = mine.map(tagOf).sort((a, b) => a.n - b.n);
  const f = (await bookFacts(token, slug)).get(slug);
  if (tags.length === 0 && !(BOOK_LIST_MODE === "all" && f)) return null;
  const pages = pageCount(f?.pages ?? 0, tags);
  const firstTagged = mine[0];
  const digits = firstTagged ? firstTagged.page.length - 1 : idDigits(pages);
  return { slug, title: f?.title ?? "", pages, digits, tags, chapters: await chaptersFor(slug, token) };
}

/** Page numbers of the window around a page: tagged pages within `radius` pages of `n`. */
export function windowAround(n: number, tags: HtvPageTag[], pages: number, radius = WINDOW_PAGES): number[] {
  return tags.map((t) => t.n).filter((m) => m >= 1 && m <= pages && Math.abs(m - n) <= radius);
}

/**
 * The data of page sections: the page data of the shown run, and for a translator or admin the versions, the newest saved rows, and the comments.
 * A reader has no own boxes and no comments, so a reader gets no saved data (round 55 answer 6, l151).
 * A page without a finished run gives data null. A PocketBase read error of the saved data goes into pbNote.
 */
export async function loadBookPages(items: { slug: string; page: string }[], user: SessionUser, token: string): Promise<HtvBookPage[]> {
  return Promise.all(
    items.map(async ({ slug, page }) => {
      const pageId = `${slug}/${page}`;
      let pbNote = "";
      let marked: string | null = null;
      try {
        marked = await runMarkOf(token, pageId);
      } catch (e) {
        if (!(e instanceof PbError)) throw e;
        pbNote = "The run mark was not read: " + e.message;
      }
      const data = await loadHtvPage(slug, page, marked, token);
      const out: HtvBookPage = { n: pageNumber(page), pageId, data, versions: [], rows: [], comments: [], pbNote };
      if (data && user.role !== "reader") {
        try {
          out.versions = await savedVersions(token, user.id, pageId);
          if (out.versions[0]) out.rows = await savedRows(token, user.id, pageId, out.versions[0].version);
          out.comments = await listComments(token, user, pageId);
        } catch (e) {
          if (!(e instanceof PbError)) throw e;
          out.pbNote = (out.pbNote ? out.pbNote + " " : "") + "Saved data was not read: " + e.message;
        }
      }
      return out;
    }),
  );
}
