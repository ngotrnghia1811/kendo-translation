// VW111 (round 97, card P46.1): server-free tests of the book titles on the staff and admin screens, and of the short titles in the pair chips.
// Owner words (Q-A 3:72.2): "Use the real name of the book, not the file name". Owner words (Q-A 3:17.4): "Annotate the names intuitively and properly ... Apply this for EVERYTHING."
// Owner picks (Q-A 3:76.1) "Places 1-5 and rows a-d" and (Q-A 3:76.2) "Short title in the chip":
//   place 1  Marks card of the TL_3 information panel: the book title in place of the book ID (the ID is the hover text)
//   place 2  /books table "Articles": the title of a web article (the metadata row of its 8-character short ID)
//   place 3  /settings/run: "<book title> runs now at page 12" in place of the book key
//   place 4  /json: "page 12 of the book "<title>" (<folder name>)"
//   place 5  /admin/versions: "<title> · page 12" in the list and in the heading, the page ID as hover text
//   place 6  pair chips and "First used on page" of the panel: the short title (30 characters), "p3", the pair
//   row a    one shared lookup with the 8-character rule (rowsByKey in lib/htv-titles.ts)
//   row c    the path bar of /json keeps the raw folder names
// Run: node scripts/vw111-test.mjs (from the app folder, TMPDIR set). The last line is "<n> passed, <m> failed".
// Made-up data only: made-up slugs and titles, a made-up data folder below TMPDIR, a stub for fetch (no network, no PocketBase).
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, htmlText, installAppHooks, jl, madeUpRoot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
const realFetch = globalThis.fetch;
// The only answer: the list of catalog_items of a made-up PocketBase at 127.0.0.1:8092 (PocketBase mode of bookTitlesOf).
let catalogItems = [];
let catalogFails = false;
globalThis.fetch = async (url) => {
  if (String(url).startsWith("http://127.0.0.1:8092/api/collections/catalog_items/records")) {
    if (catalogFails) return Response.json({ message: "made-up failure" }, { status: 500 });
    return Response.json({ items: catalogItems, totalPages: 1 });
  }
  throw new Error("Network is disabled in the VW111 tests: " + String(url));
};
let fallbackTmp = null;
if (!process.env.TMPDIR) {
  fallbackTmp = path.join(app, "node_modules", ".vw111-tmp");
  await fs.mkdir(fallbackTmp, { recursive: true });
  process.env.TMPDIR = fallbackTmp;
}
installAppHooks(app);
const { check, done } = checker();

const T = await import("../lib/htv-titles.ts");
const C = await import("../lib/htv-panel-cards.ts");
const { parseTl3Message } = await import("../lib/htv-panel.ts");
const BK = await import("../lib/books.ts");
const RL = await import("../lib/run-store-load.ts");
const RN = await import("../lib/readable-names.ts");
const RLD = await import("../lib/readable-load.ts");
const JL = await import("../lib/json-view-lines.ts");
const JLL = await import("../lib/json-view-lines-load.ts");
const BT = await import("../lib/htv-book-titles.ts");
const R = await import("../lib/htv-runs.ts");
const SJ = await import("../lib/settings-json.ts");
const React = createRequire(path.join(app, "package.json"))("react");
const { renderToStaticMarkup } = createRequire(path.join(app, "package.json"))("react-dom/server");
const { default: Tl3Panel } = await import("../components/HtvPanel.tsx");
const { default: BooksView } = await import("../components/BooksView.tsx");
const { default: RunSettingsForm } = await import("../components/RunSettingsForm.tsx");
const { default: AdminVersionPanel } = await import("../components/AdminVersionPanel.tsx");

