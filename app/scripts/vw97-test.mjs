// VW97 (round 91, card P31.4): server-free tests of the Claude card names in model texts (fix b) and of the made-up data folders of the JSON viewer test (fix a).
// Owner pick Q-A 3:21.3 (2026-11-12): "Both fixes in VW97". Owner rule Q-A 3:17.4 (2026-11-11): "Annotate the names intuitively and properly. I cant understand
// what they are if you just write `Running` and each name is a long id number. Apply this for EVERYTHING."
// Run: TMPDIR=<unit>/tmp node scripts/vw97-test.mjs (from the app folder).
// Part 1 tests the text function for the 3 known Claude cards, an unknown provider, a value with no slash, "Other…" and that no output holds an e-mail address.
// Part 2 tests the card ID piece (lib/model-card.ts). Part 3 reads the sources of the 4 callers and of the JSON viewer test (the same way as vw96-test).
// No real data, no live folder, no server, no network. The test writes nothing. The last line is "<n> passed, <m> failed".
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire, registerHooks } from "node:module";

const app = path.resolve(import.meta.dirname, "..");
assert.ok(process.env.TMPDIR, "Set TMPDIR (use the unit folder tmp)");
globalThis.fetch = async () => {
  throw new Error("Network is disabled in the VW97 tests.");
};
// A .ts file loads by type stripping. A .tsx file (the card ID piece and the files it imports) is compiled in memory with the TypeScript of the app, for the render test of part 2.
const ts = createRequire(path.join(app, "package.json"))("typescript");
const withExt = (base) => (existsSync(base + ".ts") ? base + ".ts" : base + ".tsx");
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(pathToFileURL(withExt(path.join(app, specifier.slice(2)))).href, context);
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !path.extname(specifier)) return next(pathToFileURL(withExt(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier))).href, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith(".tsx")) {
      const source = ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
      return { format: "module", source, shortCircuit: true };
    }
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
const read = (rel) => readFileSync(path.join(app, rel), "utf8");

const R = await import("../lib/readable-names.ts");
const M = await import("../lib/model-card.ts");
const WT = await import("../lib/phase2-wait.ts");

// The 3 cards of the oc2 login accounts. The IDs and the short names are the same as CARD_NAMES of lib/phase2-wait.ts (VW92). The test lists them again as expected values.
const CARDS = [
  ["claude-028c2ffe", "ntngh"],
  ["claude-aade7ca8", "uonlp"],
  ["claude-7f6d8610", "ngotr"],
];
// Every text that the callers can show for these inputs. Used by the e-mail check.
const INPUTS = [
  ...CARDS.map(([id]) => `${id}/claude-haiku-5-5`),
  "xai/some-model",
  "google/some-model",
  "antigravity/antigravity-gemini-3.8-flash-high",
  "claude-aaaa1111/claude-haiku-5-5",
  "plain-model",
  "Other…",
  "__other",
  "",
  "/x",
  "x/",
  "constructor/some-model",
  "toString/some-model",
  "claude-028c2ffe/a/b",
];

// ---------------------------------------------------------------- part 1: the text of a model option

