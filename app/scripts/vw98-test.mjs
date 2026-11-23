// VW98 (round 91, card P33.1): server-free tests of the training monitor of one box in the run view /runs/<stamp> of a phase 2 list.
// Owner picks Q-A 3:23.3 "Section with box picker in the run view" and Q-A 3:23.4 "Header plus time line as shown", note "With training statistics
// (number of critique, types, updates, etc)". Owner rule Q-A 3:17.4: readable names for every ID and state. Q-A 3:15.2, 3:20.2: tokens, never money.
// Run: TMPDIR=<unit>/tmp node scripts/vw98-test.mjs (from the app folder).
// The test writes made-up Translator files below TMPDIR (one phase 2 run with a restart) and calls the loader and the render parts.
// No real data, no live folder, no server, no network. The last line is "<n> passed, <m> failed".
import assert from "node:assert/strict";
import { existsSync, readFileSync, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire, registerHooks } from "node:module";

const app = path.resolve(import.meta.dirname, "..");
assert.ok(process.env.TMPDIR, "Set TMPDIR (use the unit folder tmp)");
globalThis.fetch = async () => {
  throw new Error("Network is disabled in the VW98 tests.");
};
const ts = createRequire(path.join(app, "package.json"))("typescript");
const withExt = (base) => (existsSync(base + ".ts") ? base + ".ts" : base + ".tsx");
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(pathToFileURL(withExt(path.join(app, specifier.slice(2)))).href, context);
    // The render tests call no router hook: a stub stands in for next/navigation (its CommonJS file has no named exports for node).
    if (specifier === "next/navigation") return { url: "data:text/javascript,export const useRouter = () => ({ push() {} }); export const useSearchParams = () => new URLSearchParams(); export const usePathname = () => '/runs/x';", shortCircuit: true };
    // next/link is a CommonJS file without an "exports" map: add the extension.
    if (/^next\/[a-z-]+$/.test(specifier)) return next(`${specifier}.js`, context);
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !context.parentURL.includes("/node_modules/") && !path.extname(specifier)) return next(pathToFileURL(withExt(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier))).href, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".tsx")) {
      const source = ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
      return { format: "module", source, shortCircuit: true };
    }
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
const read = (rel) => readFileSync(path.join(app, rel), "utf8");

const T = await import("../lib/training-monitor.ts");

// ---------------------------------------------------------------- part 1: pure rules

await check("boxes: 16 codes in grid order, level 0 first", () => {
  assert.equal(T.MONITOR_BOXES.length, 16);
  assert.deepEqual(T.MONITOR_BOXES.slice(0, 5), ["TS_0", "TL_0", "ED_0", "QA_0", "TS_1"]);
  assert.equal(T.MONITOR_BOXES[15], "QA_3");
});

await check("?box= parsing: only the 16 box codes pass", () => {
  assert.equal(T.parseBoxParam("TL_2"), "TL_2");
  assert.equal(T.parseBoxParam("QA_3"), "QA_3");
  for (const bad of [null, undefined, "", "TL_4", "tl_2", " TL_2", "TL_2 ", "box-critic.TL_2", "reference-diff-critic", "../TL_2", "TL_2&x=1"]) assert.equal(T.parseBoxParam(bad), null, String(bad));
});

await check("links: a box code and a box-critic code link to the monitor of the box, other codes and bad stamps do not", () => {
  assert.equal(T.monitorHref("20261112T044136Z", "TL_2"), "/runs/20261112T044136Z?box=TL_2#training-monitor");
  assert.equal(T.monitorHref("20261112T044136Z", "box-critic.ED_1"), "/runs/20261112T044136Z?box=ED_1#training-monitor");
  assert.equal(T.monitorHref("20261112T044136Z", "reference-diff-critic"), null);
  assert.equal(T.monitorHref("../x", "TL_2"), null);
  assert.equal(T.monitorHref("", "TL_2"), null);
});

await check("readable names: the header name of a box comes from the box names, with no code in front", () => {
  assert.match(T.boxName("TL_2"), /^translation stage/);
  assert.match(T.boxName("TL_2"), /Level 2 of 4/);
  assert.equal(T.sourceWord("reference").label, "reference-diff-critic");
  assert.equal(T.sourceWord("box-critic").label, "box-critic");
  assert.match(T.sourceWord("other-kind").label, /other-kind/);
  assert.equal(T.critiqueHead({ source: "box-critic", mark: "soft", status: "used" }), "critique from box-critic (soft)");
  assert.equal(T.critiqueHead({ source: "reference", mark: null, status: "waiting" }), "critique from reference-diff-critic (not grouped yet)");
});

