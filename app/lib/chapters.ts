import type { ChapterArticle, ChapterRow } from "./types";

// Pure parsing for item-metadata/magazine-chapters.jsonl (unit M1, round 47). No file access here, so a test can call it.
// Unknown extra keys do no harm. A row without a string "book" is skipped.

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
}

function article(a: J): ChapterArticle {
  return {
    order: num(a?.order),
    seriesJa: str(a?.series_ja),
    titleJa: str(a?.title_ja),
    titleEn: str(a?.title_en),
    titleEnStatus: str(a?.title_en_status),
    pageStart: num(a?.page_start),
    pageEnd: num(a?.page_end),
    pageGuess: a?.page_guess === true,
  };
}

export function parseChapterRows(rows: unknown[]): ChapterRow[] {
  const out: ChapterRow[] = [];
  for (const r of rows as J[]) {
    if (!r || typeof r !== "object" || typeof r.book !== "string" || r.book === "") continue;
    const arts: ChapterArticle[] = Array.isArray(r.articles) ? r.articles.filter((a: unknown) => a && typeof a === "object").map(article) : [];
    out.push({
      book: r.book,
      bookTitleEn: str(r.book_title_en),
      year: num(r.year),
      month: num(r.month),
      chapter: str(r.chapter),
      chapterTitleEn: str(r.chapter_title_en),
      chapterTitleJa: str(r.chapter_title_ja),
      pageStart: num(r.page_start),
      pageEnd: num(r.page_end),
      pageCount: num(r.page_count),
      articleCount: num(r.article_count) ?? arts.length,
      articles: arts,
    });
  }
  return out;
}

/** Chapters of one magazine year: the front chapter (month null) first, then by month. The sort keeps the file order for equal months. */
export function chaptersOf(all: ChapterRow[], book: string): ChapterRow[] {
  return all
    .map((c, i) => ({ c, i }))
    .filter((x) => x.c.book === book)
    .sort((a, b) => (a.c.month ?? 0) - (b.c.month ?? 0) || a.i - b.i)
    .map((x) => x.c);
}

/** "p. 23" for one page, "pp. 23–120" for a range, "–" for no number. */
export function pageRange(start: number | null, end: number | null): string {
  if (start === null && end === null) return "–";
  if (start === null || end === null || start === end) return `p. ${start ?? end}`;
  return `pp. ${start}–${end}`;
}
