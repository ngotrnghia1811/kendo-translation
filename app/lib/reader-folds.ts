// The folds of the Reader dashboard (/read), as a pure function (unit RC4, round 70). VISION-viewer 15.23.3.
// No import of server code and no server-only marker, so a test script can run it without PocketBase.
import type { DashArticle, DashChapter, DashWork } from "./reader-types";
import { foldText } from "./reader-search";
import { tocFoldId, tocNote, type TocCount, type TocRow } from "./reader-toc";

// ---------------------------------------------------------------- choices of the owner, each in one constant

/**
 * Round 69 answer 7: "They should be arrange into kendojidai year/month like the other articles" [user].
 * Round 70 answer 5 (Q-A 2026-10-29 l120, direct answer l141): "option 1. The 311 web articles ARE kendojidai 2019 to 2025 right?" [accepted option 1].
 * That confirms reading A (TF83, round 84, unit default: tag "reading pending owner check" removed):
 *   "kendo-jidai"  (default) the 311 web articles sit inside the first-level fold "Kendo Jidai", in year and month folds.
 *   "separate"     reading B: the web articles form a first-level fold "Web articles" with the same year and month folds.
 */
export type WebPlace = "kendo-jidai" | "separate";
export const WEB_PLACE: WebPlace = "kendo-jidai";

/**
 * Where a web article with a print stamp goes (36 of the 311 web articles reprint a magazine article of 2011 to 2018).
 * History of the owner choice:
 *   Round 70 answer 6 (Q-A 2026-10-29 l121): "Print month (Recommended)". The stamp decided the month. Record 63654ba0 (stamp 2011.8 KENDOJIDAI) sat in August 2011.
 *   Round 83 answer 4 (Q-A 2026-11-02 l99): "Fold Kendo Jidai 2019 shows 9 of 14 web articles: Show web year" [accepted option 2]. This replaces round 70 answer 6.
 *   Round 84 answer 1 (Q-A 2026-11-02 l127): "Reading is right (Recommended)". Every web article sits in the fold of its web year and month.
 *   "web"    (default) the month of the web post. Example: record 63654ba0 (stamp 2011.8 KENDOJIDAI) sits in April 2025.
 *   "print"  the month of the print issue. The same record sits in August 2011. Kept as a switch for a test (unit TF83).
 * Effect on /read (unit TF83): the fold Kendo Jidai 2019 holds 14 web articles (it held 9), and the month folds that held only stamped web articles go away (for example September 2018).
 */
export type StampedPlace = "print" | "web";
export const STAMPED_PLACE: StampedPlace = "web";

/** Round 69 answer 15: "Ignore these for now". The web captures matsubara and morishima do not show on /read. They stay on /translate. */
export const HIDE_WEB_CAPTURES = true;

/**
 * Round 69 answer 12: "Show only the full book". men0 and men1 are hidden because their metadata key part_of names men_full (the rule below).
 * mental2_clean has the same title and the same 169 pages as mental_full, and its metadata names no full book, so it is listed here.
 */
export const HIDDEN_COPIES = ["mental2_clean"];

export interface FoldOptions {
  webPlace: WebPlace;
  stampedPlace: StampedPlace;
}
export const DEFAULT_OPTIONS: FoldOptions = { webPlace: WEB_PLACE, stampedPlace: STAMPED_PLACE };

// ---------------------------------------------------------------- tree

export interface Counts {
  works: number;
  pages: number;
  translated: number;
}

/** One work: a book, a magazine year volume, or a web article. */
export interface WorkRow {
  type: "work";
  work: DashWork;
  /** Pages for the progress line. A web article counts its A4 pages (unit RT73a, VISION-viewer 15.26.3). */
  pages: number;
  translated: number;
  /** First translated page, or null. */
  start: number | null;
}

/** One article of a magazine month. */
export interface ArticleRow {
  type: "article";
  book: string;
  /** Digits of the page ID of the book: 3, or 4 when the year volume has more than 999 pages. */
  digits: number;
  order: number;
  titleEn: string;
  titleJa: string;
  pageStart: number;
  pageEnd: number;
  translated: number;
}

