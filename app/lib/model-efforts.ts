// Unit VW123 (plan P63, card P63.1). Owner pick Q-A 3:116.4 (2026-11-22) "Search list + Thinking menu", row M6: the Thinking menu shows only the efforts of the chosen model.
// The Viewer cannot ask the oc2 server for the effort list of a model (the server answers 401 without a sign-in). So this file holds a small static table.
// Pure file: no server import, no file access. A client component can import it. A new file, because the dev server keeps old module instances (VW77a).
//
// Where the rule comes from (checked in this unit, 2026-11-22):
//   oc2 rule: /Users/nghiango-mbp/projects/opencode-v2-custom/vendor/opencode/packages/core/src/variant.ts
//     l40  EFFORTS = low, medium, high (the generic default of a provider)
//     l68-82  claudeInfo (family, major, minor, manual thinking, always-on thinking)
//     l106-109  openaiResponses: none, minimal, low, medium, high, xhigh (provider package openai, l607)
//     l115-118  openResponses: low, medium, high (provider package xai, l623)
//     l325-355  anthropicMessages: Claude 4.6 gives low, medium, high, max. Manual-thinking Claude (3.7 and 4.x below 4.6, except Opus 4.5) gives high and max (budget variants). Other Claude gives low, medium, high, xhigh, max.
//     l412-416  gemini: low, medium, high (provider package google, l670)
//   A Claude card provider (claude-<8 hex digits>) takes the list from the Claude SDK at run time:
//     /Users/nghiango-mbp/projects/opencode-v2-custom/vendor/opencode/packages/core/src/plugin/provider/claude-agent/provider.ts l114 and l144 (variants = supportedEffortLevels)
//     The widest list is EFFORTS in .../claude-agent/language-model/claude-agent-language-model.ts l105: low, medium, high, xhigh, max.
//   Run side: /Users/nghiango-mbp/git_repo/git_upload/reimplementation-folder/kendo-translation-translator/data/scripts/translator/launcher.py
//     l45 NO_VARIANT_MODELS (the run sends the model alone) and l236-241 model_ref (an empty variant or the text "default" also sends the model alone).
// A real catalog list (supports() in variant.ts l13-22) can be narrower than the defaults above. The Viewer cannot read it. [agent inference]
//
// Spelling rule: the run passes the stored text to oc2, which matches it exactly (model-resolver.ts l26-37: "Variant unavailable for <provider>/<model>: <variant>").
// So the stored text of an effort stays exactly as the table holds it. The label on the screen is only a readable name.

/** The stored text for "no effort chosen". The launcher sends the model alone for this text. */
export const DEFAULT_EFFORT = "default";

/** The generic default of oc2 (variant.ts l40). */
const GENERIC = ["low", "medium", "high"];

/** Models for which the run sends the model alone (launcher.py l45). They have no effort choice. */
// Unit VW125 (Q-A 3:118.2 row 3): exported, because lib/oc2-efforts.ts keeps this run-side rule above the list of oc2.
export const NO_EFFORT_MODELS = new Set(["google/antigravity-gemini-3.8-flash-high", "gemini-web/4-hydrogen"]);

/**
 * Exact rows. devin/grok-4-7 takes only "Low" with a capital letter: the run failed with "Variant unavailable for devin/grok-4-7: low"
 * (owner note Q-A 3:99.2, rows 3:100.4; translator-models.yaml). The Devin provider code is not in the oc2 folders that this unit could read.
 */
const EXACT: Record<string, string[]> = { "devin/grok-4-7": ["Low"] };

