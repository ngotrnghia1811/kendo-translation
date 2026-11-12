// VW90 (round 90): server-free tests of the cross-page sentence, Reader page part (Q-A 3:1.6, design 9.24.11 and design test 7).
// Run: scripts/dev/cleanenv.sh node app/scripts/cross-page-reader-test.mjs (from the unit folder).
// It reads the stored pilot runs of left_foot_full p048 and p050, and the other finished pilot runs, read only from <T2>/data/pilot-run.
// It writes only under <unit>/fixture. It runs the sync command S2 with --offline (no sign-in, no server, no write) and never with --apply.
// It runs S2 twice on the same data: the original code (<unit>/baseline, a copy of <V2>/app/lib and scripts) and the changed code (<unit>/app).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

// ---------------------------------------------------------------- guard: only inside the unit folder VW90
const app = path.resolve(import.meta.dirname, "..");
const u = await fs.realpath(path.dirname(app));
function refuse(message) {
  console.error("Refused: " + message);
  process.exit(2);
}
if (!/\/opencode\/r90\/VW90$/.test(u)) refuse(`this folder is not under /opencode/r90/VW90 (${u}).`);
// A bare `node scripts/cross-page-reader-test.mjs` starts itself again through the clean-env wrapper, so a test never inherits the live data paths.
if (process.env.VW90_UNIT === undefined) {
  const again = spawnSync(path.join(u, "scripts/dev/cleanenv.sh"), [process.execPath, fileURLToPath(import.meta.url)], { stdio: "inherit" });
  process.exit(again.status ?? 2);
}
if (process.env.VW90_UNIT !== u) refuse("VW90_UNIT does not name this unit folder.");
if (!process.env.TMPDIR || (await fs.realpath(process.env.TMPDIR)) !== path.join(u, "tmp")) refuse("TMPDIR must be <unit>/tmp.");
const baselineApp = path.join(u, "baseline/app");
await fs.access(path.join(baselineApp, "scripts/sync-runs.mjs")).catch(() => refuse("baseline/app is missing. Copy lib and scripts of <V2>/app into it."));

const t2data = "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/data";
const fixture = path.join(u, "fixture");
const inside = (p) => {
  if (!path.resolve(p).startsWith(fixture + path.sep)) refuse(`a write outside ${fixture}: ${p}`);
  return p;
};

// ---------------------------------------------------------------- fixture
const P48 = "left_foot_full/p048";
const P50 = "left_foot_full/p050";
const RUN48 = "20261029T061734Z-r41";
const RUN50 = "20261029T071515Z-r41";
const FILES = ["summary.json", "run.json", "results/TS_3.json", "results/ED_3.json", "programs/term_marks.ED_3.json", "programs/en_form_check.ED_3.json", "messages/TL_3.txt"];
const RUN_RULE = /^\d{8}T\d{6}Z/;

await fs.rm(fixture, { recursive: true, force: true });
await fs.mkdir(fixture, { recursive: true });
const pbUrl = "http://127.0.0.1:8099"; // never contacted: the test replaces fetch
const fixtureConfig = path.join(fixture, "viewer.config.json");
await fs.writeFile(inside(fixtureConfig), JSON.stringify({ translatorDataDir: path.join(fixture, "base/data"), runSource: "pocketbase", pocketbaseUrl: pbUrl, monitor: false }));
assert.equal(process.env.VIEWER_CONFIG, fixtureConfig);

