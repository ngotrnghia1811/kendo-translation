// VW77e (round 91): server-free tests of the Reader ToC fold (Q-A 3:10.3 to 3:10.5) and of the book-run archive read (Q-A 3:11.1 to 3:11.3).
// Run: scripts/dev/cleanenv.sh node scripts/vw77e-test.mjs (from the app folder; the wrapper sets TMPDIR).
// It makes sample book stores below $TMPDIR, reads the real book-toc.jsonl of the Translator data folder (read only), starts no server,
// makes no network call, writes no PocketBase, and removes its folder at the end. The last line is "<n> passed".
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";
import { installTsResolveHook } from "./ts-resolve-hook.mjs";

const app = path.resolve(import.meta.dirname, "..");
assert.ok(process.env.TMPDIR, "Set TMPDIR (use scripts/dev/cleanenv.sh)");
globalThis.fetch = async () => {
  throw new Error("Network is disabled in the VW77e tests.");
};

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(pathToFileURL(path.join(app, specifier.slice(2)) + ".ts").href, context);
    return next(specifier, context);
  },
});
installTsResolveHook();

const R = await import("../lib/book-run-rules.ts");
const B = await import("../lib/book-runs.ts");
const T = await import("../lib/reader-toc.ts");
const F = await import("../lib/reader-folds.ts");
const O = await import("../lib/reader-opens-rule.ts");
const C = await import("../lib/chain.ts");
const D = await import("../lib/book-detail-rules.ts");

const root = await fs.mkdtemp(path.join(process.env.TMPDIR, "vw77e-"));
// The file is git-ignored in the Translator worktree and read only here. Order of the search:
// the env VW77E_TOC_FILE, then the key translatorDataDir of viewer.config.json in the app folder, then the sibling Translator worktree of the Viewer worktree.
async function tocFile() {
  if (process.env.VW77E_TOC_FILE) return process.env.VW77E_TOC_FILE;
  try {
    const dir = JSON.parse(await fs.readFile(path.join(app, "viewer.config.json"), "utf-8")).translatorDataDir;
    if (typeof dir === "string" && dir) return path.join(dir, "item-metadata", "book-toc.jsonl");
  } catch {
    // no config file: use the sibling worktree
  }
  return path.resolve(app, "../../kendo-translation-translator/data/item-metadata/book-toc.jsonl");
}
const TOC_FILE = await tocFile();

let count = 0;
async function check(name, fn) {
  await fn();
  count++;
  console.log("PASS " + name);
}
const src = (file) => fs.readFile(path.join(app, file), "utf-8");
const put = async (rel, doc) => {
  const abs = path.join(root, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, typeof doc === "string" ? doc : JSON.stringify(doc));
};

