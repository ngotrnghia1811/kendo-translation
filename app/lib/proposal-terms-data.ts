import "server-only";
import { bookTitles } from "./books";
import { parseTermbase } from "./htv-build";
import { entryFactsOf, parseProposalRows, parseReviewLines, ProposalProblem, type EntryFacts } from "./proposals-core";
import { mergedTerms, viewTerms } from "./proposal-terms";
import { readTermbaseState, termbasePaths } from "./termbase-files";

/*
 * Unit VW129 (Q-A 3:129.4 rows 1 to 3): server helpers of the tab "Agent proposals".
 *   loadBookTitles   the readable titles of the books of the proposals (Q-A 3:17.4: readable book titles everywhere).
 *   openTermCount    the number of open term groups for the button "Agent proposals (N open)" (row 1). It reads the files and writes nothing.
 */

export function entryFactsMap(termbaseText: string): Map<string, EntryFacts> {
  return new Map([...parseTermbase(termbaseText)].map(([id, raw]) => [id, entryFactsOf(raw)]));
}

/** The title of each book slug that has one (the rule of bookTitle in lib/books.ts). A slug without a title is left out. A read problem gives an empty map, so the tab still shows. */
export async function loadBookTitles(slugs: Iterable<string>): Promise<Record<string, string>> {
  try {
    return Object.fromEntries(await bookTitles(new Set(slugs)));
  } catch {
    return {};
  }
}

/** The number of open term groups, or null when the termbase folder is not set or a file is missing (the button then shows no count). */
export async function openTermCount(): Promise<number | null> {
  try {
    const paths = await termbasePaths();
    if (!paths) return null;
    const st = await readTermbaseState(paths);
    const groups = mergedTerms(parseProposalRows(st.proposalsText).rows, entryFactsMap(st.termbaseText));
    const views = viewTerms(groups, parseReviewLines(st.reviewsText).lines, () => false, () => "");
    return views.filter((v) => v.status === "open").length;
  } catch (e) {
    if (e instanceof ProposalProblem) return null;
    throw e;
  }
}
