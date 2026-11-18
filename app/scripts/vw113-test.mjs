// Unit VW113 (Q-A 3:78.6 "Start P32 as planned", Q-A 3:81.2 "VW113 as written", Q-A 3:81.4 "Add sub-points"): server-free tests.
// Part 1: the Run settings schema has no cost field and no cost group; the other groups keep their order.
// Part 2: an old settings file with run.max_usd_per_page loads, the key is ignored, and a save does not write it back (same rule as RETIRED_KEYS in settings.py).
// Part 3: the real translator-settings.defaults.json of the Translator (read only) loads with no "a default is absent" fault.
// Part 4: the scroll offset rule of the book screen: the jump targets follow the height of the sticky bar (lib/htv-bar-offset.ts).
// Part 5: the sub-point marks of the vector map (lib/vector-map-rules.ts), levels 1 to 4.
// Made-up data below TMPDIR. The one read of the Translator folder is read only. No server, no network.
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw113-test.mjs. It prints "<n> passed, <m> failed" and exits 1 on a failure.
import assert from "node:assert/strict";
import { readFileSync, promises as fs } from "node:fs";
import path from "node:path";
import { checker, installAppHooks, madeUpRoot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
const T2 = "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator";
assert.ok(process.env.TMPDIR && (await fs.realpath(process.env.TMPDIR)).startsWith(path.dirname(app)), "Set TMPDIR inside the unit folder");
globalThis.fetch = async () => { throw new Error("No network in VW113 tests."); };
installAppHooks(app);
const kit = checker();
const check = (name, fn) => kit.check(name, fn);
const read = (rel) => readFileSync(path.join(app, rel), "utf8");

// A made-up Viewer configuration: the config folder holds copies of the real defaults and models files (read from the Translator, never written there).
const made = await madeUpRoot("vw113-");
const config = path.join(made.root, "config");
const data = path.join(made.root, "data");
await fs.mkdir(config); await fs.mkdir(data);
for (const name of ["translator-models.yaml", "translator-settings.defaults.json"]) await fs.copyFile(path.join(T2, "config", name), path.join(config, name));
const cfgFile = path.join(made.root, "viewer.config.json");
const useConfig = async (cfgDir) => { await fs.writeFile(cfgFile, JSON.stringify({ translatorDataDir: data, translatorConfigDir: cfgDir, monitor: true })); process.env.VIEWER_CONFIG = cfgFile; };
await useConfig(config);

const schema = await import("../lib/settings-schema.ts");
const store = await import("../lib/settings-run.ts");
const bar = await import("../lib/htv-bar-offset.ts");
const R = await import("../lib/vector-map-rules.ts");

// ---------------------------------------------------------------- part 1: the schema

await check("schema: no cost field, no cost group, no cost kind", () => {
  assert.equal(schema.FIELDS.some((f) => f.key === "run.max_usd_per_page"), false);
  assert.equal(schema.FIELDS.some((f) => f.kind === "cost" || /cost/i.test(f.label)), false);
  assert.equal(schema.GROUPS.some((g) => /cost/i.test(g)), false);
  assert.equal(schema.KEY_ORDER.includes("run.max_usd_per_page"), false);
  assert.equal(schema.FIELDS.length, 21);
});

await check("schema: seven groups in the old order, and the other fields sit in the group of the same name", () => {
  assert.deepEqual(schema.GROUPS, ["N", "Model and effort per level", "Box critic model", "Jobs and book jobs", "Critic mode", "Memory and link constants", "Call timeout and retries"]);
  const want = {
    "update.N": 0,
    "levels.0.model": 1, "levels.0.variant": 1, "levels.1.model": 1, "levels.1.variant": 1, "levels.2.model": 1, "levels.2.variant": 1, "levels.3.model": 1, "levels.3.variant": 1,
    "box_critic.model": 2, "box_critic.variant": 2,
    "run.jobs": 3, "run.book_jobs": 3,
    "run.critic_mode": 4,
    "memory.memory_k": 5, "memory.join_page_end": 5, "memory.join_across_title": 5, "links.neighbor_skip_cites": 5, "links.window_lines": 5,
    "calls.call_timeout_s": 6, "calls.max_attempts": 6,
  };
  assert.deepEqual(Object.fromEntries(schema.FIELDS.map((f) => [f.key, f.group])), want);
  // Every group has at least one field, so the panel draws no empty group.
  for (let g = 0; g < schema.GROUPS.length; g++) assert.ok(schema.FIELDS.some((f) => f.group === g), `group ${g} is empty`);
  // The order of the keys is the order of settings.py KEY_ORDER.
  assert.deepEqual(schema.KEY_ORDER, ["update.N", ...[0, 1, 2, 3].flatMap((l) => [`levels.${l}.model`, `levels.${l}.variant`]), "box_critic.model", "box_critic.variant", "run.jobs", "run.book_jobs", "run.critic_mode", "memory.memory_k", "memory.join_page_end", "memory.join_across_title", "links.neighbor_skip_cites", "links.window_lines", "calls.call_timeout_s", "calls.max_attempts"]);
});

await check("form: no cost branch is left in the form and no 'cost limit' text sits in the schema or the form", () => {
  const form = read("components/RunSettingsForm.tsx");
  assert.doesNotMatch(form, /"cost"|No limit/);
  const sch = read("lib/settings-schema.ts").replace(/\/\*\*[^\n]*\*\//g, "");
  assert.doesNotMatch(sch, /Cost limit|"cost"/);
});

// ---------------------------------------------------------------- part 2: the retired key

await check("retired key: a file with run.max_usd_per_page loads, the key is ignored (any value), and the other keys stay", () => {
  for (const v of ["1.0", "null", "5", '"bad"', "-3", "[]"]) {
    const doc = JSON.parse(`{"run":{"max_usd_per_page":${v},"jobs":2}}`);
    assert.deepEqual(schema.validateSettings(doc), { "run.jobs": 2 }, v);
  }
  assert.deepEqual(schema.validateSettings({ run: { max_usd_per_page: 1 } }), {});
  assert.deepEqual(schema.RETIRED_KEYS, [["run", "max_usd_per_page"]]);
});

await check("retired key: it does not hide an unknown key beside it, and it works only inside run", () => {
  assert.throws(() => schema.validateSettings({ run: { max_usd_per_page: 1, max_usd: 1 } }), /unknown key run\.max_usd$/);
  assert.throws(() => schema.validateSettings({ calls: { max_usd_per_page: 1 } }), /unknown key calls\.max_usd_per_page$/);
  assert.throws(() => schema.validateSettings({ max_usd_per_page: 1 }), /unknown key max_usd_per_page$/);
  assert.throws(() => schema.validateSettings({ run: { jobs: true, max_usd_per_page: 1 } }), /run\.jobs is true/);
});

await check("retired key: a proposal built from the form never holds the key (nestSettings)", () => {
  const nested = schema.nestSettings({ "run.jobs": 2, "run.max_usd_per_page": 1 });
  assert.deepEqual(nested, { run: { jobs: 2 } });
  assert.equal(JSON.stringify(nested).includes("max_usd"), false);
});

await check("store: an old settings file with the key loads with no error, and a save drops the key", async () => {
  const file = path.join(config, "translator-settings.json");
  await fs.writeFile(file, '{"schema":"translator-settings-v1","revision":3,"updated_utc":"2026-11-01T00:00:00Z","update":{"N":4},"run":{"max_usd_per_page":2.5,"jobs":2}}');
  const s = await store.readSettings();
  assert.equal(s.error, null, String(s.error));
  assert.deepEqual(s.overrides, { "update.N": 4, "run.jobs": 2 });
  assert.equal(s.revision, 3);
  const saved = await store.saveSettings({ update: { N: 4 }, run: { jobs: 3 } }, s.sha1);
  assert.equal(saved.error, null, String(saved.error));
  const text = await fs.readFile(file, "utf8");
  assert.equal(text.includes("max_usd_per_page"), false, "the saved file must not hold the key");
  assert.match(text, /"jobs": 3/);
  assert.deepEqual(saved.overrides, { "update.N": 4, "run.jobs": 3 });
  assert.equal(saved.history[0].changes.some((c) => c.key.includes("max_usd")), false);
  await fs.rm(file);
});

// ---------------------------------------------------------------- part 3: the real defaults file (read only)

await check("real defaults: translator-settings.defaults.json of the Translator loads with no 'a default is absent' fault", async () => {
  const realConfig = path.join(T2, "config");
  await useConfig(realConfig);
  try {
    const s = await store.readSettings();
    assert.equal(s.error, null, String(s.error));
    assert.equal(Object.keys(s.defaults).length, 21);
    assert.equal(Object.hasOwn(s.defaults, "run.max_usd_per_page"), false);
    assert.deepEqual(Object.keys(s.defaults).sort(), [...schema.KEY_ORDER].sort());
    const raw = JSON.parse(await fs.readFile(path.join(realConfig, "translator-settings.defaults.json"), "utf8"));
    assert.equal(Object.hasOwn(raw.run ?? {}, "max_usd_per_page"), false, "the Translator file has no cost key since f799ba2");
  } finally { await useConfig(config); }
});

await check("old defaults file with the cost key still loads (the key is ignored there too)", async () => {
  const doc = JSON.parse(await fs.readFile(path.join(config, "translator-settings.defaults.json"), "utf8"));
  doc.run.max_usd_per_page = null;
  const f = path.join(config, "translator-settings.defaults.json");
  const before = await fs.readFile(f, "utf8");
  await fs.writeFile(f, JSON.stringify(doc));
  try { const s = await store.readSettings(); assert.equal(s.error, null, String(s.error)); assert.equal(Object.keys(s.defaults).length, 21); }
  finally { await fs.writeFile(f, before); }
});

// ---------------------------------------------------------------- part 4: the scroll offset of the book screen

await check("scroll offset: the value is the bar height in whole px, rounded up, and a bar that is not drawn gives no value", () => {
  assert.equal(bar.barHeightValue(36), "36px");
  assert.equal(bar.barHeightValue(36.2), "37px");
  assert.equal(bar.barHeightValue(92.5), "93px");
  for (const h of [0, -5, NaN, Infinity, -Infinity]) assert.equal(bar.barHeightValue(h), null, String(h));
  for (const h of [20, 36.2, 91.4, 92.5, 150.01]) assert.ok(parseInt(bar.barHeightValue(h)) >= h, `${h} px bar: the offset covers the bar`);
});

await check("scroll offset: the CSS rule reads the bar height with the old 3.5 rem as fallback, plus a gap, and one name is used everywhere", () => {
  assert.equal(bar.BAR_VAR, "--htv-bar-h");
  assert.equal(bar.barOffsetCss(), "calc(var(--htv-bar-h, 3.5rem) + 4px)");
  const book = read("components/HtvBook.tsx");
  // Every jump target of the book screen uses the rule: the page sections and the chapter headings. The fixed scroll-mt-14 is gone.
  assert.doesNotMatch(book, /scroll-mt-14/);
  assert.equal((book.match(/scrollMarginTop: barOffsetCss\(\)/g) ?? []).length, 3, "section with rows, section placeholder, chapter heading");
  assert.match(book, /holder\.style\.setProperty\(BAR_VAR, value\)/);
  assert.match(book, /new ResizeObserver\(measure\)/);
  assert.match(book, /ref\.current/);
  // The bar layout is as it was: the same classes.
  assert.match(book, /sticky top-0 z-20 mb-1 flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-line bg-background px-3 py-1\.5 text-sm/);
});

await check("scroll offset: a plain #p045 or #chapter-3 link scrolls again at the first measure, and a running jump scrolls again when the bar changes", () => {
  const book = read("components/HtvBook.tsx");
  assert.match(book, /const onBarHeight = useCallback\(/);
  assert.match(book, /window\.location\.hash\.slice\(1\)/);
  assert.match(book, /els\.current\.get\(a\.n\)\?\.scrollIntoView\(\)/);
  assert.match(book, /<ColumnHeader readOnly=\{readOnly\} onHeight=\{onBarHeight\} \/>/);
});

await check("row 4b: the run picker select of a page section is as wide as its row at most, with its options and behavior as before", () => {
  const sec = read("components/HtvPageSection.tsx");
  const m = sec.match(/<select aria-label="Run to mark"[\s\S]*?data-run-mark-select>/);
  assert.ok(m, "the select is there");
  assert.match(m[0], /className="min-w-0 max-w-full rounded border border-line bg-white px-1\.5 py-0\.5"/);
  assert.match(m[0], /value=\{markRun\} onChange=\{\(e\) => setMarkRun\(e\.target\.value\)\}/);
  assert.match(sec, /\{r\.runId\} · \{r\.verdict\} · \{pstTimeOrText\(r\.startedUtc\) \|\| "no start time"\}/);
  // The row that holds it wraps, so a max-w-full select fits at 390 px.
  assert.match(sec, /<div className="mt-3 flex flex-wrap items-center gap-2 rounded border border-line bg-white\/60 p-2 text-sm">\s*<span className="font-medium">Run mark<\/span>/);
});

// ---------------------------------------------------------------- part 5: sub-points as emphasis marks

const SUB = ["Intro line.", "1. Top point.", "1.1. Sub one.", "1.1.1. Level three a.", "1.1.2. Level three b.", "1.1.2.1. Level four.", "1.2. Sub two. You must read it.", "1.10. Sub ten.", "2. Plain.", "10. Ten.", ""].join("\n");

await check("sub-points: direct count for levels 1 to 4 (2.4.1 and 2.4.2 count for 2.4; 1.10 counts for 1 and not for 1.1)", () => {
  const points = R.parsePoints(SUB);
  assert.deepEqual(points.map((p) => p.num), ["1", "1.1", "1.1.1", "1.1.2", "1.1.2.1", "1.2", "1.10", "2", "10"]);
  const direct = R.subPointCounts(points, "direct");
  assert.deepEqual([...direct].sort(), [["1", 3], ["1.1", 2], ["1.1.2", 1]].sort());
  assert.equal(direct.get("1.1.1"), undefined);
  assert.equal(direct.get("10"), undefined);
});

await check("sub-points: the deep count adds every level below, and the rule 'none' is the old count", () => {
  const points = R.parsePoints(SUB);
  assert.deepEqual([...R.subPointCounts(points, "deep")].sort(), [["1", 6], ["1.1", 3], ["1.1.2", 1]].sort());
  assert.equal(R.subPointCounts(points, "none").size, 0);
  assert.equal(R.SUB_POINT_MODE, "direct");
  // old rule: only 1.2 holds a strong word ("must")
  assert.deepEqual(R.emphasisMarks(points, "none"), [0, 0, 0, 0, 0, 1, 0, 0, 0]);
});

await check("sub-points: marks = citations + strong words + direct sub-points, and importance is the share of all marks", () => {
  const v = R.pointValues(SUB);
  assert.deepEqual(v.map((p) => p.marks), [3, 2, 0, 1, 0, 1, 0, 0, 0]);
  const sum = 7;
  assert.ok(Math.abs(v[0].imp - (3 / sum) * 100) < 1e-9 && Math.abs(v[1].imp - (2 / sum) * 100) < 1e-9 && v[2].imp === 0);
  assert.ok(Math.abs(v.reduce((a, p) => a + p.imp, 0) - 100) < 1e-9);
  const cite = R.pointValues("1. Top.\n1.1. Sub. See point 1.\n2. Next. See points 1.1.\n");
  assert.equal(cite[0].marks, 1, "1 has one direct sub-point; 'point 1' has no decimal part, so it is no citation");
  assert.equal(cite[1].marks, 1, "1.1 is cited by point 2");
});

await check("sub-points: a prompt with no sub-point gives the old marks, and comprehensiveness does not change", () => {
  const flat = "1. Never skip.\n2. You must write. See point 1.\n3. Plain.\n";
  const v = R.pointValues(flat);
  assert.deepEqual(v.map((p) => p.marks), R.emphasisMarks(R.parsePoints(flat), "none"));
  const len = flat.length;
  assert.ok(Math.abs(v[0].comp - ("1. Never skip.".length / len) * 100) < 1e-9);
});

await check("sub-points: the real prompt QA_3 v2.1.14 gives the new values of the three points of the VW106 check (read only)", () => {
  const file = path.join(T2, "data/book-store/paired-dataset/prompts/QA_3/v2.1.14.json");
  const values = R.pointValues(JSON.parse(readFileSync(file, "utf8")).text);
  const at = (n) => values.find((p) => p.num === n);
  const line = ["2.4", "6.7", "6.8"].map((n) => `${n} comp ${R.oneDecimal(at(n).comp)} imp ${R.oneDecimal(at(n).imp)}`).join(" | ");
  // old rule: 2.4 comp 4.9 imp 6.5 | 6.7 comp 11.7 imp 9.5 | 6.8 comp 0.3 imp 9.0 (VW106). Sum of the marks 200 before, 288 now.
  assert.equal(line, "2.4 comp 4.9 imp 4.5 | 6.7 comp 11.7 imp 6.6 | 6.8 comp 0.3 imp 8.3");
  assert.equal(values.reduce((a, p) => a + p.marks, 0), 288);
});

await check("sub-points: the help text of the vector map names the sub-points", () => {
  const view = read("components/VectorMapView.tsx");
  assert.match(view, /Importance is the share of the emphasis marks: citations by other points, the words must, never, always, only, do not, every, and the sub-points of the point/);
  assert.match(view, /2\.4\.1 and 2\.4\.2 for point 2\.4/);
});

await fs.rm(made.base, { recursive: true, force: true });
kit.done();