/** Claude efforts for a model name such as claude-opus-5-5 (port of claudeInfo l68-82 and anthropicMessages l325-355 of variant.ts). */
export function claudeEfforts(modelName: string): string[] {
  const familyFirst = /(?:claude-)?(opus|sonnet|haiku|fable|mythos)-(\d+)(?:[.-](\d+))?/i.exec(modelName);
  const versionFirst = /claude-(\d+)(?:[.-](\d+))?-(opus|sonnet|haiku|fable|mythos)/i.exec(modelName);
  const family = (familyFirst?.[1] ?? versionFirst?.[3])?.toLowerCase();
  const major = Number(familyFirst?.[2] ?? versionFirst?.[1]);
  const minor = Number(familyFirst?.[3] ?? versionFirst?.[2] ?? 0);
  const manual = (major === 3 && minor === 7) || (major === 4 && minor < 6);
  const opus45 = family === "opus" && major === 4 && minor === 5;
  if (manual && !opus45) return ["high", "max"];
  return major === 4 && minor === 6 ? [...GENERIC, "max"] : [...GENERIC, "xhigh", "max"];
}

const CARD = /^claude-[0-9a-f]{8}$/;

/**
 * The efforts that the Thinking menu offers for a model, in menu order. The text "default" is not in the list: the menu adds it as its first item.
 * `stored` holds the efforts that the settings files store for exactly this model (the form passes them). They count only for a provider that this table cannot rule.
 */
export function effortsOf(model: string, stored: readonly string[] = []): string[] {
  if (NO_EFFORT_MODELS.has(model)) return [];
  if (Object.hasOwn(EXACT, model)) return [...EXACT[model]];
  const slash = model.indexOf("/");
  const provider = slash > 0 ? model.slice(0, slash) : "";
  const name = slash > 0 ? model.slice(slash + 1) : model;
  const own = stored.filter((v) => v !== "" && v !== DEFAULT_EFFORT);
  if (provider === "anthropic" || CARD.test(provider)) return claudeEfforts(name);
  if (provider === "openai") return ["none", "minimal", ...GENERIC, "xhigh"];
  if (provider === "xai" || provider === "google") return [...GENERIC];
  // Devin has no rule that this unit could read: only the stored values count. Any other provider takes the generic oc2 default plus the stored values.
  if (provider === "devin") return [...new Set(own)];
  return [...new Set([...GENERIC, ...own])];
}

const LABELS: Record<string, string> = { none: "None", minimal: "Minimal", low: "Low", medium: "Medium", high: "High", xhigh: "Extra high", max: "Max" };

/** A readable name of an effort. The stored text stays as it is. A text that this table does not know is shown as it is. */
export function effortLabel(value: string): string {
  if (value === DEFAULT_EFFORT) return DEFAULT_EFFORT;
  return LABELS[value.toLowerCase()] ?? value;
}

export type EffortItem = { value: string; label: string; current: boolean; extra: boolean };

/**
 * The menu items for a model and the current stored value.
 * A current value that is not in the list of the model shows first as "<value> (current)" and stays chosen until the person picks another item (row M6).
 * A model with no efforts gives an empty list.
 */
export function effortItems(model: string, current: string | undefined, stored: readonly string[] = []): EffortItem[] {
  const list = effortsOf(model, stored);
  if (list.length === 0) return [];
  const value = current ?? "";
  const items: EffortItem[] = [{ value: DEFAULT_EFFORT, label: DEFAULT_EFFORT, current: value === DEFAULT_EFFORT || value === "", extra: false }];
  const unknown = value !== "" && value !== DEFAULT_EFFORT && !list.includes(value);
  if (unknown) items.unshift({ value, label: `${value} (current)`, current: true, extra: true });
  for (const e of list) items.push({ value: e, label: effortLabel(e), current: e === value, extra: false });
  return items;
}

/**
 * The effort after a model change (row M6): keep the current effort when the new model offers it, else "default".
 * Returns `reset: true` when the effort changed, so the form shows "Effort reset to default for this model".
 * A model with no efforts has an empty list, so any stored effort other than "default" resets (the run sends such a model alone, launcher.py l236-241).
 */
export function effortAfterModelChange(model: string, current: string | undefined, stored: readonly string[] = []): { value: string | undefined; reset: boolean } {
  if (current === undefined || current === "" || current === DEFAULT_EFFORT) return { value: current, reset: false };
  if (effortsOf(model, stored).includes(current)) return { value: current, reset: false };
  return { value: DEFAULT_EFFORT, reset: true };
}
