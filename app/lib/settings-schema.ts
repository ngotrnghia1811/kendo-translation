import { JsonFloat, JsonInteger, pythonJson } from "./settings-json";

export const SCHEMA = "translator-settings-v1";
export type Scalar = string | number | boolean | null | JsonInteger | JsonFloat;
export type FlatSettings = Record<string, Scalar>;
export const GROUPS = ["N", "Model and effort per level", "Box critic model", "Cost limit per page", "Jobs and book jobs", "Critic mode", "Memory and link constants", "Call timeout and retries"];
export const N_RULE_STOP = "The Translator stops each book at its next start, before any page, until you correct update.phase_rule in config/translator-models.yaml. A saved N does not prevent this stop.";
export const OLD_N = "The update point after the current page keeps its old N.";
export const MODEL_WARNING = "The Viewer cannot check this ID. A wrong ID stops the page at the start with CONFIG ERROR.";
export const CONFLICT = "The file changed since you opened this page. Reload and check your changes.";
export type Field = { key: string; label: string; meaning: string; group: number; kind: "integer" | "model" | "variant" | "cost" | "boolean" | "mode"; allowed: string; unit: string; min?: number; max?: number };
const field = (key: string, label: string, meaning: string, group: number, kind: Field["kind"], allowed: string, unit = "none", min?: number, max?: number): Field => ({ key, label, meaning, group, kind, allowed, unit, min, max });
export const FIELDS: Field[] = [
  field("update.N", "N", "Critiques of one box type that start a prompt rewrite.", 0, "integer", "Whole number, 1 or more", "critiques", 1),
  ...[0, 1, 2, 3].flatMap((lv) => [
    field(`levels.${lv}.model`, `Level ${lv} model`, "Model of the four boxes of this level.", 1, "model", "provider/model ID"),
    field(`levels.${lv}.variant`, `Level ${lv} effort`, "Effort of the four boxes of this level.", 1, "variant", "Letters, digits, underscore, dot or hyphen"),
  ]),
  field("box_critic.model", "Box critic model", "Model of the critic that reads each box.", 2, "model", "provider/model ID"),
  field("box_critic.variant", "Box critic effort", "Effort of the critic that reads each box.", 2, "variant", "Letters, digits, underscore, dot or hyphen"),
  field("run.max_usd_per_page", "Cost limit per page", 'A page stops with "cost guard" when its cost reaches this limit.', 3, "cost", "Empty for no limit, or a number above 0", "USD"),
  field("run.jobs", "Calls in parallel", "Calls in parallel inside one page.", 4, "integer", "Whole number from 1 to 8", "calls", 1, 8),
  field("run.book_jobs", "Books in parallel", "Books that run in parallel.", 4, "integer", "Whole number from 1 to 8", "books", 1, 8),
  field("run.critic_mode", "Critic mode", "Separate: one critic session per box. Session: one critic session per page. A resume must use the stored mode.", 5, "mode", "separate or session"),
  field("memory.memory_k", "Memory pairs", "Book translation memory pairs for one box.", 6, "integer", "Whole number from 1 to 10", "pairs", 1, 10),
  field("memory.join_page_end", "Join across the page end", "Join a memory pair across the page end.", 6, "boolean", "true or false"),
  field("memory.join_across_title", "Join across a title", "Join a memory pair across a title.", 6, "boolean", "true or false"),
  field("links.neighbor_skip_cites", "Cited items before a skip", "Cited items that skip the neighbor link. Zero turns this off.", 6, "integer", "Whole number, 0 or more", "cited items", 0),
  field("links.window_lines", "Neighbor window", "Lines of the neighbor window.", 6, "integer", "Whole number, 0 or more", "lines", 0),
  field("calls.call_timeout_s", "Call timeout", "Seconds before one call times out.", 7, "integer", "Whole number from 60 to 7200", "seconds", 60, 7200),
  field("calls.max_attempts", "Call attempts", "Maximum attempts for one call.", 7, "integer", "Whole number from 1 to 5", "attempts", 1, 5),
];
export const KEY_ORDER = FIELDS.map((f) => f.key);
export const BOOK_KEYS = ["run.jobs", "run.book_jobs", "run.critic_mode"];
export function effect(key: string) { return BOOK_KEYS.includes(key) ? "Next list or book start" : "Next page"; }
export function object(v: unknown): v is Record<string, unknown> { return v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof JsonFloat) && !(v instanceof JsonInteger); }
const whole = (v: unknown) => (typeof v === "number" && Number.isInteger(v)) || v instanceof JsonInteger;
export function valueError(key: string, v: unknown): string | null {
  let reason = "";
  if (key === "update.N") { if (!whole(v) || (v as number) < 1) reason = "not a whole number of 1 or more"; }
  else if (key.endsWith(".model")) { if (typeof v !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.:@-]+(\/[A-Za-z0-9_.:@-]+)*$/.test(v.replace(/\n$/, ""))) reason = "not a provider/model ID"; }
  else if (key.endsWith(".variant")) { if (typeof v !== "string" || !/^[A-Za-z0-9_.-]+$/.test(v.replace(/\n$/, ""))) reason = "not a variant name"; }
  else if (key === "run.max_usd_per_page") { if (v !== null && (!(typeof v === "number" || v instanceof JsonFloat || v instanceof JsonInteger) || Number(v instanceof JsonFloat ? v.value : v) <= 0)) reason = "not null and not a number above 0"; }
  else if (["run.jobs", "run.book_jobs"].includes(key)) { if (!whole(v) || (v as number) < 1 || (v as number) > 8) reason = "not a whole number from 1 to 8"; }
  else if (key === "run.critic_mode") { if (v !== "separate" && v !== "session") reason = "not one of separate, session"; }
  else if (key === "memory.memory_k") { if (!whole(v) || (v as number) < 1 || (v as number) > 10) reason = "not a whole number from 1 to 10"; }
  else if (["memory.join_page_end", "memory.join_across_title"].includes(key)) { if (typeof v !== "boolean") reason = "not true or false"; }
  else if (["links.neighbor_skip_cites", "links.window_lines"].includes(key)) { if (!whole(v) || (v as number) < 0) reason = "not a whole number of 0 or more"; }
  else if (key === "calls.call_timeout_s") { if (!whole(v) || (v as number) < 60 || (v as number) > 7200) reason = "not a whole number of seconds from 60 to 7200"; }
  else if (key === "calls.max_attempts") { if (!whole(v) || (v as number) < 1 || (v as number) > 5) reason = "not a whole number from 1 to 5"; }
  else return `translator-settings.json: unknown key ${key}`;
  return reason ? `translator-settings.json: ${key} is ${pythonJson(v)}, ${reason}` : null;
}

