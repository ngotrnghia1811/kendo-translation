import "server-only";
import { dataRoot } from "./config";
import { articleIdsIn, bookSlugsIn, plainLine, type LineContext } from "./json-view-lines";
import { bookTitles } from "./books";
import { nameMain } from "./phase2-articles";
import { loadArticleNames } from "./phase2-articles-load";

// Unit VW96 (round 91), card P31.3, default D4 of Q-A 3:20.3: the server part of the plain lines of the JSON viewer /json.
// It finds the article titles (items.filled.jsonl, status "draft, not checked by the owner") for the article IDs in some paths.
// Read only. A new file, because the dev server keeps old module instances (VW77a).

/** Titles for the article IDs in `paths`, as the context of plainLine. A short ID with no single match gets no title. */
export async function lineContext(paths: string[]): Promise<LineContext> {
  const ids = new Set<string>();
  for (const p of paths) for (const id of articleIdsIn(p)) ids.add(id);
  const titles = new Map<string, string>();
  // Unit VW111 (place 4): the titles of the book folders that the paths name (one read of the metadata file, the shared lookup of lib/books.ts).
  const slugs = new Set<string>();
  for (const p of paths) for (const s of bookSlugsIn(p)) slugs.add(s);
  const bookNames = slugs.size > 0 ? await bookTitles(slugs) : new Map<string, string>();
  if (ids.size === 0) return { titles, bookNames };
  const names = await loadArticleNames(await dataRoot(), [...ids].map((id) => `${id}/p001`));
  for (const [id, n] of names) if (n.match === "one" && (n.en ?? n.ja)) titles.set(id, nameMain(n));
  return { titles, bookNames };
}

/** The line above the path, and a line for each folder entry (a map from the entry path to its line). */
export async function loadPlainLines(rel: string, folder: boolean, entries: { path: string; folder: boolean }[] = []): Promise<{ line: string; entries: Record<string, string> }> {
  const ctx = await lineContext([rel, ...entries.map((e) => e.path)]);
  const out: Record<string, string> = {};
  for (const e of entries) out[e.path] = plainLine(e.path, e.folder, ctx);
  return { line: plainLine(rel, folder, ctx), entries: out };
}
