// Unit VW96 (round 91), card P31.3. Owner rule Q-A 3:17.4 (2026-11-11): "Annotate the names intuitively and properly. I cant understand what they are
// if you just write `Running` and each name is a long id number. Apply this for EVERYTHING."
// Fault found by VW96 (D1): the old pilot row 18d4ac29 on the Monitor dashboard `/` and the Details view shows the bare ID, because
// lib/book-status.ts loadTitles maps the FULL item_id (a UUID, for example 18d4ac29-12d5-...) to a title, while a page folder uses the first 8 hex digits.
// This helper finds the title of a slug: exact item_id first, else the one item_id that starts with the 8 hex digits.
// Pure: no file read. A new file, because the dev server keeps old module instances (VW77a).

/**
 * `titles` maps item_id to title (loadTitles of lib/book-status.ts). A slug of 8 hex digits matches an item_id that starts with `<slug>-`.
 * Two or more such item_ids give no title (the same rule as articleNames in lib/phase2-articles.ts: no guess).
 */
export function titleOf(titles: Map<string, string>, slug: string): string {
  const exact = titles.get(slug);
  if (exact) return exact;
  if (!/^[0-9a-f]{8}$/.test(slug)) return "";
  let found = "";
  let hits = 0;
  for (const [id, title] of titles) {
    if (id.startsWith(`${slug}-`) && title) {
      found = title;
      hits++;
    }
  }
  return hits === 1 ? found : "";
}