/** A chapter that is no month, for example "Table of contents". */
export interface LineRow {
  type: "line";
  label: string;
  pageStart: number;
  pageEnd: number;
  translated: number;
}

export interface Fold {
  type: "fold";
  id: string;
  title: string;
  titleJa: string;
  /** 1 for the first level. Only level 1 starts open. */
  level: number;
  counts: Counts;
  /** Short text after the title, for example "11 articles · pages 778-868". */
  note: string;
  /** The row of the work that the fold stands for (a magazine year volume). Null for a plain group. */
  head: WorkRow | null;
  children: Node[];
  /** True for a month whose rows load when the fold opens (see lazyMonths). Then `children` is empty unless the page opens this month on the server. */
  lazy?: boolean;
  /**
   * Unit VW77e (Q-A 3:10.4 F1 and F2): the slug of the book when this fold is the table of contents (ToC) of a book. The fold starts closed and has lazy true.
   * Its rows (TocRow) load when the reader opens it. `head` is the row of the book. Without ToC data in the database no fold has this key.
   */
  toc?: string;
}

export type Node = Fold | WorkRow | ArticleRow | LineRow | TocRow;

export interface Dashboard {
  folds: Fold[];
  /** Works that show on the dashboard (hidden works left out). */
  visible: DashWork[];
  totals: Counts;
}

// ---------------------------------------------------------------- rules

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function monthHeading(year: number, month: number): string {
  return month >= 1 && month <= 12 ? `${MONTH_NAMES[month - 1]} ${year}` : `${year}`;
}

export function isWeb(w: DashWork): boolean {
  return w.kind === "web-article";
}

/** True when the dashboard hides the work (round 69 answers 12 and 15). `all` is every work, to find the full book that a part names. */
export function isHidden(w: DashWork, all: DashWork[]): boolean {
  if (HIDE_WEB_CAPTURES && w.kind === "web-capture") return true;
  if (HIDDEN_COPIES.includes(w.slug)) return true;
  return Boolean(w.partOf) && w.partOf !== w.slug && all.some((o) => o.slug === w.partOf && o.kind === w.kind);
}

/**
 * Pages of a work for the progress line. A web article counts its A4 pages (catalog_items.pages, written by S2 from the Translator page file,
 * VISION-viewer 15.26.3). While S2 has not written them yet, the column is 0 and the article counts as 1 page.
 */
export function workPages(w: DashWork): number {
  return isWeb(w) ? Math.max(w.pages, 1) : Math.max(w.pages, 0);
}

export function rowOf(w: DashWork): WorkRow {
  return { type: "work", work: w, pages: workPages(w), translated: w.translated.length, start: w.translated.length ? w.translated[0] : null };
}

export function digitsOf(pages: number): number {
  return pages > 999 ? 4 : 3;
}

const zero = (): Counts => ({ works: 0, pages: 0, translated: 0 });
function add(a: Counts, b: Counts): Counts {
  return { works: a.works + b.works, pages: a.pages + b.pages, translated: a.translated + b.translated };
}
function sum(nodes: Node[]): Counts {
  let c = zero();
  for (const n of nodes) {
    if (n.type === "work") c = add(c, { works: 1, pages: n.pages, translated: n.translated });
    else if (n.type === "fold") c = add(c, n.counts);
  }
  return c;
}

/** Month of a web article, by the choice STAMPED_PLACE. Year null means that the facts hold no date. */
export function webMonthOf(w: DashWork, stamped: StampedPlace): { year: number | null; month: number | null } {
  const p = w.placement;
  if (stamped === "print" && p.printYear && p.printMonth) return { year: p.printYear, month: p.printMonth };
  if (p.webYear) return { year: p.webYear, month: p.webMonth };
  return { year: null, month: null };
}

const byDateThenTitle = (a: DashWork, b: DashWork) => (a.webDate < b.webDate ? -1 : a.webDate > b.webDate ? 1 : a.titleEn < b.titleEn ? -1 : a.titleEn > b.titleEn ? 1 : a.slug < b.slug ? -1 : 1);

