// VW96 (round 91, card P31.3): server-free tests of the readable names on all other screens and of the token fix
// (Q-A 3:17.4 "Apply this for EVERYTHING", Q-A 3:18.5 box codes stay with a hover, Q-A 3:20.2 "In = input + cache", Q-A 3:20.3 defaults D1-D5).
// Run: scripts/dev/cleanenv.sh node scripts/vw96-test.mjs (from the app folder; the wrapper sets TMPDIR).
// Part 1 tests the token short form and the 5-kind form. Part 2 tests the pure word helpers (lib/readable-names.ts, lib/title-of.ts).
// Part 3 tests the plain-line table of the JSON viewer (lib/json-view-lines.ts, D4). Part 4 writes a small made-up data folder below $TMPDIR
// (made-up 8-hex-digit IDs and made-up titles, the same field names and shapes as the files of the Translator) and calls the server loaders.
// No real data: the branch v2/viewer goes to a public repo (docs/agents/git.md "Ignored data"). The test reads no live data, starts no server,
// makes no network call, writes only below $TMPDIR, and removes its folder at the end. The last line is "<n> passed, <m> failed".
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

const app = path.resolve(import.meta.dirname, "..");
assert.ok(process.env.TMPDIR, "Set TMPDIR (use scripts/dev/cleanenv.sh)");
globalThis.fetch = async () => {
  throw new Error("Network is disabled in the VW96 tests.");
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

const V = await import("../lib/tokens-view.ts");
const R = await import("../lib/readable-names.ts");
const W = await import("../lib/run-view-words.ts");
const TO = await import("../lib/title-of.ts");
const L = await import("../lib/json-view-lines.ts");

// ---------------------------------------------------------------- part 1: tokens in with cache (Q-A 3:20.2)

// The two example calls of the owner question Q-A 3:20.2 (page 94380515/p002 of the real run), as made-up numbers of the same shape.
const CLAUDE = { input: 4, output: 17590, reasoning: null, cache_read: null, cache_write: 28671, calls: 1 };
const GEMINI = { input: 18675, output: 5699, reasoning: null, cache_read: null, cache_write: null, calls: 1 };

await check("tokens: the short label is one constant and reads 'Tokens in (with cache) / out'", () => {
  assert.equal(V.TOKENS_SHORT_LABEL, "Tokens in (with cache) / out");
  assert.match(V.TOKENS_SHORT_HELP, /input \+ cache read \+ cache write/);
});
await check("tokens: in = input + cache read + cache write (Claude call: 4 + 28,671 = 28,675)", () => {
  assert.equal(V.tokensIn(CLAUDE), 28675);
  assert.equal(V.tokensShort(CLAUDE), "28,675 / 17,590");
});
await check("tokens: a call with no cache keeps its input (Gemini call: 18,675 / 5,699)", () => {
  assert.equal(V.tokensIn(GEMINI), 18675);
  assert.equal(V.tokensShort(GEMINI), "18,675 / 5,699");
});
await check("tokens: cache read counts in too, and null kinds add nothing", () => {
  assert.equal(V.tokensIn({ input: 10, output: 1, reasoning: 0, cache_read: 90, cache_write: 5, calls: 1 }), 105);
  assert.equal(V.tokensIn({ input: null, output: 1, reasoning: null, cache_read: 7, cache_write: null, calls: 1 }), 7);
});
await check("tokens: no in-kind at all gives a dash, and null tokens give 'no token data'", () => {
  assert.equal(V.tokensIn({ input: null, output: 3, reasoning: null, cache_read: null, cache_write: null, calls: 1 }), null);
  assert.equal(V.tokensShort({ input: null, output: 3, reasoning: null, cache_read: null, cache_write: null, calls: 1 }), "– / 3");
  assert.equal(V.tokensShort(null), "no token data");
  assert.equal(V.NO_TOKEN_DATA, "no token data");
});
await check("tokens: a sum of two calls adds the in-kinds, and a kind that no call holds stays a dash", () => {
  const s = V.sumTokens([CLAUDE, GEMINI]);
  assert.ok(s.tokens);
  assert.equal(V.tokensShort(s.tokens), "47,350 / 23,289");
  assert.equal(s.tokens.cache_read, null);
  assert.equal(V.tokensKinds(s.tokens), "input 18,679 · output 23,289 · reasoning – · cache read – · cache write 28,671");
});
await check("tokens: the 5-kind form of a call shows all 5 kinds in the words of the phase 2 row (detail places, Q-A 3:15.2)", () => {
  assert.equal(V.tokensKinds(CLAUDE), "input 4 · output 17,590 · reasoning – · cache read – · cache write 28,671");
  assert.equal(V.tokensKinds(null), "no token data");
  assert.equal(V.tokensKinds({ input: 1, output: 2, reasoning: 3, cache_read: 4, cache_write: 5, calls: 1 }), "input 1 · output 2 · reasoning 3 · cache read 4 · cache write 5");
});
await check("tokens: the line of all books uses the new label and the new sum", () => {
  const s = V.sumTokens([CLAUDE, GEMINI]);
  assert.equal(V.allBooksText(s), "Tokens in (with cache) / out of all books: 47,350 / 23,289");
  assert.equal(V.allBooksText(V.sumTokens([])), "Tokens in (with cache) / out of all books: no token data");
});
await check("tokens: no USD in the token texts", () => {
  const all = [V.tokensShort(CLAUDE), V.tokensKinds(CLAUDE), V.tokensLine(CLAUDE), V.tokensBody(CLAUDE), V.TOKENS_SHORT_HELP, V.TOKENS_SHORT_LABEL].join(" ");
  assert.doesNotMatch(all, /\$|USD/);
});

// ---------------------------------------------------------------- part 2: readable names

await check("list: 'List started 2026-11-11 20:41 PST' for the stamp 20261112T044136Z (UTC to PST)", () => {
  assert.equal(R.listTitle("20261112T044136Z"), "List started 2026-11-11 20:41 PST");
  assert.equal(R.stampPst("20261112T044136Z"), "2026-11-11 20:41 PST");
  assert.equal(R.stampPst("nonsense"), null);
});
await check("list: a stamp of another form stays readable as 'List <text>'", () => {
  assert.equal(R.listTitle("old-list"), "List old-list");
});
await check("page run: 'Page run started ...' with the raw folder kept (the -r41 suffix is a constant of the Translator)", () => {
  const a = R.pageRunName("20261112T044149Z-r41");
  assert.equal(a.label, "Page run started 2026-11-11 20:41 PST");
  assert.equal(a.raw, "20261112T044149Z-r41");
  assert.equal(R.pageRunName("20261112T044149Z").label, "Page run started 2026-11-11 20:41 PST");
  assert.equal(R.pageRunName("odd-folder").label, "odd-folder");
});
await check("critic-only folder: 'Critic-only run started ...'", () => {
  assert.equal(R.criticFolderName("critic-separate-20261112T050000Z").label, "Critic-only run started 2026-11-11 21:00 PST");
  assert.equal(R.criticFolderName("critic-compare").label, "critic-compare");
});
await check("page number: p002 gives 'page 2', an article page ID too, another text stays", () => {
  assert.equal(R.pageNumberText("p002"), "page 2");
  assert.equal(R.pageNumberText("11112222/p012"), "page 12");
  assert.equal(R.pageNumberText("other"), "other");
  assert.equal(R.capFirst(R.pageNumberText("p001")), "Page 1");
});
await check("memory pair run ID: '<list stamp>/<page run folder>' gives the page run start in PST, the ISO form gives PST, other text gives null", () => {
  assert.equal(R.pairRunText("20261029T051152Z/20261029T054303Z-r41"), "Page run started 2026-10-28 21:43 PST");
  assert.equal(R.pairRunText("2026-11-04T00:15:00-08:00"), "2026-11-04 00:15 PST");
  assert.equal(R.pairRunText("something else"), null);
  assert.equal(R.pairRunText(null), null);
});
await check("critique label: the ID ends in the number of the critique on the page", () => {
  assert.equal(R.critiqueLabel("rdc-11112222-p002-01"), "Critique 1");
  assert.equal(R.critiqueLabel("rdc-11112222-p002-12"), "Critique 12");
  assert.equal(R.critiqueLabel("odd"), "Critique");
});
await check("book key: paired-dataset reads 'The phase 2 run', a book slug stays", () => {
  assert.equal(R.bookKeyLabel("paired-dataset"), "The phase 2 run");
  assert.equal(R.bookKeyLabel("sample_book"), "sample_book");
});
await check("critic mode: plain words with a hover that names the key, 'Not stored (older run)' for none", () => {
  assert.equal(R.criticModeWord("separate").label, "One critic session per box");
  assert.equal(R.criticModeWord("session").label, "One critic session per page");
  assert.equal(R.criticModeWord(null).label, "Not stored (older run)");
  assert.equal(R.criticModeWord(undefined).label, "Not stored (older run)");
  assert.equal(R.criticModeWord("weird").label, "weird");
  for (const m of ["separate", "session", null, "weird"]) assert.match(R.criticModeWord(m).help, /critic_mode/);
});
await check("book jobs: '1 book at a time', 'N books at a time', 'Not stored (older run)'", () => {
  assert.equal(R.bookJobsText(1), "1 book at a time");
  assert.equal(R.bookJobsText(3), "3 books at a time");
  assert.equal(R.bookJobsText(null), "Not stored (older run)");
});
await check("page kind: web and book get plain words", () => {
  assert.equal(R.pageKindWord("web").label, "Web article page");
  assert.equal(R.pageKindWord("book").label, "Book page");
  assert.equal(R.pageKindWord("").label, "–");
});
await check("states: every known list state and page state has a plain word that differs from the key", () => {
  for (const s of ["running", "paused", "paused after page", "completed", "completed with failures", "interrupted", "stopped", "failed"]) {
    const w = W.listStateWord(s);
    assert.ok(w.label && w.label !== s && w.help, `list state ${s}`);
  }
  for (const s of ["waiting", "running", "done", "failed", "interrupted", "skipped"]) {
    const w = W.pageStateWord(s);
    assert.ok(w.label && w.label !== s && w.help, `page state ${s}`);
  }
});
await check("page run status: completed gives 'Translated', no summary gives 'No summary yet'", () => {
  assert.equal(R.pageRunStatusWord("completed").label, "Translated");
  assert.equal(R.pageRunStatusWord("completed with failures").label, "Translated, with failures");
  assert.equal(R.pageRunStatusWord("no summary").label, "No summary yet");
  assert.match(R.pageRunStatusWord("no summary").help, /summary\.json/);
});
await check("chain state: a stopped chain keeps its reason text, other states use the list words", () => {
  assert.equal(R.chainStateWord("stopped at p014").label, "Stopped at p014");
  assert.equal(R.chainStateWord("completed").label, "Translated");
});
await check("verdict hover: PASS and FAIL stay as words, and the hover says what they mean", () => {
  assert.match(R.verdictHelp("PASS", 9.5), /accepted/);
  assert.match(R.verdictHelp("FAIL"), /did not accept/);
  assert.match(R.verdictHelp("PASS", 9.5), /score/);
  assert.doesNotMatch(R.verdictHelp("PASS"), /score/);
});
await check("critique group hover: TS, TL, ED and QA name the stage (source: messages.py via lib/box-names.ts)", () => {
  for (const g of ["TS", "TL", "ED", "QA"]) assert.match(R.groupHelp(g), new RegExp(`^${g}: critique group`));
  assert.equal(R.groupHelp("XX"), null);
});
await check("session ID: the last 6 characters, the short ID stays short", () => {
  assert.equal(R.sessionShort("ses_0123456789abcdef"), "…abcdef");
  assert.equal(R.sessionShort("ses_1"), "ses_1");
});
await check("model option: 'claude-haiku-5-5 (provider claude-aaaa1111)', value stays outside the text, no account email", () => {
  assert.deepEqual(R.modelOption("claude-aaaa1111/claude-haiku-5-5"), { label: "claude-haiku-5-5", provider: "claude-aaaa1111" });
  assert.equal(R.modelOptionText("claude-aaaa1111/claude-haiku-5-5"), "claude-haiku-5-5 (provider claude-aaaa1111)");
  assert.equal(R.modelOptionText("Other…"), "Other…");
  assert.equal(R.modelOptionText("plain-model"), "plain-model");
  const src = readFileSync(path.join(app, "lib", "readable-names.ts"), "utf8");
  assert.doesNotMatch(src, /@gmail|@outlook|@proton/);
});
await check("models text: 'L0 model high, L1 model xhigh' becomes 'Level 0: model high, Level 1: model xhigh'", () => {
  assert.equal(R.levelModelsText("L0 made-up-a high, L1 made-up-b xhigh, L3 made-up-c"), "Level 0: made-up-a high, Level 1: made-up-b xhigh, Level 3: made-up-c");
  assert.equal(R.levelModelsText("no levels here"), "no levels here");
});
await check("settings options: Yes/No, critic mode words, model with provider, other values stay", () => {
  assert.equal(R.optionText("memory.join_page_end", "true"), "Yes");
  assert.equal(R.optionText("memory.join_page_end", "false"), "No");
  assert.equal(R.optionText("run.critic_mode", "separate"), "One critic session per box");
  assert.equal(R.optionText("run.critic_mode", "session"), "One critic session per page");
  assert.equal(R.optionText("levels.2.model", "claude-aaaa1111/claude-haiku-5-5"), "claude-haiku-5-5 (provider claude-aaaa1111)");
  assert.equal(R.optionText("levels.0.variant", "high"), "high");
});
await check("title-of: exact item_id, first 8 hex digits, ambiguous prefix gives no title, other slug gives none", () => {
  const titles = new Map([
    ["11112222-0000-4000-8000-000000000001", "Made-up title one"],
    ["33334444-0000-4000-8000-000000000002", "Made-up twin"],
    ["33334444-1111-4000-8000-000000000003", "Made-up twin"],
    ["sample_book", "Made-up book"],
  ]);
  assert.equal(TO.titleOf(titles, "sample_book"), "Made-up book");
  assert.equal(TO.titleOf(titles, "11112222-0000-4000-8000-000000000001"), "Made-up title one");
  assert.equal(TO.titleOf(titles, "11112222"), "Made-up title one");
  assert.equal(TO.titleOf(titles, "33334444"), "");
  assert.equal(TO.titleOf(titles, "99999999"), "");
  assert.equal(TO.titleOf(titles, "1111222"), "");
  assert.equal(TO.titleOf(titles, "not_a_slug"), "");
});

// ---------------------------------------------------------------- part 3: plain line of the JSON viewer (D4)

const CTX = { titles: new Map([["11112222", "Made-up article one"]]) };
const P = "pilot-run/11112222_p002/20261112T044149Z-r41";
const LINES = [
  // [path, is folder, text that the line must contain]
  ["book-store/paired-dataset/status.json", false, "Status of the phase 2 run"],
  ["book-store/paired-dataset/history.jsonl", false, "History of the phase 2 run"],
  ["book-store/paired-dataset/book-memory.jsonl", false, "Book translation memory"],
  ["book-store/paired-dataset/pages/11112222_p002.json", false, 'page 2 of the article "Made-up article one" (11112222)'],
  ["book-store/paired-dataset/trends/11112222_p002.json", false, "Trend numbers"],
  ["book-store/paired-dataset/prompts/TL_2/v3.json", false, "Prompt version v3 of box TL_2"],
  ["book-store/paired-dataset/prompts/TL_2/current", false, "current prompt version of box TL_2"],
  ["book-store/paired-dataset/rubric-tables/changes.jsonl", false, "Changes of the rubric tables"],
  ["book-store/paired-dataset/rubric-tables/QA_3/v2.json", false, "Rubric table version v2 of box QA_3"],
  ["book-store/paired-dataset/update-points/11112222_p002/commit-TL_2.json", false, "Prompt update of box TL_2 after page 2"],
  ["book-store/paired-dataset/update-points/11112222_p002/raw/TL_2-optimizer-try1.json", false, "Raw reply of the optimizer step for box TL_2"],
  ["book-store/paired-dataset/update-points/11112222_p002/parsed/TL_2-judge-CG-U1.json", false, "Parsed reply of the judge step for box TL_2"],
  ["book-store/paired-dataset/update-points/11112222_p002/messages/TL_2-grouper.txt", false, "Message of the grouper step for box TL_2"],
  ["book-store/paired-dataset/report/summary.json", false, "Report of the phase 2 run"],
  ["pilot-run/lists/20261112T044136Z/progress.json", false, "Progress of the list started 2026-11-11 20:41 PST"],
  ["pilot-run/lists/20261112T044136Z/list.json", false, "Start settings of the list started 2026-11-11 20:41 PST"],
  ["pilot-run/lists/20261112T044136Z/list-summary.json", false, "Summary of the list started 2026-11-11 20:41 PST"],
  [`${P}/calls.jsonl`, false, "Model calls of the page run started 2026-11-11 20:41 PST"],
  [`${P}/summary.json`, false, "Summary of the page run"],
  [`${P}/run.json`, false, "Start settings of the page run"],
  [`${P}/results/TL_1.json`, false, "Result of box TL_1"],
  [`${P}/messages/box-critic.TL_1.txt`, false, "critic of box TL_1"],
  [`${P}/critiques/reference.json`, false, "Reference critiques"],
  ["item-metadata/items.filled.jsonl", false, "draft, not checked by the owner"],
];
await check("json lines: the known files get a plain line that contains the expected words (D4 table)", () => {
  for (const [rel, folder, want] of LINES) {
    const line = L.plainLine(rel, folder, CTX);
    assert.ok(line.includes(want), `${rel} -> ${line}`);
  }
});
await check("json lines: the example of the owner brief, status.json gives 'Status of the phase 2 run'", () => {
  assert.equal(L.plainLine("book-store/paired-dataset/status.json", false, CTX), "Status of the phase 2 run");
});
await check("json lines: folders get a line too (page run folder, list folder, store, data root)", () => {
  assert.equal(L.plainLine("", true, CTX), "The Translator data folder: all run files that the Viewer reads");
  assert.equal(L.plainLine("book-store/paired-dataset", true, CTX), "Store of the phase 2 run");
  assert.equal(L.plainLine("pilot-run/lists/20261112T044136Z", true, CTX), "List started 2026-11-11 20:41 PST");
  assert.equal(L.plainLine(P, true, CTX), 'Page run started 2026-11-11 20:41 PST, page 2 of the article "Made-up article one" (11112222)');
});
await check("json lines: an article with no title says '(title not found)', a book page names the book", () => {
  assert.match(L.plainLine("pilot-run/aaaabbbb_p003/20261112T044149Z-r41/run.json", false, CTX), /aaaabbbb \(title not found\)/);
  assert.match(L.plainLine("pilot-run/sample_book_p067/20261029T000000Z-r41/calls.jsonl", false, CTX), /page 67 of the book sample_book/);
});
await check("json lines: an unknown file and an unknown folder get a short fallback line built from the path", () => {
  assert.equal(L.plainLine("whatever/unknown.json", false, CTX), 'File "unknown.json" inside "whatever"');
  assert.equal(L.plainLine("unknown-folder", true, CTX), 'Folder "unknown-folder" of the Translator data folder');
});
await check("json lines: no line is empty, none holds a semicolon or an em-dash, none shows 'undefined'", () => {
  for (const [rel, folder] of LINES.map((x) => [x[0], x[1]]).concat([["", true], ["x/y.json", false], ["a", true]])) {
    const line = L.plainLine(rel, folder, CTX);
    assert.ok(line.length > 8, rel);
    assert.doesNotMatch(line, /[;—]|undefined|null/, `${rel} -> ${line}`);
  }
});

// ---------------------------------------------------------------- part 4: server loaders on a made-up data folder

function listing(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(`${path.relative(dir, p)}:${statSync(p).size}:${statSync(p).mtimeMs}`);
    }
  };
  walk(dir);
  return out.sort().join("\n");
}

