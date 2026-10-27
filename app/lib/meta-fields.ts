// Pure helpers for the details part of the Books tab (round 47 answer 13, Q-A 2026-10-27 l35).
// The details part shows every key of one metadata row, in groups. No file access here, so a test can call it.

export const META_GROUPS: { id: string; label: string; keys: string[] }[] = [
  {
    id: "main",
    label: "Main",
    keys: ["title_ja", "title_en", "title_en_source", "title_alternatives", "author_ja", "author_en", "author_en_source", "publisher", "publish_year", "publish_date_text", "isbn", "pages", "kind", "folder"],
  },
  { id: "text", label: "Text", keys: ["synopsis", "synopsis_source", "notes"] },
  { id: "check", label: "Check state", keys: ["status", "confidence", "confirmed_by", "filled_by", "sources"] },
  { id: "draft", label: "Draft fields", keys: ["confidence_draft", "notes_draft", "hint_secondary"] },
];

export interface MetaGroup {
  id: string;
  label: string;
  entries: { key: string; value: unknown; present: boolean }[];
}

/**
 * Split one metadata row into the groups above plus "other" for every key that no group names.
 * A key that a group names shows even when the row lacks it (present false), so a gap is visible.
 * The group "other" holds only keys that the row has. It is left out when empty.
 */
export function groupMetadata(row: Record<string, unknown>): MetaGroup[] {
  const known = new Set(META_GROUPS.flatMap((g) => g.keys));
  const groups: MetaGroup[] = META_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    entries: g.keys.map((key) => ({ key, value: row[key], present: Object.prototype.hasOwnProperty.call(row, key) })),
  }));
  const other = Object.keys(row)
    .filter((k) => !known.has(k))
    .map((key) => ({ key, value: row[key], present: true }));
  if (other.length > 0) groups.push({ id: "other", label: "Other", entries: other });
  return groups;
}

export type MetaValue =
  | { kind: "empty" }
  | { kind: "text"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "json"; count: number; text: string };

/** Decide how the UI shows one value. Empty values (missing, null, empty text, empty list, empty object) give "empty". */
export function describeValue(v: unknown): MetaValue {
  if (v === undefined || v === null) return { kind: "empty" };
  if (typeof v === "string") return v.trim() === "" ? { kind: "empty" } : { kind: "text", text: v };
  if (typeof v === "number" || typeof v === "boolean") return { kind: "text", text: String(v) };
  if (Array.isArray(v)) {
    if (v.length === 0) return { kind: "empty" };
    if (v.every((x) => typeof x === "string" || typeof x === "number")) return { kind: "list", items: v.map(String) };
    return { kind: "json", count: v.length, text: JSON.stringify(v, null, 1) };
  }
  if (typeof v === "object") {
    const n = Object.keys(v as object).length;
    return n === 0 ? { kind: "empty" } : { kind: "json", count: n, text: JSON.stringify(v, null, 1) };
  }
  return { kind: "text", text: String(v) };
}
