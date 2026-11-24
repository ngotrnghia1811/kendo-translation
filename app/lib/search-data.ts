import "server-only";
import { catalogWorks, dictionaryCount, dictionaryMatches, PbError, readerPageRecords, readerVersionRecords, searchBookPages, searchReaderPages, type PageHit, type ReaderHumanVersion } from "./pb";
import { DICT_MIN_CHARS, dictExact, dictItemView, dictQuery, exactOnly, orderHits, type DictBrief } from "./dictionary-core";
import { isHidden, matchWorks } from "./reader-folds";
import type { SessionUser } from "./htv-types";
import type { DashWork, ReaderPageRecord } from "./reader-types";
import {
  BOOK_HIT_CAP,
  QUERY_MAX,
  SEARCH_MIN_CHARS,
  SEARCH_PER_SCREEN,
  SEARCH_TIME_LIMIT_MS,
  firstLineHit,
  foldQuery,
  hitHref,
  lineHits,
  pageLabel,
  pickTab,
  screensOf,
  tabsFor,
  workItem,
  type BookGroup,
  type BookSearchResponse,
  type PageItemView,
  type SearchItemView,
  type SearchResponse,
  type SearchTabId,
} from "./search-core";

/*
 * Unit VW124 (Q-A 3:115.5, 3:116.7, 3:117.4, 3:117.5): the data of the search page /search and of the search inside one book.
 * Every read uses the token of the signed-in person (or the link key of a view-only visitor), so the PocketBase rules are the gate:
 *   - reader_pages holds only the pages that an admin opened for readers, and a reader who waits for approval cannot read it (rule READ_OK).
 *   - This module adds two more rules: the hidden works never match (the Reader dashboard rule isHidden), and a waiting reader gets no page search at all.
 * The Reader dashboard search in reader-data.ts stays as it was.
 */

/** Result of a read that the rules may refuse. A refusal gives the fallback and no error (the same rule as reader-data.ts). */
async function soft<T>(fallback: T, f: () => Promise<T>): Promise<T> {
  try {
    return await f();
  } catch (e) {
    if (e instanceof PbError && (e.status === 403 || e.status === 404)) return fallback;
    throw e;
  }
}

/** True when the error says that the time limit of the search passed. */
const isTimeout = (e: unknown): boolean => e instanceof PbError && e.status === 504;

const humanTextsOf = (v: ReaderHumanVersion | undefined): string[] => (v?.rows ?? []).map((r) => r.text).filter(Boolean);

const titleOf = (w: DashWork): string => w.titleEn || w.titleJa || w.slug;

const zeroCounts = (): Record<SearchTabId, number> => ({ all: 0, books: 0, pages: 0, dictionary: 0 });

/**
 * The answer of the search page for one query, one tab, and one screen.
 * Books: the works whose title, author, publisher, year, web date, or synopsis hold the words (the rule of the Reader dashboard).
 * Pages: the pages whose Japanese or English text holds the words. Only for a person who may read page text (approved reader, translator, admin, link visitor).
 * Dictionary (unit VW126, Q-A 3:117.6 row 3): the entries of the dictionary list that hold the words (dictionary fold: kana, romaji with or without macrons, English). The tab All does not count them (unit default).
 * `limitMs` is the time limit of the page search. When it passes, the answer holds the book hits and `timedOut`.
 */
