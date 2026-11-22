// Unit VW123 (plan P63, card P63.1). Owner pick Q-A 3:116.5 (2026-11-22) "Compact, both pages", rows L1 to L5.
// Pure layout data for the two Run settings pages (the form on /monitor/<book> and the panel on /settings/run).
// Both pages build their fields from this data and from FIELDS and GROUPS of lib/settings-schema.ts, so a field is never copied by name into a component.
// A new file, because the dev server keeps old module instances (VW77a).
import { FIELDS, type Field, type FlatSettings, type Scalar } from "./settings-schema";
import { DEFAULT_EFFORT, effortAfterModelChange } from "./model-efforts";

const byKey = (key: string): Field => {
  const f = FIELDS.find((x) => x.key === key);
  if (!f) throw new Error(`Unknown settings key: ${key}`);
  return f;
};

/** One line of the levels table (row L1): the model field and the effort field of one level or of the box critic. */
export type PairRow = { id: string; title: string; model: Field; variant: Field };

/** The 4 levels, in order. The keys come from the schema through the pattern levels.<n>.model and levels.<n>.variant. */
export function levelRows(): PairRow[] {
  return [0, 1, 2, 3].map((n) => ({ id: `levels.${n}`, title: `Level ${n}`, model: byKey(`levels.${n}.model`), variant: byKey(`levels.${n}.variant`) }));
}

/** The box critic line (row L2), in the same style as a level line. */
export function boxCriticRow(): PairRow {
  return { id: "box_critic", title: "Box critic", model: byKey("box_critic.model"), variant: byKey("box_critic.variant") };
}

/** The group numbers (0-based, of GROUPS) that the levels table and the box critic line show. */
export const LEVEL_GROUP = 1;
export const BOX_GROUP = 2;

/** A card of fields side by side (row L3). `groups` are the 0-based GROUPS that the card shows. `part` names the second half of a split group. */
export type Card = { id: string; groups: number[]; part: string | null; fields: Field[] };

/**
 * The cards, in page order. The levels table and the box critic line are not cards.
 *   - one card for N (group 0)
 *   - one card for jobs, book jobs and critic mode (groups 3 and 4)
 *   - memory and links (group 5) split by the first part of the key into two cards
 *   - one card for call timeout and attempts (group 6)
 */
export function cards(): Card[] {
  const ofGroup = (g: number) => FIELDS.filter((f) => f.group === g);
  const split = (g: number): Card[] => {
    const parts = [...new Set(ofGroup(g).map((f) => f.key.split(".")[0]))];
    return parts.map((part) => ({ id: `g${g}-${part}`, groups: [g], part, fields: ofGroup(g).filter((f) => f.key.split(".")[0] === part) }));
  };
  return [
    { id: "g0", groups: [0], part: null, fields: ofGroup(0) },
    { id: "g3-4", groups: [3, 4], part: null, fields: [...ofGroup(3), ...ofGroup(4)] },
    ...split(5),
    { id: "g6", groups: [6], part: null, fields: ofGroup(6) },
  ];
}

/**
 * The efforts that the settings store for exactly one model (the form passes them to the effort table, for a provider that the table cannot rule).
 * Each source is a flat settings object. A model key and its effort key count as one pair.
 */
export function storedEffortsFor(model: string, sources: readonly FlatSettings[]): string[] {
  const out = new Set<string>();
  for (const row of [...levelRows(), boxCriticRow()]) {
    for (const src of sources) {
      const effort = src[row.variant.key];
      if (src[row.model.key] === model && typeof effort === "string" && effort !== "" && effort !== DEFAULT_EFFORT) out.add(effort);
    }
  }
  return [...out];
}

/** The key of the effort field that belongs to a model field: levels.2.model gives levels.2.variant. */
export function effortKeyOf(modelKey: string): string {
  return modelKey.replace(/\.model$/, ".variant");
}

/**
 * A pick in the model picker (row M6, row M5). Returns the new draft and whether the effort was reset to "default" because the new model does not offer it.
 * An empty ID changes nothing (row M5: no path writes an empty model).
 * `current(key)` gives the effort that counts now: the draft value, else the global value (book) or the default (global panel).
 */
export function pickModel(draft: FlatSettings, modelKey: string, id: string, current: (key: string) => Scalar | undefined, stored: readonly string[]): { draft: FlatSettings; reset: boolean; changed: boolean } {
  if (id.trim() === "") return { draft, reset: false, changed: false };
  const next: FlatSettings = { ...draft, [modelKey]: id };
  const effortKey = effortKeyOf(modelKey);
  const now = current(effortKey);
  const after = effortAfterModelChange(id, typeof now === "string" ? now : undefined, stored);
  if (after.reset && after.value !== undefined) next[effortKey] = after.value;
  return { draft: next, reset: after.reset, changed: true };
}