const ZW = "\u200b";
const OBJ = "\ufffc";
const read = (rel) => fs.readFile(path.join(app, rel), "utf8");
const KAMAE = "How to Create an Ideal Kamae (Koda Kunihide)";
const ART = "f3a6586e-1111-4222-8333-444455556666";
const META = [
  { item_id: "made_book_one", kind: "book", pages: 12, title_en: "Made-up Book One", title_ja: "架空の本その一" },
  { item_id: "made_book_jaonly", kind: "book", pages: 4, title_en: "", title_ja: "日本語だけの本" },
  { item_id: "made_book_none", kind: "book", pages: 3, title_en: "", title_ja: "" },
  { item_id: "100_practice_full", kind: "book", pages: 30, title_en: `Made-up Practice Book${OBJ}`, title_ja: "架空の稽古" },
  { item_id: ART, kind: "web-article", pages: 0, title_en: KAMAE, title_ja: `理想の${ZW}構え`, author_ja: "甲田国秀", publisher: "Made-up Site", confidence: "high" },
  { item_id: "dupe0001-1111-4222-8333-444455556666", kind: "web-article", pages: 0, title_en: "Dupe One", title_ja: "" },
  { item_id: "dupe0001-9999-4999-8999-999999999999", kind: "web-article", pages: 0, title_en: "Dupe Two", title_ja: "" },
  { item_id: "0badc0de-1111-4222-8333-444455556666", kind: "magazine-year", pages: 0, title_en: "Not an article", title_ja: "" },
];

// ---------------------------------------------------------------- row a: the shared lookup

await check("row a: rowsByKey gives a web article its row under the full item_id and under the first 8 characters", () => {
  const m = T.rowsByKey(META, (r) => r.item_id, (r) => r.kind === T.WEB_ARTICLE);
  assert.equal(m.get(ART).title_en, KAMAE);
  assert.equal(m.get("f3a6586e").title_en, KAMAE);
  assert.equal(m.get("made_book_one").title_en, "Made-up Book One");
});

await check("row a: two articles with the same 8 characters give no short key, and the full item_id still works", () => {
  const m = T.rowsByKey(META, (r) => r.item_id, (r) => r.kind === T.WEB_ARTICLE);
  assert.equal(m.has("dupe0001"), false, "a wrong title is worse than none");
  assert.equal(m.get("dupe0001-1111-4222-8333-444455556666").title_en, "Dupe One");
});

await check("row a: only a web article gets a short key, and a full item_id that equals a short key wins", () => {
  const m = T.rowsByKey(META, (r) => r.item_id, (r) => r.kind === T.WEB_ARTICLE);
  assert.equal(m.has("0badc0de"), false, "a magazine year has no short key");
  assert.equal(m.has("made_boo"), false, "a book folder name has no short key");
  const rows = [
    { item_id: "abcdef12", kind: "book", title_en: "Exact" },
    { item_id: "abcdef12-0000-4000-8000-000000000001", kind: "web-article", title_en: "Article" },
  ];
  assert.equal(T.rowsByKey(rows, (r) => r.item_id, (r) => r.kind === T.WEB_ARTICLE).get("abcdef12").title_en, "Exact");
  assert.equal(T.rowsByKey([{ title_en: "No ID" }], (r) => r.item_id ?? "", () => false).size, 0);
});

// ---------------------------------------------------------------- made-up data folder (files mode)

const { root, w } = await madeUpRoot("vw111-");
const rootData = path.join(root, "data");
await w("data/item-metadata/items.filled.jsonl", jl(META));
await w("data/pilot-sample/book-slugs.json", { books: [{ slug: "made_book_one", pages: 12 }, { slug: "made_book_jaonly", pages: 4 }, { slug: "made_book_none", pages: 3 }, { slug: "100_practice_full", pages: 30 }] });
const RUN = "20261101T120000Z";
const MESSAGE = [
  "[BLOCK book_translation_memory]",
  "store: book translation memory",
  "book_id: made_book_one",
  "pairs_found: 3",
  "[PAIR]",
  "source: page f3a6586e/p003, pair P01, run 20261029T051152Z/20261029T054303Z-r41, split none",
  "ja: 構え",
  "en: Stance",
  "[END PAIR]",
  "[PAIR]",
  "source: page made_book_none/p012, pair P02, run x, split none",
  "ja: 面",
  "en: Men",
  "[END PAIR]",
  "[PAIR]",
  "source: page made_book_one/p002, pair P03, run x, split none",
  "ja: 胴",
  "en: Do",
  "[END PAIR]",
  "[END book_translation_memory]",
  "[BLOCK earlier_term_marks]",
  "book_id: made_book_one",
  "pages_read: 12",
  "ent_a | 構え | stance | first used on page f3a6586e/p003 | result=follows",
  "ent_b | 面 | men | first used on page made_book_one/p002 | result=breaks",
  "ent_c | 胴 | do | first used on page made_book_none/p012 | result=follows",
  "[END earlier_term_marks]",
  "",
].join("\n");
async function finishedPage(slug, pg, message) {
  const dir = `data/pilot-run/${slug}_${pg}/${RUN}`;
  await w(`${dir}/summary.json`, { status: "done", qa: { QA_3: { verdict: "PASS", page_score: 0.9 } } });
  await w(`${dir}/run.json`, { started_utc: "2026-11-01T12:00:00Z" });
  await w(`${dir}/results/TS_3.json`, {});
  await w(`${dir}/results/ED_3.json`, {});
  if (message) await w(`${dir}/messages/TL_3.txt`, message);
}
await finishedPage("made_book_one", "p001", MESSAGE);
await finishedPage("f3a6586e", "p001");
await finishedPage("dupe0001", "p001");
await finishedPage("100_practice_full", "p012");
const configFile = path.join(root, "files-mode.config.json");
await fs.writeFile(configFile, JSON.stringify({ translatorDataDir: rootData, runSource: "files" }));
const pbConfigFile = path.join(root, "pb-mode.config.json");
await fs.writeFile(pbConfigFile, JSON.stringify({ translatorDataDir: rootData, runSource: "pocketbase", pocketbaseUrl: "http://127.0.0.1:8092" }));
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
const pbEnv = { VIEWER_CONFIG: pbConfigFile, VIEWER_RUN_SOURCE: undefined, VIEWER_POCKETBASE_URL: undefined };
const inFiles = (fn) => withEnv(filesEnv, fn);