export async function loadSearch(token: string, user: SessionUser, rawQuery: string, tabRaw: unknown, screenNo: number, limitMs: number = SEARCH_TIME_LIMIT_MS): Promise<SearchResponse> {
  const query = rawQuery.trim().slice(0, QUERY_MAX);
  const folded = foldQuery(rawQuery);
  const tabs = tabsFor(user.approved);
  const tab = pickTab(tabRaw, user.approved);
  const base = { query, tab, tabs, waiting: !user.approved, pageSearch: true, dictionarySearch: true, capped: false, timedOut: false };
  // Unit VW128 (Q-A 3:127.4): the Dictionary tab searches from 1 character. Books and pages keep the rule of 2 characters, so a shorter query skips them.
  const pagesReady = [...folded].length >= SEARCH_MIN_CHARS;
  const dictFolded = dictQuery(rawQuery);
  const dictReadyNow = [...dictFolded].length >= DICT_MIN_CHARS;
  if (!pagesReady && !(tab === "dictionary" && dictReadyNow)) return { ...base, short: true, counts: zeroCounts(), screen: 1, screens: 1, items: [] };

  const all = pagesReady ? await catalogWorks(token) : [];
  const visible = all.filter((w) => !isHidden(w, all));
  const bySlug = new Map(visible.map((w) => [w.slug, w]));
  const books = pagesReady ? matchWorks(visible, folded) : [];

  let pages: { hits: PageHit[]; capped: boolean } | null = { hits: [], capped: false };
  let timedOut = false;
  if (user.approved && pagesReady) {
    try {
      pages = await searchReaderPages(token, folded, AbortSignal.timeout(limitMs));
    } catch (e) {
      if (!isTimeout(e)) throw e;
      timedOut = true;
      pages = { hits: [], capped: false };
    }
  }
  const hits = (pages?.hits ?? []).filter((h) => bySlug.has(h.itemId));
  // Unit VW126: the Dictionary tab. A person who may read page text may read the dictionary list too (the same rule READ_OK). The tab All does not count the entries.
  // A query in double quotes is an exact search (owner note Q-A 3:127.4).
  const dictExactOn = dictExact(rawQuery);
  let dictRows: DictBrief[] = [];
  let dictCount = 0;
  let dictionarySearch = true;
  if (user.approved && dictReadyNow) {
    try {
      if (tab === "dictionary") {
        const found = await dictionaryMatches(token, dictFolded, AbortSignal.timeout(limitMs));
        if (found === null) dictionarySearch = false;
        else {
          dictRows = orderHits(dictExactOn ? exactOnly(found, dictFolded) : found, dictFolded);
          dictCount = dictRows.length;
        }
      } else if (dictExactOn) {
        const found = await dictionaryMatches(token, dictFolded, AbortSignal.timeout(limitMs));
        if (found === null) dictionarySearch = false;
        else dictCount = exactOnly(found, dictFolded).length;
      } else {
        const n = await dictionaryCount(token, dictFolded, AbortSignal.timeout(limitMs));
        if (n === null) dictionarySearch = false;
        else dictCount = n;
      }
    } catch (e) {
      if (!isTimeout(e)) throw e;
      timedOut = true;
    }
  }
  const counts: Record<SearchTabId, number> = { all: books.length + hits.length, books: books.length, pages: hits.length, dictionary: dictCount };
  const rows: ({ w: DashWork } | { hit: PageHit } | { entry: DictBrief })[] = [
    ...(tab === "all" || tab === "books" ? books.map((w) => ({ w })) : []),
    ...(tab === "all" || tab === "pages" ? hits.map((hit) => ({ hit })) : []),
    ...(tab === "dictionary" ? dictRows.map((entry) => ({ entry })) : []),
  ];
  const screens = screensOf(rows.length);
  const screen = Math.min(Math.max(1, screenNo), screens);
  const slice = rows.slice((screen - 1) * SEARCH_PER_SCREEN, screen * SEARCH_PER_SCREEN);

  const ids = slice.flatMap((x) => ("hit" in x ? [x.hit.pageId] : []));
  const recs = new Map((await soft<ReaderPageRecord[]>([], () => readerPageRecords(token, ids))).map((r) => [r.pageId, r]));
  const versions = ids.length ? await soft(new Map<string, ReaderHumanVersion>(), () => readerVersionRecords(token, ids)) : new Map<string, ReaderHumanVersion>();
  const items: SearchItemView[] = slice.map((x): SearchItemView => {
    if ("w" in x) return workItem(x.w, folded);
    if ("entry" in x) return dictItemView(x.entry, dictFolded, query);
    const w = bySlug.get(x.hit.itemId)!;
    const rec = recs.get(x.hit.pageId);
    const human = humanTextsOf(versions.get(x.hit.pageId));
    const line = rec ? firstLineHit(rec, human, folded) : null;
    const digits = x.hit.pageId.length - x.hit.pageId.lastIndexOf("/p") - 2;
    const plain = rec ? [...rec.rows.map((r) => r.ed3), ...rec.extras.map((e) => e.en), ...human].filter(Boolean).join(" ") : "";
    const item: PageItemView = {
      type: "page",
      slug: w.slug,
      title: titleOf(w),
      n: x.hit.n,
      label: pageLabel(x.hit.n),
      digits,
      href: hitHref(w.slug, x.hit.n, digits, query),
      line,
      fallback: line ? "" : plain.replace(/\s+/g, " ").slice(0, 140),
    };
    return item;
  });
  return {
    ...base,
    short: false,
    counts,
    screen,
    screens,
    items,
    pageSearch: pages !== null,
    dictionarySearch,
    capped: Boolean(pages?.capped),
    timedOut,
  };
}

