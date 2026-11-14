// VW103 (round 91, card P37.1): server-free tests of the running update point on the phase 2 row of the Monitor dashboard "/" and in the step view.
// Owner words (Q-A 3:35.4): "This tell nothing about what happen? what is the process? etc". Owner pick (Q-A 3:36.4): "Both: Translator lines in TR93, Viewer now (VW103)".
// Run: node scripts/vw103-test.mjs (from the app folder, no environment variable). The last line is "<n> passed, <m> failed".
// Made-up data only: made-up article IDs (c0ffee01, c0ffee02), made-up titles, made-up files below a temporary folder. No real ID, no live folder, no server, no network.
// The file layout follows the Translator code (cited in lib/update-live.ts): history.jsonl, update-points/<article>_<page>/{calls.jsonl, raw/<tag>.try<n>.{sent,jsonl,export.json}}.
import assert from "node:assert/strict";
import { readFileSync, promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, htmlText, installAppHooks, jl, madeUpRoot, snapshot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
globalThis.fetch = async () => {
  throw new Error("Network is disabled in the VW103 tests.");
};
// "No environment variable": without TMPDIR the test works in a hidden folder of the app copy (git-ignored node_modules), and removes it at the end.
let fallbackTmp = null;
if (!process.env.TMPDIR) {
  fallbackTmp = path.join(app, "node_modules", ".vw103-tmp");
  await fs.mkdir(fallbackTmp, { recursive: true });
  process.env.TMPDIR = fallbackTmp;
}
installAppHooks(app);
const { check, done } = checker();
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const strip = (s) => s.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

const UL = await import("../lib/update-live.ts");
const WR = await import("../lib/phase2-wait-reason.ts");
const WT = await import("../lib/phase2-wait.ts");
const P = await import("../lib/phase2-row.ts");
const { loadPhase2 } = await import("../lib/phase2-load.ts");
const { loadPhase2Articles } = await import("../lib/phase2-articles-load.ts");
const A = await import("../lib/phase2-articles.ts");
const { loadUpdateLive } = await import("../lib/update-live-load.ts");
const { loadStepSummary } = await import("../lib/step-tree-load.ts");
const { PHASE2_STORE } = await import("../lib/run-store.ts");

// ---------------------------------------------------------------- the made-up data folder

const { base, root, w } = await madeUpRoot("vw103-test-");
const NOW = Date.UTC(2026, 10, 14, 4, 30, 0) / 1000; // 2026-11-14T04:30:00Z = 2026-11-13 20:30 PST
const NOW_MS = NOW * 1000;
const iso = (e) => new Date(e * 1000).toISOString().replace(".000Z", "Z");
const alive = (pid) => pid === process.pid;
const STORE = "book-store/paired-dataset";
const ART = "c0ffee01";
const PAGE = `${ART}/p004`;
const DIR = `${STORE}/update-points/${ART}_p004`;
const DIR3 = `${STORE}/update-points/${ART}_p003`;
const LIST = "20261114T030000Z";
const RUN = "2026-11-13T19:00:00-08:00";

await w("item-metadata/items.filled.jsonl", jl([
  { item_id: "c0ffee01-aaaa-4bbb-8ccc-000000000001", title_en: "Made-up article one", title_ja: "仮の記事一" },
  { item_id: "c0ffee02-aaaa-4bbb-8ccc-000000000002", title_en: "Made-up article two", title_ja: "仮の記事二" },
]));
const LIST_PAGES = [1, 2, 3, 4, 5].map((n) => `${ART}/p00${n}`).concat(["c0ffee02/p001", "c0ffee02/p002"]);
const PROGRESS = { book: "paired-dataset", phase: "agent-phase-2", pages: LIST_PAGES.map((id) => ({ page_id: id, state: "waiting" })) };
await w(`pilot-run/lists/${LIST}/progress.json`, PROGRESS);

const STATUS = {
  schema: "book-status-v1", book: "paired-dataset", phase: "agent-phase-2", state: "running", stop_reason: null, stop_text: null, list_stamp: LIST, pid: process.pid,
  heartbeat_utc: iso(NOW - 10), running_page: null, running_boxes: [], last_accepted_page: PAGE, next_page: `${ART}/p005`, pages_done: 4, pages_total: 7, accepted: [],
  fail_pages: [], last_error: null, started_utc: "2026-11-14T03:00:00Z", run_id: RUN, updated_utc: iso(NOW - 10),
  tokens_phase: { input: 100, output: 200, reasoning: 0, cache_read: 300, cache_write: 400, calls: 5 },
};
const startRow = { utc: "2026-11-14T03:00:00Z", event: "start", run_id: RUN, list_stamp: LIST };
const doneRow = (page, utc) => ({ utc, event: "page-done", page, folder: `data/pilot-run/${page.replace("/", "_")}/20261114T030000Z-r41`, verdict: "PASS" });
const HIST_BASE = [
  startRow,
  doneRow(`${ART}/p003`, "2026-11-14T03:50:18Z"),
  { utc: "2026-11-14T04:00:00Z", event: "update-point-started", box: "TL_1", page: `${ART}/p003`, queue_ids: ["TL_1:a:1", "TL_1:a:2", "TL_1:a:3"] },
  { utc: "2026-11-14T04:03:00Z", event: "update-point-ended", box: "TL_1", result: "rewrite live" },
  doneRow(PAGE, "2026-11-14T04:10:00Z"),
];
const OPEN_ROW = { utc: iso(NOW - 790), event: "update-point-started", box: "QA_2", page: PAGE, queue_ids: ["QA_2:a:1", "QA_2:a:2", "QA_2:a:3"] };
const HIST_OPEN = [...HIST_BASE, OPEN_ROW];

// calls.jsonl rows (update_agents.py _send: update_role, update_page; launcher: attempts)
const crow = (tag, role, utc, card = "claude-028c2ffe", extra = {}) => ({
  kind: "model", tag, box: tag, model: `${card}/claude-opus-5-5`, ok: true, seconds: 10, started_utc: utc, update_role: role, update_page: PAGE,
  attempts: [{ attempt: 1, card, seconds: 10, blocked: false, error: null }], ...extra,
});
const ROLES = ["critique-grouper", "critique-group-check-judge", "prompt-rewrite-optimizer", "prompt-audit-judge"];
const CALLS_P3 = [
  crow("TL_1-grouper", ROLES[0], "2026-11-14T04:00:10Z"), crow("TL_1-judge-CG-1", ROLES[1], "2026-11-14T04:00:30Z"),
  crow("TL_1-optimizer-try1", ROLES[2], "2026-11-14T04:01:00Z"), crow("TL_1-audit-try1", ROLES[3], "2026-11-14T04:02:30Z"),
];
const CALLS_P4 = [crow("QA_2-grouper", ROLES[0], iso(NOW - 765)), crow("QA_2-judge-CG-1", ROLES[1], iso(NOW - 750))];

// event files (the shape of the real files: step_start, text, error with error.type, step_finish)
const ev = (type, extra = {}) => JSON.stringify({ type, timestamp: 1, sessionID: "ses_madeup", ...extra });
const EV_START = ev("step_start");
const EV_TEXT = ev("text", { part: { text: "made-up answer" } });
const EV_BLOCK = ev("error", { error: { type: "provider.content-filter", message: "Provider blocked the response (reasoning_extraction): made-up text." } });
const EV_ERR = ev("error", { error: { type: "provider.rate-limit", message: "Too many requests. Try again later." } });
const EV_END = ev("step_finish");
const events = (...l) => l.join("\n") + "\n";

// raw/ files: [name, text, age in seconds before NOW]
const fin = (tag, n, startAge, endAge, text) => [[`${tag}.try${n}.sent`, "made-up message", startAge], [`${tag}.try${n}.jsonl`, text, endAge], [`${tag}.try${n}.export.json`, "{}", endAge]];
const runningTry = (tag, n, startAge, lastEventAge) => [[`${tag}.try${n}.sent`, "made-up message", startAge], [`${tag}.try${n}.jsonl`, events(EV_START), lastEventAge]];
const RAW_BASE = [
  ...fin("QA_2-grouper", 1, 770, 765, events(EV_START, EV_TEXT, EV_END)),
  ...fin("QA_2-judge-CG-1", 1, 755, 750, events(EV_START, EV_TEXT, EV_END)),
  ...fin("QA_2-optimizer-try1", 3, 5000, 4990, events(EV_START, EV_TEXT, EV_END)), // an old file of an earlier run of the same names: older than the update point
];
const TRY1_BLOCKED = fin("QA_2-optimizer-try1", 1, 513, 492, events(EV_START, EV_TEXT, EV_BLOCK, EV_END));
const RAW_RUNNING = [...RAW_BASE, ...TRY1_BLOCKED, ...runningTry("QA_2-optimizer-try1", 2, 492, 20)];

async function scene(o = {}) {
  await fs.rm(path.join(root, "book-store"), { recursive: true, force: true });
  await w(`${STORE}/status.json`, { ...STATUS, ...(o.status ?? {}) });
  await w(`${STORE}/history.jsonl`, jl(o.history ?? HIST_OPEN));
  await w(`${DIR3}/calls.jsonl`, jl(o.calls3 ?? CALLS_P3));
  await w(`${DIR}/calls.jsonl`, jl(o.calls ?? CALLS_P4));
  await w(`pilot-run/${ART}_p004/20261114T030000Z-r41/calls.jsonl`, "");
  for (const [name, text, age] of o.raw ?? RAW_RUNNING) {
    const rel = `${DIR}/raw/${name}`;
    await w(rel, text);
    await fs.utimes(path.join(root, rel), NOW - age, NOW - age);
  }
}
const lists = [{ stamp: LIST, progress: PROGRESS }];
/** The phase 2 view with the update, and the text lines of the row (the lines of the component: phase2Text plus the update lines). */
async function view(o) {
  await scene(o);
  return loadPhase2(root, NOW_MS, alive);
}
const lineText = (lines, key) => lines.find((l) => l.key === key)?.text;

// ---------------------------------------------------------------- the component (rendered with react-dom/server, no server process)

const React = createRequire(path.join(app, "package.json"))("react");
const { renderToStaticMarkup } = createRequire(path.join(app, "package.json"))("react-dom/server");
const h = (c, props) => renderToStaticMarkup(React.createElement(c, props));
const Phase2Row = (await import("../components/Phase2Row.tsx")).default;
const StepTreeMod = await import("../components/StepTree.tsx");
const { UpdateLiveBlock } = await import("../components/UpdateLiveBlock.tsx");
const unBox = (html) => html.replace(/<span data-box-code="[^"]*"[^>]*>([^<]*)<span class="sr-only">[^<]*<\/span><\/span>/g, "$1");
const plain = (html) => htmlText(unBox(html)).trim().replace(/ :/g, ":");
/** The text of one row item of the rendered row. */
const rowItem = (html, key) => {
  const m = new RegExp(`<li data-phase2-item="${key}"[^>]*>([\\s\\S]*?)</li>`).exec(unBox(html));
  return m ? htmlText(m[1]).trim() : null;
};

const FULL_ROW =
  "Now: update point after Made-up article one, page 4 of 5 (c0ffee01/p004) · box QA_2 · role 3 of 4 prompt-rewrite-optimizer (writes the new prompt) · try 2 on Claude card uonlp · 8 min 12 s";

// ---------------------------------------------------------------- part 1: pure rules

await check("words: roleOfTag, durationText, cardForTry, cardIdOf", () => {
  assert.deepEqual(UL.roleOfTag("QA_2-optimizer-try2"), { box: "QA_2", role: "prompt-rewrite-optimizer", roleN: 3, group: null, round: 2 });
  assert.deepEqual(UL.roleOfTag("TL_3-judge-CG-U1"), { box: "TL_3", role: "critique-group-check-judge", roleN: 2, group: "CG-U1", round: null });
  assert.equal(UL.roleOfTag("ED_1-grouper").roleN, 1);
  assert.equal(UL.roleOfTag("ED_1-audit-try1").roleN, 4);
  for (const bad of ["grouper", "QA_9-grouper", "QA_2-other", "box-critic.QA_2", "QA_2-optimizer-try", ""]) assert.equal(UL.roleOfTag(bad), null, bad);
  assert.deepEqual([0, 21, 59.4, 59.6, 60, 492, 1500, 3600, 3725].map(UL.durationText), ["0 s", "21 s", "59 s", "1 min 0 s", "1 min 0 s", "8 min 12 s", "25 min 0 s", "1 h 00 min", "1 h 02 min"]);
  assert.equal(UL.durationText(-5), "0 s");
  // TR91 rule: try 1 on the own card, each next try on the next card, wrapping.
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => UL.cardForTry("claude-028c2ffe", n)), ["claude-028c2ffe", "claude-aade7ca8", "claude-7f6d8610", "claude-028c2ffe", "claude-aade7ca8"]);
  assert.equal(UL.cardForTry("claude-aade7ca8", 2), "claude-7f6d8610");
  assert.equal(UL.cardForTry("google", 2), null);
  assert.equal(UL.cardForTry(null, 1), null);
  assert.equal(UL.cardIdOf("uonlp"), "claude-aade7ca8");
  assert.equal(UL.cardIdOf("claude-7f6d8610"), "claude-7f6d8610");
  assert.equal(UL.cardIdOf("xai"), "xai");
  assert.equal(UL.cardIdOf(""), null);
  assert.equal(UL.cardIdOf(5), null);
  assert.equal(UL.cardPhrase("claude-aade7ca8"), "Claude card uonlp");
  assert.equal(UL.cardPhrase("xai"), "provider xai");
  // the 4 roles and their plain words are the ones of VW95
  assert.deepEqual(WR.ROLE_ORDER, ["critique-grouper", "critique-group-check-judge", "prompt-rewrite-optimizer", "prompt-audit-judge"]);
  assert.equal(UL.ROLES_TOTAL, 4);
});

