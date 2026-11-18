// VW110 (round 96, card P45.1): server-free tests of the book names on the remaining screens and the layout of the book screen.
// Owner words (Q-A 3:72.2): "Use the real name of the book, not the file name". Owner picks: Q-A 3:73.2 "English, Japanese below", Q-A 3:74.3 "File name for equal titles",
// Q-A 3:74.5 "All 5 parts in VW110":
//   part 1  page headings on `/translate/<book>` show "Page n" and then the book title (web articles in files mode too), the page ID is the hover text
//   part 2  `/translate/<book>` stacks its columns below the lg width (the browser check measures scrollWidth 390 at 390 px)
//   part 3  rows with equal titles in the list `/translate` also show their file name in small gray text
//   part 4  staff screens name a book by its title: the open rows and dialog (run view), the dialog of the Details screen, the "Book:" line of the Note card
//   part 5  U+FFFC (object replacement character) leaves a title
// Run: node scripts/vw110-test.mjs (from the app folder, TMPDIR set). The last line is "<n> passed, <m> failed".
// Made-up data only: made-up slugs and titles, a made-up data folder below TMPDIR, a stub for fetch (no network, no PocketBase).
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, htmlText, installAppHooks, jl, madeUpRoot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  throw new Error("Network is disabled in the VW110 tests: " + String(url));
};
let fallbackTmp = null;
if (!process.env.TMPDIR) {
  fallbackTmp = path.join(app, "node_modules", ".vw110-tmp");
  await fs.mkdir(fallbackTmp, { recursive: true });
  process.env.TMPDIR = fallbackTmp;
}
installAppHooks(app);
const { check, done } = checker();

const T = await import("../lib/htv-titles.ts");
const B = await import("../lib/htv-books.ts");
const R = await import("../lib/htv-runs.ts");
const HB = await import("../lib/htv-build.ts");
const React = createRequire(path.join(app, "package.json"))("react");
const { renderToStaticMarkup } = createRequire(path.join(app, "package.json"))("react-dom/server");
const { default: HtvList } = await import("../components/HtvList.tsx");
const { default: HtvPageSection } = await import("../components/HtvPageSection.tsx");
const { default: Tl3Panel } = await import("../components/HtvPanel.tsx");
const { default: ReaderOpenRows } = await import("../components/ReaderOpenRows.tsx");
const { default: BookRunsTable } = await import("../components/BookRunsTable.tsx");
const { PaneSettingsProvider } = await import("../components/PaneSettings.tsx");

const ZW = "\u200b"; // zero-width space
const OBJ = "\ufffc"; // object replacement character (part 5)
const read = (rel) => fs.readFile(path.join(app, rel), "utf8");
const inPane = (el) => React.createElement(PaneSettingsProvider, { initial: { v: 1, panes: {} }, theme: "light" }, el);

// ---------------------------------------------------------------- part 5: U+FFFC

await check("part 5: cleanTitle removes U+FFFC at the end, in the middle and alone, and keeps the other text", () => {
  assert.equal(T.cleanTitle(`Removing unnecessary force from your Kendo (Ishihara Kazuhiko)${OBJ}`), "Removing unnecessary force from your Kendo (Ishihara Kazuhiko)");
  assert.equal(T.cleanTitle(`a${OBJ}b`), "ab");
  assert.equal(T.cleanTitle(OBJ), "");
  assert.equal(T.cleanTitle(`${ZW}${OBJ} x ${OBJ}${ZW}`), "x");
  assert.equal(T.cleanTitle("活きた構え"), "活きた構え");
});

await check("part 5: bookNames and filesBookFacts give a title with no box character", () => {
  const meta = [{ item_id: "460f7e37-aaaa-bbbb-cccc-ddddeeeeffff", kind: "web-article", pages: 0, title_en: `Removing unnecessary force${OBJ}`, title_ja: `力み${OBJ}を取る` }];
  const f = T.filesBookFacts(meta, []).get("460f7e37");
  assert.equal(f.titleEn, "Removing unnecessary force");
  assert.equal(f.titleJa, "力みを取る");
  assert.equal(T.bookNames("460f7e37", `x${OBJ}`, "").main, "x");
});