/**
 * The answer of the search inside one book (Q-A 3:117.5): the lines of all opened pages of the book that hold the words, grouped by page.
 * At most BOOK_HIT_CAP line hits. `more` is true when there are more (the screen then says "80+ hits, type more words").
 * A reader who waits for approval gets no page text, so no hit and no PocketBase call for the text.
 */
export async function loadBookSearch(token: string, user: SessionUser, slug: string, rawQuery: string, limitMs: number = SEARCH_TIME_LIMIT_MS): Promise<BookSearchResponse> {
  const query = rawQuery.trim().slice(0, QUERY_MAX);
  const folded = foldQuery(rawQuery);
  const base: BookSearchResponse = { slug, query, short: false, waiting: !user.approved, pageSearch: true, groups: [], total: 0, more: false, timedOut: false };
  if (!user.approved) return base;
  if ([...folded].length < SEARCH_MIN_CHARS) return { ...base, short: true };

  const all = await catalogWorks(token);
  const work = all.find((w) => w.slug === slug);
  if (!work || isHidden(work, all)) return base;

  let found: Awaited<ReturnType<typeof searchBookPages>> = { records: [], more: false };
  try {
    found = await searchBookPages(token, slug, folded, BOOK_HIT_CAP, AbortSignal.timeout(limitMs));
  } catch (e) {
    if (!isTimeout(e)) throw e;
    return { ...base, timedOut: true };
  }
  if (found === null) return { ...base, pageSearch: false };

  const ids = found.records.map((r) => r.pageId);
  const versions = ids.length ? await soft(new Map<string, ReaderHumanVersion>(), () => readerVersionRecords(token, ids)) : new Map<string, ReaderHumanVersion>();
  const groups: BookGroup[] = [];
  let total = 0;
  let more = found.more;
  for (const rec of found.records) {
    const lines = lineHits(rec, humanTextsOf(versions.get(rec.pageId)), folded);
    if (!lines.length) continue;
    const room = BOOK_HIT_CAP - total;
    if (lines.length > room) more = true;
    const kept = lines.slice(0, Math.max(0, room));
    if (kept.length) {
      groups.push({ n: rec.n, label: pageLabel(rec.n), digits: rec.pageId.length - rec.pageId.lastIndexOf("/p") - 2, hits: kept });
      total += kept.length;
    }
    if (total >= BOOK_HIT_CAP) {
      // A later page that also holds the words makes the list longer than the cap.
      if (found.records.indexOf(rec) < found.records.length - 1) more = true;
      break;
    }
  }
  return { ...base, groups, total, more };
}
