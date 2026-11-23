// Unit VW124 (Q-A 3:115.5 "Implement a comprehensive search function similar to in v1", Q-A 3:116.7 "A + B + C", Q-A 3:117.4 rows 1 to 5, Q-A 3:117.5 rows 1 to 4).
// The shared rules of the search page /search and the search inside one book. No server-only marker, so the server loaders, the client components, and the test script can load it.
// It imports only the fold rule and two small helper modules (reader-types, reader-links).
import { foldQuery, foldWithMap, QUERY_MAX, type Folded } from "./reader-search";
import { pageLabel, SEARCH_WAITING } from "./reader-types";
import { readHref, type ReaderView } from "./reader-links";
import type { DictItemView } from "./dictionary-core";

export { foldQuery, QUERY_MAX };

/** The address of the search page. */
export const SEARCH_PATH = "/search";
/** A query shorter than this (counted in characters of the folded text) does not search. Two Japanese characters, for example 攻め, are enough. */
export const SEARCH_MIN_CHARS = 2;
/** The pause after the last key before the search runs (Q-A 3:117.4 row 1: "after 0.35 s"). */
export const SEARCH_DELAY_MS = 350;
/** Hits on one screen of the search page (Q-A 3:117.4 row 2). */
export const SEARCH_PER_SCREEN = 20;
/** The most hits of the search inside one book (Q-A 3:117.5 row 3). */
export const BOOK_HIT_CAP = 80;
/** The longest time that one PocketBase search may run. A longer search stops and the screen says so (unit default). */
export const SEARCH_TIME_LIMIT_MS = 8000;
/** Width of a hit line in characters. */
export const SNIPPET_WIDTH = 140;
/** Longest context line in characters. */
const CONTEXT_WIDTH = 160;

/** All words of the search screens in one place. */
export const SEARCH_WORDS = {
  title: "Search",
  inputLabel: "Search words",
  placeholder: "Search books and pages",
  bookPlaceholder: "Search this book",
  bookOpen: "Search in book",
  bookClose: "Close search",
  hint: "Type at least 2 characters.",
  none: "No hits. Try other words.",
  searching: "Searching…",
  failed: "The search did not work. Try again.",
  timedOut: "The search took too long. Type more words.",
  waiting: SEARCH_WAITING,
  showContext: "Show context",
  hideContext: "Hide context",
  searchAll: "Search all",
  moreHits: `${BOOK_HIT_CAP}+ hits, type more words`,
  previous: "Previous",
  next: "Next",
  termMatch: "Matches a term mark of this page",
  marked: "Marked:",
  markedNone: "The words match a term mark on this page.",
  clearMark: "Clear mark",
  openBook: "Open the book",
} as const;

/**
 * The tabs of the search page. ONE list. Unit VW126 (Q-A 3:117.4 row 2, Q-A 3:117.6 row 3) adds the Dictionary tab as the fourth entry.
 * `needsText`: the tab shows page text or dictionary text, so a reader who waits for approval does not get it (Q-A 3:117.4 row 4). The PocketBase rule READ_OK of the list dictionary_entries says the same.
 */
export const SEARCH_TABS = [
  { id: "all", label: "All", needsText: false },
  { id: "books", label: "Books", needsText: false },
  { id: "pages", label: "Pages", needsText: true },
  { id: "dictionary", label: "Dictionary", needsText: true },
] as const;

export type SearchTabId = (typeof SEARCH_TABS)[number]["id"];

/** The tabs that a person sees. A reader who waits for approval sees book hits only, so only the tab Books. */
export function tabsFor(approved: boolean): SearchTabId[] {
  if (!approved) return ["books"];
  return SEARCH_TABS.map((t) => t.id);
}

export function tabLabel(id: SearchTabId): string {
  return SEARCH_TABS.find((t) => t.id === id)?.label ?? id;
}

/** The tab of the address, or the first tab that the person may see. */
export function pickTab(raw: unknown, approved: boolean): SearchTabId {
  const tabs = tabsFor(approved);
  const v = typeof raw === "string" ? raw : "";
  const found = tabs.find((t) => t === v);
  return found ?? tabs[0];
}

