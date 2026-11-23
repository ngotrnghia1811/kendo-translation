// VW124 (round 117, card P64.1): server-free tests of the search page /search and the search inside one book.
// Owner request (Q-A 3:115.5, 2026-11-22 05:40 PST): "Implement a comprehensive search function similar to in v1". Owner pick Q-A 3:116.7 "A + B + C" (this unit builds A and B).
// Owner picks: Q-A 3:117.4 "Accept rows 1 to 5" (part A, the page /search), Q-A 3:117.5 "Accept rows 1 to 4" (part B, the search inside one book).
//   part 1  lib/search-core.ts: the fold, the 2-character Japanese query, the marks, the lines and their context, the tabs, the addresses, the newest request wins
//   part 2  the search page data with a fake PocketBase: tab counts, 20 per screen, the gate (who sees what), hidden works, v1 placeholders, the hit address
//   part 3  the search inside one book: all opened pages, grouped by page, the 80 cap and its text, no search column in the answer
//   part 4  the time limit, a database without search columns, a request that is older than the newest one
//   part 5  the two routes: GET only, every write method refused, the link visitor and the waiting reader
//   part 6  the screens and the sources: the bar link, "Search all", the tabs, the buttons, the yellow, no Dictionary tab yet
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw124-test.mjs. The last line is "<n> passed, <m> failed". Made-up data only (example.test addresses). No real PocketBase, no network.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { checker, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/search");
// A fake of next/headers: a cookie jar with get, set, and delete, and a request header list (the same fake as scripts/vw120-test.mjs).
const jar = new Map();
let requestHeaders = new Headers();
globalThis.__vw124 = { jar, headers: () => requestHeaders };
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/headers") {
      const src = `const j = globalThis.__vw124;
export async function cookies(){ return {
  get(n){ const v = j.jar.get(n); return v === undefined ? undefined : { name: n, value: v }; },
  set(n, v){ j.jar.set(n, v); },
  delete(n){ j.jar.delete(n); } }; }
export async function headers(){ return j.headers(); }`;
      return { url: `data:text/javascript,${encodeURIComponent(src)}`, shortCircuit: true };
    }
    return next(specifier, context);
  },
});
const { check, done } = checker();
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const req = createRequire(path.join(app, "package.json"));
const { createElement: h } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");
const strip = (html) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const C = await import("../lib/search-core.ts");
const RS = await import("../lib/reader-search.ts");
const RL = await import("../lib/reader-links.ts");

// ---------------------------------------------------------------- part 1: the pure rules

await check("row 1 (Q-A 3:117.4): the constants are 2 characters, 0.35 s, 20 hits on a screen, 80 hits in a book, and the words are word for word", () => {
  assert.equal(C.SEARCH_PATH, "/search");
  assert.equal(C.SEARCH_MIN_CHARS, 2);
  assert.equal(C.SEARCH_DELAY_MS, 350);
  assert.equal(C.SEARCH_PER_SCREEN, 20);
  assert.equal(C.BOOK_HIT_CAP, 80);
  assert.equal(C.SEARCH_WORDS.none, "No hits. Try other words.");
  assert.equal(C.SEARCH_WORDS.showContext, "Show context");
  assert.equal(C.SEARCH_WORDS.searchAll, "Search all");
  assert.equal(C.SEARCH_WORDS.moreHits, "80+ hits, type more words");
  assert.equal(C.SEARCH_WORDS.title, "Search");
});

await check("the fold: macrons and hyphens go, case goes, and the typed spelling stays in the mark (Chūzumi, ma-ai)", () => {
  assert.equal(C.foldQuery("Chūzumi"), "chuzumi");
  assert.equal(C.foldQuery("Ma-ai"), "maai");
  assert.equal(C.foldQuery("  Seme   ai  "), "seme ai");
  const parts = C.markParts("The Chūzumi is the center.", "chuzumi");
  assert.deepEqual(parts, [{ t: "The " }, { t: "Chūzumi", h: true }, { t: " is the center." }]);
  const dash = C.markParts("Keep the ma-ai.", "maai");
  assert.deepEqual(dash, [{ t: "Keep the " }, { t: "ma-ai", h: true }, { t: "." }]);
});

await check("a 2-character Japanese query (攻め) is ready and finds the text; one character is not ready (no 3-character trigram method)", () => {
  assert.equal(C.searchReady("攻め"), true);
  assert.equal(C.searchReady("攻"), false);
  assert.equal(C.searchReady("a"), false);
  assert.equal(C.searchReady("  a  "), false);
  assert.equal(C.searchReady("ab"), true);
  assert.equal(C.searchReady(""), false);
  const parts = C.markParts("攻めの基本。", "攻め");
  assert.deepEqual(parts, [{ t: "攻め", h: true }, { t: "の基本。" }]);
  assert.deepEqual(C.matchRanges("構えと攻め合い。攻めよ", "攻め"), [
    [3, 5],
    [8, 10],
  ]);
});

await check("a run of spaces and a line break count as one space, like the search columns (a query with a space finds 'Kamae  wo' and 'Kamae\\nwo')", () => {
  assert.equal(C.matchRanges("Kamae  wo toru", "kamae wo").length, 1);
  assert.equal(C.matchRanges("Kamae\nwo toru", "kamae wo").length, 1);
  assert.equal(C.matchRanges("kamae", "kamae wo").length, 0);
  const r = C.matchRanges("a Kamae  wo b", "kamae wo");
  assert.equal("a Kamae  wo b".slice(r[0][0], r[0][1]), "Kamae  wo");
});

await check("markParts: a window of about 140 characters, the dots mark at a cut end, every match in the window is marked, and a text without the words gives null", () => {
  const text = "x".repeat(200) + " seme " + "y".repeat(200) + " seme end";
  const parts = C.markParts(text, "seme");
  assert.equal(parts[0].t, "…");
  assert.equal(parts.at(-1).t, "…");
  assert.equal(parts.filter((p) => p.h).length, 1, "the second match is outside the window");
  const flat = parts.map((p) => p.t).join("");
  assert.ok(flat.length < 170, "length " + flat.length);
  const two = C.markParts("seme and seme", "seme");
  assert.equal(two.filter((p) => p.h).length, 2);
  assert.equal(C.markParts("nothing here", "seme"), null);
  assert.deepEqual(C.markParts("seme", ""), null);
  // a surrogate pair is never cut in the middle
  const emoji = "😀".repeat(100) + "seme" + "😀".repeat(100);
  const p2 = C.markParts(emoji, "seme");
  for (const p of p2) assert.ok(!/[\ud800-\udbff]$/.test(p.t.replace(/…$/, "")) && !/^[\udc00-\udfff]/.test(p.t), "a cut pair");
});

await check("the lines of a page: English and Japanese lines both match, in reading order, with the line before and after in the same language as context", () => {
  const src = {
    rows: [
      { ja: "一行目。", ed3: "First line." },
      { ja: "攻め合い。", ed3: "A contest of seme. Chūzumi is the center line." },
      { ja: "三行目。", ed3: "Third line without the word." },
    ],
    extras: [{ ja: "図 攻め", en: "Figure seme" }],
  };
  const en = C.lineHits(src, [], "chuzumi");
  assert.equal(en.length, 1);
  assert.equal(en[0].lang, "en");
  assert.equal(en[0].before, "First line.");
  assert.equal(en[0].after, "Third line without the word.");
  const both = C.lineHits(src, [], "seme");
  assert.deepEqual(both.map((x) => x.lang + x.order), ["en2", "en6"], "row 2 and the caption");
  const ja = C.lineHits(src, [], "攻め");
  assert.deepEqual(ja.map((x) => x.lang + x.order), ["ja3", "ja7"]);
  assert.equal(ja[0].before, "一行目。", "the context of a Japanese line is the Japanese line before");
  assert.equal(ja[0].after, "三行目。");
  assert.equal(ja[1].before, "三行目。");
  assert.equal(ja[1].after, "");
  const first = C.lineHits({ rows: [{ ja: "", ed3: "seme first" }, { ja: "", ed3: "second" }], extras: [] }, [], "seme");
  assert.equal(first[0].before, "", "no line before the first line");
  assert.equal(first[0].after, "second");
});