async function copyRun(dest, folder, runId) {
  for (const f of FILES) {
    const from = path.join(t2data, "pilot-run", folder, runId, f);
    const to = inside(path.join(dest, "pilot-run", folder, runId, f));
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
}
const dataOf = (name) => path.join(fixture, name, "data");
await copyRun(dataOf("base"), "left_foot_full_p048", RUN48);
await copyRun(dataOf("base"), "left_foot_full_p050", RUN50);
// All other finished pilot runs: the proof that an old run with no cross_page.json and no cross_page_from.json gives the same output as before.
const pilotDirs = (await fs.readdir(path.join(t2data, "pilot-run"))).filter((n) => /^[A-Za-z0-9][A-Za-z0-9._-]*_p\d+$/.test(n)).sort();
for (const folder of pilotDirs) {
  for (const runId of (await fs.readdir(path.join(t2data, "pilot-run", folder))).filter((n) => RUN_RULE.test(n)).sort()) await copyRun(dataOf("all"), folder, runId);
}
async function cloneBase(name) {
  await fs.cp(dataOf("base"), inside(dataOf(name)), { recursive: true });
}
const jsonOf = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const ed48 = (await jsonOf(path.join(dataOf("base"), "pilot-run/left_foot_full_p048", RUN48, "results/ED_3.json"))).after_program_step;
const half = ["L11", "L12"].map((id) => ed48.lines.find((x) => x.item_id === `${P48}/ed3/${id}`).text).join(" ");

// The constructed pair (design test 7). full_en is the example sentence of design 9.24.9. The stored T7 runs were made before TR90, so they have no such file.
const FULL =
  "When striking Men (head target) or Kote (forearm target), I swing up and swing down in the manner of a circular motion with the Hidari-te as the fulcrum and conscious of both shoulders, but by striking without letting the trajectory of the Shinai (bamboo sword) leave the Chūzumi, the left line functions effectively.";
const tail = [`${P48}/ts3/L11`, `${P48}/ts3/L12`];
const firstDoc = {
  schema: "cross-page-v1", role: "first_half", page_id: P48, folio: "52", ts_ids: tail, half_en: half, full_en: FULL,
  to_page: P50, to_folio: "54", to_run_id: "20261029T051152Z/" + RUN50, to_verdict: "PASS", written_utc: "2026-11-10T00:00:00Z",
};
const secondDoc = {
  schema: "cross-page-v1", role: "second_half", page_id: P50, folio: "54", ts_ids: [`${P50}/ts3/L01`], full_en: FULL,
  from_page: P48, from_folio: "52", from_ts_ids: tail, from_run_id: RUN48, run_id: RUN50, verdict: "PASS", written_utc: "2026-11-10T00:00:00Z",
};
// Two file names (Q-A 3:4.7): the earlier page keeps results/cross_page.json (role first_half), the later page writes results/cross_page_from.json (role second_half).
const REL1 = "cross_page.json";
const REL2 = "cross_page_from.json";
const crossFile = (data, folder, runId, rel, text) => fs.writeFile(inside(path.join(data, "pilot-run", folder, runId, "results", rel)), typeof text === "string" ? text : JSON.stringify(text, null, 1));
await cloneBase("cross");
await crossFile(dataOf("cross"), "left_foot_full_p048", RUN48, REL1, firstDoc);
await crossFile(dataOf("cross"), "left_foot_full_p050", RUN50, REL2, secondDoc);
// A middle page (VW90 follow-up): p050 is the later page of the p048 sentence (cross_page_from.json) and the earlier page of a sentence that goes on to a page p051.
// The stored run has the open tail row L10-L13 ("... placed on the head, and"). The page p051 does not exist in the fixture, so the file is constructed. full_en is test text.
const ed50 = (await jsonOf(path.join(dataOf("base"), "pilot-run/left_foot_full_p050", RUN50, "results/ED_3.json"))).after_program_step;
const tail50 = ["L10", "L11", "L12", "L13"].map((id) => `${P50}/ts3/${id}`);
const half50 = ["L10", "L11", "L12", "L13"].map((id) => ed50.lines.find((x) => x.item_id === `${P50}/ed3/${id}`).text).join(" ");
const P51 = "left_foot_full/p051";
const FULL50 = half50 + " [Test fixture text: the rest of this sentence would come from page 55.]";
const firstDoc50 = {
  schema: "cross-page-v1", role: "first_half", page_id: P50, folio: "54", ts_ids: tail50, half_en: half50, full_en: FULL50,
  to_page: P51, to_folio: "55", to_run_id: "20261029T080000Z-r41", to_verdict: "PASS", written_utc: "2026-11-11T00:00:00Z",
};
await cloneBase("middle");
await crossFile(dataOf("middle"), "left_foot_full_p048", RUN48, REL1, firstDoc);
await crossFile(dataOf("middle"), "left_foot_full_p050", RUN50, REL2, secondDoc);
await crossFile(dataOf("middle"), "left_foot_full_p050", RUN50, REL1, firstDoc50);
// The older form (the later page file inside cross_page.json) is not read any more. No real file of that form exists.
await cloneBase("oldform");
await crossFile(dataOf("oldform"), "left_foot_full_p048", RUN48, REL1, firstDoc);
await crossFile(dataOf("oldform"), "left_foot_full_p050", RUN50, REL1, secondDoc);
// Bad files. Each case: the page folder, its run, the file name, the content, and the reason text that the warning must hold.
const bad = {
  "bad-json": ["left_foot_full_p048", RUN48, REL1, "{ not json", "the file is not valid JSON"],
  "bad-schema": ["left_foot_full_p048", RUN48, REL1, { ...firstDoc, schema: "cross-page-v2" }, 'the schema is "cross-page-v2", not cross-page-v1'],
  "bad-ids": ["left_foot_full_p048", RUN48, REL1, { ...firstDoc, ts_ids: [tail[0]] }, "no row has exactly the ts_ids"],
  "bad-second": ["left_foot_full_p050", RUN50, REL2, { ...secondDoc, ts_ids: [tail[0]] }, "no row holds the ts_ids"],
  "bad-json-from": ["left_foot_full_p050", RUN50, REL2, "{ not json", "the file is not valid JSON"],
  "wrong-role-first": ["left_foot_full_p050", RUN50, REL1, secondDoc, "the role is second_half, but this file name needs the role first_half"],
  "wrong-role-from": ["left_foot_full_p048", RUN48, REL2, firstDoc, "the role is first_half, but this file name needs the role second_half"],
};
for (const [name, [folder, runId, rel, doc]] of Object.entries(bad)) {
  await cloneBase(name);
  await crossFile(dataOf(name), folder, runId, rel, doc);
}
await cloneBase("mixed"); // p048 good, p050 damaged: S2 goes on with the good file
await crossFile(dataOf("mixed"), "left_foot_full_p048", RUN48, REL1, firstDoc);
await crossFile(dataOf("mixed"), "left_foot_full_p050", RUN50, REL2, "{ not json");
await cloneBase("mixed-middle"); // p050 holds both files, its cross_page.json is damaged: cross_page_from.json still applies
await crossFile(dataOf("mixed-middle"), "left_foot_full_p050", RUN50, REL2, secondDoc);
await crossFile(dataOf("mixed-middle"), "left_foot_full_p050", RUN50, REL1, "{ not json");

// ---------------------------------------------------------------- run S2 (offline) with a capture of the JSON that it builds
// The preload wraps JSON.stringify and keeps the text of each reader_pages body and each snapshot. S2 stringifies them to measure their size.
const preload = path.join(fixture, "capture-preload.mjs");
await fs.writeFile(
  inside(preload),
  `import fs from "node:fs";
const orig = JSON.stringify;
const cap = { reader: {}, snapshot: {} };
JSON.stringify = function (v, ...rest) {
  const s = orig.call(this, v, ...rest);
  if (v && typeof v === "object" && !Array.isArray(v) && typeof v.page_id === "string" && Array.isArray(v.rows)) {
    if (typeof v.search_en === "string") cap.reader[v.page_id] = s;
    else if (v.snapshot_format !== undefined) cap.snapshot[v.page_id + "|" + v.run_id] = s;
  }
  return s;
};
process.on("exit", () => { if (process.env.VW90_CAPTURE) fs.writeFileSync(process.env.VW90_CAPTURE, orig(cap)); });
`,
);
let runNo = 0;
async function runS2(appDir, name) {
  const capFile = inside(path.join(fixture, `capture-${++runNo}.json`));
  const r = spawnSync(process.execPath, ["--import", pathToFileURL(preload).href, path.join(appDir, "scripts/sync-runs.mjs"), "--offline", "--data", dataOf(name)], {
    cwd: appDir,
    env: { ...process.env, VW90_CAPTURE: capFile },
    encoding: "utf8",
    timeout: 300000,
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(r.status, 0, `S2 exit code for ${name} (${appDir}): ${r.status}\n${r.stderr}\n${r.stdout.slice(-800)}`);
  const cap = JSON.parse(await fs.readFile(capFile, "utf8"));
  return { stdout: r.stdout, stderr: r.stderr, reader: Object.fromEntries(Object.entries(cap.reader).map(([k, v]) => [k, JSON.parse(v)])), readerText: cap.reader, snapshot: cap.snapshot };
}
const warnLines = (out) => out.stdout.split("\n").filter((l) => l.startsWith("Warning: "));
const crossLines = (out) => out.stdout.split("\n").filter((l) => l.startsWith("cross_page | "));

// ---------------------------------------------------------------- load the app code
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier === "next/navigation") return { url: "data:text/javascript,export function notFound(){throw new Error('NOT_FOUND')} export function redirect(){throw new Error('REDIRECT')}", shortCircuit: true };
    if (specifier === "next/headers") return { url: "data:text/javascript,export function cookies(){throw new Error('No cookies in VW90 tests')} export function headers(){throw new Error('No headers in VW90 tests')}", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(pathToFileURL(path.join(app, specifier.slice(2)) + ".ts").href, context);
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !path.extname(specifier)) return next(new URL(specifier + ".ts", context.parentURL).href, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".ts")) return { ...next(url, { ...context, format: "module-typescript" }), format: "module-typescript" };
    return next(url, context);
  },
});
const lib = (name) => import(pathToFileURL(path.join(app, "lib", name)).href);
const X = await lib("cross-page-reader.ts");
const B = await lib("htv-build.ts");
const S = await lib("reader-search.ts");
const L = await lib("reader-layout.ts");