await check("the 3 known Claude cards show 'model (Claude card <name>)'", () => {
  for (const [id, name] of CARDS) {
    assert.equal(R.modelOptionText(`${id}/claude-haiku-5-5`), `claude-haiku-5-5 (Claude card ${name})`);
  }
  assert.equal(R.modelOptionText("claude-028c2ffe/claude-haiku-5-5"), "claude-haiku-5-5 (Claude card ntngh)");
  assert.equal(R.modelOptionText("claude-aade7ca8/claude-sonnet-5-5"), "claude-sonnet-5-5 (Claude card uonlp)");
  assert.equal(R.modelOptionText("claude-7f6d8610/claude-sonnet-5-5"), "claude-sonnet-5-5 (Claude card ngotr)");
});
await check("every card of CARD_NAMES (lib/phase2-wait.ts) is in the list of this test, and the names agree", () => {
  assert.deepEqual(Object.keys(WT.CARD_NAMES).sort(), CARDS.map(([id]) => id).sort());
  for (const [id, name] of CARDS) assert.equal(WT.CARD_NAMES[id], name);
});
await check("the provider ID does not show in the text of a known card (it shows in small grey text next to it)", () => {
  for (const [id] of CARDS) assert.ok(!R.modelOptionText(`${id}/claude-haiku-5-5`).includes(id));
});
await check("an unknown provider keeps '(provider <id>)'", () => {
  assert.equal(R.modelOptionText("xai/some-model"), "some-model (provider xai)");
  assert.equal(R.modelOptionText("google/some-model"), "some-model (provider google)");
  assert.equal(R.modelOptionText("antigravity/antigravity-gemini-3.8-flash-high"), "antigravity-gemini-3.8-flash-high (provider antigravity)");
  assert.equal(R.modelOptionText("claude-aaaa1111/claude-haiku-5-5"), "claude-haiku-5-5 (provider claude-aaaa1111)");
});
await check("a name of Object.prototype is not a card (constructor, toString)", () => {
  assert.equal(R.modelOptionText("constructor/some-model"), "some-model (provider constructor)");
  assert.equal(R.modelOptionText("toString/some-model"), "some-model (provider toString)");
});
await check("a value with no slash, 'Other…' and a broken slash stay as they are", () => {
  assert.equal(R.modelOptionText("plain-model"), "plain-model");
  assert.equal(R.modelOptionText("Other…"), "Other…");
  assert.equal(R.modelOptionText("__other"), "__other");
  assert.equal(R.modelOptionText(""), "");
  assert.equal(R.modelOptionText("/x"), "/x");
  assert.equal(R.modelOptionText("x/"), "x/");
});
await check("a model name with a second slash keeps it after the first slash", () => {
  assert.equal(R.modelOptionText("claude-028c2ffe/a/b"), "a/b (Claude card ntngh)");
  assert.deepEqual(R.modelOption("claude-028c2ffe/a/b"), { label: "a/b", provider: "claude-028c2ffe" });
});
await check("the option value stays 'provider/model' (modelOption splits it, the text function does not change it)", () => {
  assert.deepEqual(R.modelOption("claude-028c2ffe/claude-haiku-5-5"), { label: "claude-haiku-5-5", provider: "claude-028c2ffe" });
  assert.deepEqual(R.modelOption("Other…"), { label: "Other…", provider: null });
});
await check("the settings option text of a '.model' key uses the card name too", () => {
  assert.equal(R.optionText("levels.1.model", "claude-028c2ffe/claude-haiku-5-5"), "claude-haiku-5-5 (Claude card ntngh)");
  assert.equal(R.optionText("box_critic.model", "xai/some-model"), "some-model (provider xai)");
});
await check("no text holds an e-mail address or an @ sign", () => {
  for (const v of INPUTS) {
    const outs = [R.modelOptionText(v), M.modelCardId(v) ?? "", M.providerOf(v) ?? ""];
    for (const o of outs) {
      assert.ok(!o.includes("@"), `@ in the text of ${JSON.stringify(v)}: ${o}`);
      assert.ok(!/gmail|\.com\b/i.test(o), `e-mail part in the text of ${JSON.stringify(v)}: ${o}`);
    }
  }
  for (const [, name] of CARDS) assert.ok(!name.includes("@"));
});

// ---------------------------------------------------------------- part 2: the card ID piece (lib/model-card.ts)