await check("texts: duration, groups, waiting against N, cut at 100 characters", () => {
  assert.equal(T.durationText(144), "2 min 24 s");
  assert.equal(T.durationText(45), "45 s");
  assert.equal(T.durationText(null), "–");
  assert.equal(T.groupsWords(3, 0), "3 soft, 0 hard groups");
  assert.equal(T.groupsWords(null, null), null);
  assert.equal(T.waitingText({ count: 2, n: 3, nSource: "x" }), "2 critiques wait in the queue. An update point starts at N = 3.");
  assert.equal(T.waitingText({ count: 1, n: null, nSource: null }), "1 critique waits in the queue (N not stored)");
  const c = T.cut("x".repeat(150));
  assert.equal(c.length, 100);
  assert.ok(c.endsWith("…"));
  assert.equal(T.pageWords({ title: "Made-up title", pageOf: "page 2 of 3" }), "page 2 of 3 of Made-up title");
});

await check("order: by time; a tie keeps call, critique, update point, rubric table change; no time goes last", () => {
  const e = (kind, epoch, key) => ({ kind, epoch, key });
  const out = T.sortEvents([e("rubric", 10, "r"), e("update", 10, "u"), e("critique", 10, "c"), e("call", 10, "a"), e("call", null, "z"), e("call", 5, "first")]);
  assert.deepEqual(out.map((x) => x.key), ["first", "a", "c", "u", "r", "z"]);
  assert.deepEqual(T.sortVersions(["v2.1.10", "v2.1.2", "v2.1.0"]), ["v2.1.0", "v2.1.2", "v2.1.10"]);
});

// ---------------------------------------------------------------- part 2: loader on made-up data (one phase 2 run with a restart)

const base = await fs.mkdtemp(path.join(process.env.TMPDIR, "vw98-test-"));
const root = await fs.realpath(base);
const w = async (rel, v) => {
  const f = path.join(root, rel);
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(f, typeof v === "string" ? v : JSON.stringify(v));
};
const jl = (rows) => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
const tok = (i, o) => ({ input: i, output: o, reasoning: 0, cache_read: 100, cache_write: 0 });
const call = (tag, utc, extra = {}) => ({ kind: "model", tag, box: tag.replace(/^box-critic\./, ""), model: tag.startsWith("TS_") ? "program" : "claude-028c2ffe/claude-sonnet-5-5", seconds: 144, tokens: tag.startsWith("TS_") ? undefined : tok(10, 5), ok: true, started_utc: utc, ...extra });
const STORE = "book-store/paired-dataset";
const RUN = "2026-11-11T18:30:21-08:00";
const L1 = "20261112T023016Z";
const L2 = "20261112T044136Z";
const A1 = "bbbb0001/p001";
const A2 = "bbbb0002/p001";
const A3 = "bbbb0002/p002";
const F1 = "pilot-run/bbbb0001_p001/20261112T023022Z-r41";
const F2 = "pilot-run/bbbb0002_p001/20261112T050000Z-r41";
const F3 = "pilot-run/bbbb0002_p002/20261112T060100Z-r41";
const crit = (box, page, n, source, mode, extra = {}) => ({
  queue_id: source === "reference" ? `reference:${box}:${page}:r${n}` : `${box}:${page}:${n}`,
  page_id: page,
  reviewed_box: box,
  instruction_version: "v2.1.0",
  source_type: source,
  critique: { critique_id: `${box}-C${n}`, box_type: box.slice(0, 2), instruction_version: "v2.1.0", failure_mode: mode, evidence: "made-up evidence", reason: `made-up reason ${n} ${"long ".repeat(40)}`, note_for_next_step: "made-up note" },
  ...extra,
});
const Q1 = [crit("TL_2", A1, 1, "box-critic", "made-up mode A"), crit("TL_2", A1, 2, "box-critic", "made-up mode A"), crit("TL_2", A1, 1, "reference", "made-up mode B")];
const Q2 = [crit("TL_2", A2, 1, "box-critic", "made-up mode C"), crit("TL_2", A2, 2, "box-critic", "made-up mode A")];
const USED = Q1.map((q) => q.queue_id);

