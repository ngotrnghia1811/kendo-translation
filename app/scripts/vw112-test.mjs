// VW112 (round 98, card P47.1): server-free tests of the fold tree of the human translation view /translate.
// Owner words (Q-A 3:76.5 note): "The /translate should have the same dashboard view as /read".
// Owner pick (Q-A 3:78.4) "Rows 1-7 as written", with the note: "Also so the metadata of the books in the dashboard (for /translate, also show the
// monitor metadata)" and "When use open a fold, change its bg color to highlight it. Apply this to every relevant user interactions also".
//   row 1  the fold tree of /read: the same order, the first level open, the deeper levels closed
//   row 2  a work row: the English title links to /translate/<book>, the Japanese title below, the pages, "Agent translation: n of m pages"
//   row 3  each fold line counts the pages with an agent translation
//   row 4  a search box; a hit opens /translate/<book>
//   row 5  hidden like /read: men0, men1, mental2_clean and the web captures; the direct address still opens
//   row 6  the Monitor dashboard / uses the shared title lookup (8-character rule)
//   note   the metadata line, the Monitor facts (files mode only), the highlight of an open fold
// Run: node scripts/vw112-test.mjs (from the app folder, TMPDIR set). The last line is "<n> passed, <m> failed".
// Made-up data only: made-up slugs and titles, a made-up data folder below TMPDIR, a stub for fetch (no network, no real PocketBase).
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, htmlText, installAppHooks, jl, madeUpRoot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
// The made-up PocketBase at 127.0.0.1:8092 (PocketBase mode). Each collection answers from `collections`, a missing one answers an empty list.
const collections = {};
const asked = new Set();
globalThis.fetch = async (url) => {
  const u = String(url);
  const m = u.match(/^http:\/\/127\.0\.0\.1:8092\/api\/collections\/([a-z_]+)\/records/);
  if (m) {
    asked.add(m[1]);
    // The ToC rows of one book (lib/pb.ts bookTocRecords) ask with the filter book="<slug>".
    const book = /book\s*=\s*["']([^"']+)["']/.exec(new URL(u).searchParams.get("filter") ?? "")?.[1];
    const items = (collections[m[1]] ?? []).filter((r) => !book || r.book === book);
    return Response.json({ items, page: 1, totalPages: 1, totalItems: items.length });
  }
  throw new Error("Network is disabled in the VW112 tests: " + u);
};
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/translate");
const { check, done } = checker();

const D = await import("../lib/translate-dash.ts");
const L = await import("../lib/translate-dash-load.ts");
const F = await import("../lib/reader-folds.ts");
const BS = await import("../lib/book-status.ts");
const HB = await import("../lib/htv-books.ts");
const req = createRequire(path.join(app, "package.json"));
const React = req("react");
const { renderToStaticMarkup } = req("react-dom/server");
const { default: ReaderList } = await import("../components/ReaderList.tsx");
const { default: TranslateSearch } = await import("../components/TranslateSearch.tsx");
const h = React.createElement;