await check("row a: bookTitle finds a book by its folder name, an article by its short ID and by its full item_id, and not two articles with one prefix", () =>
  inFiles(async () => {
    assert.equal(await BK.bookTitle("made_book_one"), "Made-up Book One");
    assert.equal(await BK.bookTitle("f3a6586e"), KAMAE);
    assert.equal(await BK.bookTitle(ART), KAMAE, "the full item_id still works (full-ID book)");
    assert.equal(await BK.bookTitle("made_book_jaonly"), "日本語だけの本");
    assert.equal(await BK.bookTitle("made_book_none"), "");
    assert.equal(await BK.bookTitle("dupe0001"), "", "shared prefix: no title");
    assert.equal(await BK.bookTitle("no_such_book"), "");
    assert.equal(await BK.bookTitle("100_practice_full"), "Made-up Practice Book", "U+FFFC is removed");
    const m = await BK.bookTitles(["made_book_one", "f3a6586e", "dupe0001", "made_book_none"]);
    assert.deepEqual([...m], [["made_book_one", "Made-up Book One"], ["f3a6586e", KAMAE]]);
  }));

await check("row a: bookTitleAt (run-store-load) uses the same rule", async () => {
  assert.equal(await RL.bookTitleAt(rootData, "made_book_one"), "Made-up Book One");
  assert.equal(await RL.bookTitleAt(rootData, "f3a6586e"), KAMAE);
  assert.equal(await RL.bookTitleAt(rootData, ART), KAMAE);
  assert.equal(await RL.bookTitleAt(rootData, "dupe0001"), null, "shared prefix: no title");
  assert.equal(await RL.bookTitleAt(rootData, "no_such_book"), null);
});

