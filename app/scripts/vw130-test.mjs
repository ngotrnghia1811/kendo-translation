// Unit VW130 (Q-A 3:133.2 "Accept rows 1 to 4" and the note "add the vector-map button in http://localhost:3000/monitor/left_foot_full"):
// server-free tests of the book choice of the vector map (/monitor/vector-map) and of the button "Vector map" on the Monitor book page (/monitor/<book>).
// Part 1: the rules (lib/vector-map-rules.ts): the book name check, the choice of the book, the label, the options, the address of the button.
// Part 2: the loader (lib/vector-map-load.ts) on a made-up data folder: the files of one book, no mix with the paired dataset or with phase 3,
//         0, some, and all score files, a half-written score file, the book list, the check of a book that has versions, no write.
// Part 3: the markup: the select, the links that keep `book`, the paired map without any `book` key, the page with a known, an unknown, and a bad book,
//         the button on the book page (shown with versions, hidden without).
// Made-up data only, below TMPDIR. The test writes no file outside its made-up folder and calls no server.
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw130-test.mjs. It prints "<n> passed, <m> failed" and exits 1 on a failure.
import assert from "node:assert/strict";
import { readFileSync, promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { checker, htmlText, installAppHooks, madeUpRoot, snapshot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
installAppHooks(app);
globalThis.fetch = async () => {
  throw new Error("Network is disabled in VW130 tests.");
};
const require = createRequire(path.join(app, "package.json"));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const h = (C, props) => renderToStaticMarkup(React.createElement(C, props));
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const { check, done } = checker();

const R = await import("../lib/vector-map-rules.ts");
const L = await import("../lib/vector-map-load.ts");
const View = await import("../components/VectorMapView.tsx");

// ---------------------------------------------------------------- made-up prompt versions
const P1 = ["You are a made-up box.", "1. Read the text.", "   1.1. Never skip a line.", "2. You must write the answer. See point 1.1.", ""].join("\n");
const P2 = ["You are a made-up box.", "1. Read the text.", "   1.1. Never skip a line. You must read it twice.", "   2.1. Do not guess a name. Check the dictionary entry first.", "3. You must write the answer. See point 1.1.", ""].join("\n");
const P3 = ["You are a made-up box.", "1. Read the text.", "   2.1. Do not guess a name. Check the dictionary entry first.", "3. You must write the answer. See point 1.1.", ""].join("\n");
const vfile = (book, box, version, parent, text, phase) => ({
  box,
  version,
  parent: parent ? { version: parent, path: `${book}/prompts/${box}/${parent}.json` } : null,
  sha1: `sha-${book}-${version}`,
  text,
  created_utc: "2026-11-23T04:42:16Z",
  phase,
  update_point: parent ? "p038" : null,
  group_ids: parent ? ["CG-1"] : [],
  critique_ids: parent ? [`${box}:${book}/p038:1`] : [],
  audit: null,
  cost_usd: 0,
});
const scoreOf = (book, box, version, pcts) => ({
  box,
  version,
  sha1: `sha-${book}-${version}`,
  model: "made-up",
  points: pcts.map((p, i) => ({ num: ["1", "1.1", "2.1", "3"][i] ?? String(i + 1), importance_pct: p, comprehensiveness_pct: 25 })),
});

const { root, w } = await madeUpRoot("vw130-");
const LF = "left_foot_full";
// the book: QA_1 with 3 versions, TL_0 with 1 version (4 files in 2 boxes), a pointer file "current" (not a version)
for (const [v, p, t] of [["v4.1.0", null, P1], ["v4.1.1", "v4.1.0", P2], ["v4.1.2", "v4.1.1", P3]]) await w(`book-store/${LF}/prompts/QA_1/${v}.json`, vfile(LF, "QA_1", v, p, t, 4));
await w(`book-store/${LF}/prompts/QA_1/current`, "v4.1.2");
await w(`book-store/${LF}/prompts/TL_0/v4.1.0.json`, vfile(LF, "TL_0", "v4.1.0", null, P1, 4));
// folders of the score script that are no box type (the real folder has calls/ and logs/)
await w(`book-store/${LF}/point-scores/logs/point-scores-1.log`, "made-up log");
await w(`book-store/${LF}/point-scores/calls/QA_1/x.json`, "{}");
// phase 3 prompts of the same book: the map must not read them
await w(`book-store/${LF}/agent-phase-3/prompts/QA_1/v3.9.9.json`, vfile(LF, "QA_1", "v3.9.9", null, P1, 3));
// the paired dataset: its own QA_1 versions, and a score file with the SAME sha1 pattern as the book would have (it must not leak into the book map)
await w("book-store/paired-dataset/prompts/QA_1/v2.1.0.json", vfile("paired-dataset", "QA_1", "v2.1.0", null, P1, 2));
await w("book-store/paired-dataset/prompts/QA_1/v2.1.1.json", vfile("paired-dataset", "QA_1", "v2.1.1", "v2.1.0", P2, 2));
await w("book-store/paired-dataset/point-scores/QA_1/v4.1.1.json", scoreOf(LF, "QA_1", "v4.1.1", [10, 20, 30, 40]));
// folders that are no book with versions
await w("book-store/empty_book/prompts/QA_1/current", "v1.0.0");
await w("book-store/no_prompts/status.json", "{}");
await w("book-store/has space/prompts/QA_1/v1.0.0.json", vfile("x", "QA_1", "v1.0.0", null, P1, 4));
await w("book-store/only_phase3/agent-phase-3/prompts/QA_1/v3.0.0.json", vfile("only_phase3", "QA_1", "v3.0.0", null, P1, 3));
await w("book-store/aaa_book/prompts/ED_2/v4.1.0.json", vfile("aaa_book", "ED_2", "v4.1.0", null, P1, 4));
await w("book-store/aaa_book/prompts/ED_2/v4.1.1.json", vfile("aaa_book", "ED_2", "v4.1.1", "v4.1.0", P2, 4));
await w("book-store/some-file-in-store.txt", "not a folder");
// titles of the Monitor pages (item-metadata/items.filled.jsonl)
await w("item-metadata/items.filled.jsonl", [{ item_id: LF, kind: "book", title_en: "The Secret of Kendo and the Left Foot", title_ja: "剣道の極意と左足" }].map((r) => JSON.stringify(r)).join("\n") + "\n");

// ---------------------------------------------------------------- part 1: the rules

await check("book name: a safe folder name passes; a path part, a space, a dot start, a long name, and a non-text fail", () => {
  for (const ok of ["left_foot_full", "100_practice_full", "ki_breath_full_clean", "paired-dataset", "a.b-c_d", "x".repeat(80)]) assert.equal(R.isBookSlug(ok), true, ok);
  for (const bad of ["", ".", "..", "../x", "a/b", "a\\b", ".hidden", "a b", "a%2fb", "a..b", "x".repeat(81), "é", "a\0b", null, undefined, 5, ["left_foot_full"]]) assert.equal(R.isBookSlug(bad), false, String(bad));
});

await check("choice of the book: none or paired gives the paired dataset; a known book stays; an unknown or bad name gives the paired dataset and a note (never a 404)", () => {
  const books = [{ slug: LF, versions: 4 }, { slug: "aaa_book", versions: 2 }];
  assert.deepEqual(R.resolveBook(null, books), { book: "paired-dataset", note: null });
  assert.deepEqual(R.resolveBook("", books), { book: "paired-dataset", note: null });
  assert.deepEqual(R.resolveBook("paired-dataset", books), { book: "paired-dataset", note: null });
  assert.deepEqual(R.resolveBook(LF, books), { book: LF, note: null });
  for (const bad of ["nope_book", "../../etc", "a/b", "..", LF + " ", LF.toUpperCase(), "x".repeat(200)]) {
    const r = R.resolveBook(bad, books);
    assert.equal(r.book, "paired-dataset", bad);
    assert.equal(r.note, R.BOOK_FALLBACK_NOTE, bad);
    assert.ok(!r.note.includes(bad.slice(0, 6)) || bad.length < 6, "the note does not echo the name");
  }
  assert.deepEqual(R.resolveBook(LF, []), { book: "paired-dataset", note: R.BOOK_FALLBACK_NOTE }, "a book that is not in the list of books with versions");
});

await check("label and options: '<title> (<folder>)' or the folder alone; options sorted by label; the paired dataset is not an option", () => {
  assert.equal(R.bookLabel(LF, "The Secret of Kendo and the Left Foot"), "The Secret of Kendo and the Left Foot (left_foot_full)");
  assert.equal(R.bookLabel("aaa_book", undefined), "aaa_book");
  assert.equal(R.bookLabel("aaa_book", ""), "aaa_book");
  const o = R.bookOptions([{ slug: LF, versions: 4 }, { slug: "paired-dataset", versions: 9 }, { slug: "zzz_book", versions: 1 }, { slug: "aaa_book", versions: 2 }], new Map([[LF, "The Secret of Kendo and the Left Foot"]]));
  assert.deepEqual(o.map((x) => x.slug), ["aaa_book", LF, "zzz_book"], "the label 'The Secret ...' sorts between aaa_book and zzz_book");
  assert.equal(o[1].label, "The Secret of Kendo and the Left Foot (left_foot_full)");
  assert.equal(o[1].versions, 4);
});

await check("button address: /monitor/vector-map?book=<book>, encoded", () => {
  assert.equal(R.vectorMapBookHref(LF), "/monitor/vector-map?book=left_foot_full");
  assert.equal(R.vectorMapBookHref("a b&c"), "/monitor/vector-map?book=a%20b%26c");
  assert.equal(R.VECTOR_MAP_PATH, "/monitor/vector-map");
  assert.equal(View.VM_PATH, "/monitor/vector-map");
});

// ---------------------------------------------------------------- part 2: the loader

await check("loader: the book root gives the versions of that book only (no paired dataset, no phase 3, no 'current' file), and writes nothing", async () => {
  const before = await snapshot(root);
  const m = await L.loadBoxMap(root, "QA_1", LF);
  assert.deepEqual(m.versions.map((v) => v.version), ["v4.1.0", "v4.1.1", "v4.1.2"]);
  assert.equal(m.fallback, false);
  const tl = await L.loadBoxMap(root, "TL_0", LF);
  assert.deepEqual(tl.versions.map((v) => v.version), ["v4.1.0"]);
  const paired = await L.loadBoxMap(root, "QA_1");
  assert.deepEqual(paired.versions.map((v) => v.version), ["v2.1.0", "v2.1.1"], "no book argument: the paired dataset, as before");
  assert.deepEqual((await L.loadBoxMap(root, "QA_1", "paired-dataset")).versions.map((v) => v.version), ["v2.1.0", "v2.1.1"]);
  assert.deepEqual((await L.loadBoxMap(root, "ED_3", LF)).versions, [], "a box with no folder: a map without versions");
  const counts = await L.versionCounts(root, R.BOX_TYPES, LF);
  assert.equal(counts.QA_1, 3);
  assert.equal(counts.TL_0, 1);
  assert.equal(counts.ED_2, 0);
  assert.equal((await L.versionCounts(root, R.BOX_TYPES)).QA_1, 2);
  assert.deepEqual(await snapshot(root), before, "the loader wrote nothing");
});

await check("loader: a book name that leaves book-store throws before any read; the folder helpers keep the old paired path", async () => {
  for (const bad of ["../x", "a/b", "..", "", "a b", "../../etc"]) {
    await assert.rejects(L.loadBoxMap(root, "QA_1", bad), /Bad book folder name/, bad);
    await assert.rejects(L.versionCounts(root, ["QA_1"], bad), /Bad book folder name/, bad);
    assert.throws(() => L.promptsDir(root, "QA_1", bad), /Bad book folder name/, bad);
  }
  assert.equal(L.promptsDir(root, "QA_1"), path.join(root, "book-store", "paired-dataset", "prompts", "QA_1"));
  assert.equal(L.scoresDir(root, "QA_1"), path.join(root, "book-store", "paired-dataset", "point-scores", "QA_1"));
  assert.equal(L.promptsDir(root, "QA_1", LF), path.join(root, "book-store", LF, "prompts", "QA_1"));
  assert.equal(L.scoresDir(root, "QA_1", LF), path.join(root, "book-store", LF, "point-scores", "QA_1"));
});

await check("scores: 0 score files = every version 'Not measured'; the paired score file of the same version name does not leak into the book", async () => {
  const m = await L.loadBoxMap(root, "QA_1", LF);
  assert.ok(m.versions.every((v) => !v.measured), "no score file in the book folder");
  assert.ok(m.versions.every((v) => v.points.every((p) => p.model === null || p.model === undefined)));
});

await check("scores: some score files = only those versions are measured; a new file rebuilds the map; a half-written file is skipped, not an error", async () => {
  await w(`book-store/${LF}/point-scores/QA_1/v4.1.1.json`, scoreOf(LF, "QA_1", "v4.1.1", [10, 20, 30, 40]));
  await w(`book-store/${LF}/point-scores/QA_1/v4.1.2.json`, '{"box":"QA_1","version":"v4.1.2","sha1":"sha-left_foot_full-v4.1.2","points":[{"num":"1","importance');
  const m = await L.loadBoxMap(root, "QA_1", LF);
  assert.deepEqual(m.versions.map((v) => v.measured), [false, true, false]);
  assert.deepEqual(m.versions[1].points.find((p) => p.num === "2.1").model, { comp: 25, imp: 30 });
  assert.equal(m.max.modelImp, 40);
  // a score file of another prompt text (sha1) is 'Not measured'
  await w(`book-store/${LF}/point-scores/QA_1/v4.1.0.json`, { ...scoreOf(LF, "QA_1", "v4.1.0", [1, 2, 3]), sha1: "another" });
  assert.deepEqual((await L.loadBoxMap(root, "QA_1", LF)).versions.map((v) => v.measured), [false, true, false]);
});

await check("scores: all score files = every version is measured", async () => {
  await w(`book-store/${LF}/point-scores/QA_1/v4.1.0.json`, scoreOf(LF, "QA_1", "v4.1.0", [5, 10, 15]));
  await w(`book-store/${LF}/point-scores/QA_1/v4.1.2.json`, scoreOf(LF, "QA_1", "v4.1.2", [7, 8, 9]));
  const m = await L.loadBoxMap(root, "QA_1", LF);
  assert.deepEqual(m.versions.map((v) => v.measured), [true, true, true]);
  assert.equal((await L.loadBoxMap(root, "QA_1", LF)), m, "same files: the cached map");
  // the paired map keeps its own state
  assert.ok((await L.loadBoxMap(root, "QA_1")).versions.every((v) => !v.measured));
});

await check("phase 4 start: one version whose parent is in the phase 3 folder is the start of a book map (no broken-chain note); two such versions or the paired dataset keep the old rule", async () => {
  const r2 = await madeUpRoot("vw130-p4-");
  // the real shape: v4.1.0 has the parent v3.1.4 of <book>/agent-phase-3/prompts (the map does not read that folder)
  await r2.w("book-store/p4_book/prompts/QA_1/v4.1.0.json", vfile("p4_book", "QA_1", "v4.1.0", "v3.1.4", P1, 4));
  await r2.w("book-store/p4_book/prompts/QA_1/v4.1.1.json", vfile("p4_book", "QA_1", "v4.1.1", "v4.1.0", P2, 4));
  await r2.w("book-store/p4_book/prompts/QA_1/v4.1.10.json", vfile("p4_book", "QA_1", "v4.1.10", "v4.1.9", P3, 4));
  await r2.w("book-store/p4_book/prompts/QA_1/v4.1.9.json", vfile("p4_book", "QA_1", "v4.1.9", "v4.1.1", P2, 4));
  const ok = await L.loadBoxMap(r2.root, "QA_1", "p4_book");
  assert.equal(ok.fallback, false, "no false note");
  assert.deepEqual(ok.versions.map((v) => v.version), ["v4.1.0", "v4.1.1", "v4.1.9", "v4.1.10"], "the chain order (also the natural order)");
  assert.equal(ok.versions[0].points.every((p) => !p.added && !p.prev), true, "the first version has no ring and no arrow");
  assert.ok(!h(View.default, { map: ok, counts: await L.versionCounts(r2.root, R.BOX_TYPES, "p4_book"), state: { box: "QA_1", version: null, axes: "program", point: null, book: "p4_book" } }).includes("data-vm-fallback"));
  // two versions with a parent outside the set: the chain is broken
  await r2.w("book-store/p4_two/prompts/QA_1/v4.1.0.json", vfile("p4_two", "QA_1", "v4.1.0", "v3.1.4", P1, 4));
  await r2.w("book-store/p4_two/prompts/QA_1/v4.1.2.json", vfile("p4_two", "QA_1", "v4.1.2", "v4.1.1", P2, 4));
  const broken = await L.loadBoxMap(r2.root, "QA_1", "p4_two");
  assert.equal(broken.fallback, true);
  assert.deepEqual(broken.versions.map((v) => v.version), ["v4.1.0", "v4.1.2"]);
  // a real first version (no parent) plus a version with a missing parent: broken
  await r2.w("book-store/p4_root/prompts/QA_1/v4.1.0.json", vfile("p4_root", "QA_1", "v4.1.0", null, P1, 4));
  await r2.w("book-store/p4_root/prompts/QA_1/v4.1.2.json", vfile("p4_root", "QA_1", "v4.1.2", "v4.1.1", P2, 4));
  assert.equal((await L.loadBoxMap(r2.root, "QA_1", "p4_root")).fallback, true);
  // the paired dataset keeps the old rule: one version with a parent outside the set is a broken chain
  await r2.w("book-store/paired-dataset/prompts/QA_2/v2.1.0.json", vfile("paired-dataset", "QA_2", "v2.1.0", "v1.0.0", P1, 2));
  await r2.w("book-store/paired-dataset/prompts/QA_2/v2.1.1.json", vfile("paired-dataset", "QA_2", "v2.1.1", "v2.1.0", P2, 2));
  assert.equal((await L.loadBoxMap(r2.root, "QA_2")).fallback, true, "paired dataset: unchanged");
  assert.equal((await L.loadBoxMap(r2.root, "QA_2", "paired-dataset")).fallback, true, "paired dataset by name: unchanged");
});

await check("book list: the folders below book-store with stored versions, sorted, with the version count; no paired dataset, no empty, no phase 3 only, no bad name, no file", async () => {
  assert.deepEqual(await L.listPromptBooks(root), [{ slug: "aaa_book", versions: 2 }, { slug: LF, versions: 4 }]);
  const nobook = await madeUpRoot("vw130-empty-");
  assert.deepEqual(await L.listPromptBooks(nobook.root), [], "no book-store folder");
  await nobook.w("book-store/x/prompts/QA_1/current", "v1");
  assert.deepEqual(await L.listPromptBooks(nobook.root), []);
});

await check("button rule: a book has the button when it has at least one prompt version file; not for empty folders, phase 3 only, a bad name, or a missing book", async () => {
  assert.equal(await L.bookHasPromptVersions(root, LF), true);
  assert.equal(await L.bookHasPromptVersions(root, "aaa_book"), true);
  assert.equal(await L.bookHasPromptVersions(root, "paired-dataset"), true);
  for (const no of ["empty_book", "no_prompts", "only_phase3", "missing_book", "has space", "../x", "a/b", "..", ""]) assert.equal(await L.bookHasPromptVersions(root, no), false, no);
});

// ---------------------------------------------------------------- part 3: the markup

const hrefs = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

await check("view: the select lists 'Phase 2 paired dataset' first, then each book with its title, folder, and version count; the chosen book is selected", async () => {
  const books = { options: R.bookOptions(await L.listPromptBooks(root), new Map([[LF, "The Secret of Kendo and the Left Foot"]])), note: null };
  const map = await L.loadBoxMap(root, "QA_1", LF);
  const counts = await L.versionCounts(root, R.BOX_TYPES, LF);
  const html = h(View.default, { map, counts, state: { box: "QA_1", version: null, axes: "program", point: null, book: LF }, books });
  assert.ok(html.includes("data-vm-book-form") && html.includes('name="book"') && html.includes('action="/monitor/vector-map"'));
  assert.ok(html.includes('<input type="hidden" name="box" value="QA_1"/>'));
  const opts = [...html.matchAll(/<option value="([^"]*)"([^>]*)>([^<]*)<\/option>/g)].map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(opts.map((o) => o[0]), ["paired-dataset", "aaa_book", LF]);
  assert.equal(opts[0][2], "Phase 2 paired dataset");
  assert.equal(opts[1][2], "aaa_book, 2 prompt versions");
  assert.equal(opts[2][2], "The Secret of Kendo and the Left Foot (left_foot_full), 4 prompt versions");
  assert.ok(opts[2][1].includes("selected") && !opts[0][1].includes("selected"));
  assert.ok(html.includes(`data-vm-book="${LF}"`));
  assert.ok(htmlText(html).includes("Book"));
  // with the paired choice the first option is selected
  const p = h(View.default, { map: await L.loadBoxMap(root, "QA_1"), counts: await L.versionCounts(root, R.BOX_TYPES), state: { box: "QA_1", version: null, axes: "program", point: null, book: "paired-dataset" }, books });
  assert.ok(/<option value="paired-dataset" selected=""/.test(p));
  assert.ok(!p.includes("data-vm-book="), "the paired map has no data-vm-book mark");
});

await check("view: every link of the map of a book keeps `book` (box links, slider, axes, points, removed list) and a link of the paired map has none", async () => {
  const map = await L.loadBoxMap(root, "QA_1", LF);
  const counts = await L.versionCounts(root, R.BOX_TYPES, LF);
  const state = { box: "QA_1", version: "v4.1.2", axes: "model", point: "v4.1.0#1.1", book: LF };
  const html = h(View.default, { map, counts, state });
  const mine = hrefs(html).filter((x) => x.startsWith("/monitor/vector-map"));
  assert.ok(mine.length >= 20, `links ${mine.length}`);
  for (const x of mine) assert.ok(x.startsWith("/monitor/vector-map?book=left_foot_full&box="), x);
  assert.equal([...html.matchAll(/data-vm-box-link="/g)].length, 16);
  assert.ok(mine.includes("/monitor/vector-map?book=left_foot_full&box=TL_0"), "a box link");
  assert.ok(mine.includes("/monitor/vector-map?book=left_foot_full&box=QA_1&v=v4.1.1&axes=model&p=v4.1.0%231.1"), "Earlier keeps the book, the box, the axes, and the point");
  assert.ok(html.includes("data-vm-slider"));
  // the paired map: no `book` key in any address, and the same text with `book` not set or set to the paired dataset
  const pmap = await L.loadBoxMap(root, "QA_1");
  const pc = await L.versionCounts(root, R.BOX_TYPES);
  const base = { box: "QA_1", version: "v2.1.1", axes: "program", point: "v2.1.0#1.1" };
  const a = h(View.default, { map: pmap, counts: pc, state: base });
  const b = h(View.default, { map: pmap, counts: pc, state: { ...base, book: "paired-dataset" } });
  assert.equal(a, b, "book not set and book = paired-dataset give the same markup");
  assert.ok(!hrefs(a).some((x) => x.includes("book=")), "no book key in the paired map");
  assert.ok(hrefs(a).includes("/monitor/vector-map?box=QA_1&v=v2.1.0&p=v2.1.0%231.1"), "the old address form");
  assert.equal(R.PAIRED_BOOK, "paired-dataset");
  assert.equal(View.vmHref({ box: "QA_3", version: null, axes: "program", point: null }), "/monitor/vector-map?box=QA_3");
  assert.equal(View.vmHref({ box: "QA_3", version: "v4.1.0", axes: "model", point: "p", book: LF }), "/monitor/vector-map?book=left_foot_full&box=QA_3&v=v4.1.0&axes=model&p=p");
});

await check("view: with 0, some, and all score files the Model score tab or the 'Not measured' state shows", async () => {
  const counts = await L.versionCounts(root, R.BOX_TYPES, LF);
  const m = await L.loadBoxMap(root, "QA_1", LF);
  const html = h(View.default, { map: m, counts, state: { box: "QA_1", version: "v4.1.2", axes: "model", point: null, book: LF } });
  assert.ok(!html.includes("data-vm-not-measured"), "all versions measured now: the tab shows");
  assert.match(html, /data-vm-chart[^>]*aria-label="[^"]*model score/);
  // a fresh book with no score file at all
  await w("book-store/zero_scores/prompts/QA_1/v4.1.0.json", vfile("zero_scores", "QA_1", "v4.1.0", null, P1, 4));
  const z = await L.loadBoxMap(root, "QA_1", "zero_scores");
  const zh = h(View.default, { map: z, counts: await L.versionCounts(root, R.BOX_TYPES, "zero_scores"), state: { box: "QA_1", version: null, axes: "model", point: null, book: "zero_scores" } });
  assert.ok(zh.includes("data-vm-not-measured"));
  assert.ok(htmlText(zh).includes("Model score: Not measured"));
  // some: only v4.1.1 measured in a new book
  await w("book-store/some_scores/prompts/QA_1/v4.1.0.json", vfile("some_scores", "QA_1", "v4.1.0", null, P1, 4));
  await w("book-store/some_scores/prompts/QA_1/v4.1.1.json", vfile("some_scores", "QA_1", "v4.1.1", "v4.1.0", P2, 4));
  await w("book-store/some_scores/point-scores/QA_1/v4.1.1.json", scoreOf("some_scores", "QA_1", "v4.1.1", [10, 20, 30, 40]));
  const s = await L.loadBoxMap(root, "QA_1", "some_scores");
  const sc = await L.versionCounts(root, R.BOX_TYPES, "some_scores");
  const first = h(View.default, { map: s, counts: sc, state: { box: "QA_1", version: "v4.1.0", axes: "model", point: null, book: "some_scores" } });
  const second = h(View.default, { map: s, counts: sc, state: { box: "QA_1", version: "v4.1.1", axes: "model", point: null, book: "some_scores" } });
  assert.ok(first.includes("data-vm-not-measured") && !second.includes("data-vm-not-measured"));
  assert.match(second, /data-vm-chart[^>]*aria-label="[^"]*model score/);
});

// the page: monitor on, the book choice, and the book page
const cfg = path.join(root, "..", "vw130-viewer.config.json");
const withConfig = async (monitor, fn) => {
  await fs.writeFile(cfg, JSON.stringify({ translatorDataDir: root, translatorConfigDir: path.join(root, "no-config"), monitor }));
  const old = process.env.VIEWER_CONFIG;
  process.env.VIEWER_CONFIG = cfg;
  try {
    return await fn();
  } finally {
    if (old === undefined) delete process.env.VIEWER_CONFIG;
    else process.env.VIEWER_CONFIG = old;
  }
};

await check("page: ?book=left_foot_full shows that book with its title; no book, paired-dataset, an unknown name, and a bad name give the paired map (the last two with a note); monitor off gives 404", async () => {
  const Page = (await import("../app/monitor/vector-map/page.tsx")).default;
  await withConfig(true, async () => {
    const run = async (q) => renderToStaticMarkup(await Page({ searchParams: Promise.resolve(q) }));
    const lf = await run({ book: LF, box: "QA_1" });
    assert.ok(lf.includes(`data-vm-book="${LF}"`) && lf.includes("data-vm-book-line"));
    assert.match(htmlText(lf), /Book: The Secret of Kendo and the Left Foot \(left_foot_full\) ?\. The map shows the prompt versions of this book\./);
    assert.ok(htmlText(lf).includes("v4.1.2") && !htmlText(lf).includes("v3.9.9") && !htmlText(lf).includes("v2.1.1"));
    assert.ok(!lf.includes("data-vm-book-note"));
    assert.ok(hrefs(lf).filter((x) => x.startsWith("/monitor/vector-map")).every((x) => x.includes("book=left_foot_full")));
    const none = await run({ box: "QA_1" });
    assert.ok(!none.includes("data-vm-book-line") && !none.includes("data-vm-book-note") && !none.includes("data-vm-book="));
    assert.ok(htmlText(none).includes("v2.1.1") && !htmlText(none).includes("v4.1.2"));
    assert.ok(none.includes("data-vm-book-form"), "the select shows on the paired map too");
    assert.ok(!hrefs(none).some((x) => x.includes("book=")));
    const same = await run({ book: "paired-dataset", box: "QA_1" });
    assert.equal(same, none, "book=paired-dataset is the default map");
    for (const bad of ["nope_book", "../../etc", "a/b", "empty_book", "only_phase3", "has space"]) {
      const r = await run({ book: bad, box: "QA_1" });
      assert.ok(r.includes("data-vm-book-note"), bad);
      assert.ok(htmlText(r).includes(R.BOOK_FALLBACK_NOTE), bad);
      assert.ok(htmlText(r).includes("v2.1.1") && !htmlText(r).includes("v4.1"), bad);
      assert.ok(!r.includes("data-vm-book-line") && !r.includes("data-vm-book="), bad);
    }
    // two values of book (an array) count as no book
    const arr = await run({ book: [LF, "x"], box: "QA_1" });
    assert.equal(arr, none);
    // the box choice still falls back to QA_3 for an unknown box, with a book
    assert.ok(htmlText(await run({ book: LF, box: "../../etc" })).includes("No stored prompt version of box type QA_3 yet."));
  });
  await withConfig(false, async () => {
    await assert.rejects(Page({ searchParams: Promise.resolve({ book: LF }) }), /notFound/);
  });
});

await check("book page: the button 'Vector map' opens /monitor/vector-map?book=<book> when the book has prompt versions, and is not there without versions", async () => {
  const Slug = (await import("../app/monitor/[slug]/page.tsx")).default;
  await withConfig(true, async () => {
    const page = async (slug) => renderToStaticMarkup(await Slug({ params: Promise.resolve({ slug }) }));
    const lf = await page(LF);
    const m = /<a data-vector-map-link="true" href="([^"]+)"([^>]*)>Vector map<\/a>/.exec(lf);
    assert.ok(m, "the link shows");
    assert.equal(m[1], "/monitor/vector-map?book=left_foot_full");
    assert.ok(/class="rounded border border-line bg-white px-3 py-1 text-sm font-medium text-foreground hover:bg-stone-50"/.test(m[2]), "the look of the link Details");
    // after the state label and the buttons, inside the header
    assert.ok(lf.indexOf('data-part="header"') < lf.indexOf("data-vector-map-link") && lf.indexOf("data-vector-map-link") < lf.indexOf('part="last-error"'));
    for (const slug of ["empty_book", "no_prompts", "only_phase3"]) {
      const html = await page(slug);
      assert.ok(html.includes(`data-book-detail="${slug}"`), slug);
      assert.ok(!html.includes("data-vector-map-link") && !html.includes("Vector map"), `${slug}: no button`);
    }
    await assert.rejects(Slug({ params: Promise.resolve({ slug: "../x" }) }), /notFound/);
    await assert.rejects(Slug({ params: Promise.resolve({ slug: "missing_book" }) }), /notFound/);
  });
  await withConfig(false, async () => {
    await assert.rejects(Slug({ params: Promise.resolve({ slug: LF }) }), /notFound/);
  });
});

await check("source: the page keeps requireMonitor before the data read; no model call, no write, no network in the files of this unit; the old tests keep their asserts", () => {
  const page = read("app/monitor/vector-map/page.tsx");
  assert.ok(page.indexOf("await requireMonitor()") < page.indexOf("await dataRoot()"));
  const slug = read("app/monitor/[slug]/page.tsx");
  assert.ok(slug.indexOf("await requireMonitor()") < slug.indexOf("bookHasPromptVersions(root, slug)"));
  for (const f of ["lib/vector-map-load.ts", "lib/vector-map-rules.ts", "components/VectorMapView.tsx", "components/VectorMapBookSelect.tsx", "app/monitor/vector-map/page.tsx"]) {
    const s = read(f);
    assert.ok(!/writeFile|mkdir|unlink|rename\(|fetch\(/.test(s), `${f} writes or calls out`);
  }
  assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(["lib/vector-map-load.ts", "lib/vector-map-rules.ts", "components/VectorMapBookSelect.tsx", "app/monitor/vector-map/page.tsx"].map(read).join("\n")), "e-mail");
  assert.ok(!/gloss|rendering/i.test(read("components/VectorMapBookSelect.tsx")));
});

done();
