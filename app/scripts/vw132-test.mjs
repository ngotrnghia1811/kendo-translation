// Unit VW132 (plan item P54.3). Q-A 3:140.3 "Build now": the Monitor pages count only the model calls that run.
// Q-A 3:139.3 "All 4 hold" (Monitor time fix later). Translator unit TR105 (commit 93f3984): the box-critic call of a frozen box is skipped.
// It proves:
//   - the box rule of lib/page-calls.ts equals freeze.py critic_skip_boxes (hand cases, 300 random sets, and the real Python code when the Translator folder is here);
//   - a page with 0, 4, 12 and 16 skipped critic calls, a page that ended, a failed page, a phase 2 (web) page, and the "waiting" and "stopped list" cases;
//   - the loaders (listRuns, getRun, loadBookDetail) give the same numbers on a made-up data folder, and write no file;
//   - the text shape "done / total" and every other text of the four screens stay as they were;
//   - the time estimate before and after, and the finding that no Viewer file computes a time estimate from calls_total;
//   - the REAL lists of the Translator (read only): every page that ended shows "done / done".
// No server, no network. Writes only below $TMPDIR. The last line is "<n> passed, <m> failed".
// Run: scripts/dev/cleanenv.sh env TMPDIR=<unit>/tmp node scripts/vw132-test.mjs   (from the app folder)
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { checker, installAppHooks, jl, madeUpRoot, snapshot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
globalThis.fetch = async () => {
  throw new Error("Network is disabled in the VW132 tests.");
};
installAppHooks(app, "/");
const { check, done } = checker();
const read = (rel) => readFileSync(path.join(app, rel), "utf8");

const T2 = "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator";
const P = await import("../lib/page-calls.ts");

// ---------------------------------------------------------------- part 1: the box rule (freeze.py target_of and critic_skip_boxes)

const STAGES = ["TS", "TL", "ED", "QA"];
const GRID = STAGES.flatMap((s) => [0, 1, 2, 3].map((n) => `${s}_${n}`));
const sub = (stages, levels = [0, 1, 2, 3]) => stages.flatMap((s) => levels.map((n) => `${s}_${n}`));

await check("grid: the 16 boxes are in Translator order (stage first, then level)", () => {
  assert.equal(P.GRID_BOXES.length, 16);
  assert.deepEqual(P.GRID_BOXES, GRID);
  assert.equal(P.GRID_BOXES[0], "TS_0");
  assert.equal(P.GRID_BOXES[4], "TL_0");
  assert.equal(P.GRID_BOXES[15], "QA_3");
});
await check("rule: no frozen box gives no skipped call", () => {
  assert.deepEqual(P.criticSkipBoxes([]), []);
  assert.deepEqual(P.criticSkipBoxes(null), []);
  assert.deepEqual(P.criticSkipBoxes(undefined), []);
});
await check("rule: the 12 frozen boxes TL, ED and QA skip 12 critic calls and the 4 TS critics stay (the example of TR105)", () => {
  assert.deepEqual(P.criticSkipBoxes(sub(["TL", "ED", "QA"])), sub(["TL", "ED", "QA"]));
});
await check("rule: all 16 frozen boxes skip all 16 critic calls", () => {
  assert.deepEqual(P.criticSkipBoxes(GRID), GRID);
});
await check("rule: the 4 QA boxes skip 4 calls (QA is the last stage, no open target is left)", () => {
  assert.deepEqual(P.criticSkipBoxes(sub(["QA"])), ["QA_0", "QA_1", "QA_2", "QA_3"]);
});
await check("rule: QA_3 alone skips 1 call", () => assert.deepEqual(P.criticSkipBoxes(["QA_3"]), ["QA_3"]));
await check("rule: TL_3, ED_3 and QA_3 skip 3 calls (no higher level, and every later stage of level 3 is frozen)", () => {
  assert.deepEqual(P.criticSkipBoxes(["TL_3", "ED_3", "QA_3"]), ["TL_3", "ED_3", "QA_3"]);
});
await check("rule: a frozen box with an open target keeps its critic call (TL_1 gives its critiques to TL_2)", () => {
  assert.deepEqual(P.criticSkipBoxes(["TL_1"]), []);
  assert.equal(P.criticTargetOf("TL_1", new Set(["TL_1"])), "TL_2");
});
await check("rule: the target goes to a later stage when the higher levels are frozen (step b), and never wraps back", () => {
  assert.equal(P.criticTargetOf("TL_3", new Set(["TL_3"])), "ED_3");
  assert.equal(P.criticTargetOf("TL_2", new Set(["TL_2", "TL_3"])), "ED_2");
  assert.equal(P.criticTargetOf("QA_0", new Set(["QA_0", "QA_1", "QA_2", "QA_3"])), null);
  assert.equal(P.criticTargetOf("ED_3", new Set(["ED_3", "QA_3"])), null);
});
await check("rule: the 4 TS boxes alone skip nothing (they give their critiques to TL)", () => {
  assert.deepEqual(P.criticSkipBoxes(sub(["TS"])), []);
});
await check("rule: unknown box names and doubled names are ignored", () => {
  assert.deepEqual(P.criticSkipBoxes(["QA_3", "QA_3", "XX_1", "QA_9", "", "qa_3"]), ["QA_3"]);
});

// A small seeded generator, so that the random cases are the same on every run.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const rnd = lcg(132);
const randomSets = [];
for (let i = 0; i < 300; i++) {
  const p = [0.1, 0.3, 0.5, 0.8, 0.95][i % 5];
  randomSets.push(GRID.filter(() => rnd() < p));
}

await check("rule: 300 random frozen sets, the skip list is always a subset of the frozen set, in grid order, with no open target", () => {
  for (const set of randomSets) {
    const skip = P.criticSkipBoxes(set);
    const frozen = new Set(set);
    for (const b of skip) {
      assert.ok(frozen.has(b));
      assert.equal(P.criticTargetOf(b, frozen), null);
    }
    assert.deepEqual(skip, GRID.filter((b) => skip.includes(b)));
    for (const b of set) if (!skip.includes(b)) assert.notEqual(P.criticTargetOf(b, frozen), null);
  }
});

if (existsSync(path.join(T2, "data/scripts/translator/freeze.py"))) {
  await check("rule: the same 300 random sets give the same list as the real freeze.py critic_skip_boxes of the Translator (read only)", () => {
    const code = [
      "import json,sys",
      "sys.dont_write_bytecode=True",
      "sys.path.insert(0, sys.argv[1])",
      "from translator import freeze",
      "sets=json.load(sys.stdin)",
      "print(json.dumps([freeze.critic_skip_boxes(s) for s in sets]))",
    ].join("\n");
    const r = spawnSync("python3", ["-B", "-c", code, path.join(T2, "data/scripts")], {
      input: JSON.stringify(randomSets),
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "", PYTHONDONTWRITEBYTECODE: "1", PYTHONPATH: "" },
    });
    assert.equal(r.status, 0, r.stderr.slice(0, 600));
    const py = JSON.parse(r.stdout);
    assert.equal(py.length, randomSets.length);
    randomSets.forEach((s, i) => assert.deepEqual(P.criticSkipBoxes(s), py[i], `set ${i}: ${s.join(",")}`));
  });
} else {
  console.log("skip  the Translator folder is not here: the freeze.py comparison is left out");
}

