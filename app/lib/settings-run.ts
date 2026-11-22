import "server-only";
import { promises as fs } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadConfig } from "./config";
import { settingsFile, resolveInside, isSafeSegment } from "./safe-path";
import { incrementInteger, parseSettingsJson, stringifySettingsJson, type JsonInteger } from "./settings-json";
import { CONFLICT, KEY_ORDER, SCHEMA, diffSettings, nestSettings, object, validateSettings, type FlatSettings } from "./settings-schema";
import { readOc2Block } from "./oc2-models"; // unit VW125
import type { Oc2Block } from "./oc2-models-rules"; // unit VW125

export type ActiveBook = { book: string; page: string | null; next: string | null; n: number | null };
export type Change = ReturnType<typeof diffSettings>[number];
export type SettingsHistory = { utc: string; revision: number | JsonInteger; changes: Change[]; sha1_before: string | null; sha1_after: string };
export type SettingsSnapshot = { sha1: string | null; revision: number | JsonInteger; updated_utc: string | null; exists: boolean; overrides: FlatSettings; defaults: FlatSettings; models: string[]; variants: string[]; active: ActiveBook[]; history: SettingsHistory[]; error: string | null; n_rule: string | null; n_rule_error: string | null;
  /** Unit VW125 (Q-A 3:118.2 rows 1, 2, 4): the list of all oc2 models for the picker (data/oc2-models.json). `models` (the yaml models) stays for the picker fallback. */
  oc2: Oc2Block };
export class SettingsWriteError extends Error {
  status: number; saved: boolean;
  constructor(status: number, message: string, saved = false) { super(message); this.status = status; this.saved = saved; }
}
const hash = (text: string) => createHash("sha1").update(text).digest("hex");
const enoent = (e: unknown) => (e as NodeJS.ErrnoException).code === "ENOENT";
async function readOrNull(file: string) { try { return await fs.readFile(file, "utf8"); } catch (e) { if (enoent(e)) return null; throw e; } }

/** A YAML mapping. Map keeps the key order of the file, as a Python dict does. */
type YamlMap = Map<string, YamlMap | string>;
/** Same mapping-only YAML subset as Translator config.py parse_yaml. No new package. */
function yamlValues(text: string): { flat: Record<string, string>; tree: YamlMap } {
  const out: Record<string, string> = {}; const tree: YamlMap = new Map(); const stack: { indent: number; key: string; node: YamlMap }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    const m = /^( *)([A-Za-z0-9_.-]+):(?:\s+(.*))?$/.exec(raw);
    if (!m) throw new Error("translator-models.yaml: unsupported mapping syntax.");
    const indent = m[1].length;
    while (stack.length && stack.at(-1)!.indent >= indent) stack.pop();
    const key = [...stack.map((s) => s.key), m[2]].join(".");
    const parent = stack.at(-1)?.node ?? tree;
    // As in parse_yaml, no value, blank space or a comment opens a mapping.
    if (m[3] === undefined || !m[3].trim() || m[3].trim().startsWith("#")) { const node: YamlMap = new Map(); parent.set(m[2], node); stack.push({ indent, key: m[2], node }); continue; }
    let value = m[3].trim();
    if (value.startsWith('"')) { const q = /^"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/.exec(value); if (!q) throw new Error("translator-models.yaml: broken quoted value."); value = JSON.parse('"' + q[1] + '"'); }
    else if (value.startsWith("'")) { const q = /^'([^']*)'\s*(?:#.*)?$/.exec(value); if (!q) throw new Error("translator-models.yaml: broken quoted value."); value = q[1]; }
    else value = value.split(" #")[0].trim();
    out[key] = value; parent.set(m[2], value);
  }
  return { flat: out, tree };
}