const ZW = "\u200b";
const ART = "aaaa1111-1111-4222-8333-444455556666";
const ART_NO_RUN = "bbbb2222-1111-4222-8333-444455556666";
const DUPE1 = "dddd0001-1111-4222-8333-444455556666";
const DUPE2 = "dddd0001-9999-4999-8999-999999999999";
const META = [
  { item_id: "made_toc_book", kind: "book", title_en: "Made-up ToC Book", title_ja: "架空の目次本", author_en: "Toc Author", publish_year: "1999" },
  { item_id: "made_book_one", kind: "book", title_en: "Made-up Book One", title_ja: "架空の本その一", author_en: "Made Author", publisher: "Made Press", publish_year: "2001" },
  { item_id: "made_men_full", kind: "book", title_en: "Made-up Men Book", title_ja: "架空の面" },
  { item_id: "men0", kind: "book", title_en: "Made-up Men Part 0", title_ja: "架空の面 上", part_of: "made_men_full" },
  { item_id: "men1", kind: "book", title_en: "Made-up Men Part 1", title_ja: "架空の面 下", part_of: "made_men_full" },
  { item_id: "mental2_clean", kind: "book", title_en: "Made-up Mental Copy", title_ja: "架空の心" },
  { item_id: "made_capture", kind: "web-capture", title_en: "Made-up Web Capture", title_ja: "架空の取り込み" },
  { item_id: "same_a", kind: "book", title_en: "Same Title", title_ja: "同じ題" },
  { item_id: "same_b", kind: "book", title_en: "Same Title", title_ja: "同じ題" },
  { item_id: "kendojidai_2014", kind: "magazine-year", title_en: "Kendo Jidai 2014", title_ja: "剣道時代 2014", publish_year: "2014" },
  { item_id: ART, kind: "web-article", title_en: `Made-up Article${ZW}`, title_ja: "架空の記事", author_ja: "架空 著者", publish_date_text: "2019-10-21" },
  { item_id: ART_NO_RUN, kind: "web-article", title_en: "Made-up Article With No Run", title_ja: "", publish_date_text: "2020-01-02" },
  { item_id: DUPE1, kind: "web-article", title_en: "Dupe One", title_ja: "" },
  { item_id: DUPE2, kind: "web-article", title_en: "Dupe Two", title_ja: "" },
];
/** The metadata row of one item_id (the tests name rows by ID, not by index). */
const meta = (id) => META.find((r) => r.item_id === id);
const BOOKS = [
  ["made_toc_book", 30],
  ["made_book_one", 12],
  ["made_men_full", 20],
  ["men0", 10],
  ["men1", 10],
  ["mental2_clean", 8],
  ["made_capture", 5],
  ["same_a", 3],
  ["same_b", 4],
  ["kendojidai_2014", 40],
].map(([slug, pages]) => ({ slug, pages }));
const CHAPTERS = [{ book: "kendojidai_2014", year: 2014, month: 10, chapter: "2014-10", chapter_title_en: "October", page_start: 1, page_end: 20, articles: [{ order: 1, title_ja: "架空の稽古", title_en: "Made-up Practice*", page_start: 2, page_end: 4 }] }];