await w("item-metadata/items.filled.jsonl", jl([{ item_id: "bbbb0001ffff", title_en: "Made-up title one", title_ja: "仮の題一" }, { item_id: "bbbb0002ffff", title_en: "Made-up title two", title_ja: "仮の題二" }]));
await w(`${STORE}/status.json`, { state: "running", run_id: RUN, list_stamp: L2, running_page: A3, running_boxes: ["TL_2"], fail_pages: [], update_n: 3, update_n_source: "rule" });
await w(
  `${STORE}/history.jsonl`,
  jl([
    { event: "start", run_id: RUN, list_stamp: L1, update_n: 3, update_n_source: "rule", utc: "2026-11-12T02:30:21Z" },
    { event: "page-done", page: A1, folder: `data/${F1}`, verdict: "PASS", seconds: 600, utc: "2026-11-12T02:53:00Z" },
    { event: "update-point-started", box: "TL_2", page: A1, queue_ids: USED, utc: "2026-11-12T02:54:00Z" },
    { event: "prompt-rejected", box: "TL_2", try: 1, check: "made-up check", reasons: ["made-up"], utc: "2026-11-12T02:55:00Z" },
    { event: "prompt-live", box: "TL_2", version: "v2.1.1", parent: "v2.1.0", utc: "2026-11-12T02:57:00Z" },
    { event: "update-point-ended", box: "TL_2", result: "rewrite live", seconds: 240, hard_groups: 1, soft_groups: 1, queue_ids: USED, cost_usd: 1.5, utc: "2026-11-12T02:58:00Z" },
    { event: "update-point-started", box: "QA_3", page: A1, queue_ids: [], utc: "2026-11-12T02:58:30Z" },
    { event: "rubric-table-live", box: "QA_3", version: "v2.1.1", parent: "v2.1.0", change_ids: ["RT-9001"], update_point: A1, utc: "2026-11-12T02:59:00Z" },
    { event: "update-point-ended", box: "QA_3", result: "rewrite live", seconds: 30, hard_groups: 0, soft_groups: 1, queue_ids: [], utc: "2026-11-12T02:59:30Z" },
    { event: "stopped", reason: "owner", utc: "2026-11-12T03:00:00Z" },
  ]) +
    '{"event": "page-done", "page": "broken\u0002\n' +
    jl([
      { event: "start", run_id: RUN, list_stamp: L2, update_n: 3, update_n_source: "rule", utc: "2026-11-12T04:41:36Z" },
      { event: "page-done", page: A2, folder: `data/${F2}`, verdict: "FAIL", seconds: 700, utc: "2026-11-12T05:30:00Z" },
    ]),
);
await w(`pilot-run/lists/${L1}/progress.json`, { book: "paired-dataset", kind: "book-run", pages: [{ page_id: A1, state: "done", folder: `data/${F1}` }] });
await w(`pilot-run/lists/${L2}/progress.json`, {
  book: "paired-dataset",
  kind: "book-run",
  pages: [
    { page_id: A1, state: "waiting", folder: null },
    { page_id: A2, state: "done", folder: `data/${F2}` },
    { page_id: A3, state: "running", folder: `data/${F3}`, started_epoch: 1794463260, calls_total: 24 },
  ],
});
// TS_3 has no record in these made-up page runs, so it is the box with no events.
const GRID = [0, 1, 2, 3].flatMap((n) => ["TS", "TL", "ED", "QA"].map((s) => `${s}_${n}`)).filter((b) => b !== "TS_3");
for (const [F, page, t, q, qa] of [
  [F1, A1, "02:4", Q1, { verdict: "PASS", page_score: 8 }],
  [F2, A2, "05:1", Q2, { verdict: "FAIL", page_score: 4.5 }],
]) {
  await w(`${F}/calls.jsonl`, jl([...GRID.map((b) => call(b, `2026-11-12T${t}0:00Z`)), call("box-critic.TL_2", `2026-11-12T${t}5:00Z`), call("box-critic.QA_3", `2026-11-12T${t}5:00Z`)]) + "{half line");
  await w(`${F}/reference-diff-critic/calls.jsonl`, jl([call("reference-diff-critic", `2026-11-12T${t}6:00Z`)]));
  await w(`${F}/run.json`, { page, prompts: { TL_2: { version: page === A1 ? "v2.1.0" : "v2.1.1", sha1: "x" } } });
  await w(`${F}/summary.json`, { wall_seconds: 600, qa: { QA_3: qa } });
  await w(`${F}/critiques/queue-TL_2.jsonl`, jl(q) + (page === A2 ? '{"queue_id": "TL_2:half' : ""));
  await w(`${F}/critiques/queue-QA_3.jsonl`, jl([crit("QA_3", page, 1, "box-critic", "made-up QA mode")]));
  await w(`${F}/messages/box-critic.TL_2.txt`, "Made-up text sent to the critic.\n");
}
// A row of another box in the queue file of TL_2 does not count for TL_2.
await fs.appendFile(path.join(root, F1, "critiques/queue-TL_2.jsonl"), JSON.stringify(crit("TL_3", A1, 7, "box-critic", "made-up other box")) + "\n");
await w(`${F3}/calls.jsonl`, jl(["TS_0", "TL_0", "ED_0", "QA_0", "TS_1", "TL_1", "ED_1", "QA_1", "TS_2"].map((b) => call(b, "2026-11-12T06:02:00Z"))));
await w(`${F3}/run.json`, { page: A3, prompts: { TL_2: { version: "v2.1.1" } } });
const UP = `${STORE}/update-points/bbbb0001_p001`;
await w(`${UP}/calls.jsonl`, jl([call("TL_2-grouper", "2026-11-12T02:54:10Z", { update_role: "critique-grouper" }), call("TL_2-optimizer-try1", "2026-11-12T02:54:30Z", { update_role: "prompt-rewrite-optimizer" })]));
await w(`${UP}/commit-TL_2.json`, {
  page: A1,
  box: "TL_2",
  new_label: "v2.1.1",
  audit: { verdict: "ACCEPT", tries: 2 },
  models: { "critique-grouper": "made-up/model" },
  cost_usd: 1.5,
  ctx: {
    groups: [
      { group_id: "CG-1", name: "Made-up group one", failure_mode: "made-up mode A", mark: "soft", queue_ids: [USED[0], USED[1]], judge_reason: "made-up judge reason" },
      { group_id: "CG-2", name: "Made-up group two", failure_mode: "made-up mode B", mark: "hard", queue_ids: [USED[2]] },
    ],
  },
});
for (const n of ["TL_2-audit-try2", "TL_2-optimizer-try1", "TL_2-judge-CG-1", "TL_2-audit-try1", "TL_2-grouper", "TL_2-optimizer-try2", "QA_3-grouper"]) await w(`${UP}/messages/${n}.txt`, `Made-up text sent: ${n}.\n`);
await w(`${UP}/commit-QA_3.json`, { audit: { verdict: "ACCEPT" }, ctx: { groups: [{ group_id: "CG-9", mark: "soft", queue_ids: [] }] } });
await w(`${STORE}/prompts/TL_2/v2.1.0.json`, { version: "v2.1.0", parent: null, text: "line one\nline two\n" });
await w(`${STORE}/prompts/TL_2/v2.1.1.json`, { version: "v2.1.1", parent: { version: "v2.1.0", path: "x" }, text: "line one\nline 2\nline three\n" });
await w(`${STORE}/prompts/TL_2/current`, "v2.1.1\n");
await w(
  `${STORE}/rubric-tables/changes.jsonl`,
  jl([
    { change_id: "RT-9000", utc: "2026-11-01T00:00:00Z", box: "QA_3", kind: "reword_row", row: 1, text_before: { name: "old run" }, text_after: { name: "old run" }, parent: "v2.0.0", version: "v2.0.1" },
    { change_id: "RT-9001", utc: "2026-11-12T02:59:00Z", box: "QA_3", page: A1, update_point: A1, kind: "reword_row", row: 7, text_before: { name: "Made-up row", text: "before" }, text_after: { name: "Made-up row", text: "after" }, parent: "v2.1.0", version: "v2.1.1", cost_usd: 0.2 },
    { change_id: "RT-9002", utc: "2026-11-12T02:59:00Z", box: "QA_0", kind: "reword_row", row: 2, text_before: {}, text_after: {} },
  ]) + "{half",
);
await w(`${STORE}/rubric-tables/QA_3/current`, "v2.1.1\n");

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
const Lo = await import("../lib/training-monitor-load.ts");