// ---------------------------------------------------------------- part 2: calls that run for one page

const live = (over = {}) => ({ state: "running", kind: "book", callsDone: 0, callsTotal: 32, callsSkipped: 0, summaryBoxes: null, skippedReason: null, forecastBoxes: null, ...over });
const frozen12 = P.criticSkipBoxes(sub(["TL", "ED", "QA"]));
const frozen4 = P.criticSkipBoxes(sub(["QA"]));
const frozen16 = P.criticSkipBoxes(GRID);

await check("page that runs, 0 skipped critic calls: 32 stay and the hover text is empty", () => {
  const c = P.pageCalls(live({ callsDone: 3, forecastBoxes: [] }));
  assert.equal(c.total, 32);
  assert.equal(c.basis, "planned");
  assert.equal(P.callsTitle(c), null);
});
await check("page that runs, 4 skipped critic calls: 28", () => {
  const c = P.pageCalls(live({ callsDone: 3, forecastBoxes: frozen4 }));
  assert.equal(c.total, 28);
  assert.deepEqual(c.boxes, ["QA_0", "QA_1", "QA_2", "QA_3"]);
  assert.equal(c.basis, "forecast");
});
await check("page that runs, 12 skipped critic calls: 20, not 32 (16 forward calls and 4 TS critics)", () => {
  const c = P.pageCalls(live({ callsDone: 5, forecastBoxes: frozen12 }));
  assert.equal(c.total, 20);
  assert.equal(c.planned, 32);
  assert.equal(c.boxes.length, 12);
});
await check("page that runs, 16 skipped critic calls: 16 (the 16 forward calls only)", () => {
  assert.equal(P.pageCalls(live({ forecastBoxes: frozen16 })).total, 16);
});
await check("page that has not started and its list is live: the same forecast as a page that runs", () => {
  const c = P.pageCalls(live({ state: "waiting", forecastBoxes: frozen12 }));
  assert.equal(c.total, 20);
  assert.equal(c.basis, "forecast");
});
await check("waiting page that the list skipped (skipped_reason) keeps the planned 32", () => {
  const c = P.pageCalls(live({ state: "waiting", callsSkipped: 32, skippedReason: "stopped: QA_3 FAIL on x/p014", forecastBoxes: frozen12 }));
  assert.equal(c.total, 32);
  assert.equal(c.basis, "planned");
});
await check("waiting page of a list that is not live (forecast null) keeps 32", () => {
  assert.equal(P.pageCalls(live({ state: "waiting", forecastBoxes: null })).total, 32);
});
await check("page that ended well: the recorded numbers, 20 done, 12 skipped, so 20 / 20 (not 20 / 32)", () => {
  const c = P.pageCalls(live({ state: "done", callsDone: 20, callsSkipped: 12, summaryBoxes: frozen12 }));
  assert.equal(c.total, 20);
  assert.equal(c.basis, "recorded");
  assert.match(P.callsTitle(c), /^Model calls that run: 20 \(planned 32\)\. 12 box-critic calls were skipped because their boxes were frozen: TL_0, /);
});
await check("page that ended well and skipped all 16 critic calls: 16 / 16 (the real list 20261127T205950Z of Breathing: Raising the Power of Life)", () => {
  const c = P.pageCalls(live({ state: "done", callsDone: 16, callsSkipped: 16, summaryBoxes: frozen16 }));
  assert.equal(c.total, 16);
});
await check("old page that ended (no calls_skipped): 32 / 32 as before, no hover text", () => {
  const c = P.pageCalls(live({ state: "done", callsDone: 32, callsSkipped: 0 }));
  assert.equal(c.total, 32);
  assert.equal(P.callsTitle(c), null);
});
await check("page that ended with the skipped number only (no summary list): 16 / 16 and a plain hover text", () => {
  const c = P.pageCalls(live({ state: "done", callsDone: 16, callsSkipped: 16 }));
  assert.equal(c.total, 16);
  assert.equal(P.callsTitle(c), "Model calls that run: 16 (planned 32). 16 planned calls were skipped.");
});
await check("failed page: calls_skipped also counts the calls after the failure, so the total uses the summary list (13 done, 1 failed, 16 critic calls skipped: 13 / 16)", () => {
  const c = P.pageCalls(live({ state: "failed", callsDone: 13, callsSkipped: 19, summaryBoxes: frozen16 }));
  assert.equal(c.total, 16);
  assert.equal(c.basis, "summary");
});
await check("failed page with no summary list keeps the planned 32 (old failed pages, tanden_full p005: 25 done, 7 skipped by the failure)", () => {
  const c = P.pageCalls(live({ state: "failed", callsDone: 25, callsSkipped: 7 }));
  assert.equal(c.total, 32);
});
await check("interrupted page: the same rule as a failed page", () => {
  assert.equal(P.pageCalls(live({ state: "interrupted", callsDone: 4, callsSkipped: 28, summaryBoxes: frozen12 })).total, 20);
  assert.equal(P.pageCalls(live({ state: "interrupted", callsDone: 4, callsSkipped: 28 })).total, 32);
});
await check("phase 2 page (kind web, 24 planned calls, no critic skip): 24 / 24 and 7 / 24", () => {
  assert.equal(P.pageCalls(live({ kind: "web", state: "done", callsDone: 24, callsTotal: 24 })).total, 24);
  const c = P.pageCalls(live({ kind: "web", callsDone: 7, callsTotal: 24, forecastBoxes: null }));
  assert.equal(c.total, 24);
  assert.equal(P.callsTitle(c), null);
});
await check("web page has no TS stage: all 16 frozen boxes skip only 12 calls (24 - 12 = 12)", () => {
  const c = P.pageCalls(live({ kind: "web", callsTotal: 24, forecastBoxes: frozen16 }));
  assert.equal(c.total, 12);
  assert.equal(c.boxes.some((b) => b.startsWith("TS_")), false);
});
await check("the total is never below calls_done", () => {
  assert.equal(P.pageCalls(live({ callsDone: 25, forecastBoxes: frozen12 })).total, 25);
  assert.equal(P.pageCalls(live({ state: "done", callsDone: 33, callsTotal: 32, callsSkipped: 0 })).total, 33);
});
await check("broken numbers and boxes do not throw and do not give a negative total", () => {
  const c = P.pageCalls(live({ callsTotal: Number.NaN, callsDone: -4, forecastBoxes: frozen16 }));
  assert.equal(c.total, 0);
  assert.equal(P.pageCalls(live({ callsTotal: 6, forecastBoxes: frozen16 })).total, 3);
  assert.equal(P.pageCalls(live({ state: "something else", summaryBoxes: ["x", 5] })).total, 32);
  assert.equal(P.pageInputOf(null, null, null).callsTotal, 0);
  assert.equal(P.pageInputOf({ calls_total: "32" }, null, null).callsTotal, 0);
});
await check("hover text of a page that runs says that the boxes are frozen", () => {
  const t = P.callsTitle(P.pageCalls(live({ callsDone: 5, forecastBoxes: ["QA_3"] })));
  assert.equal(t, "Model calls that run: 31 (planned 32). 1 box-critic call is skipped because its box is frozen: QA_3.");
});

