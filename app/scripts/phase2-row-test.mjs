// VW91 (round 91): server-free tests of the live Phase 2 row of the Monitor dashboard "/" (Q-A 3:4.6, 3:4.2). VW92 adds the quota wait (Q-A 3:7.6, 3:7.4).
// Run: scripts/dev/cleanenv.sh node scripts/phase2-row-test.mjs (from the app folder; the wrapper sets TMPDIR).
// It makes sample folders <data>/book-store/paired-dataset below $TMPDIR, reads them with loadPhase2, and checks the text of the row.
// It reads no real data, starts no server, makes no network call, and removes its folder at the end.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire, registerHooks } from "node:module";

const app = path.resolve(import.meta.dirname, "..");
assert.ok(process.env.TMPDIR, "Set TMPDIR (use scripts/dev/cleanenv.sh)");
globalThis.fetch = async () => { throw new Error("Network is disabled in the Phase 2 row tests."); };
const appRequire = createRequire(path.join(app, "package.json"));
// The paths are found before the hooks start, because require.resolve runs the hooks too (a hook that calls it loops).
const reactUrl = Object.fromEntries(["react", "react/jsx-runtime", "react-dom/server"].map((s) => [s, pathToFileURL(appRequire.resolve(s)).href]));

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    // react and react-dom resolve from the app folder, also for the component that the test compiles into the sample folder
    // Only a file outside node_modules (the compiled component or this test) needs the map. react itself loads its own parts.
    if (reactUrl[specifier] && !String(context.parentURL ?? "").includes("/node_modules/")) return next(reactUrl[specifier], context);
    if (specifier.startsWith("@/")) return next(pathToFileURL(path.join(app, specifier.slice(2)) + ".ts").href, context);
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !path.extname(specifier)) return next(new URL(specifier + ".ts", context.parentURL).href, context);
    return next(specifier, context);
  },
  load(url, context, next) { if (url.endsWith(".ts")) return { ...next(url, { ...context, format: "module-typescript" }), format: "module-typescript" }; return next(url, context); },
});
const P = await import("../lib/phase2-row.ts");
const WT = await import("../lib/phase2-wait.ts");
const { loadPhase2 } = await import("../lib/phase2-load.ts");
const R = await import("../lib/book-status-rules.ts");

const root = await fs.mkdtemp(path.join(process.env.TMPDIR, "phase2-row-"));
const store = path.join(root, "book-store", "paired-dataset");
const NOW_MS = Date.UTC(2026, 10, 11, 16, 40, 30); // 2026-11-11T16:40:30Z = 08:40:30 PST
const NOW = NOW_MS / 1000;
const alive = (pid) => pid === process.pid;
const STATUS_HREF = "/json?path=book-store%2Fpaired-dataset%2Fstatus.json";
const HISTORY_HREF = "/json?path=book-store%2Fpaired-dataset%2Fhistory.jsonl";

const base = {
  schema: "book-status-v1", book: "paired-dataset", phase: "agent-phase-2", state: "running", stop_reason: null, stop_text: null, list_stamp: null,
  pid: process.pid, heartbeat_utc: "2026-11-11T16:40:18Z", running_page: "article_a/p057", running_boxes: ["TS_2", "TL_1"], last_accepted_page: "article_a/p056",
  next_page: "article_a/p057", pages_done: 56, pages_total: 144, book_pages: 144, accepted: [], fail_pages: [], cost_usd_models_phase: 12.34, seconds_phase: 3600,
  last_error: null, pause_requested: false, started_utc: "2026-11-11T14:00:00Z", run_id: "2026-11-11T06:00:00-08:00", updated_utc: "2026-11-11T16:40:18Z",
  tokens_phase: { input: 1234567, output: 345678, reasoning: 12345, cache_read: 98765432, cache_write: 1234567, calls: 432 },
};
const history = [
  { utc: "2026-11-11T14:00:00Z", event: "start" },
  { utc: "2026-11-11T16:30:00Z", event: "page-done", page: "article_a/p055" },
  { utc: "2026-11-11T16:40:18Z", event: "page-done", page: "article_a/p056" },
].map((r) => JSON.stringify(r)).join("\n") + "\n";

async function reset() {
  await fs.rm(path.join(root, "book-store"), { recursive: true, force: true });
  await fs.mkdir(store, { recursive: true });
}
async function put(status, hist = history) {
  await reset();
  if (status !== undefined) await fs.writeFile(path.join(store, "status.json"), typeof status === "string" ? status : JSON.stringify(status));
  if (hist !== null) await fs.writeFile(path.join(store, "history.jsonl"), hist);
}
const text = async (status, hist, now = NOW) => {
  await put(status, hist);
  const v = await loadPhase2(root, now * 1000, alive);
  return { v, t: v ? P.phase2Text(v, now) : null };
};
const lineOf = (t, key) => t.lines.find((l) => l.key === key);
const keys = (t) => t.lines.map((l) => l.key);

let count = 0;
async function check(name, fn) { await fn(); count++; console.log("PASS " + name); }

