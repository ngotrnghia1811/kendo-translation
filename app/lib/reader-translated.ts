// The rule for "translated" on the Reader dashboard (/read), and the words of the progress lines (unit RC4, round 70. Word change: unit RC4b, round 71).
// No import and no server-only marker, so the page code, the sync command S2, and a test script can load it.

/**
 * Round 69 answer 8: the owner questioned the word "finished". Round 70 answer 3, owner words: "Pages with translation that reader can view
 * use the CORRECT word. `translated` instead of `finished`". The rule stays. A word change is one line: change TRANSLATED_WORD.
 */
export const TRANSLATED_WORD = "translated";

/** The language of the progress lines. Only English has an agent translation today (VISION-viewer 15.23.3.3). */
export const PROGRESS_LANGUAGE = "English";

/**
 * The one rule: a page counts as translated when readers can read an Agent text or a Human version there (unit RT73a, round 73c answer 2, VISION-viewer 15.26.10).
 *   agent  a reader_pages record with an Agent text exists (the shown run is the run of the admin mark, else the newest PASS run)
 *   human  a reader_versions record exists (the chosen Human version, by default the kendojidai.com text of a web article)
 * A page with only the Original text rows of a web article (run_id "web-ja") does not count. A page with only the v1 placeholder does not count
 * (owner round 73c answer 2: "`placeholder` DOES NOT COUNT AS ANYTHING"), and the v1 placeholder never reaches this function.
 * The sync command S2 calls this function for every page that it knows. The Reader dashboard only reads the result.
 */
export function isTranslatedPage(page: { agent?: boolean; human?: boolean } | null | undefined): boolean {
  return Boolean(page && (page.agent || page.human));
}

/** Percent with one decimal. A total of 0 gives "0.0". */
export function percentText(translated: number, pages: number): string {
  return pages > 0 ? ((translated / pages) * 100).toFixed(1) : "0.0";
}

/** The one full form, for a work and for a fold: "English: 6 of 120 pages translated (5.0 percent)". */
function fullForm(translated: number, pages: number, translatedText: string, pagesText: string): string {
  return `${PROGRESS_LANGUAGE}: ${translatedText} of ${pagesText} ${pages === 1 ? "page" : "pages"} ${TRANSLATED_WORD} (${percentText(translated, pages)} percent)`;
}

/** The progress line of one work: "English: 6 of 120 pages translated (5.0 percent)". The page count has no thousands separator. */
export function progressLine(translated: number, pages: number): string {
  return fullForm(translated, pages, String(translated), String(pages));
}

/**
 * The progress text of a fold and of the total line, the same full form: "English: 20 of 4,821 pages translated (0.4 percent)".
 * Both numbers have the thousands separator (unit RT73a: "English: 1,151 of 14,135 pages translated (8.1 percent)", VISION-viewer 15.26.10).
 */
export function foldProgress(translated: number, pages: number): string {
  return fullForm(translated, pages, translated.toLocaleString("en-US"), pages.toLocaleString("en-US"));
}