/** Python repr of a parse_yaml value (str or dict), for the %r of the Translator error text. */
const PY_HIDDEN = new RegExp("[\\p{Cc}\\p{Cf}\\p{Cs}\\p{Co}\\p{Cn}\\p{Z}]", "u");
function pyRepr(v: YamlMap | string): string {
  if (v instanceof Map) return "{" + [...v].map(([k, x]) => pyRepr(k) + ": " + pyRepr(x)).join(", ") + "}";
  const q = v.includes("'") && !v.includes('"') ? '"' : "'";
  const hex = (n: number, width: number) => n.toString(16).padStart(width, "0");
  return q + Array.from(v, (c) => {
    if (c === q || c === "\\") return "\\" + c;
    if (c === "\t") return "\\t"; if (c === "\n") return "\\n"; if (c === "\r") return "\\r";
    if (c === " " || !PY_HIDDEN.test(c)) return c;
    const n = c.codePointAt(0)!;
    return n < 0x100 ? "\\x" + hex(n, 2) : n < 0x10000 ? "\\u" + hex(n, 4) : "\\U" + hex(n, 8);
  }).join("") + q;
}
export type PhaseRule = { phase2: bigint; phase3: bigint; bounds: [bigint, bigint][]; otherwise: bigint };
/** Port of the rule checks of settings.phase_rule_n, with the same error text. No rule number lives in Viewer code. */
export function phaseRuleOf(text: string): PhaseRule {
  const prefix = "translator-models.yaml update.phase_rule";
  const phases = ["agent-phase-2", "agent-phase-3", "agent-phase-4"];
  const fail = (s: string): never => { throw new Error(`${prefix}: ${s}`); };
  const positive = (v: YamlMap | string) => typeof v === "string" && /^[0-9]+$/.test(v) && BigInt(v) >= BigInt(1) ? BigInt(v) : fail(`expected a positive whole number, not ${pyRepr(v)}`);
  const update = yamlValues(text).tree.get("update");
  if (!(update instanceof Map)) return fail("missing or invalid update block");
  const rule = update.get("phase_rule");
  if (!(rule instanceof Map) || rule.size !== phases.length || phases.some((p) => !rule.has(p))) return fail(`missing or invalid rule. Expected ${phases.join(", ")}`);
  const phase2 = positive(rule.get(phases[0])!); const phase3 = positive(rule.get(phases[1])!);
  const bands = rule.get(phases[2])!;
  if (!(bands instanceof Map) || !bands.has("otherwise") || bands.size < 2) return fail("phase 4 needs page bounds and otherwise");
  const otherwise = positive(bands.get("otherwise")!);
  const bounds = [...bands].filter(([k]) => k !== "otherwise").map(([k, v]): [bigint, bigint] => [positive(k), positive(v)])
    .sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
  if (new Set(bounds.map(([b]) => b)).size !== bounds.length) fail("duplicate numeric page bound");
  return { phase2, phase3, bounds, otherwise };
}
/** The N rule sentence of the panel. Bounds are exclusive, sorted as the Translator sorts them. */
export function phaseRuleText(r: PhaseRule): string {
  const bands = r.bounds.map(([bound, n], i) => i === 0 ? `N = ${n} below ${bound} total book pages` : `${n} below ${bound}`).join(", ");
  return `Phase rule (config/translator-models.yaml, update.phase_rule): N = ${r.phase2} in phase 2, N = ${r.phase3} in phase 3. In phase 4, ${bands}, otherwise ${r.otherwise}. A saved N overrides this rule in every phase.`;
}
/** A broken rule gives its error text and no numbers. It does not block a save of translator-settings.json. */
async function nRule(root: string): Promise<{ n_rule: string | null; n_rule_error: string | null }> {
  try { return { n_rule: phaseRuleText(phaseRuleOf(await fs.readFile(path.join(root, "translator-models.yaml"), "utf8"))), n_rule_error: null }; }
  catch (e) { return { n_rule: null, n_rule_error: (e as Error).message }; }
}

