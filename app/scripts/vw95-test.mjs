// VW95 (round 91): server-free tests of the step view /monitor/phase-2 and the run view section "Prompt updates" (Q-A 3:17.6, 3:17.7, 3:18.2, 3:18.3).
// Run: scripts/dev/cleanenv.sh node scripts/vw95-test.mjs (from the app folder; the wrapper sets TMPDIR).
// Part 1 tests the pure helpers (lib/step-tree.ts, lib/step-data.ts, lib/line-diff.ts) with small inline values.
// Part 2 writes a small synthetic data folder below $TMPDIR (made-up 8-hex-digit IDs and made-up titles, the same field names and shapes as the
// files of the Translator) and calls loadStepSummary and loadStepData. No real data: the branch v2/viewer goes to a public repo
// (docs/agents/git.md "Ignored data", Q-A 3:19.3 D4). The test reads no live data, starts no server, makes no network call, and removes its folder
// at the end. It also checks that the loaders write no file. The last line is "<n> passed, <m> failed". The exit code is 1 on any failure.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

const app = path.resolve(import.meta.dirname, "..");
assert.ok(process.env.TMPDIR, "Set TMPDIR (use scripts/dev/cleanenv.sh)");
globalThis.fetch = async () => {
  throw new Error("Network is disabled in the VW95 tests.");
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(pathToFileURL(path.join(app, specifier.slice(2)) + ".ts").href, context);
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !path.extname(specifier)) return next(new URL(specifier + ".ts", context.parentURL).href, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".ts")) return { ...next(url, { ...context, format: "module-typescript" }), format: "module-typescript" };
    return next(url, context);
  },
});

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok    ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}\n      ${String(e && e.message ? e.message : e).split("\n").slice(0, 8).join("\n      ")}`);
  }
}

const T = await import("../lib/step-tree.ts");
const D = await import("../lib/line-diff.ts");
const SD = await import("../lib/step-data.ts");
const A = await import("../lib/phase2-articles.ts");

// ---------------------------------------------------------------- part 1: pure helpers

const tok = (i, o) => ({ input: i, output: o, reasoning: 0, cache_read: 0, cache_write: 0 });
const model = (tag, extra = {}) => ({ kind: "model", tag, box: tag.replace(/^box-critic\./, ""), model: tag.startsWith("TS_") ? "program" : "made-up/model-a", seconds: 2, tokens: tag.startsWith("TS_") ? undefined : tok(10, 5), ok: true, started_utc: "2026-11-12T04:00:00Z", ...extra });
const GRID = [0, 1, 2, 3].flatMap((n) => ["TS", "TL", "ED", "QA"].map((s) => `${s}_${n}`));
const CRIT = ["QA_3", "QA_2", "ED_3", "QA_1", "TL_3", "ED_2", "QA_0", "TL_2", "ED_1", "TL_1", "ED_0", "TL_0"];
const fullCalls = [...GRID.map((b) => model(b)), { kind: "search", tag: "dictionary_lookup.TL_0", entries: [1, 2] }, ...CRIT.map((b) => model(`box-critic.${b}`))];
const files = (calls, extra = {}) => ({ calls, lossCalls: [model("reference-diff-critic")], reference: { queue: [{ reviewed_box: "TL_3" }], skipped_units: ["U1", "U2"], trend: { chrf: 61.25 } }, criticCounts: { TL_1: 2 }, qa: { QA_3: { verdict: "PASS", score: 9.5 } }, ...extra });
const idle = { running: false, runningBoxes: [] };

await check("step order: groups follow the owner order input, levels 0-3, loss, backward, update", () => {
  const g = T.pageSteps(files(fullCalls), idle, []);
  assert.deepEqual(g.map((x) => x.key), ["input", "level-0", "level-1", "level-2", "level-3", "loss", "backward", "update"]);
  assert.deepEqual(g.map((x) => x.label), ["Input", "Grid level 0", "Grid level 1", "Grid level 2", "Grid level 3", "Loss function", "Backward pass", "Prompt update"]);
});
await check("step order: input holds TS_0, level 0 holds TL_0 ED_0 QA_0, level 1-3 hold TS TL ED QA", () => {
  const g = T.pageSteps(files(fullCalls), idle, []);
  assert.deepEqual(g[0].steps.map((s) => s.code), ["TS_0"]);
  assert.deepEqual(g[1].steps.map((s) => s.code), ["TL_0", "ED_0", "QA_0"]);
  assert.deepEqual(g[4].steps.map((s) => s.code), ["TS_3", "TL_3", "ED_3", "QA_3"]);
  assert.equal(g[0].steps[0].state, "program");
  assert.equal(g[0].steps[0].text, "input: page transcription");
  assert.equal(g[1].steps[0].text, "TL output");
});
await check("step order: a TS step of level 1-3 without a call record is left out (program steps only where they exist)", () => {
  const g = T.pageSteps(files(fullCalls.filter((c) => c.tag !== "TS_2")), idle, []);
  assert.deepEqual(g[3].steps.map((s) => s.code), ["TL_2", "ED_2", "QA_2"]);
});
await check("step data: QA_3 carries the verdict and the score, TL carries tokens and model", () => {
  const g = T.pageSteps(files(fullCalls), idle, []);
  const qa3 = g[4].steps.find((s) => s.code === "QA_3");
  assert.equal(qa3.verdict, "PASS");
  assert.equal(qa3.score, 9.5);
  const tl0 = g[1].steps[0];
  assert.equal(tl0.model, "made-up/model-a");
  assert.equal(tl0.tokens.input, 10);
  assert.equal(tl0.calls, 1);
});
await check("loss grouping: the reference-diff-critic is the loss step, with critiques, skipped units and chrF", () => {
  const g = T.pageSteps(files(fullCalls), idle, []);
  const loss = g.find((x) => x.key === "loss").steps;
  assert.equal(loss.length, 1);
  assert.equal(loss[0].code, "reference-diff-critic");
  assert.equal(loss[0].id, "loss");
  assert.equal(loss[0].note, "1 critique, 2 units skipped, chrF 61.3");
});
await check("backward grouping: the box critics keep their call order, with critique counts of the queue files", () => {
  const g = T.pageSteps(files(fullCalls), idle, []);
  const b = g.find((x) => x.key === "backward").steps;
  assert.deepEqual(b.map((s) => s.code), CRIT.map((c) => `box-critic.${c}`));
  assert.equal(b.find((s) => s.code === "box-critic.TL_1").note, "2 critiques");
  assert.equal(b[0].id, "critic:QA_3");
});
await check("backward grouping: an ended page with a missing critic call shows 'No call record'", () => {
  const g = T.pageSteps(files(fullCalls.filter((c) => c.tag !== "box-critic.ED_0")), idle, []);
  const s = g.find((x) => x.key === "backward").steps.find((x) => x.code === "box-critic.ED_0");
  assert.equal(s.state, "missing");
  assert.equal(T.stepWord(s.state).label, "No call record");
});
await check("running page: the running box has the mark, later steps show 'Not started yet'", () => {
  const calls = ["TS_0", "TL_0", "ED_0"].map((b) => model(b));
  const g = T.pageSteps(files(calls, { lossCalls: [] }), { running: true, runningBoxes: ["QA_0"] }, []);
  const qa0 = g[1].steps.find((s) => s.code === "QA_0");
  assert.equal(qa0.running, true);
  assert.equal(T.stepWord(qa0.state).label, "Working now");
  const tl1 = g[2].steps.find((s) => s.code === "TL_1");
  assert.equal(T.stepWord(tl1.state).label, "Not started yet");
  assert.equal(g.find((x) => x.key === "backward").steps.length, 12);
  assert.equal(g.find((x) => x.key === "loss").steps[0].state, "waiting");
});
await check("calls: two rows of one tag add up (a new try), a failed row shows 'Failed'", () => {
  const m = T.callsByTag([model("TL_0", { ok: false, error: "timeout" }), model("TL_0")]);
  assert.equal(m.get("TL_0").calls, 2);
  assert.equal(m.get("TL_0").seconds, 4);
  assert.equal(m.get("TL_0").tokens.input, 20);
  const g = T.pageSteps(files([model("TL_0", { ok: false, error: "timeout" })]), idle, []);
  assert.equal(T.stepWord(g[1].steps[0].state).label, "Failed");
  assert.equal(g[1].steps[0].note, "error: timeout");
});

const H = [
  { event: "start", run_id: "2026-11-11T18:30:21-08:00", list_stamp: "20261112T023016Z", utc: "2026-11-12T02:30:21Z" },
  { event: "page-done", page: "aaaa0001/p001", folder: "data/pilot-run/aaaa0001_p001/20261112T023022Z-r41", verdict: "PASS", utc: "2026-11-12T02:53:00Z" },
  { event: "update-point-started", box: "TL_3", page: "aaaa0001/p001", queue_ids: ["q1", "q2", "q3", "q4"], utc: "2026-11-12T02:54:00Z" },
  { event: "prompt-live", box: "TL_3", version: "v2.1.1", parent: "v2.1.0", utc: "2026-11-12T02:55:00Z" },
  { event: "rubric-table-live", box: "TL_3", version: "v2.1.3", parent: { version: "v2.1.0", path: "x" }, change_ids: ["RT-1"], utc: "2026-11-12T02:55:01Z" },
  { event: "update-point-ended", box: "TL_3", result: "rewrite live", seconds: 99.5, hard_groups: 0, soft_groups: 3, queue_ids: ["q1", "q2", "q3", "q4"], utc: "2026-11-12T02:56:00Z" },
  { event: "stopped", reason: "owner", utc: "2026-11-12T03:00:00Z" },
  { event: "start", run_id: "2026-11-11T18:30:21-08:00", list_stamp: "20261112T044136Z", utc: "2026-11-12T04:41:36Z" },
  { event: "prompt-live", box: "ED_0", version: "v9", utc: "2026-11-12T04:42:00Z" },
  { event: "update-point-started", box: "QA_0", page: "aaaa0002/p001", queue_ids: ["q5"], utc: "2026-11-12T05:00:00Z" },
];

await check("update points: started, prompt-live, rubric-table-live and ended join into one entry", () => {
  const u = T.updatePoints(H);
  assert.equal(u.length, 2);
  assert.equal(u[0].box, "TL_3");
  assert.equal(u[0].page, "aaaa0001/p001");
  assert.equal(u[0].version, "v2.1.1");
  assert.equal(u[0].parent, "v2.1.0");
  assert.deepEqual(u[0].rubric, { version: "v2.1.3", parent: "v2.1.0", changeIds: ["RT-1"] });
  assert.equal(u[0].result, "rewrite live");
  assert.equal(u[0].runId, "2026-11-11T18:30:21-08:00");
  assert.equal(T.updateNote(u[0]), "prompt v2.1.0 -> v2.1.1, rubric table v2.1.0 -> v2.1.3, rewrite live, critique groups: 3 soft, 0 hard, 4 critiques");
});
await check("update points: an event of a box without an open update point is ignored, an open one has no end", () => {
  const u = T.updatePoints(H);
  assert.equal(u[1].box, "QA_0");
  assert.equal(u[1].endedEpoch, null);
  assert.equal(u[1].version, null);
  const s = T.updateStep(u[1]);
  assert.equal(s.running, true);
  assert.equal(T.stepWord(s.state).label, "Working now");
  assert.equal(T.updateNote(u[1]), "no result yet, 1 critique");
});
await check("update grouping: the update points of a page go into its group 'Prompt update'", () => {
  const u = T.updatePoints(H).filter((x) => x.page === "aaaa0001/p001");
  const g = T.pageSteps(files(fullCalls), idle, u);
  const up = g.find((x) => x.key === "update").steps;
  assert.deepEqual(up.map((s) => [s.id, s.code, s.text]), [["update:TL_3", "TL_3", "prompt update of TL_3"]]);
});
await check("bad history line: a broken line and a line with a control character are skipped, the rest parses", () => {
  const text = H.slice(0, 3).map((r) => JSON.stringify(r)).join("\n") + '\n{"event": "page-done", "page": "x\u0001y\n{broken\n' + H.slice(3).map((r) => JSON.stringify(r)).join("\n") + "\n";
  const rows = A.parseHistory(text);
  assert.equal(rows.length, H.length);
  assert.equal(T.updatePoints(rows).length, 2);
});

const runId = "2026-11-11T18:30:21-08:00";
const hist = A.phase2History([
  ...H.slice(0, 2),
  { event: "start", run_id: "older-run", list_stamp: "20261101T000000Z" },
  { event: "page-done", page: "ffff0009/p001", folder: "data/pilot-run/ffff0009_p001/r", verdict: "PASS", utc: "2026-11-01T01:00:00Z" },
  { event: "start", run_id: runId, list_stamp: "20261112T044136Z" },
  { event: "page-done", page: "aaaa0002/p001", folder: "data/pilot-run/aaaa0002_p001/20261112T050000Z-r41", verdict: "FAIL", utc: "2026-11-12T05:30:00Z" },
  { event: "page-done", page: "aaaa0003/p001", folder: "data/pilot-run/aaaa0003_p001/20261112T053100Z-r41", verdict: "PASS", utc: "2026-11-12T06:00:00Z" },
]);
const row = (page, state, folder = null, startedEpoch = null) => ({ page, state, folder, startedEpoch, endedEpoch: null, callsDone: 0, callsTotal: 24, seconds: 0 });
const lists = [
  { stamp: "20261112T023016Z", rows: [row("aaaa0001/p001", "done", "pilot-run/aaaa0001_p001/20261112T023022Z-r41", 100), row("aaaa0004/p001", "running", "pilot-run/aaaa0004_p001/20261112T025500Z-r41", 1794452100), row("aaaa0002/p001", "waiting")] },
  {
    stamp: "20261112T044136Z",
    rows: [row("aaaa0001/p001", "waiting"), row("aaaa0002/p001", "done", "pilot-run/aaaa0002_p001/20261112T050000Z-r41"), row("aaaa0003/p001", "done", "x"), row("aaaa0005/p001", "running", "pilot-run/aaaa0005_p001/20261112T060100Z-r41", 1794464460), row("aaaa0006/p001", "waiting"), row("aaaa0004/p001", "waiting")],
  },
];

await check("run order across restarts: accepted, stopped by the restart, accepted after restart, running, then not started", () => {
  const o = T.pagesInRunOrder(hist.pageEvents, runId, lists, true);
  assert.deepEqual(o.map((p) => `${p.page}:${p.kind}`), ["aaaa0001/p001:event", "aaaa0004/p001:stopped", "aaaa0002/p001:event", "aaaa0003/p001:event", "aaaa0005/p001:running", "aaaa0006/p001:not-started"]);
  assert.equal(o[0].listStamp, "20261112T023016Z");
  assert.equal(o[0].folder, "pilot-run/aaaa0001_p001/20261112T023022Z-r41");
});
await check("run order: pages of another run are left out, a stopped run has no running page", () => {
  const o = T.pagesInRunOrder(hist.pageEvents, runId, lists, false);
  assert.ok(!o.some((p) => p.page === "ffff0009/p001"));
  assert.equal(o.find((p) => p.page === "aaaa0005/p001").kind, "stopped");
});
await check("run order: the last end event of a page wins its place", () => {
  const ev = [...hist.pageEvents, { ...hist.pageEvents.find((e) => e.page === "aaaa0001/p001"), epoch: 1794470000, verdict: "FAIL" }];
  const o = T.pagesInRunOrder(ev, runId, lists, true).filter((p) => p.kind === "event");
  assert.equal(o[o.length - 1].page, "aaaa0001/p001");
  assert.equal(o[o.length - 1].event.verdict, "FAIL");
});

await check("readable labels: page states use plain words, never a bare 'Running'", () => {
  const o = T.pagesInRunOrder(hist.pageEvents, runId, lists, true);
  const words = o.map((p) => T.pageWordOf(T.pageState(p, new Set())).label);
  assert.deepEqual(words, ["Accepted", "Stopped before the end", "Accepted with verdict FAIL", "Accepted", "Translating now", "Not started yet"]);
  for (const k of Object.keys(T.PAGE_WORDS)) assert.notEqual(T.PAGE_WORDS[k].label, "Running");
  for (const k of Object.keys(T.STEP_WORDS)) assert.notEqual(T.STEP_WORDS[k].label, "Running");
  assert.equal(T.pageWordOf(T.pageState({ page: "aaaa0003/p001", kind: "event", event: { accepted: true, verdict: "PASS" } }, new Set(["aaaa0003/p001"]))).label, "Accepted with verdict FAIL");
  assert.equal(T.pageWordOf(T.pageState({ page: "x/p1", kind: "event", event: { accepted: false, verdict: null } }, new Set())).label, "Failed");
});
await check("readable labels: step kinds, group help, run words, and an unknown key", () => {
  assert.equal(T.stepKindText("ED_2"), "ED output");
  assert.equal(T.stepKindText("TS_2"), "transcription step");
  assert.equal(T.stepKindText("box-critic.ED_2"), "critiques of ED_2");
  assert.match(T.stepKindText("reference-diff-critic"), /human EN/);
  assert.match(T.GROUP_WORDS.loss.help, /reference-diff-critic/);
  assert.equal(T.runWord("running").label, "Translating now");
  assert.match(T.stepWord("strange").help, /no plain word/);
  assert.equal(T.secondsText(200), "3 min 20 s");
  assert.equal(T.secondsText(4.25), "4.3 s");
  assert.equal(T.versionChange(null, "v2.1.0"), "no earlier version -> v2.1.0");
});
await check("fold state: the running page is open by default, a choice of the owner wins", () => {
  assert.equal(T.isOpen("page:a", {}, true), true);
  assert.equal(T.isOpen("page:a", { "page:a": false }, true), false);
  assert.equal(T.isOpen("page:b", { "page:b": true }, false), true);
});
await check("open pages query: sorted and joined, a bad value is dropped", () => {
  assert.equal(T.openParam(["b/p2", "a/p1", "b/p2"]), "a/p1,b/p2");
  assert.deepEqual([...T.parseOpenParam("a/p1,../x,b/p2,c,/d")], ["a/p1", "b/p2"]);
  assert.equal(T.parseOpenParam(null).size, 0);
});

await check("line diff: same texts give only same lines and one fold", () => {
  const l = D.lineDiff("a\nb\nc\n", "a\nb\nc");
  assert.deepEqual(D.diffCounts(l), { removed: 0, added: 0, same: 3 });
  assert.deepEqual(D.diffBlocks(l), [{ kind: "fold", count: 3, fromOld: 1, fromNew: 1 }]);
});
await check("line diff: a changed line gives one removed and one added line, with line numbers", () => {
  const l = D.lineDiff("a\nb\nc", "a\nB\nc");
  assert.deepEqual(l.map((x) => `${x.op}:${x.text}:${x.oldNo}:${x.newNo}`), ["same:a:1:1", "removed:b:2:null", "added:B:null:2", "same:c:3:3"]);
});
await check("line diff: insert and delete in the middle keep the common lines (LCS)", () => {
  const l = D.lineDiff("1\n2\n3\n4\n5", "1\n3\n4\nX\n5");
  assert.deepEqual(l.map((x) => x.op[0] + x.text), ["s1", "r2", "s3", "s4", "aX", "s5"]);
});
await check("line diff: an empty old text gives all lines added, CRLF counts as LF", () => {
  assert.deepEqual(D.diffCounts(D.lineDiff("", "x\r\ny\r\n")), { removed: 0, added: 2, same: 0 });
  assert.deepEqual(D.diffCounts(D.lineDiff("x\r\ny", "x\ny")), { removed: 0, added: 0, same: 2 });
});
await check("line diff: blocks keep 2 context lines and fold the rest", () => {
  const old = Array.from({ length: 20 }, (_, i) => `l${i}`).join("\n");
  const neu = old.replace("l10", "L10");
  const b = D.diffBlocks(D.lineDiff(old, neu));
  assert.deepEqual(b.map((x) => (x.kind === "fold" ? `fold${x.count}@${x.fromOld}` : `lines${x.lines.length}`)), ["fold8@1", "lines6", "fold7@14"]);
});
await check("line diff: random texts rebuild both sides (200 cases)", () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let k = 0; k < 200; k++) {
    const a = Array.from({ length: Math.floor(rnd() * 12) }, () => "abcd"[Math.floor(rnd() * 4)]);
    const b = Array.from({ length: Math.floor(rnd() * 12) }, () => "abcd"[Math.floor(rnd() * 4)]);
    const l = D.lineDiff(a.join("\n"), b.join("\n"));
    assert.deepEqual(l.filter((x) => x.op !== "added").map((x) => x.text), a);
    assert.deepEqual(l.filter((x) => x.op !== "removed").map((x) => x.text), b);
  }
});

await check("step data: TL lines give the EN text per unit, QA gives score and issues, a critic gives critiques", () => {
  const tl = SD.stepDataSections({ kind: "box", code: "TL_1", calls: [model("TL_1")], parsed: { result: { lines: [{ ja_refs: ["aaaa0001/p001/ts1/L01", "aaaa0001/p001/ts1/L02"], text: "Made-up English." }] }, reasoning: "r" } });
  const units = tl.find((s) => s.kind === "units");
  assert.deepEqual(units.rows, [{ id: "L01, L02", text: "Made-up English." }]);
  assert.equal(units.title, "English text per unit (1)");
  const qa = SD.stepDataSections({ kind: "box", code: "QA_3", calls: [], parsed: { result: { cells: [{ row: 1, name: "Facts", cell: 0 }], issues: [{ issue_id: "QA3-01", row: 2, severity: 5, reason: "r", suspected_stage: "TL" }], marks: [], program_result_marks: [] } }, results: { score: { verdict: "FAIL", page_score: 6, penalty: 4 } } });
  assert.deepEqual(qa.find((s) => s.title === "Score and verdict").rows[0], ["Verdict", "FAIL"]);
  assert.equal(qa.find((s) => s.kind === "critiques").rows[0].head, "rubric table row 2, severity 5");
  const cr = SD.stepDataSections({ kind: "critic", code: "box-critic.ED_2", calls: [], parsed: { result: { critiques: [{ critique_id: "C1", failure_mode: "m", reason: "r", evidence: { ja_piece: "日本", en_piece: "Japan", issue_ids: ["QA_2:I1"] } }] }, note_for_next_critic: "n" }, queue: [{ source_type: "box-critic" }, { source_type: "reference" }] });
  const c = cr.find((s) => s.kind === "critiques").rows[0];
  assert.deepEqual([c.id, c.ja, c.en, c.extra], ["C1", "日本", "Japan", "issues QA_2:I1"]);
  assert.match(cr.find((s) => s.title === "Queue").rows[0][1], /^1 critiques/);
  assert.match(SD.callPairs([model("TL_1")], "TL_1").map((r) => r.join(":")).join("|"), /Tokens:input 10 · output 5 · reasoning 0 · cache read 0 · cache write 0/); // VW96 (Q-A 3:20.2, 3:15.2): level 3 shows all 5 kinds, not the short form
  assert.equal(SD.programLine({ checked_text: "ED_3", items: 66, breaks: 0, notes: [1, 2] }), "checked text ED_3, items 66, breaks 0, notes 2");
});

// ---------------------------------------------------------------- part 2: loaders on made-up data

const base = await fs.mkdtemp(path.join(process.env.TMPDIR, "vw95-test-"));
const root = await fs.realpath(base);
const w = async (rel, v) => {
  const f = path.join(root, rel);
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(f, typeof v === "string" ? v : JSON.stringify(v));
};
const jl = (rows) => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
const STORE = "book-store/paired-dataset";
const RUN = "2026-11-11T18:30:21-08:00";
const L1 = "20261112T023016Z";
const L2 = "20261112T044136Z";
const P1 = "pilot-run/aaaa0001_p001/20261112T023022Z-r41";
const P2 = "pilot-run/aaaa0002_p001/20261112T050000Z-r41";
const P3 = "pilot-run/aaaa0003_p001/20261112T060100Z-r41";
await w("item-metadata/items.filled.jsonl", jl([{ item_id: "aaaa0001ffff", title_en: "Made-up title one", title_ja: "仮の題一" }, { item_id: "aaaa0002ffff", title_en: "Made-up title two", title_ja: "仮の題二" }]));
await w(`${STORE}/status.json`, { state: "running", run_id: RUN, list_stamp: L2, running_page: "aaaa0003/p001", running_boxes: ["ED_1"], fail_pages: ["aaaa0002/p001"] });
await w(
  `${STORE}/history.jsonl`,
  jl([
    { event: "start", run_id: RUN, list_stamp: L1, utc: "2026-11-12T02:30:21Z" },
    { event: "page-done", page: "aaaa0001/p001", folder: `data/${P1}`, verdict: "PASS", seconds: 600, utc: "2026-11-12T02:53:00Z" },
    { event: "update-point-started", box: "TL_3", page: "aaaa0001/p001", queue_ids: ["q1"], utc: "2026-11-12T02:54:00Z" },
    { event: "prompt-live", box: "TL_3", version: "v2.1.1", parent: "v2.1.0", utc: "2026-11-12T02:55:00Z" },
    { event: "update-point-ended", box: "TL_3", result: "rewrite live", seconds: 60, hard_groups: 1, soft_groups: 0, queue_ids: ["q1"], utc: "2026-11-12T02:56:00Z" },
    { event: "stopped", reason: "owner", utc: "2026-11-12T03:00:00Z" },
  ]) +
    '{"event": "page-done", "page": "broken\u0002\n' +
    jl([
      { event: "start", run_id: RUN, list_stamp: L2, utc: "2026-11-12T04:41:36Z" },
      { event: "page-done", page: "aaaa0002/p001", folder: `data/${P2}`, verdict: "FAIL", seconds: 700, utc: "2026-11-12T05:30:00Z" },
    ]),
);
await w(`pilot-run/lists/${L1}/progress.json`, { book: "paired-dataset", kind: "book-run", pages: [{ page_id: "aaaa0001/p001", state: "done", folder: `data/${P1}` }, { page_id: "aaaa0002/p001", state: "waiting", folder: null }] });
await w(`pilot-run/lists/${L2}/progress.json`, {
  book: "paired-dataset",
  kind: "book-run",
  pages: [
    { page_id: "aaaa0001/p001", state: "waiting", folder: null },
    { page_id: "aaaa0002/p001", state: "done", folder: `data/${P2}` },
    { page_id: "aaaa0003/p001", state: "running", folder: `data/${P3}`, started_epoch: 1794463260, calls_total: 24 },
    { page_id: "aaaa0003/p002", state: "waiting", folder: null },
  ],
});
await w("pilot-run/lists/20261010T000000Z/progress.json", { kind: "chain", pages: [{ page_id: "made_up_book/p001" }] });
for (const [P, page] of [
  [P1, "aaaa0001/p001"],
  [P2, "aaaa0002/p001"],
]) {
  await w(`${P}/calls.jsonl`, jl(fullCalls) + "{broken\n");
  await w(`${P}/run.json`, { page });
  await w(`${P}/reference-diff-critic/calls.jsonl`, jl([model("reference-diff-critic")]));
  await w(`${P}/reference-diff-critic/parsed/reference-diff-critic.json`, { result: { critiques: [{ critique_id: "rdc-1", stage_tag: "TL_3", failure_mode: "made-up mode", evidence: { unit_id: "U1", ja_piece: "仮", final_en_piece: "made-up" }, reason: "made-up reason" }] }, reasoning: "x" });
  await w(`${P}/reference-diff-critic/messages/reference-diff-critic.txt`, "Made-up text sent to the reference-diff-critic.\n");
  await w(`${P}/critiques/reference.json`, { queue: [{ reviewed_box: "TL_3", source_type: "reference" }], skipped_units: ["U9"], trend: { chrf: 55 } });
  await w(`${P}/critiques/queue-TL_1.jsonl`, jl([{ reviewed_box: "TL_1", source_type: "box-critic", critique: { critique_id: "TL_1-C1" } }, { reviewed_box: "TL_1", source_type: "reference" }]));
  await w(`${P}/summary.json`, { wall_seconds: 600, qa: { QA_3: { verdict: page === "aaaa0002/p001" ? "FAIL" : "PASS", page_score: 7.5 } } });
  await w(`${P}/parsed/TL_3.json`, { result: { lines: [{ ja_refs: [`${page}/ts3/L01`], text: "Made-up English line." }] }, reasoning: "made-up reasoning" });
  await w(`${P}/results/TL_3.json`, { model_result: {} });
  await w(`${P}/messages/TL_3.txt`, "Made-up exact text sent to TL_3.\n");
  await w(`${P}/parsed/box-critic.TL_1.json`, { result: { critiques: [{ critique_id: "TL_1-C1", failure_mode: "made-up", reason: "r", evidence: {} }] }, note_for_next_critic: "made-up note" });
  await w(`${P}/programs/en_form_check.ED_3.json`, { checked_text: "ED_3", items: 3, breaks: 0 });
}
await w(`${P3}/calls.jsonl`, jl(["TS_0", "TL_0", "ED_0", "QA_0", "TS_1", "TL_1"].map((b) => model(b))));
await w(`${P3}/run.json`, { page: "aaaa0003/p001" });
await w(`${STORE}/update-points/aaaa0001_p001/calls.jsonl`, jl([model("TL_3-grouper", { update_role: "critique-grouper" }), model("TL_3-optimizer-try1", { update_role: "prompt-rewrite-optimizer", model: "made-up/optimizer" }), model("QA_0-grouper")]));
await w(`${STORE}/update-points/aaaa0001_p001/commit-TL_3.json`, { new_label: "v2.1.1", audit: { verdict: "ACCEPT" }, ctx: { groups: [{ group_id: "CG-1", name: "Made-up group" }] } });
await w(`${STORE}/prompts/TL_3/v2.1.0.json`, { version: "v2.1.0", parent: null, text: "line one\nline two\nline three\n" });
await w(`${STORE}/prompts/TL_3/v2.1.1.json`, { version: "v2.1.1", parent: { version: "v2.1.0", path: "x" }, text: "line one\nline 2\nline three\nline four\n" });

async function snapshot(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true, recursive: true })) {
    if (!e.isFile()) continue;
    const f = path.join(e.parentPath, e.name);
    const st = await fs.stat(f);
    out.push(`${f}:${st.size}:${st.mtimeMs}`);
  }
  return out.sort();
}
const before = await snapshot(root);
const Lo = await import("../lib/step-tree-load.ts");

await check("loader: the pages come in run order across the restart, with titles, page of article and plain states", async () => {
  const s = await Lo.loadStepSummary(root, null, null);
  assert.equal(s.error, null);
  assert.equal(s.runId, RUN);
  assert.equal(s.runLabel, "phase 2 run started 2026-11-11 18:30 PST");
  assert.equal(s.runWord.label, "Translating now");
  assert.deepEqual(s.lists.map((l) => [l.stamp, l.label]), [[L1, "list started 2026-11-11 18:30 PST"], [L2, "list started 2026-11-11 20:41 PST"]]);
  assert.deepEqual(s.pages.map((p) => [p.pageId, T.pageWordOf(p.state).label]), [["aaaa0001/p001", "Accepted"], ["aaaa0002/p001", "Accepted with verdict FAIL"], ["aaaa0003/p001", "Translating now"]]);
  assert.deepEqual(s.notStarted.map((p) => p.pageId), ["aaaa0003/p002"]);
  const p1 = s.pages[0];
  assert.deepEqual([p1.title, p1.titleJa, p1.pageOf, p1.listStamp, p1.runFolder, p1.verdict, p1.score, p1.seconds], ["Made-up title one", "仮の題一", "page 1 of 1", L1, "20261112T023022Z-r41", "PASS", 7.5, 600]);
  assert.equal(p1.calls, 25);
  assert.equal(s.pages[2].title, "title not found");
  assert.equal(s.pages[2].pageOf, "page 1 of 2");
});
await check("loader: steps, loss, backward and update of a page; the running page marks its box", async () => {
  const s = await Lo.loadStepSummary(root, null, null);
  const g = s.pages[0].groups;
  assert.equal(g.find((x) => x.key === "loss").steps[0].note, "1 critique, 1 unit skipped, chrF 55.0");
  assert.equal(g.find((x) => x.key === "backward").steps.find((x) => x.code === "box-critic.TL_1").note, "1 critique");
  const up = g.find((x) => x.key === "update").steps;
  assert.equal(up.length, 1);
  assert.deepEqual([up[0].code, up[0].calls, up[0].model], ["TL_3", 2, "made-up/optimizer"]);
  const run = s.pages[2];
  assert.equal(run.running, true);
  assert.deepEqual(run.runningBoxes, ["ED_1"]);
  assert.equal(run.groups[2].steps.find((x) => x.code === "ED_1").running, true);
  assert.equal(s.updates.length, 1);
  assert.match(s.updates[0].pageText, /Made-up title one/);
});
await check("loader: only open pages and the running page carry their steps", async () => {
  const s = await Lo.loadStepSummary(root, null, new Set(["aaaa0002/p001"]));
  assert.deepEqual(s.pages.map((p) => [p.stepsShown, p.groups.length > 0]), [[false, false], [true, true], [true, true]]);
  assert.ok(typeof s.millis === "number");
});
await check("loader: the run view of the first list shows the same run", async () => {
  const a = await Lo.loadStepSummary(root, L1, null);
  assert.equal(a.runId, RUN);
  assert.deepEqual(a.pages.map((p) => p.pageId), ["aaaa0001/p001", "aaaa0002/p001", "aaaa0003/p001"]);
  const none = await Lo.loadStepSummary(root, "20990101T000000Z", null);
  assert.equal(none.pages.length, 0);
  assert.match(none.error ?? "", /No phase 2 run found/);
});
await check("loader: step data of a box, a critic, the loss, an update point and a prompt diff", async () => {
  const tl = await Lo.loadStepData(root, { folder: P1, step: "box:TL_3", page: null, diff: null, version: null });
  assert.deepEqual(tl.sections.find((x) => x.kind === "units").rows, [{ id: "L01", text: "Made-up English line." }]);
  const sent = tl.sections.find((x) => x.kind === "text" && x.title === "Exact text sent");
  assert.equal(sent.text, "Made-up exact text sent to TL_3.\n");
  const links = tl.sections.find((x) => x.kind === "links").links;
  assert.ok(links.some((l) => l.href === "/page/aaaa0001/p001?run=20261112T023022Z-r41"));
  assert.ok(links.some((l) => l.href === `/json?path=${encodeURIComponent(`${P1}/parsed/TL_3.json`)}`));
  const ed = await Lo.loadStepData(root, { folder: P1, step: "box:ED_3", page: null, diff: null, version: null });
  assert.ok(ed.sections.some((x) => x.title === "Program check en_form_check.ED_3.json"));
  const cr = await Lo.loadStepData(root, { folder: P1, step: "critic:TL_1", page: null, diff: null, version: null });
  assert.equal(cr.sections.find((x) => x.kind === "critiques").rows[0].id, "TL_1-C1");
  const loss = await Lo.loadStepData(root, { folder: P1, step: "loss", page: null, diff: null, version: null });
  assert.equal(loss.sections.find((x) => x.kind === "critiques").rows[0].en, "made-up");
  assert.match(loss.sections.find((x) => x.title === "critiques/reference.json").rows.map((r) => r.join(":")).join("|"), /Skipped units:1: U9/);
  const up = await Lo.loadStepData(root, { folder: null, step: "update:TL_3", page: "aaaa0001/p001", diff: null, version: null });
  const diff = up.sections.find((x) => x.kind === "diff");
  assert.deepEqual(diff.counts, { removed: 1, added: 2, same: 2 });
  assert.equal(diff.title, "Prompt text v2.1.0 -> v2.1.1");
  assert.equal(up.sections.find((x) => x.title === "Calls of the update point").rows.length, 2);
  const d = await Lo.loadStepData(root, { folder: null, step: null, page: null, diff: "TL_3", version: "v2.1.1" });
  assert.deepEqual(d.sections.find((x) => x.kind === "diff").counts, { removed: 1, added: 2, same: 2 });
});
await check("loader: a wrong or unsafe query gives a plain message, never an error", async () => {
  for (const q of [
    { folder: "../secrets/x/y", step: "box:TL_3" },
    { folder: "pilot-run/../../x", step: "box:TL_3" },
    { folder: P1, step: "box:XX_9" },
    { folder: P1, step: "box:../../a" },
    { folder: null, step: "update:TL_3", page: "../x" },
    { diff: "TL_3", version: "../../x" },
    { diff: "TL_3", version: "v9.9.9" },
  ]) {
    const d = await Lo.loadStepData(root, { folder: null, step: null, page: null, diff: null, version: null, ...q });
    assert.equal(d.sections.length >= 1, true, JSON.stringify(q));
    assert.equal(d.sections[0].kind, "note", JSON.stringify(q));
  }
});
await check("loader: a missing data folder gives a plain message", async () => {
  const s = await Lo.loadStepSummary(path.join(root, "no-such-folder"), null, null);
  assert.ok(s.error);
  assert.equal(s.pages.length, 0);
});
await check("read only: the loaders wrote no file and changed no file", async () => {
  assert.deepEqual(await snapshot(root), before);
});

await fs.rm(base, { recursive: true, force: true });
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
