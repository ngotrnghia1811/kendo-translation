// Unit VW126 (Q-A 3:115.5 "Design a system that agent can propose update to the kendo dict", Q-A 3:116.8 "We will have a kendo dict web page (for all roles)",
// Q-A 3:117.6 "Live site and this Mac", rows 1 to 5; Q-A 3:117.4 and 3:119.2: the fourth search tab "Dictionary").
// The shared rules of the dictionary page /dictionary and of the Dictionary tab of /search. No server-only marker and no file access,
// so the server loaders, the client components, the sync command, and the test script can load it.
import { foldWithMap, QUERY_MAX, type Folded } from "./reader-search";
import type { MarkPart } from "./search-core";
import type { TermLang } from "./htv-types";

/** The address of the dictionary page. */
export const DICT_PATH = "/dictionary";
/**
 * A query shorter than this (counted in characters of the folded text) does not search.
 * Unit VW128 (owner pick Q-A 3:127.4 "1 character in the dictionary"): 1, so that one-kanji terms such as 面 (men) and 胴 (dō) can be found.
 * The page search of /search keeps SEARCH_MIN_CHARS (2).
 */
export const DICT_MIN_CHARS = 1;
/** The quote marks of an exact search (owner note Q-A 3:127.4: "we can use \" \" for exact search"): straight, curly, and full-width double quotes. */
export const DICT_QUOTES = /["\u201c\u201d\uff02]/g;
/** Entries on one screen of the dictionary page (unit default: 25, because one entry takes 3 lines). */
export const DICT_PER_SCREEN = 25;
/** The pause after the last key before the search runs. The same as SEARCH_DELAY_MS of the search page. */
export const DICT_DELAY_MS = 350;
/** The most characters of the short English explanation of a list row. */
export const SHORT_EN_MAX = 160;
/** The name of the PocketBase list (migration 1793300019). */
export const DICT_COLLECTION = "dictionary_entries";
/** The tab of the proposals on /dictionary. */
export const PROPOSALS_TAB = "proposals";

/** All words of the dictionary screens in one place. */
export const DICT_WORDS = {
  title: "Dictionary",
  inputLabel: "Search the dictionary",
  placeholder: "Japanese, kana, romaji, or English",
  hint: "Type a word to search. The list shows all entries.",
  tip: "Put the word in double quotes for an exact match, for example \"面\" or \"men\".",
  exact: "exact match",
  none: "No entries. Try other words.",
  searching: "Searching…",
  failed: "The search did not work. Try again.",
  missing: "The dictionary is not on the server yet.",
  previous: "Previous",
  next: "Next",
  back: "Back to the list",
  openIn: "Open in the dictionary",
  tabEntries: "Entries",
  tabProposals: "Agent proposals",
  readingLabel: "Reading",
  romajiLabel: "Romaji",
  variantsLabel: "Other writings",
  sourcesLabel: "Sources",
  insideLonger: "This word often sits inside a longer word.",
  notFound: "This entry does not exist in the dictionary.",
} as const;

// ---------------------------------------------------------------- the fold

/** Katakana to hiragana: U+30A1 to U+30F6 move down by 0x60, the iteration marks U+30FD and U+30FE move to U+309D and U+309E. Same length as the source. */
export function kataToHira(source: string): string {
  let out = "";
  for (let i = 0; i < source.length; i++) {
    const c = source.charCodeAt(i);
    if ((c >= 0x30a1 && c <= 0x30f6) || c === 0x30fd || c === 0x30fe) out += String.fromCharCode(c - 0x60);
    else out += source[i];
  }
  return out;
}

/**
 * Fold a dictionary text: the fold of the search page (lowercase, no macron or accent on Latin letters, no hyphen) plus two rules for the dictionary:
 * katakana count as hiragana, and spaces are removed. So "kote", "kōte", and "ko-te" match each other, "men uchi" matches "menuchi", and ホン matches ほん.
 * `from[i]` is the offset in the source text of the character i of the folded text.
 */
export function dictFoldWithMap(source: string): Folded {
  const f = foldWithMap(kataToHira(source));
  let text = "";
  const from: number[] = [];
  for (let i = 0; i < f.text.length; i++) {
    if (f.text[i] === " ") continue;
    text += f.text[i];
    from.push(f.from[i]);
  }
  return { text, from };
}

export const dictFold = (source: string): string => dictFoldWithMap(source).text;

/**
 * The query for the filter: dictionary fold, at most QUERY_MAX characters. The characters % and \ are removed (they are wildcards for PocketBase).
 * The double quotes of an exact search are removed too (unit VW128), so '"面"' gives '面'.
 */
export function dictQuery(raw: string): string {
  return dictFold(raw.replace(/[%\\]/g, " ").replace(DICT_QUOTES, " ")).slice(0, QUERY_MAX);
}

/**
 * True when the typed text is an exact search: it starts and ends with a double quote and holds a word between them (unit VW128, owner note Q-A 3:127.4).
 * Example: '"面"' and '“men”' are exact. '面', '"面' and '""' are not.
 */
export function dictExact(raw: string): boolean {
  const t = raw.trim();
  return t.length >= 3 && /^["\u201c\u201d\uff02]/u.test(t) && /["\u201c\u201d\uff02]$/u.test(t) && dictQuery(t) !== "";
}

/** The entries of an exact search: the folded query is a whole headword, other writing, reading, romaji, or EN form (rank 0 of rankOf). */
export function exactOnly(recs: DictBrief[], folded: string): DictBrief[] {
  return recs.filter((r) => rankOf(r, folded) === 0);
}

/** True when the query has enough characters to search. */
export function dictReady(raw: string): boolean {
  return [...dictQuery(raw)].length >= DICT_MIN_CHARS;
}

// ---------------------------------------------------------------- the short English explanation

/**
 * The short English explanation of a list row: the first sentence of the first English definition, without the markdown stars, cut to `max` characters at a word end.
 * Example: "Dandori (段取り) is the arrangement of steps. In kendo ..." gives "Dandori (段取り) is the arrangement of steps."
 */
export function shortExplanation(detailed: string, max = SHORT_EN_MAX): string {
  const text = detailed.replace(/\*/g, "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const m = /^(.+?[.!?。])(?:\s|$)/u.exec(text);
  const first = m ? m[1] : text;
  if ([...first].length <= max) return first;
  const cut = [...first].slice(0, max).join("");
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,;:]+$/u, "") + "…";
}

