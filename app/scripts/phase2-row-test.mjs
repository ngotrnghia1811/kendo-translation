// VW91 (round 91): server-free tests of the live Phase 2 row of the Monitor dashboard "/" (Q-A 3:4.6, 3:4.2).
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
globalThis.fetch = async () => { throw new Error("Network is disabled in VW91 tests."); };
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

  // ---- the component, rendered to HTML with react-dom/server (no server process). TypeScript compiles the .tsx file into the sample folder.
  await check("component: renders the row (title, items, red error line with the file link, JSON viewer links) and the old line when the view is null", async () => {
    const ts = appRequire("typescript");
    const compiled = ts.transpileModule(await fs.readFile(path.join(app, "components/Phase2Row.tsx"), "utf8"), {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const file = path.join(root, "Phase2Row.mjs");
    await fs.writeFile(file, compiled);
    const Phase2Row = (await import(pathToFileURL(file).href)).default;
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const plain = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    // running
    const run = (await text(base)).v;
    const html = renderToStaticMarkup(createElement(Phase2Row, { view: run, now: NOW }));
    assert.match(html, /data-phase2-row/);
    assert.match(html, /data-phase2-state="running"/);
    assert.match(html, /<span aria-hidden="true">●<\/span>/);
    const p = plain(html);
    assert.ok(p.startsWith("Phase 2 (paired dataset): ● Running Pages done: 56 of 144 Now: p057, boxes TS_2, TL_1. Last sign of life 12 s ago. Last accepted page: p056. Tokens: input 1,234,567"), p);
    assert.ok(p.endsWith("JSON viewer: status.json · history.jsonl"), p);
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
    assert.match(html2, /<li data-phase2-item="error"[^>]*class="break-words text-red-700">Error on p058, box TS_3: invalid JSON<span> <a [^>]*href="\/json\?path=book-store%2Fpaired-dataset%2Fruns%2Fp058%2Ffailed%2FTS_3\.json"[^>]*>File: book-store\/paired-dataset\/runs\/p058\/failed\/TS_3\.json<\/a><\/span><\/li>/);
    assert.ok(plain(html2).includes("Stop reason: Ctrl-C (Nov 11 08:40 PST, just now)."));

    // unreadable
    const bad = (await text("{ nope")).v;
    const html3 = renderToStaticMarkup(createElement(Phase2Row, { view: bad, now: NOW }));
    assert.ok(plain(html3).startsWith("Phase 2 (paired dataset): ? Status file unreadable The file status.json cannot be read as a JSON object."), plain(html3));

    // no view: the old line, with the old attribute
    for (const none of [null, undefined]) {
      const html4 = renderToStaticMarkup(createElement(Phase2Row, { view: none, now: NOW }));
      assert.match(html4, /^<p data-phase2-line[^>]*class="text-sm text-muted">Phase 2 \(paired dataset\): no run record yet\.<\/p>$/);
    }
  });

  // ---- wiring (source checks, because the page needs a server)
  const src = (rel) => fs.readFile(path.join(app, rel), "utf8");
  await check("wiring: loadMonitor adds phase2 and noRun counts it; MonitorData holds the key; the dashboard uses Phase2Row", async () => {
    const bs = await src("lib/book-status.ts");
    assert.match(bs, /const phase2 = await loadPhase2\(root, nowMs, pidAlive\);/);
    assert.match(bs, /noRun: lists\.length === 0 && statusFiles === 0 && phase2 === null, phase2 \}/);
    assert.match(await src("lib/book-status-rules.ts"), /phase2\?: Phase2View \| null;/);
    const md = await src("components/MonitorDashboard.tsx");
    assert.match(md, /<Phase2Row view=\{data\.phase2\} now=\{now\} \/>/);
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
