// VW85 (round 91, card P11.2): server-free tests of the book run in the step view and the training monitor, the frozen boxes and the overflow queue.
// Owner pick Q-A 3:26.3 "Book runs, frozen boxes, overflow":
//   (a) the step view and the training monitor work for a book run too; the Details view /monitor/<book> gets the links "Steps" and "Training monitor";
//       the run view of a book-run list shows the same tree and the training monitor, as for phase 2.
//   (b) a frozen box shows "Frozen since page n" in the step view, in the training monitor header, and in the Details view.
//   (c) the Details view shows the overflow count; the training monitor of the start box lists each overflow critique with its content and start point.
// Run: TMPDIR=<unit>/tmp node scripts/vw85-test.mjs (from the app folder). The last line is "<n> passed, <m> failed".
// Made-up data only, in the file layout of the Translator code (cited at each file below). No real ID, no live folder, no server, no network.
import assert from "node:assert/strict";
import { readFileSync, promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, htmlText, installAppHooks, jl, madeUpRoot, snapshot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
globalThis.fetch = async () => {
  throw new Error("Network is disabled in the VW85 tests.");
};
installAppHooks(app);
const { check, done } = checker();
const read = (rel) => readFileSync(path.join(app, rel), "utf8");

// ---------------------------------------------------------------- made-up data folder

const { base, root, w } = await madeUpRoot("vw85-test-");
// The loaders of the Details view and the run view read the data folder of viewer.config.json (lib/config.ts). VIEWER_CONFIG points to a test file.
await w("viewer.config.json", { translatorDataDir: root });
process.env.VIEWER_CONFIG = path.join(root, "viewer.config.json");

const SLUG = "madeup-book";
const TITLE = "Made-up book title";
const STORE = `book-store/${SLUG}`; // translator_run.py:130 BOOK_STORE_ROOT
const RUN0 = "2026-11-10T09:00:00-08:00"; // an older run of the book, ended by a restart
const RUN = "2026-11-13T09:00:00-08:00"; // run ID form: BS.pst_iso() (translator_run.py:3255-3257)
const LB = "20261113T170000Z";
const L2 = "20261112T044136Z"; // a phase 2 list in the same data folder
// Book page IDs "<slug>/p%0*d" (translator/pages.py:59-60). Page run folders pilot-run/<page_safe_id>/<stamp>-r41 (programs.py:44-45 page_safe_id).
const B1 = `${SLUG}/p001`;
const B2 = `${SLUG}/p002`;
const B3 = `${SLUG}/p003`;
const FB1 = `pilot-run/${SLUG}_p001/20261113T170010Z-r41`;
const FB2 = `pilot-run/${SLUG}_p002/20261113T172000Z-r41`;
const FB3 = `pilot-run/${SLUG}_p003/20261113T174000Z-r41`;
const tok = (i, o) => ({ input: i, output: o, reasoning: 0, cache_read: 100, cache_write: 0 });
const call = (tag, utc, extra = {}) => ({ kind: "model", tag, box: tag.replace(/^box-critic\./, ""), model: tag.startsWith("TS_") ? "program" : "claude-aade7ca8/claude-sonnet-5-5", seconds: 90, tokens: tag.startsWith("TS_") ? undefined : tok(10, 5), ok: true, started_utc: utc, ...extra });
// Queue row shape: critique_queue.py:153-154.
const crit = (box, page, n, mode) => ({
  queue_id: `${box}:${page}:${n}`,
  page_id: page,
  reviewed_box: box,
  instruction_version: "v4.0.0",
  source_type: "box-critic",
  critique: { critique_id: `${box}-C${n}`, failure_mode: mode, evidence: "made-up evidence", reason: `made-up reason ${n}`, note_for_next_step: "made-up note" },
});
const GRID = [0, 1, 2, 3].flatMap((n) => ["TS", "TL", "ED", "QA"].map((s) => `${s}_${n}`));

await w("item-metadata/items.filled.jsonl", jl([{ item_id: SLUG, title_en: TITLE, title_ja: "仮の本" }]));
// status.json keys: store.py:138-147 new_status, translator_run.py:3240 and 3304-3341 settle, freeze.py:126-136 sync_status (frozen_boxes).
await w(`${STORE}/status.json`, {
  book: SLUG,
  phase: "agent-phase-4",
  state: "running",
  run_id: RUN,
  list_stamp: LB,
  running_page: B3,
  running_boxes: ["TL_1"],
  pages_done: 2,
  pages_total: 3,
  book_pages: 3,
  fail_pages: [],
  update_n: 3,
  update_n_source: "rule",
  frozen_boxes: ["ED_1"],
});
// history.jsonl rows {utc, event, ...} (store.py:222-229). start: translator_run.py:3263. page-done: 3304-3341. box-frozen: freeze.py:77-92,
// written after update-point-ended (update_step.py:720). restart resets the run (critique_queue.py:38, 42-48).
await w(
  `${STORE}/history.jsonl`,
  jl([
    { utc: "2026-11-10T17:00:00Z", event: "start", phase: "agent-phase-4", run_id: RUN0, list_stamp: "20261110T170000Z", first_page: B1, pages_done: 0, pages_total: 3, update_n: 3, update_n_source: "rule" },
    { utc: "2026-11-10T18:00:00Z", event: "box-frozen", box: "QA_0", phase: "agent-phase-4", page: B1, pages: [B1] },
    { utc: "2026-11-10T19:00:00Z", event: "restart" },
    { utc: "2026-11-13T17:00:00Z", event: "start", phase: "agent-phase-4", run_id: RUN, list_stamp: LB, first_page: B1, pages_done: 0, pages_total: 3, update_n: 3, update_n_source: "rule" },
    { utc: "2026-11-13T17:15:00Z", event: "page-done", page: B1, folder: `data/${FB1}`, verdict: "PASS", status: "accepted", seconds: 900 },
    { utc: "2026-11-13T17:16:00Z", event: "update-point-started", box: "TL_2", page: B1, queue_ids: ["TL_2:madeup-book/p001:1"] },
    { utc: "2026-11-13T17:18:00Z", event: "prompt-live", box: "TL_2", version: "v4.0.1", parent: "v4.0.0" },
    { utc: "2026-11-13T17:19:00Z", event: "update-point-ended", box: "TL_2", result: "rewrite live", seconds: 180, hard_groups: 0, soft_groups: 1, queue_ids: ["TL_2:madeup-book/p001:1"] },
    { utc: "2026-11-13T17:35:00Z", event: "page-done", page: B2, folder: `data/${FB2}`, verdict: "PASS", status: "accepted", seconds: 1000 },
    { utc: "2026-11-13T17:36:00Z", event: "update-point-started", box: "ED_1", page: B2, queue_ids: [] },
    { utc: "2026-11-13T17:37:00Z", event: "update-point-ended", box: "ED_1", result: "no change", seconds: 60, hard_groups: 0, soft_groups: 1, queue_ids: [] },
    { utc: "2026-11-13T17:37:01Z", event: "box-frozen", box: "ED_1", phase: "agent-phase-4", page: B2, pages: ["madeup-book/p000", B1, B2] },
  ]) + '{"event": "page-done", "page": "broken\n',
);
// Overflow records: critique_queue.py:266-287 record_overflow {queue_id, content, start_box, page}, one JSON per line.
const OV1 = { queue_id: "TL_2:madeup-book/p001:2", content: crit("TL_2", B1, 2, "made-up overflow mode one").critique, start_box: "TL_2", page: B1 };
const OV2 = { queue_id: "ED_1:madeup-book/p002:1", content: crit("ED_1", B2, 1, "made-up overflow mode two").critique, start_box: "ED_1", page: B2 };
await w(`${STORE}/critiques/overflow.jsonl`, jl([OV1, OV2]) + "{half line");
// A book update point: update-points/<short page name> (store.py:239-262), calls and messages, no commit file (update_step.py:598-599, 641-646).
await w(`${STORE}/update-points/p001/calls.jsonl`, jl([call("TL_2-grouper", "2026-11-13T17:16:10Z", { update_role: "critique-grouper" })]));
await w(`${STORE}/update-points/p001/messages/TL_2-grouper.txt`, "Made-up text sent to the grouper.\n");
await w(`${STORE}/prompts/TL_2/v4.0.0.json`, { version: "v4.0.0", parent: null, text: "line one\nline two\n" });
await w(`${STORE}/prompts/TL_2/v4.0.1.json`, { version: "v4.0.1", parent: { version: "v4.0.0" }, text: "line one\nline 2\n" });
await w(`${STORE}/prompts/TL_2/current`, "v4.0.1\n");
// List folder: list.json and progress.json with {kind: "book-run", book, phase} (translator_run.py:3272-3276, 3290-3293; progress.py:239).
const bookList = { kind: "book-run", book: SLUG, phase: "agent-phase-4" };
await w(`pilot-run/lists/${LB}/list.json`, bookList);
await w(`pilot-run/lists/${LB}/progress.json`, {
  ...bookList,
  state: "running",
  pages: [
    { page_id: B1, kind: "book", state: "done", folder: `data/${FB1}` },
    { page_id: B2, kind: "book", state: "done", folder: `data/${FB2}` },
    { page_id: B3, kind: "book", state: "running", folder: `data/${FB3}`, started_epoch: 1794589200, calls_total: 24 },
  ],
});
await w(`pilot-run/lists/${L2}/progress.json`, { kind: "book-run", book: "paired-dataset", phase: "agent-phase-2", pages: [] });
for (const [F, page, t] of [
  [FB1, B1, "17:0"],
  [FB2, B2, "17:2"],
]) {
  await w(`${F}/calls.jsonl`, jl([...GRID.map((b) => call(b, `2026-11-13T${t}1:00Z`)), call("box-critic.TL_2", `2026-11-13T${t}5:00Z`)]));
  await w(`${F}/run.json`, { page, prompts: { TL_2: { version: page === B1 ? "v4.0.0" : "v4.0.1" } } });
  await w(`${F}/summary.json`, { wall_seconds: 900, qa: { QA_3: { verdict: "PASS", page_score: 8 } } });
  await w(`${F}/critiques/queue-TL_2.jsonl`, jl([crit("TL_2", page, 1, "made-up mode A")]));
}
await w(`${FB3}/calls.jsonl`, jl(["TS_0", "TL_0", "ED_0", "QA_0", "TS_1"].map((b) => call(b, "2026-11-13T17:41:00Z"))));
await w(`${FB3}/run.json`, { page: B3, prompts: { TL_2: { version: "v4.0.1" } } });

const before = await snapshot(root);

// ---------------------------------------------------------------- part 1: pure rules (lib/run-store.ts)

const S = await import("../lib/run-store.ts");

await check("store: phase 2 keeps book-store/paired-dataset; a book uses book-store/<slug>; a moved phase uses its folder; history stays in the book folder", () => {
  assert.equal(S.PHASE2_STORE.dir, "book-store/paired-dataset");
  assert.equal(S.bookStore("paired-dataset"), S.PHASE2_STORE);
  const b = S.bookStore(SLUG, "agent-phase-3");
  assert.deepEqual([b.dir, b.historyRel, b.phase2, b.phase], [STORE, `${STORE}/history.jsonl`, false, "agent-phase-3"]);
  const m = S.bookStore(SLUG, "agent-phase-3", "agent-phase-3");
  assert.deepEqual([m.dir, m.historyRel], [`${STORE}/agent-phase-3`, `${STORE}/history.jsonl`]);
});

await check("page names: full ID with _ in paired-dataset, short form in a book (store.py page_name)", () => {
  assert.equal(S.pageName(S.PHASE2_STORE, "bbbb0001/p001"), "bbbb0001_p001");
  assert.equal(S.pageName(S.bookStore(SLUG), B1), "p001");
  assert.equal(S.bookPageNumber(B1), "page 1");
  assert.equal(S.bookPageNumber("madeup-book/p060"), "page 60");
  assert.equal(S.bookPageText(B2, TITLE), `${TITLE}, page 2 (${B2})`);
  assert.equal(S.bookPageText(B2, null), `page 2 (${B2})`);
});

await check("store query: phase 2 sends nothing; a book list sends list=; a book without a list sends book=", () => {
  assert.equal(S.storeQuery({ book: null, list: L2 }), null);
  assert.equal(S.storeQuery({ book: "paired-dataset", list: L2 }), null);
  assert.equal(S.storeQuery({ book: SLUG, list: LB }), `list=${LB}`);
  assert.equal(S.storeQuery({ book: SLUG, list: null }), `book=${SLUG}`);
  assert.equal(S.phaseWord("agent-phase-3"), "phase 3");
});

await check("book-run list: a real book counts, phase 2 and other list kinds do not", () => {
  assert.equal(S.bookRunBookOf(bookList), SLUG);
  assert.equal(S.bookRunBookOf({ kind: "book-run", book: "paired-dataset" }), null);
  assert.equal(S.bookRunBookOf({ kind: "chain", book: SLUG }), null);
  assert.equal(S.bookRunBookOf({ kind: "book-run", book: "../x" }), null);
  assert.equal(S.bookRunBookOf(null), null);
});

await check("frozen boxes: current run only, after the last restart; first event per box; grid order; text 'Frozen since page n'", () => {
  const rows = [
    { event: "start", run_id: "r0" },
    { event: "box-frozen", box: "QA_0", page: B1 },
    { event: "restart" },
    { event: "start", run_id: "r1" },
    { event: "box-frozen", box: "TL_3", page: B3, pages: [B1, B2, B3], utc: "2026-11-13T18:00:00Z" },
    { event: "box-frozen", box: "ED_1", page: B2 },
    { event: "box-frozen", box: "ED_1", page: B3 },
  ];
  const now = S.frozenBoxes(rows, null);
  assert.deepEqual(now.map((f) => [f.box, f.text]), [
    ["ED_1", "Frozen since page 2"],
    ["TL_3", "Frozen since page 3"],
  ]);
  assert.deepEqual(now[1].pages, [B1, B2, B3]);
  assert.ok(now[1].epoch > 0);
  assert.deepEqual(S.frozenBoxes(rows, "r0").map((f) => f.box), ["QA_0"]);
  assert.equal(S.frozenText(null), "Frozen (page not stored)");
  assert.deepEqual(S.frozenBoxes([{ event: "phase-changed" }], null), []);
});

await check("overflow: rows in file order, broken lines skipped, count per start box in grid order, count and start texts", () => {
  const rows = S.parseOverflow(jl([OV1, OV2, { content: {} }]) + "{half");
  assert.deepEqual(rows.map((r) => [r.queueId, r.startBox, r.page, r.failureMode]), [
    [OV1.queue_id, "TL_2", B1, "made-up overflow mode one"],
    [OV2.queue_id, "ED_1", B2, "made-up overflow mode two"],
  ]);
  assert.deepEqual(S.overflowByBox(rows), [
    { box: "ED_1", n: 1 },
    { box: "TL_2", n: 1 },
  ]);
  assert.equal(S.overflowCountText(0), "No overflow critiques");
  assert.equal(S.overflowCountText(1), "1 overflow critique");
  assert.equal(S.overflowCountText(2), "2 overflow critiques");
  assert.equal(S.overflowStartText(rows[0], TITLE), `TL_2, ${TITLE}, page 1 (${B1})`);
  assert.deepEqual(S.parseOverflow(null), []);
});

await check("Details view part: list of the current run, links, frozen and overflow; pilot and phase 2 lists do not count", () => {
  const lists = [
    { stamp: "20261101T000000Z", listKind: "list" },
    { stamp: L2, listKind: "book-run", phase2List: true },
    { stamp: "20261112T000000Z", listKind: "book-run" },
    { stamp: LB, listKind: "book-run" },
  ];
  assert.equal(S.watchListStamp(LB, lists), LB);
  assert.equal(S.watchListStamp("20261101T000000Z", lists), LB, "a pilot list in status.json does not count; the newest book-run list wins");
  assert.equal(S.watchListStamp(null, [{ stamp: "20261101T000000Z", listKind: "list" }]), null);
  const wv = S.bookWatch(SLUG, [{ event: "start", run_id: RUN }, { event: "box-frozen", box: "ED_1", page: B2 }], S.parseOverflow(jl([OV1, OV2])), LB);
  assert.equal(wv.stepsHref, `/monitor/${SLUG}/steps`);
  assert.equal(wv.monitorHref, `/runs/${LB}#training-monitor`);
  assert.equal(wv.overflow.count, 2);
  assert.equal(wv.frozen[0].text, "Frozen since page 2");
  assert.equal(S.bookWatch(SLUG, [], [], null).monitorHref, null);
  assert.equal(S.bookWatch(SLUG, [], [], "../x").monitorHref, null);
  assert.equal(S.showsWatch(false, 0, null), false);
  assert.equal(S.showsWatch(true, 0, null), true);
});

// ---------------------------------------------------------------- part 2: loaders on the made-up book run

const RL = await import("../lib/run-store-load.ts");
const SL = await import("../lib/step-tree-load.ts");
const Lo = await import("../lib/training-monitor-load.ts");

await check("store of a list: a book-run list gives the book store; a phase 2 list, a missing list and a bad name give the phase 2 store", async () => {
  const b = await RL.storeOfList(root, LB);
  assert.deepEqual([b.book, b.dir, b.phase2, b.phase], [SLUG, STORE, false, "agent-phase-4"]);
  assert.equal(await RL.storeOfList(root, L2), S.PHASE2_STORE);
  assert.equal(await RL.storeOfList(root, "20990101T000000Z"), S.PHASE2_STORE);
  assert.equal(await RL.storeOfList(root, "../x"), S.PHASE2_STORE);
  assert.deepEqual(await RL.storeOfQuery(root, "../x", null), { error: "The list name is not valid." });
  assert.deepEqual(await RL.storeOfQuery(root, null, "a/b"), { error: "The book name is not valid." });
  assert.equal((await RL.storeOfQuery(root, null, SLUG)).dir, STORE);
  assert.equal(await RL.storeOfQuery(root, null, null), S.PHASE2_STORE);
  assert.equal(await RL.bookTitleAt(root, SLUG), TITLE);
  assert.equal(await RL.bookTitleAt(root, "no-such-book"), null);
});

await check("store of a list after a phase change: the moved folder book-store/<book>/<phase> wins", async () => {
  const other = await madeUpRoot("vw85-moved-");
  await other.w(`pilot-run/lists/${LB}/progress.json`, { ...bookList, phase: "agent-phase-3" });
  await other.w(`${STORE}/agent-phase-3/status.json`, { state: "completed" });
  const s = await RL.storeOfList(other.root, LB);
  assert.deepEqual([s.dir, s.historyRel], [`${STORE}/agent-phase-3`, `${STORE}/history.jsonl`]);
  await fs.rm(other.base, { recursive: true, force: true });
});

const bookSt = S.bookStore(SLUG);
const sum = await SL.loadStepSummary(root, null, null, bookSt);

await check("step view of the book: run label with phase and title, pages in run order with title and page number, running page", () => {
  assert.equal(sum.error, null);
  assert.equal(sum.runId, RUN);
  assert.equal(sum.runLabel, `phase 4 run of ${TITLE} started 2026-11-13 09:00 PST`);
  assert.equal(sum.runWord.pill, "running");
  assert.ok(!/phase 2/.test(sum.runWord.help), sum.runWord.help);
  assert.deepEqual(sum.lists.map((l) => l.stamp), [LB]);
  assert.deepEqual(sum.pages.map((p) => [p.pageId, p.title, p.pageOf, p.state]), [
    [B1, TITLE, "page 1", "accepted"],
    [B2, TITLE, "page 2", "accepted"],
    [B3, TITLE, "page 3", "running"],
  ]);
  assert.deepEqual(sum.book, { slug: SLUG, title: TITLE, phase: "agent-phase-4" });
});

await check("step view of the book: frozen boxes of this run only (ED_1, not QA_0 of the old run)", () => {
  assert.deepEqual(sum.frozen.map((f) => [f.box, f.text, f.page]), [["ED_1", "Frozen since page 2", B2]]);
});

await check("step view of the book: update points with the book page text and the calls of update-points/p001", () => {
  const u = sum.updates.find((x) => x.box === "TL_2");
  assert.ok(u, "TL_2 update point");
  assert.equal(u.page, B1);
  assert.equal(u.pageText, `${TITLE}, page 1 (${B1})`);
  assert.equal(u.calls, 1);
  assert.ok(sum.updates.some((x) => x.box === "ED_1"));
});

await check("step view of the book from the list stamp gives the same run", async () => {
  const s2 = await SL.loadStepSummary(root, LB, null, await RL.storeOfList(root, LB));
  assert.equal(s2.runId, RUN);
  assert.equal(s2.pages.length, 3);
  assert.equal(s2.frozen.length, 1);
});

await check("step data of a book update point: no commit file, a plain note", async () => {
  const d = await SL.loadStepData(root, { folder: null, step: "update:TL_2", page: B1, diff: null, version: null }, bookSt);
  assert.ok(d && Array.isArray(d.sections), "sections");
  assert.ok(!/cannot be read|not valid/i.test(JSON.stringify(d.sections.filter((s) => s.kind === "note"))), JSON.stringify(d.sections.slice(0, 2)));
});

await check("a book without a store or a list gives a plain sentence, not an error", async () => {
  const s = await SL.loadStepSummary(root, null, null, S.bookStore("no-such-book"));
  assert.match(s.error, /^No run of the book no-such-book found/);
  assert.equal(s.pages.length, 0);
});

const tl2 = await Lo.loadBoxMonitor(root, LB, "TL_2");
const ed1 = await Lo.loadBoxMonitor(root, LB, "ED_1");

await check("training monitor of a book box: no error, book facts, page calls of the book pages, the update point", () => {
  assert.equal(tl2.error, null);
  assert.deepEqual(tl2.book, { slug: SLUG, title: TITLE, phase: "agent-phase-4" });
  assert.match(tl2.runLabel, /^phase 4 run of Made-up book title started/);
  assert.equal(tl2.stats.versions.live, "v4.0.1");
  assert.equal(tl2.stats.calls.pages, 2);
  assert.equal(tl2.stats.updates.total, 1);
  assert.equal(tl2.stats.critiques.total, 2);
  assert.equal(tl2.frozen, null);
});

await check("training monitor: overflow critiques of the start box only, with content and start point", () => {
  assert.deepEqual(tl2.overflow.map((r) => [r.queueId, r.startBox, r.page]), [[OV1.queue_id, "TL_2", B1]]);
  assert.deepEqual(ed1.overflow.map((r) => r.queueId), [OV2.queue_id]);
  assert.equal(ed1.overflow[0].failureMode, "made-up overflow mode two");
});

await check("training monitor header: the frozen box gets 'Frozen since page 2'", () => {
  assert.equal(ed1.frozen.text, "Frozen since page 2");
  assert.equal(ed1.frozen.page, B2);
});

await check("opened update point of a book: the plain note that a book writes no commit file", async () => {
  const d = await Lo.loadMonitorItem(root, { item: "update", box: "TL_2", folder: null, queueId: null, page: B1, change: null }, bookSt);
  assert.ok(JSON.stringify(d.sections).includes("A book update point writes no commit file"));
});

await check("phase 2 training monitor in the same folder: no book facts, no frozen line, no overflow keys", async () => {
  const m = await Lo.loadBoxMonitor(root, L2, "TL_2");
  assert.equal(m.book, undefined);
  assert.equal(m.frozen, undefined);
  assert.equal(m.overflow, undefined);
  const s = await SL.loadStepSummary(root, null, null);
  assert.equal(s.book, undefined);
  assert.equal(s.frozen, undefined);
});

// ---------------------------------------------------------------- part 3: run view and Details view data

const R = await import("../lib/runs.ts");
const BD = await import("../lib/book-detail.ts");

await check("run view data: a book-run list names its book and title; a phase 2 list does not", async () => {
  const r = await R.getRun(LB);
  assert.equal(r.bookRunBook, SLUG);
  assert.equal(r.bookRunTitle, TITLE);
  assert.notEqual(r.phase2List, true);
  const p2 = await R.getRun(L2);
  assert.equal(p2.phase2List, true);
  assert.equal(p2.bookRunBook, undefined);
});

let detail = null;
await check("Details view data: links Steps and Training monitor, frozen ED_1, 2 overflow critiques", async () => {
  detail = await BD.loadBookDetail(SLUG);
  assert.ok(detail, "the made-up book is in the book set");
  const wv = detail.watch;
  assert.ok(wv, "watch part");
  assert.equal(wv.stepsHref, `/monitor/${SLUG}/steps`);
  assert.equal(wv.monitorHref, `/runs/${LB}#training-monitor`);
  assert.deepEqual(wv.frozen.map((f) => [f.box, f.text]), [["ED_1", "Frozen since page 2"]]);
  assert.equal(wv.overflow.count, 2);
});

await check("the loaders wrote nothing in the data folder", async () => {
  assert.deepEqual(await snapshot(root), before);
});

// This check changes a file on purpose, so it runs after the snapshot check.
await check("training monitor signature: two reads give the same signature; a new overflow row changes it", async () => {
  const again = await Lo.loadBoxMonitor(root, LB, "TL_2");
  assert.equal(again.sig, tl2.sig);
  await fs.writeFile(path.join(root, STORE, "critiques", "overflow.jsonl"), jl([OV1, { ...OV1, queue_id: "TL_2:madeup-book/p002:9", page: B2 }]));
  const next = await Lo.loadBoxMonitor(root, LB, "TL_2");
  assert.notEqual(next.sig, tl2.sig);
  assert.equal(next.overflow.length, 2);
});

// ---------------------------------------------------------------- part 4: rendered text

const React = createRequire(path.join(app, "package.json"))("react");
const { renderToStaticMarkup } = createRequire(path.join(app, "package.json"))("react-dom/server");
const P = await import("../components/RunStoreParts.tsx");
const h = (c, props) => renderToStaticMarkup(React.createElement(c, props));

await check("render: step view part 'Frozen boxes' with the box code, its hover name and 'Frozen since page 2'; nothing for phase 2", () => {
  const html = h(P.FrozenBoxes, { frozen: sum.frozen, title: TITLE, book: true });
  const t = htmlText(html);
  assert.ok(html.includes("data-frozen-boxes"));
  assert.ok(t.includes("Frozen boxes (1)"));
  assert.ok(t.includes("ED_1"));
  assert.ok(t.includes("Frozen since page 2"));
  assert.ok(t.includes(`${TITLE}, page 2 (${B2})`));
  assert.ok(/title="ED_1: /.test(html), "hover name of the box");
  assert.equal(h(P.FrozenBoxes, { frozen: undefined, title: null, book: false }), "");
  assert.ok(htmlText(h(P.FrozenBoxes, { frozen: [], title: null, book: true })).includes("No box of this run is frozen"));
});

await check("render: overflow list of the start box with content and start point", () => {
  const html = h(P.OverflowList, { box: "TL_2", rows: tl2.overflow, title: TITLE });
  const t = htmlText(html);
  assert.ok(html.includes('data-overflow-list="TL_2"'));
  for (const s of ["Overflow critiques that started at", "(1)", `Start point: TL_2, ${TITLE}, page 1 (${B1})`, "Failure mode: made-up overflow mode one", "Reason: made-up reason 2", "Evidence: made-up evidence", "Note for the next step: made-up note", OV1.queue_id]) assert.ok(t.includes(s), `missing: ${s}`);
  assert.ok(htmlText(h(P.OverflowList, { box: "QA_3", rows: [], title: null })).includes("No overflow critique started at this box"));
});

await check("render: Details view part with the links Steps and Training monitor, the frozen line and the overflow count", () => {
  const html = h(P.BookRunWatch, { watch: detail.watch, title: TITLE });
  const t = htmlText(html);
  assert.ok(html.includes(`href="/monitor/${SLUG}/steps"`));
  assert.ok(html.includes(`href="/runs/${LB}#training-monitor"`));
  for (const s of ["Steps", "Training monitor", "Frozen boxes (1)", "Frozen since page 2", "2 overflow critiques"]) assert.ok(t.includes(s), `missing: ${s}`);
  // A box code carries its name for a screen reader in a hidden text "(name)" (components/BoxCode.tsx).
  assert.match(t, /start box: ED_1 \(.*?\) 1 ?, TL_2 \(.*?\) 1 ?\)/);
});

await check("render: book run sections of the run view (training monitor text for a book, step tree heading with title and slug)", async () => {
  const B = await import("../components/BookRunSections.tsx");
  // Unit VW99 (Q-A 3:27.3): each section shows in its own tab of the run view, so the test renders one tab at a time.
  const training = h(B.default, { stamp: LB, book: SLUG, title: TITLE, open: "training" });
  assert.ok(training.includes('id="training-monitor"'));
  assert.ok(htmlText(training).includes("whole history in this book run"));
  const html = h(B.default, { stamp: LB, book: SLUG, title: TITLE, open: "steps" });
  const t = htmlText(html);
  assert.ok(t.includes(`Steps of this book run: ${TITLE}`));
  assert.ok(t.includes(`/monitor/${SLUG}/steps`));
  assert.ok(t.includes("Loading the steps of the book run"));
  assert.ok(html.includes(`data-run-steps-book="${SLUG}"`));
  assert.ok(!html.includes('id="training-monitor"'), "the closed tab Training monitor is not in the page");
  const updates = h(B.default, { stamp: LB, book: SLUG, title: TITLE, open: "updates" });
  assert.ok(updates.includes(`data-run-updates-book="${SLUG}"`));
  assert.equal(h(B.default, { stamp: LB, book: SLUG, title: TITLE, open: "pages" }), "");
});

await check("render: the phase 2 training monitor keeps its words", async () => {
  const TM = await import("../components/TrainingMonitor.tsx");
  const t = htmlText(h(TM.TrainingMonitor, { stamp: L2 }));
  assert.ok(t.includes("Pick a box to see its whole history in this phase 2 run, across restarts: its page calls, the critiques that it got, its update points, and the rubric table changes (QA boxes). Hover a code for the name of the box."));
  assert.ok(!t.includes("book run"));
});

await check("render: no money and no e-mail address in the new parts", () => {
  const all = [h(P.FrozenBoxes, { frozen: sum.frozen, title: TITLE, book: true }), h(P.OverflowList, { box: "TL_2", rows: tl2.overflow, title: TITLE }), h(P.BookRunWatch, { watch: detail.watch, title: TITLE })].map(htmlText).join(" ");
  assert.ok(!/USD|\$|cost/i.test(all), "money");
  assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(all), "e-mail");
});

