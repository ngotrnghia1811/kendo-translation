// VW109 (round 95, card P44.1): server-free tests of the real book names on the human translation view `/translate`.
// Owner words (Q-A 3:72.2): "Use the real name of the book, not the file name". Owner pick (Q-A 3:73.2) "English, Japanese below".
// Owner pick (Q-A 3:73.3) "Accept all rows": row 1 (files mode: a web article matches its data row by the first 8 characters of item_id),
// row 3 (an item with no title shows the file name).
// Run: node scripts/vw109-test.mjs (from the app folder, TMPDIR set). The last line is "<n> passed, <m> failed".
// Made-up data only: made-up slugs and titles, a made-up data folder below TMPDIR, a stub for fetch (no network, no PocketBase).
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, htmlText, installAppHooks, jl, madeUpRoot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
const realFetch = globalThis.fetch;
let fetchLog = [];
let stubFetch = async () => {
  throw new Error("Network is disabled in the VW109 tests.");
};
globalThis.fetch = async (url, init) => {
  fetchLog.push(String(url));
  return stubFetch(String(url), init);
};
let fallbackTmp = null;
if (!process.env.TMPDIR) {
  fallbackTmp = path.join(app, "node_modules", ".vw109-tmp");
  await fs.mkdir(fallbackTmp, { recursive: true });
  process.env.TMPDIR = fallbackTmp;
}
installAppHooks(app);
const { check, done } = checker();

const T = await import("../lib/htv-titles.ts");
const B = await import("../lib/htv-books.ts");
const React = createRequire(path.join(app, "package.json"))("react");
const { renderToStaticMarkup } = createRequire(path.join(app, "package.json"))("react-dom/server");
const { default: HtvList } = await import("../components/HtvList.tsx");
const { PaneSettingsProvider } = await import("../components/PaneSettings.tsx");

const ZW = "\u200b"; // zero-width space, as in some real titles
// Made-up items. The long IDs are made up and do not exist in the real data.
const ART_ID = "c0ffee08-1111-4222-8333-444455556666";
const ART2_ID = "c0ffee09-1111-4222-8333-444455556666";
const ART_NOJA_ID = "c0ffee0a-1111-4222-8333-444455556666";
const ART_NONE_ID = "c0ffee0b-1111-4222-8333-444455556666";
const ART_DEAD_ID = "deadbe0c-1111-4222-8333-444455556666"; // no run: stays out of the list
const ART_JAONLY_ID = "c0ffee0d-1111-4222-8333-444455556666";
const META = [
  { item_id: "made_book_one", kind: "book", pages: 12, title_en: "Made-up Book One", title_ja: "架空の本その一" },
  { item_id: "made_book_two", kind: "book", pages: 5, title_en: "Made-up Book Two", title_ja: "" },
  { item_id: "made_book_none", kind: "book", pages: 3, title_en: "", title_ja: "" },
  { item_id: "made_mag_2010", kind: "magazine-year", pages: 40, title_en: "Made-up Magazine 2010", title_ja: "架空の雑誌二千十" },
  { item_id: "made_mag_2011", kind: "magazine-year", pages: 41, title_en: "Made-up Magazine 2011", title_ja: "架空の雑誌二千十一" },
  { item_id: ART_ID, kind: "web-article", pages: 0, title_en: "Made-up Article Eight", title_ja: `活きた${ZW}構え（${ZW}${ZW}架空）` },
  { item_id: ART2_ID, kind: "web-article", pages: 0, title_en: "Made-up Article Nine", title_ja: "架空の記事九" },
  { item_id: ART_NOJA_ID, kind: "web-article", pages: 0, title_en: "Made-up Article Ten", title_ja: "" },
  { item_id: ART_NONE_ID, kind: "web-article", pages: 0, title_en: "", title_ja: "" },
  { item_id: ART_DEAD_ID, kind: "web-article", pages: 0, title_en: "Made-up Article Without Run", title_ja: "架空の記事走なし" },
  { item_id: ART_JAONLY_ID, kind: "web-article", pages: 0, title_en: "", title_ja: "日本語だけの記事" },
  // A long ID that is no web article and no book folder: stays out.
  { item_id: "ffff0000-1111-4222-8333-444455556666", kind: "web-capture", pages: 0, title_en: "Made-up Capture", title_ja: "" },
];
const BOOKS = [
  { slug: "made_book_one", pages: 12 },
  { slug: "made_book_two", pages: 5 },
  { slug: "made_book_none", pages: 3 },
  { slug: "made_mag_2010", pages: 40 },
  { slug: "made_mag_2011", pages: 41 },
];

