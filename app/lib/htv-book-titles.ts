import "server-only";
import { loadConfig } from "./config";
import { catalogInfo } from "./pb";
import { loadFilesFacts } from "./htv-files-titles";
import { panelBookSlugs } from "./htv-panel-cards";
import type { PanelData } from "./htv-panel";

/*
 * Unit VW111 (Q-A 3:76.1 places 5 and 6, Q-A 3:72.2 "Use the real name of the book, not the file name").
 * The server side of the book titles for the screens that hold a list of book slugs: the chips and the marks of the TL_3 information panel,
 * and the page list of /admin/versions. The titles come from the same source as the book list of `/translate` (lib/htv-books.ts bookFacts):
 *   - runSource "pocketbase": catalog_items (catalogInfo). The item_id of a web article there is the short ID.
 *   - runSource "files": items.filled.jsonl (loadFilesFacts), with the 8-character rule of lib/htv-titles.ts.
 * The text of a book is its English title, else its Japanese title. A book with no title is not in the answer, so the screen shows the older text.
 * A read that fails gives an empty answer: a title is never a reason to break a page.
 * A new file, because the dev server keeps old module instances (VW77a).
 */

/** The title of each slug in `slugs`. A slug with no title is left out. */
export async function bookTitlesOf(token: string, slugs: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (slugs.length === 0) return out;
  try {
    const facts = (await loadConfig()).runSource === "pocketbase" ? await catalogInfo(token) : await loadFilesFacts();
    for (const s of slugs) {
      const t = facts.get(s)?.title;
      if (t) out[s] = t;
    }
  } catch {
    return {};
  }
  return out;
}

/** The titles of the books that the cards of a TL_3 information panel name (the pair pages, the marks). */
export async function panelBookTitles(panel: PanelData, token: string): Promise<Record<string, string>> {
  return panel.available ? bookTitlesOf(token, panelBookSlugs(panel.blocks)) : {};
}