const S2 = "20261112T044136Z";
const OLD = "20261026T182511Z";
const pageRow = (page_id, state) => ({ page_id, kind: "web", state, status: null, folder: null, calls_total: 24, calls_done: 0, calls_skipped: 0, calls_failed: 0, running: [], filter_blocks: 0, alt_tries: 0, flagged: [], seconds_sum: 0, calls_timed: 0, started_epoch: null, ended_epoch: null, tokens: { input: 0, output: 0, reasoning: 0, cache_read: 0, cache_write: 0 } });
const progress = (stamp, state, pages, extra = {}) => ({
  list: "made-up list", list_dir: `data/pilot-run/lists/${stamp}`, levels: "0-3", jobs: 1, page_jobs: 1, started_utc: stamp, max_usd: null,
  schema: "progress-v1", state, started_epoch: Date.UTC(2026, 10, 12) / 1000, updated_epoch: Date.UTC(2026, 10, 12, 5) / 1000,
  calls_total: pages.length * 24, calls_done: 0, calls_failed: 0, calls_flagged: 0, pages_total: pages.length, pages_done: 0, pages, ...extra,
});
const ITEMS = [
  { item_id: "11112222-0000-4000-8000-000000000001", kind: "web-article", title_en: "Made-up article one", title_ja: "試験記事 一", status: "draft, not checked by the owner" },
  { item_id: "55556666-0000-4000-8000-000000000002", kind: "web-article", title_en: "Made-up pilot article", title_ja: "試験記事 二", status: "draft, not checked by the owner" },
];
const ORDER = ["11112222/p001", "11112222/p002", "11112222/p003"];