// Fix round (Q-A 3:80.3): the table of contents rows of item-metadata/book-toc.jsonl. made_toc_book has 3 chapter rows and 1 sub-row.
// The second row with order 1 is dropped (rule of sync command S2). mental2_clean has rows too, but it is hidden, so it gets no fold.
const TOC = [
  { book: "made_toc_book", order: 1, level: 1, title_ja: "第一章", title_en: "*Chapter* One", page_ref: "1", pdf_page: 3, page_id: "made_toc_book/p003", status: "checked" },
  { book: "made_toc_book", order: 1, level: 1, title_ja: "重複", title_en: "Duplicate", page_ref: "1", pdf_page: 3, page_id: "made_toc_book/p003" },
  { book: "made_toc_book", order: 2, level: 2, title_ja: "第一節", title_en: "Section One", page_ref: "2", pdf_page: 4, page_id: "made_toc_book/p004" },
  { book: "made_toc_book", order: 3, level: 1, title_ja: "第二章", title_en: "Chapter Two", page_ref: "8", pdf_page: 10, page_id: "made_toc_book/p010" },
  { book: "made_toc_book", order: 4, level: 1, title_ja: "あとがき", title_en: "", page_ref: null, pdf_page: null, page_id: null },
  { book: "mental2_clean", order: 1, level: 1, title_ja: "写しの章", title_en: "Copy Chapter", page_ref: "1", pdf_page: 2, page_id: "mental2_clean/p002" },
];
const { root, w } = await madeUpRoot("vw112-");
const data = path.join(root, "data");
await w("data/item-metadata/items.filled.jsonl", jl(META));
await w("data/item-metadata/magazine-chapters.jsonl", jl(CHAPTERS));
await w("data/item-metadata/book-toc.jsonl", jl(TOC));
await w("data/pilot-sample/book-slugs.json", { books: BOOKS });
const RUN = "20261101T120000Z";
async function finishedPage(slug, pg) {
  const dir = `data/pilot-run/${slug}_${pg}/${RUN}`;
  await w(`${dir}/summary.json`, { status: "done", qa: { QA_3: { verdict: "PASS", page_score: 0.9 } } });
  await w(`${dir}/run.json`, { started_utc: "2026-11-01T12:00:00Z" });
  await w(`${dir}/results/TS_3.json`, {});
  await w(`${dir}/results/ED_3.json`, {});
}
await finishedPage("made_book_one", "p001");
await finishedPage("made_toc_book", "p005");
await finishedPage("made_toc_book", "p012");
await finishedPage("men0", "p002");
await finishedPage("kendojidai_2014", "p003");
await finishedPage("aaaa1111", "p001");
// One old list, so the Monitor dashboard has a row for the web article aaaa1111 and for the dupe prefix dddd0001.
const pageRow = (page_id, state) => ({ page_id, kind: "web", state, status: null, folder: null, calls_total: 24, calls_done: 0, calls_skipped: 0, calls_failed: 0, running: [], filter_blocks: 0, alt_tries: 0, flagged: [], seconds_sum: 0, calls_timed: 0, started_epoch: null, ended_epoch: null, tokens: { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 } });
const OLD = "20261026T182511Z";
await w(`data/pilot-run/lists/${OLD}/progress.json`, {
  list: "made-up list", list_dir: `data/pilot-run/lists/${OLD}`, levels: "0-3", jobs: 1, page_jobs: 1, started_utc: OLD, max_usd: null, schema: "progress-v1", state: "completed",
  started_epoch: Date.UTC(2026, 9, 26) / 1000, updated_epoch: Date.UTC(2026, 9, 26, 5) / 1000, calls_total: 48, calls_done: 0, calls_failed: 0, calls_flagged: 0, pages_total: 2, pages_done: 0,
  pages: [pageRow("aaaa1111/p001", "done"), pageRow("dddd0001/p001", "done")],
});
const filesCfg = path.join(root, "files.config.json");
await fs.writeFile(filesCfg, JSON.stringify({ translatorDataDir: data, runSource: "files", monitor: true }));
const pbCfg = path.join(root, "pb.config.json");
await fs.writeFile(pbCfg, JSON.stringify({ translatorDataDir: data, runSource: "pocketbase", pocketbaseUrl: "http://127.0.0.1:8092" }));
async function withEnv(cfg, fn) {
  const old = { VIEWER_CONFIG: process.env.VIEWER_CONFIG, VIEWER_RUN_SOURCE: process.env.VIEWER_RUN_SOURCE };
  process.env.VIEWER_CONFIG = cfg;
  delete process.env.VIEWER_RUN_SOURCE;
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(old)) if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}
const inFiles = (fn) => withEnv(filesCfg, fn);
const inPb = (fn) => withEnv(pbCfg, fn);
const marks = new Map();
const files = await inFiles(() => L.loadTranslateDashboard("", marks, ""));
const draw = (dash, openId = "") => renderToStaticMarkup(h(ReaderList, { dash: { ...dash, folds: F.lazyMonths(dash.folds, openId) }, approved: true, openId, to: "translate" }));
const html = draw(files.dash);
/** The HTML of the <li> of one work row. */
function rowHtml(src, slug) {
  const at = src.indexOf(`data-book="${slug}"`);
  assert.ok(at >= 0, `no row ${slug}`);
  return src.slice(at, src.indexOf("</li>", at));
}

// ---------------------------------------------------------------- pure rules

