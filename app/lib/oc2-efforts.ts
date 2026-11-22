// Unit VW125 (plan P66, card P66.1). Q-A 3:118.2 row 3: "The Thinking menu shows the model's own efforts from the list. The static VW123 table is only a fallback for a model that is not in the list."
// Pure rules of the Thinking menu with the list of oc2 (lib/oc2-models-rules.ts). The static table stays in lib/model-efforts.ts and gives the fallback.
// A new file, because the dev server keeps old module instances (VW77a).
//
// Where the efforts of a model come from, in this order:
//   1. "alone": the run sends the model without an effort (launcher.py NO_VARIANT_MODELS). The list can name efforts for it, but the run drops them.
//      The menu keeps "no effort choice" for these models, as in unit VW123 (Q-A 3:116.4). [agent inference: the owner did not decide this case in Q-A 3:118.2]
//   2. "list": the model is in the list of oc2. Its own effort list counts. An empty list gives a menu with the one item "default" (brief of unit VW125, 5.6).
//   3. "table": the model is not in the list. The static table of VW123 counts (the stored efforts and the unknown-provider rule included).
// Spelling: the stored text of an effort is the text of the list, exactly (the run matches it exactly, model-efforts.ts l20-21).
// A name with a space (for example "Low Fast") is shown but cannot be picked: the settings file check and the Translator (settings.py VARIANT_RE) accept letters, digits, underscore, dot and hyphen only.
import { DEFAULT_EFFORT, NO_EFFORT_MODELS, effortItems, effortLabel, effortsOf, type EffortItem } from "./model-efforts";
import type { Catalog } from "./oc2-models-rules";
import { valueError } from "./settings-schema";

export type EffortSource = "alone" | "list" | "table";
export type EffortRow = EffortItem & {
  /** True for an effort name that the settings file cannot store. The menu shows it and does not pick it. */
  blocked: boolean;
};

export const BLOCKED_TEXT = "The settings file stores letters, digits, underscore, dot and hyphen only. This name has another mark, so it cannot be saved.";

/** True when the settings file (and the run) accept the text as an effort name. The same check as the file check (valueError of lib/settings-schema.ts). */
export function effortNameOk(name: string): boolean {
  return valueError("levels.0.variant", name) === null;
}

export function effortSource(model: string, catalog: Catalog | null | undefined): EffortSource {
  if (NO_EFFORT_MODELS.has(model)) return "alone";
  return catalog?.byId.has(model) ? "list" : "table";
}

/** The efforts that the menu offers for a model, in menu order, without "default". */
export function effortsFor(model: string, catalog: Catalog | null | undefined, stored: readonly string[] = []): string[] {
  const source = effortSource(model, catalog);
  if (source === "alone") return [];
  if (source === "list") return [...(catalog?.byId.get(model)?.efforts ?? [])];
  return effortsOf(model, stored);
}

/**
 * The menu items for a model and the current stored value.
 * A current value that the model does not offer shows first as "<value> (current)" and stays chosen until the person picks another item (as in unit VW123).
 * An empty array means "no effort choice" (the model that the run sends alone, or a model that is not in the list and the table gives it no effort).
 */
export function effortItemsFor(model: string, current: string | undefined, catalog: Catalog | null | undefined, stored: readonly string[] = []): EffortRow[] {
  const source = effortSource(model, catalog);
  if (source === "alone") return [];
  const plain = (item: EffortItem): EffortRow => ({ ...item, blocked: !item.extra && item.value !== DEFAULT_EFFORT && !effortNameOk(item.value) });
  if (source === "table") return effortItems(model, current, stored).map(plain);
  const list = effortsFor(model, catalog, stored);
  const value = current ?? "";
  const items: EffortItem[] = [{ value: DEFAULT_EFFORT, label: DEFAULT_EFFORT, current: value === DEFAULT_EFFORT || value === "", extra: false }];
  if (value !== "" && value !== DEFAULT_EFFORT && !list.includes(value)) items.unshift({ value, label: `${value} (current)`, current: true, extra: true });
  for (const e of list) items.push({ value: e, label: effortLabel(e), current: e === value, extra: false });
  return items.map(plain);
}

/**
 * The effort after a model change: keep the current effort when the new model offers it, else "default" (as effortAfterModelChange of lib/model-efforts.ts, with the list).
 * Returns `reset: true` when the effort changed, so the form shows "Effort reset to default for this model".
 */
export function effortAfterModelChangeFor(model: string, current: string | undefined, catalog: Catalog | null | undefined, stored: readonly string[] = []): { value: string | undefined; reset: boolean } {
  if (current === undefined || current === "" || current === DEFAULT_EFFORT) return { value: current, reset: false };
  if (effortsFor(model, catalog, stored).includes(current)) return { value: current, reset: false };
  return { value: DEFAULT_EFFORT, reset: true };
}