function inRange(translated: number[], from: number, to: number): number {
  return from > 0 && to >= from ? translated.filter((n) => n >= from && n <= to).length : 0;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

// ---------------------------------------------------------------- build

function articleRows(book: string, digits: number, c: DashChapter, translated: number[]): ArticleRow[] {
  return [...c.articles]
    .sort((a: DashArticle, b: DashArticle) => a.order - b.order)
    .map((a) => ({
      type: "article" as const,
      book,
      digits,
      order: a.order,
      titleEn: a.titleEn,
      titleJa: a.titleJa,
      pageStart: a.pageStart,
      pageEnd: a.pageEnd,
      translated: inRange(translated, a.pageStart, a.pageEnd),
    }));
}

/** The month folds of one year: the months of the magazine chapters and the months of the web articles placed in this year. */
function monthFolds(year: number, idBase: string, mag: DashWork | null, chapters: DashChapter[], webs: Map<number, DashWork[]>): { nodes: Node[]; webCount: number } {
  const digits = digitsOf(mag?.pages ?? 0);
  const translated = mag?.translated ?? [];
  const lines: LineRow[] = [];
  const months = new Map<number, { chapter: DashChapter | null; webs: DashWork[] }>();
  for (const c of chapters) {
    if (c.month && c.month >= 1 && c.month <= 12) months.set(c.month, { chapter: c, webs: [] });
    else lines.push({ type: "line", label: c.titleEn || c.chapter, pageStart: c.pageStart, pageEnd: c.pageEnd, translated: inRange(translated, c.pageStart, c.pageEnd) });
  }
  let webCount = 0;
  for (const [m, list] of webs) {
    webCount += list.length;
    const hit = months.get(m);
    if (hit) hit.webs = list;
    else months.set(m, { chapter: null, webs: list });
  }
  const nodes: Node[] = [...lines];
  for (const m of [...months.keys()].sort((a, b) => a - b)) {
    const { chapter, webs: list } = months.get(m)!;
    const rows: Node[] = [];
    const parts: string[] = [];
    let counts = zero();
    if (chapter && mag) {
      rows.push(...articleRows(mag.slug, digits, chapter, translated));
      parts.push(plural(chapter.articles.length, "article", "articles"));
      if (chapter.pageStart > 0) parts.push(`pages ${chapter.pageStart}-${chapter.pageEnd}`);
      counts = { works: 0, pages: Math.max(chapter.pageEnd - chapter.pageStart + 1, 0), translated: inRange(translated, chapter.pageStart, chapter.pageEnd) };
    }
    const sorted = [...list].sort(byDateThenTitle);
    for (const w of sorted) rows.push(rowOf(w));
    if (sorted.length) {
      parts.push(plural(sorted.length, "web article", "web articles"));
      counts = add(counts, sum(rows.filter((r) => r.type === "work")));
    }
    nodes.push({ type: "fold", id: `${idBase}-${String(m).padStart(2, "0")}`, title: monthHeading(year, m), titleJa: "", level: 3, counts, note: parts.join(" · "), head: null, children: rows });
  }
  return { nodes, webCount };
}

/** The web articles of one group, by year then month. */
function groupWebs(webs: DashWork[], stamped: StampedPlace): Map<number, Map<number, DashWork[]>> {
  const out = new Map<number, Map<number, DashWork[]>>();
  for (const w of webs) {
    const { year, month } = webMonthOf(w, stamped);
    const y = year ?? 0;
    const m = year ? month ?? 0 : 0;
    if (!out.has(y)) out.set(y, new Map());
    const months = out.get(y)!;
    if (!months.has(m)) months.set(m, []);
    months.get(m)!.push(w);
  }
  return out;
}

/** Title of a year fold that has no magazine volume (the years 2019 to 2025): "Kendo Jidai 2019" (round 73 answer 7: "Also add kendojidai to the book name 2019 -> 2025"). */
export function yearFoldTitle(year: number): string {
  return `Kendo Jidai ${year}`;
}

function yearFold(year: number, idBase: string, mag: DashWork | null, chapters: DashChapter[], webMonths: Map<number, DashWork[]>, inWebFold = false): Fold {
  const webList = [...webMonths.values()].flat();
  const webRows = webList.map(rowOf);
  let counts = mag ? { works: 1, pages: workPages(mag), translated: mag.translated.length } : zero();
  counts = add(counts, sum(webRows));
  // Web articles with no date have the year 0. They are rows of the fold "Date unknown".
  if (!year) return { type: "fold", id: idBase, title: "Date unknown", titleJa: "", level: 2, counts, note: "", head: null, children: [...webList].sort(byDateThenTitle).map(rowOf) };
  const { nodes } = monthFolds(year, idBase, mag, chapters, webMonths);
  const note = [mag ? `${workPages(mag).toLocaleString("en-US")} pages` : "", webList.length ? plural(webList.length, "web article", "web articles") : ""].filter(Boolean).join(" · ");
  return { type: "fold", id: idBase, title: mag ? mag.titleEn || mag.titleJa || mag.slug : inWebFold ? String(year) : yearFoldTitle(year), titleJa: "", level: 2, counts, note, head: mag ? rowOf(mag) : null, children: nodes };
}

/**
 * Unit VW77e (Q-A 3:10.4 F1 to F4): a book with ToC rows is a fold, like a year of Kendo Jidai. The fold starts closed, its rows load when it opens,
 * and its head is the row of the book. Inside a series (Lectures on Kendo has 3 books with one title) the fold takes the part title
 * (metadata keys part_title_en and part_title_ja) so that the 3 folds differ. Without a part title it takes the title of the book.
 */
function tocFold(w: DashWork, count: TocCount, level: number, inSeries: boolean): Fold {
  const head = rowOf(w);
  const own = w.titleEn || w.titleJa || w.slug;
  return {
    type: "fold",
    id: tocFoldId(w.slug),
    title: inSeries ? w.partTitleEn || own : own,
    titleJa: inSeries ? w.partTitleJa || w.titleJa : w.titleJa,
    level,
    counts: { works: 1, pages: head.pages, translated: head.translated },
    note: tocNote(count),
    head,
    children: [],
    lazy: true,
    toc: w.slug,
  };
}

/** The works of the Books fold: works with the same English title form one fold. Another work is a row. A book with ToC rows is a ToC fold instead of a row. */
function bookNodes(books: DashWork[], tocBooks?: ReadonlyMap<string, TocCount>): Node[] {
  const groups = new Map<string, DashWork[]>();
  for (const b of books) {
    const k = b.titleEn || b.titleJa || b.slug;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(b);
  }
  const out: Node[] = [];
  let n = 0;
  const done = new Set<string>();
  for (const b of books) {
    const k = b.titleEn || b.titleJa || b.slug;
    const list = groups.get(k)!;
    if (list.length === 1) {
      const c = tocBooks?.get(b.slug);
      out.push(c ? tocFold(b, c, 2, false) : rowOf(b));
      continue;
    }
    if (done.has(k)) continue;
    done.add(k);
    const rows = list.map((w) => {
      const c = tocBooks?.get(w.slug);
      return c ? tocFold(w, c, 3, true) : rowOf(w);
    });
    out.push({ type: "fold", id: `books-series-${++n}`, title: k, titleJa: list[0].titleJa, level: 2, counts: sum(rows), note: "", head: null, children: rows });
  }
  return out;
}

export function buildFolds(all: DashWork[], chapters: DashChapter[], options: FoldOptions = DEFAULT_OPTIONS, tocBooks?: ReadonlyMap<string, TocCount>): Dashboard {
  const visible = all.filter((w) => !isHidden(w, all));
  const books = visible.filter((w) => w.kind === "book");
  const mags = visible.filter((w) => w.kind === "magazine-year");
  const webs = visible.filter(isWeb);
  const others = visible.filter((w) => !["book", "magazine-year", "web-article"].includes(w.kind));
  const folds: Fold[] = [];
  const first = (id: string, title: string, titleJa: string, children: Node[]): Fold => ({ type: "fold", id, title, titleJa, level: 1, counts: sum(children), note: "", head: null, children });

  const bookChildren = bookNodes(books, tocBooks);
  if (bookChildren.length) folds.push(first("books", "Books", "", bookChildren));

  const magYear = (w: DashWork) => Number(/(\d{4})$/.exec(w.slug)?.[1] ?? w.year) || 0;
  const chaptersOf = (slug: string) => chapters.filter((c) => c.book === slug).sort((a, b) => a.pageStart - b.pageStart);
  const webYears = groupWebs(webs, options.stampedPlace);
  const noWeb = new Map<number, DashWork[]>();
  const later = (a: number, b: number) => (a || 9999) - (b || 9999);

  // Kendo Jidai: the magazine years. In reading A the years of the web articles join them.
  const kjYears = new Set<number>(mags.map(magYear));
  if (options.webPlace === "kendo-jidai") for (const y of webYears.keys()) kjYears.add(y);
  const kj = [...kjYears].sort(later).map((y) => {
    const mag = mags.find((m) => magYear(m) === y) ?? null;
    const webMonths = options.webPlace === "kendo-jidai" ? webYears.get(y) ?? noWeb : noWeb;
    return yearFold(y, `kj-${y || "unknown"}`, mag, mag ? chaptersOf(mag.slug) : [], webMonths);
  });
  if (kj.length) folds.push(first("kj", "Kendo Jidai", "剣道時代", kj));

  if (options.webPlace === "separate") {
    const wy = [...webYears.keys()].sort(later).map((y) => yearFold(y, `web-${y || "unknown"}`, null, [], webYears.get(y)!, true));
    if (wy.length) folds.push(first("web", "Web articles", "", wy));
  }
  if (others.length) folds.push(first("other", "Other works", "", others.map(rowOf)));
  const totals = folds.reduce((t, f) => add(t, f.counts), zero());
  return { folds, visible, totals };
}

// ---------------------------------------------------------------- months load when they open

/** The first level where a fold holds rows of articles. The page sends these folds with no rows (the HTML had 2.08 MB with all rows). */
export const MONTH_LEVEL = 3;

/** A fold by its id, or null. */
export function findFold(nodes: Node[], id: string): Fold | null {
  for (const n of nodes) {
    if (n.type !== "fold") continue;
    if (n.id === id) return n;
    const hit = findFold(n.children, id);
    if (hit) return hit;
  }
  return null;
}

/** The rows of a month fold for the browser: without the long synopsis of a work (a row does not show it). */
export function slimRows(nodes: Node[]): Node[] {
  return nodes.map((n) => (n.type === "work" ? { ...n, work: { ...n.work, synopsis: "" } } : n));
}

/** The tree for the page: every month fold (level 3) has `lazy` true and no rows, except the month `openId`, which keeps its rows. */
export function lazyMonths(folds: Fold[], openId: string): Fold[] {
  return folds.map((f) =>
    f.toc
      ? { ...f, lazy: true, children: f.id === openId ? f.children : [] } // unit VW77e: a ToC fold of a book (level 2 or 3) is always lazy
      : f.level === MONTH_LEVEL
        ? { ...f, lazy: true, children: f.id === openId ? slimRows(f.children) : [] }
        : { ...f, children: f.children.map((c) => (c.type === "fold" ? lazyMonths([c], openId)[0] : c)) },
  );
}

/** Unit VW77e: the same tree, with `rows` as the children of the ToC fold `id`. The page uses it for the link /read?open=toc-<slug> (no script). */
export function withTocRows(folds: Fold[], id: string, rows: Node[]): Fold[] {
  return folds.map((f) =>
    f.id === id && f.toc
      ? { ...f, children: rows }
      : { ...f, children: f.children.map((c) => (c.type === "fold" ? withTocRows([c], id, rows)[0] : c)) },
  );
}

// ---------------------------------------------------------------- search over titles and metadata

/** Works whose title, author, publisher, year, or synopsis holds the folded query. The order of `works` stays. */
export function matchWorks(works: DashWork[], foldedQuery: string): DashWork[] {
  if (!foldedQuery) return [];
  return works.filter((w) => foldText([w.titleEn, w.titleJa, w.author, w.publisher, w.year, w.webDate, w.synopsis].join(" ")).includes(foldedQuery));
}
