import "server-only";
import { listDir } from "./json";
import { loadConfig } from "./config";
import { folderToPageId } from "./format";
import { isSafeSegment } from "./safe-path";
import { RUN_FOLDER_RULE } from "./htv-build";
import { pageRunExists } from "./pb";

/*
 * Check for the route /api/admin/opens (unit RT74, round 75 answer 3, qa-memory-2026-10-31.md:53: "Admin opens any run").
 * A run can open only when its run folder exists: <T2>/data/pilot-run/<book>_pNNN/<run ID>. Any state of the run is allowed (also an unfinished run).
 * When the app reads the runs from PocketBase (runSource "pocketbase"), the folders are not on this machine. Then a page_runs record is the proof.
 */

const PILOT = "pilot-run";

/** The page folders of one book that hold the run folder runId, for example left_foot_full_p046 for the run 20261029T051154Z-r41. */
export async function pageFoldersWithRun(book: string, runId: string): Promise<string[]> {
  if (!isSafeSegment(book) || !isSafeSegment(runId) || !RUN_FOLDER_RULE.test(runId)) return [];
  const out: string[] = [];
  for (const name of (await listDir(PILOT)).sort()) {
    const parsed = folderToPageId(name);
    if (!parsed || parsed.slug !== book || !isSafeSegment(name)) continue;
    if ((await listDir(`${PILOT}/${name}`)).includes(runId)) out.push(name);
  }
  return out;
}

/** True when the run of the book exists as a folder on this machine (or as a page_runs record when runSource is "pocketbase"). */
export async function runExists(token: string, book: string, runId: string): Promise<boolean> {
  if ((await loadConfig()).runSource === "pocketbase") return pageRunExists(token, book, runId);
  return (await pageFoldersWithRun(book, runId)).length > 0;
}
