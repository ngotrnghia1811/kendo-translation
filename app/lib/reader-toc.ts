// The table of contents (ToC) of a book on the Reader dashboard /read, as pure functions (unit VW77e part 1, Q-A 3:10.3 to 3:10.5).
// No import of server code and no server-only marker, so S2 and a test script can run it without PocketBase.
//
// Source of the rows: <Translator data>/item-metadata/book-toc.jsonl (made by data/scripts/book_toc.py, 23 books, 1,181 rows, all checked).
// Round 72 answer 1 (2026-10-30): "All the books should have ToC too (like `Lecture on Kendo` book). Also `Lecture on Kendo` book should be treat as 3 books
// `Lecture on Kendo` 1, 2 and 3, each have its own ToC. Each book should open similar to kendojidai yearly book".
// Q-A 3:10.4 F1 to F4 and 3:10.5 R1 to R4 (accepted defaults):
//   F1 the book row becomes a fold, a row opens /read/<slug> at its page.   F2 the fold starts closed, its rows load when it opens.
//   F3 a row shows the English title, the Japanese title smaller, and the book page number.   F4 Lectures on Kendo shows as 3 folds.
//   R1 level 1 rows are chapter rows, level 2 rows are sub-rows (indented).   R2 a row without a book page number still shows and opens the PDF page.
//   R3 S2 loads the file into the PocketBase collection book_toc (migration 1793300013).

export const TOC_COLLECTION = "book_toc";
/** Fold id of a book: `toc-<slug>`. The month folds use `kj-<year>-<month>` and `web-...`, so the ids never meet. */
export const TOC_FOLD_PREFIX = "toc-";
const SLUG_RULE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function tocFoldId(slug: string): string {
  return TOC_FOLD_PREFIX + slug;
}

/** The book slug of a fold id `toc-<slug>`, or null for any other text (also for a slug with a path character). */
export function tocSlugOf(id: string): string | null {
  if (!id.startsWith(TOC_FOLD_PREFIX)) return null;
  const slug = id.slice(TOC_FOLD_PREFIX.length);
  return SLUG_RULE.test(slug) && !slug.includes("..") ? slug : null;
}

// ---------------------------------------------------------------- the record of S2 (collection book_toc)

/**
 * One record of book_toc. The research keys of the file (status, evidence, notes, match_*, source_*, offset_basis, title_en_source, ...) stay out.
 * PocketBase stores an empty number as 0 and an empty text as "". Every real page number is 2 or more, so 0 means "none" for page_ref_num and pdf_page.
 */
export interface TocRecord {
  book: string;
  order: number;
  level: number;
  title_ja: string;
  title_en: string;
  page_ref: string;
  page_ref_num: number;
  offset: number;
  pdf_page: number;
  page_id: string;
}

export const TOC_RECORD_KEYS: (keyof TocRecord)[] = ["book", "order", "level", "title_ja", "title_en", "page_ref", "page_ref_num", "offset", "pdf_page", "page_id"];

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const whole = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : 0);

/** The record of one line of book-toc.jsonl, or null when the line is not a usable ToC row (no book, no order, level other than 1 or 2, no Japanese title). */
export function tocRecordOf(raw: unknown): TocRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const book = text(r.book);
  const order = whole(r.order);
  const level = whole(r.level);
  const titleJa = text(r.title_ja);
  if (!SLUG_RULE.test(book) || order < 1 || (level !== 1 && level !== 2) || !titleJa) return null;
  return {
    book,
    order,
    level,
    title_ja: titleJa,
    title_en: text(r.title_en),
    page_ref: text(r.page_ref),
    page_ref_num: whole(r.page_ref_num),
    offset: whole(r.offset),
    pdf_page: whole(r.pdf_page),
    page_id: text(r.page_id),
  };
}

/** True when the record on the server holds the same values as the record from the file (the keys of TocRecord only). */
export function tocRecordEqual(server: Record<string, unknown>, rec: TocRecord): boolean {
  return TOC_RECORD_KEYS.every((k) => (typeof rec[k] === "number" ? Number(server[k] ?? 0) === rec[k] : String(server[k] ?? "") === rec[k]));
}

// ---------------------------------------------------------------- rows for the Reader

/** One row of the ToC fold of a book. */
export interface TocRow {
  type: "toc";
  book: string;
  order: number;
  /** 1 is a chapter row. 2 is a sub-row (R1). */
  level: 1 | 2;
  /** Main text: the English title (F3), else the Japanese title when the file holds no English title. */
  title: string;
  /** True when `title` is Japanese (the row sets lang="ja"). */
  titleIsJa: boolean;
  /** The Japanese title for the smaller text after the main text (F3). Empty when `title` is already the Japanese title. */
  titleJa: string;
  /** The book page number as printed, for example "15". Empty when the book gives none (R2). */
  pageRef: string;
  /** The PDF page that the row opens. 0 when the file holds no PDF page: the row shows and has no link. */
  pageNo: number;
  /** Digits of the page ID of the book (3, or 4 over 999 pages), for the link. */
  digits: number;
  /** Unit VW112 (Q-A 3:80.3): on /translate only, the pages of a chapter row (level 1) and how many of them have an agent translation. */
  agent?: { translated: number; pages: number };
}

/** The PDF page of a record: pdf_page, else the number in page_id (`<book>/p008`), else 0. */
export function tocPageOf(rec: { pdf_page?: unknown; page_id?: unknown }): number {
  const n = whole(rec.pdf_page);
  if (n > 0) return n;
  const m = /\/p(\d+)$/.exec(text(rec.page_id));
  return m ? Number(m[1]) : 0;
}

/** The draft English titles mark italic words with asterisks (for example "*Kendo* and Human Character Development"). A row shows the title without them. */
export function plainTitle(s: string): string {
  return s.replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

/** The rows of one book for the browser: by order (the order of the book), a chapter row before its sub-rows as the file lists them. */
export function buildTocRows(records: Record<string, unknown>[], digits: number): TocRow[] {
  const rows: TocRow[] = [];
  for (const r of records) {
    const level = whole(r.level) === 2 ? 2 : 1;
    const ja = text(r.title_ja).trim();
    const en = plainTitle(text(r.title_en));
    if (!en && !ja) continue;
    rows.push({
      type: "toc",
      book: text(r.book),
      order: whole(r.order),
      level,
      title: en || ja,
      titleIsJa: !en,
      titleJa: en ? ja : "",
      pageRef: text(r.page_ref),
      pageNo: tocPageOf(r),
      digits,
    });
  }
  return rows.sort((a, b) => a.order - b.order);
}

/** Counts of one book for the closed fold: the chapter rows (level 1) and all rows. */
export interface TocCount {
  chapters: number;
  rows: number;
}

/** Counts by book from a list of records (fields book and level). */
export function tocCountsOf(records: Record<string, unknown>[]): Map<string, TocCount> {
  const out = new Map<string, TocCount>();
  for (const r of records) {
    const book = text(r.book);
    if (!book) continue;
    const c = out.get(book) ?? { chapters: 0, rows: 0 };
    c.rows++;
    if (whole(r.level) === 1) c.chapters++;
    out.set(book, c);
  }
  return out;
}

/** The note after the title of a closed book fold: "12 chapters". One chapter reads "1 chapter". */
export function tocNote(c: TocCount): string {
  return `${c.chapters} ${c.chapters === 1 ? "chapter" : "chapters"}`;
}
