// VW94 (round 91): server-free tests of the phase 2 articles (Q-A 3:17.4 "One grouped row", Q-A 3:17.5 "Mark it in the run view"),
// the box codes with a hover (Q-A 3:18.5 "Keep codes, explain on hover"), and the plain words of the run view (Q-A 3:17.4).
// Run: scripts/dev/cleanenv.sh node scripts/vw94-test.mjs (from the app folder; the wrapper sets TMPDIR).
// Part 1 tests the pure helpers with small inline fixtures. Part 2 writes a small synthetic data folder below $TMPDIR (made-up 8-hex-digit IDs and
// made-up titles, the same field names and shapes as the files of the Translator), points VIEWER_CONFIG at it, and calls loadMonitor and getRun.
// No real data: the branch v2/viewer goes to a public repo (docs/agents/git.md "Ignored data"). The test reads no live data, starts no server,
// makes no network call, and removes its folder at the end. The last line is "<n> passed, <m> failed". The exit code is 1 on any failure.
import assert from "node:assert/strict";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

const app = path.resolve(import.meta.dirname, "..");
assert.ok(process.env.TMPDIR, "Set TMPDIR (use scripts/dev/cleanenv.sh)");
globalThis.fetch = async () => { throw new Error("Network is disabled in the VW94 tests."); };
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(pathToFileURL(path.join(app, specifier.slice(2)) + ".ts").href, context);
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !path.extname(specifier)) return next(new URL(specifier + ".ts", context.parentURL).href, context);
    return next(specifier, context);
  },
  load(url, context, next) { if (url.endsWith(".ts")) return { ...next(url, { ...context, format: "module-typescript" }), format: "module-typescript" }; return next(url, context); },
});

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`ok    ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}\n      ${String(e && e.message ? e.message : e).split("\n").slice(0, 6).join("\n      ")}`);
  }
}
async function checkAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok    ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}\n      ${String(e && e.message ? e.message : e).split("\n").slice(0, 6).join("\n      ")}`);
  }
}

const A = await import("../lib/phase2-articles.ts");

// ---------------------------------------------------------------- part 1: pure helpers

const P2 = (pages) => ({ kind: "book-run", book: "paired-dataset", phase: "agent-phase-2", pages: pages.map((page_id) => ({ page_id, state: "waiting" })) });
check("list filter: a progress.json with book paired-dataset is a phase 2 list", () => assert.equal(A.isPhase2List(P2(["a1b2c3d4/p001"])), true));
check("list filter: a chain list of a book and a broken value are no phase 2 list", () => {
  assert.equal(A.isPhase2List({ kind: "chain", pages: [{ page_id: "left_foot_full/p046" }] }), false);
  assert.equal(A.isPhase2List(null), false);
  assert.equal(A.isPhase2List([1, 2]), false);
});
check("short ID: 8 hex digits only", () => {
  assert.equal(A.shortIdOf("a1b2c3d4/p001"), "a1b2c3d4");
  assert.equal(A.shortIdOf("left_foot_full/p046"), null);
  assert.equal(A.shortIdOf("a1b2c3d/p001"), null);
});

const recs = A.parseTitleRecords(
  [
    JSON.stringify({ item_id: "a1b2c3d4-0000-4000-8000-000000000001", title_en: "Sample article A, part 1: first steps", title_ja: "見本の記事 A 第1部" }),
    "{broken line",
    JSON.stringify({ item_id: "aaaa1111-0000-0000-0000-000000000001", title_en: "One", title_ja: "一" }),
    JSON.stringify({ item_id: "aaaa1111-0000-0000-0000-000000000002", title_en: "Two", title_ja: "二" }),
    JSON.stringify({ item_id: "bbbb2222-0000-0000-0000-000000000003", title_ja: "日本語だけ" }),
  ].join("\n"),
);
const names = A.articleNames(["a1b2c3d4", "aaaa1111", "cccc3333", "bbbb2222"], recs);
check("titles: a broken line is skipped (4 records)", () => assert.equal(recs.length, 4));
check("titles: a unique prefix gives the English and Japanese title", () => {
  const n = names.get("a1b2c3d4");
  assert.equal(n.match, "one");
  assert.equal(n.en, "Sample article A, part 1: first steps");
  assert.equal(n.ja, "見本の記事 A 第1部");
  assert.equal(A.nameMain(n), n.en);
});
check("titles: a prefix of several items gives 'title not found'", () => {
  assert.equal(names.get("aaaa1111").match, "several");
  assert.equal(A.nameMain(names.get("aaaa1111")), "title not found");
});
check("titles: a prefix of no item gives 'title not found'", () => {
  assert.equal(names.get("cccc3333").match, "none");
  assert.equal(A.nameMain(names.get("cccc3333")), "title not found");
});
check("titles: no English title falls back to the Japanese title", () => assert.equal(A.nameMain(names.get("bbbb2222")), "日本語だけ"));

const order = ["a1b2c3d4/p001", "a1b2c3d4/p002", "a1b2c3d4/p003", "aaaa1111/p001", "cccc3333/p001", "cccc3333/p002"];
check("page of article: 'page 2 of 3'", () => {
  assert.equal(A.pageOfArticle("a1b2c3d4/p002", order), "page 2 of 3");
  assert.equal(A.pageOfArticle("zzzz/p001", order), null);
});
check("page text: title, page n of m, and the ID", () =>
  assert.equal(A.pageText("a1b2c3d4/p001", order, names), "Sample article A, part 1: first steps, page 1 of 3 (a1b2c3d4/p001)"));
const B = await import("../lib/box-names.ts");
check("box hover: the code stays, the hover gives the stage role of messages.py GRID_BOX_ROLE and the level", () => {
  assert.equal(B.boxHelp("QA_2"), "QA_2: quality check stage, judges the English text against the Japanese text. Level 2 of 4 (0 weakest model, 3 strongest model).");
  assert.equal(B.boxHelp("TS_0"), "TS_0: transcription stage, writes the Japanese text of the page. Level 0 of 4 (0 weakest model, 3 strongest model).");
  assert.ok(B.boxHelp("TL_3").startsWith("TL_3: translation stage, writes the English draft of the page. Level 3"));
  assert.ok(B.boxHelp("ED_1").startsWith("ED_1: edit stage, revises the English draft against the Japanese text. Level 1"));
  assert.equal(B.boxHelp("box-critic.ED_2"), "box-critic.ED_2: the critic call of box ED_2. ED_2: edit stage, revises the English draft against the Japanese text. Level 2 of 4 (0 weakest model, 3 strongest model).");
  assert.equal(B.boxHelp("CRITIC"), null);
  assert.equal(B.boxHelp("QA_4"), null);
});
check("box hover: a text is cut into plain parts and box codes", () => {
  const parts = B.splitBoxCodes("Now: page 3 of 3, boxes QA_2, box-critic.ED_2.");
  assert.deepEqual(parts.map((x) => [x.text, !!x.box]), [["Now: page 3 of 3, boxes ", false], ["QA_2", true], [", ", false], ["box-critic.ED_2", true], [".", false]]);
  assert.deepEqual(B.splitBoxCodes("no code here").map((x) => x.text), ["no code here"]);
  assert.deepEqual(B.splitBoxCodes("").map((x) => x.text), [""]);
  assert.deepEqual(B.splitBoxCodes("XQA_2 QA_22 a.QA_2").filter((x) => x.box).length, 0);
});
const W = await import("../lib/run-view-words.ts");
check("run view words: list and page states in plain words, the value stays in the hover", () => {
  assert.equal(W.listStateWord("running").label, "Translating now");
  assert.equal(W.listStateWord("completed").label, "Translated");
  assert.equal(W.listStateWord("completed with failures").label, "Translated, with failures");
  assert.equal(W.listStateWord("stopped").label, "Stopped");
  assert.equal(W.pageStateWord("waiting").label, "Not started yet");
  assert.equal(W.pageStateWord("running").label, "Translating now");
  assert.equal(W.pageStateWord("done").label, "Translated");
  assert.ok(W.pageStateWord("done").help.includes("(state done)"));
  assert.equal(W.pageStateWord("odd").label, "odd");
  for (const t of [W.LIST_STATE_WORDS, W.PAGE_STATE_WORDS]) for (const k of Object.keys(t)) assert.ok(!/^(running|done|finished)$/i.test(t[k].label), k);
});
check("run view words: heading of a phase 2 list, a chain list and a pilot list", () => {
  assert.equal(W.runHeading("20261112T044136Z", "book-run", true), "Phase 2 run, list started 2026-11-11 20:41 PST");
  assert.equal(W.runHeading("20261029T051152Z", "chain", false), "Chain list, started 2026-10-28 21:11 PST");
  assert.equal(W.runHeading("20261026T182511Z", "list", false), "Pilot list, started 2026-10-26 10:25 PST");
  assert.equal(W.listKindWord("book-run", false), "Book run list");
});
check("list label: stamp to PST", () => {
  assert.equal(A.listLabel("20261112T044136Z"), "list started 2026-11-11 20:41 PST");
  assert.equal(A.listLabel("odd"), "list odd");
});

// history: real lines (shortened), a line with a control character in a text field, and a broken line
const H = [
  { utc: "2026-11-12T02:30:21Z", event: "start", run_id: "2026-11-11T18:30:21-08:00", list_stamp: "20261112T023016Z", pid: 97795 },
  { utc: "2026-11-12T02:53:46Z", event: "page-done", page: "a1b2c3d4/p001", folder: "data/pilot-run/a1b2c3d4_p001/20261112T023022Z-r41", verdict: "PASS", status: "completed" },
  { utc: "2026-11-12T02:53:46Z", event: "stopped", reason: "rule", text: "stopped: end of the forward pass\u0007 of a1b2c3d4/p001" },
  { utc: "2026-11-12T04:41:36Z", event: "start", run_id: "2026-11-11T18:30:21-08:00", list_stamp: "20261112T044136Z", pid: 5639 },
  { utc: "2026-11-12T05:00:27Z", event: "page-done", page: "a1b2c3d4/p002", folder: "data/pilot-run/a1b2c3d4_p002/20261112T044149Z-r41", verdict: "PASS", status: "completed" },
];
const htext = H.map((r) => JSON.stringify(r)).join("\n") + "\n{\"utc\": \"2026-11-12T05:01:00Z\", \"event\": \"page-do";
const rows = A.parseHistory(htext);
const hist = A.phase2History(rows);
check("history: each line parsed on its own, control character kept, broken last line skipped", () => {
  assert.equal(rows.length, 5);
  assert.ok(String(rows[2].text).includes("\u0007"));
});
check("history: list stamp to run ID from the start rows", () => {
  assert.equal(hist.listRun.get("20261112T023016Z"), "2026-11-11T18:30:21-08:00");
  assert.equal(hist.listRun.get("20261112T044136Z"), "2026-11-11T18:30:21-08:00");
  assert.equal(hist.pageEvents.length, 2);
  assert.equal(hist.pageEvents[0].listStamp, "20261112T023016Z");
  assert.equal(hist.pageEvents[0].runFolder, "20261112T023022Z-r41");
  assert.equal(hist.pageEvents[0].folder, "pilot-run/a1b2c3d4_p001/20261112T023022Z-r41");
});
check("accepted before restart: the new list gets p001 of the old list, with the page view link", () => {
  const b = A.acceptedBeforeRestart("20261112T044136Z", hist);
  assert.deepEqual([...b.keys()], ["a1b2c3d4/p001"]);
  const a = b.get("a1b2c3d4/p001");
  assert.equal(a.verdict, "PASS");
  assert.equal(a.href, "/page/a1b2c3d4/p001?run=20261112T023022Z-r41");
  assert.equal(A.acceptedBeforeText(a), "Accepted before restart: verdict PASS, Nov 11 18:53 PST, in the list started 2026-11-11 18:30 PST.");
});
check("accepted before restart: the old list itself gets nothing (no earlier list)", () => assert.equal(A.acceptedBeforeRestart("20261112T023016Z", hist).size, 0));
check("accepted before restart: a list of another run or with no start row gets nothing", () => {
  const other = A.phase2History([...rows, { utc: "2026-11-13T00:00:00Z", event: "start", run_id: "2026-11-12T16:00:00-08:00", list_stamp: "20261113T000000Z" }]);
  assert.equal(A.acceptedBeforeRestart("20261113T000000Z", other).size, 0);
  assert.equal(A.acceptedBeforeRestart("20261114T000000Z", other).size, 0);
});
check("accepted before restart: a later page-failed of the same page in an earlier list cancels it", () => {
  const h2 = A.phase2History([...rows.slice(0, 3), { utc: "2026-11-12T03:00:00Z", event: "page-failed", page: "a1b2c3d4/p001", folder: "data/pilot-run/a1b2c3d4_p001/x", verdict: null }, ...rows.slice(3)]);
  assert.equal(A.acceptedBeforeRestart("20261112T044136Z", h2).size, 0);
});
check("accepted before restart: only rows with state waiting and 0 calls show the mark", () => {
  assert.equal(A.showsAcceptedBefore({ state: "waiting", callsDone: 0 }), true);
  assert.equal(A.showsAcceptedBefore({ state: "done", callsDone: 24 }), false);
  assert.equal(A.showsAcceptedBefore({ state: "waiting", callsDone: 3 }), false);
});

// article states across restarts
const acc = new Set(["a1b2c3d4/p001", "a1b2c3d4/p002"]);
check("article state: accepted in an old list and the new list, running in the new list", () => {
  assert.deepEqual(A.articleState(["a1b2c3d4/p001", "a1b2c3d4/p002", "a1b2c3d4/p003"], acc, new Set(), "a1b2c3d4/p003", true), { key: "translating", text: "Translating now: page 3 of 3" });
});
check("article state: all pages accepted (one accepted before the restart)", () => {
  assert.deepEqual(A.articleState(["a1b2c3d4/p001", "a1b2c3d4/p002"], acc, new Set(), "e5f6a7b8/p001", true), { key: "accepted", text: "Accepted: 2 of 2 pages" });
});
check("article state: not started yet", () => assert.deepEqual(A.articleState(["cccc3333/p001"], acc, new Set(), "a1b2c3d4/p003", true), { key: "not-started", text: "Not started yet" }));
check("article state: partly accepted while the run runs, stopped when it does not", () => {
  const pages = ["a1b2c3d4/p001", "a1b2c3d4/p002", "a1b2c3d4/p003"];
  assert.equal(A.articleState(pages, acc, new Set(), null, true).key, "partly");
  assert.deepEqual(A.articleState(pages, acc, new Set(), "a1b2c3d4/p003", false), { key: "stopped", text: "Stopped: 2 of 3 pages accepted" });
});
check("article state: a page-failed page gives 'Not accepted'", () => assert.deepEqual(A.articleState(["x0000000/p001"], new Set(), new Set(["x0000000/p001"]), null, true), { key: "failed", text: "Not accepted: page 1 of 1" }));
check("article state: no state word is a bare 'Running'", () => {
  for (const k of Object.keys(A.ARTICLE_STATE_HELP)) assert.ok(!/^Running\b/.test(A.ARTICLE_STATE_HELP[k]), k);
});

const view = A.buildArticles({
  order,
  listStamp: "20261112T044136Z",
  status: { run_id: "2026-11-11T18:30:21-08:00", running_page: "a1b2c3d4/p003", running_boxes: ["QA_2"], accepted: ["a1b2c3d4/p001", "a1b2c3d4/p002"], fail_pages: [], last_accepted_page: "a1b2c3d4/p002" },
  runActive: true,
  history: hist,
  lastRow: rows[4],
  names,
});
check("grouped row: articles in list order with states and page links", () => {
  assert.deepEqual(view.articles.map((a) => a.shortId), ["a1b2c3d4", "aaaa1111", "cccc3333"]);
  assert.deepEqual(view.articles.map((a) => a.key), ["translating", "not-started", "not-started"]);
  const p = view.articles[0].pages;
  assert.equal(p[0].href, "/page/a1b2c3d4/p001?run=20261112T023022Z-r41");
  assert.equal(p[1].href, "/page/a1b2c3d4/p002?run=20261112T044149Z-r41");
  assert.equal(p[2].state, "translating");
  assert.equal(p[2].href, null);
  assert.deepEqual(view.missingTitles, ["aaaa1111", "cccc3333"]);
  assert.equal(view.runViewHref, "/runs/20261112T044136Z");
});
check("grouped row: count line", () => assert.equal(A.articlesCountText(view), "1 translating now · 2 not started yet"));
check("phase 2 row: readable now, last accepted, last event and run view lines", () => {
  const o = A.phase2Overrides(view, Date.UTC(2026, 10, 12, 5, 10, 27) / 1000, 2, 144);
  assert.equal(o.now.text, "Now: Sample article A, part 1: first steps, page 3 of 3 (a1b2c3d4/p003), box QA_2.");
  assert.equal(o["last-accepted"].links[0].href, "/page/a1b2c3d4/p002?run=20261112T044149Z-r41");
  assert.ok(o["last-accepted"].text.startsWith("Last accepted page: Sample article A, part 1: first steps, page 2 of 3 (a1b2c3d4/p002)."));
  assert.equal(o["last-event"].text, "Last event: page-done (page accepted: Sample article A, part 1: first steps, page 2 of 3 (a1b2c3d4/p002), verdict PASS), Nov 11 21:00 PST (10 min ago)");
  assert.deepEqual(o["run-view"].links, [{ text: "Run view", href: "/runs/20261112T044136Z" }]);
  assert.equal(o.progress.text, "Pages done: 2 of 144 (articles accepted: 0 of 3)");
});
check("phase 2 row: event texts of update points name the box code only (Q-A 3:18.5)", () => {
  assert.equal(A.eventText({ event: "update-point-ended", box: "QA_2", result: "rewrite live" }, order, names), "update-point-ended (prompt update of box QA_2 ended, result: rewrite live)");
  assert.equal(A.eventText({ event: "prompt-live", box: "TL_0", version: "v2.1.1" }, order, names), "prompt-live (prompt version v2.1.1 of box TL_0 is live)");
  assert.equal(A.eventText({ event: "odd" }, order, names), "odd");
});
check("phase 2 row: state help for Running, and the note of the empty group Running", () => {
  assert.equal(A.PHASE2_STATE_HELP.running, "the Translator process is alive and translates one page at a time.");
  assert.ok(A.runningGroupNote("running").startsWith("No book runs now."));
  assert.equal(A.runningGroupNote("stopped"), null);
});
check("grouped row: no list gives the kind no-list", () => {
  const v = A.buildArticles({ order: [], listStamp: null, status: null, runActive: false, history: hist, lastRow: null, names: new Map() });
  assert.equal(v.kind, "no-list");
  assert.equal(v.articles.length, 0);
});

// ---------------------------------------------------------------- part 2: server code on a small synthetic data folder

// Made-up data with the field names and shapes of the real files (status.json book-status-v1, history.jsonl, progress.json progress-v1,
// item-metadata/items.filled.jsonl). 4 articles, 7 pages. c0ffee01/p001 is also a page of an old pilot list without a book key.
// 0badcafe matches no item (title not found). The phase 2 run restarted: list S1 (stopped) accepted a1b2c3d4/p001, list S2 runs now.
const S1 = "20261112T023016Z";
const S2 = "20261112T044136Z";
const OLD = "20261026T182511Z";
const CHAIN = "20261029T051152Z";
const RUN_ID = "2026-11-11T18:30:21-08:00";
const ORDER = ["a1b2c3d4/p001", "a1b2c3d4/p002", "a1b2c3d4/p003", "c0ffee01/p001", "d00dfeed/p001", "d00dfeed/p002", "0badcafe/p001"];
const TOK0 = { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 };
const pageRow = (page_id, state, extra = {}) => ({
  page_id, kind: "web", state, status: state === "done" ? "completed" : null, folder: null, calls_total: 24, calls_done: 0, calls_skipped: 0,
  calls_failed: 0, running: [], filter_blocks: 0, alt_tries: 0, flagged: [], seconds_sum: 0, calls_timed: 0, started_epoch: null, ended_epoch: null,
  tokens: { ...TOK0 }, ...extra,
});
const doneRow = (page_id, folder) => pageRow(page_id, "done", { folder, calls_done: 24, calls_timed: 24 });
const progress = (stamp, state, pages, extra = {}) => ({
  list: "made-up list", list_dir: `data/pilot-run/lists/${stamp}`, levels: "0-3", jobs: 1, page_jobs: 1, started_utc: stamp, max_usd: null,
  schema: "progress-v1", state, started_epoch: Date.UTC(2026, 10, 12) / 1000, updated_epoch: Date.UTC(2026, 10, 12, 5) / 1000,
  calls_total: pages.length * 24, calls_done: pages.reduce((n, x) => n + x.calls_done, 0), calls_failed: 0, calls_flagged: 0,
  pages_total: pages.length, pages_done: pages.filter((x) => x.state === "done").length, pages, ...extra,
});
const P2KEYS = { kind: "book-run", book: "paired-dataset", phase: "agent-phase-2", book_jobs: 1, paused_since_epoch: null, pause_file: "x/PAUSE", pause_seconds_total: 0, paused_since_utc: null };
const LISTS = {
  [S1]: progress(S1, "stopped", ORDER.map((id) => (id === "a1b2c3d4/p001" ? doneRow(id, "data/pilot-run/a1b2c3d4_p001/20261112T023022Z-r41") : pageRow(id, "waiting"))), P2KEYS),
  [S2]: progress(S2, "running", ORDER.map((id) =>
    id === "a1b2c3d4/p002" ? doneRow(id, "data/pilot-run/a1b2c3d4_p002/20261112T044149Z-r41")
    : id === "a1b2c3d4/p003" ? pageRow(id, "running", { calls_done: 5, running: ["QA_2"], folder: "data/pilot-run/a1b2c3d4_p003/20261112T050100Z-r41" })
    : pageRow(id, "waiting")), P2KEYS),
  [OLD]: progress(OLD, "completed with failures", [doneRow("sample0/p005", "data/pilot-run/sample0_p005/20261026T182512Z-r41"), doneRow("c0ffee01/p001", "data/pilot-run/c0ffee01_p001/20261026T182513Z-r41")]),
  [CHAIN]: progress(CHAIN, "completed", [doneRow("sample_book/p046", "data/pilot-run/sample_book_p046/20261029T051154Z-r41")], { kind: "chain", book_jobs: 1 }),
};
const HB = "2026-11-12T05:10:00Z";
const STATUS = {
  schema: "book-status-v1", book: "paired-dataset", phase: "agent-phase-2", state: "running", stop_reason: null, stop_text: null, list_stamp: S2,
  pid: process.pid, heartbeat_utc: HB, running_page: "a1b2c3d4/p003", running_boxes: ["QA_2"], last_accepted_page: "a1b2c3d4/p002",
  next_page: "a1b2c3d4/p003", pages_done: 2, pages_total: 7, book_pages: 7, accepted: ["a1b2c3d4/p001", "a1b2c3d4/p002"], fail_pages: [],
  last_error: null, tokens_phase: { input: 1000, output: 800, reasoning: 900, cache_read: 100, cache_write: 2000, calls: 53 }, critic_mode: "separate",
  pause_requested: false, started_utc: "2026-11-12T04:41:36Z", run_id: RUN_ID, updated_utc: HB, update_n: 3, update_n_source: "rule",
};
const HISTORY = [
  { utc: "2026-11-12T02:30:21Z", event: "start", run_id: RUN_ID, list_stamp: S1, pid: 101, phase: "agent-phase-2", pages_done: 0, pages_total: 7 },
  { utc: "2026-11-12T02:53:46Z", event: "page-done", page: "a1b2c3d4/p001", folder: "data/pilot-run/a1b2c3d4_p001/20261112T023022Z-r41", verdict: "PASS", status: "completed" },
  { utc: "2026-11-12T02:53:47Z", event: "stopped", reason: "rule", text: "stopped: made-up text with a control character\u0007 in it" },
  { utc: "2026-11-12T04:41:36Z", event: "start", run_id: RUN_ID, list_stamp: S2, pid: 102, phase: "agent-phase-2", pages_done: 1, pages_total: 7 },
  { utc: "2026-11-12T05:00:27Z", event: "page-done", page: "a1b2c3d4/p002", folder: "data/pilot-run/a1b2c3d4_p002/20261112T044149Z-r41", verdict: "PASS", status: "completed" },
  { utc: "2026-11-12T05:00:30Z", event: "update-point-started", box: "QA_2", page: "a1b2c3d4/p002", queue_ids: [] },
];
const ITEMS = [
  { item_id: "a1b2c3d4-0000-4000-8000-000000000001", kind: "web-article", title_en: "Sample article A, part 1: first steps", title_ja: "見本の記事 A 第1部", status: "draft, not checked by the owner" },
  { item_id: "c0ffee01-0000-4000-8000-000000000002", kind: "web-article", title_en: "Sample article B", title_ja: "見本の記事 B", status: "draft, not checked by the owner" },
  { item_id: "d00dfeed-0000-4000-8000-000000000003", kind: "web-article", title_en: "Sample article C", title_ja: "見本の記事 C", status: "draft, not checked by the owner" },
];

check("no real data: the old snapshot folder scripts/fixtures/vw94 does not exist", () => assert.equal(existsSync(path.join(app, "scripts", "fixtures", "vw94")), false));

const root = await fs.mkdtemp(path.join(process.env.TMPDIR, "vw94-"));
try {
  const store = path.join(root, "book-store", "paired-dataset");
  await fs.mkdir(store, { recursive: true });
  await fs.mkdir(path.join(root, "item-metadata"), { recursive: true });
  await fs.writeFile(path.join(store, "status.json"), JSON.stringify(STATUS));
  await fs.writeFile(path.join(store, "history.jsonl"), HISTORY.map((r) => JSON.stringify(r)).join("\n") + "\n");
  await fs.writeFile(path.join(root, "item-metadata", "items.filled.jsonl"), ITEMS.map((r) => JSON.stringify(r)).join("\n") + "\n");
  for (const [stamp, prog] of Object.entries(LISTS)) {
    await fs.mkdir(path.join(root, "pilot-run", "lists", stamp), { recursive: true });
    await fs.writeFile(path.join(root, "pilot-run", "lists", stamp, "progress.json"), JSON.stringify(prog));
  }
  const cfg = path.join(root, "viewer.config.json");
  await fs.writeFile(cfg, JSON.stringify({ translatorDataDir: root, monitor: true }));
  process.env.VIEWER_CONFIG = cfg;
  const { loadMonitor } = await import("../lib/book-status.ts");
  const { getRun } = await import("../lib/runs.ts");
  const hb = Date.parse(HB);
  const t0 = performance.now();
  const d = await loadMonitor(hb + 10_000);
  const ms1 = performance.now() - t0;
  const t1 = performance.now();
  await loadMonitor(hb + 13_000);
  const ms2 = performance.now() - t1;
  console.log(`      loadMonitor on the synthetic folder: first call ${ms1.toFixed(1)} ms, second call ${ms2.toFixed(1)} ms`);
  await checkAsync("monitor: no book row for an article ID of a phase 2 list; the chain list book and the old pilot row stay", async () => {
    const slugs = d.rows.map((r) => r.slug).sort();
    const p2 = new Set(d.phase2Articles.articles.map((x) => x.shortId));
    // c0ffee01 comes from the old pilot list (no book key). It is also an article of phase 2.
    assert.deepEqual(slugs.filter((x) => p2.has(x)), ["c0ffee01"]);
    assert.ok(slugs.includes("sample_book") && slugs.includes("sample0"), slugs.join(","));
    assert.equal(d.summary.counts.Running, 0);
  });
  await checkAsync("monitor: the old pilot row c0ffee01 takes its facts from its own list, not the phase 2 state", async () => {
    const r = d.rows.find((x) => x.slug === "c0ffee01");
    assert.notEqual(r.group, "Running", JSON.stringify({ group: r.group, key: r.key }));
  });
  await checkAsync("monitor: phase 2 row Running and the grouped row with 4 articles, one title not found", async () => {
    assert.equal(d.phase2.key, "running");
    const v = d.phase2Articles;
    assert.equal(v.articles.length, 4);
    assert.deepEqual(v.missingTitles, ["0badcafe"]);
    assert.equal(v.listStamp, S2);
    assert.equal(v.articles[0].name.en, "Sample article A, part 1: first steps");
    assert.equal(v.articles[0].key, "translating");
    assert.equal(v.articles[0].stateText, "Translating now: page 3 of 3");
    assert.equal(v.articles[0].pages[0].href, "/page/a1b2c3d4/p001?run=20261112T023022Z-r41");
    assert.deepEqual(v.articles.slice(1).map((a) => a.key), ["not-started", "not-started", "not-started"]);
    assert.equal(v.running.pageId, "a1b2c3d4/p003");
    assert.deepEqual(v.running.boxes, ["QA_2"]);
  });
  await checkAsync("run view: a1b2c3d4/p001 of the new list shows accepted before restart, with the title and the phase 2 heading flag", async () => {
    const run = await getRun(S2);
    const r = run.pages.find((p) => p.pageId === "a1b2c3d4/p001");
    assert.equal(r.state, "waiting");
    assert.equal(r.callsDone, 0);
    assert.equal(r.acceptedBefore.href, "/page/a1b2c3d4/p001?run=20261112T023022Z-r41");
    assert.equal(r.acceptedBefore.verdict, "PASS");
    assert.equal(r.article.title, "Sample article A, part 1: first steps");
    assert.equal(r.article.pageOf, "page 1 of 3");
    assert.equal(run.pages.filter((p) => p.acceptedBefore).length, 1);
    assert.ok(run.phase2Note.includes("2026-11-11 18:30 PST"), run.phase2Note);
    assert.equal(run.phase2List, true);
    assert.equal(W.runHeading(run.stamp, run.listKind, run.phase2List), "Phase 2 run, list started 2026-11-11 20:41 PST");
  });
  await checkAsync("run view: the old list shows no mark; the chain list gets no title, no note, and a chain heading", async () => {
    const old = await getRun(S1);
    assert.equal(old.pages.filter((p) => p.acceptedBefore).length, 0);
    const chain = await getRun(CHAIN);
    assert.equal(chain.phase2Note ?? null, null);
    assert.equal(chain.phase2List, false);
    assert.ok(chain.pages.every((p) => !p.article && !p.acceptedBefore));
    assert.equal(W.runHeading(chain.stamp, chain.listKind, chain.phase2List), "Chain list, started 2026-10-28 21:11 PST");
  });
  await checkAsync("broken files: a broken history.jsonl and titles file give no error", async () => {
    await fs.writeFile(path.join(store, "history.jsonl"), "{not json\n\u0000\n");
    await fs.writeFile(path.join(root, "item-metadata", "items.filled.jsonl"), "garbage");
    const d2 = await loadMonitor(hb + 20_000);
    assert.equal(d2.ok, true);
    assert.equal(d2.phase2Articles.articles.length, 4);
    assert.equal(d2.phase2Articles.missingTitles.length, 4);
    const run = await getRun(S2);
    assert.equal(run.pages.filter((p) => p.acceptedBefore).length, 0);
  });
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
