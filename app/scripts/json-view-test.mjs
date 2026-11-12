// VW89 (round 90): server-free tests of the JSON viewer helpers (Q-A 3:1.7, 3:1.8). VW92 (round 91): the guard accepts any build unit folder.
// Run: scripts/dev/cleanenv.sh node app/scripts/json-view-test.mjs (from the unit folder; the wrapper of the unit sets the unit variable and TMPDIR).
// Reads real pilot files read only from <T2>/data/pilot-run. Writes only below $TMPDIR (the sample phase 2 report in $TMPDIR/json-view-fixture).
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const app = path.resolve(import.meta.dirname, "..");
const u = await fs.realpath(path.dirname(app));
// [unit default VW92] The guard before VW92 accepted only the folder /opencode/r90/VW89 and the variable VW89_UNIT, so the test failed in every other unit folder.
// Now: the parent of the app folder is a build unit folder <TMP>/r<round>/<unit>, the wrapper of that unit names it in a variable <UNIT>_UNIT, and TMPDIR is <unit>/tmp.
// The test writes only below TMPDIR, so it cannot write into the app folder, into <V2>, or into <T2>.
assert.match(u, /\/opencode\/r\d+\/[A-Za-z0-9_-]+$/, "Run it inside a build unit folder");
assert.ok(Object.entries(process.env).some(([k, v]) => /^[A-Z]{2}\d+_UNIT$/.test(k) && v === u), "Use scripts/dev/cleanenv.sh of the unit");
assert.ok(process.env.TMPDIR, "Set TMPDIR (use scripts/dev/cleanenv.sh)");
const tmp = await fs.realpath(process.env.TMPDIR);
assert.equal(tmp, path.join(u, "tmp"));
globalThis.fetch = async () => { throw new Error("Network is disabled in the JSON viewer tests."); };
const appRequire = createRequire(path.join(app, "package.json"));
// The paths are found before the hooks start, because require.resolve runs the hooks too (a hook that calls it loops).
const reactUrl = Object.fromEntries(["react", "react/jsx-runtime", "react-dom/server"].map((s) => [s, pathToFileURL(appRequire.resolve(s)).href]));

const t2data = "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/data";
const run = "pilot-run/left_foot_full_p046/20261029T051154Z-r41";

// Fixture: a data folder with one sample phase 2 report. No real data. The test makes it fresh each time, below $TMPDIR, and removes it at the end.
// [unit default VW92] It is $TMPDIR/json-view-fixture. Before VW92 it was <unit>/fixture, which a unit also uses for its own browser check data.
const fixture = path.join(tmp, "json-view-fixture");
const data = path.join(fixture, "data");
await fs.rm(data, { recursive: true, force: true });
const store = path.join(data, "book-store/paired-dataset");
const pageRun = "book-store/paired-dataset/runs/sample_p001/20261109T000000Z-r90";
for (const d of ["report", "trends", "pages", "prompts/ED_1", "notes"]) await fs.mkdir(path.join(store, d), { recursive: true });
await fs.mkdir(path.join(data, pageRun, "critiques"), { recursive: true });
const sample = {
  schema: "phase2-report-v1",
  state: "translated",
  versions: { ED_1: "v2.1.1" },
  critiques: { used_ids: ["c1", "c2"], dropped_ids: ["c3"], share: 0.667 },
  cost: { known_usd: 1.25, missing_records: 0, total_usd: 1.25 },
  articles: [{ article: "a1", pages: ["sample_p001"] }],
  pages: [{ page_id: "sample_p001", state: "translated" }],
  trends: { ED_1: [0.5, 0.75] },
};
await fs.writeFile(path.join(store, "report/summary.json"), JSON.stringify(sample, null, 2));
await fs.writeFile(path.join(store, "trends/sample_p001.json"), JSON.stringify({ page_id: "sample_p001", points: [1, 2] }));
// The pointer field folder is relative to the Translator worktree (R32), so it starts with data/.
await fs.writeFile(path.join(store, "pages/sample_p001.json"), JSON.stringify({ page_id: "sample_p001", folder: `data/${pageRun}` }));
await fs.writeFile(path.join(store, "pages/escape.json"), JSON.stringify({ page_id: "escape", folder: "data/../../outside" }));
await fs.writeFile(path.join(data, pageRun, "critiques/reference.json"), JSON.stringify({ critiques: [] }));
await fs.writeFile(path.join(store, "prompts/ED_1/current"), "v2.1.1\n");
await fs.writeFile(path.join(store, "notes/bad.jsonl"), '{"utc":"2026-11-09T00:00:00Z","event":"start","n":1}\n{"utc": broken\n\n{"utc":"2026-11-09T00:01:00Z","event":"end"}\n');
await fs.writeFile(path.join(store, "notes/bad.json"), '{\n  "a": 1,\n  "b": \n}\n');
await fs.writeFile(path.join(store, "notes/picture.png"), "not a picture");
await fs.writeFile(path.join(store, "notes/.hidden.json"), "{}");
await fs.writeFile(path.join(store, "notes/big.json"), Buffer.alloc(5_000_001, 0x20));
const fixtureConfig = path.join(fixture, "viewer.config.json");
await fs.writeFile(fixtureConfig, JSON.stringify({ translatorDataDir: data, monitor: true }));
const pilotConfig = path.join(fixture, "viewer-pilot.config.json");
await fs.writeFile(pilotConfig, JSON.stringify({ translatorDataDir: t2data, monitor: true }));
process.env.VIEWER_CONFIG = fixtureConfig;