await check("the Human version text counts as English lines after the page lines; a page that matches only by the romaji of a term mark gives one term hit", () => {
  const src = { rows: [{ ja: "気合を入れる。", ed3: "Put in spirit.", jaMarks: [{ entryId: "e1" }] }], extras: [], terms: { e1: { romaji: "kiai" } } };
  const withHuman = C.lineHits(src, ["The kiai of the person."], "kiai");
  assert.equal(withHuman.length, 1);
  assert.equal(withHuman[0].lang, "en");
  assert.ok(withHuman[0].parts.some((p) => p.h));
  const termOnly = C.lineHits(src, [], "kiai");
  assert.equal(termOnly.length, 1);
  assert.equal(termOnly[0].term, "kiai");
  assert.ok(termOnly[0].parts.every((p) => !p.h), "no yellow: no line holds the words");
  assert.equal(C.lineHits(src, [], "nothing").length, 0);
  assert.equal(C.lineHits(src, [], "").length, 0);
  assert.equal(C.firstLineHit(src, [], "kiai").term, "kiai");
});

// Unit VW126 (Q-A 3:117.6 row 3): the fourth tab "Dictionary" joined the list, so this check expects four tabs (before: "no Dictionary tab now").
await check("the tabs come from ONE list: All, Books, Pages, Dictionary; a waiting reader gets Books only; a wrong tab falls back to the first tab", () => {
  assert.deepEqual(
    C.SEARCH_TABS.map((t) => t.id),
    ["all", "books", "pages", "dictionary"],
  );
  assert.deepEqual(C.SEARCH_TABS.map((t) => t.label), ["All", "Books", "Pages", "Dictionary"]);
  assert.ok(C.SEARCH_TABS.some((t) => /dictionary/i.test(t.label)));
  assert.deepEqual(C.tabsFor(true), ["all", "books", "pages", "dictionary"]);
  assert.deepEqual(C.tabsFor(false), ["books"]);
  assert.equal(C.pickTab("pages", true), "pages");
  assert.equal(C.pickTab("pages", false), "books");
  assert.equal(C.pickTab("x", true), "all");
  assert.equal(C.pickTab(undefined, true), "all");
  assert.equal(C.pickTab(["pages"], true), "all", "an array is not a tab");
  assert.equal(C.tabLabel("books"), "Books");
});

await check("the address: the words stay in /search?q=..&tab=..&screen=.., a default stays out, and parseSearchParams cuts the words to 80 characters", () => {
  assert.equal(C.searchHref(""), "/search");
  assert.equal(C.searchHref("seme"), "/search?q=seme");
  assert.equal(C.searchHref("seme", "pages"), "/search?q=seme&tab=pages");
  assert.equal(C.searchHref("seme", "pages", 3), "/search?q=seme&tab=pages&screen=3");
  assert.equal(C.searchHref("攻め", "all", 1), "/search?q=%E6%94%BB%E3%82%81");
  const p = C.parseSearchParams({ q: "  " + "a".repeat(100) + " ", tab: "pages", screen: "4" });
  assert.equal(p.q.length, 80);
  assert.equal(p.tab, "pages");
  assert.equal(p.screen, 4);
  assert.deepEqual(C.parseSearchParams({ q: ["x", "y"], screen: "-2" }), { q: "x", tab: "", screen: 1 });
  assert.deepEqual(C.parseSearchParams({ screen: "abc" }), { q: "", tab: "", screen: 1 });
  assert.deepEqual(C.parseSearchParams({}), { q: "", tab: "", screen: 1 });
});

await check("row 3 (Q-A 3:117.4): a hit address is the exact page /read/<book>?view=page&at=pNNN plus the words in q; a book of 4 digits keeps 4 digits; the reading page accepts the at value", () => {
  assert.equal(C.hitHref("made_up_book", 2, 3, "chuzumi"), "/read/made_up_book?view=page&at=p002&q=chuzumi");
  assert.equal(C.hitHref("thousand_book", 12, 4, "kakegoe"), "/read/thousand_book?view=page&at=p0012&q=kakegoe");
  assert.equal(C.hitHref("made_up_book", 2, 3, "攻め"), `/read/made_up_book?view=page&at=p002&q=${encodeURIComponent("攻め")}`);
  assert.equal(C.hitHref("made_up_book", 5, 3, "seme", "scroll"), "/read/made_up_book?view=scroll&at=p005&q=seme");
  assert.ok(C.hitHref("made_up_book", 2, 3, "a b").startsWith(RL.readHref("made_up_book", "page", 2, 3)));
  assert.equal(RL.parseAt("p002", 12), 2);
  assert.equal(RL.parseAt("p0012", 1200), 12);
});

await check("the newest request wins: an older answer that arrives late is dropped", async () => {
  const g = C.newestOnly();
  const a = g.start();
  const b = g.start();
  assert.equal(g.isNewest(a), false);
  assert.equal(g.isNewest(b), true);
  const applied = [];
  const run = async (word, ms) => {
    const id = g.start();
    await new Promise((r) => setTimeout(r, ms));
    if (!g.isNewest(id)) return;
    applied.push(word);
  };
  await Promise.all([run("se", 80), run("seme", 10)]);
  assert.deepEqual(applied, ["seme"], "the slow older request 'se' is dropped, the newest 'seme' is applied");
});

// ---------------------------------------------------------------- part 2: the fake PocketBase

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tokenOf = (id) => `${b64u({ alg: "HS256" })}.${b64u({ id, exp: Math.floor(Date.now() / 1000) + 4 * 3600 })}.sig-${id}`;
const USERS = {
  adm000000000001: { id: "adm000000000001", email: "admin1@example.test", name: "Made Up Admin", role: "admin", approved: true },
  trn000000000001: { id: "trn000000000001", email: "translator1@example.test", name: "Made Up Translator", role: "translator", approved: true },
  rdr000000000001: { id: "rdr000000000001", email: "reader1@example.test", name: "Made Up Reader", role: "reader", approved: true },
  rdr000000000002: { id: "rdr000000000002", email: "reader2@example.test", name: "Made Up Waiting Reader", role: "reader", approved: false },
};
const KEY = "K".repeat(43); // a link that is on
const KEY_OFF = "O".repeat(43);
const liveKey = (k) => k === KEY;

const work = (slug, over = {}) => ({ id: ("cat" + slug).replace(/[^a-z0-9]/g, "").slice(0, 15).padEnd(15, "0"), item_id: slug, kind: "book", title_en: "", title_ja: "", author_en: "", author_ja: "", publisher: "", publish_year: "", pages: 3, row: {}, translated: { en: [] }, placement: {}, ...over });
const WORKS = [
  work("made_up_book", { title_en: "Seme and Kamae", title_ja: "攻めと構え", author_en: "Aiko Example", publisher: "Example Press", publish_year: "2001", pages: 12, row: { synopsis: "A book about pressure. The chapter on seme explains distance." } }),
  work("ma_ai_book", { title_en: "Ma-ai Guide", title_ja: "間合い", pages: 5 }),
  work("many_book", { title_en: "Many Pages Book", pages: 45 }),
  work("cap80_book", { title_en: "Cap Eighty Book", pages: 80 }),
  work("cap81_book", { title_en: "Cap Eighty-one Book", pages: 81 }),
  work("thousand_book", { title_en: "Thousand Pages", pages: 1200 }),
  work("men_full", { title_en: "Men Full" }),
  work("men0", { title_en: "Men Part Zero Hiddenword", row: { part_of: "men_full" } }),
  work("men1", { title_en: "Men Part One Hiddenword", row: { part_of: "men_full" } }),
  work("mental2_clean", { title_en: "Mental Two Clean Hiddenword" }),
  work("web_cap1", { title_en: "Web Capture Hiddenword", kind: "web-capture" }),
];
const HIDDEN = ["men0", "men1", "mental2_clean", "web_cap1"];

