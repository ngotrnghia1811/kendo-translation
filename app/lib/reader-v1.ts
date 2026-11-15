// The v1 placeholder: block rule of the v1 md files (unit RT73a, round 73; VISION-viewer 15.26.9, unit default D28).
// No import of server code and no server-only marker, so the page code and a test script can load it.
// The v1 text is text of the browser Gemini agent of v1. The owner calls it a placeholder "for display testing purpose ONLY" (round 73c answer 3).
// It counts in no number and it is not searched (round 73c answer 2). It sits in the PocketBase collection v1_placeholders for the public site
// (owner picks of 2026-11-14: Q-A 3:44.4 "Show the placeholder on v2", Q-A 3:45.2 "A. PocketBase collection", unit VW104). The text of that collection goes into no search column.
import type { ReaderV1Row } from "./reader-types";

/** File name of page n in a v1 folder: page_051.md, and page_1000.md for a page number over 999. */
export function v1FileName(n: number): string {
  return `page_${String(n).padStart(3, "0")}.md`;
}

/** Page number of a v1 file name, or 0. */
export function v1PageOfFile(name: string): number {
  const m = /^page_(\d{3,4})\.md$/.exec(name);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Rows of one md file. A block is the text between lines of `---`. The header "Page N" (first line of the file) and the tag 【Heading】 are not part of a row.
 *   3 or 4 lines  line 1 is JA, line 2 is EN, line 3 is ZH. A fourth line (a page reference such as "p. 948") joins the EN row.
 *   2 lines       line 1 is JA, line 2 is EN, no ZH. (The brief of unit RT73a names no rule for 2 lines. 25,378 blocks of the md files have 2 lines.)
 *   1 line, or 5 lines or more   one row with EN only: no JA and no ZH.
 * The markdown mark *x* loses the asterisks. The notes [T/N: ...] stay in the EN row. The row key is `<pageId>/v1/<NN>`, NN the number of the block on the page.
 */
export function parseV1Md(text: string, pageId: string): ReaderV1Row[] {
  const rows: ReaderV1Row[] = [];
  const clean = (l: string) => l.replace(/\*/g, "").trim();
  let first = true;
  let nn = 0;
  for (const block of text.replace(/\r/g, "").split(/^---[ \t]*$/m)) {
    let lines = block.split("\n").map((l) => l.trim()).filter((l) => l !== "");
    if (first && lines.length) {
      first = false;
      if (/^Page\s+\d+/.test(lines[0])) lines = lines.slice(1);
    }
    lines = lines.filter((l) => l !== "【Heading】").map(clean).filter((l) => l !== "");
    if (lines.length === 0) continue;
    nn++;
    const key = `${pageId}/v1/${String(nn).padStart(2, "0")}`;
    const n = lines.length;
    if (n === 3 || n === 4) rows.push({ key, ja: lines[0], en: n === 4 ? `${lines[1]} ${lines[3]}` : lines[1], zh: lines[2] });
    else if (n === 2) rows.push({ key, ja: lines[0], en: lines[1], zh: "" });
    else rows.push({ key, ja: "", en: lines.join(" "), zh: "" });
  }
  return rows;
}
