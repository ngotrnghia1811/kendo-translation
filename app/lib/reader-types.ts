// Types of the reader pages (unit RC1, round 63). Shared by server code, client components, and the sync command S2.
// No runtime code and no server-only marker. Readers never get the research layer: none of these types has a verdict, a score,
// a QA field, a TL_3 panel, or reasoning (VISION-viewer l232 and l239).
import type { TermEntry } from "./htv-types";

/** A term mark of the reader pages. It has no EN form check result and no detail (those are research data). */
export interface ReaderMark {
  start: number;
  end: number;
  markId: string;
  entryId: string;
  surface: string;
}

/** One row of the reader text: one sentence group of the page. */
export interface ReaderRow {
  key: string;
  shortKey: string;
  part: "lines" | "block_title";
  ja: string;
  /** Agent text (ED_3) of the shown run. Empty when no ED_3 item cites the group. */
  ed3: string;
  jaMarks: ReaderMark[];
  edMarks: ReaderMark[];
}

/** A caption or the running head: items that make no row (VISION-viewer 15.19.4, round 63 answer 5 "Copy captions"). */
export interface ReaderExtra {
  id: string;
  kind: "caption" | "running_head";
  ja: string;
  en: string;
}

/** The record of the collection reader_pages, in the camel case of the app. */
export interface ReaderPageRecord {
  pageId: string;
  itemId: string;
  n: number;
  runId: string;
  rows: ReaderRow[];
  terms: Record<string, TermEntry>;
  extras: ReaderExtra[];
  /** Group keys that a translator ticked "agree" for exactly this agent text. No name is stored. */
  agree: string[];
}

/** How a row of the human version reads (VISION-viewer 15.19.5). */
export type HumanKind = "own" | "agree" | "agent";

export interface ReaderViewRow {
  key: string;
  shortKey: string;
  part: "lines" | "block_title";
  ja: string;
  jaMarks: ReaderMark[];
  agent: { text: string; marks: ReaderMark[]; agreedByTranslator: boolean };
  /** The row of the human version that an admin chose, or null when the page has none. */
  human: { text: string; marks: ReaderMark[]; kind: HumanKind } | null;
}

/** The data of one page for the screen. A page without reader text has hasText false and no rows. */
export interface ReaderPageData {
  pageId: string;
  n: number;
  /** "Page 48": the file number (round 62 answer 10). */
  name: string;
  hasText: boolean;
  rows: ReaderViewRow[];
  terms: Record<string, TermEntry>;
  extras: ReaderExtra[];
  /** True when an admin chose a human version for this page. */
  hasHuman: boolean;
  /** The AI label lines of the page (VISION-viewer l240-249). The screen always shows the line for the shown text. */
  label: { agent: string; human: string };
  checked: boolean;
}

export interface ReaderChapter {
  chapter: string;
  month: number | null;
  year: number | null;
  titleEn: string;
  pageStart: number;
  pageEnd: number;
}

/** Facts of a book for the book list and the book screen. */
export interface ReaderBookFacts {
  slug: string;
  titleEn: string;
  titleJa: string;
  author: string;
  publisher: string;
  year: string;
  isbn: string;
  pages: number;
  synopsis: string;
}

export interface ReaderBookCard extends ReaderBookFacts {
  /** Count of pages with reader text. */
  withText: number;
  /** Page number of the saved place, or null. */
  resumeAt: number | null;
}

export interface ReaderBookIndex extends ReaderBookFacts {
  /** Digits of a page ID: 3, or 4 when the book has more than 999 pages. */
  digits: number;
  /** Page numbers that have reader text. */
  textPages: number[];
  /** Page numbers with a page check. */
  checkedPages: number[];
  chapters: ReaderChapter[];
  resumeAt: number | null;
}

export interface BookmarkView {
  id: string;
  pageId: string;
  n: number;
  note: string;
  created: string;
}

/** AI label text. The words are fixed by VISION-viewer l240-251 and the owner answer of round 63 (answer 6). */
export const LABEL_AGENT_UNCHECKED = "AI translation, not yet checked by a person";
export const LABEL_AGENT_CHECKED = "AI translation, checked by a person";
export const LABEL_HUMAN = "Human translation. Chosen by an admin.";
export const LABEL_AGREE_ROW = "AI translation, checked by a translator";
export const LABEL_SYNOPSIS = "Written by an AI agent";
export const NO_TEXT = "No agent translation yet";
export const WAITING = "Your account waits for approval by an admin.";

export function pageLabel(n: number): string {
  return `Page ${n}`;
}