await check("cardNameOf: the 3 names, null for another provider, for null and for prototype names", () => {
  for (const [id, name] of CARDS) assert.equal(M.cardNameOf(id), name);
  for (const x of ["xai", "google", "antigravity", "claude-aaaa1111", "constructor", "toString", "__proto__", "hasOwnProperty", ""]) assert.equal(M.cardNameOf(x), null, x);
  assert.equal(M.cardNameOf(null), null);
});
await check("providerOf: the part before the first slash, null for no usable slash", () => {
  assert.equal(M.providerOf("claude-028c2ffe/claude-haiku-5-5"), "claude-028c2ffe");
  assert.equal(M.providerOf("xai/some-model"), "xai");
  for (const x of ["plain-model", "Other…", "", "/x", "x/"]) assert.equal(M.providerOf(x), null, x);
});
await check("modelCardId: the card ID of a known Claude card only (the grey text), null for the rest", () => {
  for (const [id] of CARDS) assert.equal(M.modelCardId(`${id}/claude-haiku-5-5`), id);
  for (const v of ["xai/some-model", "google/some-model", "claude-aaaa1111/claude-haiku-5-5", "plain-model", "Other…", "", "/x", "x/", "constructor/m"]) assert.equal(M.modelCardId(v), null, v);
});
await check("providerWords: 'Claude card <name>' or 'provider <id>'", () => {
  assert.equal(M.providerWords("claude-028c2ffe"), "Claude card ntngh");
  assert.equal(M.providerWords("xai"), "provider xai");
});
await check("render: the card ID piece gives small grey text 'claude-xxxxxxxx' with a hover for each of the 3 cards, and nothing for the rest", async () => {
  const { ModelCardId } = await import("../components/ModelCardId.tsx");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = (value) => renderToStaticMarkup(createElement(ModelCardId, { value }));
  for (const [id] of CARDS) {
    const h = html(`${id}/claude-haiku-5-5`);
    assert.match(h, new RegExp(`<span class="whitespace-nowrap"><span data-raw-id="true" class="[^"]*text-muted[^"]*" title="Provider ID of the Claude card: ${id}">${id}</span></span>`), h);
    assert.ok(h.startsWith(" "), "a space separates the ID from the text before it");
    assert.ok(!h.includes("@"));
  }
  for (const v of ["xai/some-model", "google/some-model", "claude-aaaa1111/claude-haiku-5-5", "plain-model", "Other…", "", "/x", "x/", "constructor/m"]) assert.equal(html(v), "", v);
});
await check("the card map has one place: lib/model-card.ts imports it from lib/phase2-wait.ts and holds no ID list of its own", () => {
  const s = read("lib/model-card.ts");
  assert.match(s, /import \{ CARD_NAMES \} from "\.\/phase2-wait"/);
  assert.doesNotMatch(s, /["']claude-[0-9a-f]{8}["']/);
  assert.doesNotMatch(read("lib/readable-names.ts"), /["']claude-[0-9a-f]{8}["']\s*:/);
});

// ---------------------------------------------------------------- part 3: the callers and the JSON viewer test (source patterns)

await check("the per-call table of the page view shows the card name, the card ID in small grey text and keeps the hover 'Model ID'", () => {
  const s = read("components/ExtraPanels.tsx");
  assert.match(s, /title=\{`Model ID: \$\{r\.model\}`\}>\{modelOptionText\(String\(r\.model\)\)\}<\/span>/);
  assert.match(s, /<ModelCardId value=\{String\(r\.model\)\} \/>/);
});
await check("the step view line shows the card name and the card ID in small grey text", () => {
  const s = read("components/StepTree.tsx");
  assert.match(s, /modelOptionText\(step\.model\)/);
  assert.match(s, /<ModelCardId value=\{step\.model\} \/>/);
});
await check("the step data row 'Model' (plain string) uses the same text function", () => {
  assert.match(read("lib/step-data.ts"), /modelOptionText\(str\(r\.model\) as string\)/);
});
await check("the model list of the Run settings panel keeps the option value 'provider/model', shows plain text, and puts the model ID in the hover", () => {
  const s = read("components/RunSettingsForm.tsx");
  assert.match(s, /<option key=\{m\} value=\{m\} title=\{`Model ID: \$\{m\}`\}>\{modelOptionText\(m\)\}<\/option>/);
});
await check("the card ID piece is a small grey RawId and shows nothing for another provider", () => {
  const s = read("components/ModelCardId.tsx");
  assert.match(s, /modelCardId\(value\)/);
  assert.match(s, /if \(id === null\) return null;/);
  assert.match(s, /<RawId[^>]*>\{id\}<\/RawId>/);
  assert.match(s, /whitespace-nowrap/);
});
await check("no new source file holds an e-mail address", () => {
  for (const f of ["lib/model-card.ts", "components/ModelCardId.tsx", "scripts/vw97-test.mjs", "lib/readable-names.ts", "components/ExtraPanels.tsx", "components/StepTree.tsx", "components/RunSettingsForm.tsx"]) {
    assert.doesNotMatch(read(f), /[A-Za-z0-9._+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/, f);
  }
});
await check("fix a: the JSON viewer test no longer reads the live data folder for 'no phase 2 report', and it keeps the guard of the unit variable", () => {
  const s = read("scripts/json-view-test.mjs");
  assert.doesNotMatch(s, /real data folder today/);
  assert.match(s, /noReportConfig/);
  assert.match(s, /oneReportConfig/);
  assert.match(s, /\[A-Z\]\{2\}\\d\+_UNIT/);
  // The only config that points at the live folder is the pilot config, and the root listing (loadJsonView("")) does not run under it.
  const afterPilot = s.slice(s.indexOf("// Real pilot files, read only"));
  const rootCalls = [...afterPilot.matchAll(/loadJsonView\(""\)/g)].length;
  assert.equal(rootCalls, 2, "two root listings, both on made-up folders");
  assert.ok(afterPilot.indexOf("process.env.VIEWER_CONFIG = noReportConfig") < afterPilot.indexOf('loadJsonView("")'));
});
await check("no data file in the app: the new files hold no article ID or run stamp of real data", () => {
  // This test file is not read here, because it holds the patterns.
  for (const f of ["lib/model-card.ts", "components/ModelCardId.tsx"]) {
    assert.doesNotMatch(read(f), /\b\d{8}T\d{6}Z\b|\b[0-9a-f]{8}[\/_]p\d{3}\b/, f);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