registerHooks({
  resolve(specifier, context, next) {
    // react and react-dom resolve from the app folder, also for the component that the test compiles into the sample folder (only a file outside node_modules needs the map)
    if (reactUrl[specifier] && !String(context.parentURL ?? "").includes("/node_modules/")) return next(reactUrl[specifier], context);
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier === "next/navigation") return { url: "data:text/javascript,export function notFound(){throw new Error('NOT_FOUND')} export function redirect(){throw new Error('REDIRECT')}", shortCircuit: true };
    if (specifier === "next/headers") return { url: "data:text/javascript,export function cookies(){throw new Error('No cookies in VW89 tests')} export function headers(){throw new Error('No headers in VW89 tests')}", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(pathToFileURL(path.join(app, specifier.slice(2)) + ".ts").href, context);
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !path.extname(specifier)) return next(new URL(specifier + ".ts", context.parentURL).href, context);
    return next(specifier, context);
  },
  load(url, context, next) { if (url.endsWith(".ts")) return { ...next(url, { ...context, format: "module-typescript" }), format: "module-typescript" }; return next(url, context); },
});
const v = await import("../lib/json-view.ts");
const { loadJsonView, phase2Reports } = await import("../lib/json-view-load.ts");
const { requireMonitor } = await import("../lib/monitor.ts");
const E = await import("../lib/json-error-text.ts");

let count = 0;
async function check(name, fn) { await fn(); count++; console.log("PASS " + name); }
const src = (rel) => fs.readFile(path.join(app, rel), "utf8");