await check("rules: pickTries (running = .sent without a newer .export.json), a re-run, old files, a replaced try", () => {
  const S = (tag, n, sent, exp = null, jl2 = null) => ({ tag, n, sentMs: sent * 1000, exportMs: exp === null ? null : exp * 1000, jsonlMs: jl2 === null ? null : jl2 * 1000 });
  const none = new Set();
  // a try with .sent and no export runs
  assert.deepEqual(UL.pickTries([S("QA_2-optimizer-try1", 1, 100)], 50, none).running.map((s) => s.n), [1]);
  // an export that is newer than the .sent file ends the try
  assert.equal(UL.pickTries([S("QA_2-optimizer-try1", 1, 100, 130)], 50, none).running.length, 0);
  // an old export of an earlier run (older than the .sent file) does not end the try
  assert.equal(UL.pickTries([S("QA_2-optimizer-try1", 1, 100, 40)], 50, none).running.length, 1);
  // a file older than the start of the update point does not count at all (1 s slack)
  assert.equal(UL.pickTries([S("QA_2-optimizer-try1", 1, 40)], 50, none).running.length, 0);
  assert.equal(UL.pickTries([S("QA_2-optimizer-try1", 1, 49.5)], 50, none).running.length, 1);
  // a later try of the same tag replaces an open earlier try (no export, for example a try with no session)
  const r = UL.pickTries([S("QA_2-optimizer-try1", 1, 100), S("QA_2-optimizer-try1", 2, 130)], 50, none);
  assert.deepEqual(r.running.map((s) => s.n), [2]);
  assert.deepEqual(r.finished.map((s) => s.n), [1]);
  // the end of the call (a row of calls.jsonl) ends an open try
  assert.equal(UL.pickTries([S("QA_2-optimizer-try1", 1, 100)], 50, new Set(["QA_2-optimizer-try1"])).running.length, 0);
  // two calls at once: the newest first
  assert.deepEqual(UL.pickTries([S("QA_2-judge-CG-1", 1, 100), S("QA_2-judge-CG-2", 1, 120)], 50, none).running.map((s) => s.tag), ["QA_2-judge-CG-2", "QA_2-judge-CG-1"]);
  // the file names
  assert.deepEqual(UL.parseRawName("QA_2-optimizer-try1.try2.sent", "QA_2"), { tag: "QA_2-optimizer-try1", n: 2, kind: "sent" });
  assert.deepEqual(UL.parseRawName("QA_2-judge-CG-U1.try1.export.json", "QA_2"), { tag: "QA_2-judge-CG-U1", n: 1, kind: "export" });
  assert.equal(UL.parseRawName("QA_2-judge-CG-U1.try1.stderr", "QA_2"), null);
  assert.equal(UL.parseRawName("QA_2-judge-CG-U1.try1.export.stderr", "QA_2"), null);
  assert.equal(UL.parseRawName("TL_3-grouper.try1.sent", "QA_2"), null);
});