const tl2 = await Lo.loadBoxMonitor(root, L2, "TL_2");

await check("loader: no error, header facts of TL_2 (name, live version, run label, now mark)", () => {
  assert.equal(tl2.error, null);
  assert.equal(tl2.box, "TL_2");
  assert.match(tl2.name, /^translation stage/);
  assert.equal(tl2.stats.versions.live, "v2.1.1");
  assert.deepEqual(tl2.stats.versions.list, ["v2.1.0", "v2.1.1"]);
  assert.match(tl2.runLabel, /phase 2 run started 2026-11-11 18:30 PST/);
  assert.ok(tl2.now, "the run is active");
  assert.equal(tl2.now.thisBox, true);
  assert.match(tl2.now.pageLabel, /page 2 of 2 of Made-up title two/);
});

await check("event order: run order across the restart (page 1 before the stop, update point, then the pages after the restart, the running call last)", () => {
  const seq = tl2.events.map((e) => `${e.kind}:${e.kind === "update" ? e.page.id : (e.page?.id ?? "")}`);
  assert.deepEqual(seq, [
    `call:${A1}`,
    `critique:${A1}`,
    `critique:${A1}`,
    `critique:${A1}`,
    `update:${A1}`,
    `call:${A2}`,
    `critique:${A2}`,
    `critique:${A2}`,
    `call:${A3}`,
  ]);
  const crits = tl2.events.filter((e) => e.kind === "critique" && e.page.id === A1);
  assert.deepEqual(crits.map((c) => c.source), ["box-critic", "box-critic", "reference"], "the box-critic ran before the reference-diff-critic");
  const last = tl2.events[tl2.events.length - 1];
  assert.equal(last.running, true);
  assert.equal(last.state, "running");
});