async function defaultsAndModels(root: string) {
  // These names are read-only and cannot come from the HTTP body.
  const defaults = validateSettings(parseSettingsJson(await fs.readFile(path.join(root, "translator-settings.defaults.json"), "utf8")));
  if (KEY_ORDER.some((k) => !Object.hasOwn(defaults, k))) throw new Error("translator-settings.defaults.json: a default is absent.");
  const yaml = yamlValues(await fs.readFile(path.join(root, "translator-models.yaml"), "utf8")).flat;
  for (const lv of [0, 1, 2, 3]) for (const f of ["model", "variant"]) defaults[`levels.${lv}.${f}`] = yaml[`grid_levels.level_${lv}.${f}`] ?? "";
  for (const f of ["model", "variant"]) defaults[`box_critic.${f}`] = yaml[`outside_grid_agents.box-critic.${f}`] ?? "";
  if (yaml["update.N"] !== undefined) defaults["update.N"] = Number(yaml["update.N"]);
  validateSettings(nestSettings(defaults));
  const models = [...new Set(Object.entries(yaml).filter(([k]) => k.endsWith(".model")).map(([, v]) => v))].sort();
  const variants = [...new Set(Object.entries(yaml).filter(([k]) => k.endsWith(".variant")).map(([, v]) => v))].sort();
  return { defaults, models, variants };
}

async function activeBooks(data: string): Promise<ActiveBook[]> {
  if (!data) return [];
  const out: ActiveBook[] = [];
  let names: string[];
  try { names = await fs.readdir(await resolveInside("book-store", data)); } catch { return []; }
  for (const book of names.sort()) {
    if (!isSafeSegment(book)) continue;
    try {
      const s = JSON.parse(await fs.readFile(await resolveInside(`book-store/${book}/status.json`, data), "utf8"));
      if (s.state !== "running" || !Number.isInteger(s.pid) || s.pid <= 0) continue;
      const age = (Date.now() - Date.parse(s.heartbeat_utc)) / 1000;
      if (!Number.isFinite(age) || age < 0 || age > 120) continue;
      try { process.kill(s.pid, 0); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "EPERM") continue; }
      out.push({ book, page: typeof s.running_page === "string" ? s.running_page : null, next: typeof s.next_page === "string" ? s.next_page : null, n: Number.isInteger(s.update_n) ? s.update_n : null });
    } catch { /* An unreadable status is not evidence of an active page. */ }
  }
  return out;
}

async function current(root: string) {
  const file = await settingsFile(root, "translator-settings.json");
  const raw = await readOrNull(file);
  let doc: Record<string, unknown> = {};
  if (raw !== null) {
    try { doc = parseSettingsJson(raw) as Record<string, unknown>; }
    catch (e) { throw new Error(`translator-settings.json: the file is not valid JSON (${(e as Error).message})`); }
  }
  const overrides = validateSettings(doc);
  return { file, raw, doc, overrides, sha1: raw === null ? null : hash(raw) };
}

export async function settingsHistoryText() {
  const cfg = await loadConfig();
  return (await readOrNull(await settingsFile(cfg.translatorConfigDir, "translator-settings.history.jsonl"))) ?? "";
}

export async function readSettings(): Promise<SettingsSnapshot> {
  const cfg = await loadConfig();
  const snap: SettingsSnapshot = { sha1: null, revision: 0, updated_utc: null, exists: false, overrides: {}, defaults: {}, models: [], variants: [], active: await activeBooks(cfg.translatorDataDir), history: [], error: null, ...(await nRule(cfg.translatorConfigDir)), oc2: await readOc2Block() };
  try {
    Object.assign(snap, await defaultsAndModels(cfg.translatorConfigDir));
    const c = await current(cfg.translatorConfigDir);
    Object.assign(snap, { sha1: c.sha1, revision: c.doc.revision ?? 0, updated_utc: typeof c.doc.updated_utc === "string" ? c.doc.updated_utc : null, exists: c.raw !== null, overrides: c.overrides });
    const history = await settingsHistoryText();
    snap.history = history.trim().split("\n").filter(Boolean).slice(-20).reverse().map((line) => {
      const h = parseSettingsJson(line);
      if (!object(h) || !Array.isArray(h.changes) || typeof h.utc !== "string") throw new Error("translator-settings.history.jsonl: a history record is malformed.");
      return { utc: h.utc, revision: h.revision as number | JsonInteger, sha1_before: h.sha1_before as string | null, sha1_after: String(h.sha1_after), changes: h.changes.filter((c) => object(c) && KEY_ORDER.includes(String(c.key))) as Change[] };
    });
  } catch (e) { snap.error = (e as Error).message; }
  return snap;
}