try {
  await check("no status.json: loadPhase2 gives null and the old fixed line stays", async () => {
    await put(undefined);
    assert.equal(await loadPhase2(root, NOW_MS, alive), null);
    await fs.rm(path.join(root, "book-store"), { recursive: true, force: true });
    assert.equal(await loadPhase2(root, NOW_MS, alive), null, "no store folder at all");
    assert.equal(P.buildPhase2({ file: "missing", status: null, pidAlive: false, pauseExists: false, lastEvent: null, historyExists: false }, NOW), null);
    assert.equal(R.PHASE2_LINE, "Phase 2 (paired dataset): no run record yet.");
    const row = await fs.readFile(path.join(app, "components/Phase2Row.tsx"), "utf8");
    assert.ok(row.includes("data-phase2-line") && row.includes("{PHASE2_LINE}") && row.includes("if (!view)"));
  });

  await check("running with tokens: exact screen text", async () => {
    const { v, t } = await text(base);
    assert.equal(v.kind, "status");
    assert.equal(t.title, "Phase 2 (paired dataset): ● Running");
    assert.deepEqual(keys(t), ["progress", "now", "alive", "last-accepted", "tokens", "last-event", "links"]);
    assert.equal(lineOf(t, "progress").text, "Pages done: 56 of 144");
    assert.equal(lineOf(t, "now").text, "Now: p057, boxes TS_2, TL_1.");
    assert.equal(lineOf(t, "alive").text, "Last sign of life 12 s ago.");
    assert.equal(lineOf(t, "last-accepted").text, "Last accepted page: p056.");
    assert.equal(lineOf(t, "tokens").text, "Tokens: input 1,234,567 · output 345,678 · reasoning 12,345 · cache read 98,765,432 · cache write 1,234,567 · 432 calls");
    assert.equal(lineOf(t, "last-event").text, "Last event: page-done, Nov 11 08:40 PST (just now)");
    assert.equal(lineOf(t, "links").text, "JSON viewer: ");
    assert.deepEqual(lineOf(t, "links").links, [{ text: "status.json", href: STATUS_HREF }, { text: "history.jsonl", href: HISTORY_HREF }]);
  });

  await check("one running box: 'box TS_2' (singular)", async () => {
    const { t } = await text({ ...base, running_boxes: ["TS_2"] });
    assert.equal(lineOf(t, "now").text, "Now: p057, box TS_2.");
  });

  await check("USD never shows: cost_usd_models_phase is set and no line holds it", async () => {
    const { t } = await text({ ...base, cost_usd_models_phase: 12.34 });
    const all = JSON.stringify(t);
    assert.ok(!all.includes("12.34") && !all.includes("$") && !/USD|cost/i.test(all.replace(/cache/g, "")), all);
  });

  await check("pause file: 'Running with pause requested' and the pause line", async () => {
    await put(base);
    await fs.writeFile(path.join(store, "PAUSE"), "");
    const v = await loadPhase2(root, NOW_MS, alive);
    const t = P.phase2Text(v, NOW);
    assert.equal(t.title, "Phase 2 (paired dataset): ● Running with pause requested");
    assert.equal(lineOf(t, "pause").text, "Pause requested. The process finishes the current page, then ends.");
  });

  await check("stopped by Ctrl-C with a last error: stop reason, short error line, link to an existing file", async () => {
    const errRel = "book-store/paired-dataset/runs/p058/failed/TS_3.json";
    await put({ ...base, state: "stopped", stop_reason: "ctrl-c", stop_text: "stopped: Ctrl-C", pid: null, heartbeat_utc: "2026-11-11T16:29:50Z", updated_utc: "2026-11-11T16:30:00Z", running_page: null, running_boxes: [],
      last_error: { page: "article_a/p058", box: "TS_3", text: "TS_3: invalid JSON", file: "data/" + errRel, utc: "2026-11-11T16:29:00Z" } });
    await fs.mkdir(path.join(root, path.dirname(errRel)), { recursive: true });
    await fs.writeFile(path.join(root, errRel), "{}");
    const v = await loadPhase2(root, NOW_MS, alive);
    const t = P.phase2Text(v, NOW);
    assert.equal(t.title, "Phase 2 (paired dataset): ■ Stopped");
    assert.equal(lineOf(t, "stop").text, "Stop reason: Ctrl-C (Nov 11 08:30 PST, 10 min ago).");
    assert.equal(lineOf(t, "error").text, "Error on p058, box TS_3: invalid JSON");
    assert.equal(lineOf(t, "error").error, true);
    assert.deepEqual(lineOf(t, "error").links, [{ text: "File: " + errRel, href: "/json?path=" + encodeURIComponent(errRel) }]);
    assert.ok(!keys(t).includes("now") && !keys(t).includes("alive"), "no 'Now' line when stopped");
    // The error file is gone: the text stays and the link goes.
    await fs.rm(path.join(root, errRel));
    const t2 = P.phase2Text(await loadPhase2(root, NOW_MS, alive), NOW);
    assert.equal(lineOf(t2, "error").text, "Error on p058, box TS_3: invalid JSON");
    assert.equal(lineOf(t2, "error").links, undefined);
  });

  await check("error file paths: '..' and an absolute Mac path give no link", async () => {
    for (const file of ["data/../../etc/passwd", "../x.json", "/Users/someone/data/book-store/x.json", "", null]) {
      const { t, v } = await text({ ...base, state: "stopped", stop_reason: "ctrl-c", last_error: { page: "article_a/p058", box: null, text: "boom", file } });
      assert.equal(v.errorFile, null, String(file));
      assert.equal(lineOf(t, "error").text, "Error on p058: boom");
      assert.equal(lineOf(t, "error").links, undefined);
    }
    assert.equal(P.errorFilePath("data/pilot-run/a/b.json"), "pilot-run/a/b.json");
    assert.equal(P.errorFilePath("/data/pilot-run/a/b.json"), "pilot-run/a/b.json");
  });

  await check("a long error text ends with an ellipsis at 160 characters", async () => {
    const { t } = await text({ ...base, state: "stopped", stop_reason: "ctrl-c", last_error: { page: "a/p001", box: "ED_1", text: "x".repeat(500) + "\n" + "y".repeat(50) } });
    const e = lineOf(t, "error").text;
    assert.equal(e.length, P.ERROR_MAX);
    assert.ok(e.endsWith("…") && !e.includes("\n"));
  });

  await check("stopped by failure: label, symbol, and the stop_text without 'stopped:'", async () => {
    const { t } = await text({ ...base, state: "stopped", stop_reason: "forward-failure", stop_text: "stopped: forward failure on p060, box QA_3.", updated_utc: "2026-11-11T16:30:00Z" });
    assert.equal(t.title, "Phase 2 (paired dataset): ▲ Stopped by failure");
    assert.equal(lineOf(t, "stop").text, "Stop reason: forward failure on p060, box QA_3 (Nov 11 08:30 PST, 10 min ago).");
    const t2 = (await text({ ...base, state: "stopped", stop_reason: "target-reached", stop_text: null })).t;
    assert.equal(t2.title, "Phase 2 (paired dataset): ■ Stopped");
    assert.ok(lineOf(t2, "stop").text.startsWith("Stop reason: target reached"));
    const t3 = (await text({ ...base, state: "stopped", stop_reason: null, stop_text: null, updated_utc: null })).t;
    assert.equal(lineOf(t3, "stop").text, "Stop reason: not stored.");
    const t4 = (await text({ ...base, state: "stopped", stop_reason: "pause" })).t;
    assert.ok(lineOf(t4, "stop").text.startsWith("Stop reason: Pause ("));
  });

  await check("completed: title, time, and pages", async () => {
    const { t } = await text({ ...base, state: "completed", pid: null, pages_done: 144, running_page: null, running_boxes: [], updated_utc: "2026-11-11T14:00:00Z" });
    assert.equal(t.title, "Phase 2 (paired dataset): ✓ Completed");
    assert.equal(lineOf(t, "progress").text, "Pages done: 144 of 144");
    assert.equal(lineOf(t, "completed").text, "Completed Nov 11 06:00 PST (2 h ago).");
    assert.ok(!keys(t).includes("stop") && !keys(t).includes("now"));
  });

  await check("not started: one 'No run yet.' line and the status link", async () => {
    const { t } = await text({ ...base, state: "not-started", pid: null, tokens_phase: undefined });
    assert.equal(t.title, "Phase 2 (paired dataset): ○ Not started");
    assert.deepEqual(keys(t), ["no-run", "links"]);
    assert.equal(lineOf(t, "no-run").text, "No run yet.");
  });

  await check("missing tokens_phase (an old file): 'Tokens: not recorded yet'", async () => {
    const { tokens_phase, ...old } = base;
    void tokens_phase;
    const { t, v } = await text(old);
    assert.equal(v.tokens, null);
    assert.equal(lineOf(t, "tokens").text, "Tokens: not recorded yet");
    for (const bad of [null, "x", [], {}, { input: "a", output: -1, calls: NaN }]) {
      const r = await text({ ...base, tokens_phase: bad });
      assert.equal(lineOf(r.t, "tokens").text, "Tokens: not recorded yet", JSON.stringify(bad));
    }
  });

  await check("a partial tokens_phase shows '–' for each missing count, and '1 call'", async () => {
    const { t } = await text({ ...base, tokens_phase: { input: 1000, output: 20, calls: 1 } });
    assert.equal(lineOf(t, "tokens").text, "Tokens: input 1,000 · output 20 · reasoning – · cache read – · cache write – · 1 call");
    assert.equal(P.thousands(0), "0");
    assert.equal(P.thousands(999), "999");
    assert.equal(P.thousands(1000), "1,000");
    assert.equal(P.thousands(1234567890), "1,234,567,890");
  });

  await check("stale heartbeat while the state is running: the books rule 'Stopped unexpectedly' (silent and gone)", async () => {
    const silent = await text({ ...base, heartbeat_utc: "2026-11-11T16:35:30Z" }); // 300 s old, pid alive
    assert.equal(silent.t.title, "Phase 2 (paired dataset): ▲ Stopped unexpectedly");
    assert.equal(lineOf(silent.t, "silent").text, "No update for 5 min: the process is silent.");
    assert.ok(!keys(silent.t).includes("alive") && !keys(silent.t).includes("now"));
    const gone = await text({ ...base, pid: 99999999 }); // fresh heartbeat, dead pid
    assert.equal(gone.t.title, "Phase 2 (paired dataset): ▲ Stopped unexpectedly");
    assert.equal(lineOf(gone.t, "silent").text, "No update for 0 min: the process is gone.");
    const none = await text({ ...base, heartbeat_utc: null });
    assert.equal(lineOf(none.t, "silent").text, "No update is stored: the process is silent.");
    // The same rule as the books rows: 120 s is still Running, 121 s is not.
    assert.equal(R.STALE_S, 120);
    assert.equal((await text({ ...base, heartbeat_utc: "2026-11-11T16:38:30Z" })).t.label, "Running");
    assert.equal((await text({ ...base, heartbeat_utc: "2026-11-11T16:38:29Z" })).t.label, "Stopped unexpectedly");
    // The row calls the books rule, not a copy of it.
    const src = await fs.readFile(path.join(app, "lib/phase2-row.ts"), "utf8");
    assert.ok(src.includes("baseLabelOf(st, input.pauseExists, input.pidAlive, now)"));
  });

  await check("bad JSON: one short warning, a link to the JSON viewer, no crash", async () => {
    for (const bad of ["{ not json", "", "[1,2]", "42", "null", '"text"']) {
      const { v, t } = await text(bad);
      assert.equal(v.kind, "unreadable", JSON.stringify(bad));
      assert.equal(t.title, "Phase 2 (paired dataset): ? Status file unreadable");
      assert.deepEqual(keys(t), ["unreadable", "links"]);
      assert.equal(lineOf(t, "unreadable").text, "The file status.json cannot be read as a JSON object. Open it in the JSON viewer to see the error.");
      assert.deepEqual(lineOf(t, "links").links, [{ text: "status.json", href: STATUS_HREF }]);
    }
    // status.json is a folder: the read fails with EISDIR and the row says "unreadable", not "no record".
    await reset();
    await fs.mkdir(path.join(store, "status.json"));
    const v = await loadPhase2(root, NOW_MS, alive);
    assert.equal(v?.kind, "unreadable");
  });

  await check("a state word outside the four store states gives 'Not started', not a crash", async () => {
    const { t } = await text({ ...base, state: "paused-by-alien" });
    assert.equal(t.title, "Phase 2 (paired dataset): ○ Not started");
  });

  await check("history.jsonl: last event, missing file, broken lines, partial last line", async () => {
    const miss = await text(base, null);
    assert.equal(miss.v.historyHref, null);
    assert.equal(miss.v.lastEvent, null);
    assert.ok(!keys(miss.t).includes("last-event"));
    assert.deepEqual(lineOf(miss.t, "links").links, [{ text: "status.json", href: STATUS_HREF }]);
    const empty = await text(base, "");
    assert.equal(empty.v.lastEvent, null);
    assert.equal(empty.v.historyHref, HISTORY_HREF, "an empty file still exists and gets its link");
    const partial = await text(base, history + '{"utc":"2026-11-11T16:41:00Z","event":"page-do'); // the writer is in the middle of a line
    assert.equal(partial.v.lastEvent.name, "page-done");
    assert.equal(partial.v.lastEvent.epoch, Date.UTC(2026, 10, 11, 16, 40, 18) / 1000);
    const noTime = await text(base, '{"event":"weird"}\n');
    assert.equal(lineOf(noTime.t, "last-event").text, "Last event: weird");
    const junk = await text(base, "not json\n[1]\n\n");
    assert.equal(junk.v.lastEvent, null);
    // A file larger than the tail: the last row is found and the first partial line is dropped.
    const big = (JSON.stringify({ utc: "2026-11-11T10:00:00Z", event: "prompt-live", pad: "z".repeat(200) }) + "\n").repeat(2000) + history;
    assert.ok(big.length > P.HISTORY_TAIL_BYTES);
    const b = await text(base, big);
    assert.equal(b.v.lastEvent.name, "page-done");
    assert.equal(lineOf(b.t, "last-event").text, "Last event: page-done, Nov 11 08:40 PST (just now)");
    // An event name that is not text is ignored.
    const num = await text(base, '{"utc":"2026-11-11T16:40:18Z","event":5}\n');
    assert.equal(num.v.lastEvent, null);
  });

  await check("lastHistoryRow: cut flag drops the first line", () => {
    assert.deepEqual(P.lastHistoryRow('{"event":"a"}\n{"event":"b"}\n', false), { event: "b" });
    assert.equal(P.lastHistoryRow('"event":"a"}\n', true), null);
    assert.deepEqual(P.lastHistoryRow('"x"}\n{"event":"b"}\n', true), { event: "b" });
    assert.equal(P.lastHistoryRow("", false), null);
  });

  await check("times show in PST: 16:40 UTC reads 08:40 PST (UTC minus 8 hours all year)", async () => {
    const { t } = await text({ ...base, state: "completed", pid: null, updated_utc: "2026-07-10T16:00:00Z" }, history, Date.UTC(2026, 6, 10, 17, 0, 0) / 1000);
    assert.equal(lineOf(t, "completed").text, "Completed Jul 10 08:00 PST (1 h ago).");
  });

  await check("pages_total 0 or missing: 'Pages done: N' with no 'of'; pages_done missing: 0 (the books rows do the same)", async () => {
    assert.equal(lineOf((await text({ ...base, pages_total: 0 })).t, "progress").text, "Pages done: 56");
    const { pages_done, ...nodone } = base;
    void pages_done;
    assert.equal(lineOf((await text(nodone)).t, "progress").text, "Pages done: 0 of 144");
    assert.equal(lineOf((await text({ ...base, pages_done: 1234, pages_total: 5678 })).t, "progress").text, "Pages done: 1,234 of 5,678");
  });

  await check("no last accepted page: 'No page accepted yet.'", async () => {
    const { t } = await text({ ...base, last_accepted_page: null });
    assert.equal(lineOf(t, "last-accepted").text, "No page accepted yet.");
  });

  await check("the answer is JSON-safe and holds no Mac path", async () => {
    const { v } = await text({ ...base, state: "stopped", stop_reason: "ctrl-c", last_error: { page: "a/p1", text: "x", file: "data/book-store/paired-dataset/x.json" } });
    const s = JSON.stringify(v);
    assert.deepEqual(JSON.parse(s), v);
    assert.ok(!s.includes(root) && !/\/Users\/|\/private\/var|\/var\/folders/.test(s));
  });

  // ---- VW92 (round 91, Q-A 3:7.6 and 3:7.4 A11 to A13): the quota wait. The key "waiting" of status.json (translator_run.py make_quota_watch).
  const WAIT_BASE = {
    reason: "usage limit", page: "article_a/p057", box: "TL_1", since_utc: "2026-11-11T16:10:00Z", until_utc: "2026-11-12T04:19:00Z", wait_s: 43740, source: "retry-after",
    cards: ["claude-028c2ffe", "claude-7f6d8610", "claude-aade7ca8"], calls: 1,
  };
  const waitLinesOf = (t) => ({ main: lineOf(t, "waiting")?.text, detail: lineOf(t, "waiting-detail")?.text });

  await check("VW92 quota wait, 3 cards: the main line, the detail line, and the state stays Running", async () => {
    const { v, t } = await text({ ...base, waiting: { ...WAIT_BASE, calls: 2 } });
    assert.equal(t.title, "Phase 2 (paired dataset): ● Running");
    assert.deepEqual(keys(t), ["progress", "now", "waiting", "waiting-detail", "alive", "last-accepted", "tokens", "last-event", "links"]);
    assert.equal(lineOf(t, "waiting").text, "Waiting for the usage limit until 20:19 PST (all 3 cards).");
    assert.equal(lineOf(t, "waiting-detail").text, "Wait started 08:10 PST at p057, box TL_1. 2 calls wait. End time from the retry-after value of the error.");
    assert.deepEqual(Object.keys(v.waiting).sort(), ["box", "calls", "cards", "page", "reason", "sinceEpoch", "source", "untilEpoch"]);
    assert.equal(v.waiting.untilEpoch, Date.UTC(2026, 10, 12, 4, 19, 0) / 1000);
    // The old lines stay as they were.
    assert.equal(lineOf(t, "now").text, "Now: p057, boxes TS_2, TL_1.");
    assert.equal(lineOf(t, "alive").text, "Last sign of life 12 s ago.");
  });

  await check("VW92 quota wait, 1 card and 2 cards: the short names ntngh, uonlp, ngotr in a fixed order", async () => {
    const one = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, cards: ["claude-028c2ffe"] } })).t);
    assert.equal(one.main, "Waiting for the usage limit until 20:19 PST (card ntngh).");
    const two = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, cards: ["claude-7f6d8610", "claude-028c2ffe"] } })).t);
    assert.equal(two.main, "Waiting for the usage limit until 20:19 PST (cards ntngh, ngotr).");
    const uonlp = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, cards: ["claude-aade7ca8"] } })).t);
    assert.equal(uonlp.main, "Waiting for the usage limit until 20:19 PST (card uonlp).");
    const ngotr = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, cards: ["claude-7f6d8610"] } })).t);
    assert.equal(ngotr.main, "Waiting for the usage limit until 20:19 PST (card ngotr).");
    // Two doubles count once.
    const dbl = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, cards: ["claude-028c2ffe", "claude-028c2ffe"] } })).t);
    assert.equal(dbl.main, "Waiting for the usage limit until 20:19 PST (card ntngh).");
    assert.equal(WT.CARD_NAMES["claude-028c2ffe"], "ntngh");
    assert.equal(WT.CARD_NAMES["claude-aade7ca8"], "uonlp");
    assert.equal(WT.CARD_NAMES["claude-7f6d8610"], "ngotr");
  });

  await check("VW92 quota wait, an unknown ID and the providers xai and google show as written (A11)", async () => {
    const xai = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, box: "TS_2", cards: ["xai"], source: "step" } })).t);
    assert.equal(xai.main, "Waiting for the usage limit until 20:19 PST (xai).");
    assert.equal(xai.detail, "Wait started 08:10 PST at p057, box TS_2. End time is a fixed step, because no reset time is known.");
    const ggl = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, cards: ["google"], source: "usage file" } })).t);
    assert.equal(ggl.main, "Waiting for the usage limit until 20:19 PST (google).");
    assert.equal(ggl.detail, "Wait started 08:10 PST at p057, box TL_1. End time from the reset time in the usage file.");
    const unk = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, cards: ["claude-deadbeef"] } })).t);
    assert.equal(unk.main, "Waiting for the usage limit until 20:19 PST (claude-deadbeef).");
    const mix = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, cards: ["xai", "claude-028c2ffe"] } })).t);
    assert.equal(mix.main, "Waiting for the usage limit until 20:19 PST (ntngh, xai).");
    const all = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, cards: ["claude-028c2ffe", "claude-aade7ca8", "claude-7f6d8610", "xai"] } })).t);
    assert.equal(all.main, "Waiting for the usage limit until 20:19 PST (all 3 cards, xai).");
    const none = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, cards: [] } })).t);
    assert.equal(none.main, "Waiting for the usage limit until 20:19 PST.");
    assert.equal(WT.cardsText(["claude-028c2ffe", "claude-aade7ca8", "claude-7f6d8610"]), "all 3 cards");
  });

  await check("VW92 quota wait, no key: no wait line, and the lines are the same as before VW92", async () => {
    const { v, t } = await text(base);
    assert.equal(v.waiting, null);
    assert.ok(!keys(t).includes("waiting") && !keys(t).includes("waiting-detail"));
    assert.deepEqual(keys(t), ["progress", "now", "alive", "last-accepted", "tokens", "last-event", "links"]);
    // The key goes away: the next read shows no line (the live update of the dashboard calls this read every 3 s).
    const withKey = await text({ ...base, waiting: WAIT_BASE });
    assert.ok(keys(withKey.t).includes("waiting"));
    assert.ok(!keys((await text(base)).t).includes("waiting"));
    for (const none of [null, undefined]) assert.ok(!keys((await text({ ...base, waiting: none })).t).includes("waiting"));
  });

  await check("VW92 quota wait, a broken key: no crash and no wait line (wrong types, no end time)", async () => {
    const broken = [
      "x", 5, true, [], [WAIT_BASE], {}, { cards: ["claude-028c2ffe"] }, { until_utc: 5 }, { until_utc: "tomorrow" }, { until_utc: "2026-13-45T99:00:00Z" },
      { since_utc: "2026-11-11T16:10:00Z" }, { since_utc: "2026-11-11T16:10:00Z", wait_s: "long" }, { since_utc: "2026-11-11T16:10:00Z", wait_s: -5 },
      { since_utc: "2026-11-11T16:10:00Z", wait_s: NaN }, { until_utc: { a: 1 }, cards: 7, calls: "x", page: [], box: {}, source: 9, reason: 3 },
    ];
    for (const b of broken) {
      const r = await text({ ...base, waiting: b });
      assert.equal(r.v.kind, "status", JSON.stringify(b));
      assert.equal(r.v.waiting, null, JSON.stringify(b));
      assert.ok(!keys(r.t).includes("waiting"), JSON.stringify(b));
      assert.equal(r.t.title, "Phase 2 (paired dataset): ● Running", JSON.stringify(b));
    }
    // Wrong types in the other fields only drop that part.
    const part = await text({ ...base, waiting: { until_utc: "2026-11-12T04:19:00Z", cards: 7, calls: "x", page: [], box: {}, source: 9, reason: 3, since_utc: 4 } });
    assert.equal(lineOf(part.t, "waiting").text, "Waiting until 20:19 PST.");
    assert.equal(lineOf(part.t, "waiting-detail"), undefined);
    const cards = await text({ ...base, waiting: { ...WAIT_BASE, cards: [1, null, "", "  ", { a: 1 }, "claude-aade7ca8"], calls: 0 } });
    assert.equal(lineOf(cards.t, "waiting").text, "Waiting for the usage limit until 20:19 PST (card uonlp).");
    assert.ok(!/calls wait/.test(lineOf(cards.t, "waiting-detail").text));
    // since_utc plus wait_s gives the end when until_utc is missing.
    const calc = await text({ ...base, waiting: { since_utc: "2026-11-11T16:10:00Z", wait_s: 3600, cards: ["claude-028c2ffe"] } });
    assert.equal(lineOf(calc.t, "waiting").text, "Waiting until 09:10 PST (card ntngh).");
    // A very long card ID is cut, and a long page or box is cut.
    const longId = await text({ ...base, waiting: { ...WAIT_BASE, cards: ["c".repeat(300)], box: "b".repeat(300) } });
    assert.ok(lineOf(longId.t, "waiting").text.length < 120 && lineOf(longId.t, "waiting-detail").text.length < 160);
    // At most 8 cards show.
    const many = await text({ ...base, waiting: { ...WAIT_BASE, cards: Array.from({ length: 40 }, (_, i) => "id" + i) } });
    assert.equal(many.v.waiting.cards.length, 8);
  });

  await check("VW92 quota wait, the end time is in the past: the line says the planned end is past and shows no negative time", async () => {
    const past = await text({ ...base, waiting: { ...WAIT_BASE, since_utc: "2026-11-11T14:00:00Z", until_utc: "2026-11-11T16:30:00Z" } });
    assert.equal(lineOf(past.t, "waiting").text, "Waiting for the usage limit. The planned end, 08:30 PST, is past (all 3 cards).");
    assert.ok(!/-\d/.test(lineOf(past.t, "waiting").text));
    assert.equal(past.t.title, "Phase 2 (paired dataset): ● Running");
    // The end equals the clock: also past (the run writes quota-resumed within a second).
    const edge = await text({ ...base, waiting: { ...WAIT_BASE, until_utc: "2026-11-11T16:40:30Z" } });
    assert.ok(lineOf(edge.t, "waiting").text.includes("is past"));
    const edge2 = await text({ ...base, waiting: { ...WAIT_BASE, until_utc: "2026-11-11T16:40:31Z" } });
    assert.ok(lineOf(edge2.t, "waiting").text.startsWith("Waiting for the usage limit until 08:40 PST"));
    // The same view moves with the clock of the browser (phase2Text is called with its own clock every 30 s).
    const v = (await text({ ...base, waiting: { ...WAIT_BASE, until_utc: "2026-11-11T16:41:00Z" } })).v;
    assert.ok(P.phase2Text(v, NOW).lines.find((l) => l.key === "waiting").text.includes("until 08:41 PST"));
    assert.ok(P.phase2Text(v, NOW + 60).lines.find((l) => l.key === "waiting").text.includes("is past"));
  });

  await check("VW92 quota wait, the date shows only when the time is on another PST day (UTC minus 8 hours)", async () => {
    // Now is 08:40 PST on Nov 11. 2026-11-12T08:30:00Z is 00:30 PST on Nov 12.
    const next = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, until_utc: "2026-11-12T08:30:00Z" } })).t);
    assert.equal(next.main, "Waiting for the usage limit until Nov 12 00:30 PST (all 3 cards).");
    // 2026-11-11T07:59:00Z is 23:59 PST on Nov 10, the day before.
    const old = waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, since_utc: "2026-11-11T07:59:00Z", until_utc: "2026-11-11T16:50:00Z" } })).t);
    assert.equal(old.detail.split(". ")[0], "Wait started Nov 10 23:59 PST at p057, box TL_1");
    assert.ok(old.main.includes("until 08:50 PST"));
  });

  await check("VW92 quota wait, other reasons, missing page or box, and a key in a state that does not run", async () => {
    assert.equal(waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, reason: "maintenance" } })).t).main, "Waiting (maintenance) until 20:19 PST (all 3 cards).");
    assert.equal(waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, reason: null } })).t).main, "Waiting until 20:19 PST (all 3 cards).");
    assert.equal(waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, page: null } })).t).detail.split(". ")[0], "Wait started 08:10 PST at box TL_1");
    assert.equal(waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, box: null } })).t).detail.split(". ")[0], "Wait started 08:10 PST at p057");
    assert.equal(waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, page: null, box: null, source: null } })).t).detail, "Wait started 08:10 PST.");
    assert.equal(waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, since_utc: null, source: null } })).t).detail, "Wait at p057, box TL_1.");
    assert.equal(waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, since_utc: null, page: null, box: null, source: null } })).t).detail, undefined);
    assert.equal(waitLinesOf((await text({ ...base, waiting: { ...WAIT_BASE, source: "magic" } })).t).detail, "Wait started 08:10 PST at p057, box TL_1.");
    // With a PAUSE file the state is Running with pause requested and the wait shows too.
    await put({ ...base, waiting: WAIT_BASE });
    await fs.writeFile(path.join(store, "PAUSE"), "");
    const tp = P.phase2Text(await loadPhase2(root, NOW_MS, alive), NOW);
    assert.equal(tp.title, "Phase 2 (paired dataset): ● Running with pause requested");
    assert.deepEqual(keys(tp).slice(0, 5), ["progress", "pause", "now", "waiting", "waiting-detail"]);
    // A key that stays after the run ended or died: no wait line (the process no longer waits).
    for (const st of [
      { state: "stopped", stop_reason: "ctrl-c", pid: null },
      { state: "completed", pid: null, pages_done: 144 },
      { state: "stopped", stop_reason: "forward-failure", pid: null },
      { state: "running", heartbeat_utc: "2026-11-11T16:35:30Z" }, // silent for 300 s: Stopped unexpectedly
      { state: "running", pid: 99999999 }, // process gone
      { state: "not-started", pid: null },
    ]) {
      const r = await text({ ...base, ...st, waiting: WAIT_BASE });
      assert.equal(r.v.waiting, null, JSON.stringify(st));
      assert.ok(!keys(r.t).includes("waiting") && !keys(r.t).includes("waiting-detail"), JSON.stringify(st));
    }
    // A bad status file: no wait, no crash.
    assert.equal((await text("{ waiting")).v.waiting, null);
  });

  await check("VW92 quota wait: tokens only, no dollar, no e-mail address, no Mac path, JSON-safe answer", async () => {
    const { v, t } = await text({ ...base, cost_usd_models_phase: 12.34, waiting: { ...WAIT_BASE, calls: 3 } });
    const all = JSON.stringify(t) + JSON.stringify(v);
    assert.ok(!all.includes("12.34") && !all.includes("$") && !/USD|@gmail|ntnghia|uonlpsharing|ngotrnghia/i.test(all), all);
    assert.ok(!/\/Users\/|\/private\/var|\/var\/folders/.test(all) && !all.includes(root));
    assert.deepEqual(JSON.parse(JSON.stringify(v)), v);
    assert.ok(lineOf(t, "tokens").text.startsWith("Tokens: input 1,234,567"), "the token line stays");
    for (const f of ["lib/phase2-wait.ts"]) {
      const s = await fs.readFile(path.join(app, f), "utf8");
      assert.ok(!/cost_usd|costUsd|money\(|usd\(/.test(s.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")), f);
    }
  });

  await check("VW92 quota wait: the rules read the files of TR91 as they are written (shape of make_quota_watch and quota_wait_plan)", async () => {
    // The shape from translator_run.py 214-216 and launcher.py 295-296: reason, page, box, since_utc, until_utc, wait_s, source, cards (sorted), calls.
    const written = { reason: "usage limit", page: "article_a/p057", box: "TL_1", since_utc: "2026-11-11T16:10:00Z", until_utc: "2026-11-12T04:19:00Z", wait_s: 43740.0, source: "usage file",
      cards: ["claude-028c2ffe", "claude-7f6d8610", "claude-aade7ca8"], calls: 3 };
    const w = WT.waitOf(written);
    assert.deepEqual(w, { reason: "usage limit", page: "p057", box: "TL_1", sinceEpoch: Date.UTC(2026, 10, 11, 16, 10, 0) / 1000, untilEpoch: Date.UTC(2026, 10, 12, 4, 19, 0) / 1000,
      source: "usage file", cards: ["claude-028c2ffe", "claude-7f6d8610", "claude-aade7ca8"], calls: 3 });
    // An agent tag as the box (the key box holds "a tag such as TL_1 or an agent tag").
    assert.equal(WT.waitOf({ ...written, box: "CRITIC" }).box, "CRITIC");
    // The three events of history.jsonl (A13) show as the last event with their own name.
    for (const name of ["quota-wait", "quota-resumed", "quota-wait-stopped"]) {
      const h = JSON.stringify({ utc: "2026-11-11T16:40:00Z", event: name, page: "article_a/p057", box: "TL_1", cards: ["claude-028c2ffe"], since_utc: "2026-11-11T16:10:00Z" }) + "\n";
      const r = await text(base, history + h);
      assert.equal(lineOf(r.t, "last-event").text, `Last event: ${name}, Nov 11 08:40 PST (just now)`);
    }
  });

  // ---- the component, rendered to HTML with react-dom/server (no server process). TypeScript compiles the .tsx file into the sample folder.
  await check("component: renders the row (title, items, red error line with the file link, JSON viewer links) and the old line when the view is null", async () => {
    const ts = appRequire("typescript");
    const compiled = ts.transpileModule(await fs.readFile(path.join(app, "components/Phase2Row.tsx"), "utf8"), {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const file = path.join(root, "Phase2Row.mjs");
    await fs.writeFile(file, compiled);
    // Unit VW94 fix round: Phase2Row imports "./BoxCode" (box codes with a hover, Q-A 3:18.5). The hook gives an extensionless import the ending .ts.
    const boxCode = ts.transpileModule(await fs.readFile(path.join(app, "components/BoxCode.tsx"), "utf8"), {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    await fs.writeFile(path.join(root, "BoxCode.ts"), boxCode);
    const Phase2Row = (await import(pathToFileURL(file).href)).default;
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    // Unit VW94 fix round (Q-A 3:18.5): a box code shows as the code. Its hover text sits in a visually hidden span, which the reader does not see.
    const unBox = (html) => html.replace(/<span data-box-code="[^"]*"[^>]*>([^<]*)<span class="sr-only">[^<]*<\/span><\/span>/g, "$1");
    const plain = (html) => unBox(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    // running
    const run = (await text(base)).v;
    const html = renderToStaticMarkup(createElement(Phase2Row, { view: run, now: NOW }));
    assert.match(unBox(html), /data-phase2-row/);
    assert.match(unBox(html), /data-phase2-state="running"/);
    assert.match(unBox(html), /<span aria-hidden="true">●<\/span>/);
    const p = plain(html);
    // Unit VW94 (Q-A 3:17.4 note): the state word "Running" gets plain words after it.
    assert.ok(p.startsWith("Phase 2 (paired dataset): ● Running : the Translator process is alive and translates one page at a time. Pages done: 56 of 144 Now: p057, boxes TS_2, TL_1. Last sign of life 12 s ago. Last accepted page: p056. Tokens: input 1,234,567"), p);
    assert.ok(p.endsWith("JSON viewer: status.json · history.jsonl"), p);
    assert.match(html, /data-box-code="TS_2" title="TS_2: transcription stage, writes the Japanese text of the page\. Level 2 of 4/);
    assert.ok(html.includes(`href="${STATUS_HREF}"`) && html.includes(`href="${HISTORY_HREF}"`), html);
    assert.ok(!html.includes("text-red-700"), "no red line without an error");
    assert.ok(!p.includes("no run record yet"));

    // stopped with an error and its file
    const errRel = "book-store/paired-dataset/runs/p058/failed/TS_3.json";
    await put({ ...base, state: "stopped", stop_reason: "ctrl-c", last_error: { page: "article_a/p058", box: "TS_3", text: "TS_3: invalid JSON", file: errRel } });
    await fs.mkdir(path.join(root, path.dirname(errRel)), { recursive: true });
    await fs.writeFile(path.join(root, errRel), "{}");
    const stopped = await loadPhase2(root, NOW_MS, alive);
    const html2 = renderToStaticMarkup(createElement(Phase2Row, { view: stopped, now: NOW }));
    assert.match(unBox(html2), /<li data-phase2-item="error"[^>]*class="break-words text-red-700">Error on p058, box TS_3: invalid JSON<span> <a [^>]*href="\/json\?path=book-store%2Fpaired-dataset%2Fruns%2Fp058%2Ffailed%2FTS_3\.json"[^>]*>File: book-store\/paired-dataset\/runs\/p058\/failed\/TS_3\.json<\/a><\/span><\/li>/);
    assert.ok(plain(html2).includes("Stop reason: Ctrl-C (Nov 11 08:40 PST, just now)."));

    // unreadable
    const bad = (await text("{ nope")).v;
    const html3 = renderToStaticMarkup(createElement(Phase2Row, { view: bad, now: NOW }));
    assert.ok(plain(html3).startsWith("Phase 2 (paired dataset): ? Status file unreadable The file status.json cannot be read as a JSON object."), plain(html3));

    // VW92: a quota wait. The two lines are list items of the row, in the colors of the other muted lines (no new color class).
    const waiting = (await text({ ...base, waiting: { ...WAIT_BASE, calls: 2 } })).v;
    const html5 = renderToStaticMarkup(createElement(Phase2Row, { view: waiting, now: NOW }));
    assert.match(unBox(html5), /data-phase2-state="running"/);
    assert.match(unBox(html5), /<li data-phase2-item="waiting">Waiting for the usage limit until 20:19 PST \(all 3 cards\)\.<\/li><li data-phase2-item="waiting-detail">Wait started 08:10 PST at p057, box TL_1\. 2 calls wait\. End time from the retry-after value of the error\.<\/li>/);
    assert.ok(plain(html5).startsWith("Phase 2 (paired dataset): ● Running : the Translator process is alive and translates one page at a time. Pages done: 56 of 144 Now: p057, boxes TS_2, TL_1. Waiting for the usage limit until 20:19 PST (all 3 cards)."), plain(html5));
    assert.ok(!html5.includes("text-red-700"), "the wait line is no error line");
    // Without the key the HTML holds no wait item.
    assert.ok(!html.includes("data-phase2-item=\"waiting"));

    // no view: the old line, with the old attribute
    for (const none of [null, undefined]) {
      const html4 = renderToStaticMarkup(createElement(Phase2Row, { view: none, now: NOW }));
      assert.match(unBox(html4), /^<p data-phase2-line[^>]*class="text-sm text-muted">Phase 2 \(paired dataset\): no run record yet\.<\/p>$/);
    }
  });

  // ---- wiring (source checks, because the page needs a server)
  const src = (rel) => fs.readFile(path.join(app, rel), "utf8");
  await check("wiring: loadMonitor adds phase2 and noRun counts it; MonitorData holds the key; the dashboard uses Phase2Row", async () => {
    const bs = await src("lib/book-status.ts");
    assert.match(bs, /const phase2 = await loadPhase2\(root, nowMs, pidAlive\);/);
    assert.match(bs, /noRun: lists\.length === 0 && statusFiles === 0 && phase2 === null, phase2, phase2Articles \}/); // unit VW94 adds phase2Articles
    assert.match(await src("lib/book-status-rules.ts"), /phase2\?: Phase2View \| null;/);
    const md = await src("components/MonitorDashboard.tsx");
    // Unit VW94: the row also gets the readable names of the phase 2 articles.
    assert.match(md, /<Phase2Row view=\{data\.phase2\} now=\{now\} articles=\{data\.phase2Articles\} \/>/);
    assert.ok(!md.includes("PHASE2_LINE"), "the dashboard no longer holds the fixed line (Phase2Row keeps it as the fallback)");
  });
  await check("poll rule: the dashboard polls the same API every 3 s with shouldPoll always true (the row refreshes while phase 2 runs)", async () => {
    assert.match(await src("components/MonitorDashboard.tsx"), /useLive<MonitorData>\("\/api\/monitor\/books", initial, \(\) => true\)/);
    assert.match(await src("components/useLive.tsx"), /export const POLL_MS = 3000;/);
  });
  await check("monitor guard: no new route, and the one route keeps monitorOffResponse before the read", async () => {
    const route = await src("app/api/monitor/books/route.ts");
    assert.ok(route.indexOf("monitorOffResponse()") > 0 && route.indexOf("monitorOffResponse()") < route.indexOf("loadMonitor()"));
    const files = (await fs.readdir(path.join(app, "app/api/monitor"))).filter((n) => !n.startsWith("."));
    assert.deepEqual(files, ["books"]);
  });
  await check("the new components and rules use no dollar or cost field", async () => {
    for (const f of ["lib/phase2-row.ts", "lib/phase2-load.ts", "components/Phase2Row.tsx"]) {
      const s = await src(f);
      assert.ok(!/cost_usd|costUsd|money\(|usd\(/.test(s.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")), f);
    }
  });
  await check("no new package", async () => {
    const pkg = JSON.parse(await src("package.json"));
    assert.deepEqual(Object.keys(pkg.dependencies).sort(), ["next", "react", "react-dom"]);
  });
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

console.log(`phase2-row tests: ${count} passed`);