// ---------------------------------------------------------------- pure rules

await check("cleanTitle removes zero-width characters and outer spaces, and gives '' for a value that is no text", () => {
  assert.equal(T.cleanTitle(`  a${ZW}b\u200d\ufeffc  `), "abc");
  assert.equal(T.cleanTitle(null), "");
  assert.equal(T.cleanTitle(undefined), "");
  assert.equal(T.cleanTitle(42), "");
  assert.equal(T.cleanTitle("活きた構え"), "活きた構え");
});

await check("shortId takes the first 8 characters, the rule of the page IDs (Q-A 3:73.3 row 1)", () => {
  assert.equal(T.shortId("c0ffee0e-4a75-404c-92a6-ab31383456b6"), "c0ffee0e");
  assert.equal(T.shortId("abc"), "abc");
  assert.equal(T.SHORT_ID_LENGTH, 8);
});

await check("bookNames: English main, Japanese below, file name on hover", () => {
  assert.deepEqual(T.bookNames("100_made", "One Hundred", "百回稽古"), { main: "One Hundred", mainLang: "", sub: "百回稽古", hover: "100_made" });
});

await check("bookNames: English only gives no Japanese line", () => {
  assert.deepEqual(T.bookNames("made_book_two", "Made-up Book Two", ""), { main: "Made-up Book Two", mainLang: "", sub: "", hover: "made_book_two" });
});

await check("bookNames: Japanese only makes the Japanese title the main text, marked lang ja", () => {
  assert.deepEqual(T.bookNames("c0ffee0d", "", "日本語だけの記事"), { main: "日本語だけの記事", mainLang: "ja", sub: "", hover: "c0ffee0d" });
});

await check("bookNames: no title shows the file name and no hover text (row 3)", () => {
  assert.deepEqual(T.bookNames("c0ffee0b", "", ""), { main: "c0ffee0b", mainLang: "", sub: "", hover: "" });
  assert.deepEqual(T.bookNames("c0ffee0b", "  ", `${ZW}`), { main: "c0ffee0b", mainLang: "", sub: "", hover: "" });
});

await check("bookNames: the same text in both languages shows once", () => {
  assert.equal(T.bookNames("x", "Same", "Same").sub, "");
});

await check("filesBookFacts: a book gets both titles and its page count", () => {
  const m = T.filesBookFacts(META, BOOKS);
  assert.deepEqual(m.get("made_book_one"), { title: "Made-up Book One", titleEn: "Made-up Book One", titleJa: "架空の本その一", pages: 12 });
  assert.deepEqual(m.get("made_book_two"), { title: "Made-up Book Two", titleEn: "Made-up Book Two", titleJa: "", pages: 5 });
  assert.deepEqual(m.get("made_book_none"), { title: "", titleEn: "", titleJa: "", pages: 3 });
});

await check("filesBookFacts: a web article matches by the first 8 characters of item_id, with kind web-article and pages 0 (row 1)", () => {
  const m = T.filesBookFacts(META, BOOKS);
  const a = m.get("c0ffee08");
  assert.ok(a, "the key c0ffee08 exists");
  assert.equal(a.titleEn, "Made-up Article Eight");
  assert.equal(a.kind, "web-article");
  assert.equal(a.pages, 0);
  assert.equal(m.has(ART_ID), false, "the long ID is not a key");
  assert.equal(m.get("c0ffee09").titleJa, "架空の記事九");
});

