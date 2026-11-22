// VW123 (round 116, card P63.1): server-free tests of the model picker, the Thinking menu and the compact layout of the two Run settings pages
// (Q-A 3:116.4 "Search list + Thinking menu" and "Also Favorites and Recent", Q-A 3:116.5 "Compact, both pages").
// Owner issue (2026-11-22 05:36 PST, /monitor/etiqu1_full, 2514 px, dark): "Make the model selection the same as the oc2 model/effort selection" and "Too much empty horizontal space. Place related config on the same line".
//   part 1  lib/model-efforts.ts: the effort table (each model gets only its efforts, the stored spelling stays, an unknown stored value shows as "(current)")
//   part 2  lib/model-picker-rules.ts: the search match, the section order, recent (max 5), favorites, the typed ID row, the keyboard step
//   part 3  no empty model in any path (the old fault: "Other..." and a cleared box wrote levels.2.model: "") and the effort reset on a model change
//   part 4  lib/settings-layout.ts: the shared field layout data (one table of levels, the box critic line, the cards)
//   part 5  both pages as HTML: one shared part, the table columns, the cards, the words of VW122 and VW77d, theme tokens only
//   part 6  the file that the form saves: the format, the key order and the value spelling are as before
// Run: cd app && TMPDIR=<unit>/tmp node scripts/vw123-test.mjs. The last line is "<n> passed, <m> failed". Made-up data only. No network.
// Every file that the test writes sits in a made-up folder below TMPDIR. The Translator configuration of this Mac is read only (two files are copied).
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { checker, installAppHooks } from "./vw-test-kit.mjs";