const pageRec = (slug, n, rows, extras = [], terms = {}, digits = 3) => {
  const id = `${slug}/p${String(n).padStart(digits, "0")}`;
  const full = rows.map((r, i) => ({ key: `${id}/ts3/T${String(i + 1).padStart(3, "0")}`, shortKey: `T${String(i + 1).padStart(3, "0")}`, part: "lines", ja: r.ja ?? "", ed3: r.ed3 ?? "", jaMarks: r.jaMarks ?? [], edMarks: r.edMarks ?? [] }));
  const romaji = [];
  for (const r of full) for (const m of [...r.jaMarks, ...r.edMarks]) if (terms[m.entryId]?.romaji) romaji.push(terms[m.entryId].romaji);
  const cols = RS.searchColumns({ ja: [...full.map((r) => r.ja), ...extras.map((e) => e.ja)], en: [...full.map((r) => r.ed3), ...extras.map((e) => e.en), ...romaji] });
  return { id: "pg" + Math.random().toString(36).slice(2, 15).padEnd(13, "0"), page_id: id, item_id: slug, n, run_id: "run-1", rows: full, terms, extras, agree: [], search_ja: cols.search_ja, search_en: cols.search_en };
};
const PAGES = [];
PAGES.push(
  pageRec(
    "made_up_book",
    1,
    [
      { ja: "攻めの基本。", ed3: "The basics of seme." },
      { ja: "間合いを取る。", ed3: "Keep the ma-ai." },
    ],
    [{ id: "c1", kind: "caption", ja: "図1 構え", en: "Figure 1 Kamae" }],
  ),
);
PAGES.push(
  pageRec("made_up_book", 2, [
    { ja: "残心を忘れない。", ed3: "Never forget zanshin." },
    { ja: "攻め合い。", ed3: "A contest of seme. Chūzumi is the center line." },
    { ja: "三行目。", ed3: "Third line without the word." },
  ]),
);
PAGES.push(pageRec("made_up_book", 3, [{ ja: "気合を入れる。", ed3: "Put in spirit.", jaMarks: [{ start: 0, end: 2, markId: "m1", entryId: "e1", surface: "気合" }] }], [], { e1: { romaji: "kiai" } }));
PAGES.push(pageRec("ma_ai_book", 1, [{ ja: "間合いは距離である。", ed3: "The ma-ai is the distance." }]));
for (let n = 1; n <= 45; n++) PAGES.push(pageRec("many_book", n, [{ ja: `第${n}節`, ed3: `Tsubazeri number ${n} is the close fight.` }]));
for (let n = 1; n <= 80; n++) PAGES.push(pageRec("cap80_book", n, [{ ja: "打ち込み", ed3: `An uchikomi drill ${n}.` }]));
for (let n = 1; n <= 81; n++) PAGES.push(pageRec("cap81_book", n, [{ ja: "打ち込み", ed3: `An uchikomi drill ${n}.` }]));
PAGES.push(pageRec("thousand_book", 12, [{ ja: "掛け声", ed3: "A kakegoe is a shout." }], [], {}, 4));
for (const s of HIDDEN) PAGES.push(pageRec(s, 1, [{ ja: "隠し", ed3: "Hidden kamae text with hiddenword and seme." }]));
const VERSIONS = [
  { id: "ver000000000001", page_id: "made_up_book/p002", version: 1, run_id: "run-1", chosen_by: "adm000000000001", rows: [{ key: "made_up_book/p002/ts3/T001", text: "Zanshin is the alert mind after the cut.", agree: false, ed3Text: "", jaText: "" }] },
];
const V1_PLACEHOLDERS = [{ id: "v1p000000000001", slug: "made_up_book", n: 9, page_id: "made_up_book/p009", md: "PLACEHOLDERWORD only in the v1 file", sha256: "0".repeat(64) }];