// ---------------------------------------------------------------- part 3: equal titles

const row = (slug, titleEn, titleJa, extra = {}) => ({ slug, title: titleEn || titleJa, titleEn, titleJa, pages: 10, tagged: 1, ...extra });
const MEN = ["Men: Made-up Hanshi", "面：架空の範士"];
const OGW = ["Lectures on Made-up Kendo, New Edition", "架空の剣道講話 新版"];
const LIST = [
  row("men_full", ...MEN),
  row("men0", ...MEN),
  row("men1", ...MEN),
  row("ogawa_part1", ...OGW),
  row("ogawa_part2", ...OGW),
  row("single_one", "A Single Title", "単独の題名"),
  row("mental_full", "Making the Difference", "日の稽古"),
  row("mental2_clean", "Making the Difference", "別の日本語"), // same English, other Japanese: not equal
  row("jaequal_a", "Another English A", "同じ日本語"),
  row("jaequal_b", "Another English B", "同じ日本語"), // same Japanese, other English: not equal
  row("untitled_a", "", ""),
  row("untitled_b", "", ""), // no title: the file name is the link, so no group
  row("jaonly_a", "", "日本語だけ"),
  row("jaonly_b", "", "日本語だけ"), // Japanese only and equal: a group, the line holds the file name only
  row("clean_a", `Cleaned${ZW}${OBJ} Title`, "清め"),
  row("clean_b", "Cleaned Title ", `清${ZW}め`), // equal after cleaning
  row("enonly_a", "English Only Equal", ""),
  row("enonly_b", "English Only Equal", ""), // English only and equal: a group, the line holds the file name only
];

await check("part 3: equalTitleSlugs finds the group of 3, the group of 2 and the other groups, and leaves the single row and the near-equal rows out", () => {
  const s = T.equalTitleSlugs(LIST);
  assert.deepEqual([...s].sort(), ["clean_a", "clean_b", "enonly_a", "enonly_b", "jaonly_a", "jaonly_b", "men0", "men1", "men_full", "ogawa_part1", "ogawa_part2"].sort());
  assert.equal(s.has("single_one"), false);
  assert.equal(s.has("mental_full") || s.has("mental2_clean"), false, "equal in English only is not equal");
  assert.equal(s.has("jaequal_a") || s.has("jaequal_b"), false, "equal in Japanese only is not equal");
  assert.equal(s.has("untitled_a") || s.has("untitled_b"), false, "no title: never in a group");
});

await check("part 3: equalTitleSlugs gives an empty set for no row, one row, and rows that all differ", () => {
  assert.equal(T.equalTitleSlugs([]).size, 0);
  assert.equal(T.equalTitleSlugs([row("a", "Same", "同じ")]).size, 0);
  assert.equal(T.equalTitleSlugs([row("a", "One", "一"), row("b", "Two", "二")]).size, 0);
});

await check("part 3: the groups come from the rows, not from a fixed list (men0 alone is not in a group)", () => {
  assert.equal(T.equalTitleSlugs([row("men0", ...MEN)]).size, 0);
  assert.equal(T.equalTitleSlugs([row("men0", ...MEN), row("zzz_other", ...MEN)]).size, 2);
});

const listHtml = renderToStaticMarkup(inPane(React.createElement(HtvList, { rows: LIST })));
const rowHtml = (slug) => {
  const m = new RegExp(`<tr[^>]*data-book="${slug}"[^>]*>[\\s\\S]*?</tr>`).exec(listHtml);
  assert.ok(m, "row for " + slug);
  return m[0];
};
const fileOf = (slug) => /<span class="([^"]*)" lang="en" data-book-file(?:="[^"]*")?>([^<]*)<\/span>/.exec(rowHtml(slug));

