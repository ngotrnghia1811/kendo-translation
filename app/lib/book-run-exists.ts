import "server-only";
import { dataRoot, loadConfig } from "./config";
import { bookRunExistsOnDisk } from "./book-runs";

/*
 * Check for the route /api/admin/opens when the source is "book-store" (unit VW77e, round 78 answer 8: one open record per book run).
 * A book run can open only when its run folder exists in one of the 3 places of the book store (current, archive/<run ID folder>, agent-phase-3).
 * The run ID is the folder form, for example 20261111T183021-0800 (Q-A 3:11.2 D1). Any state of the run is allowed, as for a pilot run.
 * The book store is on this Mac. When the app reads the runs from PocketBase (runSource "pocketbase"), there is no store folder, and no book run can open.
 */
export async function bookRunExists(book: string, runId: string): Promise<boolean> {
  if ((await loadConfig()).runSource === "pocketbase") return false;
  let root: string;
  try {
    root = await dataRoot();
  } catch {
    return false;
  }
  return bookRunExistsOnDisk(root, book, runId);
}