await check("statistics: critique counts by source, by state, soft and hard, failure modes", () => {
  const c = tl2.stats.critiques;
  assert.equal(c.total, 5, "the row of TL_3 and the half lines do not count");
  assert.deepEqual(c.bySource, [
    { label: "box-critic", n: 4 },
    { label: "reference-diff-critic", n: 1 },
  ]);
  assert.deepEqual(c.byStatus, [
    { label: "Used by an update point", n: 3 },
    { label: "Waits in the queue", n: 2 },
  ]);
  assert.equal(c.soft, 2);
  assert.equal(c.hard, 1);
  assert.equal(c.noMark, 2);
  assert.equal(c.failureModes, 3);
  assert.deepEqual(c.byFailureMode[0], { label: "made-up mode A", n: 3 });
  const marks = tl2.events.filter((e) => e.kind === "critique").map((e) => T.critiqueHead(e));
  assert.deepEqual(marks, [
    "critique from box-critic (soft)",
    "critique from box-critic (soft)",
    "critique from reference-diff-critic (hard)",
    "critique from box-critic (not grouped yet)",
    "critique from box-critic (not grouped yet)",
  ]);
});

await check("waiting against N: 2 critiques of the accepted page after the restart wait, N = 3 from status.json", () => {
  assert.equal(tl2.stats.waiting.count, 2);
  assert.equal(tl2.stats.waiting.n, 3);
  assert.match(tl2.stats.waiting.nSource, /status\.json update_n, rule/);
});

await check("statistics: update points (result, audit, rejected tries, groups) and page calls (seconds, tokens)", () => {
  const u = tl2.stats.updates;
  assert.equal(u.total, 1);
  assert.deepEqual(u.byResult, [{ label: "rewrite live", n: 1 }]);
  assert.deepEqual(u.audit, [{ label: "ACCEPT", n: 1 }]);
  assert.equal(u.rejectedTries, 1);
  assert.equal(u.softGroups, 1);
  assert.equal(u.hardGroups, 1);
  const k = tl2.stats.calls;
  assert.equal(k.pages, 2);
  assert.equal(k.seconds, 288);
  assert.equal(k.meanSeconds, 144);
  assert.equal(k.tokens.input, 20);
  assert.equal(k.tokens.cache_read, 200);
  assert.equal(k.qa, null);
  assert.equal(tl2.stats.rubric, null, "no rubric table for a TL box");
  assert.deepEqual(tl2.stats.trend.map((t) => t.n), [3, 2, 0]);
  const up = tl2.events.find((e) => e.kind === "update");
  assert.equal(up.audit, "ACCEPT");
  assert.equal(up.version, "v2.1.1");
  assert.equal(up.parent, "v2.1.0");
  assert.equal(up.rejected, 1);
  assert.equal(up.queueCount, 3);
  assert.equal(up.calls, 2);
  const c1 = tl2.events.find((e) => e.kind === "call");
  assert.equal(c1.promptVersion, "v2.1.0");
  assert.equal(c1.model, "claude-028c2ffe/claude-sonnet-5-5");
});

