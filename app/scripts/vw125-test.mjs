// VW125 (round 118, card P66.1): server-free tests of the model picker and the Thinking menu with the list of ALL oc2 models
// (Q-A 3:118.2 rows 1 to 5, owner words 2026-11-22 14:00 PST: "The model picker should have show ALL models in oc2, not just some specific models").
//   part 1  lib/oc2-models-rules.ts: the check of the list file, the catalog, the read time in PST, the one line of the page
//   part 2  lib/oc2-models.ts: the server reader (the path, the missing file, a broken file, a new read at each call)
//   part 3  lib/model-picker-rules.ts with a catalog: all providers and models, the search, Favorites and Recent on top, "(current)", the readable names
//   part 4  lib/oc2-efforts.ts: the own efforts of a model, the empty set, the run-side rule, the fallback table, the names that the settings file refuses
//   part 5  both pages as HTML with the list, with no list file and with a broken file
//   part 6  the file that the form saves (the full ID and the effort), and the files of the unit
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw125-test.mjs. The last line is "<n> passed, <m> failed". Made-up data, plus the real list file when it exists. No network.
// The real list <V2>/data/oc2-models.json is git-ignored. When the file is missing, the checks of the real list print "skipped" and count as passed.
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, realpathSync, renameSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/monitor/ki_breath_full_clean");
globalThis.fetch = async () => { throw new Error("Network is disabled in VW125 tests."); };
const { check, done } = checker();
const req = createRequire(path.join(app, "package.json"));
const { createElement: h } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\/.*$/gm, "");
const strip = (html) => html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const count = (html, re) => (html.match(re) ?? []).length;

const R = await import("../lib/oc2-models-rules.ts");
const SRV = await import("../lib/oc2-models.ts");
const P = await import("../lib/model-picker-rules.ts");
const EF = await import("../lib/oc2-efforts.ts");
const E = await import("../lib/model-efforts.ts");
const L = await import("../lib/settings-layout.ts");
const S = await import("../lib/settings-schema.ts");
const J = await import("../lib/settings-json.ts");

const root = realpathSync(mkdtempSync(path.join(process.env.TMPDIR, "vw125-")));
const REAL = path.resolve(app, "..", "data", "oc2-models.json");
const haveReal = existsSync(REAL);
const realText = haveReal ? readFileSync(REAL, "utf8") : "";
const CARD = "claude-7f6d8610"; // a Claude card of this Mac (lib/phase2-wait.ts CARD_NAMES)

// A made-up list in the shape of the real file (schema oc2-models-v1). Set 1 has names with a space, set 5 is empty.
const FIX = {
  schema: "oc2-models-v1", source: "made-up for the VW125 test", read_utc: "2026-11-22T22:10:35.856Z", note: "made-up",
  variant_sets: [
    ["low", "medium", "high", "xhigh", "max"], ["Low", "Low Fast", "Medium", "High", "XHigh"], ["none", "low", "medium", "high", "xhigh", "max"],
    ["low", "medium", "high", "xhigh"], ["low", "medium", "high"], [], ["Low", "Medium", "High", "XHigh"],
  ],
  providers: {
    "claude-7f6d8610": { label: "Claude card ngotr", models: [["claude-sonnet-5-5", "Claude Sonnet 5.5 (ngotr)", 0], ["claude-opus-5-5", "Claude Opus 5.5 (ngotr)", 0]] },
    "claude-028c2ffe": { label: "Claude card ntngh", models: [["claude-haiku-5-5", "Claude Haiku 5.5 (ntngh)", 2]] },
    devin: { label: "Devin", models: [["claude-opus-5-5", "Claude Opus 5.5 (devin)", 1], ["grok-4-7", "Grok 4.7 (devin)", 6], ["kimi-k2-6", "Kimi K2.6 (devin)", 5]] },
    openai: { label: "OpenAI", models: [["gpt-6.1-terra", "GPT-6.1 Terra", 2]] },
    xai: { label: "xAI", models: [["grok-4.7", "Grok 4.7", 3], ["grok-4.20-0309-reasoning", "Grok 4.20 Reasoning", 5]] },
    "gemini-web": { label: "Gemini web", models: [["4-hydrogen", "4 Hydrogen", 4]] },
    google: { label: "Google", models: [["antigravity-gemini-3.8-flash-high", "Gemini 3.8 Flash (High) (Antigravity)", 5], ["gemini-4-neon", "Gemini 4 Neon", 4]] },
    "openrouter-ngotr": { label: "OpenRouter ngotr", models: [["inclusionai/ling-3.2-flash:free", "inclusionAI: Ling 3.2 Flash (free) (ngotr)", 4]] },
  },
};
const fixFile = path.join(root, "fixture-oc2-models.json");
writeFileSync(fixFile, JSON.stringify(FIX));
const FIXBLOCK = R.parseOc2List(JSON.stringify(FIX));
const FIXCAT = R.catalogOf(FIXBLOCK);
const REALBLOCK = haveReal ? R.parseOc2List(realText) : null;
const REALCAT = R.catalogOf(REALBLOCK);
const onReal = async (name, fn) => check(haveReal ? name : `${name} (skipped: no data/oc2-models.json)`, haveReal ? fn : () => {});

