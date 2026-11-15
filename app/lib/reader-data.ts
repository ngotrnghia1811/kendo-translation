import "server-only";
import { idDigits, pageName } from "./htv-books";
import {
  bookTocCounts,
  catalogFacts,
  catalogWorks,
  magazineChapterRows,
  magazineChapters,
  PbError,
  readerPageRecords,
  readerPageNumbers,
  readerTextNumbers,
  readerVersionPages,
  searchReaderPages,
  SEARCH_HIT_CAP,
  readerVersionRecords,
  pageCheckDates,
  readingProgress,
  listBookmarks,
  type ReaderHumanVersion,
} from "./pb";
import {
  LABEL_AGENT_CHECKED,
  LABEL_AGENT_UNCHECKED,
  LABEL_HUMAN,
  LABEL_HUMAN_DEFAULT,
  LABEL_V1,
  pageLabel,
  type BookmarkView,
  type ReaderBookFacts,
  type ReaderBookIndex,
  type ReaderPageData,
  type ReaderPageRecord,
  type ReaderViewRow,
} from "./reader-types";
import type { SessionUser } from "./htv-types";
import { hasAgentRecord, isWebKey } from "./reader-web";
import { rowLinks } from "./cross-page-reader";
import { v1PagesOfWork, v1RowsOfPages } from "./reader-v1-source";
import { buildFolds, matchWorks, type Dashboard } from "./reader-folds";
import type { TocCount } from "./reader-toc";
import { foldQuery, snippetOf, type Snippet } from "./reader-search";
import type { DashWork } from "./reader-types";

/*
 * Data of the reader pages (unit RC1, round 63). VISION-viewer 15.19.
 * Every read uses the token of the signed-in user, so the PocketBase rules apply (migrations 1793300006 to 1793300009).
 * A reader who waits for approval gets empty lists from reader_pages and reader_versions, so the screen shows titles and no text.
 * Nothing here reads page_runs. The reader pages hold no verdict, no score, no TL_3 panel, and no reasoning.
 */

/** Page number of a page ID such as "left_foot_full/p048". */
export function numberOf(pageId: string): number {
  return parseInt(pageId.slice(pageId.lastIndexOf("/p") + 2), 10) || 0;
}

/** Short synopsis for the book card: the first sentences, at most `max` characters, cut at a word end. */
export function shortSynopsis(text: string, max = 220): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("。"));
  if (stop > max * 0.5) return cut.slice(0, stop + 1);
  return cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : max) + "…";
}

/** Result of a read that the rules may refuse. A refusal gives the fallback and no error. */
async function soft<T>(fallback: T, f: () => Promise<T>): Promise<T> {
  try {
    return await f();
  } catch (e) {
    if (e instanceof PbError && (e.status === 403 || e.status === 404)) return fallback;
    throw e;
  }
}

/** Hits on one screen of the search results. */
export const SEARCH_PER_SCREEN = 20;

/** One line of the search results: a work that matches by title or metadata, or a page that matches by text. */
export type SearchItem =
  | { type: "work"; work: DashWork }
  | { type: "page"; slug: string; title: string; n: number; digits: number; snippet: Snippet | null; fallback: string };

export interface SearchView {
  /** The query as typed (cut to 80 characters). */
  query: string;
  /** False when the database has no search columns yet (migration 1793300010 and S2 missing). Then only titles and metadata are searched. */
  pageSearch: boolean;
  /** True for a reader who waits for approval: no page text search (round 68 answer 3, VISION-viewer 15.23.4). */
  waiting: boolean;
  titleHits: number;
  pageHits: number;
  /** Works that hold at least one page hit. */
  pageWorks: number;
  capped: boolean;
  screen: number;
  screens: number;
  items: SearchItem[];
}

export interface DashboardData {
  dash: Dashboard;
  search: SearchView | null;
}

const plainEn = (r: ReaderPageRecord) => [...r.rows.map((x) => x.ed3), ...r.extras.map((e) => e.en)].filter(Boolean).join(" ");
const plainJa = (r: ReaderPageRecord) => [...r.rows.map((x) => x.ja), ...r.extras.map((e) => e.ja)].filter(Boolean).join(" ");