await check("list total: the planned total minus the skipped calls of the pages", () => {
  const pages = [
    P.pageCalls(live({ state: "done", callsDone: 16, callsSkipped: 16, summaryBoxes: frozen16 })),
    P.pageCalls(live({ callsDone: 3, forecastBoxes: frozen12 })),
    P.pageCalls(live({ state: "waiting", forecastBoxes: frozen12 })),
    P.pageCalls(live({ state: "waiting", skippedReason: "stopped", forecastBoxes: frozen12 })),
  ];
  assert.deepEqual(pages.map((c) => c.total), [16, 20, 20, 32]);
  assert.equal(P.listCallsTotal(pages, 128), 128 - 16 - 12 - 12);
});
await check("list total: a list that skips nothing keeps its planned total exactly, even when its pages do not add up to it", () => {
  const pages = [P.pageCalls(live({ state: "done", callsDone: 32 }))];
  assert.equal(P.listCallsTotal(pages, 480), 480);
  assert.equal(P.listCallsTotal([], 480), 480);
});
await check("list state: running and every paused state are live, the others are not", () => {
  for (const s of ["running", "paused", "paused after page"]) assert.equal(P.listIsLive(s), true, s);
  for (const s of ["stopped", "completed", "completed with failures", "interrupted", "unknown", ""]) assert.equal(P.listIsLive(s), false, s);
});
await check("list hover text: empty when no call is skipped, a plain sentence when some are", () => {
  assert.equal(P.listCallsTitle(32, 32), null);
  assert.equal(P.listCallsTitle(20, 32), "Model calls that run in this list: 20 (planned 32). Box-critic calls of frozen boxes are skipped.");
});