await check("rules: outcomeOfEvents (blocked, error, answer, no answer) and openUpdateOf", () => {
  assert.deepEqual(UL.outcomeOfEvents(events(EV_START, EV_TEXT, EV_BLOCK, EV_END)), { outcome: "blocked", detail: null });
  assert.deepEqual(UL.outcomeOfEvents(events(EV_START)), { outcome: "no-answer", detail: null });
  assert.deepEqual(UL.outcomeOfEvents(events(EV_START, EV_TEXT, EV_END)), { outcome: "answer", detail: null });
  const e = UL.outcomeOfEvents(events(EV_START, EV_ERR));
  assert.equal(e.outcome, "error");
  assert.equal(e.detail, "provider.rate-limit: Too many requests");
  // a broken line (a control character) is skipped
  assert.equal(UL.outcomeOfEvents("{broken\u0001\n" + events(EV_START, EV_BLOCK)).outcome, "blocked");
  const open = UL.openUpdateOf([startRow, ...HIST_BASE.slice(1), OPEN_ROW]);
  assert.equal(open.box, "QA_2");
  assert.equal(open.page, PAGE);
  assert.equal(open.startedEpoch, NOW - 790);
  assert.deepEqual(open.pages, [PAGE, `${ART}/p003`]);
  // ended: none; a start row resets
  assert.equal(UL.openUpdateOf([...HIST_BASE, OPEN_ROW, { utc: iso(NOW - 10), event: "update-point-ended", box: "QA_2", result: "rewrite live" }]), null);
  assert.equal(UL.openUpdateOf([...HIST_BASE, OPEN_ROW, startRow]), null);
  assert.equal(UL.rowsOfTail('{"a":1}\nnot json\n{"event":"x"}\n', true).length, 1);
  assert.equal(UL.rowsOfTail('{"a":1}\nnot json\n{"event":"x"}\n', false).length, 2);
});

await check("rules: runningUpdateOf reads the key of TR93 with the names of the brief, and ignores what it does not know", () => {
  const full = UL.runningUpdateOf({
    page: PAGE, box: "QA_2", role: "prompt-audit-judge", role_n: 4, roles: 4, tag: "QA_2-audit-try1", try: 1, card: "claude-7f6d8610", started_utc: iso(NOW - 790), try_started_utc: iso(NOW - 120), future_field: { a: 1 },
  });
  assert.deepEqual(full, { page: PAGE, box: "QA_2", role: "prompt-audit-judge", roleN: 4, roles: 4, tag: "QA_2-audit-try1", tryN: 1, card: "claude-7f6d8610", startedEpoch: NOW - 790, tryStartedEpoch: NOW - 120 });
  // the number and the role come from the tag when the key leaves them out
  const fromTag = UL.runningUpdateOf({ box: "TL_1", tag: "TL_1-judge-CG-2", try: 3 });
  assert.equal(fromTag.role, "critique-group-check-judge");
  assert.equal(fromTag.roleN, 2);
  assert.equal(fromTag.tryN, 3);
  assert.equal(UL.runningUpdateOf({ box: "TL_1", card: "uonlp" }).card, "claude-aade7ca8");
  for (const bad of [null, undefined, "text", 5, [], {}, { box: "" }, { page: PAGE }]) assert.equal(UL.runningUpdateOf(bad), null, JSON.stringify(bad));
  assert.equal(UL.runningUpdateOf({ box: "TL_1", try: "x", role_n: -3, started_utc: "nope" }).tryN, null);
});

await check("wait: a content filter wait gets its own words, a quota wait keeps its words, an unknown extra field breaks nothing", () => {
  const key = { reason: "content filter", page: PAGE, box: "QA_2", since_utc: iso(NOW - 300), until_utc: iso(NOW + 1500), wait_s: 1800, source: "step", cards: ["claude-028c2ffe"], calls: 1 };
  const wait = (extra, base2 = key) => {
    const v = { ...base2, ...extra };
    return WR.waitTexts(WT.waitOf(v), WR.waitExtraOf(v), NOW);
  };
  const t = wait({ role: "prompt-rewrite-optimizer", role_n: 3, wait_n: 1, wait_of: 4 });
  assert.equal(t.main, "Content filter wait 1 of 4: the next try starts at 20:55 PST.");
  assert.equal(t.detail, "Wait started 20:25 PST at p004, box QA_2. Role 3 of 4 prompt-rewrite-optimizer (writes the new prompt).");
  // other likely names of the fields
  assert.equal(wait({ wait_no: 2, max_waits: 4, update_role: "prompt-audit-judge" }).main, "Content filter wait 2 of 4: the next try starts at 20:55 PST.");
  assert.ok(wait({ wait_no: 2, max_waits: 4, update_role: "prompt-audit-judge" }).detail.endsWith("Role 4 of 4 prompt-audit-judge (checks the new prompt)."));
  // no extra fields: the words stay, the numbers go
  assert.equal(wait({}).main, "Content filter wait: the next try starts at 20:55 PST.");
  assert.equal(wait({}).detail, "Wait started 20:25 PST at p004, box QA_2.");
  // an end time in the past
  assert.equal(WR.waitTexts(WT.waitOf({ ...key, until_utc: iso(NOW - 5) }), null, NOW).main, "Content filter wait: the planned end, 20:29 PST, is past. The next try starts at once.");
  // the reason in another spelling
  assert.ok(WR.isContentFilter(WT.waitOf({ ...key, reason: "Content-Filter" })));
  assert.ok(!WR.isContentFilter(WT.waitOf({ ...key, reason: "usage limit" })));
  // a quota wait: the same two lines as before VW103, with or without extra fields
  const quota = { reason: "usage limit", page: "article_a/p057", box: "TL_1", since_utc: iso(NOW - 300), until_utc: iso(NOW + 1500), wait_s: 1800, source: "usage file", cards: ["claude-028c2ffe", "claude-7f6d8610", "claude-aade7ca8"], calls: 2 };
  const before = WT.waitText(WT.waitOf(quota), NOW);
  assert.equal(before.main, "Waiting for the usage limit until 20:55 PST (all 3 cards).");
  for (const extra of [{}, { role: "prompt-rewrite-optimizer", wait_n: 1, wait_of: 4, new_field: [1, 2, 3] }, { role: 5, wait_n: "x", wait_of: null }]) {
    assert.deepEqual(WR.waitTexts(WT.waitOf({ ...quota, ...extra }), WR.waitExtraOf({ ...quota, ...extra }), NOW), before);
  }
  assert.equal(WR.waitExtraOf(null), null);
  assert.equal(WR.waitExtraOf("x"), null);
});

// ---------------------------------------------------------------- part 2: the loaders on made-up data folders

await check("folder rule: the running role, its try and its card, the earlier try blocked by the content filter, the times (the case of the brief)", async () => {
  const v = await view();
  assert.equal(v.key, "running");
  const u = v.update;
  assert.ok(u, "update");
  assert.equal(u.source, "folder");
  assert.deepEqual(
    { page: u.page, box: u.box, role: u.role, roleN: u.roleN, roles: u.roles, tag: u.tag, tryN: u.tryN, card: u.card, cardFromRule: u.cardFromRule, between: u.between, parallel: u.parallel, round: u.round, group: u.group },
    { page: PAGE, box: "QA_2", role: "prompt-rewrite-optimizer", roleN: 3, roles: 4, tag: "QA_2-optimizer-try1", tryN: 2, card: "claude-aade7ca8", cardFromRule: true, between: false, parallel: 0, round: 1, group: null },
  );
  assert.equal(u.startedEpoch, NOW - 790);
  assert.equal(u.tryStartedEpoch, NOW - 492);
  assert.equal(Math.round(u.quietSeconds), 20);
  assert.equal(u.earlier.length, 1, "the old try 3 of an earlier run does not show");
  assert.deepEqual({ ...u.earlier[0], startEpoch: undefined, endEpoch: undefined }, { n: 1, card: "claude-028c2ffe", byRule: true, startEpoch: undefined, endEpoch: undefined, outcome: "blocked", detail: null });
  assert.equal(u.earlier[0].endEpoch - u.earlier[0].startEpoch, 21);
  const lines = UL.updateLines(u, NOW, { pageLabel: "Made-up article one, page 4 of 5 (c0ffee01/p004)", place: "row", withWait: false });
  assert.deepEqual(lines.map((l) => l.key), ["update-now", "update-times", "update-try-1", "update-card-note"]);
  assert.equal(lineText(lines, "update-now"), FULL_ROW);
  assert.equal(lineText(lines, "update-times"), "Update point of box QA_2 started 20:16 PST (13 min 10 s ago). This try started 20:21 PST.");
  assert.equal(lineText(lines, "update-try-1"), "Try 1 on Claude card ntngh: blocked by the content filter after 21 s.");
  assert.equal(lineText(lines, "update-card-note"), "Card names follow the card order of the Translator (ntngh, uonlp, ngotr): try 1 uses the card of the model, each next try uses the next card.");
  // the step view words: the same pieces, no lead (the component adds the pill "Working now")
  assert.equal(lineText(UL.updateLines(u, NOW, { pageLabel: null, place: "step", withWait: true }), "update-now"), "role 3 of 4 prompt-rewrite-optimizer (writes the new prompt) · try 2 on Claude card uonlp · 8 min 12 s");
  assert.equal(UL.updateSummaryText(u, NOW), "prompt update of box QA_2 · role 3 of 4 prompt-rewrite-optimizer (writes the new prompt) · try 2 on Claude card uonlp · 8 min 12 s");
  // the view stays JSON-safe
  assert.deepEqual(JSON.parse(JSON.stringify(v)), v);
});