/**
 * The data of the Reader dashboard /read (unit RC4, round 70). One request lists all rows of catalog_items (347 after S2), one lists the 103 month chapters,
 * and one lists the saved places of the account. The translated pages come from catalog_items.translated, so a reader who waits for approval sees the progress too
 * (round 69 answer 9). While that field is missing (before S2), an approved reader gets the pages from reader_pages, and a reader who waits gets no progress line.
 * A search (query q) replaces the folds with a list of hits (VISION-viewer 15.23.4).
 */
export async function loadDashboard(token: string, user: SessionUser, rawQuery: string, screenNo: number): Promise<DashboardData> {
  const works = await catalogWorks(token);
  const progress = await soft(new Map<string, string>(), () => readingProgress(token, user.id));
  const fallback = works.some((w) => !w.known) && user.approved ? await soft(new Map<string, number[]>(), () => readerTextNumbers(token)) : null;
  for (const w of works) {
    const at = progress.get(w.slug);
    w.resumeAt = at ? numberOf(at) || null : null;
    if (!w.known && fallback) {
      w.translated = fallback.get(w.slug) ?? [];
      w.known = true;
    }
  }
  // Unit VW77e: the ToC counts of the books (collection book_toc, loaded by S2). An old database has no collection: soft() gives an empty map and /read looks as before.
  const tocBooks = await soft(new Map<string, TocCount>(), () => bookTocCounts(token));
  const dash = buildFolds(works, await magazineChapterRows(token), undefined, tocBooks);
  const folded = foldQuery(rawQuery);
  if (!folded) return { dash, search: null };

  const visibleSlugs = new Map(dash.visible.map((w) => [w.slug, w]));
  const titles = matchWorks(dash.visible, folded);
  let pages: Awaited<ReturnType<typeof searchReaderPages>> = { hits: [], capped: false };
  if (user.approved) pages = await searchReaderPages(token, folded);
  const hits = (pages?.hits ?? []).filter((h) => visibleSlugs.has(h.itemId));
  const all: ({ w: DashWork } | { hit: (typeof hits)[number] })[] = [...titles.map((w) => ({ w })), ...hits.map((hit) => ({ hit }))];
  const screens = Math.max(1, Math.ceil(all.length / SEARCH_PER_SCREEN));
  const screen = Math.min(Math.max(1, screenNo), screens);
  const slice = all.slice((screen - 1) * SEARCH_PER_SCREEN, screen * SEARCH_PER_SCREEN);
  const ids = slice.flatMap((x) => ("hit" in x ? [x.hit.pageId] : []));
  const recs = new Map((await soft<ReaderPageRecord[]>([], () => readerPageRecords(token, ids))).map((r) => [r.pageId, r]));
  // Unit RT73a: the English text of a web article page is its Human version (reader_versions). A hit in that text shows a snippet of it.
  const versions = ids.length ? await soft(new Map<string, ReaderHumanVersion>(), () => readerVersionRecords(token, ids)) : new Map<string, ReaderHumanVersion>();
  const humanText = (id: string) => (versions.get(id)?.rows ?? []).map((r) => r.text).filter(Boolean).join(" ");
  const items: SearchItem[] = slice.map((x) => {
    if ("w" in x) return { type: "work", work: x.w };
    const w = visibleSlugs.get(x.hit.itemId)!;
    const rec = recs.get(x.hit.pageId);
    const en = rec ? [plainEn(rec), humanText(x.hit.pageId)].filter(Boolean).join(" ") : "";
    const snippet = rec ? snippetOf(en, folded) ?? snippetOf(plainJa(rec), folded) : null;
    const digits = x.hit.pageId.length - x.hit.pageId.lastIndexOf("/p") - 2;
    return { type: "page", slug: w.slug, title: w.titleEn || w.titleJa || w.slug, n: x.hit.n, digits, snippet, fallback: snippet ? "" : en.replace(/\s+/g, " ").slice(0, 140) };
  });
  return {
    dash,
    search: {
      query: rawQuery.trim().slice(0, 80),
      pageSearch: pages !== null,
      waiting: !user.approved,
      titleHits: titles.length,
      pageHits: hits.length,
      pageWorks: new Set(hits.map((h) => h.itemId)).size,
      capped: Boolean(pages?.capped) || hits.length >= SEARCH_HIT_CAP,
      screen,
      screens,
      items,
    },
  };
}