// ---------------------------------------------------------------- part 3: the loaders on a made-up data folder

const STAMP = "20261201T000000Z";
const SLUG = "vw132_fixture_book";
const HIST_START = { event: "start", run_id: "run-132" };
const frozenEvents = (boxes) => boxes.map((b, i) => ({ event: "box-frozen", box: b, phase: "agent-phase-4", page: `${SLUG}/p00${(i % 3) + 1}`, pages: [], utc: "2026-12-01T00:00:00Z" }));
const BOXES_12 = sub(["TL", "ED", "QA"]);
const pageRow = (n, state, over = {}) => ({
  page_id: `${SLUG}/p00${n}`,
  kind: "book",
  state,
  status: state === "done" ? "completed" : null,
  folder: state === "waiting" ? null : `data/pilot-run/${SLUG}_p00${n}/run1`,
  calls_total: 32,
  calls_done: 0,
  calls_skipped: 0,
  calls_failed: 0,
  running: [],
  models_usd: 0,
  started_epoch: state === "waiting" ? null : 1795800000,
  ended_epoch: state === "done" || state === "failed" ? 1795800600 : null,
  ...over,
});
const progressOf = (stamp, state, pages, over = {}) => {
  const sum = (k) => pages.reduce((n, p) => n + p[k], 0);
  return {
    list: stamp,
    kind: "book-run",
    book: SLUG,
    phase: "agent-phase-4",
    state,
    calls_total: sum("calls_total"),
    calls_done: sum("calls_done"),
    calls_skipped: sum("calls_skipped"),
    calls_failed: 0,
    calls_flagged: 0,
    pages_total: pages.length,
    pages_done: pages.filter((p) => p.state === "done").length,
    started_epoch: 1795800000,
    updated_epoch: 1795800700,
    pages,
    ...over,
  };
};

