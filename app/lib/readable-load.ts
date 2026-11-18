import "server-only";
import { listDir, readJson } from "./json";
import { dataRoot } from "./config";
import { isPhase2List, listPageIds, nameMain, pageOfArticle, PHASE2_BOOK, shortIdOf } from "./phase2-articles";
import { loadArticleNames } from "./phase2-articles-load";
import { pageNumberText } from "./readable-names";
import { bookTitles } from "./books";

// Unit VW96 (round 91), card P31.3. Owner rule Q-A 3:17.4 (2026-11-11): "Annotate the names intuitively and properly. I cant understand what they are
// if you just write `Running` and each name is a long id number. Apply this for EVERYTHING."
// Server reads for the readable names of the page view and the Run settings panel. Read only: nothing is written.
// Titles come from <T2>/data/item-metadata/items.filled.jsonl (status "draft, not checked by the owner") through loadArticleNames (VW94).
// A new file, because the dev server keeps old module instances (VW77a).

export interface PageNames {
  /** First 8 hex digits of the article ID, or null for a book page. */
  shortId: string | null;
  /** English title (else Japanese title) of the article, or the book title. Null when no title is known. */
  title: string | null;
  /** True when the title comes from items.filled.jsonl and one item matches. */
  titleFound: boolean;
  /** "page 2 of 4" in the newest phase 2 list that holds the page, else "page 2". */
  pageOf: string;
}

/** The page IDs of the newest phase 2 list folder that holds `pageId`, in list order. Empty when no list holds it. */
export async function phase2OrderOf(pageId: string): Promise<string[]> {
  const stamps = (await listDir("pilot-run/lists")).filter((s) => /^\d{8}T\d{6}Z$/.test(s)).sort().reverse().slice(0, 8);
  for (const stamp of stamps) {
    const progress = await readJson(`pilot-run/lists/${stamp}/progress.json`);
    if (!isPhase2List(progress)) continue;
    const ids = listPageIds(progress);
    if (ids.includes(pageId)) return ids;
  }
  return [];
}

/** Names for the page view of `<slug>/<pageName>`. `bookTitleText` is the title of a book slug ("" when none). */
export async function loadPageNames(slug: string, pageName: string, bookTitleText: string): Promise<PageNames> {
  const pageId = `${slug}/${pageName}`;
  const shortId = shortIdOf(pageId);
  if (!shortId) return { shortId: null, title: bookTitleText || null, titleFound: !!bookTitleText, pageOf: pageNumberText(pageId) };
  const names = await loadArticleNames(await dataRoot(), [pageId]);
  const n = names.get(shortId);
  const found = !!n && n.match === "one" && !!(n.en ?? n.ja);
  const order = await phase2OrderOf(pageId);
  return { shortId, title: found ? nameMain(n) : null, titleFound: found, pageOf: pageOfArticle(pageId, order) ?? pageNumberText(pageId) };
}

/**
 * Unit VW111 (Q-A 3:76.1 place 3, Q-A 3:72.2): the title of each active book of the Run settings panel (book key to title).
 * It uses the shared title lookup of lib/books.ts, so that a web article with a short key gets its title too. The phase 2 key and a book with no title stay out:
 * the panel then shows "The phase 2 run" or the key as before.
 */
export async function loadBookLabels(keys: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [k, t] of await bookTitles(keys.filter((k) => k !== PHASE2_BOOK))) out[k] = t;
  return out;
}

/** A settings or status page ID may use "_" ("94380515_p003"). The page IDs of progress.json use "/". */
export function normalPageId(id: string): string {
  return id.replace(/^([0-9a-f]{8})_(p\d+)$/, "$1/$2");
}

/**
 * Text for each active page of the Run settings panel: "Title, page 3 of 4". The key is the page ID as the panel holds it.
 * A page with no known title gets "page 3 of 4" or "page 3". An unknown form stays out of the map (the panel then shows the ID).
 */
export async function loadPageLabels(ids: (string | null)[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const root = await dataRoot();
  for (const raw of ids) {
    if (!raw || out[raw]) continue;
    const pageId = normalPageId(raw);
    if (!/^[^/]+\/p\d+$/.test(pageId)) continue;
    const shortId = shortIdOf(pageId);
    if (!shortId) {
      out[raw] = pageNumberText(pageId);
      continue;
    }
    const n = (await loadArticleNames(root, [pageId])).get(shortId);
    const of = pageOfArticle(pageId, await phase2OrderOf(pageId)) ?? pageNumberText(pageId);
    out[raw] = n && n.match === "one" ? `${nameMain(n)}, ${of}` : of;
  }
  return out;
}