// ---------------------------------------------------------------- list rows

/** The fields of one list row (the PocketBase list without the full view). */
export interface DictBrief {
  entry_id: string;
  headword: string;
  variants: string[];
  reading: string;
  romaji: string;
  concise_en: string;
  short_en: string;
  common: string;
  sort_key: string;
}

/** The PocketBase field list of a list row. */
export const DICT_BRIEF_FIELDS = "entry_id,headword,variants,reading,romaji,concise_en,short_en,common,sort_key";

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * How well an entry fits a folded query. 0: the query is a whole headword, variant, reading, romaji, or EN form. 1: it starts one of them.
 * 2: it sits inside one of them or inside the short English explanation. 3: it sits only in a long text (a definition).
 */
export function rankOf(rec: DictBrief, folded: string): number {
  const keys = [rec.headword, ...rec.variants, rec.reading, rec.romaji, rec.concise_en].map(dictFold).filter(Boolean);
  if (keys.some((k) => k === folded)) return 0;
  if (keys.some((k) => k.startsWith(folded))) return 1;
  if (keys.some((k) => k.includes(folded)) || dictFold(rec.short_en).includes(folded)) return 2;
  return 3;
}

/** The hits in the order of the screen: best fit first, then the reading, then the entry ID. The same input always gives the same order. */
export function orderHits(recs: DictBrief[], folded: string): DictBrief[] {
  return recs
    .map((r) => ({ r, t: rankOf(r, folded) }))
    .sort((a, b) => a.t - b.t || cmp(a.r.sort_key, b.r.sort_key) || cmp(a.r.entry_id, b.r.entry_id))
    .map((x) => x.r);
}

/** The places of the folded query in the original text, as [start, end) offsets in the original. Matches do not overlap. */
export function dictRanges(original: string, folded: string): Array<[number, number]> {
  if (!folded) return [];
  const f = dictFoldWithMap(original);
  const out: Array<[number, number]> = [];
  let pos = 0;
  for (;;) {
    const at = f.text.indexOf(folded, pos);
    if (at < 0) break;
    pos = at + folded.length;
    const start = f.from[at];
    const lastFrom = f.from[at + folded.length - 1];
    out.push([start, lastFrom + ((original.codePointAt(lastFrom) ?? 0) > 0xffff ? 2 : 1)]);
  }
  return out;
}