let count = 0;
async function check(name, fn) {
  await fn();
  count++;
  console.log("PASS " + name);
}
const rowOf = (body, key) => body.rows.find((r) => r.key === key);
const K48 = `${P48}/ts3/L11-L12`;
const K50 = `${P50}/ts3/L01-L05`;

// ---------------------------------------------------------------- pure code: readCrossPage
await check("file names: cross_page.json holds first_half, cross_page_from.json holds second_half", () => {
  assert.equal(X.CROSS_PAGE_REL, "results/cross_page.json");
  assert.equal(X.CROSS_PAGE_FROM_REL, "results/cross_page_from.json");
  assert.equal(X.crossRel("first_half"), "results/cross_page.json");
  assert.equal(X.crossRel("second_half"), "results/cross_page_from.json");
});
await check("readCrossPage: null text means none; the constructed pair is ok under the two names", () => {
  assert.deepEqual(X.readCrossPage(null, P48, "first_half"), { state: "none" });
  assert.deepEqual(X.readCrossPage(null, P48, "second_half"), { state: "none" });
  const a = X.readCrossPage(JSON.stringify(firstDoc), P48, "first_half");
  assert.equal(a.state, "ok");
  assert.deepEqual(a.file, { role: "first_half", tsIds: tail, fullEn: FULL, other: { folio: "54", pageId: P50 } });
  const b = X.readCrossPage(JSON.stringify(secondDoc), P50, "second_half");
  assert.deepEqual(b.file, { role: "second_half", tsIds: [`${P50}/ts3/L01`], fullEn: "", other: { folio: "52", pageId: P48 } });
});
await check("readCrossPage: a file with the wrong role for its name is skipped (both ways); the older form is not read", () => {
  const a = X.readCrossPage(JSON.stringify(secondDoc), P50, "first_half");
  assert.equal(a.state, "skip");
  assert.equal(a.reason, "the role is second_half, but this file name needs the role first_half");
  const b = X.readCrossPage(JSON.stringify(firstDoc), P48, "second_half");
  assert.equal(b.state, "skip");
  assert.equal(b.reason, "the role is first_half, but this file name needs the role second_half");
});
await check("readCrossPage: 18 damaged or foreign files are skipped with a reason", () => {
  const cases = [
    ["not JSON", "{ not json", "not valid JSON"],
    ["array", "[]", "not a JSON object"],
    ["null", "null", "not a JSON object"],
    ["text", '"x"', "not a JSON object"],
    ["no schema", { ...firstDoc, schema: undefined }, "the schema is null"],
    ["schema v2", { ...firstDoc, schema: "cross-page-v2" }, "not cross-page-v1"],
    ["role unknown", { ...firstDoc, role: "middle" }, "not first_half or second_half"],
    ["role missing", { ...firstDoc, role: undefined }, "the role is null"],
    ["page_id of another page", { ...firstDoc, page_id: P50 }, "not left_foot_full/p048"],
    ["ts_ids empty", { ...firstDoc, ts_ids: [] }, "ts_ids"],
    ["ts_ids not text", { ...firstDoc, ts_ids: [1] }, "ts_ids"],
    ["full_en empty", { ...firstDoc, full_en: "  " }, "full_en is empty"],
    ["to_page missing", { ...firstDoc, to_page: undefined }, "to_page is not a page ID"],
    ["to_page bad form", { ...firstDoc, to_page: "p050" }, "to_page is not a page ID"],
    ["to_page in another book", { ...firstDoc, to_page: "mental_full/p014" }, "in another book"],
    ["to_page is the page", { ...firstDoc, to_page: P48 }, "the page itself"],
    ["to_folio is a number", { ...firstDoc, to_folio: 54 }, "to_folio is not text or null"],
    ["second_half without from_page", { ...secondDoc, from_page: undefined }, "from_page is not a page ID"],
  ];
  for (const [name, doc, reason] of cases) {
    const second = doc && doc.role === "second_half";
    const r = X.readCrossPage(typeof doc === "string" ? doc : JSON.stringify(doc), second ? P50 : P48, second ? "second_half" : "first_half");
    assert.equal(r.state, "skip", name);
    assert.ok(r.reason.includes(reason), `${name}: ${r.reason}`);
  }
});
await check("readCrossPage: a folio of null or empty text gives null; the role second_half needs no full_en", () => {
  assert.equal(X.readCrossPage(JSON.stringify({ ...firstDoc, to_folio: null }), P48, "first_half").file.other.folio, null);
  assert.equal(X.readCrossPage(JSON.stringify({ ...firstDoc, to_folio: " " }), P48, "first_half").file.other.folio, null);
  assert.equal(X.readCrossPage(JSON.stringify({ ...secondDoc, full_en: undefined }), P50, "second_half").state, "ok");
});
await check("notes: the owner words for the earlier page, the design words for the later page, the no-folio form, and both notes of one row", () => {
  assert.equal(X.noteContinues({ folio: "54", pageId: P50 }), "The sentence continues on page 54.");
  assert.equal(X.noteStarts({ folio: "52", pageId: P48 }), "The sentence starts on page 52.");
  assert.equal(X.noteContinues({ folio: null, pageId: P50 }), "The sentence continues on a later page.");
  assert.equal(X.noteStarts({ folio: null, pageId: P48 }), "The sentence starts on an earlier page.");
  assert.equal(X.rowNote({}), "");
  assert.equal(X.rowNote({ continues: { folio: "54", pageId: P50 } }), "The sentence continues on page 54.");
  assert.equal(X.rowNote({ continues_from: { folio: "52", pageId: P48 } }), "The sentence starts on page 52.");
  assert.equal(X.rowNote({ continues_from: { folio: "52", pageId: P48 }, continues: { folio: "54", pageId: P50 } }), "The sentence starts on page 52. The sentence continues on page 54.");
});
await check("rowLinks: a stored row keeps the two keys; a wrong shape is left out; an old row gives {}", () => {
  assert.deepEqual(X.rowLinks({ key: "a", continues: { folio: "54", pageId: P50 } }), { continues: { folio: "54", pageId: P50 } });
  assert.deepEqual(X.rowLinks({ continues_from: { folio: null, pageId: P48 } }), { continues_from: { folio: null, pageId: P48 } });
  assert.deepEqual(X.rowLinks({ continues: "x", continues_from: { folio: "1" } }), {});
  assert.deepEqual(X.rowLinks({ key: "a", ed3: "b" }), {});
  assert.deepEqual(X.rowLinks(undefined), {});
});