await check("no real data: the folder scripts/fixtures does not exist in the app", () => assert.equal(existsSync(path.join(app, "scripts", "fixtures")), false));

const root = await fs.mkdtemp(path.join(process.env.TMPDIR, "vw96-"));
try {
  await fs.mkdir(path.join(root, "item-metadata"), { recursive: true });
  await fs.writeFile(path.join(root, "item-metadata", "items.filled.jsonl"), ITEMS.map((r) => JSON.stringify(r)).join("\n") + "\n");
  const lists = {
    [S2]: progress(S2, "running", ORDER.map((id) => pageRow(id, "waiting")), { kind: "book-run", book: "paired-dataset", phase: "agent-phase-2", book_jobs: 1, paused_since_epoch: null, pause_file: "x/PAUSE", pause_seconds_total: 0, paused_since_utc: null }),
    [OLD]: progress(OLD, "completed", [pageRow("55556666/p001", "done")]),
  };
  for (const [stamp, prog] of Object.entries(lists)) {
    await fs.mkdir(path.join(root, "pilot-run", "lists", stamp), { recursive: true });
    await fs.writeFile(path.join(root, "pilot-run", "lists", stamp, "progress.json"), JSON.stringify(prog));
  }
  const cfg = path.join(root, "viewer.config.json");
  await fs.writeFile(cfg, JSON.stringify({ translatorDataDir: root, monitor: true }));
  process.env.VIEWER_CONFIG = cfg;
  const before = listing(root);
  const RL = await import("../lib/readable-load.ts");
  const LL = await import("../lib/json-view-lines-load.ts");

  await check("page names: an article page gets its title and 'page 2 of 3' from the newest phase 2 list", async () => {
    const n = await RL.loadPageNames("11112222", "p002", "");
    assert.deepEqual(n, { shortId: "11112222", title: "Made-up article one", titleFound: true, pageOf: "page 2 of 3" });
  });
  await check("page names: an article with no title keeps the short ID and gives no title", async () => {
    const n = await RL.loadPageNames("99999999", "p001", "");
    assert.equal(n.shortId, "99999999");
    assert.equal(n.title, null);
    assert.equal(n.titleFound, false);
    assert.equal(n.pageOf, "page 1");
  });
  await check("page names: a book page gets the book title and its page number", async () => {
    const n = await RL.loadPageNames("sample_book", "p046", "Made-up book");
    assert.deepEqual(n, { shortId: null, title: "Made-up book", titleFound: true, pageOf: "page 46" });
    const none = await RL.loadPageNames("sample_book", "p046", "");
    assert.equal(none.title, null);
  });
  await check("page labels: the Run settings panel gets 'Title, page n of m' for the IDs in the form that the panel holds", async () => {
    const labels = await RL.loadPageLabels(["11112222_p003", "11112222/p001", null, "sample_book/p002", "garbage"]);
    assert.equal(labels["11112222_p003"], "Made-up article one, page 3 of 3");
    assert.equal(labels["11112222/p001"], "Made-up article one, page 1 of 3");
    assert.equal(labels["sample_book/p002"], "page 2");
    assert.equal("garbage" in labels, false);
  });
  await check("json lines (server): titles come from items.filled.jsonl for the article IDs of the path", async () => {
    const r = await LL.loadPlainLines("pilot-run/11112222_p002", true, [{ path: "pilot-run/11112222_p002/20261112T044149Z-r41", folder: true }]);
    assert.equal(r.line, 'Page runs of page 2 of the article "Made-up article one" (11112222)');
    assert.equal(r.entries["pilot-run/11112222_p002/20261112T044149Z-r41"], 'Page run started 2026-11-11 20:41 PST, page 2 of the article "Made-up article one" (11112222)');
    const none = await LL.loadPlainLines("pilot-run/99999999_p001/20261112T044149Z-r41/calls.jsonl", false);
    assert.match(none.line, /99999999 \(title not found\)/);
  });
  await check("monitor: the old pilot row with an 8-hex slug (55556666) gets its title from the full item ID", async () => {
    const { loadMonitor } = await import("../lib/book-status.ts");
    const d = await loadMonitor(Date.parse("2026-11-12T05:10:00Z"));
    const row = d.rows.find((r) => r.slug === "55556666");
    assert.ok(row, d.rows.map((r) => r.slug).join(","));
    assert.equal(row.title, "Made-up pilot article");
    assert.notEqual(row.title, row.slug);
  });
  await check("lists page: a phase 2 list summary holds the phase 2 flag, an old list does not", async () => {
    const { listRuns } = await import("../lib/runs.ts");
    const runs = await listRuns();
    const a = runs.find((r) => r.stamp === S2);
    const b = runs.find((r) => r.stamp === OLD);
    assert.ok(a && b);
    assert.equal(a.phase2List, true);
    assert.equal(b.phase2List, false);
  });
  await check("the loaders write no file below the data folder", async () => {
    assert.equal(listing(root), before);
  });
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------- part 5: rules that the source must keep

const read = (rel) => readFileSync(path.join(app, rel), "utf8");
await check("settings: the field 'Cost limit per page' stays (owner pick Q-A 3:17.3, later unit P32)", () => {
  const s = read("lib/settings-schema.ts");
  assert.match(s, /run\.max_usd_per_page/);
  assert.match(s, /Cost limit per page/);
});
await check("the admin 'readers see' line in HtvPageSection.tsx stays as it was (it waits for the first book run)", () => {
  assert.match(read("components/HtvPageSection.tsx"), /readers see/i);
});
await check("the short form label is used from the constant on every screen file, not typed again", () => {
  for (const f of ["components/RunsTable.tsx", "components/BookRow.tsx", "components/StepTree.tsx"]) {
    const s = read(f);
    assert.doesNotMatch(s, /Tokens in \/ out/, f);
    assert.match(s, /TOKENS_SHORT_LABEL/, f);
  }
  assert.doesNotMatch(read("lib/step-data.ts"), /Tokens in \/ out/);
});
await check("the Lists page shows the readable list name and keeps the raw stamp in small grey text", () => {
  const s = read("components/RunsTable.tsx");
  assert.match(s, /listTitle\(r\.stamp\)/);
  assert.match(s, /<RawId[^>]*>\{r\.stamp\}<\/RawId>/);
});
await check("the step view shows the model with its provider in plain words (tree line and step data row)", () => {
  assert.match(read("components/StepTree.tsx"), /modelOptionText\(step\.model\)/);
  assert.match(read("lib/step-data.ts"), /modelOptionText\(str\(r\.model\) as string\)/);
});
await check("the Details view line and note send box codes through BoxText (hover name)", () => {
  const s = read("components/BookDetailView.tsx");
  assert.match(s, /<BoxText text=\{sentence\} \/>/);
  assert.match(s, /<BoxText text=\{row\.note\} \/>/);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