await check("folder rule: a hung try shows how long it wrote no output", async () => {
  const raw = [...RAW_BASE, ...TRY1_BLOCKED.map(([n, t, a]) => [n, t, a + 120]), ...runningTry("QA_2-optimizer-try1", 2, 612, 605)];
  // The old try 1 must still end where try 2 starts (try 1 ends at age 492 + 120 = 612).
  const v = await view({ raw });
  const u = v.update;
  assert.equal(u.tryN, 2);
  assert.equal(Math.round(u.quietSeconds), 605);
  const lines = UL.updateLines(u, NOW, { pageLabel: null, place: "row", withWait: false });
  assert.equal(lineText(lines, "update-quiet"), "No new output from this try for 10 min 5 s.");
  assert.ok(lineText(lines, "update-now").endsWith("try 2 on Claude card uonlp · 10 min 12 s"));
  // a try with a recent event shows no such line
  const fresh = UL.updateLines((await view()).update, NOW, { pageLabel: null, place: "row", withWait: false });
  assert.equal(lineText(fresh, "update-quiet"), undefined);
  assert.equal(UL.QUIET_AFTER_S, 300);
  // a try that wrote no event at all: the start of the try counts
  const none = await view({ raw: [...RAW_BASE, [`QA_2-optimizer-try1.try1.sent`, "made-up message", 400]] });
  assert.equal(Math.round(none.update.quietSeconds), 400);
});

await check("folder rule: finished tries show their outcome in short words (blocked, error, no answer, answer not accepted)", async () => {
  const raw = [
    ...RAW_BASE,
    ...fin("QA_2-optimizer-try1", 1, 700, 680, events(EV_START, EV_TEXT, EV_BLOCK, EV_END)),
    ...fin("QA_2-optimizer-try1", 2, 680, 660, events(EV_START, EV_ERR)),
    ...fin("QA_2-optimizer-try1", 3, 660, 60, events(EV_START)), // the hung try: 10 min with no answer
    ...fin("QA_2-optimizer-try1", 4, 60, 30, events(EV_START, EV_TEXT, EV_END)),
    ...runningTry("QA_2-optimizer-try1", 5, 30, 10),
  ];
  const u = (await view({ raw })).update;
  assert.equal(u.tryN, 5);
  assert.equal(u.card, "claude-aade7ca8"); // (0 + 5 - 1) % 3 = 1
  const t = UL.updateLines(u, NOW, { pageLabel: null, place: "row", withWait: false }).filter((l) => l.key.startsWith("update-try-")).map((l) => l.text);
  assert.deepEqual(t, [
    "Try 1 on Claude card ntngh: blocked by the content filter after 20 s.",
    "Try 2 on Claude card uonlp: error: provider.rate-limit: Too many requests after 20 s.",
    "Try 3 on Claude card ngotr: no answer after 10 min 0 s.",
    "Try 4 on Claude card ntngh: answer not accepted after 30 s.",
  ]);
});

await check("folder rule: no card is invented when no role of this run is known", async () => {
  // no earlier update point and no row of the role: the try shows without a card, and no card note shows
  const u = (await view({ history: [startRow, doneRow(PAGE, "2026-11-14T04:10:00Z"), OPEN_ROW], calls3: [], calls: [], raw: runningTry("QA_2-grouper", 1, 40, 5) })).update;
  assert.equal(u.role, "critique-grouper");
  assert.equal(u.roleN, 1);
  assert.equal(u.card, null);
  const lines = UL.updateLines(u, NOW, { pageLabel: null, place: "row", withWait: false });
  assert.equal(lineText(lines, "update-now"), "Now: update point · box QA_2 · role 1 of 4 critique-grouper (groups the critiques of the box) · try 1 · 40 s");
  assert.ok(!lines.some((l) => l.key === "update-card-note"));
});

await check("folder rule: judge group, round 2 of the optimizer, two calls at once", async () => {
  const j = (await view({ raw: [...RAW_BASE.slice(0, 3), ...runningTry("QA_2-judge-CG-U1", 1, 30, 4), ...runningTry("QA_2-judge-CG-U2", 1, 12, 3)] })).update;
  assert.equal(j.tag, "QA_2-judge-CG-U2", "the newest running try first");
  assert.equal(j.parallel, 1);
  assert.equal(UL.roleText(j), "role 2 of 4 critique-group-check-judge (checks one critique group, group CG-U2)");
  assert.equal(lineText(UL.updateLines(j, NOW, { pageLabel: null, place: "row", withWait: false }), "update-parallel"), "1 more call runs at the same time.");
  const o2 = (await view({ raw: [...RAW_BASE.slice(0, 6), ...runningTry("QA_2-optimizer-try2", 1, 50, 5)] })).update;
  assert.equal(o2.round, 2);
  assert.equal(UL.roleText(o2), "role 3 of 4 prompt-rewrite-optimizer (writes the new prompt, round 2 after an audit REJECT)");
  const a2 = (await view({ raw: [...RAW_BASE.slice(0, 6), ...runningTry("QA_2-audit-try2", 1, 50, 5)] })).update;
  assert.equal(UL.roleText(a2), "role 4 of 4 prompt-audit-judge (checks the new prompt, round 2)");
});

await check("folder rule: between two calls (the call has no next try yet, or the whole call ended)", async () => {
  // try 1 ended blocked, the call did not end, no try 2 yet (the wait of the content filter)
  const b = (await view({ raw: [...RAW_BASE, ...TRY1_BLOCKED] })).update;
  assert.equal(b.between, true);
  assert.equal(b.tryN, 2);
  assert.equal(b.card, null);
  const lines = UL.updateLines(b, NOW, { pageLabel: null, place: "row", withWait: false });
  assert.equal(lineText(lines, "update-now"), "Now: update point · box QA_2 · no call runs at this moment · role 3 of 4 prompt-rewrite-optimizer (writes the new prompt), try 1 ended, try 2 comes next");
  assert.equal(lineText(lines, "update-try-1"), "Try 1 on Claude card ntngh: blocked by the content filter after 21 s.");
  assert.equal(lineText(lines, "update-times"), "Update point of box QA_2 started 20:16 PST (13 min 10 s ago).");
  // the whole call ended (a row in calls.jsonl) and its last try wrote no .export.json: the try does not run, and its tries are no news
  const ended = (await view({ raw: [...RAW_BASE, ...fin("QA_2-optimizer-try1", 1, 100, 60, events(EV_START, EV_TEXT, EV_END)).slice(0, 2)], calls: [...CALLS_P4, crow("QA_2-optimizer-try1", ROLES[2], iso(NOW - 100))] })).update;
  assert.equal(ended.between, true);
  assert.equal(ended.tryN, null);
  assert.deepEqual(ended.earlier, []);
  assert.equal(lineText(UL.updateLines(ended, NOW, { pageLabel: null, place: "row", withWait: false }), "update-now"), "Now: update point · box QA_2 · no call runs at this moment · last call: role 3 of 4 prompt-rewrite-optimizer (writes the new prompt)");
  // nothing started yet
  const first = (await view({ raw: [], calls: [] })).update;
  assert.equal(first.between, true);
  assert.equal(lineText(UL.updateLines(first, NOW, { pageLabel: null, place: "row", withWait: false }), "update-now"), "Now: update point · box QA_2 · no call runs at this moment · the first call has not started yet");
});