/** A text in parts, with the matches of the folded query marked (shown in yellow). A text with no match gives one plain part. An empty text gives no part. */
export function dictMarks(original: string, folded: string): MarkPart[] {
  const text = original.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const parts: MarkPart[] = [];
  let cur = 0;
  for (const [s, e] of dictRanges(text, folded)) {
    if (s > cur) parts.push({ t: text.slice(cur, s) });
    parts.push({ t: text.slice(s, e), h: true });
    cur = e;
  }
  if (cur < text.length) parts.push({ t: text.slice(cur) });
  return parts;
}

/** One entry of a result list. The words that hold the query are marked. */
export interface DictItemView {
  type: "entry";
  id: string;
  href: string;
  headword: MarkPart[];
  reading: MarkPart[];
  romaji: MarkPart[];
  conciseEn: MarkPart[];
  shortEn: MarkPart[];
  common: string;
}

export function dictItemView(rec: DictBrief, folded: string, q: string): DictItemView {
  return {
    type: "entry",
    id: rec.entry_id,
    href: dictHref({ entry: rec.entry_id, q }),
    headword: dictMarks(rec.headword, folded),
    reading: dictMarks(rec.reading, folded),
    romaji: dictMarks(rec.romaji, folded),
    conciseEn: dictMarks(rec.concise_en, folded),
    shortEn: dictMarks(rec.short_en, folded),
    common: rec.common,
  };
}

/** The number of screens for a count of entries. At least one. */
export function dictScreens(count: number): number {
  return Math.max(1, Math.ceil(count / DICT_PER_SCREEN));
}

// ---------------------------------------------------------------- the address

export interface DictParams {
  q: string;
  screen: number;
  entry: string;
  tab: string;
}

const first = (v: unknown): string => (Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : "");

/** An entry ID of the termbase has the form c-0123456789ab. A safe text rule (letters, digits, "-" and "_") covers the new entries too. */
export const ENTRY_ID_RULE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

/** The words of the address: the query as typed (cut to 80 characters), the screen number, the entry ID (empty when it has a bad form), and the tab. */
export function parseDictParams(p: Record<string, unknown>): DictParams {
  const screen = parseInt(first(p.screen), 10);
  const entry = first(p.entry).trim();
  return {
    q: first(p.q).trim().slice(0, QUERY_MAX),
    screen: Number.isFinite(screen) && screen > 0 ? screen : 1,
    entry: ENTRY_ID_RULE.test(entry) ? entry : "",
    tab: first(p.tab) === PROPOSALS_TAB ? PROPOSALS_TAB : "",
  };
}

/** The address of the dictionary page. A default value stays out. Example: /dictionary?q=kote&screen=2, /dictionary?entry=c-00a61202322b, /dictionary?tab=proposals */
export function dictHref(o: { q?: string; screen?: number; entry?: string; tab?: string } = {}): string {
  const p = new URLSearchParams();
  if (o.q) p.set("q", o.q);
  if (o.entry) p.set("entry", o.entry);
  if (o.tab === PROPOSALS_TAB) p.set("tab", PROPOSALS_TAB);
  if (o.screen && o.screen > 1) p.set("screen", String(o.screen));
  const s = p.toString();
  return DICT_PATH + (s ? `?${s}` : "");
}

// ---------------------------------------------------------------- the answers

/** The answer of GET /api/read/dictionary for a list. `ready` is false when the query is empty: the list then shows all entries. `missing` is true when the list is not on the server. */
export interface DictListResponse {
  query: string;
  ready: boolean;
  /** True for an exact search in double quotes (unit VW128). */
  exact: boolean;
  missing: boolean;
  count: number;
  screen: number;
  screens: number;
  items: DictItemView[];
}

/** The full entry (all fields of the term pop-up, plus the other writings and the sources). */
export interface DictEntryView {
  id: string;
  headword: string;
  variants: string[];
  readings: string[];
  romaji: string;
  common: string;
  langs: TermLang[];
  sources: string[];
  insideLonger: boolean;
}
