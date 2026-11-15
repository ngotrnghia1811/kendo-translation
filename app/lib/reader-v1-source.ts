import "server-only";
import { loadConfig } from "./config";
import type { ReaderV1Row } from "./reader-types";
import { v1PageNumbers, v1PageRows } from "./reader-v1-files";
import { v1PbNumbers, v1PbRows, type V1PbOptions } from "./reader-v1-pb";

/*
 * Where the v1 placeholder comes from (unit VW104). One switch for the two callers in lib/reader-data.ts.
 * Owner picks of 2026-11-14: Q-A 3:44.4 "Show the placeholder on v2", Q-A 3:45.2 "A. PocketBase collection", Q-A 3:45.3 "Rules stay, defaults OK" (unit default D2).
 *   PocketBase mode (VIEWER_RUN_SOURCE=pocketbase, the public site): the collection v1_placeholders, read with the token of the reader (lib/reader-v1-pb.ts).
 *   Every other mode (files, this Mac): the md files of VIEWER_V1_DIR, as before (lib/reader-v1-files.ts).
 * A mode reads one source only. PocketBase mode never falls back to the files, so the public site shows exactly what S2 uploaded.
 * A config that cannot load counts as files mode, so that this switch changes nothing for a Mac that has no PocketBase setting.
 * Any failure gives an empty list: the Viewer shows no placeholder and nothing breaks.
 */

/** The PocketBase options of the reader, or null when the app does not run in PocketBase mode. */
async function pocketbaseOf(token: string): Promise<V1PbOptions | null> {
  try {
    const cfg = await loadConfig();
    return cfg.runSource === "pocketbase" ? { baseUrl: cfg.pocketbaseUrl, token } : null;
  } catch {
    return null;
  }
}

/** Page numbers of a work that have a v1 text, sorted. The numbers add to no count. */
export async function v1PagesOfWork(token: string, slug: string): Promise<number[]> {
  const pb = await pocketbaseOf(token);
  return pb ? v1PbNumbers(pb, slug) : v1PageNumbers(slug);
}

/** The v1 rows of the pages `nums` of a work: one list for each number, in the same order. `pageIds[i]` is the page ID of `nums[i]`. */
export async function v1RowsOfPages(token: string, slug: string, nums: number[], pageIds: string[]): Promise<ReaderV1Row[][]> {
  const pb = await pocketbaseOf(token);
  return pb ? v1PbRows(pb, slug, nums, pageIds) : Promise.all(nums.map((n, i) => v1PageRows(slug, n, pageIds[i])));
}