await check("folder rule: a re-run of the same names (an old .export.json that is older than the new .sent file) and an old calls.jsonl row do not hide the running try", async () => {
  const raw = [...RAW_BASE.slice(0, 6), ["QA_2-optimizer-try1.try1.sent", "made-up", 100], ["QA_2-optimizer-try1.try1.jsonl", events(EV_START), 90], ["QA_2-optimizer-try1.try1.export.json", "{}", 5000]];
  const calls = [...CALLS_P4, crow("QA_2-optimizer-try1", ROLES[2], "2026-11-14T01:00:00Z", "claude-028c2ffe", { ok: false })];
  const u = (await view({ raw, calls })).update;
  assert.equal(u.between, false);
  assert.equal(u.tryN, 1);
  assert.equal(u.card, "claude-028c2ffe");
  assert.deepEqual(u.earlier, []);
});

await check("status key: running_update present wins (fields, card, no card note), absent uses the folder, null means no update point", async () => {
  const ru = { page: PAGE, box: "QA_2", role: "prompt-audit-judge", role_n: 4, roles: 4, tag: "QA_2-audit-try1", try: 1, card: "claude-7f6d8610", started_utc: iso(NOW - 790), try_started_utc: iso(NOW - 120) };
  const u = (await view({ status: { running_update: ru }, raw: [...RAW_BASE, ...TRY1_BLOCKED, ...runningTry("QA_2-audit-try1", 1, 120, 30)] })).update;
  assert.equal(u.source, "status");
  assert.deepEqual({ role: u.role, roleN: u.roleN, tryN: u.tryN, card: u.card, cardFromRule: u.cardFromRule, between: u.between, tryStartedEpoch: u.tryStartedEpoch }, { role: "prompt-audit-judge", roleN: 4, tryN: 1, card: "claude-7f6d8610", cardFromRule: true === false, between: false, tryStartedEpoch: NOW - 120 });
  const lines = UL.updateLines(u, NOW, { pageLabel: "Made-up article one, page 4 of 5 (c0ffee01/p004)", place: "row", withWait: false });
  assert.equal(lineText(lines, "update-now"), "Now: update point after Made-up article one, page 4 of 5 (c0ffee01/p004) · box QA_2 · role 4 of 4 prompt-audit-judge (checks the new prompt) · try 1 on Claude card ngotr · 2 min 0 s");
  assert.equal(lineText(lines, "update-times"), "Update point of box QA_2 started 20:16 PST (13 min 10 s ago). This try started 20:28 PST.");
  assert.ok(!lines.some((l) => l.key === "update-card-note" || l.key.startsWith("update-try-")), "the card is a field of the run, and no earlier try of this call exists");
  // the field wins over the folder: the folder says that role 3 runs, the key says role 4
  const folderOnly = (await view({ raw: [...RAW_BASE, ...TRY1_BLOCKED, ...runningTry("QA_2-audit-try1", 1, 120, 30), ...runningTry("QA_2-optimizer-try1", 2, 492, 20)] })).update;
  assert.equal(folderOnly.source, "folder");
  assert.equal(folderOnly.tag, "QA_2-audit-try1");
  // a key with a short card name, a key with only the box, a key with the start time left out (the history gives it)
  assert.equal((await view({ status: { running_update: { ...ru, card: "uonlp" } } })).update.card, "claude-aade7ca8");
  const min = (await view({ status: { running_update: { box: "QA_2" } } })).update;
  assert.equal(min.source, "status");
  assert.equal(min.page, PAGE, "the page comes from the history row of the same box");
  assert.equal(min.startedEpoch, NOW - 790);
  assert.equal(lineText(UL.updateLines(min, NOW, { pageLabel: null, place: "row", withWait: false }), "update-now"), "Now: update point · box QA_2 · 13 min 10 s since the update point started");
  // null: no update point, although history.jsonl holds an open one
  assert.equal((await view({ status: { running_update: null } })).update, null);
  assert.equal((await view({ status: { running_update: "text" } })).update, null);
  // absent and no open update point in history.jsonl
  assert.equal((await view({ history: HIST_BASE })).update, null);
  assert.equal((await view({ history: [...HIST_OPEN, { utc: iso(NOW - 3), event: "update-point-ended", box: "QA_2", result: "rewrite live" }] })).update, null);
  // the process does not run: no update point (loadPhase2 reads it only for the state Running)
  await scene({ status: { state: "stopped", stop_reason: "ctrl-c" } });
  assert.equal((await loadPhase2(root, NOW_MS, () => false)).update, null);
});

await check("wait: the key waiting of a content filter wait shows in the row, and an update point of a quota wait keeps its words", async () => {
  const cf = { reason: "content filter", page: PAGE, box: "QA_2", since_utc: iso(NOW - 300), until_utc: iso(NOW + 1500), wait_s: 1800, source: "step", cards: ["claude-028c2ffe"], calls: 1, role: "prompt-rewrite-optimizer", role_n: 3, wait_n: 1, wait_of: 4 };
  const v = await view({ status: { waiting: cf }, raw: [...RAW_BASE, ...TRY1_BLOCKED] });
  const t = P.phase2Text(v, NOW);
  assert.equal(lineText(t.lines, "waiting"), "Content filter wait 1 of 4: the next try starts at 20:55 PST.");
  assert.equal(lineText(t.lines, "waiting-detail"), "Wait started 20:25 PST at p004, box QA_2. Role 3 of 4 prompt-rewrite-optimizer (writes the new prompt).");
  assert.equal(v.waiting.reason, "content filter");
  assert.equal(v.waitExtra.n, 1);
  // the update point holds the wait too, for the step view
  assert.equal(v.update.wait.untilEpoch, NOW + 1500);
  const stepLines = UL.updateLines(v.update, NOW, { pageLabel: null, place: "step", withWait: true });
  assert.equal(lineText(stepLines, "waiting"), "Content filter wait 1 of 4: the next try starts at 20:55 PST.");
  assert.ok(stepLines.map((l) => l.key).includes("waiting-detail"));
  // the row does not show the wait twice
  const rowLines = UL.updateLines(v.update, NOW, { pageLabel: null, place: "row", withWait: false });
  assert.ok(!rowLines.some((l) => l.key === "waiting"));
});

// The two exact shapes that the Translator unit TR93 writes into status.json (message of aki-main, 2026-11-13 20:39 PST). Made-up article ID in place of the real one.
const TR93_RUNNING_UPDATE = {
  page: PAGE, box: "QA_2", role: "prompt-rewrite-optimizer", role_n: 3, roles: 4, tag: "QA_2-optimizer-try1", try: 2, card: "claude-aade7ca8", started_utc: iso(NOW - 790), try_started_utc: iso(NOW - 492),
};
const TR93_WAITING = {
  reason: "content filter", page: PAGE, box: "QA_2", since_utc: iso(NOW - 300), until_utc: iso(NOW + 1500), wait_s: 1800.0, source: "content filter rule",
  cards: ["claude-028c2ffe", "claude-aade7ca8", "claude-7f6d8610"], role: "prompt-rewrite-optimizer", tag: "QA_2-optimizer-try1", wait_n: 1, waits: 4, calls: 1,
};
const BLOCK3 = [
  ...fin("QA_2-optimizer-try1", 1, 740, 700, events(EV_START, EV_BLOCK, EV_END)),
  ...fin("QA_2-optimizer-try1", 2, 690, 600, events(EV_START, EV_BLOCK, EV_END)),
  ...fin("QA_2-optimizer-try1", 3, 560, 300, events(EV_START, EV_BLOCK, EV_END)),
];

