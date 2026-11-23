// Unit VW126 (Q-A 3:117.6 row 2: "The 1,030 entries live in a new PocketBase list ... A sync script on this Mac copies the entries"): the plan of the sync command.
// No server-only marker and no file access, so scripts/sync-dictionary.mjs and the test script can load it.
import { dictRecordOf, type DictRecord } from "./dictionary-record";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

/** The records of the lines of termbase.draft.jsonl. A line that is not JSON or has no id counts in `bad`. A second line with the same id counts in `duplicates` and is skipped. */
export function recordsOfTermbase(fileText: string): { records: DictRecord[]; bad: number; duplicates: number } {
  const records: DictRecord[] = [];
  const seen = new Set<string>();
  let bad = 0;
  let duplicates = 0;
  for (const line of fileText.split("\n")) {
    if (!line.trim()) continue;
    let raw: J;
    try {
      raw = JSON.parse(line);
    } catch {
      bad++;
      continue;
    }
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || !raw.id) {
      bad++;
      continue;
    }
    if (seen.has(raw.id)) {
      duplicates++;
      continue;
    }
    seen.add(raw.id);
    records.push(dictRecordOf(raw));
  }
  return { records, bad, duplicates };
}

/** The fields that the sync writes. A server record has more fields (id, created, updated). */
const FIELDS = ["entry_id", "headword", "variants", "reading", "romaji", "concise_en", "short_en", "common", "view", "search_ja", "search_en", "sort_key"] as const;

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])]));
  return v;
}

/** True when the server record holds the same values as the file record in every synced field. */
export function sameRecord(file: DictRecord, server: J): boolean {
  for (const f of FIELDS) if (JSON.stringify(canonical(file[f])) !== JSON.stringify(canonical(server?.[f]))) return false;
  return true;
}

/** The body that the sync sends for a record. */
export function bodyOf(file: DictRecord): Record<string, unknown> {
  return Object.fromEntries(FIELDS.map((f) => [f, file[f]]));
}

export interface DictPlan {
  create: DictRecord[];
  update: { id: string; record: DictRecord }[];
  same: number;
  /** Entries on the server that the file no longer holds. The sync never deletes them. */
  serverOnly: string[];
}

/** Compare the file records with the server records. `server` null: the server was not read (--offline), so every entry counts as new. */
export function planDictionary(file: DictRecord[], server: J[] | null): DictPlan {
  const plan: DictPlan = { create: [], update: [], same: 0, serverOnly: [] };
  if (server === null) {
    plan.create = [...file];
    return plan;
  }
  const byEntry = new Map<string, J>(server.map((s) => [String(s.entry_id), s]));
  const inFile = new Set(file.map((r) => r.entry_id));
  for (const rec of file) {
    const s = byEntry.get(rec.entry_id);
    if (!s) plan.create.push(rec);
    else if (sameRecord(rec, s)) plan.same++;
    else plan.update.push({ id: String(s.id), record: rec });
  }
  plan.serverOnly = server.map((s) => String(s.entry_id)).filter((id) => !inFile.has(id)).sort();
  return plan;
}