export interface SearchParams {
  q: string;
  tab: string;
  screen: number;
}

const first = (v: unknown): string => (Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "");

/** The three words of the address: the query as typed (cut to 80 characters), the tab, and the screen number. */
export function parseSearchParams(p: Record<string, unknown>): SearchParams {
  const screen = parseInt(first(p.screen), 10);
  return { q: first(p.q).trim().slice(0, QUERY_MAX), tab: first(p.tab), screen: Number.isFinite(screen) && screen > 0 ? screen : 1 };
}

/** The address of a search: /search?q=seme&tab=pages&screen=2. A default value stays out of the address. */
export function searchHref(q: string, tab: SearchTabId = "all", screen = 1): string {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (tab !== "all") p.set("tab", tab);
  if (screen > 1) p.set("screen", String(screen));
  const s = p.toString();
  return SEARCH_PATH + (s ? `?${s}` : "");
}

/** True when the query has enough characters to search. */
export function searchReady(raw: string): boolean {
  return [...foldQuery(raw)].length >= SEARCH_MIN_CHARS;
}

/**
 * The address of a page hit: the exact page in Page view or Scroll view, plus the typed words in `q`, so that the reading view marks the match.
 * Example: /read/left_foot_full?view=page&at=p048&q=seme
 */
export function hitHref(slug: string, n: number, digits: number, q: string, view: ReaderView = "page"): string {
  return `${readHref(slug, view, n, digits)}&q=${encodeURIComponent(q)}`;
}

// ---------------------------------------------------------------- the newest request wins

/** The newest request wins (Q-A 3:117.4 row 1: results come while you type). `start` gives an id. `isNewest(id)` is false when a later request started. */
export function newestOnly() {
  let last = 0;
  return {
    start: () => ++last,
    isNewest: (id: number) => id === last,
  };
}

// ---------------------------------------------------------------- finding and marking

/** Fold a text for the match of one line: like the fold of the search columns, with one space for each run of spaces. */
export function foldForLine(source: string): Folded {
  const f = foldWithMap(source);
  let text = "";
  const from: number[] = [];
  for (let i = 0; i < f.text.length; i++) {
    const ch = f.text[i];
    if (ch === " " && text.endsWith(" ")) continue;
    text += ch;
    from.push(f.from[i]);
  }
  return { text, from };
}

/** The places of the folded query in the original text, as [start, end) offsets in the original. Matches do not overlap. */
export function matchRanges(original: string, folded: string): Array<[number, number]> {
  if (!folded) return [];
  const f = foldForLine(original);
  const out: Array<[number, number]> = [];
  let pos = 0;
  let last = 0;
  for (;;) {
    const at = f.text.indexOf(folded, pos);
    if (at < 0) break;
    pos = at + Math.max(1, folded.length);
    const start = f.from[at];
    const lastFrom = f.from[at + folded.length - 1];
    const end = lastFrom + ((original.codePointAt(lastFrom) ?? 0) > 0xffff ? 2 : 1);
    if (start < last) continue;
    out.push([start, end]);
    last = end;
  }
  return out;
}

/** A piece of a text: `h` is true for the match (shown in yellow). */
export interface MarkPart {
  t: string;
  h?: boolean;
}

const clean = (s: string) => s.replace(/\s+/g, " ");

const isLow = (s: string, i: number) => i > 0 && i < s.length && s.charCodeAt(i) >= 0xdc00 && s.charCodeAt(i) <= 0xdfff;

/**
 * A window of about `width` characters around the first match, with every match inside the window marked. The spelling stays as in the original.
 * Returns null when the text does not hold the query. Example: "…the ma-ai of the first strike…" with the match "ma-ai" for the query "maai".
 * `width` Infinity gives the whole text.
 */