await check("words: the agent translation line of a work and of a fold", () => {
  assert.equal(D.agentLine(6, 120), "Agent translation: 6 of 120 pages");
  assert.equal(D.agentLine(0, 1), "Agent translation: 0 of 1 page");
  assert.equal(D.agentFoldLine(20, 4821), "Agent translation: 20 of 4,821 pages");
});
await check("links: a work opens /translate/<book>, an article opens its first page with ?at= and the anchor", () => {
  assert.equal(D.translateHref("made book"), "/translate/made%20book");
  assert.equal(D.translatePageHref("kendojidai_2014", 2, 3), "/translate/kendojidai_2014?at=p002#p002");
});
await check("metadata line: author · publisher · year · pages for a book, and the web date for a web article", () => {
  const book = D.workOfMeta("made_book_one", meta("made_book_one"), 12, []);
  assert.equal(D.metadataLine(book, 12), "Made Author · Made Press · 2001 · 12 pages");
  const art = D.workOfMeta("aaaa1111", meta(ART), 1, [1]);
  assert.equal(D.metadataLine(art, 1), "架空 著者 · 2019-10-21 · 1 page");
});
await check("Monitor text: a book row and a phase 2 article", () => {
  assert.equal(D.monitorText({ source: "book", state: "Completed", progress: "3 of 3 pages", line: "Stopped 3 h ago" }), "Monitor dashboard: Completed · 3 of 3 pages · Stopped 3 h ago");
  assert.equal(D.monitorText({ source: "book", state: "Not started", progress: "–", line: "" }), "Monitor dashboard: Not started");
  assert.equal(D.monitorText(D.articleMonitorFacts({ stateText: "Accepted: 4 of 4 pages" })), "Monitor dashboard, phase 2: Accepted: 4 of 4 pages");
});
await check("files mode: the chapters of magazine-chapters.jsonl take the form of PocketBase mode (no '*' in the English article title)", () => {
  const C = D.dashChapters([{ book: "b", year: 2014, month: 0, chapter: "x", chapterTitleEn: "T", pageStart: null, pageEnd: 5, articles: [{ order: null, titleEn: "A*", titleJa: "あ", pageStart: 3, pageEnd: null }] }]);
  assert.deepEqual(C[0], { chapter: "x", book: "b", month: null, year: 2014, titleEn: "T", pageStart: 0, pageEnd: 5, articles: [{ order: 0, titleEn: "A", titleJa: "あ", pageStart: 3, pageEnd: 3 }] });
});

// ---------------------------------------------------------------- row 1: the fold tree