await check("part 3: a row in a group shows its file name in small gray text (text-xs text-muted), after the Japanese title", () => {
  for (const slug of ["men_full", "men0", "men1", "ogawa_part1", "ogawa_part2", "clean_a", "clean_b"]) {
    const r = rowHtml(slug);
    const f = fileOf(slug);
    assert.ok(f, slug + " has a file name span");
    assert.equal(f[2], slug);
    const line = /<div class="([^"]*)" data-book-sub(?:="[^"]*")?>([\s\S]*?)<\/div>/.exec(r);
    assert.ok(line, slug + " has the line");
    assert.match(line[1], /text-xs/);
    assert.match(line[1], /text-muted/);
    const ja = /<span lang="ja" data-book-title-ja(?:="[^"]*")?>([^<]*)<\/span>/.exec(line[2]);
    assert.ok(ja, slug + " has the Japanese title in the line");
    assert.ok(line[2].indexOf("data-book-title-ja") < line[2].indexOf("data-book-file"), "the file name comes after the Japanese title");
  }
  assert.equal(/<span[^>]*data-book-title-ja(?:="[^"]*")?>([^<]*)<\/span>/.exec(rowHtml("men0"))[1], "面：架空の範士");
});

await check("part 3: a row with a unique title, a near-equal title or no title shows no file name", () => {
  for (const slug of ["single_one", "mental_full", "mental2_clean", "jaequal_a", "jaequal_b", "untitled_a", "untitled_b"]) {
    assert.equal(rowHtml(slug).includes("data-book-file"), false, slug);
  }
  assert.equal(htmlText(rowHtml("single_one")).includes("single_one"), false, "the file name is not visible text of a single row");
  assert.equal(htmlText(rowHtml("mental_full")).includes("mental_full"), false);
});

await check("part 3: a group row with no Japanese title shows the file name alone in the line", () => {
  for (const slug of ["jaonly_a", "jaonly_b", "enonly_a", "enonly_b"]) {
    const line = /<div class="[^"]*" data-book-sub(?:="[^"]*")?>([\s\S]*?)<\/div>/.exec(rowHtml(slug));
    assert.ok(line, slug);
    assert.equal(line[1].includes("data-book-title-ja"), false, slug + " has no Japanese span");
    assert.equal(fileOf(slug)[2], slug);
  }
});

await check("part 3: the file name does not use the mono font or break-all, and 11 rows show one", () => {
  assert.equal(listHtml.includes("font-mono"), false);
  assert.equal(listHtml.includes("break-all"), false);
  assert.equal([...listHtml.matchAll(/data-book-file/g)].length, 11);
});

await check("part 3: the link, hover text and Japanese line of every row stay as VW109 built them", () => {
  const link = /<a [^>]*>[\s\S]*?<\/a>/.exec(rowHtml("men0"))[0];
  assert.match(link, /href="\/translate\/men0"/);
  assert.match(link, /title="men0"/);
  assert.match(link, />Men: Made-up Hanshi</);
  const single = rowHtml("single_one");
  assert.match(single, /<div class="[^"]*text-xs[^"]*text-muted[^"]*" lang="ja" data-book-title-ja(?:="[^"]*")?>単独の題名<\/div>/);
  assert.equal(/\stitle=/.test(rowHtml("untitled_a")), false, "no title: no hover text");
});

// ---------------------------------------------------------------- part 4: staffBookName

