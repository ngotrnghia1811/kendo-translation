import "server-only";
import { readJson, readJsonl } from "./json";
import { filesBookFacts, type BookFactsData } from "./htv-titles";

/*
 * Unit VW110 (Q-A 3:74.5 part 1, Q-A 3:72.2 "Use the real name of the book, not the file name").
 * The titles and page counts of the books in files mode (the runSource default), read from the Translator data folder.
 * The rule that matches a metadata row to a slug sits in lib/htv-titles.ts (filesBookFacts): a book folder matches its row by the full item_id,
 * a web article matches by the first 8 characters of item_id, and two different items with the same 8 characters get no title.
 * Two callers use this read: the book list (lib/htv-books.ts) and the page headings (lib/htv-runs.ts).
 * A new file, because the dev server keeps old module instances (VW77a).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

/** The facts of every book in files mode. items.filled.jsonl holds 347 rows: the 36 book folders and 311 web articles with long IDs. */
export async function loadFilesFacts(): Promise<Map<string, BookFactsData>> {
  let rows = await readJsonl<J>("item-metadata/items.filled.jsonl");
  if (rows.length === 0) rows = await readJsonl<J>("item-metadata/items.draft.jsonl");
  const slugs = await readJson<J>("pilot-sample/book-slugs.json");
  const books = ((slugs?.books ?? []) as J[])
    .filter((b) => typeof b?.slug === "string")
    .map((b) => ({ slug: b.slug as string, pages: typeof b.pages === "number" ? b.pages : 0 }));
  return filesBookFacts(rows, books);
}