// ---------------------------------------------------------------- part 1: the rules of the list file
await check("list file: the made-up list passes the check; the block keeps the read time, the effort lists and the providers in the order of the file", () => {
  assert.equal(FIXBLOCK.status, "ok");
  assert.equal(FIXBLOCK.read_utc, "2026-11-22T22:10:35.856Z");
  assert.deepEqual(FIXBLOCK.providers.map((p) => p.id), Object.keys(FIX.providers));
  assert.deepEqual(FIXBLOCK.providers.map((p) => p.label), ["Claude card ngotr", "Claude card ntngh", "Devin", "OpenAI", "xAI", "Gemini web", "Google", "OpenRouter ngotr"]);
  assert.equal(FIXBLOCK.variant_sets.length, 7);
});
await check("list file: the reader names the keys only: the order of the top-level keys does not change the result (the order of the providers is the order of the file)", () => {
  const shuffled = { providers: FIX.providers, variant_sets: FIX.variant_sets, note: FIX.note, read_utc: FIX.read_utc, source: FIX.source, schema: FIX.schema };
  assert.deepEqual(R.parseOc2List(JSON.stringify(shuffled)), FIXBLOCK);
  const reversed = Object.fromEntries(Object.entries(FIX.providers).reverse());
  const r = R.parseOc2List(JSON.stringify({ ...FIX, providers: reversed }));
  assert.deepEqual(r.providers.map((p) => p.id), Object.keys(reversed), "the providers follow the order of the file");
  assert.deepEqual(R.parseOc2List(JSON.stringify({ ...FIX, source: undefined, note: undefined })), FIXBLOCK, "source and note are not needed");
});
await check("list file: a text that fails a check gives status broken, the reason, and the fallback line; it never throws (14 cases)", () => {
  const bad = {
    "not JSON": "{",
    "empty text": "",
    "an array": "[]",
    "wrong schema": JSON.stringify({ ...FIX, schema: "oc2-models-v2" }),
    "no read_utc": JSON.stringify({ ...FIX, read_utc: undefined }),
    "read_utc is not a time": JSON.stringify({ ...FIX, read_utc: "yesterday" }),
    "variant_sets is not a list": JSON.stringify({ ...FIX, variant_sets: {} }),
    "an effort that is not a text": JSON.stringify({ ...FIX, variant_sets: [["low", 3]] }),
    "providers is an array": JSON.stringify({ ...FIX, providers: [] }),
    "a provider with no label": JSON.stringify({ ...FIX, providers: { x: { models: [] } } }),
    "a provider ID with a slash": JSON.stringify({ ...FIX, providers: { "a/b": { label: "A", models: [["m", "M", 0]] } } }),
    "a model that is not a triple": JSON.stringify({ ...FIX, providers: { x: { label: "X", models: [["m", "M"]] } } }),
    "an index outside variant_sets": JSON.stringify({ ...FIX, providers: { x: { label: "X", models: [["m", "M", 7]] } } }),
    "no model at all": JSON.stringify({ ...FIX, providers: { x: { label: "X", models: [] } } }),
  };
  assert.equal(Object.keys(bad).length, 14);
  for (const [name, text] of Object.entries(bad)) {
    const b = R.parseOc2List(text);
    assert.equal(b.status, "broken", name);
    assert.match(b.note, /^Model list from oc2 cannot be read \(.+\)\. The picker shows the models of translator-models\.yaml\.$/, name);
    assert.ok(!b.note.includes("/Users/") && !b.note.includes(root), name);
  }
});
await check("list file: a negative index, a fraction as index and a model with an empty ID are refused; a model that appears twice shows once; an empty name takes the ID", () => {
  const one = (m) => R.parseOc2List(JSON.stringify({ ...FIX, providers: { x: { label: "X", models: [m] } } })).status;
  assert.equal(one(["m", "M", -1]), "broken"); assert.equal(one(["m", "M", 1.5]), "broken"); assert.equal(one(["", "M", 0]), "broken"); assert.equal(one(["m", 5, 0]), "broken");
  const dup = R.parseOc2List(JSON.stringify({ ...FIX, providers: { x: { label: "X", models: [["m", "First", 0], ["m", "Second", 1], ["n", "  ", 0]] } } }));
  assert.equal(dup.status, "ok");
  assert.deepEqual(dup.providers[0].models, [["m", "First", 0], ["n", "n", 0]]);
});
await check("read time: the line shows the UTC time in PST (UTC-8 all year) to the minute; a time before 08:00 UTC goes to the day before; a bad time says so", () => {
  assert.equal(R.pstMinute("2026-11-22T22:10:35.856Z"), "2026-11-22 14:10");
  assert.equal(R.pstMinute("2026-11-22T03:05:00Z"), "2026-11-21 19:05");
  assert.equal(R.pstMinute("2026-07-01T07:59:59Z"), "2026-06-30 23:59", "no summer time");
  assert.equal(R.pstMinute("nope"), "time unreadable");
  assert.equal(R.listLine(FIXBLOCK), "Model list from oc2, read 2026-11-22 14:10 PST");
  assert.equal(R.listLine(R.missingBlock()), "Model list from oc2 not found. The picker shows the models of translator-models.yaml.");
});
await check("catalog: each model has the full ID (provider ID + model ID), the readable name, the provider label and its own efforts; an empty set stays empty", () => {
  assert.equal(FIXCAT.size, 13); assert.equal(FIXCAT.providers.length, 8);
  const m = FIXCAT.byId.get("xai/grok-4.7");
  assert.deepEqual({ ...m }, { id: "xai/grok-4.7", provider: "xai", providerLabel: "xAI", name: "Grok 4.7", efforts: ["low", "medium", "high", "xhigh"] });
  assert.equal(FIXCAT.byId.get(`${CARD}/claude-sonnet-5-5`).name, "Claude Sonnet 5.5 (ngotr)");
  assert.equal(FIXCAT.byId.get(`${CARD}/claude-sonnet-5-5`).providerLabel, "Claude card ngotr");
  assert.deepEqual(FIXCAT.byId.get("xai/grok-4.20-0309-reasoning").efforts, []);
  assert.ok(FIXCAT.byId.has("openrouter-ngotr/inclusionai/ling-3.2-flash:free"), "a model ID with a slash and a colon keeps its full value");
  assert.equal(R.catalogOf(null), null); assert.equal(R.catalogOf(undefined), null);
  assert.equal(R.catalogOf(R.missingBlock()), null); assert.equal(R.catalogOf(R.parseOc2List("{")), null);
});
await onReal("the real list: 244 models and 14 providers (the brief said 13), no model twice, all full IDs pass the file check of the settings, all 7 models of the runs are in it", () => {
  assert.equal(REALBLOCK.status, "ok");
  assert.equal(REALCAT.size, 244); assert.equal(REALCAT.providers.length, 14);
  const raw = JSON.parse(realText);
  assert.deepEqual(REALCAT.providers.map((p) => p.id), Object.keys(raw.providers), "the order of the file");
  assert.equal(REALCAT.providers.reduce((n, p) => n + p.models.length, 0), 244);
  for (const id of REALCAT.byId.keys()) assert.equal(S.valueError("levels.0.model", id), null, id);
  for (const id of ["gemini-web/4-hydrogen", "xai/grok-4.7", "openai/gpt-6.1-terra", `${CARD}/claude-sonnet-5-5`, "google/antigravity-gemini-3.8-flash-high", "devin/grok-4-7"]) assert.ok(REALCAT.byId.has(id), id);
});
await onReal("the real list: the 3 Claude cards show as ngotr, ntngh and uonlp, and the file holds no e-mail address", () => {
  const labels = REALCAT.providers.filter((p) => p.id.startsWith("claude-")).map((p) => p.label).sort();
  assert.deepEqual(labels, ["Claude card ngotr", "Claude card ntngh", "Claude card uonlp"]);
  assert.doesNotMatch(realText, /[A-Za-z0-9._+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/);
});

// ---------------------------------------------------------------- part 2: the server reader
await check("server reader: the path is ../data/oc2-models.json from the app folder, and VIEWER_OC2_MODELS names another file; an empty variable counts as not set", () => {
  const saved = process.env.VIEWER_OC2_MODELS;
  try {
    delete process.env.VIEWER_OC2_MODELS;
    assert.equal(SRV.oc2ModelsPath(), path.resolve(process.cwd(), "..", "data", "oc2-models.json"));
    process.env.VIEWER_OC2_MODELS = "   ";
    assert.equal(SRV.oc2ModelsPath(), path.resolve(process.cwd(), "..", "data", "oc2-models.json"));
    process.env.VIEWER_OC2_MODELS = fixFile;
    assert.equal(SRV.oc2ModelsPath(), fixFile);
    assert.equal(SRV.DEFAULT_OC2_MODELS, "../data/oc2-models.json");
  } finally { if (saved === undefined) delete process.env.VIEWER_OC2_MODELS; else process.env.VIEWER_OC2_MODELS = saved; }
});
await check("server reader: a good file gives status ok; a missing file gives status missing with the one-line note; a broken file and a folder give broken, with no path in the note", async () => {
  const ok = await SRV.readOc2Block(fixFile);
  assert.equal(ok.status, "ok"); assert.equal(ok.providers.length, 8);
  const missing = await SRV.readOc2Block(path.join(root, "no-such-file.json"));
  assert.deepEqual(missing, { status: "missing", note: "Model list from oc2 not found. The picker shows the models of translator-models.yaml." });
  const brokenFile = path.join(root, "broken.json"); writeFileSync(brokenFile, "{ not json");
  const broken = await SRV.readOc2Block(brokenFile);
  assert.equal(broken.status, "broken"); assert.match(broken.note, /not valid JSON/);
  const folder = await SRV.readOc2Block(root);
  assert.equal(folder.status, "broken"); assert.ok(!folder.note.includes(root));
});
await check("server reader: the file is read at each call, so a refresh by aki-main shows at the next load with no restart; a renamed file gives missing, a restored file gives ok", async () => {
  const f = path.join(root, "refresh.json");
  writeFileSync(f, JSON.stringify(FIX));
  assert.equal(R.listLine(await SRV.readOc2Block(f)), "Model list from oc2, read 2026-11-22 14:10 PST");
  writeFileSync(f, JSON.stringify({ ...FIX, read_utc: "2026-11-23T01:30:00.000Z" }));
  assert.equal(R.listLine(await SRV.readOc2Block(f)), "Model list from oc2, read 2026-11-22 17:30 PST");
  renameSync(f, f + ".off");
  assert.equal((await SRV.readOc2Block(f)).status, "missing");
  renameSync(f + ".off", f);
  assert.equal((await SRV.readOc2Block(f)).status, "ok");
});
await onReal("server reader: the real list file gives status ok with all 244 models through the reader", async () => {
  const b = await SRV.readOc2Block(REAL);
  assert.equal(b.status, "ok"); assert.equal(R.catalogOf(b).size, 244);
});

// ---------------------------------------------------------------- part 3: the picker rules with a catalog
const titles = (sections) => sections.map((s) => s.title);
await check("picker (row 2): with no favorite and no recent the list shows one section for each provider of the file, in the order of the file, titled with the provider label; all models of the list show", () => {
  const s = P.buildSections([], [], [], "", FIXCAT);
  assert.deepEqual(titles(s), ["Claude card ngotr", "Claude card ntngh", "Devin", "OpenAI", "xAI", "Gemini web", "Google", "OpenRouter ngotr"]);
  assert.deepEqual(s.map((x) => x.key), FIXBLOCK.providers.map((p) => `provider:${p.id}`));
  assert.equal(s.reduce((n, x) => n + x.rows.length, 0), 13);
  assert.deepEqual(s[2].rows.map((r) => r.id), ["devin/claude-opus-5-5", "devin/grok-4-7", "devin/kimi-k2-6"], "the models keep the order of the file");
  assert.deepEqual(s[4].rows.map((r) => [r.name, r.id]), [["Grok 4.7", "xai/grok-4.7"], ["Grok 4.20 Reasoning", "xai/grok-4.20-0309-reasoning"]]);
});
await onReal("picker (row 2): the real list gives 14 sections and 244 rows; the search box finds any model of the list", () => {
  const s = P.buildSections([], [], [], "", REALCAT);
  assert.equal(s.length, 14); assert.equal(s.reduce((n, x) => n + x.rows.length, 0), 244);
  assert.deepEqual(titles(s).slice(0, 4), ["Claude card ntngh", "Claude card ngotr", "Claude card uonlp", "Devin"]);
  for (const id of REALCAT.byId.keys()) {
    const hit = P.buildSections([], [], [], REALCAT.byId.get(id).name, REALCAT).flatMap((x) => x.rows).some((r) => r.id === id);
    assert.ok(hit, `the search by name does not find ${id}`);
    const byId = P.buildSections([], [], [], id, REALCAT).flatMap((x) => x.rows).some((r) => r.id === id);
    assert.ok(byId, `the search by ID does not find ${id}`);
  }
});
await check("search (row 2): the text matches the readable name, the full ID, the provider label and the provider ID; every word must match", () => {
  const find = (q) => P.buildSections([], [], [], q, FIXCAT).flatMap((x) => x.rows).map((r) => r.id);
  assert.deepEqual(find("devin"), ["devin/claude-opus-5-5", "devin/grok-4-7", "devin/kimi-k2-6"], "provider label and provider ID, models outside the yaml list");
  assert.deepEqual(find("Sonnet 5.5"), [`${CARD}/claude-sonnet-5-5`], "the readable name");
  assert.deepEqual(find("claude-opus-5-5").sort(), [`${CARD}/claude-opus-5-5`, "devin/claude-opus-5-5"].sort(), "the model ID");
  assert.deepEqual(find("xai/grok-4.7"), ["xai/grok-4.7"], "the full ID");
  assert.deepEqual(find("Claude card ngotr"), [`${CARD}/claude-sonnet-5-5`, `${CARD}/claude-opus-5-5`], "the provider label");
  assert.deepEqual(find("openrouter-ngotr"), ["openrouter-ngotr/inclusionai/ling-3.2-flash:free"], "the provider ID");
  assert.deepEqual(find("ling free"), ["openrouter-ngotr/inclusionai/ling-3.2-flash:free"], "two words, each in the name");
  assert.deepEqual(find("GROK 4.7").sort(), ["devin/grok-4-7", "xai/grok-4.7"].sort(), "case does not matter, the mark-free form 4 7 also matches");
  assert.deepEqual(find("zzz"), []);
  assert.deepEqual(P.buildSections([], [], [], "zzz", FIXCAT), []);
});
await check("sections (row 2): Favorites and Recent stay on top; a favorite shows also in its provider section; Recent leaves out the favorites; a search keeps them on top", () => {
  const s = P.buildSections([], ["xai/grok-4.7"], ["devin/grok-4-7", "xai/grok-4.7", "openai/gpt-6.1-terra"], "", FIXCAT);
  assert.deepEqual(titles(s).slice(0, 2), ["Favorites", "Recent"]);
  assert.deepEqual(s[0].rows.map((r) => r.id), ["xai/grok-4.7"]);
  assert.deepEqual(s[1].rows.map((r) => r.id), ["devin/grok-4-7", "openai/gpt-6.1-terra"]);
  assert.equal(s.length, 2 + 8);
  assert.ok(s.find((x) => x.title === "xAI").rows.some((r) => r.id === "xai/grok-4.7"));
  assert.equal(s[0].rows[0].name, "Grok 4.7", "the favorite shows the readable name of the list");
  const q = P.buildSections([], ["xai/grok-4.7"], ["devin/grok-4-7"], "grok", FIXCAT);
  assert.deepEqual(titles(q), ["Favorites", "Recent", "Devin", "xAI"]);
});
await check("(current) (row 5): a saved value that is not in the list goes to the section 'Saved value, not in the oc2 list' after Recent and before the providers, flagged outside; a value in the list adds no such section", () => {
  const s = P.buildSections(["acme/model-9", "xai/grok-4.7", "xai/new-model"], [], ["openai/gpt-6.1-terra"], "", FIXCAT);
  assert.deepEqual(titles(s).slice(0, 3), ["Recent", "Saved value, not in the oc2 list", "Claude card ngotr"]);
  const out = s[1];
  assert.equal(out.key, "outside");
  assert.deepEqual(out.rows.map((r) => [r.id, r.outside === true]), [["acme/model-9", true], ["xai/new-model", true]]);
  assert.equal(out.rows[1].providerLabel, "xAI", "a provider that the list knows gives its label");
  assert.equal(out.rows[1].name, "new-model");
  assert.equal(out.rows[0].providerLabel, "acme");
  assert.ok(s.flatMap((x) => x.rows).filter((r) => r.id === "xai/grok-4.7").every((r) => !r.outside), "a model of the list is never flagged");
  assert.ok(!titles(P.buildSections(["xai/grok-4.7", ""], [], [], "", FIXCAT)).includes("Saved value, not in the oc2 list"));
  assert.deepEqual(titles(P.buildSections(["acme/model-9"], [], [], "acme", FIXCAT)), ["Saved value, not in the oc2 list"], "the search finds it too");
  assert.equal(P.OUTSIDE_TITLE, "Saved value, not in the oc2 list");
});
await check("readable names (row 9): the button shows '<provider label> · <readable name>'; a model outside the list shows the label of a known provider; the stored value stays the full ID", () => {
  assert.equal(P.buttonText("xai/grok-4.7", FIXCAT), "xAI · Grok 4.7");
  assert.equal(P.buttonText("openai/gpt-6.1-terra", FIXCAT), "OpenAI · GPT-6.1 Terra");
  assert.equal(P.buttonText(`${CARD}/claude-sonnet-5-5`, FIXCAT), "Claude card ngotr · Claude Sonnet 5.5 (ngotr)");
  assert.equal(P.buttonText("xai/new-model", FIXCAT), "xAI · new-model");
  assert.equal(P.buttonText("acme/m", FIXCAT), "acme · m");
  assert.equal(P.buttonText("", FIXCAT), "Choose a model"); assert.equal(P.buttonText(undefined, FIXCAT), "Choose a model");
  assert.equal(P.rowOf("xai/grok-4.7", FIXCAT).id, "xai/grok-4.7");
});
await check("fallback (list missing or broken): with no catalog the picker works as in unit VW123: the yaml models, providers sorted by name, and the same button text", () => {
  const models = ["xai/grok-4.7", "openai/gpt-6.1-terra", `${CARD}/claude-opus-5-5`, "devin/grok-4-7"];
  assert.deepEqual(P.buildSections(models, [], [], "", null), P.buildSections(models, [], [], ""));
  assert.deepEqual(titles(P.buildSections(models, [], [], "", null)).slice(1), ["devin", "openai", "xai"]);
  assert.equal(P.buttonText("xai/grok-4.7", null), "xai · grok-4.7"); assert.equal(P.buttonText("xai/grok-4.7"), "xai · grok-4.7");
  assert.ok(P.buildSections(models, [], [], "", null).flatMap((x) => x.rows).every((r) => r.outside === undefined));
});
await check("speed (row 2): the sections of 244 models and a search keystroke take milliseconds (200 rounds)", () => {
  const cat = REALCAT ?? R.catalogOf({ status: "ok", read_utc: FIX.read_utc, variant_sets: FIX.variant_sets, providers: Array.from({ length: 13 }, (_, p) => ({ id: `p${p}`, label: `Provider ${p}`, models: Array.from({ length: 19 }, (_, m) => [`model-${m}`, `Model ${m} of ${p}`, 0]) })) });
  assert.ok(cat.size >= 244);
  const t0 = performance.now();
  for (let n = 0; n < 200; n++) { P.buildSections([], ["xai/grok-4.7"], ["devin/grok-4-7"], n % 2 ? "gro" : "", cat); }
  const ms = performance.now() - t0;
  console.log(`      (200 rounds of 244 models: ${ms.toFixed(1)} ms, ${(ms / 200).toFixed(3)} ms for one round)`);
  assert.ok(ms < 2000, `${ms} ms`);
});

// ---------------------------------------------------------------- part 4: the efforts
await check("efforts (row 3): a model of the list gets its own efforts, not the static table (xai/grok-4.7 has xhigh in the list; the table has not)", () => {
  assert.deepEqual(EF.effortsFor("xai/grok-4.7", FIXCAT), ["low", "medium", "high", "xhigh"]);
  assert.deepEqual(E.effortsOf("xai/grok-4.7"), ["low", "medium", "high"], "the VW123 table is unchanged");
  assert.deepEqual(EF.effortsFor("openai/gpt-6.1-terra", FIXCAT), ["none", "low", "medium", "high", "xhigh", "max"]);
  assert.deepEqual(EF.effortsFor(`${CARD}/claude-sonnet-5-5`, FIXCAT), ["low", "medium", "high", "xhigh", "max"]);
  assert.deepEqual(EF.effortsFor("devin/grok-4-7", FIXCAT), ["Low", "Medium", "High", "XHigh"], "the list wins over the exact row of the table");
  assert.equal(EF.effortSource("xai/grok-4.7", FIXCAT), "list");
});
await check("efforts (row 3): the menu items are 'default' plus the own efforts, the stored spelling is the value, 'default' is current for an empty value", () => {
  const items = EF.effortItemsFor("xai/grok-4.7", "xhigh", FIXCAT);
  assert.deepEqual(items.map((i) => i.value), ["default", "low", "medium", "high", "xhigh"]);
  assert.deepEqual(items.filter((i) => i.current).map((i) => i.value), ["xhigh"]);
  assert.equal(items.find((i) => i.value === "xhigh").label, "Extra high");
  for (const none of [undefined, "", "default"]) assert.deepEqual(EF.effortItemsFor("xai/grok-4.7", none, FIXCAT).filter((i) => i.current).map((i) => i.value), ["default"]);
  assert.ok(items.every((i) => i.blocked === false));
  const dev = EF.effortItemsFor("devin/grok-4-7", "High", FIXCAT);
  assert.deepEqual(dev.map((i) => i.value), ["default", "Low", "Medium", "High", "XHigh"]);
  assert.deepEqual(dev.filter((i) => i.current).map((i) => i.value), ["High"]);
});
await check("efforts (empty set): a model of the list with an empty set shows only 'default'; a stored effort shows first as '<value> (current)'", () => {
  assert.deepEqual(EF.effortsFor("xai/grok-4.20-0309-reasoning", FIXCAT), []);
  const items = EF.effortItemsFor("xai/grok-4.20-0309-reasoning", undefined, FIXCAT);
  assert.deepEqual(items, [{ value: "default", label: "default", current: true, extra: false, blocked: false }]);
  const kept = EF.effortItemsFor("xai/grok-4.20-0309-reasoning", "high", FIXCAT);
  assert.deepEqual(kept.map((i) => [i.value, i.label, i.current]), [["high", "high (current)", true], ["default", "default", false]]);
  assert.equal(kept[0].blocked, false, "a stored value is never blocked");
});
await check("efforts (run side): the two models that the run sends alone keep 'no effort choice', even when the list names efforts for one of them (launcher.py NO_VARIANT_MODELS)", () => {
  assert.equal(EF.effortSource("gemini-web/4-hydrogen", FIXCAT), "alone");
  assert.deepEqual(EF.effortsFor("gemini-web/4-hydrogen", FIXCAT), [], "the list says low, medium, high but the run drops it");
  assert.deepEqual(FIXCAT.byId.get("gemini-web/4-hydrogen").efforts, ["low", "medium", "high"]);
  assert.deepEqual(EF.effortItemsFor("gemini-web/4-hydrogen", "high", FIXCAT), []);
  assert.deepEqual(EF.effortItemsFor("google/antigravity-gemini-3.8-flash-high", "default", FIXCAT), []);
  assert.deepEqual(EF.effortItemsFor("gemini-web/4-hydrogen", "high", null), E.effortItems("gemini-web/4-hydrogen", "high"));
});
await check("efforts (fallback): a model that is not in the list uses the static table, then the rule for an unknown provider; a Claude card model that the list lacks gets the Claude rule", () => {
  assert.equal(EF.effortSource("acme/model-1", FIXCAT), "table");
  assert.deepEqual(EF.effortsFor("acme/model-1", FIXCAT), ["low", "medium", "high"]);
  assert.deepEqual(EF.effortsFor("acme/model-1", FIXCAT, ["ultra"]), ["low", "medium", "high", "ultra"]);
  assert.deepEqual(EF.effortsFor("devin/other", FIXCAT), [], "devin with no stored effort");
  assert.deepEqual(EF.effortsFor("devin/other", FIXCAT, ["Mid"]), ["Mid"]);
  assert.deepEqual(EF.effortsFor(`${CARD}/claude-opus-4-6`, FIXCAT), ["low", "medium", "high", "max"]);
  assert.deepEqual(EF.effortItemsFor("devin/other", "x", FIXCAT), [], "no effort choice, as in VW123");
  for (const [m, c, st] of [["acme/model-1", "ultra", ["ultra"]], ["xai/other", "high", []], ["openai/other", "none", []]]) assert.deepEqual(EF.effortItemsFor(m, c, null, st).map((i) => ({ ...i, blocked: undefined })), E.effortItems(m, c, st).map((i) => ({ ...i, blocked: undefined })), `${m}: no catalog works as VW123`);
});
await check("efforts (names): a name with a space is shown but blocked (the settings file and the Translator refuse it); the other names and 'default' are not blocked; a stored value is not blocked", () => {
  assert.equal(EF.effortNameOk("Low Fast"), false); assert.equal(EF.effortNameOk("No Thinking"), false); assert.equal(EF.effortNameOk("Low"), true); assert.equal(EF.effortNameOk("xhigh"), true);
  const items = EF.effortItemsFor("devin/claude-opus-5-5", "Low", FIXCAT);
  assert.deepEqual(items.map((i) => [i.value, i.blocked]), [["default", false], ["Low", false], ["Low Fast", true], ["Medium", false], ["High", false], ["XHigh", false]]);
  assert.ok(S.valueError("levels.2.variant", "Low Fast") !== null && S.valueError("levels.2.variant", "XHigh") === null);
  assert.match(EF.BLOCKED_TEXT, /letters, digits, underscore, dot and hyphen only/);
});
await onReal("efforts: the real list: every model has its effort list, the 7 models of the runs show the right menu, and 25 models have names that the settings file refuses", () => {
  let blockedModels = 0, empty = 0;
  for (const m of REALCAT.byId.values()) {
    assert.ok(m.efforts.every((e) => typeof e === "string" && e !== ""), m.id);
    const items = EF.effortItemsFor(m.id, undefined, REALCAT);
    if (EF.effortSource(m.id, REALCAT) === "alone") { assert.deepEqual(items, [], m.id); continue; }
    assert.deepEqual(items.map((i) => i.value), ["default", ...m.efforts], m.id);
    if (items.some((i) => i.blocked)) blockedModels++;
    if (m.efforts.length === 0) empty++;
  }
  assert.equal(blockedModels, 25); assert.equal(empty >= 25, true);
  assert.deepEqual(EF.effortsFor("xai/grok-4.7", REALCAT), ["low", "medium", "high", "xhigh"]);
  assert.deepEqual(EF.effortsFor(`${CARD}/claude-sonnet-5-5`, REALCAT), ["low", "medium", "high", "xhigh", "max"]);
  assert.deepEqual(EF.effortsFor("devin/grok-4-7", REALCAT), ["Low", "Medium", "High", "XHigh"]);
  assert.deepEqual(EF.effortsFor("xai/grok-4.20-0309-reasoning", REALCAT), []);
  assert.deepEqual(EF.effortItemsFor("xai/grok-4.20-0309-reasoning", undefined, REALCAT).map((i) => i.value), ["default"]);
  assert.deepEqual(EF.effortsFor("gemini-web/4-hydrogen", REALCAT), []);
  console.log(`      (real list: ${blockedModels} models have a blocked effort name, ${empty} models have an empty set)`);
});
await check("effort reset (row 3 and 5): a model change keeps an effort that the new model offers in the LIST and resets the others to 'default'; no catalog gives the VW123 result", () => {
  assert.deepEqual(EF.effortAfterModelChangeFor("xai/grok-4.7", "xhigh", FIXCAT), { value: "xhigh", reset: false }, "the list offers xhigh (the table does not)");
  assert.deepEqual(E.effortAfterModelChange("xai/grok-4.7", "xhigh"), { value: "default", reset: true });
  assert.deepEqual(EF.effortAfterModelChangeFor("xai/grok-4.7", "max", FIXCAT), { value: "default", reset: true });
  assert.deepEqual(EF.effortAfterModelChangeFor("xai/grok-4.20-0309-reasoning", "high", FIXCAT), { value: "default", reset: true });
  assert.deepEqual(EF.effortAfterModelChangeFor("gemini-web/4-hydrogen", "high", FIXCAT), { value: "default", reset: true });
  assert.deepEqual(EF.effortAfterModelChangeFor("devin/grok-4-7", "low", FIXCAT), { value: "default", reset: true }, "the stored spelling must match: 'low' is not 'Low'");
  assert.deepEqual(EF.effortAfterModelChangeFor("devin/grok-4-7", "Low", FIXCAT), { value: "Low", reset: false });
  for (const v of [undefined, "", "default"]) assert.equal(EF.effortAfterModelChangeFor("xai/grok-4.7", v, FIXCAT).reset, false);
  const eff = (v) => (key) => (key === "levels.2.variant" ? v : undefined);
  let r = L.pickModel({}, "levels.2.model", "xai/grok-4.7", eff("xhigh"), [], FIXCAT);
  assert.deepEqual(r.draft, { "levels.2.model": "xai/grok-4.7" }); assert.equal(r.reset, false);
  r = L.pickModel({}, "levels.2.model", "xai/grok-4.20-0309-reasoning", eff("high"), [], FIXCAT);
  assert.deepEqual(r.draft, { "levels.2.model": "xai/grok-4.20-0309-reasoning", "levels.2.variant": "default" }); assert.equal(r.reset, true);
  r = L.pickModel({}, "levels.2.model", "xai/grok-4.7", eff("xhigh"), []);
  assert.deepEqual(r.draft, { "levels.2.model": "xai/grok-4.7", "levels.2.variant": "default" }, "no catalog: the VW123 table");
  assert.equal(L.pickModel({}, "levels.2.model", "  ", eff("high"), [], FIXCAT).changed, false, "an empty ID still writes nothing");
});

// ---------------------------------------------------------------- part 5: both pages as HTML
const T2 = "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator";
const data = path.join(root, "data");
const cfgDir = path.join(root, "config");
mkdirSync(path.join(data, "pilot-sample"), { recursive: true });
mkdirSync(cfgDir, { recursive: true });
for (const name of ["translator-models.yaml", "translator-settings.defaults.json"]) copyFileSync(path.join(T2, "config", name), path.join(cfgDir, name));
const BOOKS = ["ki_breath_full_clean", "left_foot_full", "etiqu1_full"];
writeFileSync(path.join(data, "pilot-sample", "book-slugs.json"), JSON.stringify({ books: BOOKS.map((slug) => ({ slug, pages: 100 })) }));
const GLOBAL_TEXT = '{\n "schema": "translator-settings-v1",\n "revision": 1,\n "updated_utc": "2026-11-20T00:00:00.000Z",\n "levels": {\n  "2": {\n   "model": "xai/grok-4.7",\n   "variant": "xhigh"\n  },\n  "3": {\n   "model": "acme/outside-model",\n   "variant": "high"\n  }\n }\n}\n';
writeFileSync(path.join(cfgDir, "translator-settings.json"), GLOBAL_TEXT);
const viewerConfig = path.join(root, "viewer.config.json");
writeFileSync(viewerConfig, JSON.stringify({ translatorDataDir: data, translatorConfigDir: cfgDir, monitor: true }));
process.env.VIEWER_CONFIG = viewerConfig;
process.env.VIEWER_OC2_MODELS = fixFile;
const B = await import("../lib/book-settings.ts");
const RS = await import("../lib/settings-run.ts");
const BOOK = "ki_breath_full_clean";
await B.saveBookSettings(BOOK, { levels: { 2: { model: "openai/gpt-6.1-terra", variant: "medium" } } }, null);
const { default: BookSettingsForm } = await import("../components/BookSettingsForm.tsx");
const { default: RunSettingsForm } = await import("../components/RunSettingsForm.tsx");
const pages = async () => ({
  bookSnap: await B.readBookSettings(BOOK), globalSnap: await RS.readSettings(),
  bookHtml: renderToStaticMarkup(h(BookSettingsForm, { slug: BOOK, title: "Breathing", initialText: J.stringifySettingsJson(await B.readBookSettings(BOOK)) })),
  globalHtml: renderToStaticMarkup(h(RunSettingsForm, { initialText: J.stringifySettingsJson(await RS.readSettings()), pageLabels: {}, bookLabels: {} })),
});
const withList = await pages();

await check("the snapshots (row 1): both the global snapshot and the book snapshot carry the checked list; the yaml models and the yaml defaults stay", async () => {
  for (const s of [withList.bookSnap, withList.globalSnap]) {
    assert.equal(s.oc2.status, "ok"); assert.equal(s.oc2.providers.length, 8);
    assert.ok(Array.isArray(s.models) && s.models.length > 0, "the yaml models stay for the fallback");
    assert.ok(typeof s.defaults["levels.0.model"] === "string" && s.defaults["levels.0.model"] !== "", "the yaml values stay as the defaults");
  }
  assert.deepEqual(withList.bookSnap.oc2, withList.globalSnap.oc2);
  const round = J.parseSettingsJson(J.stringifySettingsJson(withList.globalSnap));
  assert.deepEqual(R.catalogOf(round.oc2).byId.get("xai/grok-4.7").efforts, ["low", "medium", "high", "xhigh"], "the list survives the JSON text of the page");
});
await onReal("the real list holds every model of translator-models.yaml (the models that the runs use now)", () => {
  const yaml = withList.globalSnap.models;
  assert.ok(yaml.length >= 1, `the yaml names ${yaml.length} models`);
  const missing = yaml.filter((m) => !REALCAT.byId.has(m));
  assert.deepEqual(missing, []);
  console.log(`      (translator-models.yaml names ${yaml.length} models, all in the list)`);
});
await check("the line (row 4): both pages show 'Model list from oc2, read 2026-11-22 14:10 PST' once, in the levels section", () => {
  for (const [name, html] of [["book", withList.bookHtml], ["global", withList.globalHtml]]) {
    assert.equal(count(html, /data-oc2-line/g), 1, name);
    assert.match(html, /<p[^>]*data-oc2-line[^>]*data-oc2-status="ok"[^>]*>Model list from oc2, read 2026-11-22 14:10 PST<\/p>/, name);
    assert.ok(html.indexOf("data-oc2-line") > html.indexOf("data-levels-table") - 400 && html.indexOf("data-oc2-line") < html.indexOf("data-levels-table"), `${name}: the line sits above the levels table`);
  }
});
await check("readable names (row 9): the buttons show the provider label and the readable name of the list; the Thinking button shows the efforts as before; the model with no effort choice stays", () => {
  const book = strip(withList.bookHtml), glob = strip(withList.globalHtml);
  assert.ok(book.includes("OpenAI · GPT-6.1 Terra") && book.includes("Thinking: Medium"), "book level 2 is openai/gpt-6.1-terra medium");
  assert.ok(glob.includes("xAI · Grok 4.7") && glob.includes("Thinking: Extra high"), "global level 2 is xai/grok-4.7 xhigh");
  assert.ok(glob.includes("acme · outside-model"), "a saved value outside the list shows on the button as before");
  assert.ok(glob.includes("no effort choice") && /data-thinking-none/.test(withList.globalHtml), "level 0 is gemini-web/4-hydrogen, which the run sends alone");
  assert.ok(!withList.bookHtml.includes("data-model-popover") && !withList.globalHtml.includes("data-model-popover"), "the closed form holds no list");
});
await check("no list file (row 4): the pages show the one note, the pickers use the yaml models, and no error page; the buttons read as in VW123", async () => {
  process.env.VIEWER_OC2_MODELS = path.join(root, "gone.json");
  try {
    const p = await pages();
    for (const [name, html, snap] of [["book", p.bookHtml, p.bookSnap], ["global", p.globalHtml, p.globalSnap]]) {
      assert.equal(snap.oc2.status, "missing", name);
      assert.equal(count(html, /data-oc2-line/g), 1, name);
      assert.match(html, /data-oc2-status="missing"[^>]*>Model list from oc2 not found\. The picker shows the models of translator-models\.yaml\.<\/p>/, name);
      assert.ok(strip(html).includes("xai · grok-4.7") || strip(html).includes("openai · gpt-6.1-terra"), `${name}: old button text`);
      assert.ok(!strip(html).includes("xAI · Grok 4.7"), name);
      assert.equal(snap.error, null, name);
    }
  } finally { process.env.VIEWER_OC2_MODELS = fixFile; }
});
await check("broken list file (row 4): the pages show the reason in one line and fall back to the yaml models; saving a book file still works", async () => {
  const bad = path.join(root, "bad.json"); writeFileSync(bad, JSON.stringify({ ...FIX, variant_sets: "x" }));
  process.env.VIEWER_OC2_MODELS = bad;
  try {
    const p = await pages();
    assert.equal(p.globalSnap.oc2.status, "broken");
    assert.match(strip(p.globalHtml), /Model list from oc2 cannot be read \(the key variant_sets is not a list of effort lists\)\. The picker shows the models of translator-models\.yaml\./);
    assert.equal(count(p.bookHtml, /data-oc2-line/g), 1);
    assert.equal(p.bookSnap.error, null);
  } finally { process.env.VIEWER_OC2_MODELS = fixFile; }
});
await check("old snapshots: a page text with no oc2 field (made before unit VW125) draws as in VW123 with no line and no error", () => {
  const snap = { ...J.parseSettingsJson(J.stringifySettingsJson(withList.globalSnap)) };
  delete snap.oc2;
  const html = renderToStaticMarkup(h(RunSettingsForm, { initialText: J.stringifySettingsJson(snap), pageLabels: {}, bookLabels: {} }));
  assert.equal(count(html, /data-oc2-line/g), 0);
  assert.ok(strip(html).includes("xai · grok-4.7"));
});
await check("the list file is read-only for the pages: no component or server file writes it, and the snapshot code never names a write call on it", () => {
  for (const f of ["lib/oc2-models.ts", "lib/oc2-models-rules.ts", "lib/oc2-efforts.ts", "components/ModelPicker.tsx", "components/ThinkingMenu.tsx"]) assert.ok(!/writeFile|appendFile|rename\(|unlink|createWriteStream/.test(code(f)), f);
});

// ---------------------------------------------------------------- part 6: the saved file and the files of the unit
await check("saved file (row 9): a picked model is written as the full ID with the chosen effort, as VW122 writes it; the history line holds both keys", async () => {
  const slug = "left_foot_full";
  const catalog = R.catalogOf((await B.readBookSettings(slug)).oc2);
  let draft = L.pickModel({}, "levels.1.model", "devin/grok-4-7", () => "low", [], catalog).draft;
  assert.deepEqual(draft, { "levels.1.model": "devin/grok-4-7", "levels.1.variant": "default" });
  draft["levels.1.variant"] = "XHigh";
  draft = { ...draft, ...L.pickModel(draft, "levels.2.model", "xai/grok-4.7", () => "xhigh", [], catalog).draft };
  const snap = await B.saveBookSettings(slug, S.nestSettings(draft), (await B.readBookSettings(slug)).sha1);
  assert.equal(snap.error, null);
  const file = readFileSync(path.join(cfgDir, "book-settings", `${slug}.json`), "utf8");
  assert.deepEqual(JSON.parse(file).levels, { 1: { model: "devin/grok-4-7", variant: "XHigh" }, 2: { model: "xai/grok-4.7" } });
  assert.deepEqual(Object.keys(JSON.parse(file)), ["schema", "revision", "updated_utc", "levels"]);
  const last = JSON.parse(readFileSync(path.join(cfgDir, "book-settings", `${slug}.history.jsonl`), "utf8").trim().split("\n").at(-1));
  assert.deepEqual(last.changes.map((c) => [c.key, c.new]), [["levels.1.model", "devin/grok-4-7"], ["levels.1.variant", "XHigh"], ["levels.2.model", "xai/grok-4.7"]]);
});
await check("saved file: the global file text of the test is untouched, and the list file of the test is untouched by a save", () => {
  assert.equal(readFileSync(path.join(cfgDir, "translator-settings.json"), "utf8"), GLOBAL_TEXT);
  assert.deepEqual(JSON.parse(readFileSync(fixFile, "utf8")), FIX);
});
await check("the new files: no e-mail address, no import other than react, node, @/ and ./ paths; the pure files hold no server import and no file access; the package list is unchanged (no new library)", () => {
  const files = ["lib/oc2-models-rules.ts", "lib/oc2-models.ts", "lib/oc2-efforts.ts", "lib/model-picker-rules.ts", "lib/settings-layout.ts", "components/ModelPicker.tsx", "components/ThinkingMenu.tsx", "components/SettingsFields.tsx", "components/BookSettingsForm.tsx", "components/RunSettingsForm.tsx", "scripts/vw125-test.mjs"];
  for (const f of files) {
    assert.doesNotMatch(read(f), /[A-Za-z0-9._+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/, f);
    for (const m of read(f).matchAll(/^import [^\n]*? from "([^"]+)"/gm)) assert.ok(m[1] === "react" || m[1] === "next/link" || m[1] === "server-only" || m[1].startsWith("@/") || m[1].startsWith("./") || m[1].startsWith("node:") || m[1] === "react-dom/server", `${f}: ${m[1]}`);
  }
  for (const f of ["lib/oc2-models-rules.ts", "lib/oc2-efforts.ts"]) assert.ok(!/from "(node:|fs|path|server-only)/.test(read(f)) && !/\bimport\b[^\n]*server-only/.test(read(f)) && !/\bprocess\./.test(code(f)), f);
  assert.ok(/import "server-only"/.test(read("lib/oc2-models.ts")));
  const pkg = JSON.parse(read("package.json"));
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ["modern-screenshot", "next", "react", "react-dom"]);
  assert.deepEqual(Object.keys(pkg.devDependencies).sort(), ["@tailwindcss/turbopack", "@types/node", "@types/react", "@types/react-dom", "eslint", "eslint-config-next", "tailwindcss", "typescript"]);
});
await check("themes: the changed components keep the theme tokens only (no gray, slate, black, white or hex color, no dark: class)", () => {
  for (const f of ["components/ModelPicker.tsx", "components/ThinkingMenu.tsx", "components/SettingsFields.tsx"]) {
    const c = code(f);
    assert.ok(!/\b(?:bg|text|border|ring|outline|fill|stroke)-(?:gray|slate|zinc|neutral|black|blue|green|sky|orange|yellow)\b/.test(c), `${f}: a color class outside the theme tokens`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(c.replace(/&#\d+;/g, "")), `${f}: a hex color`);
    assert.ok(!/\bdark:/.test(c), `${f}: a dark: class`);
  }
});

done();