// ---------------------------------------------------------------- part 5: sources (phase 2 lines kept, new route present)

await check("sources: the phase 2 lines of the run view and the step view route stay; the book route and the book sections exist", () => {
  const rv = read("components/RunView.tsx");
  // Unit VW99 (Q-A 3:27.3): the phase 2 sections sit in the tabs "Training monitor", "Steps" and "Prompt updates".
  assert.ok(rv.includes('{open === "training" && run.phase2List === true ? <TrainingMonitor stamp={run.stamp} /> : null}'));
  assert.ok(rv.includes('<h2 className="section-band mb-1 text-lg font-semibold">Steps of this phase 2 run</h2>'));
  assert.ok(rv.includes("<StepView initial={null} list={run.stamp} />"));
  assert.ok(rv.includes("<StepView initial={null} list={run.stamp} showTree={false} showUpdates />"));
  assert.match(rv, /run\.phase2List !== true && run\.bookRunBook \? <BookRunSections/);
  const p2 = read("app/monitor/phase-2/page.tsx");
  assert.ok(p2.includes("Steps of the phase 2 run"));
  assert.ok(p2.includes("<StepView initial={initial} list={null} />"));
  const steps = read("app/monitor/[slug]/steps/page.tsx");
  assert.ok(steps.includes("bookStore(slug)"));
  assert.ok(steps.includes('redirect("/monitor/phase-2")'));
  assert.ok(read("components/BookDetailView.tsx").includes('<Section part="book-watch"'));
});

await fs.rm(base, { recursive: true, force: true });
done();