await check("part 4: staffBookName gives the English title, else the Japanese title, else the file name", () => {
  assert.deepEqual(T.staffBookName("100_made", "One Hundred", "百回稽古"), { main: "One Hundred", hover: "100_made", title: "One Hundred" });
  assert.deepEqual(T.staffBookName("c0ffee0d", "", "日本語だけの記事"), { main: "日本語だけの記事", hover: "c0ffee0d", title: "日本語だけの記事" });
  assert.deepEqual(T.staffBookName("c0ffee0b", "", ""), { main: "c0ffee0b", hover: "", title: "" });
  assert.deepEqual(T.staffBookName("c0ffee0b", null, undefined), { main: "c0ffee0b", hover: "", title: "" });
  assert.deepEqual(T.staffBookName("x", `Name${OBJ}`, ""), { main: "Name", hover: "x", title: "Name" });
});

// ---------------------------------------------------------------- part 4: open rows (run view)

const page = (id, folder, verdict, article) => ({ pageId: id, runFolder: folder, qa3Verdict: verdict, article });
const PAGES = [
  page("made_book_one/p001", "20261101T120000Z", "PASS", { shortId: "", title: "Made-up Book One", titleJa: null, found: true, pageOf: "page 1" }),
  page("made_book_one/p002", "20261101T120100Z", "PASS", { shortId: "", title: "Made-up Book One", titleJa: null, found: true, pageOf: "page 2" }),
  page("c0ffee08/p001", "20261101T120200Z", "PASS", { shortId: "c0ffee08", title: "Made-up Article Eight", titleJa: "活きた構え", found: true, pageOf: "page 1 of 2" }),
  page("c0ffee0b/p001", "20261101T120300Z", "FAIL", { shortId: "c0ffee0b", title: "title not found", titleJa: null, found: false, pageOf: "page 1 of 1" }),
  page("made_book_none/p001", "20261101T120400Z", "PASS", undefined),
  page("c0ffee0d/p001", "20261101T120500Z", "PASS", { shortId: "c0ffee0d", title: "日本語だけの記事", titleJa: null, found: true, pageOf: "page 1 of 1" }),
  page("made_waiting/p001", "", null, undefined),
];
const openHtml = renderToStaticMarkup(React.createElement(ReaderOpenRows, { stamp: "20261112T044149Z", pages: PAGES }));
const openRow = (book) => {
  const m = new RegExp(`<tr[^>]*data-reader-open-row="${book}"[^>]*>[\\s\\S]*?</tr>`).exec(openHtml);
  assert.ok(m, "open row for " + book);
  return m[0];
};

