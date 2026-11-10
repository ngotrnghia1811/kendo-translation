// VW77d: server-free contracts. Every write stays in this build unit.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import fsSync from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const app = path.resolve(import.meta.dirname, "..");
const u = await fs.realpath(path.dirname(app));
assert.match(u, /\/opencode\/r89\/VW77d$/);
assert.equal(process.env.VW77D_UNIT, u, "Use scripts/dev/cleanenv.sh");
assert.equal(await fs.realpath(process.env.TMPDIR), path.join(u, "tmp"));
assert.equal(process.env.HOME, path.join(u, "tmp/home"));
globalThis.fetch = async () => { throw new Error("Network is disabled in VW77d contracts."); };
const fixture = await fs.mkdtemp(path.join(u, "tmp/contracts-"));
const data = path.join(fixture, "data"); const config = path.join(fixture, "config");
await fs.mkdir(data); await fs.mkdir(config);
const t2 = "/Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator";
// Read-only inputs, never the live settings file.
for (const name of ["translator-models.yaml", "translator-settings.defaults.json"]) await fs.copyFile(path.join(t2, "config", name), path.join(config, name));
const configFile = path.join(fixture, "viewer.config.json");
await fs.writeFile(configFile, JSON.stringify({ translatorDataDir: data, translatorConfigDir: config, monitor: true }));
process.env.VIEWER_CONFIG = configFile;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier === "next/navigation") return { url: "data:text/javascript,export function notFound(){throw new Error('NOT_FOUND')} export function redirect(){throw new Error('REDIRECT')}", shortCircuit: true };
    if (specifier === "next/headers") return { url: "data:text/javascript,export function cookies(){throw new Error('No cookies in fixture contracts')} export function headers(){throw new Error('No headers in fixture contracts')}", shortCircuit: true };
    if (specifier.startsWith("@/")) return next(pathToFileURL(path.join(app, specifier.slice(2)) + ".ts").href, context);
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:") && !path.extname(specifier)) return next(new URL(specifier + ".ts", context.parentURL).href, context);
    return next(specifier, context);
  },
  load(url, context, next) { if (url.endsWith(".ts")) return { ...next(url, { ...context, format: "module-typescript" }), format: "module-typescript" }; return next(url, context); },
});
const schema = await import("../lib/settings-schema.ts");
const { parseSettingsJson, stringifySettingsJson } = await import("../lib/settings-json.ts");
const { localWriteProblem } = await import("../lib/local-write.ts");
const { settingsFile } = await import("../lib/safe-path.ts");
const store = await import("../lib/settings-run.ts");
const route = await import("../app/api/settings/run/route.ts");
const listPause = await import("../app/api/pause/route.ts");
const { handleBookAction } = await import("../lib/book-actions.ts");
const { handleClearMark } = await import("../lib/book-restart-actions.ts");
let count = 0;
function ok(name, fn) { fn(); count++; console.log("PASS " + name); }
async function check(name, fn) { await fn(); count++; console.log("PASS " + name); }
const outcome = (promise) => promise.then((value) => ({ status: "fulfilled", value }), (reason) => ({ status: "rejected", reason }));
const defaultsDoc = JSON.parse(await fs.readFile(path.join(config, "translator-settings.defaults.json"), "utf8"));
const defaults = schema.validateSettings(defaultsDoc);
ok("all 22 keys and all eight groups", () => { assert.equal(schema.FIELDS.length, 22); assert.equal(new Set(schema.FIELDS.map((f) => f.group)).size, 8); assert.deepEqual(Object.keys(defaults).sort(), [...schema.KEY_ORDER].sort()); });
const cases = [];
for (const f of schema.FIELDS) {
  cases.push(JSON.stringify(schema.nestSettings({ [f.key]: defaults[f.key] })));
  for (const bad of [true, false, null, [], {}, "", "bad value", -1, 0, 1.5, 99999]) cases.push(JSON.stringify(schema.nestSettings({ [f.key]: bad })));
  for (const n of [f.min, f.max].filter((n) => n !== undefined)) cases.push(JSON.stringify(schema.nestSettings({ [f.key]: n })));
}
cases.push(...['{"update":{"N":1.0}}', '{"update":{"N":1e0}}', '{"revision":1.0}', '{"run":{"jobs":8.0}}', '{"run":{"max_usd_per_page":1.0}}', '{"levels":{"0":{"model":"日本語"}}}', '{"schema":"日本語"}', '{"update":{"N":1},"update":{"N":3}}']);
for (const d of [[], null, 1, true, { unknown: 1 }, { levels: [] }, { levels: { 4: {} } }, { levels: { 0: null } }, { levels: { 0: { unknown: 1 } } }, { schema: 3 }, { revision: true }, { revision: -1 }, { update: null }, { memory: { join_across_title: 1 } }, { updated_utc: [] }]) cases.push(JSON.stringify(d));
for (const key of ["update.N", "run.jobs", "run.max_usd_per_page", "links.window_lines"]) {
  for (const token of ["9007199254740993", "-9007199254740993", "1e20", "1e-7", "1e400", "NaN", "Infinity", "-Infinity"]) {
    cases.push(JSON.stringify(schema.nestSettings({ [key]: "__number__" })).replace('"__number__"', token));
  }
}
cases.push('{"levels":{"0":{"model":"x/y\\n","variant":"high\\n"}}}', '{"levels":{"0":{"model":"x/y\\n\\n"}}}');
cases.push('{"levels":{"3":{"model":false},"0":{"model":false}}}');
cases.push('', '{', '[', '{"a" 1}', '{"a":}', '[1,]', '{"a":1,}', '{"a":1} 2', '{"a":"\\q"}', '{"a":"\\u123Z"}', '{"a":"text', '{"a":"a\nb"}', '{"😀" :}', '{"a":01}', '{"a":1.}', '{"a":true false}');
// Execute only validation AST nodes from the actual source, without its imports or any run code.
const python = String.raw`
import ast,json,re,sys,types
source=open(sys.argv[1],encoding='utf8').read()
names={'SCHEMA','FILE_NAME','CRITIC_MODES','LEVELS','VARIANT_RE','TOP_KEYS','GROUPS','KEY_ORDER'}
tree=ast.parse(source)
nodes=[n for n in tree.body if (isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id in names for t in n.targets)) or (isinstance(n,ast.FunctionDef) and n.name in {'_is_int','check_value','flatten'})]
env={'json':json,'re':re,'SettingsError':ValueError,'C':types.SimpleNamespace(MODEL_ID_RE=re.compile(r'^[A-Za-z0-9_.-]+/[A-Za-z0-9_.:@-]+(/[A-Za-z0-9_.:@-]+)*$'))}
exec(compile(ast.Module(body=nodes,type_ignores=[]),sys.argv[1],'exec'),env)
out=[]
for raw in json.load(sys.stdin):
 try: out.append({'value_json':json.dumps(env['flatten'](json.loads(raw)),ensure_ascii=False,separators=(',',':'))})
 except ValueError as e: out.append({'error':str(e)})
print(json.dumps(out,ensure_ascii=False))
`;
const py = spawnSync("python3", ["-B", "-c", python, path.join(t2, "data/scripts/translator/settings.py")], { input: JSON.stringify(cases), encoding: "utf8", env: process.env });
assert.equal(py.status, 0, py.stderr);
const expected = JSON.parse(py.stdout);
ok(`Translator schema/error parity: ${cases.length} good, bad, shape and float-token cases`, () => {
  cases.forEach((raw, i) => { let actual; try { actual = { value_json: stringifySettingsJson(schema.validateSettings(parseSettingsJson(raw))) }; } catch (e) { actual = { error: e.message }; } assert.deepEqual(actual, expected[i], raw); });
});
// Correction 2 (P13.2): the N rule comes from update.phase_rule of translator-models.yaml (Q-A 2:9.4, 2:8.4).
const ruleDoc = (body) => "# fixture\nlevels:\n  x: 1\nupdate:\n  N: 5\n" + body + "\n";
const rule = (p2 = "3", p3 = "2", p4 = ["100: 2", "200: 3", "otherwise: 5"]) => ruleDoc("  phase_rule:\n" + (p2 === null ? "" : `    agent-phase-2: ${p2}\n`) + (p3 === null ? "" : `    agent-phase-3: ${p3}\n`) + (Array.isArray(p4) ? "    agent-phase-4:\n" + p4.map((l) => "      " + l).join("\n") : `    agent-phase-4: ${p4}`));
const P = "translator-models.yaml update.phase_rule: ";
const ruleCases = [
  ["real T2 file", await fs.readFile(path.join(t2, "config/translator-models.yaml"), "utf8")],
  ["real-shaped block", rule()],
  ["custom numbers, unsorted bounds", rule("7", "4", ["300: 6", "otherwise: 9", "50: 1"])],
  ["one bound", rule("2", "2", ["150: 2", "otherwise: 4"])],
  ["quoted values and comments", rule('"3" # q', "'2'", ["100: 2 # c", "otherwise: 5"])],
  ["leading zeros", rule("007", "2", ["0100: 2", "otherwise: 5"])],
  ["large whole numbers", rule("12345678901234567890", "2", ["100: 98765432109876543210", "otherwise: 5"])],
  ["blank space or a comment opens a mapping", ruleDoc("  phase_rule:   \n    agent-phase-2: 3\n    agent-phase-3: 2\n    agent-phase-4: # bands\n      100: 2\n      otherwise: 5")],
  ["repeated key keeps the last value", rule("3", "2", ["100: 2", "100: 3", "otherwise: 5"])],
  ["missing update", "run:\n  jobs: 2\n", P + "missing or invalid update block"],
  ["update is a value", "update: 5\n", P + "missing or invalid update block"],
  ["missing phase_rule", ruleDoc(""), P + "missing or invalid rule. Expected agent-phase-2, agent-phase-3, agent-phase-4"],
  ["phase_rule is a value", ruleDoc("  phase_rule: 3"), P + "missing or invalid rule. Expected agent-phase-2, agent-phase-3, agent-phase-4"],
  ["extra phase key", rule("3", "2", ["100: 2", "otherwise: 5"]) + "    agent-phase-5: 2\n", P + "missing or invalid rule. Expected agent-phase-2, agent-phase-3, agent-phase-4"],
  ["missing phase key", rule("3", null), P + "missing or invalid rule. Expected agent-phase-2, agent-phase-3, agent-phase-4"],
  ["zero", rule("0"), P + "expected a positive whole number, not '0'"],
  ["minus one", rule("-1"), P + "expected a positive whole number, not '-1'"],
  ["true", rule("true"), P + "expected a positive whole number, not 'true'"],
  ["2.5", rule("2.5"), P + "expected a positive whole number, not '2.5'"],
  ["empty quoted value", rule('""'), P + "expected a positive whole number, not ''"],
  ["single quote in value", rule(`"it's"`), P + `expected a positive whole number, not "it's"`],
  ["both quotes in value", rule(`"it's \\"x\\""`), P + `expected a positive whole number, not 'it\\'s "x"'`],
  ["backslash and tab", rule("'a\\b\tc'"), P + "expected a positive whole number, not 'a\\\\b\\tc'"],
  ["Japanese value", rule("三"), P + "expected a positive whole number, not '三'"],
  ["phase 3 text", rule("3", "x y"), P + "expected a positive whole number, not 'x y'"],
  ["phase 2 is a mapping", ruleDoc("  phase_rule:\n    agent-phase-2:\n      100: 2\n    agent-phase-3: 2\n    agent-phase-4:\n      otherwise: 5\n      100: 2"), P + "expected a positive whole number, not {'100': '2'}"],
  ["phase 2 is an empty mapping", ruleDoc("  phase_rule:\n    agent-phase-2:\n    agent-phase-3: 2\n    agent-phase-4:\n      100: 2\n      otherwise: 5"), P + "expected a positive whole number, not {}"],
  ["phase 4 without otherwise", rule("3", "2", ["100: 2", "200: 3"]), P + "phase 4 needs page bounds and otherwise"],
  ["phase 4 with only otherwise", rule("3", "2", ["otherwise: 5"]), P + "phase 4 needs page bounds and otherwise"],
  ["phase 4 is a value", rule("3", "2", "5"), P + "phase 4 needs page bounds and otherwise"],
  ["text bound", rule("3", "2", ["abc: 2", "otherwise: 5"]), P + "expected a positive whole number, not 'abc'"],
  ["zero bound", rule("3", "2", ["0: 2", "otherwise: 5"]), P + "expected a positive whole number, not '0'"],
  ["bad bound value", rule("3", "2", ["100: x", "otherwise: 5"]), P + "expected a positive whole number, not 'x'"],
  ["bad otherwise", rule("3", "2", ["100: 2", "otherwise: 0"]), P + "expected a positive whole number, not '0'"],
  ["duplicate bound", rule("3", "2", ["100: 2", "0100: 3", "otherwise: 5"]), P + "duplicate numeric page bound"],
  ["first bad bound in file order", rule("3", "2", ["300: bad1", "otherwise: 5", "50: bad2"]), P + "expected a positive whole number, not 'bad1'"],
  ["phase 2 before phase 4", rule("0", "2", ["otherwise: 5"]), P + "expected a positive whole number, not '0'"],
  ["otherwise before bounds", rule("3", "2", ["100: x", "otherwise: y"]), P + "expected a positive whole number, not 'y'"],
];
const pages = [0, 1, 49, 50, 99, 100, 101, 149, 150, 199, 200, 299, 300, 1000000];
const probes = [["agent-phase-2", 0], ["agent-phase-3", 0], ...pages.map((n) => ["agent-phase-4", n])];
// Execute only parse_yaml, _unquote, _is_int and phase_rule_n from the actual Translator source, with no run code.
const rulePython = String.raw`
import ast,json,re,sys
def pick(file,names): return [n for n in ast.parse(open(file,encoding='utf8').read()).body if isinstance(n,ast.FunctionDef) and n.name in names]
env={'re':re,'ConfigError':ValueError,'SettingsError':ValueError}
for file,names in ((sys.argv[1],{'_unquote','parse_yaml'}),(sys.argv[2],{'_is_int','phase_rule_n'})): exec(compile(ast.Module(body=pick(file,names),type_ignores=[]),file,'exec'),env)
out=[]
for case in json.load(sys.stdin):
 cfg=env['parse_yaml'](case['yaml'])
 try: out.append({'n':[str(env['phase_rule_n'](p,n,cfg)) for p,n in case['probes']]})
 except ValueError as e: out.append({'error':str(e)})
print(json.dumps(out,ensure_ascii=False))
`;
const rulePy = spawnSync("python3", ["-B", "-c", rulePython, path.join(t2, "data/scripts/translator/config.py"), path.join(t2, "data/scripts/translator/settings.py")], { input: JSON.stringify(ruleCases.map(([, yaml]) => ({ yaml, probes }))), encoding: "utf8", env: process.env });
assert.equal(rulePy.status, 0, rulePy.stderr);
const ruleExpected = JSON.parse(rulePy.stdout);
const ruleN = (r, phase, n) => String(phase === "agent-phase-2" ? r.phase2 : phase === "agent-phase-3" ? r.phase3 : (r.bounds.find(([bound]) => BigInt(n) < bound)?.[1] ?? r.otherwise));
ok(`N rule parity with settings.phase_rule_n: ${ruleCases.length} yaml cases x ${probes.length} probes, exact error text`, () => {
  ruleCases.forEach(([name, yaml, error], i) => {
    let actual; try { const r = store.phaseRuleOf(yaml); actual = { n: probes.map(([p, n]) => ruleN(r, p, n)) }; } catch (e) { actual = { error: e.message }; }
    assert.deepEqual(actual, ruleExpected[i], name);
    if (error !== undefined) assert.equal(actual.error, error, name);
  });
});
ok("N rule sentence from yaml values: real-shaped block, custom numbers in bound order, one bound", () => {
  const text = (yaml) => store.phaseRuleText(store.phaseRuleOf(yaml));
  assert.equal(text(rule()), "Phase rule (config/translator-models.yaml, update.phase_rule): N = 3 in phase 2, N = 2 in phase 3. In phase 4, N = 2 below 100 total book pages, 3 below 200, otherwise 5. A saved N overrides this rule in every phase.");
  assert.equal(text(rule("7", "4", ["300: 6", "otherwise: 9", "50: 1"])), "Phase rule (config/translator-models.yaml, update.phase_rule): N = 7 in phase 2, N = 4 in phase 3. In phase 4, N = 1 below 50 total book pages, 6 below 300, otherwise 9. A saved N overrides this rule in every phase.");
  assert.equal(text(rule("2", "2", ["150: 2", "otherwise: 4"])), "Phase rule (config/translator-models.yaml, update.phase_rule): N = 2 in phase 2, N = 2 in phase 3. In phase 4, N = 2 below 150 total book pages, otherwise 4. A saved N overrides this rule in every phase.");
  assert.equal(text(rule("007", "2", ["0100: 2", "otherwise: 5"])), "Phase rule (config/translator-models.yaml, update.phase_rule): N = 7 in phase 2, N = 2 in phase 3. In phase 4, N = 2 below 100 total book pages, otherwise 5. A saved N overrides this rule in every phase.");
});
ok("no numeric copy of the N rule in Viewer code", () => {
  const files = []; const walk = (dir) => { for (const e of fsSync.readdirSync(path.join(app, dir), { withFileTypes: true })) { const rel = path.join(dir, e.name); if (e.isDirectory()) walk(rel); else if (/\.(ts|tsx)$/.test(e.name)) files.push(rel); } };
  for (const dir of ["lib", "components", "app"]) walk(dir);
  assert.ok(files.includes("lib/settings-run.ts") && files.includes("components/RunSettingsForm.tsx"));
  const own = ["lib/settings-run.ts", "lib/settings-schema.ts", "lib/settings-json.ts", "components/RunSettingsForm.tsx", "app/settings/run/page.tsx", "app/api/settings/run/route.ts"];
  for (const rel of files) {
    const text = fsSync.readFileSync(path.join(app, rel), "utf8");
    // The whole app: no part of the old fixed sentence. The panel files: no N rule number in any form.
    assert.doesNotMatch(text, /total book pages, \d|\bN = \d+ in phase|In phase 4, N = \d|instead of saving \d/, rel);
    if (own.includes(rel)) assert.doesNotMatch(text, /\bN = \d|\d+ below \d+|otherwise \d|saving \d|agent-phase-[234]["']?\s*:\s*\d/, rel);
  }
  assert.equal(files.filter((f) => own.includes(f)).length, own.length);
  assert.ok(!Object.hasOwn(schema, "N_RULE"));
});
const request = (host = "127.0.0.1:3217", origin, body = {}) => new Request("http://127.0.0.1:3217/api/settings/run", { method: "PUT", headers: { ...(host === null ? {} : { host }), ...(origin === undefined ? {} : { origin }), "content-type": "application/json" }, body: JSON.stringify(body) });
ok("loopback Host and same-origin contract", () => {
  for (const host of ["localhost", "localhost:3217", "127.0.0.1", "127.0.0.1:3217", "[::1]", "[::1]:3217"]) assert.equal(localWriteProblem(request(host, "http://" + host)), null, host);
  for (const host of [null, "example.com", "192.168.1.2", "localhost.evil", "127.1", "2130706433", "127.0.0.1@evil", "localhost:0", "localhost:65536", "localhost:", "localhost:3217,evil", "[::ffff:127.0.0.1]"]) assert.ok(localWriteProblem(request(host)), host);
  for (const origin of ["null", "http://evil.test", "junk", "http://127.0.0.1:3217/evil"]) assert.equal(localWriteProblem(request(undefined, origin)), "Foreign origin.");
  const spoof = request("evil.test"); spoof.headers.set("x-forwarded-host", "localhost"); assert.ok(localWriteProblem(spoof));
});
await check("settings and both pause routes refuse foreign/missing Host before any write", async () => {
  for (const host of [null, "evil.test"]) {
    assert.equal((await route.PUT(request(host))).status, 403);
    assert.equal((await listPause.POST(request(host))).status, 403);
    assert.equal((await handleBookAction(request(host), Promise.resolve({ slug: "paired-dataset" }), "pause")).status, 403);
    assert.equal((await handleClearMark(request(host), Promise.resolve({ slug: "paired-dataset" }))).status, 403);
  }
  assert.equal((await route.PUT(request())).status, 400);
  const r = request(); r.headers.set("content-type", "text/plain"); assert.equal((await route.PUT(r)).status, 415);
});
const file = path.join(config, "translator-settings.json");
const historyFile = path.join(config, "translator-settings.history.jsonl");
await check("N stays absent on load and a non-N save", async () => {
  const s = await store.readSettings(); assert.equal(s.error, null); assert.equal(s.exists, false); assert.ok(!Object.hasOwn(s.overrides, "update.N")); assert.equal(s.models.length, 5);
  const next = await route.PUT(request(undefined, undefined, { sha1: null, settings: { run: { jobs: 2 } } })); assert.equal(next.status, 200, await next.clone().text());
  const d = JSON.parse(await fs.readFile(file, "utf8")); assert.ok(!d.update); assert.equal(d.revision, 1); assert.equal(d.run.jobs, 2);
  assert.ok(!(await fs.readdir(config)).some((n) => n.endsWith(".part")));
});
await check("atomic replacement, N override/reset, revision, SHA1 and one history line per save", async () => {
  const old = await fs.stat(file); let s = await store.readSettings(); const oldHash = s.sha1;
  s = await store.saveSettings({ update: { N: 7 }, run: { jobs: 2 } }, s.sha1); assert.equal(s.revision, 2); assert.equal(s.overrides["update.N"], 7);
  assert.notEqual((await fs.stat(file)).ino, old.ino); assert.equal(s.sha1, createHash("sha1").update(await fs.readFile(file)).digest("hex"));
  s = await store.saveSettings({ run: { jobs: 2 } }, s.sha1); assert.equal(s.revision, 3); assert.ok(!JSON.parse(await fs.readFile(file, "utf8")).update);
  const lines = (await fs.readFile(historyFile, "utf8")).trim().split("\n").map(JSON.parse); assert.equal(lines.length, 3); assert.equal(lines[1].sha1_before, oldHash); assert.equal(lines[2].changes[0].key, "update.N"); assert.equal(lines[2].changes[0].new_present, false);
});
await check("stale SHA1, simultaneous save and malformed proposal fail without overwrite", async () => {
  const before = await fs.readFile(file, "utf8");
  assert.equal((await route.PUT(request(undefined, undefined, { sha1: null, settings: { update: { N: 3 } } }))).status, 409);
  assert.equal(await fs.readFile(file, "utf8"), before);
  const s = await store.readSettings();
  const results = await Promise.allSettled([store.saveSettings({ update: { N: 3 } }, s.sha1), store.saveSettings({ update: { N: 4 } }, s.sha1)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const bad = await route.PUT(request(undefined, undefined, { sha1: (await store.readSettings()).sha1, settings: { run: { jobs: true } } })); assert.equal(bad.status, 400); assert.match((await bad.json()).error, /not a whole number from 1 to 8/);
});
for (const failHistory of [false, true]) await check(`exclusive lock covers the post-rename history ${failHistory ? "failure" : "completion"} window`, async () => {
  const original = await fs.readFile(file, "utf8"); const historyOriginal = await fs.readFile(historyFile, "utf8");
  const snapshot = await store.readSettings(); const open = fs.open;
  const reached = Promise.withResolvers(); const release = Promise.withResolvers();
  let first; let injected = false;
  fs.open = async (...args) => {
    const handle = await open(...args);
    if (args[0] === historyFile && args[1] === "a" && !injected) {
      injected = true; const write = handle.writeFile.bind(handle);
      handle.writeFile = async (...values) => { reached.resolve(); await release.promise; if (failHistory) throw new Error("Fixture history failure"); return write(...values); };
    }
    return handle;
  };
  try {
    first = outcome(store.saveSettings({ update: { N: 70 } }, snapshot.sha1));
    await reached.promise;
    const renamed = await store.readSettings(); assert.equal(renamed.revision, snapshot.revision + 1); assert.equal(renamed.overrides["update.N"], 70);
    await assert.rejects(fs.lstat(file + ".part"), { code: "ENOENT" });
    const lock = await fs.lstat(file + ".lock"); assert.equal(lock.mode & 0o777, 0o600);
    const second = await outcome(store.saveSettings({ update: { N: 71 } }, renamed.sha1));
    assert.equal(second.status, "rejected"); assert.equal(second.reason.status, 409); assert.match(second.reason.message, /stale lock file/);
    assert.equal((await fs.lstat(file + ".lock")).ino, lock.ino);
    assert.equal(await fs.readFile(historyFile, "utf8"), historyOriginal);
    release.resolve(); const result = await first;
    if (failHistory) { assert.equal(result.status, "rejected"); assert.equal(result.reason.status, 503); assert.equal(result.reason.saved, true); assert.equal(await fs.readFile(historyFile, "utf8"), historyOriginal); }
    else { assert.equal(result.status, "fulfilled"); const records = (await fs.readFile(historyFile, "utf8")).trim().split("\n").map(JSON.parse); assert.equal(records.at(-1).revision, snapshot.revision + 1); assert.equal(records.length, historyOriginal.trim().split("\n").length + 1); }
    await assert.rejects(fs.lstat(file + ".lock"), { code: "ENOENT" });
  } finally { release.resolve(); if (first) await first; fs.open = open; await fs.writeFile(file, original); await fs.writeFile(historyFile, historyOriginal); }
});
await check("a refused save never unlinks the active save's temp or lock", async () => {
  const snapshot = await store.readSettings(); const open = fs.open;
  const reached = Promise.withResolvers(); const release = Promise.withResolvers(); let first; let injected = false;
  fs.open = async (...args) => {
    const handle = await open(...args);
    if (args[0] === file + ".part" && args[1] === "wx" && !injected) {
      injected = true; const write = handle.writeFile.bind(handle);
      handle.writeFile = async (...values) => { reached.resolve(); await release.promise; return write(...values); };
    }
    return handle;
  };
  try {
    first = outcome(store.saveSettings({ update: { N: 72 } }, snapshot.sha1)); await reached.promise;
    const part = await fs.lstat(file + ".part"); const lock = await fs.lstat(file + ".lock");
    const second = await outcome(store.saveSettings({ update: { N: 73 } }, snapshot.sha1));
    assert.equal(second.status, "rejected"); assert.equal(second.reason.status, 409);
    assert.equal((await fs.lstat(file + ".part")).ino, part.ino); assert.equal((await fs.lstat(file + ".lock")).ino, lock.ino);
    release.resolve(); assert.equal((await first).status, "fulfilled");
    for (const suffix of [".part", ".lock"]) await assert.rejects(fs.lstat(file + suffix), { code: "ENOENT" });
  } finally { release.resolve(); if (first) await first; fs.open = open; }
});
await check("post-history cleanup cannot unlink a successor save's temp", async () => {
  const original = await fs.readFile(file, "utf8"); const historyOriginal = await fs.readFile(historyFile, "utf8");
  const snapshot = await store.readSettings(); const open = fs.open;
  const closing = Promise.withResolvers(); const releaseClose = Promise.withResolvers(); const successorTemp = Promise.withResolvers(); const releaseTemp = Promise.withResolvers();
  let first; let second; let historyOpens = 0; let tempOpens = 0;
  fs.open = async (...args) => {
    const handle = await open(...args);
    if (args[0] === historyFile && args[1] === "a" && ++historyOpens === 1) {
      const close = handle.close.bind(handle); handle.close = async () => { closing.resolve(); await releaseClose.promise; return close(); };
    }
    if (args[0] === file + ".part" && args[1] === "wx" && ++tempOpens === 2) {
      const write = handle.writeFile.bind(handle); handle.writeFile = async (...values) => { successorTemp.resolve(); await releaseTemp.promise; return write(...values); };
    }
    return handle;
  };
  try {
    first = outcome(store.saveSettings({ update: { N: 74 } }, snapshot.sha1)); await closing.promise;
    second = outcome(store.saveSettings({ update: { N: 75 } }, (await store.readSettings()).sha1));
    const stage = await Promise.race([successorTemp.promise.then(() => "temp"), second.then(() => "refused")]);
    const successor = stage === "temp" ? await fs.lstat(file + ".part") : null;
    releaseClose.resolve(); assert.equal((await first).status, "fulfilled");
    // On the old implementation this branch detects the first save's unlink of the second save's inode.
    if (successor) assert.equal((await fs.lstat(file + ".part").catch(() => null))?.ino, successor.ino, "The first save removed the successor save's temp.");
    assert.equal(stage, "refused", "A successor entered before the first save completed cleanup.");
    assert.equal((await second).status, "rejected"); assert.equal((await second).reason.status, 409);
    releaseTemp.resolve();
    const next = await store.saveSettings({ update: { N: 76 } }, (await store.readSettings()).sha1);
    assert.equal(next.revision, snapshot.revision + 2); assert.equal(next.overrides["update.N"], 76);
    const records = (await fs.readFile(historyFile, "utf8")).trim().split("\n").map(JSON.parse);
    assert.deepEqual(records.slice(-2).map((r) => r.revision), [snapshot.revision + 1, snapshot.revision + 2]);
  } finally { releaseClose.resolve(); releaseTemp.resolve(); if (first) await first; if (second) await second; fs.open = open; await fs.writeFile(file, original); await fs.writeFile(historyFile, historyOriginal); }
});
await check("stale lock/temp files block save without deletion and name manual recovery", async () => {
  const snapshot = await store.readSettings(); const original = await fs.readFile(file, "utf8"); const historyOriginal = await fs.readFile(historyFile, "utf8");
  for (const suffix of [".lock", ".part"]) {
    const stale = file + suffix; const sentinel = "Stale fixture " + suffix; await fs.writeFile(stale, sentinel, { flag: "wx" }); const stat = await fs.lstat(stale);
    try {
      await assert.rejects(store.saveSettings({ update: { N: 77 } }, snapshot.sha1), (e) => e.status === 409 && e.message.includes(stale) && /remove the stale file by hand/.test(e.message));
      assert.equal(await fs.readFile(stale, "utf8"), sentinel); assert.equal((await fs.lstat(stale)).ino, stat.ino);
      assert.equal(await fs.readFile(file, "utf8"), original); assert.equal(await fs.readFile(historyFile, "utf8"), historyOriginal);
      if (suffix === ".part") await assert.rejects(fs.lstat(file + ".lock"), { code: "ENOENT" });
    } finally { await fs.unlink(stale); }
  }
});
await check("cleanup leaves replacement temp/lock inodes owned by another writer untouched", async () => {
  const snapshot = await store.readSettings(); const original = await fs.readFile(file, "utf8"); const historyOriginal = await fs.readFile(historyFile, "utf8");
  for (const suffix of [".part", ".lock"]) {
    const open = fs.open; const reached = Promise.withResolvers(); const release = Promise.withResolvers(); let first;
    const replaced = file + suffix; const moved = path.join(fixture, "owned" + suffix); let replacement;
    fs.open = async (...args) => {
      const handle = await open(...args);
      if (args[0] === file + ".part" && args[1] === "wx") handle.writeFile = async () => { reached.resolve(); await release.promise; throw new Error("Fixture failure before replacement"); };
      return handle;
    };
    try {
      first = outcome(store.saveSettings({ update: { N: 78 } }, snapshot.sha1)); await reached.promise;
      await fs.rename(replaced, moved); await fs.writeFile(replaced, "Another writer owns this inode.", { flag: "wx" }); replacement = await fs.lstat(replaced);
      release.resolve(); const result = await first; assert.equal(result.status, "rejected"); assert.match(result.reason.message, /Fixture failure before replacement/);
      assert.equal((await fs.lstat(replaced)).ino, replacement.ino); assert.equal(await fs.readFile(replaced, "utf8"), "Another writer owns this inode.");
      assert.equal(await fs.readFile(file, "utf8"), original); assert.equal(await fs.readFile(historyFile, "utf8"), historyOriginal);
    } finally { release.resolve(); if (first) await first; fs.open = open; if (replacement) await fs.unlink(replaced); await fs.unlink(moved).catch((e) => { if (e.code !== "ENOENT") throw e; }); }
  }
});
await check("unknown or malformed existing file blocks replacement and stays untouched", async () => {
  const original = await fs.readFile(file, "utf8");
  for (const raw of ['{"mystery":42}', '{"run":{"jobs":true}}', '{"update":', '[]']) {
    await fs.writeFile(file, raw); const s = await store.readSettings(); assert.ok(s.error);
    const hash = createHash("sha1").update(raw).digest("hex");
    const r = await route.PUT(request(undefined, undefined, { sha1: hash, settings: { update: { N: 3 } } })); assert.equal(r.status, 400); assert.equal(await fs.readFile(file, "utf8"), raw);
  }
  await fs.writeFile(file, original);
});
await check("last 20 history entries and download route", async () => {
  let s = await store.readSettings();
  for (let i = 0; i < 22; i++) s = await store.saveSettings({ update: { N: 10 + i } }, s.sha1);
  assert.equal(s.history.length, 20); assert.equal(s.history[0].revision, s.revision); assert.equal(s.history.at(-1).revision, s.revision - 19);
  const r = await route.GET(new Request("http://localhost/api/settings/run?history=1")); assert.equal(r.status, 200); assert.match(r.headers.get("content-disposition"), /translator-settings.history.jsonl/); assert.equal((await r.text()).trim().split("\n").length, s.revision);
});
await check("large integers, float types and malformed JSON survive every file/API boundary exactly", async () => {
  const original = await fs.readFile(file, "utf8"); const historyOriginal = await fs.readFile(historyFile, "utf8");
  const raw = '{"revision":9007199254740993,"update":{"N":9007199254740993},"run":{"max_usd_per_page":1.0}}';
  await fs.writeFile(file, raw); const s = await store.readSettings(); assert.equal(s.error, null);
  assert.equal(String(s.overrides["update.N"]), "9007199254740993");
  const proposal = parseSettingsJson('{"update":{"N":9007199254740993},"run":{"max_usd_per_page":1.0,"jobs":2}}');
  const response = await route.PUT(new Request("http://127.0.0.1:3217/api/settings/run", { method: "PUT", headers: { host: "127.0.0.1:3217", "content-type": "application/json" }, body: stringifySettingsJson({ sha1: s.sha1, settings: proposal }) }));
  assert.equal(response.status, 200, await response.clone().text()); const text = await response.text();
  assert.match(text, /"revision":9007199254740994/); assert.match(text, /"update.N":9007199254740993/); assert.match(text, /"run.max_usd_per_page":1.0/);
  assert.match(await fs.readFile(file, "utf8"), /"N": 9007199254740993/); assert.match(await fs.readFile(historyFile, "utf8"), /"revision":9007199254740994/);
  await fs.writeFile(file, '{"update":'); assert.equal((await store.readSettings()).error, "translator-settings.json: the file is not valid JSON (Expecting value: line 1 column 11 (char 10))");
  await fs.writeFile(file, original); await fs.writeFile(historyFile, historyOriginal);
});
await check("history append failure reports a partial save, not false success", async () => {
  const original = await fs.readFile(file, "utf8"); const historyOriginal = await fs.readFile(historyFile, "utf8");
  const s = await store.readSettings(); const open = fs.open;
  fs.open = async (...args) => { const handle = await open(...args); if (args[0] === historyFile && args[1] === "a") handle.writeFile = async () => { throw new Error("Fixture history failure"); }; return handle; };
  try {
    const r = await route.PUT(request(undefined, undefined, { sha1: s.sha1, settings: { update: { N: 42 } } }));
    assert.equal(r.status, 503); assert.equal((await r.json()).saved, true); assert.equal(JSON.parse(await fs.readFile(file, "utf8")).update.N, 42); assert.equal(await fs.readFile(historyFile, "utf8"), historyOriginal);
  } finally { fs.open = open; await fs.writeFile(file, original); }
});
await check("fixed-file allowlist and symlink refusal", async () => {
  await assert.rejects(settingsFile(config, "../translator-models.yaml"));
  const linked = path.join(fixture, "linked"); await fs.mkdir(linked); await fs.symlink(file, path.join(linked, "translator-settings.json")); await assert.rejects(settingsFile(linked, "translator-settings.json"));
});
await check("paired-dataset full page IDs and current-page old-N message", async () => {
  const book = path.join(data, "book-store/paired-dataset"); await fs.mkdir(book, { recursive: true });
  await fs.writeFile(path.join(book, "status.json"), JSON.stringify({ state: "running", pid: process.pid, heartbeat_utc: new Date().toISOString(), running_page: "94380515_p003", next_page: "94380515_p004", update_n: 3 }));
  const s = await store.readSettings(); assert.deepEqual(s.active, [{ book: "paired-dataset", page: "94380515_p003", next: "94380515_p004", n: 3 }]);
  const form = await fs.readFile(path.join(app, "components/RunSettingsForm.tsx"), "utf8"); assert.match(form, /\{OLD_N\}/); assert.match(schema.OLD_N, /after the current page keeps its old N/); assert.match(form, /next list or book start/); assert.match(form, /No active run exists/);
  assert.match(form, /delete next\[f.key\]/); assert.match(form, /delete next\["update.N"\]/); assert.match(form, /setDraft\(next.overrides\)/);
});
await check("monitor off gives 404 for read, save and both pause routes", async () => {
  process.env.VIEWER_MONITOR = "off";
  assert.equal((await route.GET(new Request("http://localhost/api/settings/run"))).status, 404); assert.equal((await route.PUT(request())).status, 404); assert.equal((await listPause.POST(request())).status, 404); assert.equal((await handleBookAction(request(), Promise.resolve({ slug: "paired-dataset" }), "pause")).status, 404);
  process.env.VIEWER_MONITOR = "on";
});
await check("panel reads update.phase_rule: custom numbers, broken rule shows its error and no numbers, save still works", async () => {
  const yamlFile = path.join(config, "translator-models.yaml"); const yamlOriginal = await fs.readFile(yamlFile, "utf8");
  const original = await fs.readFile(file, "utf8"); const historyOriginal = await fs.readFile(historyFile, "utf8");
  // Replace only the phase_rule block of the copied Translator yaml. The rest of the file stays real.
  const withRule = (block) => { const lines = yamlOriginal.split("\n"); const i = lines.indexOf("  phase_rule:"); assert.ok(i > 0, "update.phase_rule in the fixture yaml"); let j = i + 1; while (j < lines.length && /^ {4,}\S/.test(lines[j])) j++; return [...lines.slice(0, i), ...block, ...lines.slice(j)].join("\n"); };
  try {
    let s = await store.readSettings(); assert.equal(s.error, null); assert.equal(s.n_rule_error, null); assert.match(s.n_rule, /^Phase rule \(config\/translator-models.yaml, update.phase_rule\): N = \d+ in phase 2/);
    await fs.writeFile(yamlFile, withRule(["  phase_rule:", "    agent-phase-2: 7", "    agent-phase-3: 4", "    agent-phase-4:", "      300: 6", "      50: 1", "      otherwise: 9"]));
    s = await store.readSettings(); assert.equal(s.error, null); assert.equal(s.n_rule_error, null);
    assert.equal(s.n_rule, "Phase rule (config/translator-models.yaml, update.phase_rule): N = 7 in phase 2, N = 4 in phase 3. In phase 4, N = 1 below 50 total book pages, 6 below 300, otherwise 9. A saved N overrides this rule in every phase.");
    for (const [block, error] of [[[], "missing or invalid rule. Expected agent-phase-2, agent-phase-3, agent-phase-4"], [["  phase_rule:", "    agent-phase-2: 0", "    agent-phase-3: 2", "    agent-phase-4:", "      100: 2", "      200: 3", "      otherwise: 5"], "expected a positive whole number, not '0'"]]) {
      await fs.writeFile(yamlFile, withRule(block));
      s = await store.readSettings(); assert.equal(s.error, null); assert.equal(s.n_rule, null); assert.equal(s.n_rule_error, P + error);
      assert.doesNotMatch(s.n_rule_error.replace(/agent-phase-\d/g, "phase name"), /\b(2|3|5|100|200)\b/);
      const r = await route.PUT(request(undefined, undefined, { sha1: s.sha1, settings: { update: { N: 9 } } })); assert.equal(r.status, 200, await r.clone().text());
      const next = parseSettingsJson(await r.text()); assert.equal(next.overrides["update.N"], 9); assert.equal(next.n_rule, null); assert.equal(next.n_rule_error, P + error);
      await fs.writeFile(file, original); await fs.writeFile(historyFile, historyOriginal);
    }
    await fs.writeFile(yamlFile, "- a list line\n");
    s = await store.readSettings(); assert.equal(s.error, "translator-models.yaml: unsupported mapping syntax."); assert.equal(s.n_rule, null); assert.equal(s.n_rule_error, s.error);
    const form = await fs.readFile(path.join(app, "components/RunSettingsForm.tsx"), "utf8");
    assert.match(form, /saved\.n_rule \?\? <span className="text-red-700">\{saved\.n_rule_error\}<\/span>/); assert.match(form, /\{saved\.n_rule_error && <div role="alert"/); assert.match(form, /\{N_RULE_STOP\}/);
    assert.match(schema.N_RULE_STOP, /stops each book at its next start, before any page/);
  } finally { await fs.writeFile(yamlFile, yamlOriginal); await fs.writeFile(file, original); await fs.writeFile(historyFile, historyOriginal); }
});
const nav = await fs.readFile(path.join(app, "components/Nav.tsx"), "utf8");
ok("navigation expectations include Run settings and monitor visibility", () => { assert.match(nav, /href: "\/settings\/run", label: "Run settings", monitor: true/); });
await fs.writeFile(path.join(u, "logs/latest-fixture.txt"), fixture + "\n");
console.log(`VW77d contracts: ${count} checks PASS; fixture ${fixture}`);
// Keep the status fresh for the owner's later fixture screenshot, without a false active process.
await fs.writeFile(path.join(data, "book-store/paired-dataset/status.json"), JSON.stringify({ state: "stopped", running_page: null }));
