import "server-only";
import { listDir } from "./json";
import { runFoldersOf } from "./books";
import { folderToPageId } from "./format";
import { neighborCandidates, pageNumber } from "./page-move";

// Unit VW115 (Q-A 3:93.5, accepted design row 3 in Q-A 3:94.2): "Previous page" and "Next page" of the Monitor page view /page/<book>/<page>.
// Each page has its own run name in ?run=, and a page with no run folder gives "not found" (app/page/[slug]/[page]/page.tsx). So the link goes to the
// neighbor page in book order that has at least one run folder, and the link opens it with its newest run folder. At the end of the book there is no link.

export interface PageNeighbors {
  previous: string | null;
  next: string | null;
}

/** The address of a page with its newest run folder. */
function pageLink(slug: string, pageName: string, run: string): string {
  return `/page/${encodeURIComponent(slug)}/${encodeURIComponent(pageName)}?run=${encodeURIComponent(run)}`;
}

export async function loadPageNeighbors(slug: string, pageName: string): Promise<PageNeighbors> {
  const current = pageNumber(pageName);
  if (current === null) return { previous: null, next: null };
  // The page folders of this book: pilot-run/<slug>_pNNN. The folder name keeps the digits of the page name, so the link keeps them.
  const byNumber = new Map<number, string>();
  for (const name of await listDir("pilot-run")) {
    const id = folderToPageId(name);
    if (!id || id.slug !== slug) continue;
    const n = pageNumber(id.page);
    if (n !== null && !byNumber.has(n)) byNumber.set(n, id.page);
  }
  const numbers = [...byNumber.keys()];
  // Read the run folders of the candidates, nearest first, until one has a run. Each page is read at most once.
  const runs = new Map<number, string | null>();
  const hasRun = async (n: number): Promise<string | null> => {
    if (!runs.has(n)) runs.set(n, (await runFoldersOf(`${slug}_${byNumber.get(n)}`))[0] ?? null);
    return runs.get(n) ?? null;
  };
  const find = async (direction: "previous" | "next"): Promise<string | null> => {
    for (const n of neighborCandidates(numbers, current, direction)) {
      const run = await hasRun(n);
      if (run) return pageLink(slug, byNumber.get(n) as string, run);
    }
    return null;
  };
  return { previous: await find("previous"), next: await find("next") };
}