/** Port of settings.py flatten/check_value. Parity tests use the actual Python functions. */
export function validateSettings(doc: unknown): FlatSettings {
  const fail = (s: string): never => { throw new Error("translator-settings.json: " + s); };
  if (!object(doc)) return fail("the file must hold one JSON object");
  const groups: Record<string, string[]> = { update: ["N"], levels: ["0", "1", "2", "3"], box_critic: ["model", "variant"], run: ["max_usd_per_page", "jobs", "book_jobs", "critic_mode"], memory: ["memory_k", "join_page_end", "join_across_title"], links: ["neighbor_skip_cites", "window_lines"], calls: ["call_timeout_s", "max_attempts"] };
  const flat: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (["schema", "revision", "updated_utc"].includes(k)) continue;
    if (!Object.hasOwn(groups, k)) fail("unknown key " + k);
    if (!object(v)) fail(k + " must hold an object");
    for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
      if (!groups[k].includes(k2)) fail(`unknown key ${k}.${k2}`);
      if (k === "levels") {
        if (!object(v2)) fail(`levels.${k2} must hold an object`);
        for (const [k3, v3] of Object.entries(v2 as Record<string, unknown>)) {
          if (!["model", "variant"].includes(k3)) fail(`unknown key levels.${k2}.${k3}`);
          flat[`levels.${k2}.${k3}`] = v3;
        }
      } else flat[`${k}.${k2}`] = v2;
    }
  }
  if (doc.schema != null && doc.schema !== SCHEMA) fail(`schema is ${pythonJson(doc.schema, true)}, not ${SCHEMA}`);
  if (doc.revision != null && (!whole(doc.revision) || (doc.revision as number) < 0)) fail(`revision is ${pythonJson(doc.revision, true)}, not a whole number of 0 or more`);
  for (const [k, v] of Object.entries(flat)) { const e = valueError(k, v); if (e) throw new Error(e); }
  return flat as FlatSettings;
}
export function nestSettings(flat: FlatSettings): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  for (const key of KEY_ORDER) {
    if (!Object.hasOwn(flat, key)) continue;
    const parts = key.split("."); let node = doc;
    for (const p of parts.slice(0, -1)) { node[p] ??= {}; node = node[p] as Record<string, unknown>; }
    node[parts.at(-1)!] = flat[key];
  }
  return doc;
}
export function diffSettings(before: FlatSettings, after: FlatSettings) {
  return KEY_ORDER.filter((k) => Object.hasOwn(before, k) !== Object.hasOwn(after, k) || (Object.hasOwn(before, k) && pythonJson(before[k]) !== pythonJson(after[k])))
    .map((key) => ({ key, old: before[key] ?? null, new: after[key] ?? null, old_present: Object.hasOwn(before, key), new_present: Object.hasOwn(after, key), effect: effect(key) }));
}
export function showValue(v: Scalar | undefined, key?: string): string {
  return v === undefined ? key === "update.N" ? "Phase rule (no override)" : "Default (no override)" : v === null ? "No limit" : String(v);
}
