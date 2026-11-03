/**
 * A page number typed in a box: "48", "p48", or "p048". Returns the number, or null when the text is not a number or the page is outside 1 to `pages`.
 * Unit UXC2 (round 61 answer 3, Q-A l263): the page number box and the box "Go to page" use this one rule.
 */
export function parsePageNumber(text: string, pages: number): number | null {
  const m = /^p?\s*(\d{1,5})$/i.exec(text.trim());
  const n = m ? parseInt(m[1], 10) : 0;
  return m && n >= 1 && n <= pages ? n : null;
}
