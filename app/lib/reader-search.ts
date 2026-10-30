// Fold rule of the search on the Reader dashboard (unit RC4, round 70). Round 69 answer 10: "Folded text columns in PocketBase".
// No import and no server-only marker, so the page code, the sync command S2, and a test script can load it.

/** Text field limit of reader_pages.search_ja and reader_pages.search_en (migration 1793300010). S2 cuts longer text and reports it. */
export const SEARCH_COLUMN_MAX = 100000;

/** Longest query that the search takes. */
export const QUERY_MAX = 80;

/** Hyphens that the fold removes: the hyphen-minus U+002D, the hyphen U+2010, and the non-breaking hyphen U+2011. */
const HYPHENS = new Set(["-", "\u2010", "\u2011"]);

/** True for a letter block where the fold removes accent marks: Latin letters up to U+024F and Latin Extended Additional. */
function isLatinBlock(cp: number): boolean {
  return cp < 0x250 || (cp >= 0x1e00 && cp <= 0x1eff);
}

export interface Folded {
  /** The folded text: lowercase, no accent marks on Latin letters, no hyphen. Japanese characters stay as they are. */
  text: string;
  /** For each character of `text`, the offset (in UTF-16 units) of its source character in the original text. */
  from: number[];
}

/**
 * Fold a text: lowercase, remove accent marks (macrons) from Latin letters, remove hyphens, and make each space or line break one space.
 * Example: "Seme-ai and Chūzumi" becomes "semeai and chuzumi".
 * The accent removal does not touch Japanese characters. A kana with a voiced mark (が) keeps the mark.
 */
export function foldWithMap(source: string): Folded {
  let text = "";
  const from: number[] = [];
  let i = 0;
  for (const ch of source) {
    const at = i;
    i += ch.length;
    if (HYPHENS.has(ch)) continue;
    let out = ch;
    const cp = ch.codePointAt(0) ?? 0;
    if (/\s/u.test(ch)) out = " ";
    else if (isLatinBlock(cp)) out = ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    else out = ch.toLowerCase();
    for (let k = 0; k < out.length; k++) from.push(at);
    text += out;
  }
  return { text, from };
}

export function foldText(source: string): string {
  return foldWithMap(source).text;
}

/** The query for the filter: folded, trimmed, one space between words, at most QUERY_MAX characters. The characters % and \ are removed. */
export function foldQuery(raw: string): string {
  return foldText(raw.replace(/[%\\]/g, " ")).replace(/ +/g, " ").trim().slice(0, QUERY_MAX).trim();
}

/** The two search columns of a reader_pages record. `ja` holds the Japanese text, `en` holds the English text and the romaji of the term marks. */
export interface SearchTexts {
  ja: string[];
  en: string[];
}

/** Build the two column values from the pieces. Pieces are joined with one space. Text longer than SEARCH_COLUMN_MAX is cut. */
export function searchColumns(t: SearchTexts): { search_ja: string; search_en: string; cut: boolean } {
  const join = (parts: string[]) => foldText(parts.filter(Boolean).join(" ")).replace(/ +/g, " ").trim();
  let ja = join(t.ja);
  let en = join(t.en);
  const cut = ja.length > SEARCH_COLUMN_MAX || en.length > SEARCH_COLUMN_MAX;
  ja = ja.slice(0, SEARCH_COLUMN_MAX);
  en = en.slice(0, SEARCH_COLUMN_MAX);
  return { search_ja: ja, search_en: en, cut };
}

export interface Snippet {
  before: string;
  hit: string;
  after: string;
}

/**
 * A snippet of about `width` characters around the first hit of the folded query in the original text.
 * Returns null when the folded text does not hold the query. The hit keeps the original spelling, for example "Chūzumi" for the query "chuzumi".
 */
export function snippetOf(original: string, foldedQuery: string, width = 140): Snippet | null {
  if (!foldedQuery) return null;
  const f = foldWithMap(original);
  const at = f.text.indexOf(foldedQuery);
  if (at < 0) return null;
  const start = f.from[at];
  const endFolded = at + foldedQuery.length - 1;
  const lastStart = f.from[endFolded];
  const end = lastStart + (String.fromCodePoint(original.codePointAt(lastStart) ?? 32).length);
  const room = Math.max(0, Math.floor((width - (end - start)) / 2));
  const from = Math.max(0, start - room);
  const to = Math.min(original.length, end + room);
  return {
    before: (from > 0 ? "…" : "") + original.slice(from, start).replace(/\s+/g, " "),
    hit: original.slice(start, end).replace(/\s+/g, " "),
    after: original.slice(end, to).replace(/\s+/g, " ") + (to < original.length ? "…" : ""),
  };
}