// ---------------------------------------------------------------- pure code: crossPageForReader on built runs
const readFiles = async (folder, runId) => {
  const d = path.join(dataOf("base"), "pilot-run", folder, runId);
  const read = (f) => fs.readFile(path.join(d, f), "utf8").then(JSON.parse, () => null);
  return { ts3: await read("results/TS_3.json"), ed3: await read("results/ED_3.json"), termMarks: await read("programs/term_marks.ED_3.json"), enFormCheck: await read("programs/en_form_check.ED_3.json"), tl3Message: null, termbase: new Map() };
};
const built48 = B.buildRun(P48, await readFiles("left_foot_full_p048", RUN48));
const built50 = B.buildRun(P50, await readFiles("left_foot_full_p050", RUN50));
const before48 = JSON.stringify(built48);
const K50T = `${P50}/ts3/L10-L13`;
const before50 = JSON.stringify(built50);
const texts = (first, from) => ({ first: first === null ? null : typeof first === "string" ? first : JSON.stringify(first), from: from === null ? null : typeof from === "string" ? from : JSON.stringify(from) });
await check("crossPageForReader first_half: the tail row changes, no other row, and the input stays as it was", () => {
  const r = X.crossPageForReader(P48, built48, texts(firstDoc, null));
  assert.deepEqual(r.warnings, []);
  assert.equal(r.lines.length, 1);
  assert.equal(JSON.stringify(built48), before48, "the input built run must not change");
  const old = built48.rows.find((x) => x.key === K48);
  const now = r.built.rows.find((x) => x.key === K48);
  assert.equal(now.ed3, FULL);
  assert.deepEqual(now.edMarks, []);
  assert.ok(old.edMarks.length > 0 && old.jaMarks.length > 0, "the stored row has EN marks and JA marks");
  assert.deepEqual(now.jaMarks, old.jaMarks);
  assert.equal(now.ja, old.ja);
  assert.deepEqual(r.built.rows.filter((x) => x.key !== K48), built48.rows.filter((x) => x.key !== K48));
  assert.deepEqual([...r.links], [[K48, { continues: { folio: "54", pageId: P50 } }]]);
  assert.notEqual(r.built, built48);
});
await check("crossPageForReader second_half: only the key continues_from on the first row that holds the IDs; the same built object", () => {
  const r = X.crossPageForReader(P50, built50, texts(null, secondDoc));
  assert.equal(r.built, built50);
  assert.deepEqual([...r.links], [[K50, { continues_from: { folio: "52", pageId: P48 } }]]);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.lines.length, 1);
});
await check("crossPageForReader: no file, damaged file, ts_ids without a row: the built run and the links stay empty", () => {
  for (const t of [null, "{ no", JSON.stringify({ ...firstDoc, ts_ids: [tail[0]] }), JSON.stringify({ ...firstDoc, ts_ids: [`${P48}/ts3/L99`] })]) {
    const r = X.crossPageForReader(P48, built48, texts(t, null));
    assert.equal(r.built, built48);
    assert.equal(r.links.size, 0);
    assert.deepEqual(r.lines, []);
    assert.equal(r.warnings.length, t === null ? 0 : 1);
  }
  const none = X.crossPageForReader(P48, built48, texts(null, null));
  assert.equal(none.built, built48);
  assert.deepEqual([none.links.size, none.lines, none.warnings], [0, [], []]);
});
await check("crossPageForReader, middle page (p050 with both files): the head row and the tail row change, no other row, the input stays", () => {
  const r = X.crossPageForReader(P50, built50, texts(firstDoc50, secondDoc));
  assert.equal(JSON.stringify(built50), before50, "the input built run must not change");
  assert.deepEqual(r.warnings, []);
  assert.equal(r.lines.length, 2);
  assert.ok(r.lines[0].startsWith(`cross_page | ${P50} | first_half | L10-L13 | `) && r.lines[0].endsWith(`| continues on page 55 (${P51})`), r.lines[0]);
  assert.equal(r.lines[1], `cross_page | ${P50} | second_half | L01-L05 | note only, the EN text stays | starts on page 52 (${P48})`);
  const old = built50.rows.find((x) => x.key === K50T);
  const tailNow = r.built.rows.find((x) => x.key === K50T);
  assert.ok(old.edMarks.length > 0 && old.jaMarks.length > 0);
  assert.equal(tailNow.ed3, FULL50);
  assert.deepEqual(tailNow.edMarks, []);
  assert.deepEqual(tailNow.jaMarks, old.jaMarks);
  assert.deepEqual(r.built.rows.filter((x) => x.key !== K50T), built50.rows.filter((x) => x.key !== K50T), "the head row keeps its text and marks");
  assert.deepEqual([...r.links].sort(), [
    [K50, { continues_from: { folio: "52", pageId: P48 } }],
    [K50T, { continues: { folio: "55", pageId: P51 } }],
  ].sort());
  assert.equal(r.links.size, 2);
});
await check("crossPageForReader, middle page: a damaged file does not stop the other one (both ways)", () => {
  const a = X.crossPageForReader(P50, built50, texts("{ no", secondDoc));
  assert.equal(a.warnings.length, 1);
  assert.ok(a.warnings[0].startsWith("results/cross_page.json skipped: "), a.warnings[0]);
  assert.deepEqual([...a.links], [[K50, { continues_from: { folio: "52", pageId: P48 } }]]);
  assert.equal(a.built, built50);
  const b = X.crossPageForReader(P50, built50, texts(firstDoc50, "{ no"));
  assert.equal(b.warnings.length, 1);
  assert.ok(b.warnings[0].startsWith("results/cross_page_from.json skipped: "), b.warnings[0]);
  assert.deepEqual([...b.links], [[K50T, { continues: { folio: "55", pageId: P51 } }]]);
  assert.equal(b.built.rows.find((x) => x.key === K50T).ed3, FULL50);
});
await check("crossPageForReader: a wrong role under each name gives one warning with the file name and no change", () => {
  const a = X.crossPageForReader(P50, built50, texts(secondDoc, null));
  assert.deepEqual(a.warnings, ["results/cross_page.json skipped: the role is second_half, but this file name needs the role first_half."]);
  assert.equal(a.built, built50);
  assert.equal(a.links.size, 0);
  const b = X.crossPageForReader(P48, built48, texts(null, firstDoc));
  assert.deepEqual(b.warnings, ["results/cross_page_from.json skipped: the role is first_half, but this file name needs the role second_half."]);
  assert.equal(b.built, built48);
  assert.equal(b.links.size, 0);
  const c = X.crossPageForReader(P50, built50, texts(secondDoc, secondDoc));
  assert.equal(c.warnings.length, 1);
  assert.equal(c.links.size, 1, "the second_half file under its own name still applies");
});
await check("crossPageForReader, page with one row only: both keys on that row, the full sentence of cross_page.json, both notes", () => {
  const mark = { start: 1, end: 3, markId: "m", entryId: "e", surface: "s", result: null, detail: null };
  const one = { key: "b/p010/ts3/L01-L03", shortKey: "L01-L03", part: "lines", tsIds: ["b/p010/ts3/L01", "b/p010/ts3/L02", "b/p010/ts3/L03"], ja: "ja", ed3: "own text", jaMarks: [mark], edMarks: [mark] };
  const built = { rows: [one], panel: {}, terms: {}, notes: [] };
  const first = { ...firstDoc, page_id: "b/p010", ts_ids: one.tsIds, full_en: "full sentence from page 11 on", to_page: "b/p011", to_folio: "12" };
  const second = { ...secondDoc, page_id: "b/p010", ts_ids: [one.tsIds[0]], from_page: "b/p009", from_folio: "8" };
  const r = X.crossPageForReader("b/p010", built, texts(first, second));
  assert.deepEqual(r.warnings, []);
  assert.equal(r.lines.length, 2);
  assert.equal(r.built.rows.length, 1);
  assert.equal(r.built.rows[0].ed3, "full sentence from page 11 on");
  assert.deepEqual(r.built.rows[0].edMarks, []);
  assert.deepEqual(r.built.rows[0].jaMarks, [mark]);
  assert.deepEqual([...r.links], [[one.key, { continues: { folio: "12", pageId: "b/p011" }, continues_from: { folio: "8", pageId: "b/p009" } }]]);
  assert.equal(X.rowNote(r.links.get(one.key)), "The sentence starts on page 8. The sentence continues on page 12.");
  assert.equal(built.rows[0].ed3, "own text", "the input stays");
  assert.equal(built.rows[0].edMarks.length, 1);
});