await check("TR93 shape of running_update: the field wins (card, try up to 7, card null), the card order rule stays out, the earlier tries show no card", async () => {
  const raw2 = [...RAW_BASE, ...TRY1_BLOCKED, ...runningTry("QA_2-optimizer-try1", 2, 492, 20)];
  const v = await view({ status: { running_update: TR93_RUNNING_UPDATE }, raw: raw2 });
  const u = v.update;
  assert.equal(u.source, "status");
  assert.deepEqual({ page: u.page, box: u.box, role: u.role, roleN: u.roleN, roles: u.roles, tag: u.tag, tryN: u.tryN, card: u.card, cardFromRule: u.cardFromRule, between: u.between, filterWait: u.filterWait },
    { page: PAGE, box: "QA_2", role: "prompt-rewrite-optimizer", roleN: 3, roles: 4, tag: "QA_2-optimizer-try1", tryN: 2, card: "claude-aade7ca8", cardFromRule: false, between: false, filterWait: false });
  assert.equal(u.startedEpoch, NOW - 790);
  assert.equal(u.tryStartedEpoch, NOW - 492);
  const articles = await loadPhase2Articles(root, lists, true);
  const html = h(Phase2Row, { view: v, now: NOW, articles });
  assert.equal(rowItem(html, "update-now"), FULL_ROW, "the same words as the folder rule");
  assert.equal(rowItem(html, "update-times"), "Update point of box QA_2 started 20:16 PST (13 min 10 s ago). This try started 20:21 PST.");
  // the cards of the earlier tries are not stored while the call runs, so the line names none (TR93 skips a card whose usage window is full)
  assert.equal(rowItem(html, "update-try-1"), "Try 1: blocked by the content filter after 21 s.");
  assert.equal(rowItem(html, "update-card-note"), null);
  // the files of the folder add the quiet time of the try that the key names (a hung try, 5 min and more with no output)
  assert.equal(Math.round(u.quietSeconds), 20);
  assert.equal(rowItem(html, "update-quiet"), null);
  const hung = (await view({ status: { running_update: TR93_RUNNING_UPDATE }, raw: [...RAW_BASE, ...TRY1_BLOCKED, ...runningTry("QA_2-optimizer-try1", 2, 492, 400)] })).update;
  assert.equal(lineText(UL.updateLines(hung, NOW, { pageLabel: null, place: "step", withWait: false }), "update-quiet"), "No new output from this try for 6 min 40 s.");
  // card null (a model that has no card): no card words, no rule
  const noCard = (await view({ status: { running_update: { ...TR93_RUNNING_UPDATE, card: null } }, raw: raw2 })).update;
  assert.equal(noCard.card, null);
  assert.equal(lineText(UL.updateLines(noCard, NOW, { pageLabel: null, place: "step", withWait: false }), "update-now"), "role 3 of 4 prompt-rewrite-optimizer (writes the new prompt) · try 2 · 8 min 12 s");
  assert.ok(!UL.updateLines(noCard, NOW, { pageLabel: null, place: "step", withWait: false }).some((l) => l.key === "update-card-note"));
  // try 7 (3 tries, then 4 more after the waits) on the third card
  const t7 = (await view({ status: { running_update: { ...TR93_RUNNING_UPDATE, try: 7, card: "claude-7f6d8610" } }, raw: [...RAW_BASE, ...TRY1_BLOCKED, ...runningTry("QA_2-optimizer-try1", 7, 492, 20)] })).update;
  assert.equal(t7.tryN, 7);
  assert.equal(lineText(UL.updateLines(t7, NOW, { pageLabel: null, place: "step", withWait: false }), "update-now"), "role 3 of 4 prompt-rewrite-optimizer (writes the new prompt) · try 7 on Claude card ngotr · 8 min 12 s");
  // the step summary carries the same update
  await scene({ status: { running_update: TR93_RUNNING_UPDATE }, raw: raw2 });
  const sum2 = await loadStepSummary(root, null, new Set());
  assert.equal(sum2.updateLive.source, "status");
  assert.equal(sum2.updateLive.card, "claude-aade7ca8");
  assert.equal(UL.updateSummaryText(sum2.updateLive, NOW), "prompt update of box QA_2 · role 3 of 4 prompt-rewrite-optimizer (writes the new prompt) · try 2 on Claude card uonlp · 8 min 12 s");
});

