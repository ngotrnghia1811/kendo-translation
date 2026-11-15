// The v1 placeholder in the PocketBase collection v1_placeholders: the rules that S2 and the app share (unit VW104).
// Owner picks of 2026-11-14: Q-A 3:44.4 "Show the placeholder on v2", Q-A 3:45.2 "A. PocketBase collection", Q-A 3:45.3 "Rules stay, defaults OK".
// The rules of VISION-viewer 15.26.9 stay: the placeholder counts in no number, it is not searched, and the page line says "v1 Gemini translation placeholder."
// No import of server code and no server-only marker, so S2 (plain Node), the app, and a test script can load it. No Node module either.
// Migration 1793300016 (data/scripts/pocketbase/pb_migrations) makes the collection. The text of the md file splits into rows with parseV1Md (lib/reader-v1.ts): one rule in one place.

export const V1_COLLECTION = "v1_placeholders";

/** Same value as the max of the field md in migration 1793300016. The largest md file of v1 has 90,572 characters (measured 2026-11-14). */
export const V1_MD_MAX_CHARS = 200000;

/**
 * Default folder of the md files, from the app folder. The same text as DEFAULT_V1_DIR in lib/config.ts (that file is server-only, so S2 cannot load it).
 * The env variable VIEWER_V1_DIR and the S2 option --v1-dir name another folder.
 */
export const V1_DEFAULT_DIR = "../data/v1-md";

/** One record of v1_placeholders: one md file of v1. */
export interface V1Record {
  /** The work: the name of its folder in the v1 folder, for example mental_full. */
  slug: string;
  /** Page number from 1 (page_051.md is 51, page_1000.md is 1000). */
  n: number;
  /** Page ID of the Reader for that page, for example mental_full/p051. */
  page_id: string;
  /** The whole md file. */
  md: string;
  /** SHA-256 of the file bytes, as 64 hex characters. */
  sha256: string;
}

/** What S2 reads from the server to compare (it never reads the md text back). */
export interface V1ServerRecord {
  id: string;
  slug: string;
  n: number;
  page_id: string;
  sha256: string;
}

/**
 * Digits of a page ID of a work: 4 for a work with more than 999 pages, else 3.
 * The same rule as idDigits in lib/htv-books.ts (that file is server-only). The test scripts/vw104-test.mjs compares the two.
 */
export function v1IdDigits(pages: number): 3 | 4 {
  return pages > 999 ? 4 : 3;
}

/**
 * Page ID of page n of a work, for example mental_full/p051 or kendojidai_2014/p0794.
 * `lastPage` is the highest page number of the work (S2 takes it from the file names of the work). It sets the digits.
 * The same form as the page IDs of reader_pages (lib/reader-data.ts loadReaderPages: `${slug}/${pageName(n, digits)}`).
 */
export function v1PageIdOf(slug: string, n: number, lastPage: number): string {
  return `${slug}/p${String(n).padStart(v1IdDigits(lastPage), "0")}`;
}

/** Key of a record in the maps of S2: "slug|n". */
export function v1Key(slug: string, n: number): string {
  return `${slug}|${n}`;
}

/** True when the record on the server holds the same page: the same SHA-256 and the same page ID. The md text is not compared (S2 never reads it back). */
export function v1RecordEqual(server: Pick<V1ServerRecord, "page_id" | "sha256">, rec: V1Record): boolean {
  return String(server.sha256 ?? "") === rec.sha256 && String(server.page_id ?? "") === rec.page_id;
}

export type V1Action = "create" | "update" | "unchanged" | "not compared";

export interface V1PlanItem {
  c: V1Record;
  action: V1Action;
  /** Record ID on the server, for an update. */
  id?: string;
}

/**
 * The plan of S2 for the v1 pages. `server` is null when the server was not read (--offline) or the collection is missing: every page is then "not compared".
 * S2 creates a page that the server does not hold, updates a page with another SHA-256 or page ID, and leaves an equal page.
 */
export function planV1(records: V1Record[], server: Map<string, V1ServerRecord> | null): V1PlanItem[] {
  return records.map((c) => {
    if (!server) return { c, action: "not compared" as const };
    const stored = server.get(v1Key(c.slug, c.n));
    if (!stored) return { c, action: "create" as const };
    return { c, action: v1RecordEqual(stored, c) ? ("unchanged" as const) : ("update" as const), id: stored.id };
  });
}

/** The keys "slug|n" of the records that the server holds and the files do not. S2 never deletes them. */
export function v1ServerOnly(records: V1Record[], server: Map<string, V1ServerRecord> | null): string[] {
  if (!server) return [];
  const mine = new Set(records.map((c) => v1Key(c.slug, c.n)));
  return [...server.keys()].filter((k) => !mine.has(k));
}

/** The counts of a plan. */
export function v1Counts(plan: V1PlanItem[]): { create: number; update: number; unchanged: number } {
  const n = (a: V1Action) => plan.filter((p) => p.action === a).length;
  return { create: n("create"), update: n("update"), unchanged: n("unchanged") };
}