await check("part 4: an open row shows the book title first, then the file name in small gray text", () => {
  const r = openRow("made_book_one");
  assert.match(r, /<span title="Book key: made_book_one" data-reader-open-name(?:="[^"]*")?>Made-up Book One<\/span>/);
  assert.match(r, /data-raw-id[^>]*>made_book_one<\/span>/);
  assert.ok(r.indexOf("Made-up Book One") < r.indexOf("data-raw-id"));
  assert.match(r, /2 pages/);
});

await check("part 4: an article row shows the English title, the title of an article with Japanese only shows that text", () => {
  assert.match(openRow("c0ffee08"), /data-reader-open-name(?:="[^"]*")?>Made-up Article Eight<\/span>/);
  assert.match(openRow("c0ffee08"), /data-raw-id[^>]*>c0ffee08<\/span>/);
  assert.match(openRow("c0ffee0d"), /data-reader-open-name(?:="[^"]*")?>日本語だけの記事<\/span>/);
});

await check("part 4: an open row with no title, or with a title that was not found, shows the file name once, as before", () => {
  for (const book of ["c0ffee0b", "made_book_none"]) {
    const r = openRow(book);
    assert.match(r, new RegExp(`data-reader-open-name(?:="[^"]*")?>${book}</span>`));
    assert.equal(r.includes("data-raw-id"), false, book + " has no second file name");
    assert.equal(r.includes("title not found"), false);
  }
  assert.equal(openHtml.includes("made_waiting"), false, "a page with no run folder opens nothing");
});

await check("part 4: the dialog titles of the run view and of the Details screen name the book by its title (source rule)", async () => {
  const rows = await read("components/ReaderOpenRows.tsx");
  assert.match(rows, /`Open the run of \$\{groupLabel\(ask\.g\)\} \(\$\{listLabel\(stamp\)\}\) to readers\?`/);
  assert.match(rows, /`Close the run of \$\{groupLabel\(ask\.g\)\} \(\$\{listLabel\(stamp\)\}\) to readers\?`/);
  assert.match(rows, /return g\.title \|\| bookKeyLabel\(g\.book\);/);
  assert.equal(/Open the run of \$\{bookKeyLabel/.test(rows), false, "the old dialog text is gone");
  const table = await read("components/BookRunsTable.tsx");
  assert.match(table, /const bookName = title \|\| slug;/);
  assert.match(table, /`Open the run \$\{ask\.row\.runText\} of \$\{bookName\} to readers\?`/);
  assert.match(table, /`Close the run \$\{ask\.row\.runText\} of \$\{bookName\} to readers\?`/);
  assert.equal(/of \$\{slug\} to readers/.test(table), false, "the old dialog text is gone");
  const view = await read("components/BookDetailView.tsx");
  assert.match(view, /<BookRunsTable slug=\{slug\} runs=\{data\.runs\} title=\{named \? row\.title : null\} \/>/);
});

await check("part 4: the Runs table of the Details screen still renders with and without a title", () => {
  const runs = [{ key: "k1", runId: "20261111T183021-0800", runText: "2026-11-11 18:30 PST", runIdForm: true, place: "current", folder: "", phase: "agent-phase-4", pagesText: "2 / 10", promptsStart: "–", promptsEnd: "–", placeText: "Current run", passPages: 1, totalPages: 2, noRunIdReason: "" }];
  const a = renderToStaticMarkup(React.createElement(BookRunsTable, { slug: "made_book_one", runs, title: "Made-up Book One" }));
  const b = renderToStaticMarkup(React.createElement(BookRunsTable, { slug: "made_book_one", runs }));
  assert.match(a, /data-book-runs/);
  assert.match(b, /data-book-runs/);
});

// ---------------------------------------------------------------- part 4: the Note card of the information panel

const MESSAGE = [
  "[BLOCK book_translation_memory]",
  "store: book translation memory",
  "book_id: made_book_one",
  "pairs_found: 0",
  "[END book_translation_memory]",
  "",
].join("\n");
const panel = HB.buildRun("made_book_one/p001", { ts3: null, ed3: null, termMarks: null, enFormCheck: null, tl3Message: MESSAGE, termbase: new Map() }).panel;
const noteLine = (html) => /<div data-card="note"[^>]*>[\s\S]*?<\/div><\/div>|<div class="[^"]*" data-card="note">[\s\S]*?<\/div>/.exec(html)?.[0] ?? "";

await check("part 4: the Note card shows 'Book: <title>' with the file name as hover text when the ID is the book on the screen", () => {
  const html = renderToStaticMarkup(React.createElement(Tl3Panel, { panel, slug: "made_book_one", bookTitle: "Made-up Book One" }));
  const note = noteLine(html);
  assert.ok(note, "the Note card exists");
  assert.match(note, /Book:\s*<span title="made_book_one" data-note-book-title(?:="[^"]*")?>Made-up Book One<\/span>/);
  assert.equal(htmlText(note).includes("made_book_one"), false, "the file name is not visible text");
});

await check("part 4: the Note card shows the ID as before when the book has no title or the ID is another book", () => {
  const none = noteLine(renderToStaticMarkup(React.createElement(Tl3Panel, { panel, slug: "made_book_one", bookTitle: "" })));
  assert.match(htmlText(none), /Book: made_book_one/);
  assert.equal(none.includes("data-note-book-title"), false);
  const other = noteLine(renderToStaticMarkup(React.createElement(Tl3Panel, { panel, slug: "another_book", bookTitle: "Another Book" })));
  assert.match(htmlText(other), /Book: made_book_one/);
  assert.equal(other.includes("Another Book"), false, "the title of another book does not replace the ID");
  const noProp = noteLine(renderToStaticMarkup(React.createElement(Tl3Panel, { panel, slug: "made_book_one" })));
  assert.match(htmlText(noProp), /Book: made_book_one/);
});

// ---------------------------------------------------------------- part 1: page headings

const ART_ID = "c0ffee08-1111-4222-8333-444455556666";
const FFFC_ID = "460f7e37-1111-4222-8333-444455556666";
const META = [
  { item_id: "made_book_one", kind: "book", pages: 12, title_en: "Made-up Book One", title_ja: "架空の本その一" },
  { item_id: "made_book_jaonly", kind: "book", pages: 4, title_en: "", title_ja: "日本語だけの本" },
  { item_id: "made_book_none", kind: "book", pages: 3, title_en: "", title_ja: "" },
  { item_id: ART_ID, kind: "web-article", pages: 0, title_en: "Made-up Article Eight", title_ja: `活きた${ZW}構え` },
  { item_id: FFFC_ID, kind: "web-article", pages: 0, title_en: `Removing unnecessary force from your Kendo (Made-up)${OBJ}`, title_ja: "力みを取る" },
  { item_id: "dupe0001-1111-4222-8333-444455556666", kind: "web-article", pages: 0, title_en: "Dupe One", title_ja: "" },
  { item_id: "dupe0001-9999-4999-8999-999999999999", kind: "web-article", pages: 0, title_en: "Dupe Two", title_ja: "" },
];
const BOOKS = [
  { slug: "made_book_one", pages: 12 },
  { slug: "made_book_jaonly", pages: 4 },
  { slug: "made_book_none", pages: 3 },
];
const { root, w } = await madeUpRoot("vw110-");
const rootData = path.join(root, "data");
await w("data/item-metadata/items.filled.jsonl", jl(META));
await w("data/pilot-sample/book-slugs.json", { books: BOOKS });
const RUN = "20261101T120000Z";
async function finishedPage(slug, pg) {
  const dir = `data/pilot-run/${slug}_${pg}/${RUN}`;
  await w(`${dir}/summary.json`, { status: "done", qa: { QA_3: { verdict: "PASS", page_score: 0.9 } } });
  await w(`${dir}/run.json`, { started_utc: "2026-11-01T12:00:00Z" });
  await w(`${dir}/results/TS_3.json`, {});
  await w(`${dir}/results/ED_3.json`, {});
}
for (const [slug, pg] of [["made_book_one", "p001"], ["made_book_jaonly", "p001"], ["made_book_none", "p001"], ["c0ffee08", "p001"], ["460f7e37", "p001"], ["dupe0001", "p001"]]) await finishedPage(slug, pg);
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
const load = (slug, pg = "p001") => withEnv(filesEnv, () => R.loadHtvPage(slug, pg, null, "made-up-token"));

await check("part 1 (files mode): the page of a book gets the English title, of an article the title of its short ID, of a Japanese-only book the Japanese title", async () => {
  assert.equal((await load("made_book_one")).bookTitle, "Made-up Book One");
  assert.equal((await load("c0ffee08")).bookTitle, "Made-up Article Eight", "a web article matches by the first 8 characters of item_id");
  assert.equal((await load("made_book_jaonly")).bookTitle, "日本語だけの本");
});

await check("part 1 (files mode): no title gives an empty text, and two items with the same 8 characters give no title", async () => {
  assert.equal((await load("made_book_none")).bookTitle, "");
  assert.equal((await load("dupe0001")).bookTitle, "", "a wrong title is worse than none");
});

await check("part 1 and 5 (files mode): the title of 460f7e37 has no box character", async () => {
  const t = (await load("460f7e37")).bookTitle;
  assert.equal(t, "Removing unnecessary force from your Kendo (Made-up)");
  assert.equal(t.includes(OBJ), false);
});

await check("part 1 (files mode): the list of finished pages (listFinishedPages) carries the same titles", async () => {
  const rows = await withEnv(filesEnv, () => R.listFinishedPages(new Map(), "made-up-token"));
  const by = Object.fromEntries(rows.map((r) => [r.slug, r.bookTitle]));
  assert.equal(by.c0ffee08, "Made-up Article Eight");
  assert.equal(by.made_book_one, "Made-up Book One");
  assert.equal(by["460f7e37"], "Removing unnecessary force from your Kendo (Made-up)");
  assert.equal(by.made_book_none, "");
});

await check("part 1 (files mode): the book list and the book index still give both titles through the shared read", async () => {
  const rows = await withEnv(filesEnv, () => B.listBookRows(new Map(), "made-up-token"));
  const one = rows.find((r) => r.slug === "made_book_one");
  assert.equal(one.titleEn, "Made-up Book One");
  assert.equal(one.titleJa, "架空の本その一");
  assert.equal(rows.find((r) => r.slug === "c0ffee08").titleJa, "活きた構え");
  const idx = await withEnv(filesEnv, () => B.loadBookIndex("c0ffee08", new Map(), "made-up-token"));
  assert.equal(idx.titleEn, "Made-up Article Eight");
});

const sectionHtml = async (slug, { canPin, pinned = false }) => {
  const data = await load(slug);
  const el = React.createElement(HtvPageSection, {
    page: { n: 1, pageId: data.pageId, data, versions: [], rows: [], comments: [], pbNote: "" },
    data,
    user: { name: "Made-up translator", email: "t@vw110-test.local", role: "translator" },
    pinned,
    canPin,
    onPin: () => {},
    onDirty: () => {},
    onReload: async () => {},
  });
  return renderToStaticMarkup(inPane(el));
};
const headingOf = (html) => /<h2 class="text-lg font-semibold tracking-tight">[\s\S]*?<\/h2>/.exec(html)?.[0] ?? "";

await check("part 1: a loaded page heading shows 'Page 1' as the main text, then the book title, and the page ID only as hover text", async () => {
  const h = headingOf(await sectionHtml("made_book_one", { canPin: true }));
  assert.ok(h, "heading found");
  assert.match(h, /<button[^>]*data-pin="made_book_one\/p001"[^>]*>Page 1<\/button>/);
  assert.match(h, /title="Page ID made_book_one\/p001\. Click to show the TL_3 information panel of this page"/);
  assert.match(h, /<span class="ml-3 text-base font-normal text-muted" data-page-book-title(?:="[^"]*")?>Made-up Book One<\/span>/);
  assert.equal(htmlText(h).includes("made_book_one"), false, "the page ID is not visible text");
  assert.equal(htmlText(h).replace(/\s+/g, " ").trim(), "Page 1 Made-up Book One");
});

await check("part 1: in the page view the heading is plain text with data-page-heading and the page ID as hover text", async () => {
  const h = headingOf(await sectionHtml("made_book_one", { canPin: false }));
  assert.match(h, /<span data-page-heading="made_book_one\/p001" title="Page ID made_book_one\/p001">Page 1<\/span>/);
  assert.equal(h.includes("data-pin"), false);
});

await check("part 1: a web article in files mode gets its title in the heading (it got none before), and an item with no title shows 'Page 1' alone", async () => {
  const a = headingOf(await sectionHtml("c0ffee08", { canPin: true }));
  assert.match(a, /data-pin="c0ffee08\/p001"/);
  assert.match(a, /data-page-book-title(?:="[^"]*")?>Made-up Article Eight<\/span>/);
  const n = headingOf(await sectionHtml("made_book_none", { canPin: true }));
  assert.equal(n.includes("data-page-book-title"), false);
  assert.equal(htmlText(n).replace(/\s+/g, " ").trim(), "Page 1");
});

await check("part 1: a pinned page keeps the pin text, and the page number comes from the page name (p012 gives Page 12)", async () => {
  const h = headingOf(await sectionHtml("made_book_one", { canPin: true, pinned: true }));
  assert.match(h, /aria-pressed="true"/);
  assert.match(h, /title="Page ID made_book_one\/p001\. The TL_3 information panel is pinned to this page\. Click to follow the page in view\."/);
  const { capFirst, pageNumberText } = await import("../lib/readable-names.ts");
  assert.equal(capFirst(pageNumberText("p012")), "Page 12");
});

await check("part 1 (source): the headings of the sections that are not loaded show the same form, with the title from the index", async () => {
  const src = await read("components/HtvBook.tsx");
  assert.match(src, /data-pin=\{`\$\{slug\}\/\$\{name\}`\}/);
  assert.match(src, /data-page-heading=\{`\$\{slug\}\/\$\{name\}`\} title=\{`Page ID \$\{slug\}\/\$\{name\}`\}/);
  assert.match(src, /const bookTitle = staffBookName\(slug, index\.titleEn, index\.titleJa\)\.title;/);
  assert.match(src, /bookTitle=\{bookTitle\}/);
  assert.equal(/<RawId>\{`\$\{slug\}\/\$\{name\}`\}<\/RawId>/.test(src), false, "the visible page ID is gone");
  assert.match(src, /<Tl3Panel key=\{panelN\} panel=\{panelPage\.data\.panel\} slug=\{slug\} bookTitle=\{bookTitle\} \/>/);
});

// ---------------------------------------------------------------- part 2: layout classes (the browser check measures the width)

await check("part 2 (source): the three columns stack below lg and form a row from lg on", async () => {
  const book = await read("components/HtvBook.tsx");
  assert.match(book, /<div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start">/);
  assert.match(book, /<div className="min-w-0 lg:flex-1" data-sections/);
  assert.equal(/<div className="mt-3 flex items-start gap-4">/.test(book), false, "the old row is gone");
  const idx = await read("components/HtvIndex.tsx");
  assert.match(idx, /className="flex max-h-72 min-w-full max-w-full shrink-0 flex-col [^"]*lg:sticky lg:top-3 lg:max-h-\[calc\(100vh-1\.5rem\)\] lg:min-w-0 lg:max-w-none"/);
  const frame = await read("components/HtvPanelFrame.tsx");
  assert.match(frame, /className="flex max-h-\[calc\(100vh-1\.5rem\)\] min-w-full max-w-full shrink-0 flex-col [^"]*lg:sticky lg:top-3 lg:min-w-0 lg:max-w-none"/);
});

await check("part 2 (source): the inline widths and the data attributes stay (the smoke test reads them), and the collapsed bars sit in a wrapper with no box from lg on", async () => {
  const idx = await read("components/HtvIndex.tsx");
  const frame = await read("components/HtvPanelFrame.tsx");
  const book = await read("components/HtvBook.tsx");
  assert.match(frame, /style=\{\{ width, \.\.\.style \}\}/);
  assert.match(frame, /data-panel-width=\{width\}/);
  assert.match(idx, /style=\{\{ width, \.\.\.list\.style \}\}/);
  assert.match(idx, /data-index-width=\{width\}/);
  assert.match(idx, /<div className="lg:contents">\s*<CollapsedBar id="index"/);
  assert.match(book, /<div className="lg:contents">\s*<CollapsedBar id="tl3"/);
  const bars = await read("components/HtvPanelFrame.tsx");
  assert.match(bars, /<aside className="sticky top-3 shrink-0 self-start" style=\{\{ width: BAR_WIDTH \}\}/, "the shared bar (also used by the Reader screens) is not changed");
});

await fs.rm(root, { recursive: true, force: true });
if (fallbackTmp) await fs.rm(fallbackTmp, { recursive: true, force: true });
globalThis.fetch = realFetch;
done();