async function exclusiveSaveFile(file: string, kind: "lock" | "temporary") {
  let handle: FileHandle;
  try { handle = await fs.open(file, "wx", 0o600); }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") throw new SettingsWriteError(409, `Another save or a stale ${kind} file blocks this save (${file}). Reload before you retry. If no save runs, remove the stale file by hand.`);
    throw e;
  }
  try { return { handle, stat: await handle.stat() }; }
  catch (e) { await handle.close(); throw e; }
}

async function releaseSaveFile(file: string, owned: { handle: FileHandle; stat: { dev: number; ino: number } }) {
  await owned.handle.close().catch(() => undefined);
  try {
    const stat = await fs.lstat(file);
    // Never remove a file that replaced this save's file at the same path.
    if (stat.dev === owned.stat.dev && stat.ino === owned.stat.ino) await fs.unlink(file);
  } catch (e) { if (!enoent(e)) throw e; }
}

/** The separate lock stays exclusive through replacement, history and temp cleanup. Stale files block save. */
export async function saveSettings(doc: unknown, expectedSha1: string | null): Promise<SettingsSnapshot> {
  const flat = validateSettings(doc);
  const cfg = await loadConfig();
  const file = await settingsFile(cfg.translatorConfigDir, "translator-settings.json");
  const history = await settingsFile(cfg.translatorConfigDir, "translator-settings.history.jsonl");
  const part = file + ".part";
  const lockPath = file + ".lock";
  const lock = await exclusiveSaveFile(lockPath, "lock");
  try {
    const temp = await exclusiveSaveFile(part, "temporary");
    try {
      // Refuse a malformed or unknown-key existing file, even if the proposed replacement is valid.
      const before = await current(cfg.translatorConfigDir);
      if (before.sha1 !== expectedSha1) throw new SettingsWriteError(409, CONFLICT);
      // A bad history file also blocks save. Never claim a valid history after a silent repair.
      const snapshot = await readSettings();
      if (snapshot.error) throw new SettingsWriteError(400, snapshot.error);
      const changes = diffSettings(before.overrides, flat);
      if (!changes.length) throw new SettingsWriteError(400, "No changes to save.");
      const utc = new Date().toISOString();
      const revision = incrementInteger(before.doc.revision);
      const text = stringifySettingsJson({ schema: SCHEMA, revision, updated_utc: utc, ...nestSettings(flat) }, 1) + "\n";
      const entry: SettingsHistory = { utc, revision, changes, sha1_before: before.sha1, sha1_after: hash(text) };
      // Open history before replacement, so a normal permission error cannot change only the settings.
      const log = await fs.open(history, "a", 0o600);
      try {
        await temp.handle.writeFile(text, "utf8"); await temp.handle.sync(); await temp.handle.close();
        // Detect an outside edit that occurred while the temporary file was written.
        if ((await current(cfg.translatorConfigDir)).sha1 !== expectedSha1) throw new SettingsWriteError(409, CONFLICT);
        await fs.rename(part, file);
        try { await log.writeFile(stringifySettingsJson(entry) + "\n", "utf8"); await log.sync(); }
        catch { throw new SettingsWriteError(503, "The settings file saved, but its history write failed. Reload before any further save.", true); }
      } finally { await log.close(); }
    } finally { await releaseSaveFile(part, temp); }
  } finally { await releaseSaveFile(lockPath, lock); }
  return readSettings();
}
