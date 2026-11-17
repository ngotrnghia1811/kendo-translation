// VW108 (round 94, card P43.1): server-free tests of the fallback model piece on the Monitor line and in the step view.
// Owner pick Q-A 3:71.3 row 1: "when a fallback model runs, the line adds "· fallback model 1 of 3: Fable 5.2 low". The step view gets the same piece.
// When the model of the role runs (no fallback yet), the line stays as today."
// Run: node scripts/vw108-test.mjs (from the app folder). The last line is "<n> passed, <m> failed".
// Made-up data only: a made-up page ID (c0ffee08/p002), made-up status objects, a made-up folder below TMPDIR. No server, no network.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, htmlText, installAppHooks, madeUpRoot, snapshot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
globalThis.fetch = async () => {
  throw new Error("Network is disabled in the VW108 tests.");
};
let fallbackTmp = null;
if (!process.env.TMPDIR) {
  fallbackTmp = path.join(app, "node_modules", ".vw108-tmp");
  await fs.mkdir(fallbackTmp, { recursive: true });
  process.env.TMPDIR = fallbackTmp;
}
installAppHooks(app);
const { check, done } = checker();

const F = await import("../lib/fallback-model.ts");
const UL = await import("../lib/update-live.ts");
const { loadUpdateLive } = await import("../lib/update-live-load.ts");
const { PHASE2_STORE } = await import("../lib/run-store.ts");
const React = createRequire(path.join(app, "package.json"))("react");
const { renderToStaticMarkup } = createRequire(path.join(app, "package.json"))("react-dom/server");
const { UpdateLiveBlock } = await import("../components/UpdateLiveBlock.tsx");

const NOW = Date.UTC(2026, 10, 17, 19, 0, 0) / 1000; // 2026-11-17T19:00:00Z = 2026-11-17 11:00 PST
const iso = (e) => new Date(e * 1000).toISOString().replace(".000Z", "Z");
const PAGE = "c0ffee08/p002";
const LABEL = "Made-up article eight, page 2 of 3 (c0ffee08/p002)";
// The shape that translator_run.py make_update_watch writes (TR93 keys plus the TR96 keys model, variant, step, steps).
const RU = {
  page: PAGE, box: "QA_1", role: "prompt-rewrite-optimizer", role_n: 3, roles: 4, tag: "QA_1-optimizer-try1", try: 2, card: "claude-aade7ca8",
  started_utc: iso(NOW - 900), try_started_utc: iso(NOW - 492), model: "claude-028c2ffe/claude-opus-5-5", variant: "medium", step: 0, steps: 3,
};
const OLD_RU = Object.fromEntries(Object.entries(RU).filter(([k]) => !["model", "variant", "step", "steps"].includes(k)));
const TODAY = "role 3 of 4 prompt-rewrite-optimizer (writes the new prompt) · try 2 on Claude card uonlp · 8 min 12 s";

/** The view of a running_update value through the status source, with no files of the update point folder. */
function live(ru, wait = null) {
  const base = UL.runningUpdateOf(ru);
  assert.ok(base, "runningUpdateOf gives a base");
  return UL.buildLive({ source: "status", base, now: NOW, scans: [], ended: new Set(), outcomes: new Map(), providerOf: () => null, wait, waitExtra: null });
}
const rowLine = (u) => UL.updateLines(u, NOW, { pageLabel: LABEL, place: "row", withWait: false }).find((l) => l.key === "update-now")?.text;
const stepLine = (u) => UL.updateLines(u, NOW, { pageLabel: null, place: "step", withWait: true }).find((l) => l.key === "update-now")?.text;

await check("readable model names: Claude, GPT and unknown IDs, with and without the provider part", () => {
  const cases = [
    ["claude-028c2ffe/claude-fable-5-2", "Fable 5.2"],
    ["claude-028c2ffe/claude-sonnet-5-5", "Sonnet 5.5"],
    ["claude-028c2ffe/claude-opus-5-5", "Opus 5.5"],
    ["claude-7f6d8610/claude-haiku-5-5", "Haiku 5.5"],
    ["claude-haiku-5-5", "Haiku 5.5"],
    ["openai/gpt-6.1-sol", "GPT-6.1 Sol"],
    ["openai/gpt-6", "GPT-6"],
    ["xai/grok-4.7", "grok-4.7"],
    ["gemini-web/4-hydrogen", "4-hydrogen"],
    ["google/antigravity-gemini-3.8-flash-high", "antigravity-gemini-3.8-flash-high"],
    ["claude-028c2ffe/claude-fable-5-2-preview", "claude-fable-5-2-preview"],
    ["plain-model", "plain-model"],
    ["x/", "x/"],
  ];
  for (const [id, want] of cases) assert.equal(F.readableModelName(id), want, id);
});

