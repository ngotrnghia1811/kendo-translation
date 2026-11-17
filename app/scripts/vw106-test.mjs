// Unit VW106 (Q-A 3:62.4, 3:63.2 "Read-only map first", 3:63.3, 3:64.4 "Both, side by side", 3:64.5 "Accept all rows"):
// server-free tests of the vector map of the prompt points (/monitor/vector-map).
// Part 1: the rules (lib/vector-map-rules.ts): point parse, the two program counts, similarity, identity by number and by text,
//         the hard-add ring flag, the move arrows, the removed list, the parent-chain order and its fall-back, the score file.
// Part 2: the loader (lib/vector-map-load.ts) on a made-up data folder: read only, cache by mtime, "Not measured", a made-up score file.
// Part 3: the markup: the chart, the slider, the click details, the page with the monitor on and off, the link in the phase 2 row.
// Made-up data only, below TMPDIR. The test writes no file outside its made-up folder and calls no server.
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw106-test.mjs. It prints "<n> passed, <m> failed" and "Total: ..." and exits 1 on a failure.
import assert from "node:assert/strict";
import { readFileSync, promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { checker, htmlText, installAppHooks, madeUpRoot, snapshot } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
installAppHooks(app);
const require = createRequire(path.join(app, "package.json"));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const h = (C, props) => renderToStaticMarkup(React.createElement(C, props));
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const kit = checker();
const done = kit.done;
let checks = 0;
const check = (name, fn) => {
  checks++;
  return kit.check(name, fn);
};

const R = await import("../lib/vector-map-rules.ts");
const L = await import("../lib/vector-map-load.ts");
const Chart = (await import("../components/VectorMapChart.tsx")).default;
const View = await import("../components/VectorMapView.tsx");

// ---------------------------------------------------------------- made-up prompt versions of one box (QA_1)

const V1 = ["You are a made-up box.", "1. Read the text.", "   1.1. Never skip a line.", "2. You must write the answer. See point 1.1.", ""].join("\n");
const V2 = [
  "You are a made-up box.",
  "1. Read the text.",
  "   1.1. Never skip a line. You must read it twice.",
  "   2.1. Do not guess a name. Check the dictionary entry first.",
  "3. You must write the answer. See point 1.1.",
  "",
].join("\n");
const V3 = ["You are a made-up box.", "1. Read the text.", "   2.1. Do not guess a name. Check the dictionary entry first.", "3. You must write the answer. See point 1.1.", ""].join("\n");
const file = (version, parent, text, extra = {}) => ({
  box: "QA_1",
  version,
  parent: parent ? { version: parent, path: `paired-dataset/prompts/QA_1/${parent}.json` } : null,
  sha1: `sha-${version}`,
  text,
  created_utc: "2026-11-16T06:42:44Z",
  phase: 2,
  update_point: parent ? "madeup01/p001" : null,
  group_ids: parent ? ["CG-1", "CG-2"] : [],
  critique_ids: parent ? ["QA_1:madeup01/p001:1", "QA_1:madeup01/p001:2", "QA_1:madeup01/p002:1"] : [],
  audit: parent
    ? { verdict: "ACCEPT", tries: [], grouping_notes: [], all_soft: false, marks: [
        { group_id: "CG-1", mark: "soft", covering_quote: "Never skip a line.", judge_reason: "made-up" },
        { group_id: "CG-2", mark: "hard", covering_quote: "", judge_reason: "made-up" },
      ] }
    : null,
  models: null,
  cost_usd: 0,
  ...extra,
});
const input = (f) => ({ version: f.version, parent: f.parent?.version ?? null, sha1: f.sha1, text: f.text, created_utc: f.created_utc, update_point: f.update_point, group_ids: f.group_ids, critique_ids: f.critique_ids, marks: f.audit?.marks ?? [] });
const FILES = [file("v2.1.0", null, V1), file("v2.1.1", "v2.1.0", V2), file("v2.1.2", "v2.1.1", V3)];
const near = (a, b) => Math.abs(a - b) < 1e-9;

// ---------------------------------------------------------------- part 1: the rules

await check("point parse: '1.', '1.1.', '2.' start points, the intro belongs to no point, lines join with single spaces", () => {
  const p = R.parsePoints(V1);
  assert.deepEqual(p.map((x) => x.num), ["1", "1.1", "2"]);
  assert.equal(p[1].text, "1.1. Never skip a line.");
  const q = R.parsePoints("Intro.\n4. First line\n   second line\n\n   third line\n4.2.x not a point\n5.not a point either");
  assert.deepEqual(q.map((x) => x.num), ["4"]);
  assert.equal(q[0].text, "4. First line second line third line 4.2.x not a point 5.not a point either");
});

await check("program counts: comprehensiveness = point characters / prompt characters, importance = marks / all marks (Q-A 3:64.4)", () => {
  const v = R.pointValues(V1);
  const len = V1.length;
  assert.ok(near(v[0].comp, ("1. Read the text.".length / len) * 100));
  assert.ok(near(v[1].comp, ("1.1. Never skip a line.".length / len) * 100));
  // marks: 1 = 0; 1.1 = "Never" + a citation by point 2 = 2; 2 = "must" = 1 (its own citation of 1.1 counts for 1.1)
  assert.deepEqual(v.map((x) => x.marks), [0, 2, 1]);
  assert.ok(near(v[1].imp, (2 / 3) * 100) && near(v[2].imp, (1 / 3) * 100) && v[0].imp === 0);
});

await check("program counts: strong words are case-insensitive whole words, 'points 1.1' cites, a point does not cite itself, a sum of 0 gives 0", () => {
  const v = R.pointValues("1. ONLY this. Every time. Do not stop. Mustard is no strong word.\n   1.1. See point 1.1 and points 1.2.\n   1.2. Plain.\n");
  assert.deepEqual(v.map((x) => x.marks), [3, 0, 1]);
  const z = R.pointValues("1. Plain.\n2. Also plain.\n");
  assert.deepEqual(z.map((x) => x.imp), [0, 0]);
  assert.equal(R.oneDecimal(6.45), "6.5");
  assert.equal(R.oneDecimal(9), "9.0");
});

await check("similarity: 1 for the same words, 0 for no common word, the point number does not count", () => {
  assert.equal(R.similarity("2. Write the answer.", "3. Write the answer."), 1);
  assert.equal(R.similarity("1. alpha beta", "1. gamma delta"), 0);
  assert.ok(R.similarity("1. a b c d", "1. a b x y") === 0.5);
});

await check("identity: same number first, then the most similar text; an inserted point is a hard add; a renumbered point keeps its identity", () => {
  const m = R.matchPoints(R.parsePoints(V1), R.parsePoints(V2));
  // V2 points: 1, 1.1, 2.1, 3. Parent points: 1, 1.1, 2.
  assert.deepEqual(m.parentOf, [0, 1, -1, 2]);
  assert.deepEqual(m.removed, []);
  // the same number with a text below 0.5 is a new point, and the old point is removed
  const n = R.matchPoints(R.parsePoints("1. alpha beta gamma\n"), R.parsePoints("1. other words here\n"));
  assert.deepEqual(n, { parentOf: [-1], removed: [0] });
  // each parent point is used once
  const o = R.matchPoints(R.parsePoints("1. same words here\n"), R.parsePoints("1. same words here\n2. same words here\n"));
  assert.deepEqual(o.parentOf, [0, -1]);
});

await check("map: ring flag for a hard add, arrows for a soft move, the removed list, ids across versions", () => {
  const map = R.buildBoxMap("QA_1", FILES.map(input));
  assert.deepEqual(map.versions.map((v) => v.version), ["v2.1.0", "v2.1.1", "v2.1.2"]);
  assert.equal(map.fallback, false);
  const [a, b, c] = map.versions;
  assert.ok(a.points.every((p) => !p.added && !p.prev), "the first version has no ring and no arrow");
  const p11 = b.points.find((p) => p.num === "1.1");
  assert.equal(p11.id, "v2.1.0#1.1");
  assert.equal(p11.changed, true);
  assert.ok(R.moved(p11, p11.prev), "soft change of 1.1 moves it");
  const p21 = b.points.find((p) => p.num === "2.1");
  assert.equal(p21.added, true);
  assert.equal(p21.id, "v2.1.1#2.1");
  const p3 = b.points.find((p) => p.num === "3");
  assert.equal(p3.id, "v2.1.0#2", "renumbered point 3 keeps the identity of point 2");
  assert.equal(p3.changed, false);
  assert.deepEqual(b.removed, []);
  assert.deepEqual(c.removed.map((r) => r.num), ["1.1"]);
  assert.equal(c.removed[0].id, "v2.1.0#1.1");
  assert.equal(b.groupCount, 2);
  assert.equal(b.critiqueCount, 3);
  // a move below 0.1 percentage points shows no arrow
  assert.equal(R.moved({ comp: 1.0, imp: 2.0 }, { comp: 1.05, imp: 2.09 }), false);
  assert.equal(R.moved({ comp: 1.0, imp: 2.0 }, { comp: 1.1, imp: 2.0 }), true);
});

await check("click details: the point text in each version, the kind, and the audit marks of the versions that added or changed it", () => {
  const map = R.buildBoxMap("QA_1", FILES.map(input));
  const h11 = R.pointHistory(map, "v2.1.0#1.1");
  assert.deepEqual(h11.steps.map((s) => `${s.version}:${s.kind}`), ["v2.1.0:first", "v2.1.1:changed"]);
  assert.equal(h11.removedIn, "v2.1.2");
  assert.deepEqual(h11.steps[1].marks.map((m) => `${m.group_id}:${m.mark}`), ["CG-1:soft", "CG-2:hard"]);
  assert.deepEqual(h11.steps[0].marks, []);
  const h21 = R.pointHistory(map, "v2.1.1#2.1");
  assert.deepEqual(h21.steps.map((s) => s.kind), ["added", "moved"]);
  assert.equal(h21.steps[1].marks.length, 0, "a move without a text change shows no critique group");
});

await check("order: the parent chain wins over the label sort; a broken chain falls back to the natural sort (v2.1.9 before v2.1.10)", () => {
  const chain = R.orderVersions([
    { version: "v2.1.10", parent: "v2.1.0" },
    { version: "v2.1.0", parent: null },
    { version: "v2.1.9", parent: "v2.1.10" },
  ]);
  assert.deepEqual(chain, { order: ["v2.1.0", "v2.1.10", "v2.1.9"], fallback: false });
  const broken = R.orderVersions([
    { version: "v2.1.10", parent: "v2.1.9" },
    { version: "v2.1.0", parent: null },
    { version: "v2.1.9", parent: "v2.1.7" },
  ]);
  assert.deepEqual(broken, { order: ["v2.1.0", "v2.1.9", "v2.1.10"], fallback: true });
  const fork = R.orderVersions([
    { version: "v2.1.0", parent: null },
    { version: "v2.1.1", parent: "v2.1.0" },
    { version: "v2.1.2", parent: "v2.1.0" },
  ]);
  assert.equal(fork.fallback, true);
  assert.deepEqual(R.orderVersions([]), { order: [], fallback: false });
});

await check("score file: values by point number; another sha1 or a bad shape gives null (Not measured)", () => {
  const good = { box: "QA_1", version: "v2.1.1", sha1: "sha-v2.1.1", points: [{ num: "1", importance_pct: 10, comprehensiveness_pct: 20 }] };
  assert.deepEqual([...R.parseScoreFile(good, "sha-v2.1.1")], [["1", { comp: 20, imp: 10 }]]);
  assert.equal(R.parseScoreFile(good, "sha-other"), null);
  assert.equal(R.parseScoreFile({ ...good, points: [{ num: 1 }] }, "sha-v2.1.1"), null);
  assert.equal(R.parseScoreFile(null, "x"), null);
});

// ---------------------------------------------------------------- part 2: the loader on a made-up data folder

const { root, w } = await madeUpRoot("vw106-");
for (const f of FILES) await w(`book-store/paired-dataset/prompts/QA_1/${f.version}.json`, f);
await w("book-store/paired-dataset/prompts/QA_1/current", "v2.1.2");
// a second box with a broken chain
await w("book-store/paired-dataset/prompts/TL_2/v2.1.0.json", { ...file("v2.1.0", null, V1), box: "TL_2" });
await w("book-store/paired-dataset/prompts/TL_2/v2.1.10.json", { ...file("v2.1.10", "v2.1.9", V2), box: "TL_2" });
await w("book-store/paired-dataset/prompts/TL_2/v2.1.2.json", { ...file("v2.1.2", "v2.1.1", V3), box: "TL_2" });

await check("loader: reads the made-up versions, writes nothing, keeps the map until a file changes", async () => {
  const before = await snapshot(root);
  const m1 = await L.loadBoxMap(root, "QA_1");
  assert.deepEqual(m1.versions.map((v) => v.version), ["v2.1.0", "v2.1.1", "v2.1.2"]);
  assert.ok(m1.versions.every((v) => !v.measured), "no score file: Not measured");
  const m2 = await L.loadBoxMap(root, "QA_1");
  assert.equal(m1, m2, "same files: the cached map");
  assert.deepEqual(await snapshot(root), before, "the loader wrote nothing");
  const broken = await L.loadBoxMap(root, "TL_2");
  assert.equal(broken.fallback, true);
  assert.deepEqual(broken.versions.map((v) => v.version), ["v2.1.0", "v2.1.2", "v2.1.10"]);
  const empty = await L.loadBoxMap(root, "ED_3");
  assert.deepEqual(empty.versions, []);
  const counts = await L.versionCounts(root, R.BOX_TYPES);
  assert.equal(counts.QA_1, 3);
  assert.equal(counts.TS_0, 0);
});

await check("loader: a made-up score file gives the model values of that version; a new file mtime rebuilds the map", async () => {
  await w("book-store/paired-dataset/point-scores/QA_1/v2.1.1.json", {
    box: "QA_1",
    version: "v2.1.1",
    sha1: "sha-v2.1.1",
    model: "made-up",
    points: ["1", "1.1", "2.1", "3"].map((num, i) => ({ num, importance_score: i + 1, comprehensiveness_score: 2, importance_pct: ((i + 1) / 10) * 100, comprehensiveness_pct: 25 })),
  });
  const m = await L.loadBoxMap(root, "QA_1");
  const v = m.versions[1];
  assert.equal(v.measured, true);
  assert.deepEqual(v.points.find((p) => p.num === "2.1").model, { comp: 25, imp: 30 });
  assert.equal(m.versions[2].measured, false);
  assert.equal(m.max.modelImp, 40);
});

// ---------------------------------------------------------------- part 3: the markup

await check("chart: one dot for each point, a ring for the hard add, an arrow for the soft move, links to the click details", async () => {
  const m = await L.loadBoxMap(root, "QA_1");
  const v = m.versions[1];
  const html = h(Chart, { points: v.points, axes: "program", top: { comp: m.max.comp, imp: m.max.imp }, selected: null, hrefOf: (id) => `/x?p=${encodeURIComponent(id)}`, prevVersion: "v2.1.0" });
  assert.equal([...html.matchAll(/data-vm-dot="/g)].length, 4);
  assert.deepEqual([...html.matchAll(/data-vm-ring="([^"]+)"/g)].map((x) => x[1]), ["2.1"]);
  const arrows = [...html.matchAll(/data-vm-arrow="([^"]+)"/g)].map((x) => x[1]);
  assert.ok(arrows.includes("1.1"), arrows.join(","));
  assert.ok(!arrows.includes("2.1"), "a new point has no arrow");
  assert.ok(html.includes('href="/x?p=v2.1.1%232.1"'));
  assert.ok(htmlText(html).includes("Comprehensiveness (% of the prompt)"));
  assert.ok(htmlText(html).includes("Importance (% of the prompt)"));
  assert.ok(!/gloss|rendering/i.test(html));
});

await check("view: Not measured without a score file, the toggle with a score file, the removed list, the click details", async () => {
  const m = await L.loadBoxMap(root, "QA_1");
  const counts = await L.versionCounts(root, R.BOX_TYPES);
  const v2 = h(View.default, { map: m, counts, state: { box: "QA_1", version: "v2.1.2", axes: "model", point: null } });
  assert.ok(v2.includes("data-vm-not-measured"));
  assert.ok(htmlText(v2).includes("Model score: Not measured"));
  assert.ok(!/data-vm-chart[^>]*aria-label="[^"]*model score/.test(v2), "a version without scores keeps the program counts");
  assert.ok(htmlText(v2).includes("Points removed since v2.1.1"));
  assert.ok(v2.includes('data-vm-removed-point="1.1"'));
  assert.ok(!v2.includes('data-vm-dot="1.1"'), "a removed point is no dot");
  const v1 = h(View.default, { map: m, counts, state: { box: "QA_1", version: "v2.1.1", axes: "model", point: "v2.1.0#1.1" } });
  assert.ok(!v1.includes("data-vm-not-measured"));
  assert.ok(htmlText(v1).includes("Model score"));
  assert.match(v1, /data-vm-chart[^>]*aria-label="[^"]*model score/);
  const t = htmlText(v1);
  assert.ok(t.includes("Point 1.1 of QA_1 (QA_1: quality check stage") && t.includes("in each prompt version"));
  assert.ok(t.includes("v2.1.1 · point 1.1 · text changed"));
  assert.ok(t.includes("covering quote: “Never skip a line.”"));
  assert.ok(v1.includes('data-vm-mark="hard"') && v1.includes('data-vm-mark="soft"'));
  assert.ok(t.includes("This point is not in v2.1.2 and later versions (removed)."));
  assert.ok(t.includes("Model score: comprehensiveness 25.0 %"));
  assert.ok(t.includes("Model score: Not measured."), "v2.1.0 has no score file");
  assert.ok(v1.includes('data-vm-slider'));
  assert.ok(v1.includes('href="/monitor/vector-map?box=QA_1&amp;v=v2.1.0&amp;axes=model&amp;p=v2.1.0%231.1"'), "Earlier keeps the box, the axes and the point");
  // 16 box links, each box code with its hover (Q-A 3:18.5)
  assert.equal([...v1.matchAll(/data-vm-box-link="/g)].length, 16);
  assert.match(v1, /data-box-code="QA_1" title="QA_1: /);
  // a box without versions
  const e = h(View.default, { map: await L.loadBoxMap(root, "ED_3"), counts, state: { box: "ED_3", version: null, axes: "program", point: null } });
  assert.ok(htmlText(e).includes("No stored prompt version of box type ED_3 yet."));
  // the broken chain shows its note
  const b = h(View.default, { map: await L.loadBoxMap(root, "TL_2"), counts, state: { box: "TL_2", version: null, axes: "program", point: null } });
  assert.ok(b.includes("data-vm-fallback"));
});

await check("page: monitor on renders the map of the made-up data; monitor off gives the 404 (notFound) before any read", async () => {
  const Page = (await import("../app/monitor/vector-map/page.tsx")).default;
  const cfg = path.join(root, "..", "vw106-viewer.config.json");
  await fs.writeFile(cfg, JSON.stringify({ translatorDataDir: root, monitor: true }));
  const old = process.env.VIEWER_CONFIG;
  process.env.VIEWER_CONFIG = cfg;
  try {
    const el = await Page({ searchParams: Promise.resolve({ box: "QA_1", v: "v2.1.1" }) });
    const html = renderToStaticMarkup(el);
    assert.ok(htmlText(html).includes("Vector map of the prompt points"));
    assert.ok(html.includes('data-vm-ring="2.1"'));
    // an unknown box falls back to QA_3 (no versions in the made-up folder)
    const el2 = await Page({ searchParams: Promise.resolve({ box: "../../etc" }) });
    assert.ok(htmlText(renderToStaticMarkup(el2)).includes("No stored prompt version of box type QA_3 yet."));
    await fs.writeFile(cfg, JSON.stringify({ translatorDataDir: path.join(root, "missing"), monitor: false }));
    await assert.rejects(Page({ searchParams: Promise.resolve({}) }), /notFound/);
  } finally {
    if (old === undefined) delete process.env.VIEWER_CONFIG;
    else process.env.VIEWER_CONFIG = old;
  }
});

await check("source: the phase 2 row links the vector map, the page calls requireMonitor first, no model call, no write", () => {
  const row = read("components/Phase2Row.tsx");
  assert.match(row, /key: "vector-map"[^\n]*href: "\/monitor\/vector-map"/);
  assert.ok(row.includes("lines.push(STEPS_LINE, VECTOR_MAP_LINE)"));
  const page = read("app/monitor/vector-map/page.tsx");
  assert.ok(page.indexOf("await requireMonitor()") < page.indexOf("await dataRoot()"));
  for (const f of ["lib/vector-map-load.ts", "lib/vector-map-rules.ts", "components/VectorMapView.tsx", "components/VectorMapChart.tsx", "app/monitor/vector-map/page.tsx"]) {
    const s = read(f);
    assert.ok(!/writeFile|mkdir|unlink|rename\(|fetch\(/.test(s), `${f} writes or calls out`);
  }
});

const failed = done();
console.log(`Total: ${checks - failed} passed, ${failed} failed`);