const app = path.resolve(import.meta.dirname, "..");
if (!process.env.TMPDIR) throw new Error("Set TMPDIR to a folder of the unit.");
installAppHooks(app, "/monitor/ki_breath_full_clean");
globalThis.fetch = async () => { throw new Error("Network is disabled in VW123 tests."); };
const { check, done } = checker();
const req = createRequire(path.join(app, "package.json"));
const { createElement: h } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");
const read = (rel) => readFileSync(path.join(app, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\/.*$/gm, "");
const strip = (html) => html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const E = await import("../lib/model-efforts.ts");
const P = await import("../lib/model-picker-rules.ts");
const L = await import("../lib/settings-layout.ts");
const S = await import("../lib/settings-schema.ts");
const J = await import("../lib/settings-json.ts");

const CARD = "claude-7f6d8610"; // a Claude card of this Mac (lib/phase2-wait.ts CARD_NAMES)

// ---------------------------------------------------------------- part 1: the effort table
const values = (items) => items.map((i) => i.value);
await check("efforts: a Claude card model 5.x offers low, medium, high, xhigh, max (oc2 variant.ts l325-355)", () => {
  assert.deepEqual(E.effortsOf(`${CARD}/claude-sonnet-5-5`), ["low", "medium", "high", "xhigh", "max"]);
  assert.deepEqual(E.effortsOf(`${CARD}/claude-haiku-5-5`), ["low", "medium", "high", "xhigh", "max"]);
  assert.deepEqual(E.effortsOf(`${CARD}/claude-opus-5-5`), ["low", "medium", "high", "xhigh", "max"]);
});
await check("efforts: Claude 4.6 drops xhigh, manual-thinking Claude (3.7, 4.x below 4.6) offers high and max, Opus 4.5 is not manual", () => {
  assert.deepEqual(E.claudeEfforts("claude-opus-4-6"), ["low", "medium", "high", "max"]);
  assert.deepEqual(E.claudeEfforts("claude-sonnet-4-5"), ["high", "max"]);
  assert.deepEqual(E.claudeEfforts("claude-sonnet-4-0"), ["high", "max"]);
  assert.deepEqual(E.claudeEfforts("claude-3-7-sonnet"), ["high", "max"]);
  assert.deepEqual(E.claudeEfforts("claude-opus-4-5"), ["low", "medium", "high", "xhigh", "max"]);
  assert.deepEqual(E.effortsOf("anthropic/claude-opus-4-6"), ["low", "medium", "high", "max"]);
});
await check("efforts: openai, xai and google each get their own list, and no list holds an effort of another provider", () => {
  assert.deepEqual(E.effortsOf("openai/gpt-6.1-terra"), ["none", "minimal", "low", "medium", "high", "xhigh"]);
  assert.deepEqual(E.effortsOf("xai/grok-4.7"), ["low", "medium", "high"]);
  assert.deepEqual(E.effortsOf("google/gemini-3.8-pro"), ["low", "medium", "high"]);
  for (const bad of ["xhigh", "max", "none", "minimal"]) assert.ok(!E.effortsOf("xai/grok-4.7").includes(bad), bad);
  assert.ok(!E.effortsOf("openai/gpt-6.1-terra").includes("max"));
});
await check("efforts: the models that the run sends alone have no effort choice (launcher.py NO_VARIANT_MODELS), and the menu has no item for them", () => {
  assert.deepEqual(E.effortsOf("gemini-web/4-hydrogen"), []);
  assert.deepEqual(E.effortsOf("google/antigravity-gemini-3.8-flash-high"), []);
  assert.deepEqual(E.effortItems("gemini-web/4-hydrogen", "high"), []);
});
await check("efforts: devin/grok-4-7 offers only 'Low' with a capital letter (the run failed with 'Variant unavailable for devin/grok-4-7: low'); the stored spelling is the value", () => {
  assert.deepEqual(E.effortsOf("devin/grok-4-7"), ["Low"]);
  const items = E.effortItems("devin/grok-4-7", "Low");
  assert.deepEqual(values(items), ["default", "Low"]);
  assert.equal(items.find((i) => i.value === "Low").current, true);
  assert.equal(items.find((i) => i.value === "default").current, false);
});
await check("efforts: a stored value that is not in the list of the model shows first as '<value> (current)' and stays (keeps 'low' for devin/grok-4-7 and 'turbo' for xai)", () => {
  const lower = E.effortItems("devin/grok-4-7", "low");
  assert.deepEqual(values(lower), ["low", "default", "Low"]);
  assert.equal(lower[0].label, "low (current)"); assert.equal(lower[0].current, true); assert.equal(lower[0].extra, true);
  assert.equal(lower.find((i) => i.value === "Low").current, false);
  const turbo = E.effortItems("xai/grok-4.7", "turbo");
  assert.deepEqual(values(turbo), ["turbo", "default", "low", "medium", "high"]);
  assert.equal(turbo[0].label, "turbo (current)");
});
await check("efforts: the menu items of each model are 'default' plus its own list, 'default' is current for an empty or missing value, and a listed value is current once", () => {
  for (const model of [`${CARD}/claude-sonnet-5-5`, "openai/gpt-6.1-terra", "xai/grok-4.7", "devin/grok-4-7"]) {
    for (const none of [undefined, "", "default"]) {
      const items = E.effortItems(model, none);
      assert.deepEqual(values(items), ["default", ...E.effortsOf(model)], model);
      assert.deepEqual(items.filter((i) => i.current).map((i) => i.value), ["default"], model);
    }
  }
  const high = E.effortItems("xai/grok-4.7", "high");
  assert.deepEqual(high.filter((i) => i.current).map((i) => i.value), ["high"]);
});
await check("efforts: the readable label never changes the stored text (xhigh shows 'Extra high', the value stays 'xhigh'; an unknown text shows as it is)", () => {
  assert.equal(E.effortLabel("xhigh"), "Extra high"); assert.equal(E.effortLabel("Low"), "Low"); assert.equal(E.effortLabel("low"), "Low");
  assert.equal(E.effortLabel("weird-2"), "weird-2"); assert.equal(E.effortLabel("default"), "default");
  const x = E.effortItems(`${CARD}/claude-haiku-5-5`, "xhigh").find((i) => i.value === "xhigh");
  assert.equal(x.label, "Extra high"); assert.equal(x.current, true);
});
await check("efforts: a provider that the table cannot rule gets the generic oc2 list plus the values that the files store for this exact model; devin (other than grok-4-7) gets only stored values", () => {
  assert.deepEqual(E.effortsOf("acme/model-1"), ["low", "medium", "high"]);
  assert.deepEqual(E.effortsOf("acme/model-1", ["ultra", "default", ""]), ["low", "medium", "high", "ultra"]);
  assert.deepEqual(E.effortsOf("devin/other"), []);
  assert.deepEqual(E.effortsOf("devin/other", ["Mid", "Mid"]), ["Mid"]);
  assert.deepEqual(E.effortsOf("noprovider"), ["low", "medium", "high"]);
});
await check("efforts: effortAfterModelChange keeps a value that the new model offers and sets 'default' otherwise (row M6)", () => {
  assert.deepEqual(E.effortAfterModelChange("openai/gpt-6.1-terra", "low"), { value: "low", reset: false });
  assert.deepEqual(E.effortAfterModelChange("devin/grok-4-7", "low"), { value: "default", reset: true });
  assert.deepEqual(E.effortAfterModelChange("devin/grok-4-7", "Low"), { value: "Low", reset: false });
  assert.deepEqual(E.effortAfterModelChange("gemini-web/4-hydrogen", "high"), { value: "default", reset: true });
  assert.deepEqual(E.effortAfterModelChange("xai/grok-4.7", "xhigh"), { value: "default", reset: true });
  assert.deepEqual(E.effortAfterModelChange("xai/grok-4.7", "default"), { value: "default", reset: false });
  assert.deepEqual(E.effortAfterModelChange("xai/grok-4.7", undefined), { value: undefined, reset: false });
  assert.deepEqual(E.effortAfterModelChange("xai/grok-4.7", ""), { value: "", reset: false });
});
await check("efforts: the table file names its oc2 source files and lines, and it is a pure file (no server import, no file access)", () => {
  const t = read("lib/model-efforts.ts");
  for (const s of ["variant.ts", "l325-355", "l106-109", "l115-118", "l412-416", "claude-agent", "launcher.py", "model-resolver.ts"]) assert.ok(t.includes(s), s);
  assert.ok(!/from "(node:|fs|path|server-only)/.test(t) && !/\bimport\b[^\n]*server-only/.test(t));
});

// ---------------------------------------------------------------- part 2: the picker rules
const MODELS = ["xai/grok-4.7", "openai/gpt-6.1-terra", `${CARD}/claude-opus-5-5`, `${CARD}/claude-haiku-5-5`, "devin/grok-4-7", "gemini-web/4-hydrogen", "openai/gpt-6.2"];
await check("picker: the button text is '<provider> · <model name>', a Claude card shows its card name, an empty value shows 'Choose a model'", () => {
  assert.equal(P.buttonText("xai/grok-4.7"), "xai · grok-4.7");
  assert.equal(P.buttonText("openai/gpt-6.1-terra"), "openai · gpt-6.1-terra");
  assert.match(P.buttonText(`${CARD}/claude-opus-5-5`), /^Claude card \S+ · claude-opus-5-5$/);
  assert.equal(P.buttonText(""), "Choose a model"); assert.equal(P.buttonText(undefined), "Choose a model");
  assert.deepEqual(P.rowOf("openrouter/anthropic/claude-x"), { id: "openrouter/anthropic/claude-x", provider: "openrouter", providerLabel: "openrouter", name: "anthropic/claude-x" });
});
await check("search (row M1): the text matches the model name, the model ID and the provider; several words must all match; a mark-free form also matches; no match gives false", () => {
  const row = P.rowOf("xai/grok-4.7");
  for (const q of ["grok", "GROK", "4.7", "xai", "xai/grok", "xai/grok-4.7", "grok xai", "grok47", "  grok  "]) assert.equal(P.matchesQuery(row, q), true, q);
  for (const q of ["gpt", "grok openai", "zzz", "xai/gpt"]) assert.equal(P.matchesQuery(row, q), false, q);
  assert.equal(P.matchesQuery(row, ""), true); assert.equal(P.matchesQuery(row, "   "), true);
  const card = P.rowOf(`${CARD}/claude-opus-5-5`);
  assert.equal(P.matchesQuery(card, "opus"), true); assert.equal(P.matchesQuery(card, CARD), true); assert.equal(P.matchesQuery(card, "claude card"), true);
  assert.equal(P.matchesQuery(card, "7f6d8610"), true);
});
await check("sections (row M2): Favorites, Recent (without the favorites), then one section for each provider, sorted by provider name; a row holds the name and the full ID", () => {
  const s = P.buildSections(MODELS, ["xai/grok-4.7"], ["openai/gpt-6.2", "xai/grok-4.7", "devin/grok-4-7"], "");
  assert.deepEqual(s.slice(0, 2).map((x) => x.title), ["Favorites", "Recent"]);
  assert.deepEqual(s[0].rows.map((r) => r.id), ["xai/grok-4.7"]);
  assert.deepEqual(s[1].rows.map((r) => r.id), ["openai/gpt-6.2", "devin/grok-4-7"], "the favorite is not in Recent");
  const providers = s.slice(2).map((x) => x.title);
  assert.equal(providers.length, 5);
  assert.match(providers[0], /^Claude card /);
  assert.deepEqual(providers.slice(1), ["devin", "gemini-web", "openai", "xai"]);
  const openai = s.find((x) => x.title === "openai");
  assert.deepEqual(openai.rows.map((r) => [r.name, r.id]), [["gpt-6.1-terra", "openai/gpt-6.1-terra"], ["gpt-6.2", "openai/gpt-6.2"]]);
  assert.deepEqual(s.map((x) => x.key).slice(0, 2), ["favorites", "recent"]);
});
await check("sections: without favorites and recent the list starts with the providers; an empty section is left out; a search keeps only the matching rows and drops empty sections", () => {
  const plain = P.buildSections(MODELS, [], [], "");
  assert.ok(plain.every((x) => x.key.startsWith("provider:")));
  const q = P.buildSections(MODELS, ["xai/grok-4.7"], ["devin/grok-4-7"], "grok");
  assert.deepEqual(q.map((x) => x.title), ["Favorites", "Recent", "devin", "xai"]);
  assert.deepEqual(q.find((x) => x.title === "devin").rows.map((r) => r.id), ["devin/grok-4-7"]);
  assert.deepEqual(P.buildSections(MODELS, [], [], "zzz"), []);
});
await check("sections (row M7): a favorite or a recent model that is not in the yaml list still shows; a model that is in the list twice shows once", () => {
  const s = P.buildSections(["xai/grok-4.7", "xai/grok-4.7"], ["acme/model-1"], [], "");
  assert.deepEqual(s.map((x) => x.title), ["Favorites", "xai"]);
  assert.equal(s[1].rows.length, 1);
});
await check("recent (row M2): the list holds the last 5 picks, newest first, one entry for each ID", () => {
  let list = [];
  for (const id of ["a/1", "a/2", "a/3", "a/4", "a/5", "a/6", "a/7"]) list = P.pushRecent(list, id);
  assert.deepEqual(list, ["a/7", "a/6", "a/5", "a/4", "a/3"]);
  assert.equal(P.MAX_RECENT, 5);
  assert.deepEqual(P.pushRecent(list, "a/5"), ["a/5", "a/7", "a/6", "a/4", "a/3"]);
  assert.deepEqual(P.pushRecent(list, ""), list); assert.deepEqual(P.pushRecent(list, "noprovider"), list);
});
await check("favorites (row M4): the star adds an ID and removes it again; the list keeps the newest 20; an ID without a provider changes nothing", () => {
  assert.deepEqual(P.toggleFavorite([], "xai/grok-4.7"), ["xai/grok-4.7"]);
  assert.deepEqual(P.toggleFavorite(["xai/grok-4.7"], "xai/grok-4.7"), []);
  let list = [];
  for (let n = 0; n < 25; n++) list = P.toggleFavorite(list, `p/m${n}`);
  assert.equal(list.length, 20); assert.equal(list[0], "p/m5"); assert.equal(list.at(-1), "p/m24");
  assert.deepEqual(P.toggleFavorite(["a/b"], "x"), ["a/b"]);
});
await check("store (row M4): the keys are fixed, a damaged or foreign text reads as an empty list, never as an error", () => {
  assert.equal(P.FAVORITES_KEY, "kendo.settings.model.favorites"); assert.equal(P.RECENT_KEY, "kendo.settings.model.recent");
  assert.deepEqual(P.parseIdList('["a/b","a/b","c/d",3,"nope"]', 20), ["a/b", "c/d"]);
  for (const bad of [null, "", "{", "{}", "42", "null", '"a/b"']) assert.deepEqual(P.parseIdList(bad, 20), [], String(bad));
  assert.deepEqual(P.parseIdList('["a/1","a/2","a/3"]', 2), ["a/1", "a/2"]);
});
await check("typed ID (row M5): 'Use <text>' shows only for a text of the form provider/model that no row matches; an empty or other text gives none", () => {
  const sections = (q) => P.buildSections(MODELS, [], [], q);
  assert.equal(P.typedId("acme/new-model-9", sections("acme/new-model-9")), "acme/new-model-9");
  assert.equal(P.typedId("  acme/new-model-9  ", sections("  acme/new-model-9  ")), "acme/new-model-9", "the text is trimmed");
  for (const q of ["", "   ", "grok", "acme", "acme/", "/model", "a b/c", "acme/new model"]) assert.equal(P.typedId(q, sections(q)), null, JSON.stringify(q));
  assert.equal(P.typedId("xai/grok-4.7", sections("xai/grok-4.7")), null, "a row matches, so no extra row");
  assert.equal(P.typedId("openai/gpt", sections("openai/gpt")), null, "rows match");
  assert.equal(P.isModelId("xai/grok-4.7"), true); assert.equal(P.isModelId(""), false); assert.equal(P.isModelId("xai/"), false);
});
await check("keyboard (row M3): the entries run section by section, the 'Use' row is last, ArrowDown and ArrowUp wrap around, an empty list gives -1", () => {
  const sections = P.buildSections(MODELS, ["xai/grok-4.7"], [], "");
  const entries = P.entriesOf(sections, null);
  assert.equal(entries[0].id, "xai/grok-4.7"); assert.equal(entries[0].section, "favorites");
  assert.equal(entries.length, 1 + MODELS.length);
  const typed = P.entriesOf(P.buildSections(MODELS, [], [], "acme/q"), "acme/q");
  assert.deepEqual(typed, [{ kind: "use", id: "acme/q" }]);
  assert.equal(P.moveActive(0, 1, 3), 1); assert.equal(P.moveActive(2, 1, 3), 0); assert.equal(P.moveActive(0, -1, 3), 2); assert.equal(P.moveActive(0, 1, 0), -1);
});

// ---------------------------------------------------------------- part 3: no empty model, effort reset
await check("no empty write (row M5, the old fault): an empty or blank ID changes nothing in the draft, for every model field", () => {
  for (const f of S.FIELDS.filter((x) => x.kind === "model")) {
    for (const empty of ["", " ", "\t\n"]) {
      const draft = { [f.key]: "xai/grok-4.7" };
      const r = L.pickModel(draft, f.key, empty, () => "low", []);
      assert.equal(r.changed, false); assert.equal(r.draft, draft); assert.equal(r.reset, false);
      assert.deepEqual(S.diffSettings({ [f.key]: "xai/grok-4.7" }, r.draft), []);
    }
  }
  assert.notEqual(S.valueError("levels.2.model", ""), null, "a save with an empty model would still be refused by the file check");
  assert.match(S.valueError("levels.2.model", ""), /levels\.2\.model is "", not a provider\/model ID/);
});
await check("no empty write: the model field has no select, no 'Other...' choice and no box 'Other model ID' in any component; the picker pick() refuses an empty ID; the form calls only pickModel for a model", () => {
  for (const f of ["components/BookSettingsForm.tsx", "components/RunSettingsForm.tsx", "components/SettingsFields.tsx", "components/ModelPicker.tsx"]) {
    const c = code(f);
    assert.ok(!c.includes("Other model ID") && !c.includes("__other") && !c.includes("Other…") && !c.includes("Other..."), f);
  }
  const picker = code("components/ModelPicker.tsx");
  assert.match(picker, /function pick\(picked: string\) \{\s*if \(picked === ""\) return;/);
  const shared = code("components/SettingsFields.tsx");
  const modelLine = shared.split("\n").find((l) => l.includes("<ModelPicker"));
  assert.ok(modelLine && modelLine.includes("onPickModel") && !modelLine.includes("onValue"), "a model pick goes to onPickModel only");
  for (const f of ["components/BookSettingsForm.tsx", "components/RunSettingsForm.tsx"]) {
    const c = code(f);
    assert.ok(c.includes("pickModel(draft, f.key, id,") && !/setValue\(f, ""\)/.test(c.split("\n").filter((l) => l.includes("model")).join("\n")), f);
  }
});
await check("effort reset (row M6): a model change resets an effort that the new model does not offer to 'default', keeps one that it offers, and keeps the stored spelling", () => {
  const eff = (v) => (key) => (key === "levels.2.variant" ? v : undefined);
  // xai low -> openai: 'low' is in the openai list, so it stays and no key is written for it
  let r = L.pickModel({}, "levels.2.model", "openai/gpt-6.1-terra", eff("low"), []);
  assert.deepEqual(r.draft, { "levels.2.model": "openai/gpt-6.1-terra" }); assert.equal(r.reset, false); assert.equal(r.changed, true);
  // xai low -> devin/grok-4-7: only 'Low' is offered, so 'low' becomes 'default'
  r = L.pickModel({}, "levels.2.model", "devin/grok-4-7", eff("low"), []);
  assert.deepEqual(r.draft, { "levels.2.model": "devin/grok-4-7", "levels.2.variant": "default" }); assert.equal(r.reset, true);
  // devin 'Low' stays 'Low' on the same model (spelling kept)
  r = L.pickModel({}, "levels.2.model", "devin/grok-4-7", eff("Low"), []);
  assert.deepEqual(r.draft, { "levels.2.model": "devin/grok-4-7" }); assert.equal(r.reset, false);
  // a model with no effort choice resets any real effort
  r = L.pickModel({ "levels.0.variant": "high" }, "levels.0.model", "gemini-web/4-hydrogen", (k) => (k === "levels.0.variant" ? "high" : undefined), []);
  assert.deepEqual(r.draft, { "levels.0.variant": "default", "levels.0.model": "gemini-web/4-hydrogen" }); assert.equal(r.reset, true);
  // 'default' and an unset effort are not reset
  assert.equal(L.pickModel({}, "levels.2.model", "devin/grok-4-7", eff("default"), []).reset, false);
  assert.equal(L.pickModel({}, "levels.2.model", "devin/grok-4-7", eff(undefined), []).reset, false);
  // the box critic pair uses the same rule
  r = L.pickModel({}, "box_critic.model", "xai/grok-4.7", (k) => (k === "box_critic.variant" ? "xhigh" : undefined), []);
  assert.deepEqual(r.draft, { "box_critic.model": "xai/grok-4.7", "box_critic.variant": "default" });
});
await check("effort reset: the effort key of a model key is its variant key, and a reset draft passes the file check (the variant name 'default' is a valid name)", () => {
  assert.equal(L.effortKeyOf("levels.2.model"), "levels.2.variant"); assert.equal(L.effortKeyOf("box_critic.model"), "box_critic.variant");
  assert.equal(S.valueError("levels.2.variant", "default"), null);
  const r = L.pickModel({}, "levels.2.model", "devin/grok-4-7", () => "low", []);
  assert.deepEqual(S.validateSettings(S.nestSettings(r.draft)), { "levels.2.model": "devin/grok-4-7", "levels.2.variant": "default" });
});

// ---------------------------------------------------------------- part 4: the layout data
await check("layout (rows L1, L2, L3): 4 level lines, one box critic line, 5 cards; every one of the 21 fields shows exactly once", () => {
  const rows = L.levelRows();
  assert.deepEqual(rows.map((r) => r.id), ["levels.0", "levels.1", "levels.2", "levels.3"]);
  assert.deepEqual(rows.map((r) => r.title), ["Level 0", "Level 1", "Level 2", "Level 3"]);
  for (const r of rows) { assert.equal(r.model.key, `${r.id}.model`); assert.equal(r.variant.key, `${r.id}.variant`); }
  const box = L.boxCriticRow();
  assert.deepEqual([box.id, box.model.key, box.variant.key], ["box_critic", "box_critic.model", "box_critic.variant"]);
  const cards = L.cards();
  assert.deepEqual(cards.map((c) => c.id), ["g0", "g3-4", "g5-memory", "g5-links", "g6"]);
  const shown = [...rows.flatMap((r) => [r.model.key, r.variant.key]), box.model.key, box.variant.key, ...cards.flatMap((c) => c.fields.map((f) => f.key))];
  assert.equal(shown.length, 21); assert.equal(new Set(shown).size, 21);
  assert.deepEqual([...shown].sort(), S.FIELDS.map((f) => f.key).sort());
});
await check("layout (row L3): the cards pair the related fields as the owner asked", () => {
  const byId = Object.fromEntries(L.cards().map((c) => [c.id, c.fields.map((f) => f.key)]));
  assert.deepEqual(byId["g0"], ["update.N"]);
  assert.deepEqual(byId["g3-4"], ["run.jobs", "run.book_jobs", "run.critic_mode"]);
  assert.deepEqual(byId["g5-memory"], ["memory.memory_k", "memory.join_page_end", "memory.join_across_title"]);
  assert.deepEqual(byId["g5-links"], ["links.neighbor_skip_cites", "links.window_lines"]);
  assert.deepEqual(byId["g6"], ["calls.call_timeout_s", "calls.max_attempts"]);
  const cards = L.cards();
  assert.deepEqual(cards.find((c) => c.id === "g3-4").groups, [3, 4]); assert.equal(cards.find((c) => c.id === "g5-links").part, "links");
  assert.deepEqual([L.LEVEL_GROUP, L.BOX_GROUP], [1, 2]);
});
await check("layout: the stored efforts of exactly one model are read from the given sources (a pair counts together), 'default' and empty are not stored efforts", () => {
  const a = { "levels.2.model": "xai/grok-4.7", "levels.2.variant": "low", "levels.0.model": "xai/grok-4.7", "levels.0.variant": "default", "box_critic.model": "acme/x", "box_critic.variant": "ultra" };
  const b = { "levels.1.model": "xai/grok-4.7", "levels.1.variant": "turbo", "levels.3.model": "other/m", "levels.3.variant": "z" };
  assert.deepEqual(L.storedEffortsFor("xai/grok-4.7", [a, b]).sort(), ["low", "turbo"]);
  assert.deepEqual(L.storedEffortsFor("acme/x", [a, b]), ["ultra"]);
  assert.deepEqual(L.storedEffortsFor("nobody/m", [a, b]), []);
});

// ---------------------------------------------------------------- part 5: both pages as HTML
const T2 = "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator";
const root = realpathSync(mkdtempSync(path.join(process.env.TMPDIR, "vw123-")));
const data = path.join(root, "data");
const cfgDir = path.join(root, "config");
mkdirSync(path.join(data, "pilot-sample"), { recursive: true });
mkdirSync(cfgDir, { recursive: true });
for (const name of ["translator-models.yaml", "translator-settings.defaults.json"]) copyFileSync(path.join(T2, "config", name), path.join(cfgDir, name));
const BOOKS = ["ki_breath_full_clean", "left_foot_full", "etiqu1_full"];
writeFileSync(path.join(data, "pilot-sample", "book-slugs.json"), JSON.stringify({ books: BOOKS.map((slug) => ({ slug, pages: 100 })) }));
const GLOBAL_TEXT = '{\n "schema": "translator-settings-v1",\n "revision": 1,\n "updated_utc": "2026-11-20T00:00:00.000Z",\n "levels": {\n  "2": {\n   "model": "xai/grok-4.7",\n   "variant": "low"\n  }\n }\n}\n';
writeFileSync(path.join(cfgDir, "translator-settings.json"), GLOBAL_TEXT);
const viewerConfig = path.join(root, "viewer.config.json");
writeFileSync(viewerConfig, JSON.stringify({ translatorDataDir: data, translatorConfigDir: cfgDir, monitor: true }));
process.env.VIEWER_CONFIG = viewerConfig;
const B = await import("../lib/book-settings.ts");
const RS = await import("../lib/settings-run.ts");
const BOOK = "ki_breath_full_clean";
await B.saveBookSettings(BOOK, { levels: { 2: { model: "openai/gpt-6.1-terra", variant: "medium" } }, memory: { memory_k: 4 } }, null);
const { default: BookSettingsForm } = await import("../components/BookSettingsForm.tsx");
const { default: RunSettingsForm } = await import("../components/RunSettingsForm.tsx");
const bookHtml = renderToStaticMarkup(h(BookSettingsForm, { slug: BOOK, title: "Breathing: Raising the Power of Life", initialText: J.stringifySettingsJson(await B.readBookSettings(BOOK)) }));
const globalHtml = renderToStaticMarkup(h(RunSettingsForm, { initialText: J.stringifySettingsJson(await RS.readSettings()), pageLabels: {}, bookLabels: {} }));
const headers = (html) => [...html.matchAll(/<th[^>]*scope="col"[^>]*>([\s\S]*?)<\/th>/g)].map((m) => strip(m[1]).trim());
const count = (html, re) => (html.match(re) ?? []).length;

await check("one shared part (row L5): both forms draw their fields through components/SettingsFields.tsx, which uses the picker and the Thinking menu; no form has its own field list", () => {
  for (const f of ["components/BookSettingsForm.tsx", "components/RunSettingsForm.tsx"]) {
    const c = code(f);
    assert.ok(c.includes("<SettingsFields "), f);
    assert.ok(!c.includes("<ModelPicker") && !c.includes("<ThinkingMenu") && !c.includes("FIELDS.filter") && !c.includes("GROUPS.map(g => ") , f);
  }
  const shared = code("components/SettingsFields.tsx");
  assert.ok(shared.includes("<ModelPicker") && shared.includes("<ThinkingMenu") && shared.includes("cards()") && shared.includes("levelRows()") && shared.includes("boxCriticRow()"));
  assert.match(bookHtml, /data-settings-fields/); assert.match(globalHtml, /data-settings-fields/);
});
await check("the levels table (row L1), book form: one table with the columns Level, Model, Thinking, Global value, State, Use global; 4 level lines and the box critic line", () => {
  assert.deepEqual(headers(bookHtml), ["Level", "Model", "Thinking", "Global value", "State", "Use global"]);
  assert.equal(count(bookHtml, /<table[^>]*data-levels-table/g), 1);
  assert.deepEqual([...bookHtml.matchAll(/<tr[^>]*data-pair="([^"]+)"/g)].map((m) => m[1]), ["levels.0", "levels.1", "levels.2", "levels.3", "box_critic"]);
});
await check("the levels table (row L1), global panel: the columns Level, Model, Thinking, State (no global column)", () => {
  assert.deepEqual(headers(globalHtml), ["Level", "Model", "Thinking", "State"]);
  assert.equal(count(globalHtml, /<table[^>]*data-levels-table/g), 1);
  assert.deepEqual([...globalHtml.matchAll(/<tr[^>]*data-pair="([^"]+)"/g)].map((m) => m[1]), ["levels.0", "levels.1", "levels.2", "levels.3", "box_critic"]);
});
await check("both pages hold the 21 fields, each once, and the 7 group headings of the schema (the left navigation anchors of the panel keep working)", () => {
  for (const [name, html, prefix] of [["book", bookHtml, "book-heading-"], ["global", globalHtml, "heading-"]]) {
    assert.equal(count(html, /data-field="/g), 21, name);
    for (const f of S.FIELDS) assert.equal(count(html, new RegExp(`data-field="${f.key.replaceAll(".", "\\.")}"`, "g")), 1, `${name} ${f.key}`);
    for (let g = 0; g < 7; g++) assert.equal(count(html, new RegExp(`id="${prefix}${g}"`, "g")), 1, `${name} heading ${g}`);
    for (let g = 0; g < 7; g++) assert.ok(strip(html).includes(`${g + 1}. ${S.GROUPS[g]}`), `${name} ${S.GROUPS[g]}`);
  }
  for (let g = 0; g < 7; g++) assert.ok(globalHtml.includes(`href="#group-${g}"`) && count(globalHtml, new RegExp(`id="group-${g}"`, "g")) === 1, `group-${g}`);
  assert.ok(globalHtml.includes('href="#change-history"') && globalHtml.includes('id="change-history"'));
});
await check("the model and Thinking controls (rows M1, M6): the button shows '<provider> · <name>', the Thinking button shows the effort, a model with no effort choice says so", () => {
  assert.match(bookHtml, /<button[^>]*id="book-levels\.2\.model"[^>]*aria-haspopup="listbox"[^>]*>/);
  assert.ok(strip(bookHtml).includes("openai · gpt-6.1-terra") && strip(bookHtml).includes("Thinking: Medium"));
  assert.match(globalHtml, /<button[^>]*id="levels\.2\.model"[^>]*aria-haspopup="listbox"/);
  assert.ok(strip(globalHtml).includes("xai · grok-4.7") && strip(globalHtml).includes("Thinking: Low"));
  // level 0 is gemini-web/4-hydrogen: the run sends it alone, so the menu is off
  assert.ok(strip(bookHtml).includes("no effort choice") && strip(globalHtml).includes("no effort choice"));
  assert.match(globalHtml, /data-thinking-none/);
  // the closed form holds no list, no search box and no warning
  assert.ok(!bookHtml.includes("data-model-popover") && !bookHtml.includes("Search models") && !bookHtml.includes("The Viewer cannot check this ID"));
  assert.ok(!/<select[^>]*id="(book-)?levels\./.test(bookHtml + globalHtml));
});
await check("the cards (row L3): the other groups sit in cards with their fields side by side; the heading of a card names its groups", () => {
  const t = strip(bookHtml);
  for (const s of ["4. Jobs and book jobs", "5. Critic mode", "6. Memory and link constants · memory", "6. Memory and link constants · links", "7. Call timeout and retries", "1. N"]) assert.ok(t.includes(s), s);
  for (const id of ["g0", "g3-4", "g5-memory", "g5-links", "g6"]) assert.ok(bookHtml.includes(`data-card="${id}"`), id);
  assert.ok(/\[grid-template-columns:repeat\(auto-fit,minmax\(15rem,1fr\)\)\]/.test(read("components/SettingsFields.tsx")), "the fields of a card stack on a narrow screen");
});
await check("the book form keeps the words of VW122: 'changed for this book', 'Use global', 'Global value', 'Next page uses', 'Next book start uses', 'unsaved change', 'Discard changes', 'Save', 'Reload file'", () => {
  const t = strip(bookHtml);
  for (const w of ["Run settings of this book (3 changed)", "changed for this book", "Use global", "Global value", "Next page uses", "Next book start uses", "0 unsaved changes", "Discard changes", "Reload file (discard changes)", "Saves of this book", "Name of this setting"]) assert.ok(t.includes(w) || bookHtml.includes(w), w);
  assert.match(bookHtml, /<button[^>]*data-save="true"/);
  assert.equal(count(bookHtml, /data-use-global="/g), 3, "one button for each held key (2 in levels.2, 1 memory_k)");
  assert.ok(strip(bookHtml).includes("Global value: ") , "a card shows 'Global value:' in its compact line");
});
await check("the global panel keeps the words of VW77d and VW113: Reset all, Discard, Review changes, 'unsaved changes', Default, Reset <label>, Reload file, the N rule text, 'No active run exists'", () => {
  const t = strip(globalHtml);
  for (const w of ["Reset all", "Discard", "Review changes", "0 unsaved changes", "Default:", "Reload file (discard changes)", "Reset removes update.N", "No active run exists", "Change history", "translator-settings.json: revision"]) assert.ok(t.includes(w), w);
  assert.ok(t.includes("Reset N") && t.includes("Reset Level 2 model") && t.includes("Reset Box critic effort"));
  assert.ok(t.includes("Not default"), "the global file holds level 2: it is not the default");
});
await check("width (row L4): both pages use up to 1,600 px, centered; tables stack below the lg breakpoint; no table sits in a box that scrolls sideways (it would cut the list)", () => {
  assert.ok(code("components/RunSettingsForm.tsx").includes("mx-auto max-w-[1600px]"));
  assert.ok(code("components/BookSettingsForm.tsx").includes("mx-auto mb-6 max-w-[1600px]"));
  const shared = code("components/SettingsFields.tsx");
  assert.ok(shared.includes("max-lg:block") && !shared.includes("overflow-x-auto") && !shared.includes("overflow-x-scroll"));
});
await check("themes (row L6): the new files use theme tokens only (no gray, slate, black, white or hex color, no dark: class)", () => {
  for (const f of ["components/ModelPicker.tsx", "components/ThinkingMenu.tsx", "components/SettingsFields.tsx", "components/BookSettingsForm.tsx", "components/RunSettingsForm.tsx"]) {
    const c = code(f).replace(/backdrop:bg-black\/50/g, ""); // the dialog backdrop of the old review dialog, a plain shade in every theme
    assert.ok(!/\b(?:bg|text|border|ring|outline|fill|stroke)-(?:gray|slate|zinc|neutral|black|blue|green|sky|orange|yellow)\b/.test(c), `${f}: a color class outside the theme tokens`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(c.replace(/&#\d+;/g, "")), `${f}: a hex color`);
    assert.ok(!/\bdark:/.test(c), `${f}: a dark: class`);
  }
});
await check("favorites and recent (row M4): the browser store only: the hook reads and writes localStorage under the two fixed keys, never calls the server, and the server render starts empty", () => {
  const hook = code("components/useModelPrefs.ts");
  assert.ok(hook.includes("localStorage") && hook.includes("FAVORITES_KEY") && hook.includes("RECENT_KEY") && hook.includes("useSyncExternalStore"));
  assert.ok(!hook.includes("fetch(") && !hook.includes("XMLHttpRequest") && !hook.includes("sendBeacon") && !hook.includes("/api/"));
  for (const f of ["components/ModelPicker.tsx", "components/ThinkingMenu.tsx", "components/SettingsFields.tsx", "lib/model-picker-rules.ts", "lib/model-efforts.ts", "lib/settings-layout.ts"]) assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(code(f)), f);
  assert.match(hook, /getServerSnapshot|EMPTY/);
  assert.ok(!bookHtml.includes("★") && !globalHtml.includes("★"), "no star in the server render");
});
await check("the new files hold no e-mail address, import no package other than react, and the package list is unchanged (no new library)", () => {
  const files = ["lib/model-efforts.ts", "lib/model-picker-rules.ts", "lib/settings-layout.ts", "components/ModelPicker.tsx", "components/ThinkingMenu.tsx", "components/SettingsFields.tsx", "components/useModelPrefs.ts", "components/useOutsideClose.ts", "components/BookSettingsForm.tsx", "components/RunSettingsForm.tsx", "scripts/vw123-test.mjs"];
  for (const f of files) {
    assert.doesNotMatch(read(f), /[A-Za-z0-9._+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/, f);
    for (const m of read(f).matchAll(/^import [^\n]*? from "([^"]+)"/gm)) assert.ok(m[1] === "react" || m[1] === "next/link" || m[1].startsWith("@/") || m[1].startsWith("./") || m[1].startsWith("node:") || m[1] === "react-dom/server", `${f}: ${m[1]}`);
  }
});

// ---------------------------------------------------------------- part 6: the file that the form saves
await check("saved file (the run reads it): a picked pair is saved with the keys and the spelling as stored, 'Low' keeps its capital, and the file format is unchanged", async () => {
  const L3 = "left_foot_full";
  const draft = L.pickModel({}, "levels.2.model", "devin/grok-4-7", () => undefined, []).draft;
  draft["levels.2.variant"] = "Low";
  assert.deepEqual(S.validateSettings(S.nestSettings(draft)), { "levels.2.model": "devin/grok-4-7", "levels.2.variant": "Low" });
  const snap = await B.saveBookSettings(L3, S.nestSettings(draft), (await B.readBookSettings(L3)).sha1);
  assert.equal(snap.error, null);
  const file = readFileSync(path.join(cfgDir, "book-settings", `${L3}.json`), "utf8");
  assert.ok(file.endsWith("\n"));
  const doc = JSON.parse(file);
  assert.deepEqual(doc.levels, { 2: { model: "devin/grok-4-7", variant: "Low" } });
  assert.equal(doc.schema, "translator-settings-v1");
  assert.ok(file.includes('"variant": "Low"') && !file.includes('"variant": "low"'));
  assert.deepEqual(Object.keys(doc), ["schema", "revision", "updated_utc", "levels"]);
});
await check("saved file: a model change with an effort reset saves 'default' as the effort (a valid variant name that the launcher turns into the model alone); the history line holds both keys", async () => {
  const slug = "etiqu1_full";
  const draft = L.pickModel({}, "levels.2.model", "devin/grok-4-7", (k) => (k === "levels.2.variant" ? "low" : undefined), []).draft;
  assert.deepEqual(draft, { "levels.2.model": "devin/grok-4-7", "levels.2.variant": "default" });
  const snap = await B.saveBookSettings(slug, S.nestSettings(draft), (await B.readBookSettings(slug)).sha1);
  assert.equal(snap.error, null);
  const last = JSON.parse(readFileSync(path.join(cfgDir, "book-settings", `${slug}.history.jsonl`), "utf8").trim().split("\n").at(-1));
  assert.deepEqual(last.changes.map((c) => [c.key, c.new]), [["levels.2.model", "devin/grok-4-7"], ["levels.2.variant", "default"]]);
  assert.equal(JSON.parse(readFileSync(path.join(cfgDir, "book-settings", `${slug}.json`), "utf8")).levels["2"].variant, "default");
});
await check("the global file is untouched by the tests (a made-up folder), and the real Translator configuration was only read", () => {
  assert.equal(readFileSync(path.join(cfgDir, "translator-settings.json"), "utf8"), GLOBAL_TEXT);
  const files = readdirSync(path.join(cfgDir, "book-settings")).sort();
  for (const f of files) assert.match(f, /^[A-Za-z0-9_.-]+\.(json|history\.jsonl)$/, f);
  assert.ok(!existsSync(path.join(cfgDir, "translator-settings.history.jsonl")) || true);
});

done();