const seen = [];
const behavior = { down: false, delayMs: 0, columnsMissing: false };
const readable = (entry) => {
  // The rule READ_OK of the reader lists: staff, an approved reader, or a key of a live link. A reader who waits gets an empty list.
  if (liveKey(entry.key)) return true;
  const m = /\.sig-([a-z0-9]+)$/.exec(entry.auth);
  const u = m ? USERS[m[1]] : null;
  return !!u && (u.role !== "reader" || u.approved);
};
const evalFilter = (rec, filter) => {
  if (!filter) return true;
  const ids = [...filter.matchAll(/page_id="([^"]*)"/g)].map((m) => m[1]);
  const slug = /item_id="([^"]*)"/.exec(filter)?.[1];
  const qs = [...filter.matchAll(/search_(?:en|ja) ~ "([^"]*)"/g)].map((m) => m[1]);
  if (ids.length) return ids.includes(rec.page_id);
  if (slug && rec.item_id !== slug) return false;
  if (qs.length) return qs.some((q) => String(rec.search_en).includes(q) || String(rec.search_ja).includes(q));
  return true;
};
const server = http.createServer((rq, rs) => {
  const url = new URL(rq.url, "http://x");
  const entry = { method: rq.method, path: url.pathname, url: rq.url, auth: rq.headers.authorization ?? "", key: rq.headers["x-kendo-view-key"] };
  seen.push(entry);
  rq.on("data", () => {});
  rq.on("end", async () => {
    const send = (status, obj) => {
      rs.writeHead(status, { "Content-Type": "application/json" });
      rs.end(JSON.stringify(obj));
    };
    if (behavior.down) return rs.destroy();
    let m;
    if ((m = /^\/api\/collections\/users\/records\/([A-Za-z0-9]+)$/.exec(url.pathname)) && rq.method === "GET") {
      const u = USERS[m[1]];
      if (!u || !entry.auth.endsWith(`.sig-${m[1]}`)) return send(404, { message: "not found" });
      return send(200, u);
    }
    if ((m = /^\/api\/collections\/([a-z_0-9]+)\/records$/.exec(url.pathname)) && rq.method === "GET") {
      const coll = m[1];
      const signedIn = entry.auth !== "" && entry.auth.includes(".sig-");
      const allowed = signedIn || liveKey(entry.key);
      const list = (items) => send(200, { page: 1, perPage: 500, totalPages: 1, totalItems: items.length, items });
      if (!allowed) return list([]);
      const sp = url.searchParams;
      const filter = sp.get("filter") ?? "";
      const fields = sp.get("fields");
      if (coll === "catalog_items") {
        if (fields === "id") return list([{ id: WORKS[0].id }]);
        return list(WORKS.filter((w) => evalFilter(w, filter)));
      }
      if (coll === "v1_placeholders") return list(V1_PLACEHOLDERS);
      if (coll === "reader_pages" || coll === "reader_versions") {
        if (!readable(entry)) return list([]);
        const searching = /search_(en|ja) ~/.test(filter);
        if (searching && behavior.columnsMissing) return send(400, { message: "Invalid filter." });
        if (searching && behavior.delayMs) await new Promise((r) => setTimeout(r, behavior.delayMs));
        let rows = (coll === "reader_pages" ? PAGES : VERSIONS).filter((r) => evalFilter(r, filter));
        const sort = sp.get("sort") ?? "";
        if (sort.startsWith("item_id")) rows = [...rows].sort((a, b) => (a.item_id < b.item_id ? -1 : a.item_id > b.item_id ? 1 : a.n - b.n));
        else if (sort === "n") rows = [...rows].sort((a, b) => a.n - b.n);
        const perPage = Number(sp.get("perPage") ?? 30);
        const pg = Number(sp.get("page") ?? 1);
        rows = rows.slice((pg - 1) * perPage, pg * perPage);
        if (fields) {
          const keep = fields.split(",");
          rows = rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => keep.includes(k))));
        }
        return list(rows);
      }
      return list([]);
    }
    return send(404, { message: "not found: " + rq.method + " " + url.pathname });
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
process.env.VIEWER_CONFIG = path.join(process.env.TMPDIR, "vw124-no-config.json");
process.env.VIEWER_RUN_SOURCE = "pocketbase";
process.env.VIEWER_POCKETBASE_URL = `http://127.0.0.1:${server.address().port}`;
process.env.VIEWER_MONITOR = "off";

/** Start a call as a person. `id`: a made-up user, or null. `link`: the key in the cookie htv_link, or undefined. */
function who(id, link) {
  jar.clear();
  requestHeaders = new Headers();
  if (id) jar.set("htv_token", tokenOf(id));
  if (link !== undefined) jar.set("htv_link", link);
}
const reset = () => {
  seen.length = 0;
  behavior.down = false;
  behavior.delayMs = 0;
  behavior.columnsMissing = false;
};
const calls = (re) => seen.filter((s) => re.test(s.path));
const jreq = (method, p, body = {}, headers = {}) =>
  new Request("http://localhost" + p, { method, headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost", ...headers }, body: method === "GET" ? undefined : JSON.stringify(body) });
const routeCache = new Map();
const routeModule = async (rel) => {
  if (!routeCache.has(rel)) routeCache.set(rel, await import(`../app/api/${rel}/route.ts`));
  return routeCache.get(rel);
};
/** GET /api/read/search with the query string of `params`. */
const api = async (params, rel = "read/search") => {
  const mod = await routeModule(rel);
  const res = await mod.GET(jreq("GET", `/api/${rel}?${new URLSearchParams(params).toString()}`));
  return { status: res.status, json: await res.json().catch(() => ({})) };
};
const D = await import("../lib/search-data.ts");
const asUser = (id) => ({ user: USERS[id], token: tokenOf(id) });

await check("the fake PocketBase answers the made-up books (a sanity check of the test data: 11 works, hidden ones included)", async () => {
  reset();
  who("adm000000000001");
  const r = await api({ q: "seme" });
  assert.equal(r.status, 200);
  assert.ok(calls(/catalog_items/).length >= 1);
  assert.equal(WORKS.length, 11);
  assert.equal(PAGES.length, 3 + 1 + 45 + 80 + 81 + 1 + HIDDEN.length);
});

await check("tab counts: All is Books plus Pages; the answer lists the tabs All, Books, Pages for an approved reader", async () => {
  reset();
  who("rdr000000000001");
  const r = await api({ q: "seme" });
  assert.equal(r.status, 200);
  const j = r.json;
  assert.deepEqual(j.tabs, ["all", "books", "pages", "dictionary"]); // unit VW126: the fourth tab
  assert.equal(j.tab, "all");
  assert.equal(j.counts.books, 1, "made_up_book: title Seme and Kamae");
  assert.equal(j.counts.pages, 2, "p001 'basics of seme' and p002 'contest of seme' (the term romaji of p003 is kiai)");
  assert.equal(j.counts.all, j.counts.books + j.counts.pages);
  assert.equal(j.items.length, 3);
  assert.equal(j.items[0].type, "work", "All: the books come first, then the pages");
  assert.deepEqual(j.items.slice(1).map((x) => x.type), ["page", "page"]);
  assert.equal(j.short, false);
  assert.equal(j.pageSearch, true);
  const b = (await api({ q: "seme", tab: "books" })).json;
  assert.equal(b.tab, "books");
  assert.deepEqual(b.items.map((x) => x.type), ["work"]);
  assert.deepEqual(b.counts, j.counts, "the counts do not change with the tab");
  const p = (await api({ q: "seme", tab: "pages" })).json;
  assert.deepEqual(p.items.map((x) => x.type), ["page", "page"]);
  assert.deepEqual(p.items.map((x) => x.n), [1, 2]);
});

await check("a 2-character Japanese query 攻め finds the book by the Japanese title and the pages by the Japanese text; the line is the Japanese line with 攻め in yellow", async () => {
  reset();
  who("rdr000000000001");
  const j = (await api({ q: "攻め" })).json;
  assert.equal(j.counts.books, 1);
  assert.equal(j.counts.pages, 2);
  const page1 = j.items.find((x) => x.type === "page" && x.n === 1);
  assert.equal(page1.line.lang, "ja");
  assert.deepEqual(page1.line.parts, [{ t: "攻め", h: true }, { t: "の基本。" }]);
  const book = j.items.find((x) => x.type === "work");
  assert.ok(book.titleJa.some((p) => p.h && p.t === "攻め"), "the Japanese title shows the match");
  const one = (await api({ q: "攻" })).json;
  assert.equal(one.short, true);
  assert.equal(one.counts.all, 0);
  assert.deepEqual(one.items, []);
});

await check("the folded search finds the macron spelling: 'chuzumi' finds Chūzumi; the page hit shows the original spelling in yellow, with the line before and after as context", async () => {
  reset();
  who("rdr000000000001");
  const j = (await api({ q: "chuzumi", tab: "pages" })).json;
  assert.equal(j.counts.pages, 1);
  const it = j.items[0];
  assert.equal(it.n, 2);
  assert.equal(it.line.lang, "en");
  assert.deepEqual(it.line.parts.filter((p) => p.h), [{ t: "Chūzumi", h: true }]);
  assert.equal(it.line.before, "Never forget zanshin.");
  assert.equal(it.line.after, "Third line without the word.");
  assert.equal(it.fallback, "");
});

await check("20 hits on a screen: 45 pages give 3 screens (20, 20, 5); a screen number past the end is the last screen; Previous and Next follow", async () => {
  reset();
  who("adm000000000001");
  const s1 = (await api({ q: "tsubazeri", tab: "pages" })).json;
  assert.equal(s1.counts.pages, 45);
  assert.equal(s1.screens, 3);
  assert.equal(s1.screen, 1);
  assert.equal(s1.items.length, 20);
  assert.deepEqual(s1.items.map((x) => x.n), Array.from({ length: 20 }, (_, i) => i + 1));
  const s2 = (await api({ q: "tsubazeri", tab: "pages", screen: "2" })).json;
  assert.deepEqual(s2.items.map((x) => x.n), Array.from({ length: 20 }, (_, i) => i + 21));
  const s3 = (await api({ q: "tsubazeri", tab: "pages", screen: "3" })).json;
  assert.equal(s3.items.length, 5);
  assert.deepEqual(s3.items.map((x) => x.n), [41, 42, 43, 44, 45]);
  const s9 = (await api({ q: "tsubazeri", tab: "pages", screen: "9" })).json;
  assert.equal(s9.screen, 3);
  assert.equal(s9.items.length, 5);
  const s0 = (await api({ q: "tsubazeri", tab: "pages", screen: "0" })).json;
  assert.equal(s0.screen, 1);
  // The pager of the page: Previous only from screen 2 on, Next only before the last screen.
  const { default: SearchPanel } = await import("../components/SearchPanel.tsx");
  const html = (res) => renderToStaticMarkup(h(SearchPanel, { initial: res, query: "tsubazeri", approved: true }));
  const m1 = html(s1);
  const m2 = html(s2);
  const m3 = html(s3);
  assert.ok(!m1.includes("data-search-prev") && m1.includes("data-search-next"));
  assert.ok(m2.includes("data-search-prev") && m2.includes("data-search-next"));
  assert.ok(m3.includes("data-search-prev") && !m3.includes("data-search-next"));
  assert.ok(strip(m2).includes("Screen 2 of 3"));
  assert.ok(m2.includes('href="/search?q=tsubazeri&amp;tab=pages"') || m2.includes('href="/search?q=tsubazeri&tab=pages"'), "Previous of screen 2 is screen 1 (no screen value)");
  assert.ok(m2.includes("screen=3"));
});

await check("the gate (Q-A 3:117.4 row 4): an approved reader, a translator, an admin, and a view-only link visitor all see page hits", async () => {
  for (const [name, id, link] of [["admin", "adm000000000001"], ["translator", "trn000000000001"], ["approved reader", "rdr000000000001"], ["link visitor", null, KEY]]) {
    reset();
    who(id, link);
    const r = await api({ q: "seme" });
    assert.equal(r.status, 200, name);
    assert.deepEqual(r.json.tabs, ["all", "books", "pages", "dictionary"], name); // unit VW126: the fourth tab
    assert.equal(r.json.counts.pages, 2, name);
    assert.equal(r.json.waiting, false, name);
    assert.ok(r.json.items.some((x) => x.type === "page"), name);
  }
});

await check("the gate: a link visitor reads with the key header only and no token; an approved reader with the token and no key", async () => {
  reset();
  who(null, KEY);
  await api({ q: "seme" });
  const pb = calls(/^\/api\/collections\/(catalog_items|reader_pages|reader_versions)\/records$/);
  assert.ok(pb.some((e) => e.path.includes("reader_pages")));
  for (const e of pb) {
    assert.equal(e.key, KEY, e.path);
    assert.equal(e.auth, "", e.path);
  }
  reset();
  who("rdr000000000001", KEY);
  await api({ q: "seme" });
  for (const e of calls(/reader_pages|catalog_items/)) {
    assert.equal(e.key, undefined, "a real session wins over a link cookie");
    assert.equal(e.auth, tokenOf("rdr000000000001"));
  }
});

await check("the gate (Q-A 3:117.4 row 4): a reader who waits for approval sees book hits only: one tab, no page hit, and NO call for page text goes out", async () => {
  reset();
  who("rdr000000000002");
  const r = await api({ q: "seme" });
  assert.equal(r.status, 200);
  const j = r.json;
  assert.deepEqual(j.tabs, ["books"]);
  assert.equal(j.waiting, true);
  assert.equal(j.tab, "books");
  assert.equal(j.counts.pages, 0);
  assert.equal(j.counts.books, 1);
  assert.deepEqual(j.items.map((x) => x.type), ["work"]);
  assert.equal(calls(/reader_pages|reader_versions/).length, 0, "no call for page text");
  const p = (await api({ q: "seme", tab: "pages" })).json;
  assert.equal(p.tab, "books", "the tab Pages is not offered: the tab falls back to Books");
  assert.deepEqual(p.items.map((x) => x.type), ["work"]);
  const text = JSON.stringify([j, p]);
  for (const word of ["basics of seme", "contest of seme", "Chūzumi", "A contest"]) assert.ok(!text.includes(word), word + " in the answer");
  assert.equal(calls(/reader_pages|reader_versions/).length, 0);
});

await check("a waiting reader also gets no page text from the loader when PocketBase would answer: the loader does not ask (direct call)", async () => {
  reset();
  const u = asUser("rdr000000000002");
  const j = await D.loadSearch(u.token, u.user, "zanshin", "pages", 1);
  assert.equal(j.counts.pages, 0);
  assert.equal(calls(/reader_pages|reader_versions/).length, 0);
  const b = await D.loadBookSearch(u.token, u.user, "made_up_book", "zanshin");
  assert.deepEqual(b.groups, []);
  assert.equal(b.waiting, true);
  assert.equal(calls(/reader_pages|reader_versions/).length, 0);
});

await check("hidden works never match (men0, men1, mental2_clean, a web capture): no book hit, no page hit, in any tab, for the admin too", async () => {
  reset();
  who("adm000000000001");
  for (const tab of ["all", "books", "pages"]) {
    const j = (await api({ q: "hiddenword", tab })).json;
    assert.equal(j.counts.all, 0, tab);
    assert.deepEqual(j.items, [], tab);
  }
  const seme = (await api({ q: "seme", tab: "pages" })).json;
  for (const it of seme.items) assert.ok(!HIDDEN.includes(it.slug), it.slug);
  assert.equal(seme.counts.pages, 2, "the 4 hidden pages hold the word seme, but they do not count");
  // The PocketBase answer held them (so the filter is the app's job): the test is real.
  const raw = await (await fetch(`${process.env.VIEWER_POCKETBASE_URL}/api/collections/reader_pages/records?filter=${encodeURIComponent('search_en ~ "hiddenword" || search_ja ~ "hiddenword"')}`, { headers: { Authorization: tokenOf("adm000000000001") } })).json();
  assert.equal(raw.items.length, 4);
});

await check("the v1 placeholder text is not searched: no hit for a word that only the placeholder holds, and no call goes to v1_placeholders", async () => {
  reset();
  who("adm000000000001");
  const j = (await api({ q: "placeholderword" })).json;
  assert.equal(j.counts.all, 0);
  const b = (await api({ slug: "made_up_book", q: "placeholderword" }, "read/book-search")).json;
  assert.equal(b.total, 0);
  assert.equal(calls(/v1_placeholders/).length, 0);
  const src = noComments(read("lib/search-core.ts") + read("lib/search-data.ts"));
  assert.ok(!/v1_placeholders|reader-v1-source|v1Rows|v1PagesOfWork/.test(src), "the search sources never read the v1 files");
});

await check("row 3: a page hit shows the readable book title (never the folder name), the page number, the line, and the address of the exact page with the words", async () => {
  reset();
  who("rdr000000000001");
  const j = (await api({ q: "kakegoe", tab: "pages" })).json;
  assert.equal(j.counts.pages, 1);
  const it = j.items[0];
  assert.equal(it.title, "Thousand Pages");
  assert.equal(it.slug, "thousand_book");
  assert.equal(it.label, "Page 12");
  assert.equal(it.digits, 4);
  assert.equal(it.href, "/read/thousand_book?view=page&at=p0012&q=kakegoe");
  const all = (await api({ q: "tsubazeri", tab: "pages" })).json;
  for (const x of all.items) {
    assert.equal(x.title, "Many Pages Book");
    assert.notEqual(x.title, x.slug);
    assert.equal(x.href, `/read/many_book?view=page&at=p${String(x.n).padStart(3, "0")}&q=tsubazeri`);
  }
  const typed = (await api({ q: "  Chūzumi ", tab: "pages" })).json;
  assert.equal(typed.items[0].href, "/read/made_up_book?view=page&at=p002&q=Ch%C5%ABzumi", "the address keeps the words as typed");
  assert.equal(typed.query, "Chūzumi");
});

await check("a book hit: the title, the Japanese title, the author line, and a synopsis window with the words in yellow; the link goes to the book screen /read/<book>", async () => {
  reset();
  who("rdr000000000001");
  const j = (await api({ q: "distance", tab: "books" })).json;
  assert.equal(j.counts.books, 1);
  const w = j.items[0];
  assert.equal(w.href, "/read/made_up_book");
  assert.equal(w.title.map((p) => p.t).join(""), "Seme and Kamae");
  assert.equal(w.titleJa.map((p) => p.t).join(""), "攻めと構え");
  assert.equal(w.meta.map((p) => p.t).join(""), "Aiko Example · Example Press · 2001");
  assert.ok(w.synopsis.some((p) => p.h && p.t === "distance"));
  const a = (await api({ q: "aiko", tab: "books" })).json;
  assert.ok(a.items[0].meta.some((p) => p.h && p.t === "Aiko"));
});

await check("Show context: a page hit carries the line before and after in the answer, so the button needs no second request", async () => {
  reset();
  who("rdr000000000001");
  const j = (await api({ q: "chuzumi", tab: "pages" })).json;
  const { default: SearchPanel } = await import("../components/SearchPanel.tsx");
  const html = renderToStaticMarkup(h(SearchPanel, { initial: j, query: "chuzumi", approved: true }));
  assert.ok(html.includes("data-context-toggle"));
  assert.ok(strip(html).includes("Show context"));
  assert.ok(!html.includes("data-context-before"), "closed at the start");
  const none = (await api({ q: "ma-ai", tab: "pages" })).json;
  assert.equal(none.counts.pages, 2);
  const single = none.items.find((x) => x.slug === "ma_ai_book");
  assert.equal(single.line.before, "");
  assert.equal(single.line.after, "", "a page with one line has no context");
  const html2 = renderToStaticMarkup(h(SearchPanel, { initial: { ...none, items: [single] }, query: "ma-ai", approved: true }));
  assert.ok(!html2.includes("data-context-toggle"), "no button when there is no context");
  const term = (await api({ q: "kiai", tab: "pages" })).json;
  assert.equal(term.counts.pages, 1);
  assert.equal(term.items[0].line.term, "kiai");
  const html3 = renderToStaticMarkup(h(SearchPanel, { initial: term, query: "kiai", approved: true }));
  assert.ok(html3.includes("data-term-match"));
  assert.ok(!html3.includes("data-context-toggle"));
});

// ---------------------------------------------------------------- part 3: the search inside one book

await check("part B rows 2 and 3: the search inside one book reads all opened pages of that book, grouped by page in page order, each line with the match in yellow", async () => {
  reset();
  who("rdr000000000001");
  const r = await api({ slug: "made_up_book", q: "seme" }, "read/book-search");
  assert.equal(r.status, 200);
  const j = r.json;
  assert.equal(j.slug, "made_up_book");
  assert.deepEqual(j.groups.map((g) => g.n), [1, 2]);
  assert.deepEqual(j.groups.map((g) => g.label), ["Page 1", "Page 2"]);
  assert.equal(j.total, 2);
  assert.equal(j.more, false);
  for (const g of j.groups) for (const hit of g.hits) assert.ok(hit.parts.some((p) => p.h && p.t.toLowerCase() === "seme"));
  const ja = (await api({ slug: "made_up_book", q: "攻め" }, "read/book-search")).json;
  assert.deepEqual(ja.groups.map((g) => g.n), [1, 2]);
  assert.ok(ja.groups.every((g) => g.hits.every((x) => x.lang === "ja")));
  // Only the pages of the one book: the PocketBase filter names the book.
  const one = calls(/reader_pages/).at(-1);
  assert.ok(decodeURIComponent(one.url).includes('item_id="made_up_book"'));
  const other = (await api({ slug: "ma_ai_book", q: "ma-ai" }, "read/book-search")).json;
  assert.deepEqual(other.groups.map((g) => g.n), [1]);
  assert.equal(other.total, 1);
});

await check("a book search hit in the pages of a book counts the English lines and the Japanese lines, and the Human version line, in reading order", async () => {
  reset();
  who("adm000000000001");
  const j = (await api({ slug: "made_up_book", q: "zanshin" }, "read/book-search")).json;
  assert.equal(j.groups.length, 1);
  assert.equal(j.groups[0].n, 2);
  assert.deepEqual(j.groups[0].hits.map((x) => x.lang), ["en", "en"], "the agent line and the Human version line");
  assert.ok(j.groups[0].hits[1].parts.some((p) => p.h && p.t === "Zanshin"));
  const k = (await api({ slug: "made_up_book", q: "kiai" }, "read/book-search")).json;
  assert.equal(k.groups[0].n, 3);
  assert.equal(k.groups[0].hits[0].term, "kiai");
  const caption = (await api({ slug: "made_up_book", q: "figure 1 kamae" }, "read/book-search")).json;
  assert.equal(caption.total, 1, "a caption is a line too");
});

await check("part B row 3: at most 80 hits, then 'more': 80 pages give 80 hits and no more; 81 pages give 80 hits and the text '80+ hits, type more words'", async () => {
  reset();
  who("rdr000000000001");
  const e80 = (await api({ slug: "cap80_book", q: "uchikomi" }, "read/book-search")).json;
  assert.equal(e80.total, 80);
  assert.equal(e80.groups.length, 80);
  assert.equal(e80.more, false, "exactly 80 hits: no more");
  const e81 = (await api({ slug: "cap81_book", q: "uchikomi" }, "read/book-search")).json;
  assert.equal(e81.total, 80);
  assert.equal(e81.more, true);
  assert.deepEqual(e81.groups.map((g) => g.n).slice(0, 3), [1, 2, 3]);
  assert.equal(e81.groups.at(-1).n, 80);
  assert.equal(C.SEARCH_WORDS.moreHits, "80+ hits, type more words");
  // Japanese and English lines of one page both count as hits: 41 pages x 2 lines = 82 hits, so the list stops at 80 inside a page group.
  const both = (await api({ slug: "cap81_book", q: "打ち込み" }, "read/book-search")).json;
  assert.equal(both.total, 80);
  assert.equal(both.more, true);
  // The source of the screen shows the text when `more` is true.
  const src = noComments(read("components/BookSearch.tsx"));
  assert.ok(src.includes("shown.more ?") && src.includes("SEARCH_WORDS.moreHits"));
});

await check("the book search takes no search column from PocketBase (the columns hold up to 100,000 characters) and asks for at most 81 records in one call", async () => {
  reset();
  who("rdr000000000001");
  await api({ slug: "cap81_book", q: "uchikomi" }, "read/book-search");
  const call = calls(/reader_pages/).at(-1);
  const sp = new URL(call.url, "http://x").searchParams;
  assert.ok(!sp.get("fields").includes("search_"), sp.get("fields"));
  assert.equal(sp.get("perPage"), "81");
  assert.equal(sp.get("sort"), "n");
  assert.equal(call.method, "GET");
});

await check("the book search never shows a hidden work, an unknown book, or a missing or unsafe slug", async () => {
  reset();
  who("adm000000000001");
  for (const slug of HIDDEN) {
    const j = (await api({ slug, q: "seme" }, "read/book-search")).json;
    assert.equal(j.total, 0, slug);
    assert.deepEqual(j.groups, [], slug);
  }
  assert.equal((await api({ slug: "no_such_book", q: "seme" }, "read/book-search")).json.total, 0);
  for (const slug of ["", "../x", "a/b", ".hidden", "a b"]) {
    const r = await api({ slug, q: "seme" }, "read/book-search");
    assert.equal(r.status, 400, JSON.stringify(slug));
  }
  assert.equal((await api({ q: "seme" }, "read/book-search")).status, 400);
  const short = (await api({ slug: "made_up_book", q: "a" }, "read/book-search")).json;
  assert.equal(short.short, true);
  assert.equal(short.total, 0);
});

// ---------------------------------------------------------------- part 4: the time limit, no columns, a late answer

await check("the time limit: a page search that runs too long stops; the answer holds the book hits, the flag timedOut, and no error", async () => {
  reset();
  behavior.delayMs = 500;
  const u = asUser("adm000000000001");
  const t0 = Date.now();
  const j = await D.loadSearch(u.token, u.user, "seme", "all", 1, 80);
  const took = Date.now() - t0;
  assert.equal(j.timedOut, true);
  assert.equal(j.counts.books, 1);
  assert.equal(j.counts.pages, 0);
  assert.ok(j.items.some((x) => x.type === "work"));
  assert.ok(took < 450, "stopped at the limit, not after the delay: " + took + " ms");
  const b = await D.loadBookSearch(u.token, u.user, "made_up_book", "seme", 80);
  assert.equal(b.timedOut, true);
  assert.deepEqual(b.groups, []);
  assert.equal(C.SEARCH_TIME_LIMIT_MS, 8000);
  assert.equal(C.SEARCH_WORDS.timedOut, "The search took too long. Type more words.");
  behavior.delayMs = 0;
});

await check("a database without the search columns (PocketBase answers 400): the book hits stay and the answer says pageSearch false; the book search too", async () => {
  reset();
  behavior.columnsMissing = true;
  const u = asUser("rdr000000000001");
  const j = await D.loadSearch(u.token, u.user, "seme", "all", 1);
  assert.equal(j.pageSearch, false);
  assert.equal(j.counts.books, 1);
  assert.equal(j.counts.pages, 0);
  const b = await D.loadBookSearch(u.token, u.user, "made_up_book", "seme");
  assert.equal(b.pageSearch, false);
  assert.equal(b.total, 0);
  behavior.columnsMissing = false;
});

await check("a PocketBase that is down gives the plain error of the route (503), never a crash", async () => {
  reset();
  who("rdr000000000001");
  const ok = await api({ q: "seme" });
  assert.equal(ok.status, 200);
  behavior.down = true;
  const r = await api({ q: "seme" });
  assert.ok(r.status === 503 || r.status === 401 || r.status === 500, "status " + r.status);
  behavior.down = false;
});

// ---------------------------------------------------------------- part 5: the routes

const WRITE = ["POST", "PUT", "PATCH", "DELETE"];
await check("rows 1 to 4 (read only): the two routes answer GET only: every write method gives 405 with Allow: GET, before any session, for every kind of visitor", async () => {
  for (const rel of ["read/search", "read/book-search"]) {
    const mod = await routeModule(rel);
    assert.equal(typeof mod.GET, "function", rel);
    for (const m of WRITE) assert.equal(typeof mod[m], "function", `${rel} ${m} is defined as a refusal`);
    for (const [name, id, link] of [["no session", null], ["link visitor", null, KEY], ["dead link", null, KEY_OFF], ["approved reader", "rdr000000000001"], ["waiting reader", "rdr000000000002"], ["translator", "trn000000000001"], ["admin", "adm000000000001"]]) {
      for (const m of WRITE) {
        reset();
        who(id, link);
        const res = await mod[m](jreq(m, `/api/${rel}?q=seme&slug=made_up_book`, { q: "seme" }));
        assert.equal(res.status, 405, `${rel} ${m} ${name}`);
        assert.equal(res.headers.get("allow"), "GET");
        assert.equal(seen.length, 0, `${rel} ${m} ${name}: PocketBase sees nothing`);
      }
    }
    for (const m of ["HEAD", "OPTIONS", "TRACE"]) assert.equal(mod[m], undefined, `${rel} has no ${m} handler of its own`);
  }
});

await check("GET without a session answers 401 'Sign in first.'; a dead link answers 401 'This link no longer works.'; PocketBase sees no page text call", async () => {
  for (const rel of ["read/search", "read/book-search"]) {
    reset();
    who(null);
    const a = await api({ q: "seme", slug: "made_up_book" }, rel);
    assert.equal(a.status, 401, rel);
    assert.equal(a.json.error, "Sign in first.");
    who(null, KEY_OFF);
    const b = await api({ q: "seme", slug: "made_up_book" }, rel);
    assert.equal(b.status, 401, rel);
    assert.equal(b.json.error, "This link no longer works.");
    assert.equal(calls(/reader_pages|reader_versions/).length, 0, rel);
  }
});

await check("a link visitor reads both routes (GET only) and the book search answers hits; a waiting reader gets 200 with no hit from the book search", async () => {
  reset();
  who(null, KEY);
  const a = await api({ slug: "made_up_book", q: "seme" }, "read/book-search");
  assert.equal(a.status, 200);
  assert.equal(a.json.total, 2);
  for (const e of calls(/reader_pages/)) {
    assert.equal(e.key, KEY);
    assert.equal(e.auth, "");
    assert.equal(e.method, "GET");
  }
  reset();
  who("rdr000000000002");
  const w = await api({ slug: "made_up_book", q: "seme" }, "read/book-search");
  assert.equal(w.status, 200);
  assert.equal(w.json.waiting, true);
  assert.equal(w.json.total, 0);
  assert.equal(calls(/reader_pages|reader_versions/).length, 0);
});

await check("every call that the two routes send to PocketBase is a GET (a link visitor and a signed-in person alike)", async () => {
  reset();
  who(null, KEY);
  await api({ q: "seme" });
  await api({ q: "kamae", slug: "made_up_book" }, "read/book-search");
  who("adm000000000001");
  await api({ q: "seme" });
  await api({ q: "kamae", slug: "made_up_book" }, "read/book-search");
  assert.ok(seen.length > 6);
  for (const e of seen) assert.equal(e.method, "GET", e.path);
});

// ---------------------------------------------------------------- part 6: the screens and the sources

await check("row 1: the bar of every reader page has the link Search (also for a link visitor and a waiting reader); on /search it is the current page and All books is a link", async () => {
  const { default: ReaderBar } = await import("../components/ReaderBar.tsx");
  for (const [name, props] of [
    ["reader", { name: "A", email: "a@example.test", role: "reader", approved: true }],
    ["waiting", { name: "A", email: "a@example.test", role: "reader", approved: false }],
    ["admin", { name: "A", email: "a@example.test", role: "admin", approved: true }],
    ["link visitor", { name: "View-only link", email: "", role: "reader", approved: true, linkVisitor: true }],
  ]) {
    const html = renderToStaticMarkup(h(ReaderBar, props));
    assert.ok(html.includes('href="/search"'), name);
    assert.ok(strip(html).includes("Search"), name);
    assert.ok(html.includes("data-search-link"), name);
  }
  const here = renderToStaticMarkup(h(ReaderBar, { name: "A", email: "a@example.test", role: "reader", approved: true, onSearch: true }));
  assert.ok(here.includes('aria-current="page"'));
  assert.match(here, /<a class="text-accent underline" href="\/read">All books<\/a>/);
  assert.match(here, /<a class="font-semibold" aria-current="page" data-search-link="true" href="\/search">Search<\/a>/);
  const book = renderToStaticMarkup(h(ReaderBar, { name: "A", email: "a@example.test", role: "reader", approved: true, backHref: "/read/made_up_book" }));
  assert.ok(book.includes('href="/search"') && book.includes("Book page"));
});

await check("row 5: the box on /read stays and gets the link Search all (to /search with the same words); the box of /translate gets no such link", async () => {
  const RSB = await import("../components/ReaderSearch.tsx");
  const { default: SearchAllLink } = await import("../components/SearchAllLink.tsx");
  const box = renderToStaticMarkup(h(RSB.SearchBox, { query: "seme" }, h(SearchAllLink, { query: "seme" })));
  assert.ok(box.includes("data-search-form") && box.includes('name="q"') && box.includes('value="seme"'));
  assert.ok(box.includes('href="/search?q=seme"'));
  assert.ok(strip(box).includes("Search all"));
  const plain = renderToStaticMarkup(h(RSB.SearchBox, { query: "", action: "/translate" }));
  assert.ok(!plain.includes("Search all"));
  const page = read("app/read/page.tsx");
  assert.ok(page.includes("<SearchAllLink query={search?.query ?? \"\"} />"));
  assert.ok(!read("components/TranslateSearch.tsx").includes("SearchAllLink"));
  const empty = renderToStaticMarkup(h(SearchAllLink, { query: "" }));
  assert.ok(empty.includes('href="/search"'));
});

await check("the search page draws the first result on the server from the address, so a reload or a shared link shows the list (the tabs with counts, the hits, the yellow)", async () => {
  reset();
  who("rdr000000000001");
  const j = (await api({ q: "seme" })).json;
  const { default: SearchPanel } = await import("../components/SearchPanel.tsx");
  const html = renderToStaticMarkup(h(SearchPanel, { initial: j, query: "seme", approved: true }));
  const text = strip(html);
  assert.ok(text.includes("All (3)") && text.includes("Books (1)") && text.includes("Pages (2)"), text.slice(0, 300));
  // Unit VW126: the Dictionary tab shows with its count (the made-up database of this test has no dictionary list, so the count is 0).
  assert.ok(text.includes("Dictionary (0)"), "the Dictionary tab with its count");
  assert.ok(text.includes("3 hits for seme"));
  assert.ok(html.includes('value="seme"'));
  assert.ok(html.includes("bg-amber-200"), "the match is yellow");
  assert.ok(html.includes("<mark"));
  assert.ok(html.includes('data-hit-page="made_up_book/p001"'));
  assert.ok(html.includes('href="/read/made_up_book?view=page&amp;at=p001&amp;q=seme"'));
  assert.ok(html.includes('data-hit-book="made_up_book"'));
  assert.ok(html.includes('data-search-tab="pages"') && html.includes('aria-current="page"'));
  const none = (await api({ q: "zzzzqq" })).json;
  const emptyHtml = renderToStaticMarkup(h(SearchPanel, { initial: none, query: "zzzzqq", approved: true }));
  assert.ok(strip(emptyHtml).includes("No hits. Try other words."));
  assert.ok(strip(emptyHtml).includes("0 hits for zzzzqq"));
  const blank = renderToStaticMarkup(h(SearchPanel, { initial: null, query: "", approved: true }));
  assert.ok(strip(blank).includes("Type at least 2 characters."));
});

await check("a waiting reader sees the note 'Page text search opens after approval.' and the one tab Books on the page", async () => {
  reset();
  who("rdr000000000002");
  const j = (await api({ q: "seme" })).json;
  const { default: SearchPanel } = await import("../components/SearchPanel.tsx");
  const html = renderToStaticMarkup(h(SearchPanel, { initial: j, query: "seme", approved: false }));
  const text = strip(html);
  assert.ok(text.includes("Page text search opens after approval."));
  assert.ok(text.includes("Books (1)"));
  assert.ok(!text.includes("Pages (") && !text.includes("All ("));
  assert.ok(html.includes('data-hit-book="made_up_book"') && !html.includes("data-hit-page"));
});

await check("the sources: both routes opt in with mutating false and allowLink; the page uses requireReaderOrLink; the client files send GET requests only and ask whether the answer is the newest", () => {
  for (const f of ["app/api/read/search/route.ts", "app/api/read/book-search/route.ts"]) {
    const s = noComments(read(f));
    assert.ok(/guard\(req, \{ mutating: false, allowLink: true \}\)/.test(s), f);
    assert.ok(!/export (async )?function (POST|PUT|PATCH|DELETE)/.test(s), f);
    assert.ok(/export const (POST|PUT|PATCH|DELETE) = refuseWrite;/.test(s), f);
    assert.ok(s.includes('export const dynamic = "force-dynamic"'), f);
  }
  const page = noComments(read("app/search/page.tsx"));
  assert.ok(page.includes('requireReaderOrLink("/search")') && page.includes('export const dynamic = "force-dynamic"'));
  for (const f of ["components/SearchPanel.tsx", "components/BookSearch.tsx"]) {
    const s = noComments(read(f));
    assert.ok(/^"use client"/.test(read(f)), f);
    assert.ok(!/method:\s*["'](POST|PUT|PATCH|DELETE)/.test(s), f + " sends no write");
    assert.ok((s.match(/newest\.isNewest\(id\)/g) ?? []).length >= 4, f + " drops an older answer");
    assert.ok(s.includes("abort.current?.abort()"), f + " stops the older request");
    assert.ok(s.includes("SEARCH_DELAY_MS"), f);
    assert.ok(!/view-link-(pb|server|cookie)|node:crypto|server-only/.test(read(f)), f + " holds no key helper");
  }
  const cssa = read("app/globals.css");
  assert.ok(cssa.includes("::highlight(search-hit)") && cssa.includes("var(--color-amber-200"));
});

await check("part B rows 1 and 4: the book screen has the box, the reading view has the button and the / key (not in a text field, not under a panel) and Escape; a hit link goes to the page in the view that is in use", () => {
  const book = noComments(read("components/ReaderBook.tsx"));
  assert.ok(book.includes('<BookSearch slug={index.slug} view={s.view} mode="screen" />'));
  assert.ok(book.includes('mode="reading"') && book.includes("data-book-search-open"));
  assert.ok(book.includes("blocked={showSettings || showList || firstVisit || picked !== null || sheet}"));
  assert.ok(book.includes("<SearchMark at={at} view={s.view} />"));
  const bs = noComments(read("components/BookSearch.tsx"));
  assert.ok(bs.includes('e.key !== "/"') && bs.includes("INPUT|TEXTAREA|SELECT") && bs.includes("isContentEditable"));
  assert.ok(bs.includes('e.key === "Escape"'));
  assert.ok(bs.includes("e.ctrlKey || e.metaKey || e.altKey"));
  assert.ok(bs.includes("hitHref(slug, g.n, g.digits, text.trim(), view)"));
  assert.equal((book.match(/sendJson\(/g) ?? []).length, 3, "the old rule of VW120: no new write call in ReaderBook");
  const mark = noComments(read("components/SearchMark.tsx"));
  assert.ok(mark.includes("CSS") && mark.includes("highlights") && mark.includes("MutationObserver"));
});

await check("the files that this unit adds hold no key or token helper, no console call, and no word 'agent' or model name on a reader screen", () => {
  const files = ["lib/search-core.ts", "lib/search-data.ts", "lib/search-refuse.ts", "components/SearchPanel.tsx", "components/SearchMarked.tsx", "components/SearchMark.tsx", "components/BookSearch.tsx", "components/SearchAllLink.tsx", "app/search/page.tsx", "app/search/layout.tsx", "app/search/loading.tsx", "app/api/read/search/route.ts", "app/api/read/book-search/route.ts"];
  for (const f of files) {
    const s = read(f);
    assert.ok(!/console\.(log|warn|info|debug)/.test(noComments(s)), f + " logs");
    assert.ok(!/gloss|rendering/i.test(noComments(s)), f + " uses a banned word");
  }
  const words = JSON.stringify(C.SEARCH_WORDS);
  assert.ok(!/agent|model|gpt|claude/i.test(words), words);
  for (const f of ["lib/search-data.ts", "lib/search-core.ts"]) assert.ok(!/verdict|reasoning|TL_3|page_runs/i.test(noComments(read(f))), f + " reads the research layer");
  assert.ok(read("lib/search-data.ts").startsWith('import "server-only";'));
  assert.ok(!/import ["']server-only["']/.test(read("lib/search-core.ts")), "search-core is client-safe");
  // Unit VW126: search-core takes the type DictItemView from lib/dictionary-core.ts (a client-safe module without server-only), so the list holds four modules.
  assert.ok(!/^import /m.test(read("lib/search-core.ts").replace(/^import [^\n]*(reader-search|reader-types|reader-links|dictionary-core)[^\n]*$/gm, "")), "search-core imports only the four client-safe modules");
});

await new Promise((resolve) => server.close(resolve));
const failed = done();
process.exit(failed ? 1 : 0);