try {
  // ------------------------------------------------------------ D1 run ID forms
  await check("D1: ISO PST run ID gives the folder form (store.py run_id_folder)", () => {
    assert.equal(R.runIdFolderOf("2026-11-11T18:30:21-08:00"), "20261111T183021-0800");
    assert.equal(R.runIdFolderOf("2026-11-04T00:15:00-08:00"), "20261104T001500-0800");
  });
  await check("D1: folder form gives the ISO PST run ID back (round trip)", () => {
    assert.equal(R.runIdIsoOf("20261111T183021-0800"), "2026-11-11T18:30:21-08:00");
    for (const iso of ["2026-01-02T03:04:05-08:00", "2026-12-31T23:59:59-08:00"]) assert.equal(R.runIdIsoOf(R.runIdFolderOf(iso)), iso);
  });
  await check("D1: other forms give null (UTC, other offset, page run folder, junk, non-string)", () => {
    for (const bad of ["2026-11-11T18:30:21Z", "2026-11-11T18:30:21-07:00", "20261029T051154Z-r41", "", "x", null, undefined, 5]) {
      assert.equal(R.runIdFolderOf(bad), null, String(bad));
      assert.equal(R.runIdIsoOf(bad), null, String(bad));
      assert.equal(R.isRunIdFolder(bad), false, String(bad));
    }
    assert.equal(R.isRunIdFolder("20261111T183021-0800"), true);
    assert.equal(R.isRunIdFolder("20261111T183021-0800/x"), false);
  });

  // ------------------------------------------------------------ D3 / names
  await check("D3: paired-dataset is no book store name; safe names pass; unsafe names fail", () => {
    assert.equal(R.isBookStoreName("paired-dataset"), false);
    assert.equal(R.isBookStoreName("left_foot_full"), true);
    assert.equal(R.isBookStoreName("ogawa_lecture_part1"), true);
    for (const bad of ["", "..", "../x", "a/b", ".hidden", "a b", null, 3]) assert.equal(R.isBookStoreName(bad), false, String(bad));
  });

  // ------------------------------------------------------------ pointers (D2)
  await check("pointer folder: data/pilot-run/<page>/<run> gives pilot-run/<page>/<run>; other shapes give null", () => {
    assert.equal(R.pointerFolderOf("data/pilot-run/94380515_p001/20261112T023022Z-r41"), "pilot-run/94380515_p001/20261112T023022Z-r41");
    assert.equal(R.pointerFolderOf("/data/pilot-run/a_p001/20261112T023022Z-r41"), "pilot-run/a_p001/20261112T023022Z-r41");
    assert.equal(R.pointerFolderOf("pilot-run/a_p001/r1"), "pilot-run/a_p001/r1");
    for (const bad of ["data/pilot-run/a/b/c", "data/pilot-run/a", "data/book-store/a/b", "data/pilot-run/../x/y", "data/pilot-run/a_p001/..", "", null, 4]) {
      assert.equal(R.pointerFolderOf(bad), null, String(bad));
    }
    assert.equal(R.pageRunNameOf("pilot-run/a_p001/r1"), "r1");
    assert.equal(R.pageRunNameOf(null), null);
  });
  await check("D2: a page counts only with accepted true and verdict PASS", () => {
    const mk = (accepted, verdict) => R.parsePointer({ page_id: "bk/p001", accepted, verdict, folder: "data/pilot-run/bk_p001/r1" });
    assert.equal(R.pointerTakesPage(mk(true, "PASS")), true);
    assert.equal(R.pointerTakesPage(mk(false, "PASS")), false);
    assert.equal(R.pointerTakesPage(mk(true, "FAIL")), false);
    assert.equal(R.pointerTakesPage(mk(true, undefined)), false);
    assert.equal(R.pointerTakesPage(mk("true", "PASS")), false);
    assert.equal(R.pointerTakesPage(mk(true, "pass")), false);
    assert.equal(R.parsePointer({ page_id: "no slash", accepted: true, verdict: "PASS" }), null);
    assert.equal(R.parsePointer(null), null);
    assert.equal(R.parsePointer([]), null);
  });

  // ------------------------------------------------------------ order of runs (V1)
  await check("V1: current first, archive newest first, phase 3 last; a repeated run ID keeps its first place", () => {
    const runs = [
      { place: "agent-phase-3", runId: "20261101T000000-0800" },
      { place: "archive", runId: "20261102T000000-0800" },
      { place: "archive", runId: "20261104T000000-0800" },
      { place: "current", runId: "20261111T000000-0800" },
      { place: "archive", runId: "20261111T000000-0800" },
      { place: "archive", runId: null },
    ];
    const out = R.orderBookRuns(runs);
    assert.deepEqual(out.runs.map((r) => `${r.place}:${r.runId}`), [
      "current:20261111T000000-0800",
      "archive:20261104T000000-0800",
      "archive:20261102T000000-0800",
      "archive:null",
      "agent-phase-3:20261101T000000-0800",
    ]);
    assert.equal(out.duplicates.length, 1);
    assert.equal(out.duplicates[0].place, "archive");
  });

  // ------------------------------------------------------------ picker (O1 and O2)
  const cand = (source, pageRunId, bookRunId, verdict) => ({ source, pageRunId, bookRunId, verdict, x: pageRunId });
  const allOpen = () => true;
  await check("O1: the run mark comes first when its run is open (also a FAIL run of the book)", () => {
    const book = [cand("book-store", "pb1", "20261111T000000-0800", "PASS")];
    const pilot = [cand("pilot-run", "pp1", null, "PASS"), cand("pilot-run", "pp0", null, "FAIL")];
    assert.equal(R.pickReaderCandidate(book, pilot, "pp0", allOpen).why, "run mark");
    assert.equal(R.pickReaderCandidate(book, pilot, "pp0", allOpen).cand.pageRunId, "pp0");
    assert.equal(R.pickReaderCandidate(book, pilot, "pb1", allOpen).cand.pageRunId, "pb1");
  });
  await check("O1: a closed marked run does not win; the next rule applies", () => {
    const book = [cand("book-store", "pb1", "20261111T000000-0800", "PASS")];
    const pilot = [cand("pilot-run", "pp1", null, "PASS")];
    const r = R.pickReaderCandidate(book, pilot, "pp1", (c) => c.pageRunId !== "pp1");
    assert.equal(r.cand.pageRunId, "pb1");
    assert.equal(r.why, "newest open book-run PASS");
  });
  await check("O1: an open book run with PASS wins over an open pilot run with PASS", () => {
    const book = [cand("book-store", "pb1", "20261111T000000-0800", "PASS")];
    const pilot = [cand("pilot-run", "pp1", null, "PASS")];
    const r = R.pickReaderCandidate(book, pilot, null, allOpen);
    assert.equal(r.cand.source, "book-store");
    assert.equal(r.why, "newest open book-run PASS");
  });
  await check("O2: the newest open book run wins (start time = folder-form run ID); a rerun after a fix wins", () => {
    const book = [
      cand("book-store", "pa", "20261104T001500-0800", "PASS"),
      cand("book-store", "pc", "20261201T090000-0800", "PASS"),
      cand("book-store", "pb", "20261110T120000-0800", "PASS"),
    ];
    assert.equal(R.pickReaderCandidate(book, [], null, allOpen).cand.pageRunId, "pc");
    assert.equal(R.pickReaderCandidate(book, [], null, (c) => c.pageRunId !== "pc").cand.pageRunId, "pb");
  });
  await check("O1: a book run with FAIL shows nothing from that run; a closed book run falls to the pilot run", () => {
    const failBook = [cand("book-store", "pb1", "20261111T000000-0800", "FAIL")];
    const pilot = [cand("pilot-run", "pp1", null, "PASS")];
    assert.equal(R.pickReaderCandidate(failBook, pilot, null, allOpen).cand.pageRunId, "pp1");
    assert.equal(R.pickReaderCandidate(failBook, [], null, allOpen), null);
    const passBook = [cand("book-store", "pb1", "20261111T000000-0800", "PASS")];
    const closed = R.pickReaderCandidate(passBook, pilot, null, (c) => c.source !== "book-store");
    assert.equal(closed.cand.pageRunId, "pp1");
    assert.equal(closed.why, "newest open PASS");
  });
  await check("O1: no open PASS anywhere gives null (readers see no Agent text)", () => {
    assert.equal(R.pickReaderCandidate([], [], null, allOpen), null);
    assert.equal(R.pickReaderCandidate([cand("book-store", "pb1", "20261111T000000-0800", "PASS")], [cand("pilot-run", "pp1", null, "FAIL")], null, (c) => c.source === "pilot-run"), null);
  });
  await check("old pilot input: with no book candidate the result equals pickReaderRun (400 random cases)", () => {
    let seed = 20261111;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 400; i++) {
      const n = Math.floor(rnd() * 5);
      const runs = Array.from({ length: n }, (_, k) => ({ runId: `r${k}`, verdict: rnd() < 0.5 ? "PASS" : "FAIL" }));
      const open = new Set(runs.filter(() => rnd() < 0.6).map((r) => r.runId));
      const mark = rnd() < 0.5 && n ? `r${Math.floor(rnd() * n)}` : rnd() < 0.2 ? "r99" : null;
      const old = O.pickReaderRun(runs, mark, (id) => open.has(id));
      const now = R.pickReaderCandidate([], runs.map((r) => cand("pilot-run", r.runId, null, r.verdict)), mark, (c) => open.has(c.pageRunId));
      assert.equal(now ? now.cand.pageRunId : null, old ? old.run.runId : null, JSON.stringify({ runs, open: [...open], mark }));
      assert.equal(now ? now.why : null, old ? old.why : null);
    }
  });
  await check("pickReaderRun and the pilot admin line are unchanged (same text as before)", async () => {
    assert.equal(O.PILOT_SOURCE, "pilot-run");
    assert.deepEqual([...O.OPEN_SOURCES], ["pilot-run", "book-store"]);
    assert.equal(O.openKey("book-store", "bk", "20261111T183021-0800"), "book-store|bk|20261111T183021-0800");
    assert.equal(O.readersSeeLine([{ runId: "a", verdict: "PASS" }], null, new Set(["a"])), "Readers see: run a (opened)");
    assert.equal(O.readersSeeLine([{ runId: "a", verdict: "PASS" }], null, new Set()), "Readers see no agent text for this page. No run of this page is open.");
  });

  // ------------------------------------------------------------ file reader (D3, D4)
  const pointer = (book, n, accepted, verdict, runName) => ({
    schema: "book-page-v1",
    page_id: `${book}/p${String(n).padStart(3, "0")}`,
    phase: "agent-phase-4",
    folder: `data/pilot-run/${book}_p${String(n).padStart(3, "0")}/${runName}`,
    run_id: `L1/${runName}`,
    accepted,
    status: accepted ? "accepted" : "failed",
    verdict,
  });
  async function makeStore(book) {
    const base = `book-store/${book}`;
    // current run: 3 pointers (PASS accepted, FAIL accepted, PASS not accepted)
    await put(`${base}/status.json`, { schema: "book-status-v1", book, phase: "agent-phase-4", state: "running", run_id: "2026-11-11T18:30:21-08:00", pages_done: 2, pages_total: 10 });
    await put(`${base}/pages/${book}_p001.json`, pointer(book, 1, true, "PASS", "20261111T190000Z-r41"));
    await put(`${base}/pages/${book}_p002.json`, pointer(book, 2, true, "FAIL", "20261111T190100Z-r41"));
    await put(`${base}/pages/${book}_p003.json`, pointer(book, 3, false, "PASS", "20261111T190200Z-r41"));
    await put(`${base}/pages/notes.txt`, "not a pointer");
    await put(`${base}/pages/broken.json`, "{ nope");
    // archived runs: one with a folder-form name, one with an old name that is no run ID, one with an unsafe name
    await put(`${base}/archive/20261104T001500-0800/status.json`, { phase: "agent-phase-3", state: "completed", run_id: "2026-11-04T00:15:00-08:00", pages_done: 80, pages_total: 169 });
    await put(`${base}/archive/20261104T001500-0800/pages/${book}_p001.json`, pointer(book, 1, true, "PASS", "20261104T010000Z-r41"));
    await put(`${base}/archive/20261105T093000Z/status.json`, { phase: "agent-phase-3", state: "completed" });
    await put(`${base}/archive/20261105T093000Z/pages/${book}_p001.json`, pointer(book, 1, true, "PASS", "20261105T093500Z-r41"));
    await put(`${base}/archive/.hidden/status.json`, { run_id: "2026-11-06T00:00:00-08:00" });
    // phase 3 store (moved aside by phase 4)
    await put(`${base}/agent-phase-3/status.json`, { phase: "agent-phase-3", state: "completed", run_id: "2026-11-01T08:00:00-08:00", pages_done: 5, pages_total: 5 });
    await put(`${base}/agent-phase-3/pages/${book}_p001.json`, pointer(book, 1, true, "PASS", "20261101T090000Z-r41"));
    await put(`${base}/history.jsonl`, "");
  }
  await makeStore("sample_book");
  // D3: the phase 2 training store with the same file shapes
  await put("book-store/paired-dataset/status.json", { phase: "agent-phase-2", state: "running", run_id: "2026-11-11T18:30:21-08:00" });
  await put("book-store/paired-dataset/pages/94380515_p001.json", pointer("94380515", 1, true, "PASS", "20261112T023022Z-r41"));
  // a folder with a second copy of a run ID (the archive repeats the current run ID)
  await makeStore("dup_book");
  await put("book-store/dup_book/archive/20261111T183021-0800/status.json", { phase: "agent-phase-3", state: "completed", run_id: "2026-11-11T18:30:21-08:00" });
  // a store that has no run yet
  await put("book-store/empty_book/history.jsonl", "");
  await put("book-store/not_started/status.json", { phase: "agent-phase-3", state: "idle", run_id: null });
  await put("book-store/phase3_noid/agent-phase-3/status.json", { phase: "agent-phase-3", state: "completed" });

  await check("D3: listBookStoreBooks leaves out paired-dataset", async () => {
    const books = await B.listBookStoreBooks(root);
    assert.ok(books.includes("sample_book"));
    assert.ok(!books.includes("paired-dataset"));
  });
  await check("D3: readBookRuns of paired-dataset or an unsafe name gives no run", async () => {
    assert.deepEqual((await B.readBookRuns(root, "paired-dataset")).runs, []);
    assert.deepEqual((await B.readBookRuns(root, "../book-store")).runs, []);
    assert.equal(await B.bookRunExistsOnDisk(root, "paired-dataset", "20261111T183021-0800"), false);
  });
  await check("D4: three places in order (current, archive newest first, phase 3), run IDs in folder form (D1)", async () => {
    const { runs, duplicates } = await B.readBookRuns(root, "sample_book");
    assert.deepEqual(runs.map((r) => `${r.place}:${r.runId}`), [
      "current:20261111T183021-0800",
      "archive:20261104T001500-0800",
      "archive:null",
      "agent-phase-3:20261101T080000-0800",
    ]);
    assert.equal(duplicates.length, 0);
    assert.equal(runs[0].dir, "book-store/sample_book");
    assert.equal(runs[1].dir, "book-store/sample_book/archive/20261104T001500-0800");
    assert.equal(runs[3].dir, "book-store/sample_book/agent-phase-3");
  });
  await check("D4: an archive folder with an old name has no run ID and says why; an unsafe name is skipped", async () => {
    const { runs } = await B.readBookRuns(root, "sample_book");
    const old = runs.find((r) => r.dir.endsWith("20261105T093000Z"));
    assert.equal(old.runId, null);
    assert.match(old.noRunIdReason, /folder name is not a run ID/);
    assert.ok(!runs.some((r) => r.dir.includes(".hidden")));
  });
  await check("D4: facts of a run (phase, state, pages) come from status.json", async () => {
    const { runs } = await B.readBookRuns(root, "sample_book");
    assert.equal(runs[0].phase, "agent-phase-4");
    assert.equal(runs[0].state, "running");
    assert.equal(runs[0].pagesDone, 2);
    assert.equal(runs[0].pagesTotal, 10);
    assert.equal(runs[1].phase, "agent-phase-3");
    assert.equal(runs[1].pagesTotal, 169);
  });
  await check("D2: pointer files are read; a file that is no pointer counts as bad; PASS counts follow accepted + PASS", async () => {
    const { runs } = await B.readBookRuns(root, "sample_book");
    assert.equal(runs[0].pointers.length, 3);
    assert.equal(runs[0].badPointers, 1); // broken.json (notes.txt is no .json file)
    assert.deepEqual(B.passCounts(runs[0]), { pass: 1, total: 3 });
    assert.deepEqual(B.passCounts(runs[1]), { pass: 1, total: 1 });
    const p1 = runs[0].pointers.find((p) => p.pageId === "sample_book/p001");
    assert.equal(p1.folder, "pilot-run/sample_book_p001/20261111T190000Z-r41");
  });
  await check("D1/V1: a run ID that two places hold keeps the first place; the later copy is a duplicate", async () => {
    const { runs, duplicates } = await B.readBookRuns(root, "dup_book");
    assert.equal(runs.filter((r) => r.runId === "20261111T183021-0800").length, 1);
    assert.equal(runs.find((r) => r.runId === "20261111T183021-0800").place, "current");
    assert.equal(duplicates.length, 1);
    assert.equal(duplicates[0].place, "archive");
  });
  await check("a store with no run, a run not started and no pointer, and a phase 3 store with no run ID", async () => {
    assert.deepEqual((await B.readBookRuns(root, "empty_book")).runs, []);
    assert.deepEqual((await B.readBookRuns(root, "not_started")).runs, []);
    const p3 = (await B.readBookRuns(root, "phase3_noid")).runs;
    assert.equal(p3.length, 1);
    assert.equal(p3[0].place, "agent-phase-3");
    assert.equal(p3[0].runId, null);
    assert.ok(p3[0].noRunIdReason);
  });
  await check("the admin route check: bookRunExistsOnDisk finds a run in each place and refuses other text", async () => {
    assert.equal(await B.bookRunExistsOnDisk(root, "sample_book", "20261111T183021-0800"), true);
    assert.equal(await B.bookRunExistsOnDisk(root, "sample_book", "20261104T001500-0800"), true);
    assert.equal(await B.bookRunExistsOnDisk(root, "sample_book", "20261101T080000-0800"), true);
    assert.equal(await B.bookRunExistsOnDisk(root, "sample_book", "20261231T000000-0800"), false);
    assert.equal(await B.bookRunExistsOnDisk(root, "sample_book", "20261105T093000Z"), false);
    assert.equal(await B.bookRunExistsOnDisk(root, "sample_book", "../x"), false);
  });

  await check("V1/V2: loadBookDetail gives one runs list (current, archive newest first, phase 3) and keeps the archived list as before", async () => {
    await fs.writeFile(path.join(root, "viewer.config.json"), JSON.stringify({ translatorDataDir: root }));
    process.env.VIEWER_CONFIG = path.join(root, "viewer.config.json");
    const { loadBookDetail } = await import("../lib/book-detail.ts");
    const d = await loadBookDetail("sample_book");
    assert.ok(d && d.ok);
    assert.deepEqual(d.runs.map((r) => r.place), ["current", "archive", "archive", "agent-phase-3"]);
    assert.deepEqual(d.runs.map((r) => r.runId), ["20261111T183021-0800", "20261104T001500-0800", null, "20261101T080000-0800"]);
    assert.equal(d.runs[0].runText, "2026-11-11 18:30 PST");
    assert.equal(d.runs[0].pagesText, "2 of 10");
    assert.deepEqual([d.runs[0].passPages, d.runs[0].totalPages], [1, 3]);
    assert.equal(d.runs[0].promptsEnd, "The run has not ended"); // a run in progress has no end label yet
    assert.equal(d.runs[1].pagesText, "80 of 169");
    assert.equal(d.runs[2].folder, "20261105T093000Z");
    assert.ok(d.runs[2].noRunIdReason); // the row says why it has no button
    assert.deepEqual(d.archived.map((a) => a.folder), ["20261104T001500-0800", "20261105T093000Z"]); // the old field keeps its rows
    const none = await loadBookDetail("empty_book");
    assert.ok(none === null || none.runs.length === 0);
  });

  // ------------------------------------------------------------ V4 kind and tag
  await check("V4: list kind 'book-run' is shown; 'chain' still wins; any other list stays 'list'", () => {
    assert.equal(C.listKindOf({ kind: "book-run" }), "book-run");
    assert.equal(C.listKindOf({ kind: "chain" }), "chain");
    assert.equal(C.listKindOf({ kind: "book-run" }, { kind: "chain" }), "chain");
    assert.equal(C.listKindOf({}, null, undefined), "list");
    assert.equal(C.listKindOf({ kind: "pilot" }), "list");
    assert.equal(C.listKindOf(), "list");
  });
  await check("V4: the Details view tag is book-run for a book with a run-book run, else pilot list for a pilot row, else none", () => {
    assert.equal(R.bookTagText(true, false), "book-run");
    assert.equal(R.bookTagText(true, true), "book-run");
    assert.equal(R.bookTagText(false, true), "pilot list");
    assert.equal(R.bookTagText(false, false), null);
  });
  await check("V1/V2: the run text helpers of the Details view keep the 5 built columns' words", () => {
    assert.equal(D.archiveRunText("20261104T001500-0800").text, "2026-11-04 00:15 PST");
    assert.equal(D.archiveRunText("20261104T001500-0800").isRunId, true);
    assert.equal(D.archiveRunText("20261105T093000Z").isRunId, false);
    assert.equal(D.pagesDoneText(80, 169), "80 of 169");
    assert.equal(D.pagesDoneText(null, null), "Not stored");
    assert.equal(D.NO_RUNS_TEXT, "No run in the book store.");
  });

  // ------------------------------------------------------------ ToC: record, rows, counts
  await check("R3: tocRecordOf keeps the 10 keys, drops research keys, turns null into empty or 0", () => {
    const rec = T.tocRecordOf({
      book: "left_foot_full", order: 3, level: 2, title_ja: "第一章", title_en: null, page_ref: "15", page_ref_num: 15, offset: -2, pdf_page: 17,
      page_id: "left_foot_full/p017", status: "checked", evidence: "long text", notes: "x", match_md_page: 4,
    });
    assert.deepEqual(Object.keys(rec).sort(), [...T.TOC_RECORD_KEYS].sort());
    assert.equal(rec.title_en, "");
    assert.equal(rec.pdf_page, 17);
    const none = T.tocRecordOf({ book: "tanden_full", order: 27, level: 1, title_ja: "あ", page_ref: null, page_ref_num: null, offset: null, pdf_page: null, page_id: null });
    assert.equal(none.page_ref, "");
    assert.equal(none.page_ref_num, 0);
    assert.equal(none.pdf_page, 0);
    assert.equal(none.page_id, "");
  });
  await check("R3: tocRecordOf refuses a row with no book, order 0, level 3, or no Japanese title", () => {
    const ok = { book: "b", order: 1, level: 1, title_ja: "あ" };
    assert.ok(T.tocRecordOf(ok));
    for (const patch of [{ book: "" }, { book: "../x" }, { order: 0 }, { level: 3 }, { level: 0 }, { title_ja: "" }]) assert.equal(T.tocRecordOf({ ...ok, ...patch }), null, JSON.stringify(patch));
    assert.equal(T.tocRecordOf(null), null);
    assert.equal(T.tocRecordOf("x"), null);
  });
  await check("R3: tocRecordEqual compares the 10 keys; an empty number on the server equals 0", () => {
    const rec = T.tocRecordOf({ book: "b", order: 1, level: 1, title_ja: "あ", title_en: "A", page_ref: "5", page_ref_num: 5, offset: 0, pdf_page: 6, page_id: "b/p006" });
    assert.equal(T.tocRecordEqual({ ...rec, id: "x", created: "c" }, rec), true);
    assert.equal(T.tocRecordEqual({ ...rec, title_en: "B" }, rec), false);
    assert.equal(T.tocRecordEqual({ ...rec, pdf_page: 7 }, rec), false);
    const zero = T.tocRecordOf({ book: "b", order: 2, level: 2, title_ja: "い" });
    assert.equal(T.tocRecordEqual({ book: "b", order: 2, level: 2, title_ja: "い", title_en: "", page_ref: "", page_ref_num: null, offset: null, pdf_page: null, page_id: "" }, zero), true);
  });
  await check("fold ids: toc-<slug> and back; a slug with a path character gives null", () => {
    assert.equal(T.tocFoldId("left_foot_full"), "toc-left_foot_full");
    assert.equal(T.tocSlugOf("toc-left_foot_full"), "left_foot_full");
    for (const bad of ["kj-2019-05", "toc-", "toc-../x", "toc-a/b", "toc-a b", "left_foot_full"]) assert.equal(T.tocSlugOf(bad), null, bad);
  });
  await check("F3/R1/R2: rows by order; level 1 and 2; English title with Japanese smaller; no book page number still gives a row", () => {
    const recs = [
      { book: "b", order: 3, level: 2, title_ja: "三", title_en: "Three", page_ref: "20", page_ref_num: 20, pdf_page: 22, page_id: "b/p022" },
      { book: "b", order: 1, level: 1, title_ja: "一", title_en: "*One* and more", page_ref: "", page_ref_num: 0, pdf_page: 4, page_id: "b/p004" },
      { book: "b", order: 2, level: 1, title_ja: "二", title_en: "", page_ref: "9", page_ref_num: 9, pdf_page: 0, page_id: "b/p011" },
      { book: "b", order: 4, level: 2, title_ja: "四", title_en: "Four", page_ref: "", page_ref_num: 0, pdf_page: 0, page_id: "" },
      { book: "b", order: 5, level: 1, title_ja: "", title_en: "", page_ref: "", pdf_page: 9, page_id: "b/p009" },
    ];
    const rows = T.buildTocRows(recs, 3);
    assert.deepEqual(rows.map((r) => r.order), [1, 2, 3, 4]); // order 5 has no title and is left out
    assert.equal(rows[0].title, "One and more");
    assert.equal(rows[0].titleJa, "一");
    assert.equal(rows[0].titleIsJa, false);
    assert.equal(rows[0].pageRef, ""); // R2: no book page number
    assert.equal(rows[0].pageNo, 4); // R2: it opens the PDF page
    assert.equal(rows[1].title, "二"); // no English title: Japanese is the main text
    assert.equal(rows[1].titleIsJa, true);
    assert.equal(rows[1].titleJa, "");
    assert.equal(rows[1].pageNo, 11); // from page_id
    assert.equal(rows[2].level, 2);
    assert.equal(rows[2].pageRef, "20");
    assert.equal(rows[3].pageNo, 0); // no PDF page: the row shows and has no link
    assert.ok(rows.every((r) => r.type === "toc" && r.digits === 3));
  });
  await check("F3: tocNote and tocCountsOf", () => {
    assert.equal(T.tocNote({ chapters: 12, rows: 30 }), "12 chapters");
    assert.equal(T.tocNote({ chapters: 1, rows: 1 }), "1 chapter");
    const c = T.tocCountsOf([{ book: "a", level: 1 }, { book: "a", level: 2 }, { book: "a", level: 2 }, { book: "b", level: 1 }, { book: "", level: 1 }]);
    assert.deepEqual(c.get("a"), { chapters: 1, rows: 3 });
    assert.deepEqual(c.get("b"), { chapters: 1, rows: 1 });
    assert.equal(c.size, 2);
  });

  // ------------------------------------------------------------ ToC: the real file (R4: real book-toc.jsonl)
  let tocRaw = null;
  try {
    tocRaw = (await fs.readFile(TOC_FILE, "utf-8")).split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  } catch {
    console.log("SKIP real book-toc.jsonl not found at " + TOC_FILE + " (set VW77E_TOC_FILE)");
  }
  let realRecords = [];
  if (tocRaw) {
    await check("R4: the real book-toc.jsonl has 1,181 rows (289 chapter rows, 892 sub-rows) in 23 books, and every row is a usable record", () => {
      assert.equal(tocRaw.length, 1181);
      realRecords = tocRaw.map((r) => T.tocRecordOf(r));
      assert.ok(realRecords.every(Boolean), "a row is refused");
      assert.equal(realRecords.filter((r) => r.level === 1).length, 289);
      assert.equal(realRecords.filter((r) => r.level === 2).length, 892);
      assert.equal(new Set(realRecords.map((r) => r.book)).size, 23);
      assert.equal(new Set(realRecords.map((r) => `${r.book}|${r.order}`)).size, 1181); // the unique index (book, order) holds
    });
    await check("R2: 23 real rows have no book page number; 1,158 have one; only one row has no PDF page", () => {
      assert.equal(realRecords.filter((r) => r.page_ref_num === 0).length, 23);
      assert.equal(realRecords.filter((r) => r.page_ref_num > 0).length, 1158);
      const noPdf = realRecords.filter((r) => r.pdf_page === 0 && !r.page_id);
      assert.equal(noPdf.length, 1);
      assert.equal(noPdf[0].book, "tanden_full");
    });
    await check("R1/R2/F3: every real book gives all its rows; a row with no PDF page has no link; no title keeps an asterisk", () => {
      const by = new Map();
      for (const r of realRecords) by.set(r.book, [...(by.get(r.book) ?? []), r]);
      let rows = 0;
      let noLink = 0;
      for (const [book, recs] of by) {
        const built = T.buildTocRows([...recs].reverse(), 3);
        assert.equal(built.length, recs.length, book);
        assert.deepEqual(built.map((r) => r.order), [...recs.map((r) => r.order)].sort((a, b) => a - b), book);
        assert.ok(built.every((r) => !r.title.includes("*") && r.title.trim()), book);
        rows += built.length;
        noLink += built.filter((r) => r.pageNo === 0).length;
      }
      assert.equal(rows, 1181);
      assert.equal(noLink, 1);
      assert.equal(realRecords.filter((r) => !r.title_en).length, 77); // shown with the Japanese title as the main text
    });
    await check("F4: the three Lectures on Kendo books have their own ToC (18, 13 and 8 rows)", () => {
      const counts = T.tocCountsOf(realRecords);
      assert.equal(counts.get("ogawa_lecture_part1").rows, 18);
      assert.equal(counts.get("ogawa_lecture_part2").rows, 13);
      assert.equal(counts.get("ogawa_lecture_part3").rows, 8);
    });
  }

  // ------------------------------------------------------------ ToC: the folds of the Reader dashboard
  const work = (slug, over = {}) => ({
    slug, kind: "book", titleEn: slug, titleJa: "", author: "", publisher: "", year: "", pages: 100, synopsis: "", isbn: "", partOf: "", webDate: "",
    placement: { webYear: null, webMonth: null, printYear: null, printMonth: null }, translated: [1, 2, 3], known: true, resumeAt: null, ...over,
  });
  const lecture = (n, partEn, partJa, pages) =>
    work(`ogawa_lecture_part${n}`, { titleEn: "Lectures on Kendo, New Edition", titleJa: "剣道講話 新装版", partTitleEn: partEn, partTitleJa: partJa, pages });
  const works = [
    work("left_foot_full", { titleEn: "Left foot", titleJa: "左足" }),
    lecture(1, "Part 1: Lectures on Kendo", "第一部 剣道講話", 281),
    lecture(2, "Part 2: Fudochi Shinmyoroku", "第二部 不動智神妙録", 150),
    lecture(3, "Part 3: Sword and the Way", "第三部 剣と道", 102),
    work("mental2_clean", { titleEn: "Mental copy" }),
    work("no_toc_book", { titleEn: "No ToC" }),
    work("kendo_jidai_2019", { kind: "magazine-year", titleEn: "Kendo Jidai 2019", pages: 800 }),
  ];
  const tocCounts = new Map([
    ["left_foot_full", { chapters: 5, rows: 12 }],
    ["ogawa_lecture_part1", { chapters: 4, rows: 18 }],
    ["ogawa_lecture_part2", { chapters: 3, rows: 13 }],
    ["ogawa_lecture_part3", { chapters: 2, rows: 8 }],
    ["mental2_clean", { chapters: 9, rows: 57 }],
  ]);
  await check("old input: buildFolds without ToC counts gives the same tree as before (no fold has a toc key, books are rows)", () => {
    const dash = F.buildFolds(works, []);
    const books = F.findFold(dash.folds, "books");
    assert.ok(books);
    assert.ok(!JSON.stringify(dash.folds).includes('"toc"'));
    assert.equal(books.children.find((n) => n.type === "work" && n.work.slug === "left_foot_full").type, "work");
    const series = F.findFold(dash.folds, "books-series-1");
    assert.equal(series.children.length, 3);
    assert.ok(series.children.every((n) => n.type === "work"));
    // an empty map is the same as no map
    assert.deepEqual(F.buildFolds(works, [], undefined, new Map()), dash);
  });
  await check("F1/F2: with ToC counts a book row becomes a closed lazy fold toc-<slug> with the book row as head", () => {
    const dash = F.buildFolds(works, [], undefined, tocCounts);
    const f = F.findFold(dash.folds, "toc-left_foot_full");
    assert.ok(f);
    assert.equal(f.toc, "left_foot_full");
    assert.equal(f.level, 2);
    assert.equal(f.lazy, true);
    assert.deepEqual(f.children, []);
    assert.equal(f.note, "5 chapters");
    assert.equal(f.head.work.slug, "left_foot_full");
    assert.deepEqual(f.counts, { works: 1, pages: 100, translated: 3 });
    assert.equal(F.findFold(dash.folds, "toc-no_toc_book"), null); // a book with no ToC data stays a row
    assert.equal(F.findFold(dash.folds, "toc-mental2_clean"), null); // a hidden copy never shows its ToC
  });
  await check("F4: Lectures on Kendo shows as 3 folds in the series fold, each with its part title and its own ToC", () => {
    const dash = F.buildFolds(works, [], undefined, tocCounts);
    const series = F.findFold(dash.folds, "books-series-1");
    assert.equal(series.title, "Lectures on Kendo, New Edition");
    assert.deepEqual(series.children.map((c) => c.id), ["toc-ogawa_lecture_part1", "toc-ogawa_lecture_part2", "toc-ogawa_lecture_part3"]);
    assert.deepEqual(series.children.map((c) => c.title), ["Part 1: Lectures on Kendo", "Part 2: Fudochi Shinmyoroku", "Part 3: Sword and the Way"]);
    assert.deepEqual(series.children.map((c) => c.titleJa), ["第一部 剣道講話", "第二部 不動智神妙録", "第三部 剣と道"]);
    assert.ok(series.children.every((c) => c.level === 3 && c.toc));
    assert.deepEqual(series.children.map((c) => c.note), ["4 chapters", "3 chapters", "2 chapters"]);
  });
  await check("the counts of the Books fold and of the totals do not change when books become folds", () => {
    const before = F.buildFolds(works, []);
    const after = F.buildFolds(works, [], undefined, tocCounts);
    assert.deepEqual(after.folds.find((f) => f.id === "books").counts, before.folds.find((f) => f.id === "books").counts);
    assert.deepEqual(after.totals, before.totals);
    assert.deepEqual(after.folds.map((f) => f.id), before.folds.map((f) => f.id));
  });
  await check("F2/lazyMonths: the page sends every ToC fold closed with no rows, except the one fold that it opens", () => {
    const dash = F.buildFolds(works, [], undefined, tocCounts);
    const rows = T.buildTocRows([{ book: "left_foot_full", order: 1, level: 1, title_ja: "一", title_en: "One", pdf_page: 3 }], 3);
    const open = F.withTocRows(dash.folds, "toc-left_foot_full", rows);
    assert.equal(F.findFold(open, "toc-left_foot_full").children.length, 1);
    assert.equal(F.findFold(open, "toc-ogawa_lecture_part1").children.length, 0);
    const lazy = F.lazyMonths(open, "toc-left_foot_full");
    assert.equal(F.findFold(lazy, "toc-left_foot_full").children.length, 1);
    assert.equal(F.findFold(lazy, "toc-left_foot_full").lazy, true);
    const closed = F.lazyMonths(open, "");
    assert.equal(F.findFold(closed, "toc-left_foot_full").children.length, 0);
    assert.equal(F.findFold(closed, "toc-ogawa_lecture_part2").lazy, true);
  });
  await check("the month folds of Kendo Jidai keep their lazy rule (level 3 month fold closed with no rows)", () => {
    const chapters = [{ book: "kendo_jidai_2019", month: 5, pageStart: 1, pageEnd: 10, titleEn: "May", titleJa: "五月", articles: [] }];
    const dash = F.buildFolds(works, chapters, undefined, tocCounts);
    const lazy = F.lazyMonths(dash.folds, "");
    const months = [];
    (function walk(nodes) { for (const n of nodes) if (n.type === "fold") { if (n.level === F.MONTH_LEVEL && !n.toc) months.push(n); walk(n.children); } })(lazy);
    assert.ok(months.every((m) => m.lazy === true && m.children.length === 0));
  });

  // ------------------------------------------------------------ source scans (the parts that need a browser stay in the browser check plan)
  await check("S2: the new code reads the 3 places and never names paired-dataset as a source; no cost cap, no key", async () => {
    const s2 = await src("scripts/sync-runs.mjs");
    assert.match(s2, /listBookStoreBooks/);
    assert.match(s2, /readBookRuns/);
    assert.match(s2, /pickReaderCandidate/);
    assert.match(s2, /book_toc/);
    assert.ok(!/paired-dataset["'`]\)/.test(s2), "S2 must not open paired-dataset");
    assert.ok(!/POCKETBASE_|SUPERUSER_PASSWORD|VOYAGE/i.test(s2.replace(/Voyage/g, "")), "no key name in S2");
  });
  await check("V3: the Details view table reuses the button, the confirm dialog and the PUT/DELETE call of ReaderOpenRows.tsx", async () => {
    const table = await src("components/BookRunsTable.tsx");
    for (const name of ["OpenButton", "OpenConfirm", "OpenGateLine", "changeOpens", "readOpensFrom"]) assert.match(table, new RegExp(name), name);
    assert.match(table, /BOOK_RUN_SOURCE/);
    assert.match(table, /data-book-run=/);
    const rows = await src("components/ReaderOpenRows.tsx");
    assert.match(rows, /export function OpenButton/);
    assert.match(rows, /export function OpenConfirm/);
    assert.match(rows, /export async function changeOpens/);
    assert.match(rows, /PILOT_SOURCE/); // the pilot run view keeps its source
    assert.match(rows, /Open to readers/);
    assert.match(rows, /Close to readers/);
  });
  await check("V1/V2: the Details view has one Runs table with the 5 built columns, then Place, Readers and the button column", async () => {
    const table = await src("components/BookRunsTable.tsx");
    const heads = [...table.matchAll(/<th[^>]*>([^<{]+)<\/th>/g)].map((m) => m[1].trim()).filter(Boolean);
    assert.deepEqual(heads.slice(0, 7), ["Run ID", "Phase", "Pages done", "Prompts at start", "Prompts at end", "Place", "Readers"]);
    const view = await src("components/BookDetailView.tsx");
    assert.match(view, /part="runs"/);
    assert.ok(!/part="archived-runs"/.test(view));
    assert.match(view, /BookRunsTable/);
    assert.match(view, /bookTagText/);
  });
  await check("the admin route allows the source book-store, keeps the admin gate, and refuses a run ID that is not in folder form", async () => {
    const route = await src("app/api/admin/opens/route.ts");
    assert.ok(!route.includes("are not built yet"));
    assert.match(route, /isRunIdFolder/);
    assert.match(route, /isBookStoreName/);
    assert.match(route, /bookRunExists/);
    assert.equal((route.match(/admin: true/g) ?? []).length, 3); // GET, PUT and DELETE keep the admin gate (round 77 answer 13)
  });
  await check("every new Monitor page or API route keeps the Monitor guard (no new route outside /api/read)", async () => {
    const exists = await src("lib/book-run-exists.ts");
    assert.match(exists, /import "server-only"/);
    const detail = await src("app/api/monitor/books/[slug]/route.ts");
    assert.match(detail, /monitorOffResponse/);
  });
  await check("F1/F3: the Reader rows show the English title, the Japanese title smaller, and the book page; level 2 is indented; keyboard and focus rules hold", async () => {
    const rows = await src("components/ReaderRows.tsx");
    assert.match(rows, /export function TocItem/);
    assert.match(rows, /data-toc-row/);
    assert.match(rows, /pl-6/);
    assert.match(rows, /text-xs/);
    assert.match(rows, /book page/);
    const month = await src("components/ReaderMonth.tsx");
    assert.match(month, /<details/); // details and summary give Enter and Space and focus without script
    assert.match(month, /\/api\/read\/toc\?id=/);
    assert.match(month, /Show the table of contents/);
    const route = await src("app/api/read/toc/route.ts");
    assert.match(route, /guard\(/);
    assert.match(route, /tocSlugOf/);
  });
  await check("R3: the migration creates book_toc with read for signed-in accounts, no write rule, and a unique index on (book, order)", async () => {
    const mig = await fs.readFile(path.resolve(app, "../migration/1793300013_v2_book_toc.js"), "utf-8").catch(() => null);
    if (mig === null) {
      // The migration sits in the unit folder, next to the app copy (W/migration). After the copy-back it sits in <V2>/data/scripts/pocketbase/pb_migrations.
      const back = await fs.readFile(path.resolve(app, "../data/scripts/pocketbase/pb_migrations/1793300013_v2_book_toc.js"), "utf-8");
      assert.match(back, /book_toc/);
      return;
    }
    assert.match(mig, /name: "book_toc"/);
    assert.match(mig, /listRule: SIGNED_IN/);
    assert.match(mig, /createRule: null/);
    assert.match(mig, /updateRule: null/);
    assert.match(mig, /deleteRule: null/);
    assert.match(mig, /CREATE UNIQUE INDEX idx_book_toc_book_order/);
  });
  await check("no new package: dependencies stay next, react, react-dom", async () => {
    const pkg = JSON.parse(await src("package.json"));
    assert.deepEqual(Object.keys(pkg.dependencies).sort(), ["next", "react", "react-dom"]);
  });
  await check("no new color: the new files use only palette classes that contrast-dark.mjs already checks", async () => {
    const files = ["components/BookRunsTable.tsx", "components/ReaderRows.tsx", "components/ReaderMonth.tsx", "components/ReaderList.tsx"];
    const palette = "(?:stone|red|blue|green|amber|emerald|yellow|orange|sky|slate|gray|zinc|neutral)-\\d{2,3}";
    const known = new Set((await src("scripts/contrast-dark.mjs")).match(new RegExp(`"${palette}"`, "g"))?.map((s) => s.slice(1, -1)) ?? []);
    assert.ok(known.size > 5);
    for (const f of files) {
      const used = (await src(f)).match(new RegExp(`(?:bg|text|border)-${palette}`, "g")) ?? [];
      for (const cls of used) {
        const name = cls.replace(/^(?:bg|text|border)-/, "");
        assert.ok(known.has(name), `${f}: ${cls} is not in scripts/contrast-dark.mjs`);
      }
    }
  });
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
console.log(`vw77e-test: ${count} passed`);