await check("QA box: verdict PASS and FAIL counts, mean score, rubric table changes of this run only", async () => {
  const qa = await Lo.loadBoxMonitor(root, L2, "QA_3");
  assert.equal(qa.error, null);
  assert.deepEqual(qa.stats.calls.qa, { pass: 1, fail: 1, other: 0, meanScore: 6.25 });
  assert.deepEqual(qa.stats.rubric, { changes: 1, live: "v2.1.1" });
  const r = qa.events.filter((e) => e.kind === "rubric");
  assert.equal(r.length, 1);
  assert.equal(r[0].changeId, "RT-9001");
  assert.equal(r[0].name, "Made-up row");
  const calls = qa.events.filter((e) => e.kind === "call");
  assert.deepEqual(calls.map((c) => c.verdict), ["PASS", "FAIL"], "QA_3 does not run now, so the running page has no QA_3 line yet");
  assert.equal(qa.stats.updates.total, 1);
  assert.equal(qa.stats.critiques.total, 2);
});

await check("a box with no events: empty time line, zero counts, no error", async () => {
  const m = await Lo.loadBoxMonitor(root, L2, "TS_3");
  assert.equal(m.error, null);
  assert.equal(m.events.length, 0);
  assert.equal(m.stats.critiques.total, 0);
  assert.equal(m.stats.updates.total, 0);
  assert.equal(m.stats.calls.pages, 0);
  assert.equal(m.stats.calls.tokens, null);
  assert.equal(m.stats.versions.live, null);
});

await check("a wrong box and an unknown list give a plain message", async () => {
  const bad = await Lo.loadBoxMonitor(root, L2, "XX_9");
  assert.match(bad.error, /Unknown box code/);
  const none = await Lo.loadBoxMonitor(path.join(root, "no-such-folder"), L2, "TL_2");
  assert.ok(none.error);
  assert.equal(none.events.length, 0);
});

await check("the same list from the first list stamp gives the same run (the monitor reads the whole run across restarts)", async () => {
  const a = await Lo.loadBoxMonitor(root, L1, "TL_2");
  assert.equal(a.events.length, tl2.events.length);
  assert.equal(a.stats.critiques.total, 5);
});

await check("signature: two reads of unchanged files give the same signature; a new critique changes it", async () => {
  const again = await Lo.loadBoxMonitor(root, L2, "TL_2");
  assert.equal(again.sig, tl2.sig);
  await fs.mkdir(path.join(root, F3, "critiques"), { recursive: true });
  await fs.writeFile(path.join(root, F3, "critiques", "queue-TL_2.jsonl"), jl([crit("TL_2", A3, 1, "box-critic", "made-up mode D")]));
  const next = await Lo.loadBoxMonitor(root, L2, "TL_2");
  assert.notEqual(next.sig, tl2.sig);
  const c = next.events.find((e) => e.kind === "critique" && e.page.id === A3);
  assert.equal(c.status, "page-running");
  assert.equal(next.stats.waiting.count, 2, "a critique of the running page does not wait in the queue yet");
  await fs.rm(path.join(root, F3, "critiques"), { recursive: true });
});

await check("half lines: the broken lines of history.jsonl, calls.jsonl, the queue file and changes.jsonl are skipped", () => {
  assert.deepEqual(Lo.parseJsonLines('{"a":1}\n{"b": "x\u0002\n\n{"c":3}\n{"d":'), [{ a: 1 }, { c: 3 }]);
  assert.equal(tl2.stats.critiques.total, 5);
});

await check("history facts: queue IDs of each update point come from the end row, N from the start row", () => {
  const f = Lo.historyFacts([
    { event: "start", run_id: "r1", update_n: 4, update_n_source: "made-up" },
    { event: "update-point-started", box: "TL_0", page: "x/p1", queue_ids: ["a"], utc: "2026-11-12T00:00:00Z" },
    { event: "update-point-ended", box: "TL_0", queue_ids: ["a", "b"], utc: "2026-11-12T00:01:00Z" },
  ]);
  assert.deepEqual([...f.queueIds.values()], [["a", "b"]]);
  assert.deepEqual(f.runN.get("r1"), { n: 4, source: "made-up" });
});