// ---------------------------------------------------------------- S2 --offline: old runs, design test 7, bad files
const oldOut = await runS2(baselineApp, "base");
const newOnOld = await runS2(app, "base");
await check("old runs p048 and p050 (no file): S2 output, reader records, and snapshots are byte-identical to the original code", () => {
  assert.equal(newOnOld.stdout, oldOut.stdout);
  assert.equal(newOnOld.stderr, oldOut.stderr);
  assert.deepEqual(Object.keys(newOnOld.readerText).sort(), [P48, P50]);
  assert.deepEqual(newOnOld.readerText, oldOut.readerText);
  assert.deepEqual(newOnOld.snapshot, oldOut.snapshot);
  assert.equal(crossLines(newOnOld).length + warnLines(newOnOld).length, 0);
  for (const b of Object.values(newOnOld.reader)) assert.ok(b.rows.every((r) => !("continues" in r) && !("continues_from" in r)));
});
await check("old runs: the rows equal readerRows of the snapshot rows made by hand (the check of smoke.mjs)", () => {
  const dropResearch = (m) => ({ start: m.start, end: m.end, markId: m.markId, entryId: m.entryId, surface: m.surface });
  for (const [page, key] of [[P48, "left_foot_full/p048|" + RUN48], [P50, "left_foot_full/p050|" + RUN50]]) {
    const snap = JSON.parse(newOnOld.snapshot[key]);
    const byHand = snap.rows.map((r) => ({ key: r.key, shortKey: r.shortKey, part: r.part, ja: r.ja, ed3: r.ed3, jaMarks: r.jaMarks.map(dropResearch), edMarks: r.edMarks.map(dropResearch) }));
    assert.deepEqual(newOnOld.reader[page].rows, byHand);
  }
});
const allOld = await runS2(baselineApp, "all");
const allNew = await runS2(app, "all");
await check("old runs, all finished pilot runs: S2 output, reader records, and snapshots are byte-identical to the original code", () => {
  const runs = Object.keys(allNew.snapshot).length;
  assert.ok(runs >= 30, `snapshots: ${runs}`);
  assert.equal(allNew.stdout, allOld.stdout);
  assert.equal(allNew.stderr, allOld.stderr);
  assert.deepEqual(allNew.readerText, allOld.readerText);
  assert.deepEqual(allNew.snapshot, allOld.snapshot);
  assert.equal(crossLines(allNew).length + warnLines(allNew).length, 0);
  console.log(`  ${runs} snapshots and ${Object.keys(allNew.readerText).length} reader records compared`);
});