await check("filesBookFacts: zero-width characters leave the Japanese title", () => {
  assert.equal(T.filesBookFacts(META, BOOKS).get("c0ffee08").titleJa, "活きた構え（架空）");
});

await check("filesBookFacts: two different items with the same 8 characters get no title, the rule of articleNames (VW94)", () => {
  const meta = [...META, { item_id: "c0ffee08-9999-4999-8999-999999999999", kind: "web-article", pages: 0, title_en: "Second Made-up Article", title_ja: "二番目" }];
  const a = T.filesBookFacts(meta, BOOKS).get("c0ffee08");
  assert.deepEqual(a, { title: "", titleEn: "", titleJa: "", pages: 0, kind: "web-article" });
  assert.equal(T.filesBookFacts(meta, BOOKS).get("c0ffee09").titleEn, "Made-up Article Nine", "other items stay the same");
});

await check("filesBookFacts: the same item ID twice is one item and keeps its title", () => {
  const meta = [...META, { ...META[5] }];
  assert.equal(T.filesBookFacts(meta, BOOKS).get("c0ffee08").titleEn, "Made-up Article Eight");
});

await check("filesBookFacts: a magazine year with a long name does not shorten to 8 characters, and a web capture with a long ID stays out", () => {
  const m = T.filesBookFacts(META, BOOKS);
  assert.ok(m.has("made_mag_2010") && m.has("made_mag_2011"));
  assert.equal(m.has("made_mag"), false);
  assert.equal(m.has("ffff0000"), false);
  assert.equal(m.size, BOOKS.length + 6, "5 book folders and 6 web articles with distinct short IDs");
});

await check("filesBookFacts: a web article whose ID has 8 characters keeps that ID", () => {
  const m = T.filesBookFacts([{ item_id: "abcd1234", kind: "web-article", title_en: "Short ID", title_ja: "短い" }], []);
  assert.equal(m.get("abcd1234").titleEn, "Short ID");
});

await check("filesBookFacts: a row with no item_id is skipped and a bad title gives ''", () => {
  const m = T.filesBookFacts([{ kind: "web-article", title_en: "x" }, { item_id: "abcd1234-0000", kind: "web-article", title_en: 5, title_ja: null }], []);
  assert.equal(m.size, 1);
  assert.equal(m.get("abcd1234").title, "");
});

// ---------------------------------------------------------------- the list in files mode, end to end with made-up files

const { root, w } = await madeUpRoot("vw109-");
const rootData = path.join(root, "data");
await w("data/item-metadata/items.filled.jsonl", jl(META));
await w("data/pilot-sample/book-slugs.json", { books: BOOKS });
const RUN = "20261101T120000Z";
async function finishedPage(slug, page, verdict = "PASS") {
  const dir = `data/pilot-run/${slug}_${page}/${RUN}`;
  await w(`${dir}/summary.json`, { status: "done", qa: { QA_3: { verdict, page_score: 0.9 } } });
  await w(`${dir}/run.json`, { started_utc: "2026-11-01T12:00:00Z" });
  await w(`${dir}/results/TS_3.json`, {});
  await w(`${dir}/results/ED_3.json`, {});
}
await finishedPage("made_book_one", "p001");
await finishedPage("c0ffee08", "p001");
await finishedPage("c0ffee08", "p002", "FAIL");
await finishedPage("c0ffee09", "p001");
await finishedPage("c0ffee0a", "p001");
await finishedPage("c0ffee0b", "p001");
await finishedPage("c0ffee0d", "p001");
await finishedPage("zzzzzz99", "p001"); // an article with a run and no data row

const configFile = path.join(root, "files-mode.config.json");
await fs.writeFile(configFile, JSON.stringify({ translatorDataDir: rootData, runSource: "files" }));