await check("fallbackOf: step 1, 2 and 3 give a value; the variant may be missing", () => {
  assert.deepEqual(F.fallbackOf({ ...RU, model: "claude-028c2ffe/claude-fable-5-2", variant: "low", step: 1 }), { model: "claude-028c2ffe/claude-fable-5-2", variant: "low", step: 1, steps: 3 });
  assert.deepEqual(F.fallbackOf({ model: "claude-028c2ffe/claude-sonnet-5-5", variant: "high", step: 2, steps: 3 }), { model: "claude-028c2ffe/claude-sonnet-5-5", variant: "high", step: 2, steps: 3 });
  assert.deepEqual(F.fallbackOf({ model: "openai/gpt-6.1-sol", variant: "medium", step: 3, steps: 3 }), { model: "openai/gpt-6.1-sol", variant: "medium", step: 3, steps: 3 });
  assert.deepEqual(F.fallbackOf({ model: "openai/gpt-6.1-sol", step: 3, steps: 3 }), { model: "openai/gpt-6.1-sol", variant: null, step: 3, steps: 3 });
  assert.deepEqual(F.fallbackOf({ model: "openai/gpt-6.1-sol", variant: "  ", step: 3, steps: 3 }).variant, null);
});

await check("fallbackOf: no value for step 0, an older status (no keys), and every wrong field; it never throws", () => {
  assert.equal(F.fallbackOf(RU), null, "step 0 is the model of the role");
  assert.equal(F.fallbackOf(OLD_RU), null, "older status.json without the TR96 keys");
  assert.equal(F.fallbackOf({ ...RU, step: 0, steps: 0 }), null, "a call without a ladder (the writer uses 0 for both)");
  const wrong = [
    { ...RU, step: 4 }, { ...RU, step: -1 }, { ...RU, step: 1.5 }, { ...RU, step: "1" }, { ...RU, step: null }, { ...RU, step: Number.NaN },
    { ...RU, step: 1, steps: 0 }, { ...RU, step: 1, steps: "3" }, { ...RU, step: 1, steps: 999 },
    { ...RU, step: 1, model: "" }, { ...RU, step: 1, model: null }, { ...RU, step: 1, model: 7 }, { ...RU, step: 1, model: "x".repeat(400) },
  ];
  for (const v of wrong) assert.equal(F.fallbackOf(v), null, JSON.stringify(v).slice(0, 120));
  for (const v of [null, undefined, 0, "text", [], [RU], true]) assert.equal(F.fallbackOf(v), null, String(v));
});

await check("fallbackText: the exact words of Q-A 3:71.3 row 1", () => {
  assert.equal(F.fallbackText({ model: "claude-028c2ffe/claude-fable-5-2", variant: "low", step: 1, steps: 3 }), "fallback model 1 of 3: Fable 5.2 low");
  assert.equal(F.fallbackText({ model: "openai/gpt-6.1-sol", variant: null, step: 3, steps: 3 }), "fallback model 3 of 3: GPT-6.1 Sol");
});

await check("Monitor line at step 0 and with an older status stays as today", () => {
  const today = `Now: update point after ${LABEL} · box QA_1 · ${TODAY}`;
  assert.equal(rowLine(live(RU)), today);
  assert.equal(rowLine(live(OLD_RU)), today);
  assert.equal(live(OLD_RU).fallback, null);
});

await check("Monitor line at step 1 (Claude card): the piece follows the try piece", () => {
  const u = live({ ...RU, step: 1, model: "claude-028c2ffe/claude-fable-5-2", variant: "low" });
  assert.equal(rowLine(u), `Now: update point after ${LABEL} · box QA_1 · role 3 of 4 prompt-rewrite-optimizer (writes the new prompt) · try 2 on Claude card uonlp · fallback model 1 of 3: Fable 5.2 low · 8 min 12 s`);
});

await check("Monitor line at step 2 (Claude) and step 3 (openai, no card)", () => {
  const two = live({ ...RU, role: "prompt-audit-judge", role_n: 4, tag: "QA_1-audit-try1", try: 1, card: "claude-028c2ffe", step: 2, model: "claude-028c2ffe/claude-haiku-5-5", variant: "xhigh" });
  assert.equal(rowLine(two), `Now: update point after ${LABEL} · box QA_1 · role 4 of 4 prompt-audit-judge (checks the new prompt) · try 1 on Claude card ntngh · fallback model 2 of 3: Haiku 5.5 xhigh · 8 min 12 s`);
  const three = live({ ...RU, try: 1, card: null, step: 3, model: "openai/gpt-6.1-sol", variant: "medium" });
  assert.equal(rowLine(three), `Now: update point after ${LABEL} · box QA_1 · role 3 of 4 prompt-rewrite-optimizer (writes the new prompt) · try 1 · fallback model 3 of 3: GPT-6.1 Sol medium · 8 min 12 s`);
});

await check("unknown model ID shows the ID after the provider part", () => {
  const u = live({ ...RU, step: 1, model: "xai/grok-9-mini", variant: "low" });
  assert.ok(rowLine(u).includes(" · fallback model 1 of 3: grok-9-mini low · 8 min 12 s"), rowLine(u));
});