const fx = await madeUpRoot("vw132-");
try {
  const { root, w } = fx;
  const cfg = path.join(root, "viewer.config.json");
  await fs.writeFile(cfg, JSON.stringify({ translatorDataDir: root, monitor: true }));
  process.env.VIEWER_CONFIG = cfg;
  delete process.env.VIEWER_RUN_SOURCE;

  const writeBook = async (slug, history, status = {}) => {
    await w(`book-store/${slug}/history.jsonl`, jl(history));
    await w(`book-store/${slug}/status.json`, { schema: 1, book: slug, phase: "agent-phase-4", state: "running", list_stamp: STAMP, ...status });
    await w(`book-store/${slug}/request.done.json`, { book: slug });
  };
  const writeSummary = (n, keys) => w(`pilot-run/${SLUG}_p00${n}/run1/summary.json`, keys);

  // List A: a live phase 4 list. p1 done (16 skipped), p2 failed (13 done, 1 failed), p3 runs, p4 waits, p5 was skipped by the list.
  const pagesA = [
    pageRow(1, "done", { calls_done: 16, calls_skipped: 16 }),
    pageRow(2, "failed", { status: "completed with failures", calls_done: 13, calls_skipped: 19, calls_failed: 1 }),
    pageRow(3, "running", { calls_done: 3, running: ["TL_0"] }),
    pageRow(4, "waiting"),
    pageRow(5, "waiting", { calls_skipped: 32, skipped_reason: "stopped: QA_3 FAIL on x/p002" }),
  ];
  await w(`pilot-run/lists/${STAMP}/progress.json`, progressOf(STAMP, "running", pagesA));
  await w(`pilot-run/lists/${STAMP}/list.json`, { critic_mode: "full" });
  await writeSummary(1, { critic_skipped_boxes: frozen16, qa: { QA_3: { verdict: "PASS", page_score: 9 } } });
  await writeSummary(2, { critic_skipped_boxes: frozen16 });
  await writeSummary(3, {});
  await writeBook(SLUG, [HIST_START, ...frozenEvents(BOXES_12)]);

  // List B: the same book and pages, but the list is stopped. No forecast applies.
  const STAMP_B = "20261130T000000Z";
  const pagesB = [pageRow(1, "done", { calls_done: 32 }), pageRow(2, "running", { calls_done: 2 }), pageRow(3, "waiting")];
  await w(`pilot-run/lists/${STAMP_B}/progress.json`, progressOf(STAMP_B, "stopped", pagesB));
  // List C: a live list of phase 3. Phase 3 never freezes, so the frozen events of the book change nothing.
  const STAMP_C = "20261129T000000Z";
  await w(`pilot-run/lists/${STAMP_C}/progress.json`, progressOf(STAMP_C, "running", [pageRow(1, "running", { calls_done: 1 }), pageRow(2, "waiting")], { phase: "agent-phase-3" }));
  // List D: a live phase 2 list (book paired-dataset, kind web, 24 calls).
  const STAMP_D = "20261128T000000Z";
  const web = (id, state, over = {}) => ({ ...pageRow(1, state, over), page_id: id, kind: "web", calls_total: 24 });
  await w(`pilot-run/lists/${STAMP_D}/progress.json`, progressOf(STAMP_D, "running", [web("11112222/p001", "running", { calls_done: 7 }), web("11112222/p002", "waiting")], { book: "paired-dataset", phase: "agent-phase-2" }));
  await writeBook("paired-dataset", [HIST_START, ...frozenEvents(BOXES_12)], { phase: "agent-phase-2" });
  // List E: a live phase 4 list of a book whose run was restarted after the freeze: the restart resets the frozen set.
  const STAMP_E = "20261127T000000Z";
  const SLUG_E = "vw132_restart_book";
  await w(`pilot-run/lists/${STAMP_E}/progress.json`, progressOf(STAMP_E, "running", [{ ...pageRow(1, "running", { calls_done: 2 }), page_id: `${SLUG_E}/p001` }], { book: SLUG_E }));
  await writeBook(SLUG_E, [HIST_START, ...frozenEvents(BOXES_12), { event: "restart" }, { event: "start", run_id: "run-2" }]);
  // List F: a paused list ("paused after page") with a waiting page, and 4 frozen QA boxes in a second book.
  const STAMP_F = "20261126T000000Z";
  const SLUG_F = "vw132_paused_book";
  await w(`pilot-run/lists/${STAMP_F}/progress.json`, progressOf(STAMP_F, "paused after page", [{ ...pageRow(1, "waiting"), page_id: `${SLUG_F}/p001` }], { book: SLUG_F }));
  await writeBook(SLUG_F, [HIST_START, ...frozenEvents(sub(["QA"]))]);
  // List G: a live phase 4 list with no history file at all.
  const STAMP_G = "20261125T000000Z";
  const SLUG_G = "vw132_nohistory_book";
  await w(`pilot-run/lists/${STAMP_G}/progress.json`, progressOf(STAMP_G, "running", [{ ...pageRow(1, "running", { calls_done: 2 }), page_id: `${SLUG_G}/p001` }], { book: SLUG_G }));

  const before = await snapshot(root);
  const R = await import("../lib/runs.ts");
  const calls = (run) => Object.fromEntries(run.pages.map((p) => [p.pageId.split("/")[1], [p.callsDone, p.callsTotal]]));

  await check("run view, live phase 4 list: p1 16 / 16, p2 13 / 16, p3 3 / 20, p4 0 / 20, p5 (skipped by the list) 0 / 32", async () => {
    const run = await R.getRun(STAMP);
    assert.deepEqual(calls(run), { p001: [16, 16], p002: [13, 16], p003: [3, 20], p004: [0, 20], p005: [0, 32] });
  });
  await check("run view: the list total is 160 planned minus 16 + 16 + 12 + 12 = 104, and the done sum is unchanged", async () => {
    const run = await R.getRun(STAMP);
    assert.equal(run.callsTotal, 104);
    assert.equal(run.callsDone, 32);
    assert.match(run.callsTitle, /^Model calls that run in this list: 104 \(planned 160\)/);
  });
  await check("run view: the hover text of the page that runs names the 12 frozen boxes; a page that skips nothing has none", async () => {
    const run = await R.getRun(STAMP);
    const p3 = run.pages.find((p) => p.pageId.endsWith("/p003"));
    assert.match(p3.callsTitle, /^Model calls that run: 20 \(planned 32\)\. 12 box-critic calls are skipped because their boxes are frozen: TL_0, TL_1, TL_2, TL_3, ED_0/);
    const p5 = run.pages.find((p) => p.pageId.endsWith("/p005"));
    assert.equal(p5.callsTitle, null);
  });
  await check("Lists page: listRuns gives the same list total (104) as the run view, and reads the summary of a failed page", async () => {
    const list = (await R.listRuns()).find((r) => r.stamp === STAMP);
    assert.equal(list.callsTotal, 104);
    assert.equal(list.callsDone, 32);
  });
  await check("stopped list: no forecast, so the running page and the waiting page keep 32", async () => {
    const run = await R.getRun(STAMP_B);
    assert.deepEqual(calls(run), { p001: [32, 32], p002: [2, 32], p003: [0, 32] });
    assert.equal(run.callsTotal, 96);
    assert.equal(run.callsTitle, null);
    assert.equal((await R.listRuns()).find((r) => r.stamp === STAMP_B).callsTotal, 96);
  });
  await check("phase 3 list that is live: the frozen events change nothing (freeze is a phase 4 rule)", async () => {
    const run = await R.getRun(STAMP_C);
    assert.deepEqual(calls(run), { p001: [1, 32], p002: [0, 32] });
    assert.equal(run.callsTotal, 64);
  });
  await check("phase 2 list that is live: 7 / 24 and 0 / 24, the old numbers", async () => {
    const run = await R.getRun(STAMP_D);
    assert.deepEqual(calls(run), { p001: [7, 24], p002: [0, 24] });
    assert.equal(run.callsTotal, 48);
    assert.equal((await R.listRuns()).find((r) => r.stamp === STAMP_D).callsTotal, 48);
  });
  await check("a restart of the run resets the frozen set: the page that runs shows 2 / 32", async () => {
    assert.deepEqual(calls(await R.getRun(STAMP_E)), { p001: [2, 32] });
  });
  await check("a paused list uses the frozen set for its waiting page (4 QA boxes: 0 / 28)", async () => {
    const run = await R.getRun(STAMP_F);
    assert.deepEqual(calls(run), { p001: [0, 28] });
    assert.equal(run.callsTotal, 28);
    assert.equal((await R.listRuns()).find((r) => r.stamp === STAMP_F).callsTotal, 28);
  });
  await check("a live phase 4 list with no history file keeps 32", async () => {
    assert.deepEqual(calls(await R.getRun(STAMP_G)), { p001: [2, 32] });
  });
  await check("the time estimate before and after: the calls left of the page that runs are 16 now, not 28", async () => {
    const p3 = (await R.getRun(STAMP)).pages.find((p) => p.pageId.endsWith("/p003"));
    const plannedLeft = 32 - p3.callsDone; // before unit VW132: the number after the slash was the planned 32
    const left = p3.callsTotal - p3.callsDone;
    assert.equal(plannedLeft, 29);
    assert.equal(left, 17);
    // The same example in the numbers of the plan: 4 of 20 calls done leave 16 calls, not 28 (a page that runs 12 frozen boxes).
    assert.equal(P.pageCalls(live({ callsDone: 4, forecastBoxes: frozen12 })).total - 4, 16);
    assert.equal(32 - 4, 28);
  });
  await check("the loaders write no file below the data folder", async () => {
    assert.deepEqual(await snapshot(root), before);
  });

  const BD = await import("../lib/book-detail.ts");
  await check("Details view /monitor/<slug>: the pages table gets the same numbers as the run view", async () => {
    const d = await BD.loadBookDetail(SLUG);
    assert.ok(d, "the made-up book is in the book set");
    const a = d.lists.find((l) => l.stamp === STAMP);
    assert.ok(a, d.lists.map((l) => l.stamp).join(","));
    assert.deepEqual(Object.fromEntries(a.pages.map((p) => [p.page, [p.callsDone, p.callsTotal]])), { p001: [16, 16], p002: [13, 16], p003: [3, 20], p004: [0, 20], p005: [0, 32] });
    assert.match(a.pages.find((p) => p.page === "p003").callsTitle, /12 box-critic calls are skipped/);
    assert.equal("callsTitle" in a.pages.find((p) => p.page === "p005"), false);
  });
} finally {
  await fs.rm(fx.base, { recursive: true, force: true });
}