await check("row a: the old callers use the shared lookup (runs.ts and run-store-load.ts have no private item_id match)", async () => {
  const runs = await read("lib/runs.ts");
  assert.match(runs, /import \{ bookTitle \} from "\.\/books";/);
  const load = await read("lib/run-store-load.ts");
  assert.match(load, /rowsByKey\(/);
  assert.equal(/\.find\(\(r\) => r\.id === slug\)/.test(load), false);
  const books = await read("lib/books.ts");
  assert.match(books, /rowsByKey\(rows,/);
});

// ---------------------------------------------------------------- place 2: /books table "Articles"

await check("place 2: listBooks gives the web article its titles, author and a pages value of '–' (null)", () =>
  inFiles(async () => {
    const rows = await BK.listBooks();
    const a = rows.find((r) => r.id === "f3a6586e");
    assert.ok(a, "the article row exists");
    assert.equal(a.group, "article");
    assert.equal(a.titleEn, KAMAE);
    assert.equal(a.titleJa, "理想の構え", "zero-width space removed");
    assert.equal(a.author, "甲田国秀");
    assert.equal(a.pages, null);
    assert.equal(a.hasMeta, true);
    const d = rows.find((r) => r.id === "dupe0001");
    assert.equal(d.titleEn, "");
    assert.equal(d.hasMeta, false, "shared prefix: no row, no title");
    assert.equal(rows.find((r) => r.id === "100_practice_full").titleEn, "Made-up Practice Book");
  }));

await check("place 2: getBookDetail of an article reads the same row", () =>
  inFiles(async () => {
    const d = await BK.getBookDetail("f3a6586e");
    assert.equal(d.group, "article");
    assert.equal(d.meta.title_en, KAMAE);
    assert.equal((await BK.getBookDetail("dupe0001")).meta, null);
  }));

// unit VW127 (Q-A 3:122.4 row 1): the book title is bold in the accent color (class hl-title, data-hl="title"), so the two regexes below allow these two attributes.
await check("place 2: the Articles table shows the English title as the main text, the Japanese below, the folder name in its column and as hover text", () =>
  inFiles(async () => {
    const rows = await BK.listBooks();
    const html = renderToStaticMarkup(React.createElement(BooksView, { rows }));
    const art = /<tr class="border-t border-line align-top hover:bg-stone-50"><td[^>]*><span data-raw-id[^>]*>f3a6586e<\/span><\/td>[\s\S]*?<\/tr>/.exec(html)?.[0] ?? "";
    assert.ok(art, "the row of f3a6586e exists");
    assert.match(art, /<td class="px-3 py-2" title="f3a6586e"><div class="(?:hl-title)?" data-book-title(?:="[^"]*")?(?: data-hl="title")?>How to Create an Ideal Kamae \(Koda Kunihide\)<\/div><div class="font-ja text-xs text-muted" lang="ja">理想の構え<\/div><\/td>/);
    const ja = /<tr [^>]*><td[^>]*><span data-raw-id[^>]*>made_book_jaonly<\/span><\/td>[\s\S]*?<\/tr>/.exec(html)?.[0] ?? "";
    assert.match(ja, /<div class="(?:hl-title )?font-ja" lang="ja" data-book-title(?:="[^"]*")?(?: data-hl="title")?>日本語だけの本<\/div>/);
    const none = /<tr [^>]*><td[^>]*><span data-raw-id[^>]*>made_book_none<\/span><\/td>[\s\S]*?<\/tr>/.exec(html)?.[0] ?? "";
    assert.match(none, /<td class="px-3 py-2"><span class="text-muted">–<\/span><\/td>/, "no title: the dash as before");
    const dupe = /<tr [^>]*><td[^>]*><span data-raw-id[^>]*>dupe0001<\/span><\/td>[\s\S]*?<\/tr>/.exec(html)?.[0] ?? "";
    assert.equal(dupe.includes("Dupe"), false, "shared prefix: no title");
  }));

// ---------------------------------------------------------------- place 3: /settings/run

await check("place 3: bookKeyLabel keeps 'The phase 2 run', shows a title when one exists, else the key", () => {
  assert.equal(RN.bookKeyLabel("paired-dataset"), "The phase 2 run");
  assert.equal(RN.bookKeyLabel("paired-dataset", { "paired-dataset": "Some Title" }), "The phase 2 run");
  assert.equal(RN.bookKeyLabel("made_book_one", { made_book_one: "Made-up Book One" }), "Made-up Book One");
  assert.equal(RN.bookKeyLabel("made_book_one", {}), "made_book_one");
  assert.equal(RN.bookKeyLabel("made_book_one"), "made_book_one");
});

await check("place 3: loadBookLabels gives titles for book keys and article short keys, and none for paired-dataset", () =>
  inFiles(async () => {
    const m = await RLD.loadBookLabels(["made_book_one", "f3a6586e", "paired-dataset", "made_book_none", "dupe0001"]);
    assert.deepEqual(m, { made_book_one: "Made-up Book One", f3a6586e: KAMAE });
  }));

const settingsSnapshot = (active) =>
  SJ.stringifySettingsJson({
    exists: true, revision: 3, updated_utc: "2026-11-18T08:00:00Z", sha1: "x", error: null, n_rule: "N rule text", n_rule_error: null,
    overrides: {}, defaults: {}, models: ["claude-7f6d8610/claude-sonnet-5-5"], variants: [], active, history: [],
  });
await check("place 3: the Run settings panel says '<book title> runs now at page 12', with the book key as hover text", async () => {
  const active = [
    { book: "made_book_one", page: "made_book_one/p012", next: "made_book_one/p013", n: 4 },
    { book: "paired-dataset", page: null, next: null, n: null },
    { book: "made_book_none", page: null, next: null, n: null },
  ];
  const html = renderToStaticMarkup(React.createElement(RunSettingsForm, { initialText: settingsSnapshot(active), pageLabels: {}, bookLabels: { made_book_one: "Made-up Book One" } }));
  assert.match(html, /<strong data-hl="title" class="hl-title" title="Book key: made_book_one">Made-up Book One<\/strong> runs now at /);
  assert.match(html, /<strong data-hl="title" class="hl-title" title="Book key: paired-dataset">The phase 2 run<\/strong> runs now/);
  assert.match(html, /<strong data-hl="title" class="hl-title" title="Book key: made_book_none">made_book_none<\/strong> runs now/, "no title: the key as before");
  const noProp = renderToStaticMarkup(React.createElement(RunSettingsForm, { initialText: settingsSnapshot(active) }));
  assert.match(noProp, /<strong data-hl="title" class="hl-title" title="Book key: made_book_one">made_book_one<\/strong> runs now/, "no title map: the key as before");
});

await check("place 3: the page loads the labels for the active books and passes them to the form", async () => {
  const page = await read("app/settings/run/page.tsx");
  assert.match(page, /loadBookLabels\(snapshot\.active\.map\(\(a\) => a\.book\)\)/);
  assert.match(page, /bookLabels=\{bookLabels\}/);
  const form = await read("components/RunSettingsForm.tsx");
  assert.equal((form.match(/bookLabels=\{bookLabels\}/g) ?? []).length, 3, "the panel, the Review dialog call, and its inner list");
});

// ---------------------------------------------------------------- place 4 and row c: /json

await check("place 4: the plain line says 'page 12 of the book \"<title>\" (<folder name>)' when a title exists", () => {
  const ctx = { titles: new Map(), bookNames: new Map([["100_practice_full", "Made-up Practice Book"]]) };
  assert.equal(JL.pagePhrase("100_practice_full_p012", ctx), 'page 12 of the book "Made-up Practice Book" (100_practice_full)');
  assert.equal(JL.pagePhrase("100_practice_full_p012.json", ctx), 'page 12 of the book "Made-up Practice Book" (100_practice_full)');
  assert.equal(JL.pagePhrase("other_book_p003", ctx), "page 3 of the book other_book", "no title: the folder name alone, as before");
  assert.equal(JL.pagePhrase("100_practice_full_p012"), "page 12 of the book 100_practice_full", "no context: as before");
  assert.match(JL.plainLine("pilot-run/100_practice_full_p012", true, ctx), /Made-up Practice Book/);
});

await check("place 4: an article page keeps its own phrase, and bookSlugsIn leaves article folders out", () => {
  assert.deepEqual(JL.bookSlugsIn("pilot-run/100_practice_full_p012/20261101T120000Z/summary.json"), ["100_practice_full"]);
  assert.deepEqual(JL.bookSlugsIn("pilot-run/f3a6586e_p001/x"), []);
  assert.deepEqual(JL.bookSlugsIn("pilot-run/lists"), []);
  const ctx = { titles: new Map([["f3a6586e", KAMAE]]) };
  assert.equal(JL.pagePhrase("f3a6586e_p002", ctx), `page 2 of the article "${KAMAE}" (f3a6586e)`);
});

await check("place 4: lineContext and loadPlainLines read the book titles from the metadata file", () =>
  inFiles(async () => {
    const ctx = await JLL.lineContext(["pilot-run/made_book_one_p012", "pilot-run/f3a6586e_p001"]);
    assert.equal(ctx.bookNames.get("made_book_one"), "Made-up Book One");
    assert.equal(ctx.titles.get("f3a6586e"), KAMAE);
    const p = await JLL.loadPlainLines("pilot-run/made_book_one_p012", true, [{ path: "pilot-run/made_book_one_p012/20261101T120000Z", folder: true }]);
    assert.match(p.line, /page 12 of the book "Made-up Book One" \(made_book_one\)/);
    assert.match(p.entries["pilot-run/made_book_one_p012/20261101T120000Z"], /Made-up Book One/);
  }));

await check("row c: the path bar of /json keeps the raw folder names", async () => {
  const page = await read("app/json/page.tsx");
  assert.match(page, /<nav aria-label="Path" data-json-path className="mt-1 mb-4 font-mono text-sm break-all">/);
  assert.match(page, /\{p\.name\}/);
  assert.equal(/bookTitle|bookNames|titledPage/.test(page), false, "the page does not give a title to the path bar");
});

// ---------------------------------------------------------------- place 5: /admin/versions

await check("place 5: titledPage gives '<title> · page 12' and keeps the page ID when no title exists", () => {
  assert.equal(RN.titledPage("made_book_one/p012", "Made-up Book One"), "Made-up Book One · page 12");
  assert.equal(RN.titledPage("made_book_one/p012", ""), "made_book_one/p012");
  assert.equal(RN.titledPage("made_book_one/p012"), "made_book_one/p012");
});

await check("place 5: the heading of the admin panel shows the title and page number, the page ID is the hover text", () => {
  const html = renderToStaticMarkup(React.createElement(AdminVersionPanel, { pageId: "made_book_one/p012", bookTitle: "Made-up Book One" }));
  assert.match(html, /<h2 class="section-band mb-2 text-lg font-semibold" title="Page ID made_book_one\/p012" data-version-heading(?:="[^"]*")?>Made-up Book One · page 12<\/h2>/);
  assert.equal(htmlText(html).includes("made_book_one"), false, "the page ID is not visible text");
  const none = renderToStaticMarkup(React.createElement(AdminVersionPanel, { pageId: "made_book_none/p012" }));
  assert.match(none, />made_book_none\/p012<\/h2>/);
});

await check("place 5: the admin list uses titledPage with the page ID as hover text, and the panel gets the title", async () => {
  const page = await read("app/admin/versions/page.tsx");
  assert.match(page, /titledPage\(p\.pageId, titles\[p\.pageId\.split\("\/"\)\[0\]\]\)/);
  assert.match(page, /title=\{`Page ID \$\{p\.pageId\}`\}/);
  assert.match(page, /bookTitle=\{titles\[selected\.split\("\/"\)\[0\]\] \?\? ""\}/);
  assert.match(page, /bookTitlesOf\(s\.token,/);
});

await check("place 5: bookTitlesOf reads the files in files mode, catalog_items in PocketBase mode, and gives {} when the read fails", async () => {
  const files = await withEnv(filesEnv, () => BT.bookTitlesOf("tok", ["made_book_one", "f3a6586e", "made_book_none", "dupe0001"]));
  assert.deepEqual(files, { made_book_one: "Made-up Book One", f3a6586e: KAMAE });
  catalogItems = [
    { item_id: "f3a6586e", kind: "web-article", title_en: KAMAE, title_ja: "理想の構え", pages: 0 },
    { item_id: "made_book_one", kind: "book", title_en: "", title_ja: `日本${ZW}語`, pages: 12 },
    { item_id: "made_book_none", kind: "book", title_en: "", title_ja: "", pages: 3 },
  ];
  const server = await withEnv(pbEnv, () => BT.bookTitlesOf("tok", ["made_book_one", "f3a6586e", "made_book_none"]));
  assert.deepEqual(server, { made_book_one: "日本語", f3a6586e: KAMAE });
  catalogFails = true;
  const broken = await withEnv(pbEnv, () => BT.bookTitlesOf("tok", ["made_book_one"]));
  assert.deepEqual(broken, {}, "a failed read never breaks the page");
  catalogFails = false;
  catalogItems = [];
  assert.deepEqual(await withEnv(pbEnv, () => BT.bookTitlesOf("tok", [])), {});
});

// ---------------------------------------------------------------- place 6: short title, chips

await check("place 6: shortTitle keeps a title of 30 characters or fewer whole", () => {
  assert.equal(C.shortTitle("Short Title"), "Short Title");
  assert.equal(C.shortTitle("123456789012345678901234567890"), "123456789012345678901234567890", "exactly 30");
  assert.equal(C.shortTitle("  Spaced  "), "Spaced");
  assert.equal(C.shortTitle(""), "");
});

await check("place 6: shortTitle cuts a longer title at a word end inside the first 30 characters and adds '…'", () => {
  assert.equal(C.shortTitle(KAMAE), "How to Create an Ideal Kamae…", "the cut falls inside '(Koda': the last space is before '(', and the space is dropped");
  assert.equal(C.shortTitle("Removing unnecessary force from your Kendo"), "Removing unnecessary force…");
  assert.equal(C.shortTitle("abcdefghij abcdefghij abcdefgh tail"), "abcdefghij abcdefghij abcdefgh…", "a space right after the 30th character: the cut keeps all 30");
});

await check("place 6: shortTitle cuts after 30 characters when no word end exists, counts characters and not UTF-16 units, and drops a comma at the cut", () => {
  const ja = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめも";
  assert.equal(C.shortTitle(ja), Array.from(ja).slice(0, 30).join("") + "…");
  assert.equal(Array.from(C.shortTitle(ja)).length, 31);
  assert.equal(C.shortTitle("A tiny word then Supercalifragilisticexpialidocious"), "A tiny word then…", "the long last word is cut away");
  assert.equal(C.shortTitle("Alpha beta gamma delta, epsilon zeta"), "Alpha beta gamma delta…", "the comma at the cut goes");
});

const KAMAE_TITLES = { f3a6586e: KAMAE, made_book_one: "Made-up Book One" };
await check("place 6: pairChip gives 'short title · p3 · P01' with the full title and the page ID as hover text", () => {
  const card = C.panelCards(parsePanel().blocks)[0].cards.find((c) => c.kind === "pair");
  assert.equal(card.pair, "P01");
  assert.equal(card.chip, "f3a6586e/p003 · P01", "the card keeps the older chip");
  const chip = C.pairChip(card, KAMAE_TITLES);
  assert.equal(chip.text, "How to Create an Ideal Kamae… · p3 · P01");
  assert.equal(chip.hover, `${KAMAE}. Page ID f3a6586e/p003, pair P01.`);
});

await check("place 6: pairChip keeps the older text when the book has no title, when no titles come, and when the source has no page", () => {
  const cards = C.panelCards(parsePanel().blocks)[0].cards.filter((c) => c.kind === "pair");
  assert.deepEqual(C.pairChip(cards[1], KAMAE_TITLES), { text: "made_book_none/p012 · P02", hover: "" });
  assert.deepEqual(C.pairChip(cards[0]), { text: "f3a6586e/p003 · P01", hover: "" });
  const odd = { ...cards[0], page: null, pair: "", chip: "free text" };
  assert.deepEqual(C.pairChip(odd, KAMAE_TITLES), { text: "free text", hover: "" });
});

await check("place 6: firstPageChip gives 'short title · p3' and keeps the page ID when no title exists", () => {
  assert.deepEqual(C.firstPageChip({ slug: "f3a6586e", page: "p003" }, "f3a6586e/p003", KAMAE_TITLES), { text: "How to Create an Ideal Kamae… · p3", hover: `${KAMAE}. Page ID f3a6586e/p003.` });
  assert.deepEqual(C.firstPageChip({ slug: "x", page: "p003" }, "x/p003", KAMAE_TITLES), { text: "x/p003", hover: "" });
  assert.deepEqual(C.firstPageChip(null, "free", KAMAE_TITLES), { text: "free", hover: "" });
});

function parsePanel() {
  return parseTl3Message(MESSAGE);
}

await check("place 6: panelBookSlugs lists the books that the pair pages, the marks and the marks book name", () => {
  assert.deepEqual(C.panelBookSlugs(parsePanel().blocks), ["f3a6586e", "made_book_none", "made_book_one"]);
  assert.deepEqual(C.panelBookSlugs([]), []);
});

await check("place 6 and 1: the panel shows the chips with short titles and the Marks card with the book title", () => {
  const panel = { ...parsePanel(), bookTitles: { f3a6586e: KAMAE, made_book_one: "Made-up Book One" } };
  const html = renderToStaticMarkup(React.createElement(Tl3Panel, { panel, slug: "made_book_one", bookTitle: "Made-up Book One" }));
  const chips = [...html.matchAll(/<span class="rounded bg-sky-100[^>]*data-pair-chip[^>]*>([\s\S]*?)<\/span>/g)].map((m) => m[0]);
  assert.equal(chips.length, 3);
  assert.match(chips[0], /title="How to Create an Ideal Kamae \(Koda Kunihide\)\. Page ID f3a6586e\/p003, pair P01\."/);
  assert.equal(htmlText(chips[0]).trim(), "How to Create an Ideal Kamae… · p3 · P01");
  assert.match(chips[0], /href="\/translate\/f3a6586e\?at=p003#p003"/);
  assert.equal(htmlText(chips[1]).trim(), "made_book_none/p012 · P02", "no title: the older text");
  assert.equal(chips[1].includes("title="), false, "no title: no hover text");
  assert.equal(htmlText(chips[2]).trim(), "Made-up Book One · p2 · P03", "the book on the screen gets the same chip");
  assert.match(chips[2], /href="#p002"/);
  const marks = /<div data-card="marks">[\s\S]*?<\/table>/.exec(html)?.[0] ?? "";
  assert.ok(marks, "the Marks card exists");
  assert.match(marks, /<span title="made_book_one" data-marks-book-title(?:="[^"]*")?>Made-up Book One<\/span><span>, 12 pages read\.<\/span>/);
  assert.equal(marks.includes('class="font-mono"'), false, "the book ID is not the visible text");
  assert.match(marks, /<a href="\/translate\/f3a6586e\?at=p003#p003" class="text-accent underline" title="How to Create an Ideal Kamae \(Koda Kunihide\)\. Page ID f3a6586e\/p003\.">How to Create an Ideal Kamae… · p3<\/a>/);
  assert.match(marks, /<a href="#p002" class="text-accent underline">p002<\/a>/, "the same book keeps the page name");
  assert.match(marks, />made_book_none\/p012<\/a>/, "no title: the page ID as before");
});

await check("place 1: the Marks card of another book shows the title from the map, and the ID as before when there is none", () => {
  const panel = parsePanel();
  const withMap = renderToStaticMarkup(React.createElement(Tl3Panel, { panel: { ...panel, bookTitles: { made_book_one: "Made-up Book One" } }, slug: "another_book", bookTitle: "Another Book" }));
  assert.match(/<div data-card="marks">[\s\S]*?<\/div>/.exec(withMap)[0], /<span title="made_book_one" data-marks-book-title(?:="[^"]*")?>Made-up Book One<\/span>/);
  const none = renderToStaticMarkup(React.createElement(Tl3Panel, { panel, slug: "another_book" }));
  assert.match(/<div data-card="marks">[\s\S]*?<\/div>/.exec(none)[0], /<span class="font-mono">made_book_one<\/span><span>, 12 pages read\.<\/span>/);
  const own = renderToStaticMarkup(React.createElement(Tl3Panel, { panel, slug: "made_book_one", bookTitle: "Made-up Book One" }));
  assert.match(/<div data-card="marks">[\s\S]*?<\/div>/.exec(own)[0], /data-marks-book-title(?:="[^"]*")?>Made-up Book One<\/span>/, "the book on the screen uses bookTitle");
});

await check("place 6: loadHtvPage (files mode) adds the titles of the books that the panel names, none for a book with no title", () =>
  inFiles(async () => {
    const data = await R.loadHtvPage("made_book_one", "p001", null, "tok");
    assert.deepEqual(data.panel.bookTitles, { f3a6586e: KAMAE, made_book_one: "Made-up Book One" });
    const empty = await R.loadHtvPage("f3a6586e", "p001", null, "tok");
    assert.deepEqual(empty.panel.bookTitles ?? {}, {}, "a page with no TL_3 message has no panel books");
  }));

await check("place 6: the old chip text and the raw lines of the cards stay (0 lost lines)", () => {
  const blocks = parsePanel().blocks;
  for (const b of C.panelCards(blocks)) {
    for (const c of b.cards) {
      if (c.kind === "pair") assert.match(c.chip, /^[a-z0-9_]+\/p\d+ · P\d+$/);
    }
  }
  const src = blocks.find((b) => b.name === "book_translation_memory").parts.filter((p) => p.kind === "PAIR");
  const cards = C.panelCards(blocks).find((b) => b.name === "book_translation_memory").cards.filter((c) => c.kind === "pair");
  assert.deepEqual(cards.map((c) => C.rawLines(c)), src.map((p) => p.lines));
});

await check("the HtvBook source line that the VW110 test matches is unchanged (the panel gets its titles through panel.bookTitles)", async () => {
  assert.match(await read("components/HtvBook.tsx"), /<Tl3Panel key=\{panelN\} panel=\{panelPage\.data\.panel\} slug=\{slug\} bookTitle=\{bookTitle\} \/>/);
});

globalThis.fetch = realFetch;
if (fallbackTmp) await fs.rm(fallbackTmp, { recursive: true, force: true });
done();