// ---------------------------------------------------------------- part 3: data of one opened line

await check("opened critique: all fields of the record, with links", async () => {
  const d = await Lo.loadMonitorItem(root, { item: "critique", box: "TL_2", folder: F1, queueId: USED[2], page: null, change: null });
  const pairs = d.sections.find((s) => s.kind === "pairs");
  const keys = pairs.rows.map((r) => r[0]);
  for (const k of ["queue_id", "page_id", "reviewed_box", "instruction_version", "source_type", "critique.failure_mode", "critique.reason", "critique.evidence", "critique.note_for_next_step"]) assert.ok(keys.includes(k), k);
  assert.ok(pairs.rows.find((r) => r[0] === "critique.reason")[1].length > 100, "the full reason, not cut");
  const links = d.sections.find((s) => s.kind === "links").links;
  assert.ok(links.some((l) => l.href.startsWith("/json?")));
  const bad = await Lo.loadMonitorItem(root, { item: "critique", box: "TL_2", folder: "../x", queueId: "q", page: null, change: null });
  assert.equal(bad.sections[0].kind, "note");
});

await check("opened update point: marked groups, prompt line diff, exact text of each update role in role order, commit file without money", async () => {
  const d = await Lo.loadMonitorItem(root, { item: "update", box: "TL_2", folder: null, queueId: null, page: A1, change: null });
  const groups = d.sections.find((s) => s.kind === "units" && s.title.startsWith("Critique groups"));
  assert.match(groups.rows[0].text, /^soft · Made-up group one · failure mode: made-up mode A · 2 critiques/);
  assert.match(groups.rows[1].text, /^hard/);
  const calls = d.sections.find((s) => s.kind === "units" && s.title === "Calls of the update point");
  assert.match(calls.rows[0].text, /model claude-sonnet-5-5 \(Claude card ntngh\),/, "readable model name with the card name");
  assert.ok(d.sections.some((s) => s.kind === "diff" && /v2\.1\.0 -> v2\.1\.1/.test(s.title)));
  const sent = d.sections.filter((s) => s.kind === "text" && s.title.startsWith("Exact text sent")).map((s) => s.title.split(" ")[3]);
  assert.deepEqual(sent, ["TL_2-grouper", "TL_2-judge-CG-1", "TL_2-optimizer-try1", "TL_2-audit-try1", "TL_2-optimizer-try2", "TL_2-audit-try2"]);
  const commit = d.sections.find((s) => s.kind === "text" && s.title.startsWith("Commit file"));
  assert.ok(commit.text.includes("ACCEPT"));
  assert.ok(!/cost/i.test(commit.text), "no money key");
  assert.ok(!/cost|USD|\$/i.test(JSON.stringify(d.sections.filter((s) => s.kind !== "text"))));
});

await check("opened rubric table change: row text diff, fields without money, links", async () => {
  const d = await Lo.loadMonitorItem(root, { item: "rubric", box: "QA_3", folder: null, queueId: null, page: null, change: "RT-9001" });
  assert.ok(d.sections.some((s) => s.kind === "diff" && s.counts.added === 1 && s.counts.removed === 1));
  assert.ok(!JSON.stringify(d).includes("cost"));
  const other = await Lo.loadMonitorItem(root, { item: "rubric", box: "QA_3", folder: null, queueId: null, page: null, change: "RT-9002" });
  assert.equal(other.sections[0].kind, "note", "a change of another box does not show");
});

await check("the loader wrote nothing in the data folder", async () => {
  assert.deepEqual(await snapshot(root), before);
});

// ---------------------------------------------------------------- part 4: rendered text

const React = createRequire(path.join(app, "package.json"))("react");
const { renderToStaticMarkup } = createRequire(path.join(app, "package.json"))("react-dom/server");
const V = await import("../components/TrainingMonitorView.tsx");
const P = await import("../components/TrainingMonitor.tsx");
const allOn = { call: true, critique: true, update: true, rubric: true };
const html = renderToStaticMarkup(
  React.createElement(React.Fragment, null, React.createElement(V.MonitorHeader, { data: tl2 }), React.createElement(V.KindTicks, { events: tl2.events, shown: allOn, setShown: () => {} }), React.createElement(V.TimeLine, { data: tl2, shown: allOn, opened: {}, setOpened: () => {}, tick: 0 })),
);
// unit VW127 (Q-A 3:122.4): a highlight span (data-hl) adds no space to the text.
const unHl = (html) => html.replace(/<span [^>]*data-hl="[^"]*"[^>]*>([^<]*)<\/span>/g, "$1");
const text = html.replace(/<span [^>]*data-hl="[^"]*"[^>]*>([^<]*)<\/span>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ");