function factsOf(slug: string, f: ReaderBookFacts | undefined): ReaderBookFacts {
  return f ?? { slug, titleEn: "", titleJa: "", author: "", publisher: "", year: "", isbn: "", pages: 0, synopsis: "", kind: "" };
}

/** True for a work with page images: a book or a magazine year. A web article has none, also when it has A4 pages (unit RT73a, VISION-viewer 15.26.6.1). */
function hasPageImages(kind: string, pages: number): boolean {
  return kind !== "web-article" && kind !== "web-capture" && pages > 0;
}

const sortedUnion = (...lists: number[][]): number[] => [...new Set(lists.flat())].sort((a, b) => a - b);

/** The index of one book, or null when the book is not in catalog_items. */
export async function loadReaderIndex(token: string, user: SessionUser, slug: string): Promise<ReaderBookIndex | null> {
  const f = (await catalogFacts(token, slug))[0];
  if (!f) return null;
  // Unit RT73a: a page is translated when it has an Agent text or a Human version. A page with only Original text rows or a v1 file is not (VISION-viewer 15.26.10).
  const nums = await soft<{ agent: number[]; web: number[] }>({ agent: [], web: [] }, () => readerPageNumbers(token, slug));
  const humanPages = await soft<number[]>([], () => readerVersionPages(token, slug));
  const v1Pages = await v1PagesOfWork(token, slug); // unit VW104: the files on this Mac, or the collection v1_placeholders in PocketBase mode
  const textPages = sortedUnion(nums.agent, humanPages);
  const checks = await pageCheckDates(token, slug).catch(() => new Map<string, string>());
  const chapters = (await magazineChapters(token, slug)).filter((c) => c.pageStart > 0);
  const progress = await soft(new Map<string, string>(), () => readingProgress(token, user.id));
  const at = progress.get(slug);
  const pages = Math.max(f.pages, ...textPages, ...nums.web, 1);
  return {
    ...factsOf(slug, f),
    pages,
    digits: idDigits(pages),
    images: hasPageImages(f.kind, f.pages),
    kind: f.kind,
    textPages,
    agentPages: nums.agent,
    humanPages,
    dataPages: sortedUnion(nums.agent, nums.web, humanPages, v1Pages),
    v1Pages,
    checkedPages: [...checks.keys()].map(numberOf).filter((n) => n > 0).sort((a, b) => a - b),
    chapters,
    resumeAt: at ? numberOf(at) || null : null,
  };
}

/**
 * The rows of the screen: the agent rows of the shown run, and the human row for each of them when the page has a Human version.
 * Row rules for a chosen version (VISION-viewer 15.19.5):
 *   - the translator wrote a text: the own text, no AI label
 *   - the translator ticked agree and left the box empty: the agent text that the translator accepted, with the tag "AI translation, checked by a translator"
 *   - else the agent text of the shown run for the same group key
 * A group key that the agent rows do not have goes to the end of the page, with its JA text from the saved row.
 * Unit RT73a (VISION-viewer 15.26.4 and 15.26.13): a row with a web key (<page_id>/web/<unit>) belongs to a web article. Its Human text is the kendojidai.com text.
 * A web row with no Human text (a JA-only sentence) gets an empty Human text, never the agent text. The fact marks of the Human row go with it.
 */
