// Unit VW123 (plan P63, card P63.1). Owner pick Q-A 3:116.4 (2026-11-22) "Search list + Thinking menu" and "Also Favorites and Recent", rows M1 to M5 and M7.
// Pure rules of the model picker: the search match, the sections, the typed ID row, and the favorites and recent lists. No browser code, so the tests can import it.
// A new file, because the dev server keeps old module instances (VW77a).
// The oc2 picker is /Users/nghiango-mbp/projects/opencode-v2-custom/vendor/openchamber/packages/ui/src/components/model-picker/ModelPickerList.tsx.
//   The sections are l551-562 (Recent without the favorites) and l626-634 (Favorites, Recent, one section for each provider).
//   The search is matchesRankQuery of .../packages/ui/src/lib/search/fuzzySearch.ts l142-152. The fields are model name, model ID and provider name.
import { cardNameOf, providerOf } from "./model-card";
import { valueError } from "./settings-schema";

/** Keys of the browser store (row M4). Both Run settings pages read the same keys. Nothing goes to the server. */
export const FAVORITES_KEY = "kendo.settings.model.favorites";
export const RECENT_KEY = "kendo.settings.model.recent";
export const MAX_FAVORITES = 20;
export const MAX_RECENT = 5;

export type ModelRow = { id: string; provider: string; providerLabel: string; name: string };

/** Split "provider/model". A Claude card shows its card name ("Claude card ntngh"), another provider shows its ID. */
export function rowOf(id: string): ModelRow {
  const provider = providerOf(id) ?? "";
  const name = provider ? id.slice(provider.length + 1) : id;
  const card = provider ? cardNameOf(provider) : null;
  return { id, provider, providerLabel: card !== null ? `Claude card ${card}` : provider, name };
}

/** The text of the model button (row M1): "xai · grok-4.7". An empty value gives "Choose a model". */
export function buttonText(id: string | undefined): string {
  if (!id) return "Choose a model";
  const row = rowOf(id);
  return row.providerLabel ? `${row.providerLabel} · ${row.name}` : row.name;
}

const compact = (text: string) => text.replace(/[^a-z0-9]+/g, "");

/**
 * The search match (row M1), a port of matchesRankQuery (fuzzySearch.ts l142-152): split the query at spaces.
 * Each word must be inside one of the fields (name, ID, provider label, provider ID), or, when the word has 2 or more characters, inside one of them after all marks other than letters and digits are removed.
 * An empty query matches every row.
 */
export function matchesQuery(row: ModelRow, query: string): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const fields = [row.name, row.id, row.providerLabel, row.provider].map((f) => f.toLowerCase()).filter(Boolean);
  return tokens.every((token) => {
    const squeezed = compact(token);
    return fields.some((f) => f.includes(token) || (token.length > 1 && squeezed !== "" && compact(f).includes(squeezed)));
  });
}

export type Section = { key: "favorites" | "recent" | `provider:${string}`; title: string; rows: ModelRow[] };

const byText = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });

/**
 * The sections of the list (row M2), in this order: Favorites, Recent (without the favorites), then one section for each provider, sorted by provider name.
 * The provider sections hold every listed model. A model that is a favorite shows in Favorites and in its provider section, as in oc2.
 * `models` is the full list (row M7). An empty section is left out.
 */
export function buildSections(models: readonly string[], favorites: readonly string[], recent: readonly string[], query: string): Section[] {
  const keep = (rows: ModelRow[]) => rows.filter((r) => matchesQuery(r, query));
  const sections: Section[] = [];
  const fav = keep(favorites.map(rowOf));
  if (fav.length) sections.push({ key: "favorites", title: "Favorites", rows: fav });
  const rec = keep(recent.filter((id) => !favorites.includes(id)).map(rowOf));
  if (rec.length) sections.push({ key: "recent", title: "Recent", rows: rec });
  const byProvider = new Map<string, ModelRow[]>();
  for (const row of keep([...new Set(models)].filter((id) => id !== "").map(rowOf))) {
    const list = byProvider.get(row.providerLabel) ?? [];
    list.push(row);
    byProvider.set(row.providerLabel, list);
  }
  for (const label of [...byProvider.keys()].sort(byText)) {
    sections.push({ key: `provider:${label}`, title: label || "No provider", rows: (byProvider.get(label) ?? []).sort((a, b) => byText(a.name, b.name)) });
  }
  return sections;
}

/** A text that the run accepts as a model ID: the same rule as the file check (valueError of lib/settings-schema.ts). An empty text is never valid. */
export function isModelId(text: string): boolean {
  return text !== "" && valueError("levels.0.model", text) === null;
}

/**
 * The typed ID row (row M5): the trimmed search text, when it has the form provider/model and no row matches it. Else null.
 * An empty search gives null, so no path writes an empty value.
 */
export function typedId(query: string, sections: readonly Section[]): string | null {
  const text = query.trim();
  if (!isModelId(text)) return null;
  return sections.some((s) => s.rows.length > 0) ? null : text;
}

export type Entry = { kind: "model"; id: string; section: string } | { kind: "use"; id: string };

/** The rows in keyboard order: each model row of each section, then the typed ID row. */
export function entriesOf(sections: readonly Section[], typed: string | null): Entry[] {
  const out: Entry[] = sections.flatMap((s) => s.rows.map((r): Entry => ({ kind: "model", id: r.id, section: s.key })));
  if (typed !== null) out.push({ kind: "use", id: typed });
  return out;
}

/** Move the highlight with wrap-around (oc2 l739). `step` is 1 or -1. With no entry the result is -1. */
export function moveActive(current: number, step: number, total: number): number {
  return total <= 0 ? -1 : (((current + step) % total) + total) % total;
}

/** Read a stored list. A damaged text, a value that is not a list, or an entry that is not a provider/model ID gives no entry (never an error). */
export function parseIdList(text: string | null, max: number): string[] {
  if (!text) return [];
  try {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value)) return [];
    const ids = value.filter((v): v is string => typeof v === "string" && providerOf(v) !== null);
    return [...new Set(ids)].slice(0, max);
  } catch {
    return [];
  }
}

/** The star (row M4): remove the ID when it is a favorite, else add it at the end. The list keeps the newest MAX_FAVORITES. */
export function toggleFavorite(list: readonly string[], id: string): string[] {
  if (providerOf(id) === null) return [...list];
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id].slice(-MAX_FAVORITES);
}

/** A pick (row M2): the ID goes to the front. The list keeps the last MAX_RECENT picks. An ID that is not provider/model changes nothing. */
export function pushRecent(list: readonly string[], id: string): string[] {
  if (providerOf(id) === null) return [...list];
  return [id, ...list.filter((x) => x !== id)].slice(0, MAX_RECENT);
}