// ---------------------------------------------------------------- part 4: the screens keep their text, and no file computes a time estimate from calls_total

await check("text shape: the four screens still write 'done / total' with the same words", () => {
  assert.match(read("components/RunsTable.tsx"), /\{r\.callsDone\} \/ \{r\.callsTotal\}/);
  assert.match(read("components/RunPagesTable.tsx"), /\{p\.callsDone\} \/ \{p\.callsTotal\}/);
  assert.match(read("components/BookDetailView.tsx"), /\{p\.callsDone\} \/ \{p\.callsTotal\}/);
  assert.match(read("components/RunView.tsx"), /`\$\{run\.callsDone\} \/ \$\{run\.callsTotal\}`/);
  assert.match(read("components/RunsTable.tsx"), /Model calls done \/ model calls in the list/);
});
await check("the four screens pass the hover text to HlCount and HlCount sets no title without it", async () => {
  for (const [f, v] of [["RunsTable", "r"], ["RunPagesTable", "p"], ["BookDetailView", "p"], ["RunView", "run"]]) assert.match(read(`components/${f}.tsx`), new RegExp(`<HlCount title=\\{${v}\\.callsTitle\\}>`), f);
  const { createElement: h } = (await import("node:module")).createRequire(path.join(app, "package.json"))("react");
  const { renderToStaticMarkup } = (await import("node:module")).createRequire(path.join(app, "package.json"))("react-dom/server");
  const { HlCount } = await import("../components/HlSpan.tsx");
  assert.equal(renderToStaticMarkup(h(HlCount, null, "5 / 20")), '<span data-hl="count" class="hl-count">5 / 20</span>');
  assert.equal(renderToStaticMarkup(h(HlCount, { title: null }, "5 / 20")), '<span data-hl="count" class="hl-count">5 / 20</span>');
  assert.equal(renderToStaticMarkup(h(HlCount, { title: "x" }, "5 / 20")), '<span data-hl="count" class="hl-count" title="x">5 / 20</span>');
});
await check("one rule: the files that read callsTotal or calls_total are the known list, and none of them computes a time (ETA, time left, remaining)", () => {
  const known = new Set([
    "lib/runs.ts", // the readers that this unit changed
    "lib/page-calls.ts",
    "lib/page-calls-load.ts",
    "lib/book-detail.ts", // maps the page row of getRun
    "lib/book-detail-rules.ts", // type
    "lib/types.ts", // type
    "lib/step-tree-load.ts", // fills ListRowLite, no reader (it shows no number)
    "lib/step-tree.ts", // type
    "components/RunsTable.tsx",
    "components/RunView.tsx",
    "components/RunPagesTable.tsx",
    "components/BookDetailView.tsx",
  ]);
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(path.join(app, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(e.name) && /\b(callsTotal|calls_total)\b/.test(read(rel))) hits.push(rel);
    }
  };
  for (const d of ["lib", "components", "app"]) walk(d);
  assert.deepEqual(hits.filter((f) => !known.has(f)), [], "a new file reads callsTotal: add it to the rule of lib/page-calls.ts");
  for (const f of hits) {
    const code = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(code, /\bETA\b|time left|timeLeft|remaining|callsLeft|secondsLeft/i, f);
  }
});
await check("the Translator ETA (progress.py eta_seconds) stays in the terminal: the Viewer has no time-left text from calls", () => {
  const found = [];
  const walk = (dir) => {
    for (const e of readdirSync(path.join(app, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(e.name)) {
        const code = read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
        if (/eta_seconds|etaSeconds|timeLeft|time left|callsLeft/.test(code)) found.push(rel);
      }
    }
  };
  for (const d of ["lib", "components", "app"]) walk(d);
  assert.deepEqual(found, []);
});
await check("the new rule file is pure: no server import, no file access", () => {
  const code = read("lib/page-calls.ts");
  assert.doesNotMatch(code, /server-only|node:fs|from "\.\/json"|from "\.\/config"|process\.env/);
  assert.match(read("lib/page-calls-load.ts"), /^import "server-only";/);
});

// ---------------------------------------------------------------- part 5: the real lists of the Translator (read only)

const REAL = path.join(T2, "data");
if (existsSync(path.join(REAL, "pilot-run", "lists"))) {
  const realPages = [];
  for (const stamp of readdirSync(path.join(REAL, "pilot-run", "lists"))) {
    const f = path.join(REAL, "pilot-run", "lists", stamp, "progress.json");
    if (!existsSync(f)) continue;
    try {
      const prog = JSON.parse(readFileSync(f, "utf8"));
      for (const pg of prog.pages ?? []) realPages.push({ stamp, pg, prog });
    } catch {
      /* a list that is being written: skip */
    }
  }
  await check(`real lists (${realPages.length} pages): every page that ended well shows "done / done", and an old page keeps 32 / 32 or 24 / 24`, () => {
    let n = 0;
    for (const { stamp, pg } of realPages) {
      if (pg.state !== "done") continue;
      const c = P.pageCalls(P.pageInputOf(pg, null, null));
      assert.equal(c.total, pg.calls_done, `${stamp} ${pg.page_id}`);
      n++;
    }
    assert.ok(n > 700, `done pages: ${n}`);
  });
  await check("real lists: a page that skipped calls has a summary list with the same number of boxes as calls_skipped", () => {
    let n = 0;
    for (const { pg } of realPages) {
      if (pg.state !== "done" || !pg.calls_skipped || !pg.folder) continue;
      const f = path.join(REAL, pg.folder.replace(/^data\//, ""), "summary.json");
      if (!existsSync(f)) continue;
      const boxes = P.summaryBoxesOf(JSON.parse(readFileSync(f, "utf8")));
      if (boxes === null) continue;
      assert.equal(P.countedSkipBoxes(pg.kind, boxes, pg.calls_total).length, pg.calls_skipped, pg.page_id);
      n++;
    }
    assert.ok(n > 0, "no real page that skipped calls");
  });
  await check("real lists: no list has a negative or a too large total after the rule (planned total of progress.json is the upper bound)", () => {
    const seen = new Set();
    for (const { stamp, prog } of realPages) {
      if (seen.has(stamp)) continue;
      seen.add(stamp);
      const pages = prog.pages.map((pg) => P.pageCalls(P.pageInputOf(pg, null, null)));
      const total = P.listCallsTotal(pages, prog.calls_total ?? 0);
      assert.ok(total >= 0 && total <= (prog.calls_total ?? 0), `${stamp}: ${total} of ${prog.calls_total}`);
    }
  });
} else {
  console.log("skip  the Translator data folder is not here: the real list checks are left out");
}

done();