await check("TR93 shape of waiting: reason, role, box, wait_n, waits and until_utc give the text, source \"content filter rule\" breaks nothing, the call waits for its next try", async () => {
  // the quota reader maps the new source to null (it knows 3 sources); the content filter text does not use the source
  const wait = WT.waitOf(TR93_WAITING);
  assert.equal(wait.source, null);
  assert.equal(wait.reason, "content filter");
  assert.equal(wait.page, "p004");
  assert.equal(wait.untilEpoch, NOW + 1500);
  assert.equal(wait.calls, 1);
  assert.deepEqual(WR.waitExtraOf(TR93_WAITING), { n: 1, of: 4, role: "prompt-rewrite-optimizer", roleN: 3 });
  const t = WR.waitTexts(wait, WR.waitExtraOf(TR93_WAITING), NOW);
  assert.equal(t.main, "Content filter wait 1 of 4: the next try starts at 20:55 PST.");
  assert.equal(t.detail, "Wait started 20:25 PST at p004, box QA_2. Role 3 of 4 prompt-rewrite-optimizer (writes the new prompt).");
  // both keys at once: running_update (try 3 ended, the wait started) and waiting
  const status = { running_update: { ...TR93_RUNNING_UPDATE, try: 3 }, waiting: TR93_WAITING };
  const v = await view({ status, raw: [...RAW_BASE, ...BLOCK3] });
  const u = v.update;
  assert.equal(u.source, "status");
  assert.equal(u.filterWait, true);
  assert.equal(u.between, true);
  assert.equal(u.tryN, null, "the try number of the key is not shown during the wait");
  const articles = await loadPhase2Articles(root, lists, true);
  const html = h(Phase2Row, { view: v, now: NOW, articles });
  assert.equal(rowItem(html, "update-now"), "Now: update point after Made-up article one, page 4 of 5 (c0ffee01/p004) · box QA_2 · no call runs at this moment · role 3 of 4 prompt-rewrite-optimizer (writes the new prompt), the next try starts after the content filter wait");
  assert.equal(rowItem(html, "update-times"), "Update point of box QA_2 started 20:16 PST (13 min 10 s ago).");
  assert.equal(rowItem(html, "update-try-1"), "Try 1: blocked by the content filter after 40 s.");
  assert.equal(rowItem(html, "update-try-2"), "Try 2: blocked by the content filter after 1 min 30 s.");
  assert.equal(rowItem(html, "update-try-3"), "Try 3: blocked by the content filter after 4 min 20 s.");
  assert.equal(rowItem(html, "waiting"), "Content filter wait 1 of 4: the next try starts at 20:55 PST.");
  assert.equal(rowItem(html, "waiting-detail"), "Wait started 20:25 PST at p004, box QA_2. Role 3 of 4 prompt-rewrite-optimizer (writes the new prompt).");
  const keys = [...unBox(html).matchAll(/data-phase2-item="([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(keys.indexOf("update-now") < keys.indexOf("waiting") && keys.indexOf("waiting") < keys.indexOf("alive"), keys.join(","));
  // the step view lines carry the same wait
  const stepLines = UL.updateLines(u, NOW, { pageLabel: null, place: "step", withWait: true });
  assert.equal(lineText(stepLines, "update-now"), "no call runs at this moment · role 3 of 4 prompt-rewrite-optimizer (writes the new prompt), the next try starts after the content filter wait");
  assert.equal(lineText(stepLines, "waiting"), "Content filter wait 1 of 4: the next try starts at 20:55 PST.");
  // the wait of another box, a wait that is past, and a quota wait do not stop the try of this update point
  for (const other of [{ ...TR93_WAITING, box: "TL_1" }, { ...TR93_WAITING, until_utc: iso(NOW - 5) }, { ...TR93_WAITING, reason: "usage limit", source: "usage file" }]) {
    const o = (await view({ status: { running_update: TR93_RUNNING_UPDATE, waiting: other }, raw: [...RAW_BASE, ...TRY1_BLOCKED, ...runningTry("QA_2-optimizer-try1", 2, 492, 20)] })).update;
    assert.equal(o.filterWait, false, JSON.stringify(other));
    assert.equal(o.tryN, 2);
    assert.equal(o.between, false);
  }
  // a wait of the right box with no running_update key: the folder rule gives the same words about the next try, and filterWait is true
  const folder = (await view({ status: { waiting: TR93_WAITING }, raw: [...RAW_BASE, ...BLOCK3] })).update;
  assert.equal(folder.source, "folder");
  assert.equal(folder.filterWait, true);
  assert.equal(folder.between, true);
  assert.equal(folder.tryN, 4);
  // the quota wait text stays as before VW103 when the new fields are there
  const quota = { ...TR93_WAITING, reason: "usage limit", source: "usage file", wait_n: 1, waits: 4 };
  assert.equal(WR.waitTexts(WT.waitOf(quota), WR.waitExtraOf(quota), NOW).main, "Waiting for the usage limit until 20:55 PST (all 3 cards).");
});

await check("history events of a content filter wait get plain words (filter-wait, filter-wait-ended, filter-wait-stopped)", () => {
  const order = [`${ART}/p001`, `${ART}/p002`, `${ART}/p003`, `${ART}/p004`, `${ART}/p005`];
  const names = new Map();
  assert.equal(A.eventText({ event: "filter-wait", box: "QA_2" }, order, names), "filter-wait (content filter wait started at box QA_2)");
  assert.match(A.eventText({ event: "filter-wait", box: "QA_2", page: PAGE, wait_n: 1, waits: 4 }, order, names), /^filter-wait \(content filter wait 1 of 4 started at box QA_2, .*p004.*\)$/);
  assert.equal(A.eventText({ event: "filter-wait-ended", box: "QA_2" }, order, names), "filter-wait-ended (content filter wait ended at box QA_2: the next try starts)");
  assert.equal(A.eventText({ event: "filter-wait-stopped", box: "QA_2" }, order, names), "filter-wait-stopped (content filter wait stopped early at box QA_2: Ctrl-C or the PAUSE file)");
  assert.equal(A.eventText({ event: "filter-wait-stopped" }, order, names), "filter-wait-stopped (content filter wait stopped early: Ctrl-C or the PAUSE file)");
  assert.equal(A.eventText({ event: "update-point-started", box: "QA_2" }, order, names).startsWith("update-point-started (prompt update of box QA_2 started"), true);
});

await check("row: while a page runs, the text stays and the article title shows (Q-A 3:17.4)", async () => {
  await scene({ status: { running_page: `${ART}/p005`, running_boxes: ["TL_2"], last_accepted_page: PAGE }, history: HIST_BASE });
  const v = await loadPhase2(root, NOW_MS, alive);
  assert.equal(v.update, null);
  const articles = await loadPhase2Articles(root, lists, true);
  const html = h(Phase2Row, { view: v, now: NOW, articles });
  assert.equal(rowItem(html, "now"), "Now: Made-up article one, page 5 of 5 (c0ffee01/p005), box TL_2.");
  assert.equal(rowItem(html, "update-now"), null);
  assert.ok(plain(html).includes("Made-up article one"));
  assert.match(rowItem(html, "last-accepted"), /Last accepted page: Made-up article one, page 4 of 5 \(c0ffee01\/p004\)/);
});

await check("row component: the update point shows as list items after the progress line, with the title, the box code hover and the tries", async () => {
  const v = await view();
  const articles = await loadPhase2Articles(root, lists, true);
  const html = h(Phase2Row, { view: v, now: NOW, articles });
  assert.equal(rowItem(html, "update-now"), FULL_ROW);
  assert.equal(rowItem(html, "update-times"), "Update point of box QA_2 started 20:16 PST (13 min 10 s ago). This try started 20:21 PST.");
  assert.equal(rowItem(html, "update-try-1"), "Try 1 on Claude card ntngh: blocked by the content filter after 21 s.");
  const keys = [...unBox(html).matchAll(/data-phase2-item="([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(keys.indexOf("progress") < keys.indexOf("update-now") && keys.indexOf("update-now") < keys.indexOf("alive") && keys.indexOf("alive") < keys.indexOf("last-accepted"), keys.join(","));
  // the box code keeps its code and has a hover (Q-A 3:18.5)
  assert.match(html, /data-box-code="QA_2" title="QA_2: /);
  // the token line stays in the rule "Tokens: input ... cache write ..." of the row (Q-A 3:20.2)
  assert.ok(rowItem(html, "tokens").startsWith("Tokens: input 100 · output 200"));
  // no error color, no new color class
  assert.ok(!html.includes("text-red-700"));
  // without the list of the run, the page ID stands in place of the title
  const noList = h(Phase2Row, { view: v, now: NOW, articles: null });
  assert.ok(rowItem(noList, "update-now").startsWith("Now: update point after c0ffee01/p004 · box QA_2 · role 3 of 4"));
  // a view without the field (an answer of an older server) shows no update line
  const old = { ...v };
  delete old.update;
  delete old.waitExtra;
  assert.equal(rowItem(h(Phase2Row, { view: old, now: NOW, articles }), "update-now"), null);
  // a content filter wait in the same row
  const cf = await view({ status: { waiting: { reason: "content filter", page: PAGE, box: "QA_2", since_utc: iso(NOW - 300), until_utc: iso(NOW + 1500), wait_s: 1800, wait_n: 1, wait_of: 4 } }, raw: [...RAW_BASE, ...TRY1_BLOCKED] });
  const cfHtml = h(Phase2Row, { view: cf, now: NOW, articles });
  assert.equal(rowItem(cfHtml, "waiting"), "Content filter wait 1 of 4: the next try starts at 20:55 PST.");
  const cfKeys = [...unBox(cfHtml).matchAll(/data-phase2-item="([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(cfKeys.indexOf("update-now") < cfKeys.indexOf("waiting"), cfKeys.join(","));
});

await check("step view: the summary carries the running update point, its page opens by default, and the poll stays small", async () => {
  await scene({ status: { waiting: { reason: "content filter", page: PAGE, box: "QA_2", since_utc: iso(NOW - 300), until_utc: iso(NOW + 1500), wait_s: 1800, wait_n: 1, wait_of: 4, role: "prompt-rewrite-optimizer" } }, raw: [...RAW_BASE, ...TRY1_BLOCKED] });
  const closed = await loadStepSummary(root, null, new Set());
  assert.equal(closed.error, null);
  assert.ok(closed.updateLive, "updateLive");
  assert.equal(closed.updateLive.box, "QA_2");
  assert.equal(closed.updateLive.page, PAGE);
  const page = closed.pages.find((p) => p.pageId === PAGE);
  assert.ok(page, "the page of the update point is in the tree");
  assert.equal(page.state, "accepted");
  assert.equal(page.stepsShown, true, "the page of a running update point carries its steps although nobody opened it");
  const others = closed.pages.filter((p) => p.pageId !== PAGE);
  assert.ok(others.length > 0 && others.every((p) => p.stepsShown === false), "other closed pages stay light");
  const step = page.groups.find((g) => g.key === "update").steps.find((s) => s.id === "update:QA_2");
  assert.equal(step.state, "update-running");
  assert.equal(step.running, true);
  // the poll stays small: the live part is about 1 KB
  const size = JSON.stringify(closed.updateLive).length;
  assert.ok(size < 3000, `updateLive is ${size} bytes`);
  assert.ok(JSON.stringify(closed).length < 20_000, "the whole summary of 2 pages stays small");
  // a run that is not active has no live part
  await scene({ status: { state: "stopped", stop_reason: "ctrl-c" } });
  assert.equal((await loadStepSummary(root, null, new Set())).updateLive, null);
  // without an open update point: null, and the key is still there
  await scene({ history: HIST_BASE });
  assert.equal((await loadStepSummary(root, null, new Set())).updateLive, null);
});

await check("step view component: the page row, the step and the wait show the words of the row (light and dark use the same theme classes)", async () => {
  await scene({ status: { waiting: { reason: "content filter", page: PAGE, box: "QA_2", since_utc: iso(NOW - 300), until_utc: iso(NOW + 1500), wait_s: 1800, wait_n: 1, wait_of: 4, role: "prompt-rewrite-optimizer" } }, raw: [...RAW_BASE, ...TRY1_BLOCKED] });
  const sum = await loadStepSummary(root, null, new Set());
  // the step is running, the page is accepted. generatedEpoch is the clock of the screen.
  const summary = { ...sum, generatedEpoch: NOW };
  const html = h(StepTreeMod.StepTree, { summary, choices: {}, setChoice: () => {} });
  const t = plain(html);
  assert.ok(html.includes("data-page-update-now"));
  assert.match(t, /Working now: prompt update of box QA_2 · no call runs at this moment · role 3 of 4 prompt-rewrite-optimizer \(writes the new prompt\), try 1 ended, try 2 comes next/);
  assert.ok(html.includes("data-update-live"), "the step shows its live block");
  assert.ok(t.includes("Waiting: Content filter wait 1 of 4: the next try starts at 20:55 PST."), t);
  assert.ok(t.includes("Try 1 on Claude card ntngh: blocked by the content filter after 21 s."));
  assert.ok(t.includes("Working now"));
  // the pages of the tree that are not live have no such block
  assert.equal((html.match(/data-update-live="true"/g) ?? []).length, 1);
  // the running case: try 2 runs, the time moves with the clock of the screen
  await scene();
  const run = { ...(await loadStepSummary(root, null, new Set())), generatedEpoch: NOW };
  const html2 = h(StepTreeMod.StepTree, { summary: run, choices: {}, setChoice: () => {} });
  assert.ok(plain(html2).includes("Working now: role 3 of 4 prompt-rewrite-optimizer (writes the new prompt) · try 2 on Claude card uonlp · 8 min 12 s"));
  const later = { ...run, generatedEpoch: NOW + 60 };
  assert.ok(plain(h(StepTreeMod.StepTree, { summary: later, choices: {}, setChoice: () => {} })).includes("try 2 on Claude card uonlp · 9 min 12 s"));
  // the owner can close the page (a choice wins over the default)
  const shut = h(StepTreeMod.StepTree, { summary: run, choices: { [`page:${PAGE}`]: false }, setChoice: () => {} });
  assert.ok(shut.includes("data-page-update-now") && !shut.includes('data-update-live="true"'), "a closed page keeps its one line and hides the block");
  // a summary of an older server (no key) renders as before
  const old = { ...run };
  delete old.updateLive;
  assert.ok(!h(StepTreeMod.StepTree, { summary: old, choices: {}, setChoice: () => {} }).includes("data-page-update-now"));
  // the tab "Prompt updates" of the run view: the open entry shows the same block
  const pu = h(StepTreeMod.PromptUpdates, { updates: run.updates, choices: {}, setChoice: () => {}, tick: NOW, live: run.updateLive });
  assert.ok(pu.includes('data-update-live="true"'), "the entry of the running update point");
  assert.ok(plain(pu).includes("Working now: role 3 of 4 prompt-rewrite-optimizer"));
  assert.ok(!h(StepTreeMod.PromptUpdates, { updates: run.updates, choices: {}, setChoice: () => {}, tick: NOW }).includes('data-update-live="true"'));
  // the block alone
  assert.ok(plain(h(UpdateLiveBlock, { live: run.updateLive, now: NOW })).startsWith("Working now: role 3 of 4"));
});

await check("the loaders write no file", async () => {
  await scene();
  const before = await snapshot(root);
  await loadPhase2(root, NOW_MS, alive);
  await loadStepSummary(root, null, new Set());
  await loadUpdateLive(root, PHASE2_STORE, JSON.parse(readFileSync(path.join(root, STORE, "status.json"), "utf8")), NOW_MS);
  assert.deepEqual(await snapshot(root), before);
});

await check("a broken or unsafe folder gives no error: an unsafe page ID, a missing raw folder, a broken calls.jsonl, a broken history line", async () => {
  const s = JSON.parse(readFileSync(path.join(root, STORE, "status.json"), "utf8"));
  const odd = [
    { running_update: { box: "QA_2", page: "../x/p001" } },
    { running_update: { box: "QA_2", page: "c0ffee01/p404" } },
    { running_update: { box: "QA_9" } },
  ];
  for (const o of odd) {
    await scene({ status: o });
    const u = await loadUpdateLive(root, PHASE2_STORE, { ...s, ...o }, NOW_MS);
    assert.ok(u === null || typeof u === "object");
    if (u) assert.deepEqual(u.earlier, [], JSON.stringify(o));
  }
  await scene();
  await fs.writeFile(path.join(root, DIR, "calls.jsonl"), "{broken\n" + "\u0001\n");
  assert.ok((await loadPhase2(root, NOW_MS, alive)).update, "a broken calls.jsonl leaves the folder facts");
  await scene();
  await fs.appendFile(path.join(root, STORE, "history.jsonl"), '{"utc": "2026-11-14T04:29:00Z", "event": "x\u0001y"\n{broken\n');
  assert.equal((await loadPhase2(root, NOW_MS, alive)).update.box, "QA_2");
  assert.equal(await loadUpdateLive(root, PHASE2_STORE, null, NOW_MS), null);
});

// ---------------------------------------------------------------- part 3: rules of the project

await check("rules: no e-mail address, no cost field, no server-only import in the pure files, only theme colors, no real article ID", () => {
  const newFiles = ["lib/update-live.ts", "lib/update-live-load.ts", "lib/phase2-wait-reason.ts", "components/UpdateLiveBlock.tsx", "scripts/vw103-test.mjs"];
  const edited = ["lib/phase2-row.ts", "lib/phase2-load.ts", "lib/step-tree.ts", "lib/step-tree-load.ts", "components/Phase2Row.tsx", "components/StepTree.tsx", "components/StepView.tsx"];
  for (const f of [...newFiles, ...edited]) {
    const s = read(f);
    assert.ok(!/[A-Za-z0-9._+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(s), `${f}: no e-mail address`);
    assert.ok(!new RegExp("/" + "tmp\\b").test(strip(s).replace(/node_modules\/\.vw103-tmp/g, "")), `${f}: no temp folder of the system`);
  }
  for (const f of newFiles.filter((x) => x.startsWith("lib/") || x.startsWith("components/"))) assert.ok(!/cost_usd|costUsd|money\(|usd\(/.test(strip(read(f))), `${f}: no cost`);
  for (const f of ["lib/update-live.ts", "lib/phase2-wait-reason.ts"]) {
    const s = strip(read(f));
    assert.ok(!/server-only|node:fs|node:path/.test(s), `${f} is pure`);
    assert.ok(!/\b(enum|namespace)\b/.test(s), `${f}: erasable syntax only`);
  }
  assert.ok(read("lib/update-live-load.ts").startsWith('import "server-only";'));
  // classes: only theme variables of VW99 and the muted text color
  const cls = new Set();
  for (const m of read("components/UpdateLiveBlock.tsx").matchAll(/className="([^"]+)"/g)) for (const c of m[1].split(/\s+/)) cls.add(c);
  const allowed = new Set(["mt-0.5", "block", "text-xs", "text-muted", "rounded", "px-1", "bg-state-run", "text-state-run-ink", "bg-state-stop", "text-state-stop-ink"]);
  for (const c of cls) assert.ok(allowed.has(c), `class ${c} is not a theme class`);
  // the id check: the test names no 8-hex article ID of the real data
  const ids = new Set(read("scripts/vw103-test.mjs").match(/(?<!claude-)\b[0-9a-f]{8}\b/g) ?? []);
  for (const id of ids) assert.ok(/^c0ffee0[12]$/.test(id), `id ${id}`);
});

await check("rules: wiring (the old files call the new ones, and the contract of the old tests stays)", () => {
  assert.match(read("lib/phase2-load.ts"), /view\.update = await loadUpdateLive\(root, PHASE2_STORE,/);
  assert.match(read("lib/step-tree-load.ts"), /const live = runActive \? await loadUpdateLive\(root, store, status, t0\) : null;/);
  assert.match(read("lib/step-tree-load.ts"), /\|\| \(live !== null && live\.page === p\.page\)/);
  assert.equal((read("lib/step-tree-load.ts").match(/updateLive: live/g) ?? []).length, 2, "phase 2 and book answer");
  assert.match(read("lib/phase2-row.ts"), /waitTexts\(v\.waiting, v\.waitExtra, now\)/);
  assert.match(read("components/Phase2Row.tsx"), /updateLines\(view\.update, now,/);
  // the one place of the words and of the card names
  assert.match(read("lib/phase2-wait-reason.ts"), /import \{ UPDATE_ROLE_WORDS as ROLE_WORDS \} from "\.\/step-tree";/);
  assert.ok(!/[a-z]{3,}-[a-z]{3,}@/.test(read("lib/update-live.ts")));
  // the routes and the polls do not change
  assert.match(read("components/StepView.tsx"), /useLive<StepSummary>\(url,/);
  assert.match(read("components/useLive.tsx"), /export const POLL_MS = 3000;/);
  assert.deepEqual(JSON.parse(read("package.json")).dependencies && Object.keys(JSON.parse(read("package.json")).dependencies).sort(), ["next", "react", "react-dom"]);
});

try {
  done();
} finally {
  await fs.rm(base, { recursive: true, force: true });
  if (fallbackTmp) await fs.rm(fallbackTmp, { recursive: true, force: true });
}
