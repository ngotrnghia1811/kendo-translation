// VW122 (round 113, card P61.2): server-free tests of the Run settings of one book (Q-A 3:110.3, Q-A 3:112.3 rows 1 to 6, 9 and 11).
// Owner words (Q-A 3:109.5, 2026-11-21): "I want to be able to set the config of each run, before pressing run button in `http://localhost:3000/monitor/etiqu1_full`".
//   part 1  lib/book-settings-rules.ts: the name check, the labels, the merge view (book over global), the words
//   part 2  lib/book-settings.ts with a made-up config folder: save (exact file bytes, history line), Use global, last key, lock, broken files
//   part 3  the route (lib/book-settings-api.ts): the checks, the Monitor switch off, a name or a book that does not exist
//   part 4  the components as HTML: the closed section, the field lines, the value list of the dialogs
//   part 5  the sources: the global panel files are byte for byte as at the base, the form is built from the schema, the dialogs call the list
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw122-test.mjs. The last line is "<n> passed, <m> failed". Made-up data only. No network.
// Every file that the test writes sits in a made-up folder below TMPDIR. The Translator configuration of this Mac is read only (two files are copied).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync, symlinkSync, linkSync, copyFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/monitor/ki_breath_full_clean");
globalThis.fetch = async () => { throw new Error("Network is disabled in VW122 tests."); };
const { check, done } = checker();
const sha1 = (t) => createHash("sha1").update(t).digest("hex");
const sha256 = (rel) => createHash("sha256").update(readFileSync(path.join(app, rel))).digest("hex");
const req = createRequire(path.join(app, "package.json"));
const { createElement: h } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");
const read = (rel) => readFileSync(path.join(app, rel), "utf8");

// ---------------------------------------------------------------- the made-up folders
const T2 = "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator";
// Unit VW123: the file names of the real book folder before the run (names only, read only).
const realBookDir = path.join(T2, "config", "book-settings");
const realBookBefore = existsSync(realBookDir) ? readdirSync(realBookDir).sort() : null;
const root = realpathSync(mkdtempSync(path.join(process.env.TMPDIR, "vw122-")));
const data = path.join(root, "data");
const cfgDir = path.join(root, "config");
mkdirSync(path.join(data, "pilot-sample"), { recursive: true });
mkdirSync(cfgDir, { recursive: true });
// Read-only inputs of this Mac: the yaml and the defaults file. The live global file is never copied.
for (const name of ["translator-models.yaml", "translator-settings.defaults.json"]) copyFileSync(path.join(T2, "config", name), path.join(cfgDir, name));
const BOOKS = ["ki_breath_full_clean", "left_foot_full", "etiqu1_full"];
writeFileSync(path.join(data, "pilot-sample", "book-slugs.json"), JSON.stringify({ books: BOOKS.map((slug) => ({ slug, pages: 100 })) }));
// The global file of this made-up Mac: level 2 is xai/grok-4.7 low (the case of row 12).
const GLOBAL_TEXT = '{\n "schema": "translator-settings-v1",\n "revision": 1,\n "updated_utc": "2026-11-20T00:00:00.000Z",\n "levels": {\n  "2": {\n   "model": "xai/grok-4.7",\n   "variant": "low"\n  }\n }\n}\n';
const globalFile = path.join(cfgDir, "translator-settings.json");
writeFileSync(globalFile, GLOBAL_TEXT);
const viewerConfig = path.join(root, "viewer.config.json");
const setConfig = (monitor) => { writeFileSync(viewerConfig, JSON.stringify({ translatorDataDir: data, translatorConfigDir: cfgDir, monitor })); process.env.VIEWER_CONFIG = viewerConfig; };
setConfig(true);
const bookDir = path.join(cfgDir, "book-settings");
const BOOK = "ki_breath_full_clean";
const bookFile = (b = BOOK) => path.join(bookDir, `${b}.json`);
const histFile = (b = BOOK) => path.join(bookDir, `${b}.history.jsonl`);
const text = (f) => readFileSync(f, "utf8");
const lines = (f) => text(f).split("\n").filter(Boolean);
const listAll = (dir) => readdirSync(dir, { withFileTypes: true, recursive: true }).filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath, e.name))).sort();

const R = await import("../lib/book-settings-rules.ts");
const S = await import("../lib/settings-schema.ts");
const J = await import("../lib/settings-json.ts");
const B = await import("../lib/book-settings.ts");
const route = await import("../app/api/monitor/books/[slug]/settings/route.ts");

// The example of the TR101 report ("The book file format"): the file and its history line for level 2 on openai/gpt-6.1-terra medium.
const TR101_UTC = "2026-11-21T08:08:00.000Z";
const TR101_FILE = '{\n "schema": "translator-settings-v1",\n "revision": 1,\n "updated_utc": "2026-11-21T08:08:00.000Z",\n "levels": {\n  "2": {\n   "model": "openai/gpt-6.1-terra",\n   "variant": "medium"\n  }\n }\n}\n';
const TR101_SHA1 = "fc731517314bed8a9e666c314863f1b7f2876b5a";
const TR101_LINE = '{"utc":"2026-11-21T08:08:00.000Z","revision":1,"changes":[{"key":"levels.2.model","old":null,"new":"openai/gpt-6.1-terra","old_present":false,"new_present":true,"effect":"Next page"},{"key":"levels.2.variant","old":null,"new":"medium","old_present":false,"new_present":true,"effect":"Next page"}],"sha1_before":null,"sha1_after":"fc731517314bed8a9e666c314863f1b7f2876b5a"}';

const put = (slug, body, extra = {}) => route.PUT(new Request(`http://localhost:3000/api/monitor/books/${slug}/settings`, { method: "PUT", headers: { host: "localhost:3000", "content-type": "application/json", ...(extra.headers ?? {}) }, body: typeof body === "string" ? body : J.stringifySettingsJson(body) }), { params: Promise.resolve({ slug }) });
const get = (slug) => route.GET(new Request(`http://localhost:3000/api/monitor/books/${slug}/settings`, { headers: { host: "localhost:3000" } }), { params: Promise.resolve({ slug }) });
const body = async (res) => J.parseSettingsJson(await res.text());
const plain = async (res) => JSON.parse(await res.text()); // a plain object, for deepEqual of an answer
const L2 = { levels: { 2: { model: "openai/gpt-6.1-terra", variant: "medium" } } };