const cross = await runS2(app, "cross");
const oldRow48 = rowOf(newOnOld.reader[P48], K48);
await check("design test 7 (two file names): S2 --offline on the stored runs plus a constructed pair: p048 row ed3 equals full_en, EN marks gone, key continues", () => {
  const body = cross.reader[P48];
  const row = rowOf(body, K48);
  assert.equal(row.ed3, FULL);
  assert.deepEqual(row.edMarks, []);
  assert.ok(oldRow48.edMarks.length > 0);
  assert.deepEqual(row.jaMarks, oldRow48.jaMarks);
  assert.equal(row.ja, oldRow48.ja);
  assert.deepEqual(row.continues, { folio: "54", pageId: P50 });
  assert.ok(!("continues_from" in row));
  assert.deepEqual(body.rows.filter((r) => r.key !== K48), newOnOld.reader[P48].rows.filter((r) => r.key !== K48));
  console.log(`  p048 row ${row.shortKey}: ed3 = full_en (${Array.from(FULL).length} characters), EN marks ${oldRow48.edMarks.length} -> 0, JA marks ${row.jaMarks.length} kept, continues = ${JSON.stringify(row.continues)}`);
});
await check("design test 7: p050 first row has continues_from, its ed3 and marks stay, the other rows stay", () => {
  const body = cross.reader[P50];
  const row = rowOf(body, K50);
  const old = rowOf(newOnOld.reader[P50], K50);
  assert.deepEqual(row.continues_from, { folio: "52", pageId: P48 });
  assert.ok(!("continues" in row));
  const { continues_from, ...rest } = row;
  assert.deepEqual(rest, old);
  assert.deepEqual(body.rows.filter((r) => r.key !== K50), newOnOld.reader[P50].rows.filter((r) => r.key !== K50));
  assert.ok(body.rows.filter((r) => "continues_from" in r).length === 1);
});
await check("design test 7: search_en of p048 holds the full EN and finds the second half; p050 search_en stays", () => {
  assert.ok(!newOnOld.reader[P48].search_en.includes("functions effectively"));
  assert.ok(cross.reader[P48].search_en.includes(S.foldText(FULL)));
  assert.ok(cross.reader[P48].search_en.includes(S.foldQuery("the left line functions effectively")));
  assert.equal(cross.reader[P50].search_en, newOnOld.reader[P50].search_en);
  assert.equal(cross.reader[P48].search_ja, newOnOld.reader[P48].search_ja);
});
await check("snapshots (page_runs) stay as they are with the file: the Human translation view /translate is not touched", () => {
  assert.deepEqual(cross.snapshot, newOnOld.snapshot);
});
await check("the reader record holds no verdict, no score, no run ID of the other page, no half text, no time stamp from the file", () => {
  for (const page of [P48, P50]) {
    const text = cross.readerText[page];
    for (const word of ['"verdict"', '"to_verdict"', "page_score", '"score"', '"half_en"', '"written_utc"', '"to_run_id"', '"from_run_id"', '"full_en"', '"qa"']) assert.ok(!text.includes(word), `${page}: ${word}`);
    assert.ok(!text.includes(half), `${page}: the half text`);
  }
});
await check("the report: 2 cross_page lines, no warning, the same counts as before (translated pages, rows, agree)", () => {
  const lines = crossLines(cross);
  assert.equal(lines.length, 2);
  assert.equal(lines[0], `cross_page | ${P48} | first_half | L11-L12 | EN text replaced by the full sentence (${Array.from(FULL).length} characters), ${oldRow48.edMarks.length} EN mark(s) dropped | continues on page 54 (${P50})`);
  assert.equal(lines[1], `cross_page | ${P50} | second_half | L01-L05 | note only, the EN text stays | starts on page 52 (${P48})`);
  assert.equal(warnLines(cross).length, 0);
  const pick = (out, re) => out.stdout.split("\n").filter((l) => re.test(l));
  assert.deepEqual(pick(cross, /^Translated pages /), pick(newOnOld, /^Translated pages /));
  const cols = (out) => pick(out, /^reader_pages \| left_foot_full\//).map((l) => l.split(" | ").filter((_, i) => i !== 4).join(" | "));
  assert.deepEqual(cols(cross), cols(newOnOld));
  assert.equal(cols(cross).length, 2);
});
await check("--page p048 alone: the same change, from the file of the shown run only", async () => {
  const r = spawnSync(process.execPath, [path.join(app, "scripts/sync-runs.mjs"), "--offline", "--data", dataOf("cross"), "--page", P48], { cwd: app, env: process.env, encoding: "utf8", timeout: 120000 });
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.split("\n").filter((l) => l.startsWith("cross_page | "));
  assert.equal(lines.length, 1);
  assert.ok(lines[0].startsWith(`cross_page | ${P48} | first_half`));
});

const middle = await runS2(app, "middle");
await check("middle page (p050 holds cross_page_from.json and cross_page.json): both rows change, p048 as before, the old rows stay", () => {
  const body = middle.reader[P50];
  const head = rowOf(body, K50);
  const tailRow = rowOf(body, K50T);
  const oldHead = rowOf(newOnOld.reader[P50], K50);
  const oldTail = rowOf(newOnOld.reader[P50], K50T);
  assert.deepEqual(head.continues_from, { folio: "52", pageId: P48 });
  assert.ok(!("continues" in head));
  const { continues_from, ...headRest } = head;
  assert.deepEqual(headRest, oldHead, "the head row keeps its text and marks");
  assert.equal(tailRow.ed3, FULL50);
  assert.deepEqual(tailRow.edMarks, []);
  assert.ok(oldTail.edMarks.length > 0);
  assert.deepEqual(tailRow.jaMarks, oldTail.jaMarks);
  assert.equal(tailRow.ja, oldTail.ja);
  assert.deepEqual(tailRow.continues, { folio: "55", pageId: P51 });
  assert.ok(!("continues_from" in tailRow));
  assert.deepEqual(body.rows.filter((r) => r.key !== K50 && r.key !== K50T), newOnOld.reader[P50].rows.filter((r) => r.key !== K50 && r.key !== K50T));
  assert.deepEqual(middle.reader[P48], cross.reader[P48], "p048 is the same as with the plain pair");
  assert.ok(!newOnOld.reader[P50].search_en.includes("would come from page 55"));
  assert.ok(body.search_en.includes(S.foldText(FULL50)));
  assert.equal(body.search_ja, newOnOld.reader[P50].search_ja);
  console.log(`  p050 rows: ${head.shortKey} continues_from ${JSON.stringify(head.continues_from)}, ${tailRow.shortKey} ed3 = full_en (${Array.from(FULL50).length} characters), EN marks ${oldTail.edMarks.length} -> 0, continues ${JSON.stringify(tailRow.continues)}`);
});
await check("middle page: snapshots stay, the reader record holds no file keys, the report has 3 cross_page lines in page order and no warning", () => {
  assert.deepEqual(middle.snapshot, newOnOld.snapshot);
  for (const page of [P48, P50]) {
    const text = middle.readerText[page];
    for (const word of ['"verdict"', '"to_verdict"', "page_score", '"score"', '"half_en"', '"written_utc"', '"to_run_id"', '"from_run_id"', '"full_en"', '"qa"']) assert.ok(!text.includes(word), `${page}: ${word}`);
  }
  assert.ok(!middle.readerText[P48].includes(half), "p048: the half text of the tail row is gone");
  const lines = crossLines(middle);
  assert.equal(lines.length, 3);
  assert.ok(lines[0].startsWith(`cross_page | ${P48} | first_half | L11-L12 | `));
  assert.ok(lines[1].startsWith(`cross_page | ${P50} | first_half | L10-L13 | `) && lines[1].endsWith(`| continues on page 55 (${P51})`), lines[1]);
  assert.equal(lines[2], `cross_page | ${P50} | second_half | L01-L05 | note only, the EN text stays | starts on page 52 (${P48})`);
  assert.equal(warnLines(middle).length, 0);
  const pick = (out, re) => out.stdout.split("\n").filter((l) => re.test(l));
  assert.deepEqual(pick(middle, /^Translated pages /), pick(newOnOld, /^Translated pages /));
});
await check("--page p050 alone on the middle fixture: 2 cross_page lines from the two files of the shown run", async () => {
  const r = spawnSync(process.execPath, [path.join(app, "scripts/sync-runs.mjs"), "--offline", "--data", dataOf("middle"), "--page", P50], { cwd: app, env: process.env, encoding: "utf8", timeout: 120000 });
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.split("\n").filter((l) => l.startsWith("cross_page | "));
  assert.deepEqual(lines.map((l) => l.split(" | ")[2]), ["first_half", "second_half"]);
});
await check("older form (the p050 second_half inside cross_page.json): not read, one Warning, p048 still applies, p050 equals the old record", async () => {
  const out = await runS2(app, "oldform");
  const w = warnLines(out);
  assert.equal(w.length, 1, w.join("\n"));
  assert.equal(w[0], `Warning: ${P50} run ${RUN50}: results/cross_page.json skipped: the role is second_half, but this file name needs the role first_half.`);
  assert.equal(crossLines(out).length, 1);
  assert.equal(rowOf(out.reader[P48], K48).ed3, FULL);
  assert.equal(out.readerText[P50], newOnOld.readerText[P50]);
  console.log("  " + w[0]);
});

for (const [name, [folder, , rel, , reason]] of Object.entries(bad)) {
  await check(`bad file ${name}: S2 goes on, one Warning line, the reader records equal the old ones`, async () => {
    const out = await runS2(app, name);
    const w = warnLines(out);
    assert.equal(w.length, 1, w.join("\n"));
    const page = folder === "left_foot_full_p048" ? P48 : P50;
    const run = folder === "left_foot_full_p048" ? RUN48 : RUN50;
    assert.ok(w[0].startsWith(`Warning: ${page} run ${run}: results/${rel} skipped: `), w[0]);
    assert.ok(w[0].includes(reason), `${w[0]} (wanted: ${reason})`);
    assert.ok(w[0].endsWith("."), w[0]);
    assert.equal(crossLines(out).length, 0);
    assert.deepEqual(out.readerText, newOnOld.readerText);
    assert.deepEqual(out.snapshot, newOnOld.snapshot);
    console.log("  " + w[0]);
  });
}
await check("mixed: the good file of p048 applies, the damaged cross_page_from.json of p050 is skipped with one warning", async () => {
  const out = await runS2(app, "mixed");
  assert.equal(warnLines(out).length, 1);
  assert.ok(warnLines(out)[0].startsWith(`Warning: ${P50} run ${RUN50}: results/cross_page_from.json skipped: the file is not valid JSON.`));
  assert.equal(crossLines(out).length, 1);
  assert.equal(rowOf(out.reader[P48], K48).ed3, FULL);
  assert.equal(out.readerText[P50], newOnOld.readerText[P50]);
});
await check("mixed middle page: cross_page.json damaged, cross_page_from.json still applies (head row only)", async () => {
  const out = await runS2(app, "mixed-middle");
  assert.equal(warnLines(out).length, 1);
  assert.ok(warnLines(out)[0].startsWith(`Warning: ${P50} run ${RUN50}: results/cross_page.json skipped: the file is not valid JSON.`));
  assert.deepEqual(crossLines(out).map((l) => l.split(" | ")[2]), ["second_half"]);
  const body = out.reader[P50];
  assert.deepEqual(rowOf(body, K50).continues_from, { folio: "52", pageId: P48 });
  assert.deepEqual(rowOf(body, K50T), rowOf(newOnOld.reader[P50], K50T), "the tail row stays as before");
});

// ---------------------------------------------------------------- the data path of the Reader page: record -> pb.ts -> mergeRows -> pageRows
// fetch is replaced: only the list of reader_pages answers, from the records that S2 built above. No other call can leave the process.
let records = Object.values(cross.reader).map((b, i) => ({ id: `rec${i}`, ...b }));
let fetchCalls = [];
globalThis.fetch = async (url) => {
  const u = new URL(String(url));
  fetchCalls.push(u.pathname);
  if (u.pathname === "/api/collections/reader_pages/records") return new Response(JSON.stringify({ items: records, totalPages: 1 }), { status: 200, headers: { "content-type": "application/json" } });
  throw new Error("Network is disabled in VW90 tests: " + u.pathname);
};
const PB = await lib("pb.ts");
const RD = await lib("reader-data.ts");
const recs = await PB.readerPageRecords("token", [P48, P50]);
const rec48 = recs.find((r) => r.pageId === P48);
const rec50 = recs.find((r) => r.pageId === P50);
const dataOfRec = (rec, human) => ({
  pageId: rec.pageId, n: rec.n, name: `Page ${rec.n}`, hasText: true, rows: RD.mergeRows(rec, human), terms: rec.terms, extras: rec.extras,
  hasHuman: human !== null, hasAgent: true, humanBy: human ? "admin" : null, v1: [], label: { agent: "", human: "", v1: "" }, checked: false,
});
await check("pb.ts keeps the two keys of a stored row; a row without them stays as before", () => {
  assert.deepEqual(fetchCalls, ["/api/collections/reader_pages/records"]);
  assert.deepEqual(rec48.rows.find((r) => r.key === K48).continues, { folio: "54", pageId: P50 });
  assert.deepEqual(rec50.rows.find((r) => r.key === K50).continues_from, { folio: "52", pageId: P48 });
  assert.equal(rec48.rows.filter((r) => "continues" in r || "continues_from" in r).length, 1);
  assert.equal(rec48.rows.find((r) => r.key === K48).ed3, FULL);
});
await check("mergeRows and pageRows: the Agent text rows carry the note; other rows have no note key", () => {
  const a = L.pageRows(dataOfRec(rec48, null)).agent;
  assert.equal(a.find((r) => r.key === K48).note, "The sentence continues on page 54.");
  assert.equal(a.find((r) => r.key === K48).text, FULL);
  assert.equal(a.filter((r) => "note" in r).length, 1);
  const b = L.pageRows(dataOfRec(rec50, null)).agent;
  assert.equal(b.find((r) => r.key === K50).note, "The sentence starts on page 52.");
  assert.equal(b.filter((r) => "note" in r).length, 1);
  assert.ok(L.pageRows(dataOfRec(rec48, null)).ja.every((r) => !("note" in r)));
});
await check("Human version rows: the note shows for the agent text and the agreed full text, not for an own text or an agreed half text", () => {
  const rows = (h) => L.pageRows(dataOfRec(rec48, { pageId: P48, version: 1, runId: RUN48, rows: h })).human.find((r) => r.key === K48);
  const row = (o) => ({ key: K48, text: "", agree: false, ed3Text: "", jaText: "", ...o });
  assert.equal(rows([]).note, "The sentence continues on page 54.");
  assert.equal(rows([row({ agree: true, ed3Text: FULL })]).note, "The sentence continues on page 54.");
  assert.equal(rows([row({ agree: true, ed3Text: half })]).note, undefined);
  assert.equal(rows([row({ text: "My own text." })]).note, undefined);
});
await check("a page with no links gives a PageRow with no note key (same shape as before)", () => {
  const rec = { ...rec48, rows: rec48.rows.map(({ continues, continues_from, ...r }) => r) };
  const a = L.pageRows(dataOfRec(rec, null)).agent;
  assert.ok(a.every((r) => !("note" in r)));
});
await check("middle page on the Reader page data path: the head row has the start note, the tail row has the full sentence and the continue note, no other row has a note", async () => {
  records = Object.values(middle.reader).map((b, i) => ({ id: `mid${i}`, ...b }));
  const mid = await PB.readerPageRecords("token", [P48, P50]);
  const m50 = mid.find((r) => r.pageId === P50);
  assert.deepEqual(m50.rows.find((r) => r.key === K50).continues_from, { folio: "52", pageId: P48 });
  assert.deepEqual(m50.rows.find((r) => r.key === K50T).continues, { folio: "55", pageId: P51 });
  const agent = L.pageRows(dataOfRec(m50, null)).agent;
  assert.equal(agent.find((r) => r.key === K50).note, "The sentence starts on page 52.");
  assert.equal(agent.find((r) => r.key === K50T).note, "The sentence continues on page 55.");
  assert.equal(agent.find((r) => r.key === K50T).text, FULL50);
  assert.equal(agent.filter((r) => "note" in r).length, 2);
  assert.ok(L.pageRows(dataOfRec(m50, null)).ja.every((r) => !("note" in r)));
});

// ---------------------------------------------------------------- source facts
await check("READER_FORMAT stays 1 and the module cross-page-reader.ts has no fs, no server-only marker", async () => {
  assert.equal(B.READER_FORMAT, 1);
  const src = await fs.readFile(path.join(app, "lib/cross-page-reader.ts"), "utf8");
  assert.ok(!/^import [^\n]*from "(node:|server-only)/m.test(src) && !/^import "server-only"/m.test(src) && !/\brequire\(/.test(src));
});

console.log(`\nAll ${count} checks passed.`);