export function mergeRows(rec: ReaderPageRecord, human: ReaderHumanVersion | null): ReaderViewRow[] {
  const agreed = new Set(rec.agree);
  const byKey = new Map((human?.rows ?? []).map((r) => [r.key, r]));
  const rows: ReaderViewRow[] = rec.rows.map((r) => {
    const h = byKey.get(r.key);
    const web = isWebKey(r.key);
    let humanRow: ReaderViewRow["human"] = null;
    if (human) {
      if (h && h.text.trim()) humanRow = { text: h.text, marks: [], kind: "own", facts: h.facts ?? [] };
      else if (h && h.agree) humanRow = { text: h.ed3Text, marks: h.ed3Text === r.ed3 ? r.edMarks : [], kind: "agree", facts: [] };
      else if (web) humanRow = { text: "", marks: [], kind: "own", facts: [] };
      else humanRow = { text: r.ed3, marks: r.edMarks, kind: "agent", facts: [] };
    }
    return {
      key: r.key,
      shortKey: r.shortKey,
      part: r.part,
      ja: r.ja,
      jaMarks: r.jaMarks,
      agent: { text: r.ed3, marks: r.edMarks, agreedByTranslator: agreed.has(r.key) },
      human: humanRow,
      web,
      site: r.site === true,
      ...rowLinks(r), // unit VW90: the keys continues and continues_from of the stored row
    };
  });
  if (human) {
    const have = new Set(rec.rows.map((r) => r.key));
    for (const h of human.rows) {
      if (have.has(h.key)) continue;
      const shortKey = h.key.slice(h.key.lastIndexOf("/") + 1);
      const kind = h.text.trim() ? "own" : h.agree ? "agree" : "agent";
      const text = h.text.trim() ? h.text : h.agree ? h.ed3Text : "";
      rows.push({ key: h.key, shortKey, part: "lines", ja: h.jaText, jaMarks: [], agent: { text: "", marks: [], agreedByTranslator: false }, human: { text, marks: [], kind, facts: h.facts ?? [] }, web: isWebKey(h.key), site: false });
    }
  }
  return rows;
}

function noText(n: number): ReaderPageData {
  return { pageId: "", n, name: pageLabel(n), hasText: false, rows: [], terms: {}, extras: [], hasHuman: false, hasAgent: false, humanBy: null, v1: [], label: { agent: "", human: "", v1: LABEL_V1 }, checked: false };
}

/**
 * The data of some pages of a book. A page without a reader_pages record answers hasText false.
 * Unit RT73a: each page also carries the v1 placeholder blocks of its md file (v1), when this machine has the file. They count in no number.
 * Unit VW104 (Q-A 3:44.4, 3:45.2): in PocketBase mode (the public site) the blocks come from the collection v1_placeholders (lib/reader-v1-source.ts).
 */
export async function loadReaderPages(token: string, slug: string, nums: number[], digits: number): Promise<ReaderPageData[]> {
  const ids = nums.map((n) => `${slug}/${pageName(n, digits)}`);
  const recs = new Map((await soft<ReaderPageRecord[]>([], () => readerPageRecords(token, ids))).map((r) => [r.pageId, r]));
  const versions = await soft(new Map<string, ReaderHumanVersion>(), () => readerVersionRecords(token, [...recs.keys()]));
  const checks = await pageCheckDates(token, slug).catch(() => new Map<string, string>());
  const v1 = await v1RowsOfPages(token, slug, nums, ids);
  return nums.map((n, i) => {
    const id = ids[i];
    const rec = recs.get(id);
    if (!rec) return { ...noText(n), pageId: id, v1: v1[i] };
    const human = versions.get(id) ?? null;
    const checkedOn = checks.get(id);
    return {
      pageId: id,
      n,
      name: pageLabel(n),
      hasText: true,
      rows: mergeRows(rec, human),
      terms: rec.terms,
      extras: rec.extras,
      hasHuman: human !== null,
      hasAgent: hasAgentRecord({ runId: rec.runId }),
      humanBy: human ? (human.byDefault ? "default" : "admin") : null,
      v1: v1[i],
      label: { agent: checkedOn ? `${LABEL_AGENT_CHECKED} (${checkedOn} PST)` : LABEL_AGENT_UNCHECKED, human: human?.byDefault ? LABEL_HUMAN_DEFAULT : LABEL_HUMAN, v1: LABEL_V1 },
      checked: Boolean(checkedOn),
    };
  });
}

export async function loadBookmarks(token: string, user: SessionUser, slug: string): Promise<BookmarkView[]> {
  return soft<BookmarkView[]>([], () => listBookmarks(token, user.id, slug));
}