// ---------------------------------------------------------------- part 1: the pure rules

await check("isSafeBookName: the real slugs, the phase 2 book and the edge lengths pass", () => {
  for (const ok of ["ki_breath_full_clean", "left_foot_full", "etiqu1_full", "100_practice_full", "paired-dataset", "a", "9", "A1_b-c.d", "a".repeat(100)]) assert.equal(R.isSafeBookName(ok), true, ok);
});
await check("isSafeBookName: refused names ../x, a/b, x y, _x, -x, .x, a..b, empty, 101 characters, a newline, a NUL byte, and not a string", () => {
  for (const bad of ["../x", "a/b", "a\\b", "x y", "_x", "-x", ".x", "a..b", "", "a".repeat(101), "a\n", "a\0b", "é", "..", "x/../y"]) assert.equal(R.isSafeBookName(bad), false, JSON.stringify(bad));
  for (const bad of [null, undefined, 5, {}, ["a"]]) assert.equal(R.isSafeBookName(bad), false);
});
await check("labels: the book file label is config/book-settings/<book>.json, and a validation error names the book file in place of the global file", () => {
  assert.equal(R.bookFileLabel(BOOK), "config/book-settings/ki_breath_full_clean.json");
  assert.equal(R.labelBookError('translator-settings.json: levels.2.model is "x", not a provider/model ID', BOOK), 'config/book-settings/ki_breath_full_clean.json: levels.2.model is "x", not a provider/model ID');
  assert.equal(R.labelBookError("other text", BOOK), "other text");
});
const DEFAULTS = Object.fromEntries(S.FIELDS.map((f) => [f.key, f.kind === "model" ? "anthropic/default-model" : f.kind === "variant" ? "high" : f.kind === "boolean" ? true : f.kind === "mode" ? "separate" : 3]));
delete DEFAULTS["update.N"];
await check("effectiveRows: the book file wins, a key that it lacks follows the global file, then the default (rows 4 and 12)", () => {
  const rows = R.effectiveRows({ "levels.2.model": "openai/gpt-6.1-terra" }, { "levels.2.model": "xai/grok-4.7", "levels.2.variant": "low" }, DEFAULTS);
  assert.equal(rows.length, 21);
  const by = Object.fromEntries(rows.map((r) => [r.key, r]));
  assert.equal(by["levels.2.model"].value, "openai/gpt-6.1-terra"); assert.equal(by["levels.2.model"].source, "this book");
  assert.equal(by["levels.2.model"].globalValue, "xai/grok-4.7"); assert.equal(by["levels.2.model"].globalIsDefault, false);
  assert.equal(by["levels.2.variant"].value, "low"); assert.equal(by["levels.2.variant"].source, "global"); assert.equal(by["levels.2.variant"].globalIsDefault, false);
  assert.equal(by["levels.3.model"].value, "anthropic/default-model"); assert.equal(by["levels.3.model"].source, "global"); assert.equal(by["levels.3.model"].globalIsDefault, true);
  assert.equal(by["update.N"].value, null); assert.equal(by["update.N"].globalValue, null); assert.equal(by["update.N"].source, "global");
  assert.deepEqual(rows.map((r) => r.key), S.KEY_ORDER, "the order of the schema");
});
await check("effectiveRows: a book N wins over a global N, and the words are exactly 'this book' and 'global'", () => {
  const rows = R.effectiveRows({ "update.N": 2 }, { "update.N": 7 }, DEFAULTS);
  const n = rows.find((r) => r.key === "update.N");
  assert.equal(n.value, 2); assert.equal(n.source, R.SOURCE_BOOK); assert.equal(n.globalValue, 7);
  assert.equal(R.SOURCE_BOOK, "this book"); assert.equal(R.SOURCE_GLOBAL, "global");
  assert.deepEqual([...new Set(R.effectiveRows({}, {}, DEFAULTS).map((r) => r.source))], ["global"]);
});
await check("words: the section title counts the keys, the time is PST, a history side without the key says global", () => {
  assert.equal(R.sectionTitle(0), "Run settings of this book (0 changed)");
  assert.equal(R.sectionTitle(2), "Run settings of this book (2 changed)");
  assert.equal(R.changedCount({ "levels.2.model": "a/b", "run.jobs": 2 }), 2);
  assert.equal(R.pstText("2026-11-21T08:08:00.000Z"), "2026-11-21 00:08:00 PST");
  assert.equal(R.pstText("2026-07-10T16:00:00.000Z"), "2026-07-10 08:00:00 PST", "PST all year");
  assert.equal(R.pstText("not a time"), "Time unreadable");
  assert.equal(R.historyValueText("levels.2.model", null, false), "global");
  assert.match(R.globalValueText({ key: "update.N", globalValue: null, globalIsDefault: true }), /phase rule/);
  assert.match(R.globalValueText({ key: "levels.3.variant", globalValue: "high", globalIsDefault: true }), /^high \(default/);
});

// ---------------------------------------------------------------- part 2: the file work

await check("read with no book file: no file, no key, sha1 null, all 21 values follow the global file (xai/grok-4.7 low) and show the source global", async () => {
  const snap = await B.readBookSettings(BOOK);
  assert.equal(snap.exists, false); assert.equal(snap.sha1, null); assert.deepEqual({ ...snap.overrides }, {});
  assert.equal(snap.error, null); assert.equal(snap.global_error, null);
  assert.equal(snap.file, "config/book-settings/ki_breath_full_clean.json");
  assert.equal(snap.effective.length, 21);
  const l2 = snap.effective.find((r) => r.key === "levels.2.model");
  assert.equal(l2.value, "xai/grok-4.7"); assert.equal(l2.source, "global"); assert.equal(l2.globalIsDefault, false);
  assert.ok(snap.effective.every((r) => r.source === "global"));
  assert.ok(!existsSync(bookDir), "a read makes no folder");
});

let firstSha = null; let firstUtc = null; let firstText = "";
await check("save 1 (rows 1 to 3, 12): level 2 on openai/gpt-6.1-terra medium writes ONLY those two keys, in the exact bytes of the TR101 report", async () => {
  assert.equal(sha1(TR101_FILE), TR101_SHA1, "the literal of this test is the file that the TR101 history line names");
  const snap = await B.saveBookSettings(BOOK, L2, null);
  firstText = text(bookFile());
  firstUtc = /"updated_utc": "([^"]+)"/.exec(firstText)[1];
  assert.match(firstUtc, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
  assert.equal(firstText.replace(firstUtc, TR101_UTC), TR101_FILE, "byte for byte as the TR101 example");
  assert.ok(firstText.endsWith("}\n") && !firstText.endsWith("\n\n"), "one final newline");
  assert.equal(firstText.split("\n").length, 12, "11 lines and the final newline");
  assert.equal(snap.exists, true); assert.equal(snap.sha1, sha1(firstText)); firstSha = snap.sha1;
  assert.deepEqual(Object.keys(snap.overrides).sort(), ["levels.2.model", "levels.2.variant"]);
  assert.equal(snap.revision, 1);
  assert.equal(statSync(bookFile()).mode & 0o777, 0o600);
});
await check("history 1: one line in the exact form of the TR101 report (old, new, old_present, new_present, effect, sha1_before, sha1_after)", () => {
  const ls = lines(histFile());
  assert.equal(ls.length, 1);
  const entry = JSON.parse(ls[0]);
  assert.deepEqual(Object.keys(entry), ["utc", "revision", "changes", "sha1_before", "sha1_after"]);
  assert.equal(entry.utc, firstUtc); assert.equal(entry.revision, 1); assert.equal(entry.sha1_before, null); assert.equal(entry.sha1_after, firstSha);
  for (const c of entry.changes) assert.deepEqual(Object.keys(c), ["key", "old", "new", "old_present", "new_present", "effect"]);
  assert.equal(ls[0].replaceAll(firstUtc, TR101_UTC).replace(firstSha, TR101_SHA1), TR101_LINE, "byte for byte as the TR101 line");
  assert.ok(text(histFile()).endsWith("}\n"));
});
await check("the global file is never touched by a save, and no lock or temp file stays", () => {
  assert.equal(text(globalFile), GLOBAL_TEXT);
  assert.deepEqual(listAll(bookDir), ["ki_breath_full_clean.history.jsonl", "ki_breath_full_clean.json"]);
});
await check("merge after save 1 (rows 4, 5, 12): level 2 shows this book with the gray global value xai/grok-4.7 low, level 3 follows global, another book keeps global", async () => {
  const snap = await B.readBookSettings(BOOK);
  const by = Object.fromEntries(snap.effective.map((r) => [r.key, r]));
  assert.equal(by["levels.2.model"].value, "openai/gpt-6.1-terra"); assert.equal(by["levels.2.model"].source, "this book"); assert.equal(by["levels.2.model"].globalValue, "xai/grok-4.7");
  assert.equal(by["levels.2.variant"].value, "medium"); assert.equal(by["levels.2.variant"].source, "this book"); assert.equal(by["levels.2.variant"].globalValue, "low");
  assert.equal(by["levels.3.model"].source, "global");
  assert.equal(snap.history.length, 1); assert.equal(snap.history[0].sha1_after, firstSha);
  const other = await B.readBookSettings("left_foot_full");
  const ol = Object.fromEntries(other.effective.map((r) => [r.key, r]));
  assert.equal(other.exists, false);
  assert.equal(ol["levels.2.model"].value, "xai/grok-4.7"); assert.equal(ol["levels.2.model"].source, "global");
  assert.equal(ol["levels.2.variant"].value, "low"); assert.equal(ol["levels.2.variant"].source, "global");
  assert.ok(!existsSync(bookFile("left_foot_full")), "the other book got no file");
});
let secondSha = null;
await check("save 2: a second key (run.jobs) gives revision 2, the keys in the order of the schema, the effect 'Next list or book start', and sha1_before of save 1", async () => {
  const snap = await B.saveBookSettings(BOOK, { ...L2, run: { jobs: 3 } }, firstSha);
  const t = text(bookFile()); secondSha = sha1(t);
  const doc = JSON.parse(t);
  assert.deepEqual(Object.keys(doc), ["schema", "revision", "updated_utc", "levels", "run"]);
  assert.equal(doc.revision, 2); assert.deepEqual(doc.run, { jobs: 3 });
  assert.equal(t, J.stringifySettingsJson(doc, 1) + "\n");
  const ls = lines(histFile());
  assert.equal(ls.length, 2);
  const e = JSON.parse(ls[1]);
  assert.equal(e.revision, 2); assert.equal(e.sha1_before, firstSha); assert.equal(e.sha1_after, secondSha);
  assert.deepEqual(e.changes, [{ key: "run.jobs", old: null, new: 3, old_present: false, new_present: true, effect: "Next list or book start" }]);
  assert.equal(snap.history[0].revision, 2, "newest first");
});
await check("save with nothing changed is refused with 'No changes to save.' and writes nothing", async () => {
  await assert.rejects(() => B.saveBookSettings(BOOK, { ...L2, run: { jobs: 3 } }, secondSha), (e) => e.status === 400 && e.message === "No changes to save.");
  assert.equal(sha1(text(bookFile())), secondSha); assert.equal(lines(histFile()).length, 2);
});
await check("optimistic lock (design point 1): a save with the old sha1 gives 'The book file changed since you opened it. Reload the page.' and writes nothing", async () => {
  await assert.rejects(() => B.saveBookSettings(BOOK, { run: { jobs: 5 } }, firstSha), (e) => e.status === 409 && e.message === "The book file changed since you opened it. Reload the page.");
  await assert.rejects(() => B.saveBookSettings(BOOK, { run: { jobs: 5 } }, null), (e) => e.status === 409);
  assert.equal(sha1(text(bookFile())), secondSha); assert.equal(lines(histFile()).length, 2);
  assert.deepEqual(listAll(bookDir), ["ki_breath_full_clean.history.jsonl", "ki_breath_full_clean.json"], "no lock or temp file stays");
});
await check("an outside edit makes the form's sha1 stale (a hand edit of the file, then a save from the old form)", async () => {
  const bytes = text(bookFile());
  writeFileSync(bookFile(), bytes.replace('"jobs": 3', '"jobs": 4'));
  await assert.rejects(() => B.saveBookSettings(BOOK, { ...L2, run: { jobs: 6 } }, secondSha), (e) => e.status === 409);
  writeFileSync(bookFile(), bytes);
  assert.equal(sha1(text(bookFile())), secondSha);
});
let thirdSha = null;
await check("Use global (row 2): a save without level 2 variant removes the key from the file, and the history says old 'medium', new null, new_present false", async () => {
  const snap = await B.saveBookSettings(BOOK, { levels: { 2: { model: "openai/gpt-6.1-terra" } }, run: { jobs: 3 } }, secondSha);
  const doc = JSON.parse(text(bookFile())); thirdSha = snap.sha1;
  assert.deepEqual(doc.levels, { 2: { model: "openai/gpt-6.1-terra" } }); assert.equal(doc.revision, 3);
  const e = JSON.parse(lines(histFile()).at(-1));
  assert.deepEqual(e.changes, [{ key: "levels.2.variant", old: "medium", new: null, old_present: true, new_present: false, effect: "Next page" }]);
  const v = snap.effective.find((r) => r.key === "levels.2.variant");
  assert.equal(v.value, "low"); assert.equal(v.source, "global", "the key follows the global file again");
});
await check("the last key goes (unit default): the file stays as a valid file with no value key, and the section counts 0 changed", async () => {
  const snap = await B.saveBookSettings(BOOK, {}, thirdSha);
  const t = text(bookFile());
  assert.equal(t.replace(/"updated_utc": "[^"]+"/, '"updated_utc": "X"'), '{\n "schema": "translator-settings-v1",\n "revision": 4,\n "updated_utc": "X"\n}\n');
  assert.deepEqual({ ...snap.overrides }, {}); assert.equal(R.changedCount(snap.overrides), 0); assert.equal(snap.error, null);
  assert.ok(snap.effective.every((r) => r.source === "global"));
  const e = JSON.parse(lines(histFile()).at(-1));
  assert.deepEqual(e.changes.map((c) => [c.key, c.new_present]), [["levels.2.model", false], ["run.jobs", false]]);
  assert.equal(lines(histFile()).length, 4);
});
await check("a value that fails the checks is refused with the book file label and writes nothing (no folder for a book that never saved)", async () => {
  await assert.rejects(() => B.saveBookSettings("etiqu1_full", { levels: { 2: { model: "bad" } } }, null), (e) => e.message === 'config/book-settings/etiqu1_full.json: levels.2.model is "bad", not a provider/model ID');
  await assert.rejects(() => B.saveBookSettings("etiqu1_full", { run: { jobs: 99 } }, null), (e) => /^config\/book-settings\/etiqu1_full\.json: run\.jobs is 99, not a whole number from 1 to 8$/.test(e.message));
  await assert.rejects(() => B.saveBookSettings("etiqu1_full", { nonsense: 1 }, null), (e) => /^config\/book-settings\/etiqu1_full\.json: unknown key nonsense$/.test(e.message));
  assert.ok(!existsSync(bookFile("etiqu1_full")) && !existsSync(histFile("etiqu1_full")));
});
await check("a save of another book writes that book's file and history only", async () => {
  await B.saveBookSettings("left_foot_full", { calls: { max_attempts: 2 } }, null);
  assert.deepEqual(JSON.parse(text(bookFile("left_foot_full"))).calls, { max_attempts: 2 });
  assert.equal(lines(histFile("left_foot_full")).length, 1);
  assert.equal(lines(histFile()).length, 4, "the history of the first book is unchanged");
  assert.deepEqual({ ...(await B.readBookSettings(BOOK)).overrides }, {}, "the first book does not see the other book's value");
});
await check("a name that is not safe never reaches a file: saveBookSettings and readBookSettings refuse it, and no file appears next to the folder", async () => {
  const before = listAll(cfgDir);
  for (const bad of ["../x", "a/b", "x y", "_x", "a..b", "", "../../etc/passwd"]) {
    await assert.rejects(() => B.saveBookSettings(bad, { run: { jobs: 2 } }, null), /safe book name/i, JSON.stringify(bad));
    const snap = await B.readBookSettings(bad);
    assert.match(snap.error, /safe book name/i); assert.deepEqual(snap.effective, []);
  }
  assert.deepEqual(listAll(cfgDir), before);
});

// broken files (row 11)
const brokenKinds = [
  ["not JSON", "{ nope", /^config\/book-settings\/etiqu1_full\.json: the file is not valid JSON \(/],
  ["empty file", "", /^config\/book-settings\/etiqu1_full\.json: the file is not valid JSON \(/],
  ["a list", "[1]", /^config\/book-settings\/etiqu1_full\.json: the file must hold one JSON object$/],
  ["an unknown key", '{"schema":"translator-settings-v1","bogus":{"a":1}}', /^config\/book-settings\/etiqu1_full\.json: unknown key bogus$/],
  ["a bad value", '{"schema":"translator-settings-v1","levels":{"2":{"model":"x"}}}', /^config\/book-settings\/etiqu1_full\.json: levels\.2\.model is "x", not a provider\/model ID$/],
  ["a wrong schema", '{"schema":"other"}', /^config\/book-settings\/etiqu1_full\.json: schema is "other", not translator-settings-v1$/],
];
for (const [name, content, pattern] of brokenKinds) {
  await check(`broken book file (${name}) (row 11): the section gets the error line, no merge view, and a save writes nothing (the file stays byte for byte)`, async () => {
    mkdirSync(bookDir, { recursive: true });
    writeFileSync(bookFile("etiqu1_full"), content);
    const sha = sha1(content);
    const snap = await B.readBookSettings("etiqu1_full");
    assert.match(snap.error, pattern);
    assert.deepEqual(snap.effective, []); assert.equal(snap.sha1, sha); assert.equal(snap.exists, true);
    await assert.rejects(() => B.saveBookSettings("etiqu1_full", { run: { jobs: 2 } }, sha), (e) => pattern.test(e.message));
    const res = await put("etiqu1_full", { sha1: sha, settings: { run: { jobs: 2 } } });
    assert.equal(res.status, 400); assert.match((await body(res)).error, pattern);
    assert.equal(text(bookFile("etiqu1_full")), content); assert.ok(!existsSync(histFile("etiqu1_full")), "no history line");
    assert.deepEqual(listAll(bookDir).filter((f) => f.startsWith("etiqu1_full")), ["etiqu1_full.json"], "no lock or temp file stays");
  });
}
await check("a valid Save works again after the file is fixed by hand (the broken file was kept until then)", async () => {
  writeFileSync(bookFile("etiqu1_full"), '{"schema":"translator-settings-v1"}');
  const snap = await B.readBookSettings("etiqu1_full");
  assert.equal(snap.error, null);
  const saved = await B.saveBookSettings("etiqu1_full", { run: { jobs: 2 } }, snap.sha1);
  assert.deepEqual({ ...saved.overrides }, { "run.jobs": 2 });
});
await check("a broken history file blocks a save, shows its line, and leaves the book file as it is", async () => {
  const before = text(bookFile("etiqu1_full"));
  const sha = sha1(before);
  const hist = histFile("etiqu1_full");
  writeFileSync(hist, "not json\n");
  const snap = await B.readBookSettings("etiqu1_full");
  assert.ok(snap.history_error); assert.equal(snap.error, null);
  await assert.rejects(() => B.saveBookSettings("etiqu1_full", { run: { jobs: 3 } }, sha), (e) => e.status === 400);
  assert.equal(text(bookFile("etiqu1_full")), before);
  writeFileSync(hist, "");
});
await check("a broken global file blocks the save and the merge view (the global values are unknown), and the book file stays", async () => {
  const before = text(bookFile("etiqu1_full")); const sha = sha1(before);
  writeFileSync(globalFile, "{ broken");
  const snap = await B.readBookSettings("etiqu1_full");
  assert.match(snap.global_error, /translator-settings\.json/); assert.deepEqual(snap.effective, []);
  await assert.rejects(() => B.saveBookSettings("etiqu1_full", { run: { jobs: 3 } }, sha), (e) => e.status === 400 && /global settings file has an error/.test(e.message));
  assert.equal(text(bookFile("etiqu1_full")), before);
  writeFileSync(globalFile, GLOBAL_TEXT);
});
await check("a stale lock file or temp file blocks a save with a clear line and is not removed", async () => {
  const sha = sha1(text(bookFile("etiqu1_full")));
  for (const suffix of [".lock", ".part"]) {
    const f = bookFile("etiqu1_full") + suffix;
    writeFileSync(f, "stale");
    await assert.rejects(() => B.saveBookSettings("etiqu1_full", { run: { jobs: 3 } }, sha), (e) => e.status === 409 && /stale (lock|temporary) file/.test(e.message));
    assert.equal(text(f), "stale");
    writeFileSync(f, ""); await import("node:fs").then((m) => m.rmSync(f));
  }
  assert.equal(sha1(text(bookFile("etiqu1_full"))), sha);
});
await check("a link is refused: a book folder that is a symbolic link, and a book file with a second hard link", async () => {
  const link = path.join(root, "cfg2"); mkdirSync(link);
  const outside = path.join(root, "outside"); mkdirSync(outside);
  symlinkSync(outside, path.join(link, "book-settings"));
  for (const name of ["translator-models.yaml", "translator-settings.defaults.json", "translator-settings.json"]) copyFileSync(path.join(cfgDir, name), path.join(link, name));
  writeFileSync(path.join(root, "viewer2.json"), JSON.stringify({ translatorDataDir: data, translatorConfigDir: link, monitor: true }));
  process.env.VIEWER_CONFIG = path.join(root, "viewer2.json");
  const snap = await B.readBookSettings(BOOK);
  assert.match(snap.error, /real folder/);
  await assert.rejects(() => B.saveBookSettings(BOOK, { run: { jobs: 2 } }, null), /real folder/);
  assert.deepEqual(readdirSync(outside), [], "nothing was written through the link");
  process.env.VIEWER_CONFIG = viewerConfig;
  linkSync(bookFile("etiqu1_full"), path.join(root, "second-link"));
  const snap2 = await B.readBookSettings("etiqu1_full");
  assert.match(snap2.error, /without links/);
  await import("node:fs").then((m) => m.rmSync(path.join(root, "second-link")));
  assert.equal((await B.readBookSettings("etiqu1_full")).error, null);
});

// ---------------------------------------------------------------- part 3: the route

await check("route GET: the reading has the book file, the global side and 21 effective rows with the source words (the data of the dialogs, row 9)", async () => {
  await B.saveBookSettings(BOOK, L2, (await B.readBookSettings(BOOK)).sha1);
  const res = await get(BOOK);
  assert.equal(res.status, 200); assert.equal(res.headers.get("cache-control"), "no-store");
  const j = await body(res);
  assert.equal(j.effective.length, 21);
  assert.deepEqual(Object.fromEntries(j.effective.filter((r) => r.key.startsWith("levels.2")).map((r) => [r.key, [r.value, r.source]])), { "levels.2.model": ["openai/gpt-6.1-terra", "this book"], "levels.2.variant": ["medium", "this book"] });
  assert.ok(j.effective.filter((r) => !r.key.startsWith("levels.2")).every((r) => r.source === "global"));
  const other = await body(await get("left_foot_full"));
  assert.deepEqual(Object.fromEntries(other.effective.filter((r) => r.key.startsWith("levels.2")).map((r) => [r.key, [r.value, r.source]])), { "levels.2.model": ["xai/grok-4.7", "global"], "levels.2.variant": ["low", "global"] }, "the other book keeps the global value (row 12)");
});
await check("route PUT: a good body saves and answers the new reading; the file has only the keys of the body", async () => {
  const sha = (await B.readBookSettings(BOOK)).sha1;
  const res = await put(BOOK, { sha1: sha, settings: { ...L2, memory: { memory_k: 4 } } });
  assert.equal(res.status, 200);
  const j = await body(res);
  assert.deepEqual(Object.keys(j.overrides).sort(), ["levels.2.model", "levels.2.variant", "memory.memory_k"]);
  assert.deepEqual(Object.keys(JSON.parse(text(bookFile()))), ["schema", "revision", "updated_utc", "levels", "memory"]);
});
await check("route PUT: the stale sha1 gives 409 with the reload line and saved false", async () => {
  const res = await put(BOOK, { sha1: "0".repeat(40), settings: L2 });
  assert.equal(res.status, 409);
  assert.deepEqual(await plain(res), { error: "The book file changed since you opened it. Reload the page.", saved: false });
});
await check("route PUT: the body is checked (not JSON, no sha1, extra key, bad sha1, a settings value that fails)", async () => {
  assert.equal((await put(BOOK, "not json")).status, 400);
  assert.equal((await put(BOOK, { settings: L2 })).status, 400);
  assert.equal((await put(BOOK, { sha1: null, settings: L2, extra: 1 })).status, 400);
  assert.equal((await put(BOOK, { sha1: "XYZ", settings: L2 })).status, 400);
  assert.equal((await put(BOOK, { sha1: null, settings: [] })).status, 400);
  const res = await put(BOOK, { sha1: (await B.readBookSettings(BOOK)).sha1, settings: { levels: { 2: { model: "bad" } } } });
  assert.equal(res.status, 400); assert.match((await body(res)).error, /^config\/book-settings\/ki_breath_full_clean\.json: levels\.2\.model is "bad"/);
});
await check("route PUT: a foreign Origin gives 403, a non-loopback Host gives 403, a text body gives 415 (and nothing is written)", async () => {
  const sha = sha1(text(bookFile())); const hist = lines(histFile()).length;
  assert.equal((await put(BOOK, { sha1: null, settings: L2 }, { headers: { origin: "http://evil.example.test" } })).status, 403);
  assert.equal((await put(BOOK, { sha1: null, settings: L2 }, { headers: { host: "example.test" } })).status, 403);
  assert.equal((await put(BOOK, { sha1: null, settings: L2 }, { headers: { "content-type": "text/plain" } })).status, 415);
  assert.equal(sha1(text(bookFile())), sha); assert.equal(lines(histFile()).length, hist);
});
await check("route: a name that is not safe, and a book that is not in the Monitor list, answer 404 and write nothing", async () => {
  const before = listAll(cfgDir);
  for (const slug of ["../x", "a/b", "_x", "a..b", "nobook", "paired-dataset"]) {
    for (const res of [await get(slug), await put(slug, { sha1: null, settings: L2 })]) { assert.equal(res.status, 404, slug); assert.deepEqual(await plain(res), { error: "Not found" }); }
  }
  assert.deepEqual(listAll(cfgDir), before);
});
await check("Monitor switch off (design point 5): GET and PUT answer 404 'Not found' and write nothing, and requireMonitor stops the page", async () => {
  setConfig(false);
  const before = listAll(cfgDir); const sha = sha1(text(bookFile()));
  for (const res of [await get(BOOK), await put(BOOK, { sha1: sha, settings: { run: { jobs: 2 } } })]) { assert.equal(res.status, 404); assert.deepEqual(await plain(res), { error: "Not found" }); }
  assert.deepEqual(listAll(cfgDir), before); assert.equal(sha1(text(bookFile())), sha);
  const { requireMonitor } = await import("../lib/monitor.ts");
  await assert.rejects(() => requireMonitor(), /notFound/);
  setConfig(true);
  assert.equal((await get(BOOK)).status, 200);
});

// ---------------------------------------------------------------- part 4: the components as HTML

const { default: BookSettingsForm } = await import("../components/BookSettingsForm.tsx");
const { ValuesView } = await import("../components/BookSettingsValues.tsx");
const formHtml = async (slug, title = "Breathing: Raising the Power of Life") => renderToStaticMarkup(h(BookSettingsForm, { slug, title, initialText: J.stringifySettingsJson(await B.readBookSettings(slug)) }));
const strip = (html) => html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

await check("section (row 1): closed, titled 'Run settings of this book (N changed)', with N the number of keys that the file holds (3 keys here, 0 for a book with no file)", async () => {
  const html = await formHtml(BOOK);
  assert.match(html, /<details[^>]*data-book-settings="true"[^>]*>/); assert.ok(!/<details[^>]*\bopen\b/.test(html), "closed");
  assert.match(strip(html), /Run settings of this book \(3 changed\)/);
  assert.match(strip(await formHtml("left_foot_full", "The Secret of Kendo and the Left Foot")), /Run settings of this book \(1 changed\)/, "left_foot_full holds one key from an earlier check");
  const none = await B.readBookSettings("paired-dataset");
  assert.match(strip(renderToStaticMarkup(h(BookSettingsForm, { slug: "paired-dataset", title: null, initialText: J.stringifySettingsJson(none) }))), /Run settings of this book \(0 changed\)/);
});
await check("form (rows 1 and 5): the 7 groups of the schema, 21 fields, the real title, the file label, and no group name is typed by hand in the form", async () => {
  const html = await formHtml(BOOK); const t = strip(html);
  for (const g of S.GROUPS) assert.ok(t.includes(g), g);
  assert.equal((html.match(/data-field="/g) ?? []).length, 21);
  assert.ok(t.includes("Breathing: Raising the Power of Life") && t.includes(BOOK));
  assert.ok(t.includes("config/book-settings/ki_breath_full_clean.json: revision"));
  assert.match(t, /Saves of this book/);
});
await check("fields (rows 2 and 5): a held key shows 'changed for this book', the gray global value, the effect word, the source, and the button Use global; a free key shows none of the badge and no button", async () => {
  const html = await formHtml(BOOK);
  // Unit VW123 (Q-A 3:116.5 rows L1 and L3): a level or box critic field sits in a table row. Its control is in a data-field box and its
  // lines (Global value, state, Use global) are in data-for pieces of the same row. A card field holds everything in its data-field box.
  const esc = (key) => key.replaceAll(".", "\\.");
  const field = (key) => {
    const own = new RegExp(`<div[^>]*data-field="${esc(key)}"[^>]*>[\\s\\S]*?(?=<div[^>]*data-field=|<div class="sticky|$)`).exec(html)[0];
    const lines = [...html.matchAll(new RegExp(`<div[^>]*data-for="${esc(key)}"[^>]*>[\\s\\S]*?(?=<div[^>]*data-(?:for|field)=|</tr>|<div class="sticky|$)`, "g"))].map((m) => m[0]);
    return [own, ...lines].join("\n");
  };
  const l2 = strip(field("levels.2.model"));
  assert.match(field("levels.2.model"), /data-field-status="changed"/);
  assert.ok(l2.includes("changed for this book") && l2.includes("Next page") && l2.includes("Use global"));
  // A table row shows the global value in the column "Global value" (data-global-value). A card field shows the words "Global value:" in its compact line.
  assert.ok(field("levels.2.model").includes("data-global-value") && l2.includes("grok-4.7") && l2.includes("(this book)"));
  assert.ok(strip(field("memory.memory_k")).includes("Global value:"));
  assert.match(field("levels.2.model"), /data-use-global="levels\.2\.model"/);
  const free = field("levels.3.model");
  assert.match(free, /data-field-status=""/); assert.ok(!free.includes("changed for this book") && !free.includes("data-use-global") && strip(free).includes("(global)"));
  assert.match(strip(field("memory.memory_k")), /changed for this book/);
  assert.equal((html.match(/data-use-global=/g) ?? []).length, 3, "one button for each held key");
});
await check("fields: a held run.jobs shows the effect word 'Next list or book start' (design: jobs and critic mode at the next book start)", async () => {
  await B.saveBookSettings("left_foot_full", { run: { jobs: 2 }, calls: { max_attempts: 2 } }, (await B.readBookSettings("left_foot_full")).sha1);
  const html = await formHtml("left_foot_full");
  const field = new RegExp('<div[^>]*data-field="run\\.jobs"[^>]*>[\\s\\S]*?(?=<div[^>]*data-field="run\\.book_jobs")').exec(html)[0];
  assert.ok(strip(field).includes("Next list or book start") && strip(field).includes("Next book start uses"));
});
// Unit VW123 (Q-A 3:116.4 rows M1 and M5): the model field is a button with the provider and the model name (the old select and the box "Other model ID" are gone).
await check("model field: the button of a model that is in use shows its provider and name (the saved openai/gpt-6.1-terra, the global xai/grok-4.7); no 'Other model ID' box and no warning in the closed form", async () => {
  const html = await formHtml(BOOK);
  const btn = (h, key) => new RegExp(`<button[^>]*id="book-${key.replaceAll(".", "\\.")}"[\\s\\S]*?</button>`).exec(h)[0];
  assert.match(btn(html, "levels.2.model"), /aria-label="Level 2 model: openai · gpt-6\.1-terra"/);
  assert.match(btn(html, "levels.2.model"), /data-model-button-text="true">openai · gpt-6\.1-terra</);
  assert.ok(!html.includes("<select id=\"book-levels.2.model\""));
  assert.ok(!html.includes("Other model ID") && !html.includes("The Viewer cannot check this ID"));
  const free = await formHtml("left_foot_full");
  assert.match(btn(free, "levels.2.model"), /data-model-button-text="true">xai · grok-4\.7</);
  assert.ok(!free.includes("Other model ID"));
});
await check("form with a broken book file (row 11): the error line shows, the fields are hidden, Save is off, and the text says that the form keeps the file", async () => {
  mkdirSync(bookDir, { recursive: true });
  writeFileSync(bookFile("etiqu1_full"), '{"schema":"translator-settings-v1","run":{"jobs":99}}');
  const html = await formHtml("etiqu1_full");
  const t = strip(html);
  assert.match(html, /data-book-settings-error/); assert.ok(t.includes("config/book-settings/etiqu1_full.json: run.jobs is 99, not a whole number from 1 to 8"));
  assert.ok(t.includes("The form keeps the file as it is"));
  assert.equal((html.match(/data-field="/g) ?? []).length, 0);
  assert.match(html, /<button[^>]*data-save="true"[^>]*disabled=""/);
  assert.match(t, /Run settings of this book \(0 changed\)/);
});
await check("dialog list (row 9): the Run, Resume and Restart dialogs list 21 values, each with 'this book' or 'global' (level 2 this book, level 3 global)", async () => {
  const snap = await B.readBookSettings(BOOK);
  const html = renderToStaticMarkup(h(ValuesView, { snap, error: null }));
  assert.equal((html.match(/data-value-row="/g) ?? []).length, 21);
  assert.match(html, /data-value-row="levels\.2\.model" data-source="this book"/); assert.match(html, /data-value-row="levels\.2\.variant" data-source="this book"/);
  assert.match(html, /data-value-row="levels\.3\.model" data-source="global"/);
  const t = strip(html);
  assert.ok(t.includes("Values that this run will use") && t.includes("this book") && t.includes("global") && t.includes("gpt-6.1-terra") && t.includes("medium"));
  assert.ok(t.includes("phase rule (no saved N)"), "no N in any file: the phase rule decides");
  const loading = strip(renderToStaticMarkup(h(ValuesView, { snap: null, error: null })));
  assert.ok(loading.includes("Reading the run settings"));
  assert.ok(strip(renderToStaticMarkup(h(ValuesView, { snap: null, error: "The server answered 404." }))).includes("The server answered 404."));
  const broken = strip(renderToStaticMarkup(h(ValuesView, { snap: await B.readBookSettings("etiqu1_full"), error: null })));
  assert.ok(broken.includes("config/book-settings/etiqu1_full.json: run.jobs is 99") && broken.includes("A run does not start until the book file is correct") && !broken.includes("Setting Value From"));
});
await check("dialog list: a book N shows in the list with the source 'this book' and wins over a global N", async () => {
  writeFileSync(path.join(cfgDir, "translator-settings.json"), J.stringifySettingsJson({ schema: "translator-settings-v1", revision: 2, update: { N: 7 }, levels: { 2: { model: "xai/grok-4.7", variant: "low" } } }, 1) + "\n");
  const g = renderToStaticMarkup(h(ValuesView, { snap: await B.readBookSettings("left_foot_full"), error: null }));
  assert.match(g, /data-value-row="update\.N" data-source="global"/); assert.ok(strip(g).includes(" 7 "));
  await B.saveBookSettings("left_foot_full", { update: { N: 2 }, run: { jobs: 2 }, calls: { max_attempts: 2 } }, (await B.readBookSettings("left_foot_full")).sha1);
  const b = renderToStaticMarkup(h(ValuesView, { snap: await B.readBookSettings("left_foot_full"), error: null }));
  assert.match(b, /data-value-row="update\.N" data-source="this book"/);
  assert.match(b, /data-value-row="update\.N" data-source="this book"[^>]*><th[^>]*>N<\/th><td[^>]*>2<\/td>/);
  writeFileSync(globalFile, GLOBAL_TEXT);
});

// ---------------------------------------------------------------- part 5: the sources

await check("the global panel files are reused, not changed: settings-run, settings-schema, settings-json and safe-path are byte for byte as at the base HEAD f05d89a (unit VW123 changed RunSettingsForm on purpose: it uses the shared fields)", () => {
  // The sha256 of the files that must stay as they are (measured at the base f05d89a before the unit).
  const BASE = {
    "lib/settings-run.ts": "6004b65bbc7944a6c5a7643310a9505054957a92eae0d97ad7bd5525e45be54e",
    "lib/settings-schema.ts": "8ad07b654a9b2c1265d87d386f065f5cde3b4ed3d1b43234810f4e03a01fc995",
    "lib/settings-json.ts": "87a8f7b4b0b06e29a320e524a6806fb62bfdb1e389b53763b9265aebbfc13199",
    "lib/safe-path.ts": "f3fd638eefe3d3a31e137d947bac4ce05ccb4c4d10b682e7a625010bcfbcd696",
  };
  for (const [k, want] of Object.entries(BASE)) assert.equal(sha256(k), want, k);
  const src = read("components/BookSettingsForm.tsx").replace(/\/\/.*$/gm, "");
  assert.ok(!src.includes("RunSettingsForm"), "the book form does not import or copy the global form");
});
await check("the book form is built from the schema: it maps GROUPS and filters FIELDS, uses valueError and validateSettings, and holds no group name or field key by hand", () => {
  // Unit VW123 (Q-A 3:116.5 row L5): the fields are drawn by the shared part components/SettingsFields.tsx from GROUPS, FIELDS and lib/settings-layout.ts.
  const src = read("components/BookSettingsForm.tsx").replace(/\/\/.*$/gm, "");
  const shared = read("components/SettingsFields.tsx").replace(/\/\/.*$/gm, "");
  const layout = read("lib/settings-layout.ts").replace(/\/\/.*$/gm, "");
  assert.ok(shared.includes("GROUPS[") && shared.includes("FIELDS") && layout.includes("FIELDS.filter") && src.includes("valueError") && src.includes("validateSettings") && src.includes("effect("));
  for (const g of S.GROUPS) assert.ok(!src.includes(`"${g}"`) && !shared.includes(`"${g}"`) && !layout.includes(`"${g}"`), g);
  // The one key that the form names: update.N (an empty N field means "no N for this book"). The layout names the box critic keys (the line of row L2).
  for (const k of S.KEY_ORDER.filter((k) => k !== "update.N")) assert.ok(!src.includes(`"${k}"`) && !shared.includes(`"${k}"`), k);
});
await check("the page and the dialogs: the page passes the section to BookDetailView before 'Last error'; Run, Run phase 4 and Resume list the values; Pause and Clear do not; Restart lists them", () => {
  const page = read("app/monitor/[slug]/page.tsx");
  assert.ok(page.includes("readBookSettings(slug)") && page.includes("<BookSettingsForm") && page.includes("settings={"));
  const view = read("components/BookDetailView.tsx");
  assert.ok(view.indexOf("{settings}") > view.indexOf('data-part="header"') && view.indexOf("{settings}") < view.indexOf('part="last-error"'));
  const rb = read("components/RowButtons.tsx");
  assert.ok(rb.includes('asking === "run" || asking === "run4" || asking === "resume" ? <BookSettingsValues slug={row.slug} />'));
  assert.ok(!/asking === "pause"[^\n]*BookSettingsValues/.test(rb) && !/asking === "clear"[^\n]*BookSettingsValues/.test(rb));
  assert.ok(read("components/RestartDialog.tsx").includes("<BookSettingsValues slug={slug} />"));
  const cd = read("components/ConfirmDialog.tsx");
  assert.ok(cd.includes("{children}") && cd.includes("children?: React.ReactNode"));
  assert.ok(read("components/BookSettingsValues.tsx").includes("/api/monitor/books/${encodeURIComponent(slug)}/settings"));
});
await check("a Run press still only writes a mark: RowButtons posts to /mark, /pause and /clear-mark only, and the settings route is the only new write route", () => {
  const rb = read("components/RowButtons.tsx").replace(/\/\/.*$/gm, "");
  assert.ok(rb.includes('"pause" : id === "clear" ? "clear-mark" : "mark"'));
  assert.ok(!rb.includes("/settings"));
  const routes = readdirSync(path.join(app, "app/api/monitor/books/[slug]")).sort();
  assert.deepEqual(routes, ["clear-mark", "mark", "pause", "restart-options", "route.ts", "settings"]);
});
await check("the new server files write only below the book folder: every fs write goes through bookPaths, and no file name comes from the HTTP body except the checked slug", () => {
  const src = read("lib/book-settings.ts").replace(/\/\/.*$/gm, "");
  const writes = (src.match(/fs\.(writeFile|rename|open|mkdir|unlink|appendFile|copyFile)\b/g) ?? []).length;
  assert.ok(writes > 0 && src.includes("isSafeBookName(book)") && src.includes("bookPaths(cfg.translatorConfigDir, book, true)"));
  assert.ok(!/path\.join\([^)]*(body|req)\b/.test(src));
  const api = read("lib/book-settings-api.ts");
  assert.ok(api.indexOf("monitorOffResponse") < api.indexOf("localWriteProblem") && api.indexOf("localWriteProblem") < api.indexOf("isSafeBookName(slug)") && api.indexOf("isSafeBookName(slug)") < api.indexOf("loadBookFresh(slug)"));
});
await check("the made-up Mac ends with the files that the unit may write: the book files and their history files only, the global file unchanged", () => {
  const files = listAll(bookDir);
  for (const f of files) assert.match(f, /^[A-Za-z0-9_.-]+\.(json|history\.jsonl)$/, f);
  assert.ok(!files.some((f) => /\.(lock|part)$/.test(f)));
  assert.equal(text(globalFile), GLOBAL_TEXT);
  // Unit VW123: the real folder holds a file since the live check of VW122 (2026-11-22). The test only compares the file names before and after its run.
  assert.deepEqual(existsSync(realBookDir) ? readdirSync(realBookDir).sort() : null, realBookBefore, "the real <T2>/config/book-settings has the same file names as before the test");
});

done();