async function withEnv(vars, fn) {
  const old = {};
  for (const [k, v] of Object.entries(vars)) {
    old[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(old)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}
const filesEnv = { VIEWER_CONFIG: configFile, VIEWER_RUN_SOURCE: undefined, VIEWER_POCKETBASE_URL: undefined };

let filesRows = [];
await check("files mode: listBookRows lists the 5 book folders and the articles with a run, each with both titles", async () => {
  filesRows = await withEnv(filesEnv, () => B.listBookRows(new Map(), "made-up-token"));
  const slugs = filesRows.map((r) => r.slug);
  assert.deepEqual(slugs, ["c0ffee08", "c0ffee09", "c0ffee0a", "c0ffee0b", "c0ffee0d", "made_book_none", "made_book_one", "made_book_two", "made_mag_2010", "made_mag_2011", "zzzzzz99"].sort());
  const by = Object.fromEntries(filesRows.map((r) => [r.slug, r]));
  assert.equal(by.c0ffee08.titleEn, "Made-up Article Eight");
  assert.equal(by.c0ffee08.titleJa, "活きた構え（架空）");
  assert.equal(by.c0ffee08.title, "Made-up Article Eight");
  assert.equal(by.c0ffee08.tagged, 2);
  assert.equal(by.c0ffee08.pages, 2, "a web article has pages 0, so the count comes from the tagged pages");
  assert.equal(by.made_book_one.titleJa, "架空の本その一");
  assert.equal(by.made_book_one.pages, 12);
  assert.equal(by.c0ffee0b.title, "");
  assert.equal(by.zzzzzz99.title, "");
});

await check("files mode: an article without a run stays out of the list (deadbe0c is not listed)", () => {
  assert.equal(filesRows.some((r) => r.slug === "deadbe0c"), false);
  assert.equal(filesRows.length, 11);
});

await check("files mode: the index of one article holds both titles, an article without a run gives null", async () => {
  const idx = await withEnv(filesEnv, () => B.loadBookIndex("c0ffee09", new Map(), "made-up-token"));
  assert.ok(idx);
  assert.equal(idx.titleEn, "Made-up Article Nine");
  assert.equal(idx.titleJa, "架空の記事九");
  assert.equal(idx.title, "Made-up Article Nine");
  assert.equal(await withEnv(filesEnv, () => B.loadBookIndex("deadbe0c", new Map(), "made-up-token")), null);
  const book = await withEnv(filesEnv, () => B.loadBookIndex("made_book_two", new Map(), "made-up-token"));
  assert.equal(book.titleEn, "Made-up Book Two");
  assert.equal(book.titleJa, "");
});

await check("files mode: no call to the network", () => {
  assert.equal(fetchLog.length, 0);
});

// ---------------------------------------------------------------- the list in pocketbase mode, with a stub of fetch

const CATALOG = [
  { item_id: "made_book_one", kind: "book", pages: 12, title_en: "Made-up Book One", title_ja: "架空の本その一" },
  { item_id: "c0ffee08", kind: "web-article", pages: 0, title_en: "Made-up Article Eight", title_ja: `活きた${ZW}構え（架空）` },
  { item_id: "c0ffee0b", kind: "web-article", pages: 0, title_en: "", title_ja: "" },
  { item_id: "deadbe0c", kind: "web-article", pages: 0, title_en: "Made-up Article Without Run", title_ja: "架空の記事走なし" },
];
const PAGE_RUNS = [
  { page_id: "made_book_one/p001", run_id: RUN, verdict: "PASS", qa3_page_score: 0.9, started_utc: "2026-11-01T12:00:00Z", status: "done" },
  { page_id: "c0ffee08/p001", run_id: RUN, verdict: "PASS", qa3_page_score: 0.9, started_utc: "2026-11-01T12:00:00Z", status: "done" },
  { page_id: "c0ffee0b/p001", run_id: RUN, verdict: "FAIL", qa3_page_score: 0.4, started_utc: "2026-11-01T12:00:00Z", status: "done" },
];
const PB_URL = "http://localhost:18092";
const pbEnv = { VIEWER_CONFIG: path.join(root, "no-config.json"), VIEWER_RUN_SOURCE: "pocketbase", VIEWER_POCKETBASE_URL: PB_URL };
function pbList(items) {
  return new Response(JSON.stringify({ page: 1, perPage: 500, totalPages: 1, totalItems: items.length, items }), { status: 200, headers: { "Content-Type": "application/json" } });
}
stubFetch = async (url) => {
  const u = new URL(url);
  assert.equal(u.origin, PB_URL, "only the made-up PocketBase address is called");
  const f = u.searchParams.get("filter") ?? "";
  if (u.pathname === "/api/collections/catalog_items/records") {
    const m = /item_id="([^"]+)"/.exec(f);
    return pbList(m ? CATALOG.filter((r) => r.item_id === m[1]) : CATALOG);
  }
  if (u.pathname === "/api/collections/page_runs/records") {
    const m = /page_id="([^"]+)"/.exec(f);
    return pbList(m ? PAGE_RUNS.filter((r) => r.page_id === m[1]) : PAGE_RUNS);
  }
  if (u.pathname === "/api/collections/magazine_chapters/records") return pbList([]);
  throw new Error("Unexpected path " + u.pathname);
};
fetchLog = [];