await check("render: the lines read as the owner proposal (page words, model with card name, tokens, prompt version, groups, audit, version change)", () => {
  for (const s of [
    "Training statistics",
    "Made-up title one",
    "page 1 of 2 of Made-up title two",
    "claude-sonnet-5-5 (Claude card ntngh)",
    "2 min 24 s",
    "Tokens in (with cache) / out",
    "prompt v2.1.0",
    "critique from box-critic (soft)",
    "critique from reference-diff-critic (hard)",
    "1 soft, 1 hard groups",
    "audit ACCEPT",
    "v2.1.0 -> v2.1.1",
    "2026-11-11 18:54 PST",
    "2 critiques wait in the queue. An update point starts at N = 3.",
    "Page calls (3)",
    "Critiques (5)",
    "Update points (1)",
    "Rubric table changes (0)",
    "Working now",
  ])
    assert.ok(text.includes(s), `missing: ${s}`);
});

await check("render: no money and no e-mail address in the rendered text", () => {
  assert.ok(!/USD|\$|cost/i.test(text), "money");
  assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text), "e-mail");
});

await check("render: a QA box shows verdicts and the mean page score; a box with no events shows a plain line", async () => {
  const qa = await Lo.loadBoxMonitor(root, L2, "QA_3");
  const h = renderToStaticMarkup(React.createElement(V.MonitorHeader, { data: qa }));
  assert.ok(unHl(h).includes("verdict PASS 1 · FAIL 1")); // unit VW127: a highlight span splits the raw markup, the text is the same
  assert.ok(h.includes("mean page score 6.3"));
  assert.ok(unHl(h).includes("1 changes in this run")); // unit VW127
  const none = await Lo.loadBoxMonitor(root, L2, "TS_3");
  const t = renderToStaticMarkup(React.createElement(V.TimeLine, { data: none, shown: allOn, opened: {}, setOpened: () => {}, tick: 0 }));
  assert.ok(t.includes("No line to show"));
});

await check("render: tick boxes off hide a kind", () => {
  const h = renderToStaticMarkup(React.createElement(V.TimeLine, { data: tl2, shown: { ...allOn, critique: false }, opened: {}, setOpened: () => {}, tick: 0 }));
  assert.ok(!h.includes('data-monitor-event="critique"'));
  assert.ok(h.includes('data-monitor-event="call"'));
  assert.ok(unHl(h).includes("4 of 9 lines shown")); // unit VW127: the count "4 of 9" is a highlight span
});

await check("render: the box picker shows 16 codes with the readable name on hover, and marks the picked box", () => {
  const h = renderToStaticMarkup(React.createElement(P.BoxPicker, { box: "TL_2", pick: () => {} }));
  assert.equal((h.match(/data-box-button=/g) ?? []).length, 16);
  assert.ok(h.includes('data-box-button="TL_2" aria-pressed="true"'));
  assert.ok(/title="TL_2: translation stage/.test(h));
  assert.ok(h.includes("Level 3"));
});

await check("sources: step tree box codes use the monitor link, the run view shows the section only for a phase 2 list", () => {
  const tree = read("components/StepTree.tsx");
  assert.match(tree, /function Code\(\{ code \}: \{ code: string \}\) \{\s*return \(\s*<span className="font-mono">\s*<BoxMonitorLink code=\{code\} \/>/);
  assert.match(read("components/StepView.tsx"), /<MonitorStampProvider stamp=\{list \?\? data\.lists\[data\.lists\.length - 1\]\?\.stamp \?\? null\}>/);
  // Unit VW99 (Q-A 3:27.3): the section shows in the tab "Training monitor" of a phase 2 list.
  assert.ok(read("components/RunView.tsx").includes('{open === "training" && run.phase2List === true ? <TrainingMonitor stamp={run.stamp} /> : null}'));
});

await fs.rm(base, { recursive: true, force: true });
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