export function markParts(original: string, folded: string, width = SNIPPET_WIDTH): MarkPart[] | null {
  const ranges = matchRanges(original, folded);
  if (!ranges.length) return null;
  const [s, e] = ranges[0];
  const room = Math.max(0, Math.floor((width - (e - s)) / 2));
  let from = Math.max(0, s - room);
  let to = Math.min(original.length, e + room);
  if (isLow(original, from)) from--;
  if (isLow(original, to)) to++;
  const parts: MarkPart[] = [];
  const push = (a: number, b: number, h: boolean) => {
    if (b <= a) return;
    const t = clean(original.slice(a, b));
    if (t) parts.push(h ? { t, h: true } : { t });
  };
  if (from > 0) parts.push({ t: "…" });
  let cur = from;
  for (const [a, b] of ranges) {
    if (a >= to) break;
    const hs = Math.max(a, from);
    const he = Math.min(b, to);
    if (he <= hs) continue;
    push(cur, hs, false);
    push(hs, he, true);
    cur = he;
  }
  push(cur, to, false);
  if (to < original.length) parts.push({ t: "…" });
  return parts;
}

/** A plain line for the context: spaces cleaned, cut to a fixed width with a dots mark. */
export function plainLine(text: string, width = CONTEXT_WIDTH): string {
  const t = clean(text).trim();
  if (t.length <= width) return t;
  let to = width;
  if (isLow(t, to)) to--;
  return t.slice(0, to) + "…";
}

// ---------------------------------------------------------------- the lines of a page

/** The parts of a reader_pages record that the search reads. A ReaderPageRecord fits. */
export interface PageSource {
  rows: { ja: string; ed3: string; jaMarks?: { entryId: string }[]; edMarks?: { entryId: string }[] }[];
  extras: { ja: string; en: string }[];
  terms?: Record<string, { romaji?: string }>;
}

/** One line of a page that holds the query. `before` and `after` are the lines next to it in the same language (empty at the page edge). */
export interface LineHit {
  lang: "en" | "ja";
  parts: MarkPart[];
  before: string;
  after: string;
  /** The place of the line on the page, to keep the reading order. */
  order: number;
  /** Set when the page matches by the romaji of a term mark, and no line holds the words. The value is the romaji. */
  term?: string;
}

interface Entry {
  text: string;
  order: number;
}

/**
 * The English and Japanese lines of a page, in reading order.
 * English: the agent text of each row, the English captions, then the text of the Human version when the page has one (the same text as the Reader dashboard search).
 * Japanese: the Japanese text of each row and caption. The v1 placeholder text is never an input (Q-A 2026-10-30 "Not translated, not searched").
 */
export function pageEntries(src: PageSource, human: string[] = []): { en: Entry[]; ja: Entry[] } {
  const en: Entry[] = [];
  const ja: Entry[] = [];
  src.rows.forEach((r, i) => {
    if (r.ed3.trim()) en.push({ text: r.ed3, order: i * 2 });
    if (r.ja.trim()) ja.push({ text: r.ja, order: i * 2 + 1 });
  });
  const base = src.rows.length * 2;
  src.extras.forEach((x, i) => {
    if (x.en.trim()) en.push({ text: x.en, order: base + i * 2 });
    if (x.ja.trim()) ja.push({ text: x.ja, order: base + i * 2 + 1 });
  });
  const base2 = base + src.extras.length * 2;
  human.forEach((t, i) => {
    if (t.trim()) en.push({ text: t, order: base2 + i });
  });
  return { en, ja };
}

function hitsOf(list: Entry[], lang: "en" | "ja", folded: string): LineHit[] {
  const out: LineHit[] = [];
  list.forEach((e, i) => {
    const parts = markParts(e.text, folded);
    if (!parts) return;
    out.push({ lang, parts, before: i > 0 ? plainLine(list[i - 1].text) : "", after: i + 1 < list.length ? plainLine(list[i + 1].text) : "", order: e.order });
  });
  return out;
}

/** A page that matches by the romaji of a term mark: the first row with such a mark. Returns null when no row has one. */
function termHit(src: PageSource, folded: string): LineHit | null {
  const terms = src.terms ?? {};
  for (const [i, r] of src.rows.entries()) {
    for (const m of [...(r.jaMarks ?? []), ...(r.edMarks ?? [])]) {
      const romaji = terms[m.entryId]?.romaji ?? "";
      if (romaji && foldForLine(romaji).text.includes(folded)) {
        const text = r.ed3.trim() || r.ja.trim();
        return { lang: r.ed3.trim() ? "en" : "ja", parts: [{ t: plainLine(text, SNIPPET_WIDTH) }], before: "", after: "", order: i * 2, term: romaji };
      }
    }
  }
  return null;
}