let pbRows = [];
await check("pocketbase mode: listBookRows gives both titles, and the article without a run stays out", async () => {
  pbRows = await withEnv(pbEnv, () => B.listBookRows(new Map(), "made-up-token"));
  assert.deepEqual(pbRows.map((r) => r.slug), ["c0ffee08", "c0ffee0b", "made_book_one"]);
  const by = Object.fromEntries(pbRows.map((r) => [r.slug, r]));
  assert.equal(by.c0ffee08.titleEn, "Made-up Article Eight");
  assert.equal(by.c0ffee08.titleJa, "活きた構え（架空）");
  assert.equal(by.c0ffee08.title, "Made-up Article Eight");
  assert.equal(by.made_book_one.titleJa, "架空の本その一");
  assert.equal(by.c0ffee0b.title, "");
  assert.ok(fetchLog.length > 0, "the stub was called");
});

await check("pocketbase mode: loadBookIndex holds both titles", async () => {
  const idx = await withEnv(pbEnv, () => B.loadBookIndex("made_book_one", new Map(), "made-up-token"));
  assert.ok(idx);
  assert.equal(idx.titleEn, "Made-up Book One");
  assert.equal(idx.titleJa, "架空の本その一");
});

await check("both modes give the same fields for the same item (made-up item c0ffee08)", () => {
  const a = filesRows.find((r) => r.slug === "c0ffee08");
  const b = pbRows.find((r) => r.slug === "c0ffee08");
  // Unit VW112: taggedPages (the page numbers behind `tagged`) differs by mode for the same reason as `tagged`, so it is left out of the compare too.
  assert.deepEqual({ ...a, tagged: 0, pages: 0, taggedPages: [] }, { ...b, tagged: 0, pages: 0, taggedPages: [] });
});

// ---------------------------------------------------------------- markup of the list

const html = renderToStaticMarkup(
  React.createElement(PaneSettingsProvider, { initial: { v: 1, panes: {} }, theme: "light" }, React.createElement(HtvList, { rows: filesRows })),
);
const rowHtml = (slug) => {
  const m = new RegExp(`<tr[^>]*data-book="${slug}"[^>]*>[\\s\\S]*?</tr>`).exec(html);
  assert.ok(m, "row for " + slug);
  return m[0];
};