await check("step view: the first line and the closed-page text get the same piece; step 0 stays as today", () => {
  const u = live({ ...RU, step: 1, model: "claude-028c2ffe/claude-fable-5-2", variant: "low" });
  assert.equal(stepLine(u), "role 3 of 4 prompt-rewrite-optimizer (writes the new prompt) · try 2 on Claude card uonlp · fallback model 1 of 3: Fable 5.2 low · 8 min 12 s");
  assert.equal(UL.updateSummaryText(u, NOW), "prompt update of box QA_1 · role 3 of 4 prompt-rewrite-optimizer (writes the new prompt) · try 2 on Claude card uonlp · fallback model 1 of 3: Fable 5.2 low · 8 min 12 s");
  assert.equal(stepLine(live(RU)), TODAY);
  assert.equal(UL.updateSummaryText(live(RU), NOW), `prompt update of box QA_1 · ${TODAY}`);
  const html = htmlText(renderToStaticMarkup(React.createElement(UpdateLiveBlock, { live: u, now: NOW })));
  assert.ok(html.includes("Working now : role 3 of 4") || html.includes("Working now: role 3 of 4"), html);
  assert.ok(html.includes("fallback model 1 of 3: Fable 5.2 low · 8 min 12 s"), html);
});

await check("between tries (content filter wait): the line shows the wait words, no fallback piece, no error", () => {
  const wait = { reason: "content filter", page: "p002", box: "QA_1", sinceEpoch: NOW - 60, untilEpoch: NOW + 240, source: "step", cards: [], calls: 1 };
  const u = live({ ...RU, step: 1, model: "claude-028c2ffe/claude-fable-5-2", variant: "low" }, wait);
  assert.equal(u.between, true);
  const line = rowLine(u);
  assert.equal(line, `Now: update point after ${LABEL} · box QA_1 · no call runs at this moment · role 3 of 4 prompt-rewrite-optimizer (writes the new prompt), the next try starts after the content filter wait`);
  assert.ok(!line.includes("fallback"));
  assert.ok(UL.updateLines(u, NOW, { pageLabel: null, place: "step", withWait: true }).length >= 2);
});

await check("folder rule (no key running_update) never shows the piece", () => {
  const base = { page: PAGE, box: "QA_1", role: null, roleN: null, roles: null, tag: null, tryN: null, card: null, startedEpoch: NOW - 900, tryStartedEpoch: null };
  const u = UL.buildLive({ source: "folder", base, now: NOW, scans: [], ended: new Set(), outcomes: new Map(), providerOf: () => null, wait: null, waitExtra: null });
  assert.equal(u.fallback, null);
  assert.ok(!rowLine(u).includes("fallback"));
});

await check("loader end to end: status.json with and without the TR96 keys, and a JSON round trip; the loader writes nothing", async () => {
  const { root } = await madeUpRoot("vw108-test-");
  await fs.mkdir(path.join(root, PHASE2_STORE.dir), { recursive: true });
  const before = await snapshot(root);
  const fb = await loadUpdateLive(root, PHASE2_STORE, { running_update: { ...RU, step: 1, model: "claude-028c2ffe/claude-fable-5-2", variant: "low" } }, NOW * 1000);
  assert.deepEqual(fb.fallback, { model: "claude-028c2ffe/claude-fable-5-2", variant: "low", step: 1, steps: 3 });
  const trip = JSON.parse(JSON.stringify(fb));
  assert.ok(rowLine(trip).includes("try 2 on Claude card uonlp · fallback model 1 of 3: Fable 5.2 low · 8 min 12 s"), rowLine(trip));
  const old = await loadUpdateLive(root, PHASE2_STORE, { running_update: OLD_RU }, NOW * 1000);
  assert.equal(old.fallback, null);
  assert.equal(rowLine(old), `Now: update point after ${LABEL} · box QA_1 · ${TODAY}`);
  const zero = await loadUpdateLive(root, PHASE2_STORE, { running_update: RU }, NOW * 1000);
  assert.equal(zero.fallback, null);
  assert.deepEqual(await snapshot(root), before);
});

await check("200 random running_update values: runningUpdateOf, buildLive and the lines never throw, and a piece shows only for a valid step", () => {
  let seed = 108;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (l) => l[Math.floor(rnd() * l.length)];
  const vals = [undefined, null, 0, 1, 2, 3, 4, -1, 1.5, "1", "", "low", [], {}, "claude-028c2ffe/claude-fable-5-2", "openai/gpt-6.1-sol", "x".repeat(300)];
  for (let i = 0; i < 200; i++) {
    const ru = { ...RU, model: pick(vals), variant: pick(vals), step: pick(vals), steps: pick(vals) };
    const u = live(ru);
    const line = rowLine(u);
    const valid = Number.isInteger(ru.steps) && ru.steps >= 1 && ru.steps <= 20 && Number.isInteger(ru.step) && ru.step >= 1 && ru.step <= ru.steps && typeof ru.model === "string" && ru.model.trim() !== "" && ru.model.length <= 160;
    assert.equal(line.includes("fallback model"), valid, JSON.stringify(ru).slice(0, 200));
    assert.equal(typeof UL.updateSummaryText(u, NOW), "string");
  }
});

done();
if (fallbackTmp) await fs.rm(fallbackTmp, { recursive: true, force: true });