await check("row 1: the first level is Books, then Kendo Jidai, as on /read", () => {
  assert.deepEqual(files.dash.folds.map((f) => f.id), ["books", "kj"]);
  assert.ok(html.indexOf('data-fold="books"') < html.indexOf('data-fold="kj"'));
});
await check("row 1: a first-level fold starts open, a year fold and a month fold start closed", () => {
  assert.match(html, /<details open="" data-fold="books" data-fold-level="1"/);
  assert.match(html, /<details open="" data-fold="kj" data-fold-level="1"/);
  assert.match(html, /<details data-fold="kj-2014" data-fold-level="2"/);
  assert.match(html, /<details data-fold="kj-2014-10" data-fold-level="3" data-lazy-fold/);
});
await check("row 1: the web article sits in the month of its web date (Kendo Jidai 2019, October)", () => {
  const month = F.findFold(files.dash.folds, "kj-2019-10");
  assert.ok(month, "no fold kj-2019-10");
  assert.deepEqual(month.children.filter((n) => n.type === "work").map((n) => n.work.slug), ["aaaa1111"]);
});
await check("row 1: a closed month sends no rows, and its no-script link opens /translate?open=<month>", () => {
  assert.doesNotMatch(html, /data-book="aaaa1111"/);
  assert.match(html, /href="\/translate\?open=kj-2019-10#kj-2019-10"/);
});
await check("row 1: the month in ?open= draws its rows on the server, with the /translate row", () => {
  const open = draw(files.dash, "kj-2019-10");
  assert.match(open, /<details open="" data-fold="kj-2019-10"/);
  assert.match(rowHtml(open, "aaaa1111"), /href="\/translate\/aaaa1111"/);
});
await check("row 1: an article of a magazine month opens /translate/<year>?at=<page> and counts its agent pages", () => {
  const open = draw(files.dash, "kj-2014-10");
  assert.match(open, /href="\/translate\/kendojidai_2014\?at=p002#p002"[^>]*>Made-up Practice</);
  assert.match(htmlText(open), /Agent translation: 1 of 3 pages/);
});
await check("row 1: the Reader dashboard /read draws the same tree with its own links and words (default target)", () => {
  const read = renderToStaticMarkup(h(ReaderList, { dash: { ...files.dash, folds: F.lazyMonths(files.dash.folds, "") }, approved: true, openId: "" }));
  assert.match(read, /data-dash-target="read"/);
  assert.match(read, /href="\/read\/made_book_one"/);
  assert.doesNotMatch(read, /href="\/translate\//);
  assert.doesNotMatch(read, /Agent translation/);
});

// ---------------------------------------------------------------- row 5: hidden folders

for (const slug of ["men0", "men1", "mental2_clean", "made_capture"]) {
  await check(`row 5: ${slug} is hidden from the folds of /translate`, () => {
    assert.equal(files.dash.visible.some((w) => w.slug === slug), false);
    assert.doesNotMatch(html, new RegExp(`data-book="${slug}"`));
  });
}
await check("row 5: the full book made_men_full stays visible", () => assert.match(html, /data-book="made_men_full"/));
await check("row 5: a hidden folder still opens by its direct address (loadBookIndex gives its index)", () =>
  inFiles(async () => {
    for (const slug of ["men0", "mental2_clean"]) assert.ok(await HB.loadBookIndex(slug, marks, ""), slug);
  }),
);
await check("row 5: a hidden folder is not a search hit", () =>
  inFiles(async () => {
    const s = await L.loadTranslateDashboard("", marks, "Made-up Men Part");
    assert.equal(s.search.hits.length, 0);
  }),
);

// ---------------------------------------------------------------- row 3: fold counts

await check("row 3: the Books fold counts the agent pages of its visible works (3 of 69 pages; men0 with its agent page is hidden)", () => {
  const books = files.dash.folds.find((f) => f.id === "books");
  assert.deepEqual([books.counts.translated, books.counts.pages], [3, 30 + 12 + 20 + 3 + 4]);
  assert.match(htmlText(html), /Agent translation: 3 of 69 pages/);
});
await check("row 3: the month fold of the web article counts its agent page", () => {
  const month = F.findFold(files.dash.folds, "kj-2019-10");
  assert.deepEqual([month.counts.translated, month.counts.pages], [1, 1]);
});

// ---------------------------------------------------------------- row 2 and the owner note: a work row

const one = rowHtml(html, "made_book_one");
await check("row 2: the English title is the link to /translate/<book>, with the file name as hover text", () => {
  assert.match(one, /<a title="made_book_one"[^>]*data-book-title="true" href="\/translate\/made_book_one"><span>Made-up Book One<\/span><\/a>/);
});
await check("row 2: the Japanese title shows below in small gray text", () => assert.match(one, /<p lang="ja" class="font-ja text-xs text-muted" data-book-title-ja="true">架空の本その一<\/p>/));
await check("row 2: the agent translation line counts the pages of the work", () => assert.match(one, /data-agent-line="true">Agent translation: 1 of 12 pages</));
await check("owner note: the metadata line shows author, publisher, year, and pages", () => assert.match(one, /data-book-meta="true">Made Author · Made Press · 2001 · 12 pages</));
await check("owner note: files mode shows the Monitor facts of the book", () => {
  assert.match(one, /data-monitor-facts="book">Monitor dashboard: /);
  assert.equal(files.monitorNote, "");
});
await check("row 2: a row with a unique title shows no file name line", () => assert.doesNotMatch(one, /data-book-file/));
await check("Q-A 3:74.3: two rows with equal titles each show the file name in small gray text", () => {
  assert.match(rowHtml(html, "same_a"), /data-book-file="true">same_a</);
  assert.match(rowHtml(html, "same_b"), /data-book-file="true">same_b</);
});

// ---------------------------------------------------------------- fix round: table of contents folds (Q-A 3:80.3)

const TOC_ID = "toc-made_toc_book";
const tocRows = await inFiles(() => L.translateTocRows("", files, TOC_ID));
const tocOpen = draw({ ...files.dash, folds: F.withTocRows(files.dash.folds, TOC_ID, tocRows ?? []) }, TOC_ID);
/** The HTML of one ToC row (its <li>). */
const tocRowHtml = (src, order) => {
  const at = src.indexOf(`data-toc-row="made_toc_book/${order}"`);
  assert.ok(at >= 0, `no ToC row ${order}`);
  return src.slice(at, src.indexOf("</li>", at));
};
await check("ToC: a book with ToC rows is a closed ToC fold on /translate, as on /read", () => {
  const fold = F.findFold(files.dash.folds, TOC_ID);
  assert.ok(fold?.toc, "no ToC fold");
  assert.equal(fold.note, "3 chapters");
  assert.match(html, /<details data-fold="toc-made_toc_book" data-fold-level="2"/);
});
await check("ToC: the fold line counts the agent pages of the book (2 of 30 pages)", () => {
  const at = html.indexOf('data-fold="toc-made_toc_book"');
  assert.match(htmlText(html.slice(at, html.indexOf("</summary>", at))), /3 chapters.*Agent translation: 2 of 30 pages/s);
});
await check("ToC: the head row of the fold is the /translate work row of the book", () => {
  assert.match(rowHtml(html, "made_toc_book"), /href="\/translate\/made_toc_book"/);
  assert.match(rowHtml(html, "made_toc_book"), /data-book-meta="true">Toc Author · 1999 · 30 pages</);
});
await check("ToC: a closed ToC fold sends no rows, and its no-script link opens /translate?open=toc-<book>", () => {
  assert.doesNotMatch(html, /data-toc-row=/);
  assert.match(html, /href="\/translate\?open=toc-made_toc_book#toc-made_toc_book"[^>]*data-show-toc/);
});
await check("ToC: a book without ToC rows stays a plain work row", () => {
  assert.equal(F.findFold(files.dash.folds, "toc-made_book_one"), null);
  assert.doesNotMatch(html, /data-fold="toc-made_book_one"/);
  assert.match(html, /data-book="made_book_one"/);
});
await check("ToC: a hidden book (mental2_clean) gets no ToC fold and no rows, even with rows in the file", () => {
  assert.equal(F.findFold(files.dash.folds, "toc-mental2_clean"), null);
  return inFiles(async () => assert.equal(await L.translateTocRows("", files, "toc-mental2_clean"), null));
});
await check("ToC: files mode keeps the rows of book-toc.jsonl by order, without the second row of order 1", () => {
  assert.deepEqual(tocRows.map((r) => [r.order, r.level, r.title]), [[1, 1, "Chapter One"], [2, 2, "Section One"], [3, 1, "Chapter Two"], [4, 1, "あとがき"]]);
});
await check("ToC: the open fold (?open=toc-<book>) draws its rows on the server, open, so the shared highlight rule applies", () => {
  assert.match(tocOpen, /<details open="" data-fold="toc-made_toc_book"/);
  assert.match(tocOpen, /data-toc-row="made_toc_book\/1"/);
});
await check("ToC: a chapter row opens /translate/<book> at its PDF page (?at= and the anchor)", () =>
  assert.match(tocRowHtml(tocOpen, 1), /<a [^>]*data-toc-link="true" href="\/translate\/made_toc_book\?at=p003#p003"><span>Chapter One<\/span><\/a>/),
);
await check("ToC: a sub-row opens its own page, and a row without a PDF page has no link", () => {
  assert.match(tocRowHtml(tocOpen, 2), /href="\/translate\/made_toc_book\?at=p004#p004"/);
  assert.match(tocRowHtml(tocOpen, 3), /href="\/translate\/made_toc_book\?at=p010#p010"/);
  assert.doesNotMatch(tocRowHtml(tocOpen, 4), /href=/);
});
await check("ToC: a chapter row counts the agent pages of its range (3-9: 1 of 7, 10-30: 1 of 21), a sub-row shows no count", () => {
  assert.match(tocRowHtml(tocOpen, 1), /data-toc-agent="true">Agent translation: 1 of 7 pages</);
  assert.match(tocRowHtml(tocOpen, 3), /data-toc-agent="true">Agent translation: 1 of 21 pages</);
  assert.doesNotMatch(tocRowHtml(tocOpen, 2), /data-toc-agent/);
  assert.doesNotMatch(tocRowHtml(tocOpen, 4), /data-toc-agent/);
});
await check("ToC: /read draws the same ToC rows with its own links and no agent count (default target)", () => {
  const read = renderToStaticMarkup(h(ReaderList, { dash: { ...files.dash, folds: F.lazyMonths(F.withTocRows(files.dash.folds, TOC_ID, tocRows), TOC_ID) }, approved: true, openId: TOC_ID }));
  assert.match(read, /data-toc-row="made_toc_book\/1"/);
  assert.doesNotMatch(read, /href="\/translate\//);
  assert.doesNotMatch(read, /data-toc-agent/);
});
await check("ToC: the route /api/translate/toc guards staff and uses the shared loader", async () => {
  const src = await fs.readFile(path.join(app, "app/api/translate/toc/route.ts"), "utf8");
  assert.match(src, /guard\(req, \{ mutating: false, staff: true \}\)/);
  assert.match(src, /translateTocRows\(/);
});
await check("ToC: the pure chapter range rule (withTocAgent) ends a chapter before the next chapter and at the last page", () => {
  const row = (order, level, pageNo) => ({ type: "toc", book: "b", order, level, title: "t", titleIsJa: false, titleJa: "", pageRef: "", pageNo, digits: 3 });
  const out = D.withTocAgent([row(1, 1, 2), row(2, 2, 3), row(3, 1, 6)], [2, 3, 6, 9], 10);
  assert.deepEqual(out.map((r) => r.agent ?? null), [{ translated: 2, pages: 4 }, null, { translated: 2, pages: 5 }]);
});

// ---------------------------------------------------------------- PocketBase mode

collections.catalog_items = META.filter((r) => r.kind !== "web-article" || r.item_id === ART).map((r) => ({ ...r, item_id: r.kind === "web-article" ? "aaaa1111" : r.item_id, pages: BOOKS.find((b) => b.slug === r.item_id)?.pages ?? 1, row: { part_of: r.part_of ?? "", publish_date_text: r.publish_date_text ?? "" }, translated: { en: [] } }));
collections.book_toc = TOC.filter((r, i) => i !== 1).map((r) => ({ ...r, page_ref: r.page_ref ?? "", pdf_page: r.pdf_page ?? 0, page_id: r.page_id ?? "" }));
const pb = await inPb(() => L.loadTranslateDashboard("made-token", marks, ""));
const pbHtml = draw(pb.dash);
await check("PocketBase mode: the folds come from the collection catalog_items, with the same hidden rule", () => {
  assert.ok(asked.has("catalog_items"), [...asked].join(","));
  assert.equal(pb.mode, "pocketbase");
  assert.match(pbHtml, /data-book="made_book_one"/);
  assert.doesNotMatch(pbHtml, /data-book="men0"/);
});
await check("PocketBase mode: the ToC fold comes from the collection book_toc, and its rows link into /translate/<book>", async () => {
  assert.ok(F.findFold(pb.dash.folds, TOC_ID)?.toc, "no ToC fold");
  assert.equal(pb.tocFile, null);
  const rows = await inPb(() => L.translateTocRows("made-token", pb, TOC_ID));
  assert.ok(asked.has("book_toc"));
  assert.deepEqual(rows.map((r) => r.order), [1, 2, 3, 4]);
  const out = draw({ ...pb.dash, folds: F.withTocRows(pb.dash.folds, TOC_ID, rows) }, TOC_ID);
  assert.match(out, /href="\/translate\/made_toc_book\?at=p003#p003"/);
});
await check("PocketBase mode: no Monitor facts and no error, and the page note says why", () => {
  assert.doesNotMatch(pbHtml, /data-monitor-facts/);
  assert.equal(pb.monitorNote, L.MONITOR_OFF_NOTE);
});

// ---------------------------------------------------------------- row 4: search

await check("row 4: a search finds a work by its title and its hit links to /translate/<book>", async () => {
  const s = await inFiles(() => L.loadTranslateDashboard("", marks, "made-up book one"));
  assert.deepEqual(s.search.hits.map((w) => w.slug), ["made_book_one"]);
  const out = renderToStaticMarkup(h(TranslateSearch, { search: s.search }));
  assert.match(out, /href="\/translate\/made_book_one"/);
  assert.match(htmlText(out), /1 work by title or metadata/);
});
await check("row 4: a search finds a work by its publisher (metadata) and by its Japanese title", async () => {
  const a = await inFiles(() => L.loadTranslateDashboard("", marks, "made press"));
  const b = await inFiles(() => L.loadTranslateDashboard("", marks, "架空の記事"));
  assert.deepEqual(a.search.hits.map((w) => w.slug), ["made_book_one"]);
  assert.deepEqual(b.search.hits.map((w) => w.slug), ["aaaa1111"]);
});
await check("row 4: an empty query gives the folds, not a search", () => assert.equal(files.search, null));

// ---------------------------------------------------------------- row 6: Monitor titles

await check("row 6: the Monitor dashboard row of a web article folder gets the title of its 8-character ID (cleaned of the invisible mark)", () =>
  inFiles(async () => {
    const d = await BS.loadMonitor(Date.parse("2026-11-12T05:10:00Z"));
    const row = d.rows.find((r) => r.slug === "aaaa1111");
    assert.ok(row, d.rows.map((r) => r.slug).join(","));
    assert.equal(row.title, "Made-up Article");
  }),
);
await check("row 6: two web articles that share 8 characters give no guessed title on the Monitor dashboard (the row shows its folder name)", () =>
  inFiles(async () => {
    const d = await BS.loadMonitor(Date.parse("2026-11-12T05:10:00Z"));
    const row = d.rows.find((r) => r.slug === "dddd0001");
    assert.ok(row, d.rows.map((r) => r.slug).join(","));
    assert.ok(!["Dupe One", "Dupe Two"].includes(row.title), row.title);
  }),
);
await check("row 6: a book folder keeps its title by the full item_id", () =>
  inFiles(async () => {
    const d = await BS.loadMonitor(Date.parse("2026-11-12T05:10:00Z"));
    assert.equal(d.rows.find((r) => r.slug === "made_book_one")?.title, "Made-up Book One");
  }),
);

// ---------------------------------------------------------------- owner note: highlight of an open fold

const css = await fs.readFile(path.join(app, "app", "globals.css"), "utf8");
await check("highlight: one shared rule gives an open fold summary and an expanded button the color --open", () => {
  assert.match(css, /:where\(main\) details\[open\] > summary,\s*:where\(main\) button\[aria-expanded="true"\]\s*\{[^}]*background-color: var\(--open\)/);
});
function hex(v) {
  const n = Number.parseInt(v.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
}
const lum = (v) => {
  const [r, g, b] = hex(v);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
/** The variables of each theme block of globals.css: ":root" and each [data-theme="..."]. */
function themes() {
  const out = {};
  for (const m of css.matchAll(/(:root|\[data-theme="([a-z-]+)"\])\s*\{([^}]*)\}/g)) {
    const name = m[2] ?? "light";
    const vars = Object.fromEntries([...m[3].matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((v) => [v[1], v[2]]));
    if (vars.open) out[name] = { ...(out[name] ?? {}), ...vars };
  }
  return out;
}
await check("highlight: all 5 themes define --open", () => assert.equal(Object.keys(themes()).length, 5, Object.keys(themes()).join(",")));
for (const [name, v] of Object.entries(themes())) {
  await check(`highlight: theme ${name} keeps a text contrast of at least 4.5 on --open (foreground, muted, accent)`, () => {
    for (const k of ["foreground", "muted", "accent"]) {
      const fg = v[k] ?? themes().light[k];
      assert.ok(ratio(fg, v.open) >= 4.5, `${k} ${fg} on ${v.open}: ${ratio(fg, v.open).toFixed(2)}`);
    }
  });
}
await check("highlight: the open fold of /translate is a details element with open, so the shared rule applies", () => assert.match(html, /<details open="" data-fold="books"[^>]*><summary/));
// The shared rule sits in @layer components, so a control with its own bg utility needs the utility form (browser check found the cog).
for (const [file, cls] of [["PaneSettings.tsx", "aria-expanded:bg-open"], ["Reasoning.tsx", "aria-expanded:bg-open"], ["ExtrasChecklist.tsx", "group-open:bg-open"]]) {
  await check(`highlight: ${file} has ${cls} over its own bg-white`, async () => assert.ok((await fs.readFile(path.join(app, "components", file), "utf8")).includes(cls)));
}

await fs.rm(root, { recursive: true, force: true });
done();