await check("list markup: the header has Book, Pages and Pages with an agent translation, and no Name column", () => {
  const head = /<thead[\s\S]*?<\/thead>/.exec(html)[0];
  const ths = [...head.matchAll(/<th(?=[\s>])[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1]);
  assert.deepEqual(ths, ["Book", "Pages", "Pages with an agent translation"]);
  assert.equal(/>Name</.test(html), false);
  assert.equal(rowHtml("c0ffee08").match(/<td/g).length, 3);
});

await check("list markup: the English title is the link and carries the file name as hover text", () => {
  const r = rowHtml("c0ffee08");
  const link = /<a [^>]*>[\s\S]*?<\/a>/.exec(r)[0];
  assert.match(link, /href="\/translate\/c0ffee08"/);
  assert.match(link, /title="c0ffee08"/);
  assert.match(link, /data-book-title/);
  assert.match(link, />Made-up Article Eight</);
  assert.equal(/lang=/.test(link), false, "an English link has no lang attribute");
});

await check("list markup: the Japanese title is small gray text below the link, lang ja, with the text-xs and text-muted classes", () => {
  const r = rowHtml("c0ffee08");
  const m = /<div class="([^"]*)" lang="ja" data-book-title-ja(?:="[^"]*")?>([\s\S]*?)<\/div>/.exec(r);
  assert.ok(m, "the Japanese line exists");
  assert.match(m[1], /text-xs/);
  assert.match(m[1], /text-muted/);
  assert.equal(m[2], "活きた構え（架空）");
  assert.ok(r.indexOf("</a>") < r.indexOf("data-book-title-ja"), "the Japanese line comes after the link");
});

await check("list markup: the file name shows only in the hover text, not as visible text of the row", () => {
  for (const slug of ["c0ffee08", "made_book_one", "made_book_two", "made_mag_2010"]) {
    assert.equal(htmlText(rowHtml(slug)).includes(slug), false, slug + " is visible text");
    assert.match(rowHtml(slug), new RegExp(`title="${slug}"`));
  }
});

await check("list markup: a book with no Japanese title has no Japanese line", () => {
  assert.equal(rowHtml("made_book_two").includes("data-book-title-ja"), false);
});

await check("list markup: an item with no title shows the file name as the link, with no hover text (row 3)", () => {
  const r = rowHtml("c0ffee0b");
  const link = /<a [^>]*>[\s\S]*?<\/a>/.exec(r)[0];
  assert.match(link, />c0ffee0b</);
  assert.equal(/\stitle=/.test(link), false);
  assert.equal(r.includes("data-book-title-ja"), false);
});

await check("list markup: an item with only a Japanese title shows it as the link, lang ja", () => {
  const link = /<a [^>]*>[\s\S]*?<\/a>/.exec(rowHtml("c0ffee0d"))[0];
  assert.match(link, /lang="ja"/);
  assert.match(link, />日本語だけの記事</);
  assert.match(link, /title="c0ffee0d"/);
});

await check("list markup: data-book, data-pages and data-tagged stay, and the break-all stopgap of VW108 is gone", () => {
  assert.match(rowHtml("c0ffee08"), /data-book="c0ffee08" data-pages="2" data-tagged="2"/);
  assert.equal(html.includes("break-all"), false);
  assert.equal(html.includes("font-mono"), false);
});

await check("list markup: the summary line counts the books and the pages", () => {
  assert.match(htmlText(html), /11 books\. 8 pages have an agent translation\./);
});

// ---------------------------------------------------------------- the book screen header (source rule)

await check("book screen: the header code uses bookNames, shows no visible file name, and keeps the file name as hover text", async () => {
  const src = await fs.readFile(path.join(app, "components/HtvBook.tsx"), "utf8");
  assert.match(src, /const names = bookNames\(slug, index\.titleEn, index\.titleJa\);/);
  assert.match(src, /<h1 [^>]*title=\{names\.hover \|\| undefined\}[^>]*data-book-name>/);
  assert.match(src, /data-book-name-ja>/);
  assert.equal(/\{index\.title \|\| slug\}/.test(src), false, "the old header text is gone");
  assert.equal(/ml-3 font-mono text-sm font-normal text-muted">\{slug\}/.test(src), false, "the visible slug is gone");
});

await fs.rm(root, { recursive: true, force: true });
if (fallbackTmp) await fs.rm(fallbackTmp, { recursive: true, force: true });
globalThis.fetch = realFetch;
done();