/**
 * The lines of a page that hold the folded query, in reading order. English and Japanese lines both count.
 * When no line holds the words but a term mark of the page does (the column search_en holds the romaji of the term marks), the result is one term hit.
 */
export function lineHits(src: PageSource, human: string[], folded: string): LineHit[] {
  if (!folded) return [];
  const e = pageEntries(src, human);
  const hits = [...hitsOf(e.en, "en", folded), ...hitsOf(e.ja, "ja", folded)].sort((a, b) => a.order - b.order);
  if (hits.length) return hits;
  const t = termHit(src, folded);
  return t ? [t] : [];
}

/** The first line of a page for the first screen of hits: English first, then Japanese (the order of the Reader dashboard search). */
export function firstLineHit(src: PageSource, human: string[], folded: string): LineHit | null {
  const e = pageEntries(src, human);
  return hitsOf(e.en, "en", folded)[0] ?? hitsOf(e.ja, "ja", folded)[0] ?? termHit(src, folded);
}

// ---------------------------------------------------------------- the answers of the two routes

/** The text of a work that a book hit shows. DashWork fits. */
export interface WorkText {
  slug: string;
  titleEn: string;
  titleJa: string;
  author: string;
  publisher: string;
  year: string;
  webDate: string;
  synopsis: string;
}

/** A book hit. The title is the readable title, never the folder name, unless the work has no title. */
export interface WorkItemView {
  type: "work";
  slug: string;
  href: string;
  title: MarkPart[];
  titleJa: MarkPart[];
  meta: MarkPart[];
  synopsis: MarkPart[] | null;
}

export interface PageItemView {
  type: "page";
  slug: string;
  title: string;
  n: number;
  label: string;
  digits: number;
  href: string;
  line: LineHit | null;
  /** The start of the page text, when no line shows the match. */
  fallback: string;
}

export type SearchItemView = WorkItemView | PageItemView | DictItemView;

export interface SearchResponse {
  query: string;
  short: boolean;
  tab: SearchTabId;
  tabs: SearchTabId[];
  counts: Record<SearchTabId, number>;
  screen: number;
  screens: number;
  waiting: boolean;
  /** False when the database has no search columns yet (migration 1793300010 and S2 missing). Then only books are searched. */
  pageSearch: boolean;
  /** Unit VW126: False when the database has no list dictionary_entries yet (migration 1793300019 and the sync missing). Then the tab Dictionary is empty. */
  dictionarySearch: boolean;
  capped: boolean;
  timedOut: boolean;
  items: SearchItemView[];
}

export interface BookGroup {
  n: number;
  label: string;
  digits: number;
  hits: LineHit[];
}

export interface BookSearchResponse {
  slug: string;
  query: string;
  short: boolean;
  waiting: boolean;
  pageSearch: boolean;
  groups: BookGroup[];
  total: number;
  more: boolean;
  timedOut: boolean;
}

/** The text of a work in the three lines of a book hit. */
export function workItem(w: WorkText, folded: string): WorkItemView {
  const title = w.titleEn || w.titleJa || w.slug;
  const meta = [w.author, w.publisher, w.year, w.webDate].filter(Boolean).join(" · ");
  const whole = (t: string): MarkPart[] => (t ? (markParts(t, folded, Infinity) ?? [{ t: clean(t) }]) : []);
  return {
    type: "work",
    slug: w.slug,
    href: `/read/${encodeURIComponent(w.slug)}`,
    title: whole(title),
    titleJa: w.titleEn && w.titleJa ? whole(w.titleJa) : [],
    meta: whole(meta),
    synopsis: w.synopsis ? markParts(w.synopsis, folded) : null,
  };
}

/** The number of screens for a count of hits. At least one. */
export function screensOf(count: number): number {
  return Math.max(1, Math.ceil(count / SEARCH_PER_SCREEN));
}

export { pageLabel };
