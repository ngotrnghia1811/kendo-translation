// Small helpers of the reader pages. No import and no server-only marker, so server code, client code, and a test script can load it.
import type { ReaderChapter } from "./reader-types";

export type ReaderView = "page" | "scroll";

export function pad(n: number, digits: number): string {
  return String(n).padStart(digits, "0");
}

/** Address of a page on the reader pages: /read/left_foot_full?view=page&at=p048. */
export function readHref(slug: string, view: ReaderView, n: number, digits: number): string {
  return `/read/${encodeURIComponent(slug)}?view=${view}&at=p${pad(n, digits)}`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Month heading of a magazine year, for example "October 2014". Another chapter shows its English title, else its code. */
export function chapterHeading(c: ReaderChapter): string {
  if (c.month && c.month >= 1 && c.month <= 12 && c.year) return `${MONTHS[c.month - 1]} ${c.year}`;
  return c.titleEn || c.chapter;
}

/** Read a page number from the query text "p048". Null when it is not a page of this book. */
export function parseAt(raw: string | undefined, pages: number): number | null {
  const m = typeof raw === "string" ? /^p(\d{1,5})$/.exec(raw) : null;
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= pages ? n : null;
}
