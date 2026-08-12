/**
 * Husk article exclusion filter.
 *
 * Exactly 11 articles are empty parent-book "husk" rows left over from the
 * book-splitting migration (segmented=false, segment_count=0, no book relation).
 * They hold no unique content and should be invisible at every surface.
 *
 * See: docs/HUSK_ARTICLES_REVIEW.md for the full list and decision record.
 */

/** The 11 husk article IDs (stable — do not modify). */
export const HUSK_ARTICLE_IDS: ReadonlySet<string> = new Set([
  '38221898-d3e4-4012-8a23-4a71c6f3a4ee', // Kendojidai 2010
  '84f5be1e-6cbf-4753-9fe3-f3146769c1eb', // Kendojidai 2011
  '4143b5fb-74df-414f-8ea3-fccc1a2b3b1b', // Kendojidai 2012
  '563b88bb-ed67-4f68-abfe-22068c1cf08c', // Kendojidai 2013
  'f8eb8778-b83b-4556-86f7-aaa4092d16d6', // Kendojidai 2014
  '4541dd08-3773-4b5d-9f8c-81efc75831ea', // Kendojidai 2015
  '057c1970-5c75-47f0-85e7-b3a949766148', // Kendojidai 2016
  'c602f1e2-95df-4da9-a3cf-3a389efdce92', // Kendojidai 2017
  'e9cfbf9f-5be9-4a1f-b5c9-5a52270a6d8c', // Kendojidai 2018
  'aea3e1a6-fe6a-408b-b57d-4942900670f4', // Kendo Reiho and Saho
  '3785cd55-421e-4daf-b1ba-546e3a09fdbe', // Ki Breathing Method
]);

/** Check whether an article ID is one of the 11 husks. */
export function isHuskArticle(id: string): boolean {
  return HUSK_ARTICLE_IDS.has(id);
}

/**
 * Return a PocketBase-compatible filter fragment that excludes the 11 husks.
 * Callers should AND this with their existing filter, e.g.:
 *
 *   `(${existingFilter}) && (${huskExclusionFilter})`
 *
 * Uses `id !=` for each husk (PocketBase supports multiple != clauses joined
 * with &&).  Equivalent semantics to the documented invariant
 * `!(segmented=false && segment_count=0 && book="")` but explicit by ID so it
 * never accidentally matches a legitimate 0-segment draft article.
 */
export const HUSK_EXCLUSION_FILTER: string = [...HUSK_ARTICLE_IDS]
  .map((id) => `id != "${id}"`)
  .join(' && ');

/**
 * Append the husk-exclusion fragment to an existing PocketBase filter string.
 * If `existing` is empty or undefined, returns the pure exclusion filter.
 */
export function withHuskExclusion(existing?: string | null): string {
  const parts: string[] = [];
  if (existing && existing.trim()) {
    parts.push(`(${existing})`);
  }
  parts.push(`(${HUSK_EXCLUSION_FILTER})`);
  return parts.join(' && ');
}