// Pure helpers
await check("kindOfFile: json, jsonl, txt, current, other", () => {
  assert.equal(v.kindOfFile("a/summary.json"), "json");
  assert.equal(v.kindOfFile("a/calls.jsonl"), "jsonl");
  assert.equal(v.kindOfFile("report/summary.txt"), "text");
  assert.equal(v.kindOfFile("prompts/ED_1/current"), "text");
  assert.equal(v.kindOfFile("a/page.png"), null);
  assert.equal(v.kindOfFile("a/notcurrent"), null);
});
await check("jsonViewHref encodes the path", () => {
  assert.equal(v.jsonViewHref("pilot-run/a b/x.json"), "/json?path=pilot-run%2Fa%20b%2Fx.json");
});
await check("parseJsonText: error line and column", () => {
  const r = v.parseJsonText('{\n  "a": 1,\n  "b": \n}\n');
  assert.equal(r.ok, false);
  assert.equal(r.line, 4);
  assert.ok(r.error.length > 0);
});
// VW92: React error #418 on the JSON viewer page of a broken file. Node (server) and Firefox (browser) write different parse messages (VW91 browser check, engine-msg.log).
// The test makes the second engine: a JSON.parse that throws the Firefox text for every invalid text. A valid text parses as before.
const FIREFOX_MSG = "JSON.parse: expected property name or '}' at line 1 column 3 of the JSON data";
function asFirefox(fn) {
  const real = JSON.parse;
  JSON.parse = (t) => { try { return real(t); } catch { throw new SyntaxError(FIREFOX_MSG); } };
  try { return fn(); } finally { JSON.parse = real; }
}
const BAD_JSON = ['{\n  "a": 1,\n  "b": \n}\n', "[1,]", "", '{ "a": ', '{"a" 1}', '{\n\n  "x": tru\n}'];
await check("VW92 parseJsonText: line and column come from the own scan, the same on two engines", () => {
  for (const t of BAD_JSON) {
    const node = v.parseJsonText(t);
    const ff = asFirefox(() => v.parseJsonText(t));
    assert.equal(node.ok, false, t);
    assert.equal(ff.ok, false, t);
    assert.notEqual(node.error, ff.error, "the two engines write different messages: " + JSON.stringify(t));
    assert.equal(ff.error, FIREFOX_MSG);
    assert.deepEqual([node.line, node.column], [ff.line, ff.column], t);
    const at = v.firstErrorAt(t);
    assert.deepEqual([node.line, node.column], [v.lineAndColumn(t, at).line, v.lineAndColumn(t, at).column], t);
  }
  assert.deepEqual([v.parseJsonText("[1,]").line, v.parseJsonText("[1,]").column], [1, 4]);
});
await check("VW92 jsonErrorText: the words of Q-A 3:1.8 without the engine message", () => {
  assert.equal(E.jsonErrorText(4, 1), "This file is not valid JSON (line 4, column 1). The plain text follows.");
  assert.equal(E.jsonErrorText(null, null), "This file is not valid JSON. The plain text follows.");
  for (const t of BAD_JSON) {
    const node = v.parseJsonText(t);
    const ff = asFirefox(() => v.parseJsonText(t));
    const a = E.jsonErrorText(node.line, node.column);
    assert.equal(a, E.jsonErrorText(ff.line, ff.column));
    assert.ok(!a.includes(node.error) && !a.includes(FIREFOX_MSG) && !/JSON\.parse|at position|Expected|expected/.test(a), a);
  }
  const p = v.parseJsonText('{\n  "a": 1,\n  "b": \n}\n');
  assert.equal(E.jsonErrorText(p.line, p.column), "This file is not valid JSON (line 4, column 1). The plain text follows.");
});
await check("VW92 jsonlErrorText: 'Line 2 is not valid JSON (column 7)' on two engines", () => {
  const text = '{"a":1}\n{"a": broken\n\n{"b":2}\n';
  const node = v.parseJsonlText(text);
  const ff = asFirefox(() => v.parseJsonlText(text));
  assert.notEqual(node[1].error, ff[1].error);
  assert.equal(E.jsonlErrorText(node[1]), "Line 2 is not valid JSON (column 7)");
  assert.equal(E.jsonlErrorText(ff[1]), "Line 2 is not valid JSON (column 7)");
  assert.equal(E.jsonlErrorText({ line: 5, raw: "" }), "Line 5 is not valid JSON (column 1)");
});
await check("VW92 component JsonViewer: the HTML of a broken JSON file and of a broken JSONL file is the same on two engines (no React error #418)", async () => {
  const ts = appRequire("typescript");
  const compiled = ts.transpileModule(await fs.readFile(path.join(app, "components/JsonViewer.tsx"), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const file = path.join(tmp, "JsonViewer.test-build.mjs");
  await fs.writeFile(file, compiled);
  const JsonViewer = (await import(pathToFileURL(file).href)).default;
  const { createElement } = await import("react");
  const { renderToString } = await import("react-dom/server");
  const html = (kind, text) => renderToString(createElement(JsonViewer, { path: "x/y", kind, size: "0.001 MB", text }));
  const plain = (h) => h.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const badJson = '{\n  "a": 1,\n  "b": \n}\n';
  const badJsonl = '{"a":1}\n{"a": broken\n{"b":2}\n';
  for (const [kind, text, want] of [
    ["json", badJson, "This file is not valid JSON (line 4, column 1). The plain text follows."],
    ["jsonl", badJsonl, "Line 2 is not valid JSON (column 7)"],
  ]) {
    const a = html(kind, text);
    const b = asFirefox(() => html(kind, text));
    assert.equal(a, b, `${kind}: the server HTML and the browser HTML must be equal`);
    assert.ok(plain(a).includes(want), plain(a));
    assert.ok(!/JSON\.parse|at position|Expected property|expected property/.test(a), a);
  }
  // A good file still renders as a tree and as rows.
  assert.match(html("json", '{"a":1}'), /data-json-tree/);
  assert.match(html("jsonl", '{"a":1}\n'), /data-json-rows/);
  const src = await fs.readFile(path.join(app, "components/JsonViewer.tsx"), "utf8");
  assert.ok(!/\{json\.error\}|\{row\.error\}/.test(src), "JsonViewer.tsx must not print the message of the engine");
});
await check("firstErrorAt agrees with JSON.parse on good and bad texts", () => {
  const good = ['{}', '[]', '{"a":[1,-2.5e3,true,false,null,"x\\u00e9\\n"]}', ' 0 ', '"日本語"'];
  const bad = ['', '{', '[1,]', '{"a":1,}', '{"a" 1}', '01', '1.', '-', '"a\nb"', '"\\q"', '{"a":1} 2', 'tru', '{"a":"x'];
  for (const t of good) assert.equal(v.firstErrorAt(t), null, t);
  for (const t of bad) {
    assert.throws(() => JSON.parse(t));
    assert.equal(typeof v.firstErrorAt(t), "number", t);
  }
  assert.equal(v.firstErrorAt('[1,]'), 3);
});
await check("parseJsonlText: one bad line, blank lines skipped", () => {
  const rows = v.parseJsonlText('{"a":1}\r\n{"a": broken\n\n{"b":2}\n');
  assert.deepEqual(rows.map((r) => [r.line, r.ok]), [[1, true], [2, false], [4, true]]);
  assert.equal(rows[1].raw, '{"a": broken');
});
await check("rowTitle: first 3 keys", () => {
  assert.equal(v.rowTitle({}), "(empty record)");
  const t = v.rowTitle({ utc: "x", event: "start", n: 1, extra: true });
  assert.ok(t.includes("utc") && t.includes("event") && t.includes("n"));
  assert.ok(!t.includes("extra"));
});
await check("startsOpen: first 2 levels open, Open all, Close all", () => {
  assert.equal(v.OPEN_LEVELS, 2);
  assert.deepEqual([0, 1, 2].map((d) => v.startsOpen("default", d)), [true, true, false]);
  assert.equal(v.startsOpen("all", 9), true);
  assert.equal(v.startsOpen("none", 0), false);
});
await check("sortEntries: dot names hidden, folders first", () => {
  const e = (name, folder) => ({ name, path: name, folder, bytes: folder ? null : 1, kind: folder ? null : v.kindOfFile(name) });
  assert.deepEqual(v.sortEntries([e("b.json", false), e(".x", false), e("z", true), e("a.json", false)]).map((x) => x.name), ["z", "a.json", "b.json"]);
});
await check("pageFolderRel refuses ..", () => {
  assert.equal(v.pageFolderRel("data/a/b", "/root/data"), "a/b");
  assert.equal(v.pageFolderRel("data/../../x", "/root/data"), null);
  assert.equal(v.pageFolderRel(3, "/root/data"), null);
});

// Real pilot files, read only
process.env.VIEWER_CONFIG = pilotConfig;
await check("pilot summary.json opens as JSON and parses", async () => {
  const r = await loadJsonView(`${run}/summary.json`);
  assert.equal(r.view, "file");
  assert.equal(r.kind, "json");
  assert.equal(v.parseJsonText(r.text).ok, true);
});
await check("pilot calls.jsonl: every row parses", async () => {
  const r = await loadJsonView(`${run}/calls.jsonl`);
  assert.equal(r.kind, "jsonl");
  const rows = v.parseJsonlText(r.text);
  assert.ok(rows.length > 0);
  assert.ok(rows.every((x) => x.ok));
  assert.notEqual(v.rowTitle(rows[0].value), "(empty record)");
});
await check("pilot critiques/queue-ED_1.jsonl opens as JSONL", async () => {
  const r = await loadJsonView(`${run}/critiques/queue-ED_1.jsonl`);
  assert.equal(r.kind, "jsonl");
  assert.ok(v.parseJsonlText(r.text).every((x) => x.ok));
});
await check("pilot run folder lists folders first", async () => {
  const r = await loadJsonView(`${run}/`);
  assert.equal(r.view, "folder");
  assert.equal(r.path, run);
  assert.equal(r.reports, null);
  assert.ok(r.entries.some((x) => x.name === "summary.json" && x.kind === "json"));
  const firstFile = r.entries.findIndex((x) => !x.folder);
  assert.ok(r.entries.slice(firstFile).every((x) => !x.folder));
});
await check("real data folder today: no phase 2 report yet", async () => {
  const r = await loadJsonView("");
  assert.equal(r.view, "folder");
  assert.deepEqual(r.reports, []);
  assert.ok(r.entries.some((x) => x.name === "pilot-run" && x.folder));
});
await check("paths that leave the data folder are refused", async () => {
  for (const bad of ["../config/translator-models.yaml", "pilot-run/../../config", "/etc/hosts", "pilot-run/\0x.json"]) {
    const r = await loadJsonView(bad);
    assert.equal(r.view, "refused", bad);
    assert.ok(r.cause.length > 0);
  }
});
await check("missing path", async () => {
  assert.equal((await loadJsonView("pilot-run/no-such-file.json")).view, "missing");
});

// Sample phase 2 report that the test made
process.env.VIEWER_CONFIG = fixtureConfig;
await check("phase 2 report files come first: summary, trends, reference critiques", async () => {
  const items = await phase2Reports();
  assert.deepEqual(items.map((x) => [x.label, x.path, x.folder]), [
    ["Phase 2 report", "book-store/paired-dataset/report/summary.json", false],
    ["Phase 2 trends", "book-store/paired-dataset/trends", true],
    ["Reference critiques of sample_p001", `${pageRun}/critiques/reference.json`, false],
  ]);
  const root = await loadJsonView(undefined);
  assert.equal(root.reports.length, 3);
});
await check("sample phase 2 report opens and keeps its keys", async () => {
  const r = await loadJsonView("book-store/paired-dataset/report/summary.json");
  const p = v.parseJsonText(r.text);
  assert.equal(p.ok, true);
  assert.equal(p.value.schema, "phase2-report-v1");
  assert.deepEqual(Object.keys(p.value.cost), ["known_usd", "missing_records", "total_usd"]);
});
await check("prompt file current opens as text", async () => {
  const r = await loadJsonView("book-store/paired-dataset/prompts/ED_1/current");
  assert.equal(r.view, "file");
  assert.equal(r.kind, "text");
  assert.equal(r.text, "v2.1.1\n");
});
await check("bad JSONL line shows as not valid, others stay", async () => {
  const r = await loadJsonView("book-store/paired-dataset/notes/bad.jsonl");
  const rows = v.parseJsonlText(r.text);
  assert.deepEqual(rows.map((x) => x.ok), [true, false, true]);
  assert.equal(rows[1].line, 2);
});
await check("bad JSON gives an error, not a crash", async () => {
  const r = await loadJsonView("book-store/paired-dataset/notes/bad.json");
  assert.equal(v.parseJsonText(r.text).ok, false);
});
await check("other file type is not opened", async () => {
  assert.equal((await loadJsonView("book-store/paired-dataset/notes/picture.png")).view, "type");
});
await check("file over 5 MB is not read", async () => {
  const r = await loadJsonView("book-store/paired-dataset/notes/big.json");
  assert.equal(r.view, "big");
  assert.equal(r.bytes, 5_000_001);
});
await check("folder list hides dot names and links only openable files", async () => {
  const r = await loadJsonView("book-store/paired-dataset/notes");
  assert.ok(!r.entries.some((x) => x.name.startsWith(".")));
  assert.equal(r.entries.find((x) => x.name === "picture.png").kind, null);
});

// Monitor off: the page /json gives 404
await check("monitor off: requireMonitor gives NOT_FOUND, page calls it first", async () => {
  process.env.VIEWER_MONITOR = "off";
  await assert.rejects(requireMonitor(), /NOT_FOUND/);
  process.env.VIEWER_MONITOR = "on";
  await requireMonitor();
  const page = await src("app/json/page.tsx");
  const body = page.slice(page.indexOf("export default async function"));
  assert.ok(body.indexOf("await requireMonitor()") > 0);
  assert.ok(body.indexOf("await requireMonitor()") < body.indexOf("loadJsonView("));
});
await check("nav tab JSON viewer is a monitor tab", async () => {
  assert.match(await src("components/Nav.tsx"), /href: "\/json", label: "JSON viewer", monitor: true/);
});
await check("file paths on the 3 screens link to /json", async () => {
  for (const f of ["components/BookRow.tsx", "components/BookDetailView.tsx", "components/PageView.tsx"]) {
    const s = await src(f);
    assert.ok(s.includes("jsonViewHref("), f);
    // The page scan image keeps its src /api/file. No link (href) goes there any more.
    assert.ok(!/href=\{`\/api\/file/.test(s), f);
  }
});
await check("no new package", async () => {
  const pkg = JSON.parse(await src("package.json"));
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ["next", "react", "react-dom"]);
});

await fs.rm(fixture, { recursive: true, force: true });
console.log(`json-view tests: ${count} passed`);
