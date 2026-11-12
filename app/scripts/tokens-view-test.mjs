// VW93 (round 91): server-free tests of the token text of the Viewer screens (Q-A 3:15.2 "Short in tables, all 5 in details", Q-A 3:15.3 "Show 'no token data'").
// Run: scripts/dev/cleanenv.sh node scripts/tokens-view-test.mjs (from the app folder). Plain `node scripts/tokens-view-test.mjs` works too.
// It tests lib/tokens-sum.ts, lib/tokens-view.ts, the token keys of lib/runs.ts-style parsing, the Monitor rows of lib/book-status-rules.ts,
// and a source scan of the screen files. It reads no real data, starts no server, makes no network call, and writes no file.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

const app = path.resolve(import.meta.dirname, "..");
globalThis.fetch = async () => { throw new Error("Network is disabled in the token tests."); };
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(pathToFileURL(path.join(app, specifier.slice(2)) + ".ts").href, context);
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !path.extname(specifier)) return next(new URL(specifier + ".ts", context.parentURL).href, context);
    return next(specifier, context);
  },
  load(url, context, next) { if (url.endsWith(".ts")) return { ...next(url, { ...context, format: "module-typescript" }), format: "module-typescript" }; return next(url, context); },
});
const S = await import("../lib/tokens-sum.ts");
const V = await import("../lib/tokens-view.ts");
const P = await import("../lib/phase2-row.ts");
const R = await import("../lib/book-status-rules.ts");
const C = await import("../lib/chain.ts");

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL ${name}\n  ${String(e?.message ?? e).split("\n").join("\n  ")}`);
  }
}

const BIG = { input: 1234567, output: 345678, reasoning: 12345, cache_read: 98765432, cache_write: 1234567, calls: 432 };
const LINE = "Tokens: input 1,234,567 · output 345,678 · reasoning 12,345 · cache read 98,765,432 · cache write 1,234,567 · 432 calls";

// ---------------------------------------------------------------- formats
await check("short format: 'Tokens in / out' label and '1,234,567 / 345,678' (input / output)", () => {
  assert.equal(V.TOKENS_SHORT_LABEL, "Tokens in / out");
  assert.equal(V.tokensShort(BIG), "1,234,567 / 345,678");
  assert.equal(V.tokensShort({ ...BIG, output: null }), "1,234,567 / –");
});
await check("5-kind format: the exact words and order of the phase 2 row, from tokensText of lib/phase2-row.ts", () => {
  assert.equal(V.tokensLine(BIG), LINE);
  assert.equal(P.tokensText(BIG), LINE);
  assert.equal(V.tokensBody(BIG), LINE.slice("Tokens: ".length));
  assert.equal("Tokens: " + V.tokensBody(BIG), P.tokensText(BIG));
  assert.deepEqual(V.TOKEN_KIND_HEADS, ["input", "output", "reasoning", "cache read", "cache write"]);
  assert.equal(V.tokenCell(BIG, "cache_read"), "98,765,432");
  assert.equal(V.tokensLine({ ...BIG, calls: 1 }), LINE.replace("432 calls", "1 call"));
});
await check("phase 2 row output stays as it was: tokensText(null) is 'Tokens: not recorded yet'", () => {
  assert.equal(P.tokensText(null), "Tokens: not recorded yet");
});

// ---------------------------------------------------------------- no token data
await check("no token data: a missing, empty, or wrong key gives null, and every format gives 'no token data'", () => {
  for (const v of [undefined, null, 5, "x", [], {}, { input: "1" }, { input: -3 }]) assert.equal(S.tokenCounts(v, 10), null, JSON.stringify(v));
  assert.equal(V.NO_TOKEN_DATA, "no token data");
  assert.equal(V.tokensShort(null), "no token data");
  assert.equal(V.tokensLine(null), "no token data");
  assert.equal(V.tokensBody(null), "no token data");
  assert.equal(V.allBooksText({ tokens: null, missing: 4 }), "Tokens in / out of all books: no token data");
});
await check("tokenCounts: the key calls wins, else the argument. Zero counts are data, not 'no token data'", () => {
  assert.deepEqual(S.tokenCounts({ input: 1, output: 2, reasoning: 3, cache_read: 4, cache_write: 5, calls: 6 }, 99), { input: 1, output: 2, reasoning: 3, cache_read: 4, cache_write: 5, calls: 6 });
  assert.deepEqual(S.tokenCounts({ input: 1, output: 2, reasoning: 3, cache_read: 4, cache_write: 5 }, 7), { input: 1, output: 2, reasoning: 3, cache_read: 4, cache_write: 5, calls: 7 });
  const zero = S.tokenCounts({ input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 }, 0);
  assert.ok(zero !== null);
  assert.equal(V.tokensShort(zero), "0 / 0");
});

// ---------------------------------------------------------------- a mixed run (calls.jsonl)
await check("mixed run: the sum of the calls with tokens, the program and search rows skipped, and the note '(1 call without token data)'", () => {
  const rows = [
    { kind: "model", tag: "TS_0", model: "program", tokens: { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 } },
    { kind: "search", tag: "dictionary_lookup.TL_0", embed_tokens: 84611 },
    { kind: "model", tag: "TL_0", model: "m", tokens: { input: 1000, output: 200, reasoning: 30, cache_read: 4000, cache_write: 5 } },
    { kind: "model", tag: "ED_0", model: "m", tokens: { input: 2000, output: 300, reasoning: 0, cache_read: 0, cache_write: 6 } },
    { kind: "model", tag: "QA_0", model: "m" },
    "broken",
    null,
  ];
  const s = S.callsTokens(rows);
  assert.deepEqual(s, { tokens: { input: 3000, output: 500, reasoning: 30, cache_read: 4000, cache_write: 11, calls: 2 }, missing: 1 });
  assert.equal(V.missingNote(s, "call", "calls"), " (1 call without token data)");
  assert.equal(V.tokensLine(s.tokens), "Tokens: input 3,000 · output 500 · reasoning 30 · cache read 4,000 · cache write 11 · 2 calls");
  assert.equal(V.missingNote({ ...s, missing: 3 }, "call", "calls"), " (3 calls without token data)");
});
await check("a run with no model call (an old plan folder: search rows only) gives no token data and no note", () => {
  const s = S.callsTokens([{ kind: "search", tag: "x" }, { kind: "model", model: "program", tokens: { input: 0 } }]);
  assert.deepEqual(s, { tokens: null, missing: 0 });
  assert.equal(V.tokensLine(s.tokens), "no token data");
  assert.equal(V.missingNote(s, "call", "calls"), "");
});
await check("a run where no model call has tokens gives no token data, and the note stays empty (the whole place says it)", () => {
  const s = S.callsTokens([{ kind: "model", model: "m" }, { kind: "model", model: "m" }]);
  assert.deepEqual(s, { tokens: null, missing: 2 });
  assert.equal(V.missingNote(s, "call", "calls"), "");
});
await check("sumTokens: a kind that is null in every part stays null, a known kind adds", () => {
  const s = S.sumTokens([{ input: 1, output: null, reasoning: null, cache_read: null, cache_write: null, calls: null }, { input: 2, output: null, reasoning: null, cache_read: null, cache_write: null, calls: 1 }, null]);
  assert.deepEqual(s, { tokens: { input: 3, output: null, reasoning: null, cache_read: null, cache_write: null, calls: 1 }, missing: 1 });
});

// ---------------------------------------------------------------- lists and Monitor rows
const OLD_PAGE = { page_id: "bk/p001", state: "done", models_usd: 2.5, calls_done: 20, started_epoch: 1000, ended_epoch: 1600 };
const NEW_PAGE = { page_id: "bk/p002", state: "done", models_usd: 0, calls_done: 24, started_epoch: 2000, ended_epoch: 2600, tokens: { input: 106614, output: 117957, reasoning: 135396, cache_read: 16938, cache_write: 225985 } };
const list = (stamp, pages, extra = {}) => ({ stamp, progress: { state: "completed", pages, ...extra }, list: null, summary: null, pauseExists: false });

await check("a list without tokens: progress.json with no key tokens gives null (Lists page `/runs` and the run view show 'no token data')", () => {
  const progress = { state: "completed", calls_done: 52, cost_models_usd: 5.48, cost_listed_usd: 9.1, pages: [OLD_PAGE] };
  assert.equal(S.tokenCounts(progress.tokens, progress.calls_done), null);
  assert.equal(V.tokensShort(S.tokenCounts(progress.tokens, progress.calls_done)), "no token data");
  const fresh = { calls_done: 48, tokens: { input: 214714, output: 116642, reasoning: 206260, cache_read: 21042, cache_write: 310637 } };
  assert.equal(V.tokensLine(S.tokenCounts(fresh.tokens, fresh.calls_done)), "Tokens: input 214,714 · output 116,642 · reasoning 206,260 · cache read 21,042 · cache write 310,637 · 48 calls");
});
await check("Monitor derived row: an old list only gives tokens null; an old and a new list give the sum and 1 page run without token data", () => {
  const old = R.deriveFacts("bk", [list("20261026T000000Z", [OLD_PAGE])]);
  assert.deepEqual(old.tokens, { tokens: null, missing: 1 });
  const mixed = R.deriveFacts("bk", [list("20261026T000000Z", [OLD_PAGE]), list("20261112T000000Z", [NEW_PAGE])]);
  assert.deepEqual(mixed.tokens, { tokens: { ...NEW_PAGE.tokens, calls: 24 }, missing: 1 });
  assert.equal(mixed.costUsd, 2.5, "the USD field stays in the data");
});
await check("Monitor summary line: 'Tokens in / out of all books', Not started rows do not count as missing", () => {
  const row = (group, tokens) => ({ group, tokens, errorCount: 0, cost: 1 });
  const t = { input: 1000, output: 20, reasoning: 0, cache_read: 0, cache_write: 0, calls: 3 };
  const sum = R.summarize([row("Running", t), row("Stopped", { ...t, input: 234 }), row("Stopped", null), row("Not started", null)]);
  assert.deepEqual(sum.tokens, { tokens: { input: 1234, output: 40, reasoning: 0, cache_read: 0, cache_write: 0, calls: 6 }, missing: 1 });
  assert.equal(V.allBooksText(sum.tokens), "Tokens in / out of all books: 1,234 / 40 (1 book without token data)");
  assert.equal(V.allBooksText(R.summarize([row("Running", t)]).tokens), "Tokens in / out of all books: 1,000 / 20");
  assert.equal(sum.costUsd, 4, "the USD field stays in the data");
});
await check("critic-only summary and compare totals: the key tokens with model_calls or calls as the calls count", () => {
  const co = C.parseCriticOnlySummary("critic-separate-20261028T134135Z", { tokens: { input: 64, output: 7447, reasoning: 2559, cache_read: 0, cache_write: 54259 }, model_calls: 16 });
  assert.equal(V.tokensLine(co.tokens), "Tokens: input 64 · output 7,447 · reasoning 2,559 · cache read 0 · cache write 54,259 · 16 calls");
  assert.equal(C.parseCriticOnlySummary("critic-separate-x", { model_calls: 3 }).tokens, null);
});

// ---------------------------------------------------------------- source scan of the screens
await check("no screen file shows USD or a dollar amount: no usd( or money( call, no 'USD', no 'Cost (', no '$' before a number", async () => {
  const dir = path.join(app, "components");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".tsx"));
  const bad = [];
  for (const f of files) {
    const s = await fs.readFile(path.join(dir, f), "utf-8");
    if (/\busd\(|\bmoney\(|USD|Cost \(|Model cost of all books|"\$"|>\$\{|\$\d/.test(s)) bad.push(f);
  }
  assert.deepEqual(bad, []);
  const store = await fs.readFile(path.join(dir, "extras-store.ts"), "utf-8");
  assert.ok(store.includes('label: "Tokens and seconds per call"') && !store.includes("Cost and seconds per call"));
});
await check("one formatter: lib/tokens-view.ts uses tokensText and thousands of lib/phase2-row.ts, and no other file formats the 5 kinds", async () => {
  const view = await fs.readFile(path.join(app, "lib/tokens-view.ts"), "utf-8");
  assert.ok(/import \{ thousands, tokensText \} from "\.\/phase2-row";/.test(view));
  const hits = [];
  for (const sub of ["components", "lib"]) {
    for (const f of await fs.readdir(path.join(app, sub))) {
      if (!/\.(ts|tsx)$/.test(f) || f === "phase2-row.ts") continue;
      // Comments may quote the line as an example. Only code counts.
      const s = (await fs.readFile(path.join(app, sub, f), "utf-8")).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      if (/cache read \$\{|· cache write/.test(s)) hits.push(f);
    }
  }
  assert.deepEqual(hits, []);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
