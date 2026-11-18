/*
 * Unit VW109 (round 95, plan P44): the real name of a book on the human translation view `/translate`.
 * Owner words (Q-A 3:72.2, 2026-11-17): "Use the real name of the book, not the file name".
 * Owner pick (Q-A 3:73.2) "English, Japanese below": the English title is the link, the Japanese title sits below it in small gray text,
 * and the file name (the slug, for example 100_practice_full) shows only on hover.
 * Owner pick (Q-A 3:73.3) "Accept all rows". Row 1: in files mode a web article matches its data row by the first 8 characters of item_id.
 * That is the same rule as the PocketBase copy (unit RC4) and the Viewer guideline line "The page IDs use the first 8 hex digits of item_id".
 * Row 3: an item with no title shows the file name.
 * This file holds pure functions with no server-only import, so that the book list, the book screen header and the tests share them.
 */

/** Kind of a catalog row for a web article (the 311 articles of items.filled.jsonl). */
export const WEB_ARTICLE = "web-article";

/** Length of the short ID. The page IDs of a web article use the first 8 hex digits of item_id. */
export const SHORT_ID_LENGTH = 8;

/**
 * Characters that take no space on the screen, or show as a box. Some titles of items.filled.jsonl hold zero-width spaces.
 * Unit VW110 (Q-A 3:74.5 part 5): U+FFFC (object replacement character) is removed too. The English title of 460f7e37 ends in it.
 */
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\uFFFC]/g;

/** A title as shown: a text with no zero-width characters and no outer spaces. A value that is not a text gives "". */
export function cleanTitle(v: unknown): string {
  return typeof v === "string" ? v.replace(INVISIBLE, "").trim() : "";
}

/** The first 8 characters of an item ID. A web article page uses this short ID as its slug. */
export function shortId(itemId: string): string {
  return itemId.slice(0, SHORT_ID_LENGTH);
}

/** The title that other code uses as one text: the English title, else the Japanese title. */
export function titleText(en: string, ja: string): string {
  return en || ja;
}

export interface BookFactsData {
  /** English title, else Japanese title. The older field that other code uses. */
  title: string;
  titleEn: string;
  titleJa: string;
  pages: number;
  /** Kind of the catalog row (pocketbase mode, and web articles in files mode). Empty for the 36 book folders in files mode. */
  kind?: string;
}

/** One row of items.filled.jsonl (or items.draft.jsonl). The fields that this unit reads. */
export interface MetaRow {
  item_id?: unknown;
  kind?: unknown;
  title_en?: unknown;
  title_ja?: unknown;
  pages?: unknown;
}

/**
 * The facts of the books in files mode (the runSource default).
 *   - The 36 book folders of book-slugs.json come first, with an empty title and their page count.
 *   - A metadata row whose item_id is the slug of a book folder gives that book its titles and page count.
 *   - A metadata row of kind web-article gives its facts under the first 8 characters of item_id (row 1 of Q-A 3:73.3).
 *     A web article has pages 0, the same as in catalog_items (the page count then comes from the pages with a run).
 *   - When two different item IDs share the 8 characters, the item gets no title, the same rule as articleNames in lib/phase2-articles.ts (VW94):
 *     a wrong title is worse than the file name.
 *   - Another row (a long ID that is no book folder and no web article) stays out.
 */
export function filesBookFacts(rows: MetaRow[], books: { slug: string; pages: number }[]): Map<string, BookFactsData> {
  const out = new Map<string, BookFactsData>();
  for (const b of books) out.set(b.slug, { title: "", titleEn: "", titleJa: "", pages: b.pages });
  const articles = new Map<string, { ids: Set<string>; titleEn: string; titleJa: string }>();
  for (const r of rows) {
    const id = String(r.item_id ?? "");
    if (!id) continue;
    const titleEn = cleanTitle(r.title_en);
    const titleJa = cleanTitle(r.title_ja);
    const old = out.get(id);
    if (old) {
      out.set(id, { title: titleText(titleEn, titleJa), titleEn, titleJa, pages: typeof r.pages === "number" ? r.pages : old.pages });
      continue;
    }
    if (r.kind !== WEB_ARTICLE) continue;
    const key = shortId(id);
    if (out.has(key)) continue;
    const seen = articles.get(key);
    if (seen) seen.ids.add(id);
    else articles.set(key, { ids: new Set([id]), titleEn, titleJa });
  }
  for (const [key, a] of articles) {
    const one = a.ids.size === 1;
    const en = one ? a.titleEn : "";
    const ja = one ? a.titleJa : "";
    out.set(key, { title: titleText(en, ja), titleEn: en, titleJa: ja, pages: 0, kind: WEB_ARTICLE });
  }
  return out;
}

export interface BookNames {
  /** The text of the link or the heading. */
  main: string;
  /** "ja" when main is a Japanese title, else "". */
  mainLang: "ja" | "";
  /** The Japanese title for the small gray line. Empty when there is none, or when it is the main text. */
  sub: string;
  /** The hover text: the file name. Empty when the file name is the main text. */
  hover: string;
}

/**
 * What a screen shows for a book. The English title comes first, the Japanese title below it, the file name on hover (Q-A 3:73.2).
 * Only a Japanese title: it is the main text. No title at all: the file name is the main text (row 3 of Q-A 3:73.3).
 */
export function bookNames(slug: string, titleEn: string, titleJa: string): BookNames {
  const en = cleanTitle(titleEn);
  const ja = cleanTitle(titleJa);
  if (en) return { main: en, mainLang: "", sub: ja && ja !== en ? ja : "", hover: slug };
  if (ja) return { main: ja, mainLang: "ja", sub: "", hover: slug };
  return { main: slug, mainLang: "", sub: "", hover: "" };
}

/**
 * Unit VW110 (Q-A 3:74.3 "File name for equal titles"): "Only in a group of equal titles, each row also shows its file name in small gray text
 * after the Japanese title." Two rows have equal titles when the shown English title and the shown Japanese title (after cleaning) are both equal.
 * A title equal only in English, or only in Japanese, is not equal. A row with no title shows its file name as the link, so it is never in a group.
 * Returns the slugs of the rows in a group of 2 or more. The groups come from the rows that the screen holds, not from a fixed list.
 */
export function equalTitleSlugs(rows: { slug: string; titleEn: string; titleJa: string }[]): Set<string> {
  const groups = new Map<string, string[]>();
  for (const r of rows) {
    const n = bookNames(r.slug, r.titleEn, r.titleJa);
    if (n.main === r.slug) continue;
    const key = `${n.mainLang}\u0000${n.main}\u0000${n.sub}`;
    const g = groups.get(key);
    if (g) g.push(r.slug);
    else groups.set(key, [r.slug]);
  }
  const out = new Set<string>();
  for (const g of groups.values()) if (g.length > 1) for (const s of g) out.add(s);
  return out;
}

/**
 * Unit VW110 (Q-A 3:74.5 part 4, Q-A 3:72.2): the name of a book on a staff screen. The English title, else the Japanese title, else the file name.
 * `hover` is the file name when a title is shown (the file name is also the main text when there is no title, then there is no hover text).
 * `title` is the title alone, "" when none exists.
 */
export function staffBookName(slug: string, titleEn?: string | null, titleJa?: string | null): { main: string; hover: string; title: string } {
  const n = bookNames(slug, titleEn ?? "", titleJa ?? "");
  return { main: n.main, hover: n.hover, title: n.hover ? n.main : "" };
}
