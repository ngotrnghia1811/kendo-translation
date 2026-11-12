// Types of the reader pages (unit RC1, round 63). Shared by server code, client components, and the sync command S2.
// No runtime code and no server-only marker. Readers never get the research layer: none of these types has a verdict, a score,
// a QA field, a TL_3 panel, or reasoning (VISION-viewer l232 and l239).
import type { TermEntry } from "./htv-types";
import type { ReaderFact } from "./reader-web";

export type { ReaderFact };

/** A term mark of the reader pages. It has no EN form check result and no detail (those are research data). */
export interface ReaderMark {
  start: number;
  end: number;
  markId: string;
  entryId: string;
  surface: string;
}

/** The other page of a sentence that crosses a page end (unit VW90, Q-A 3:1.6). folio: the printed page number of that page, or null when the run found none. */
export interface RowLink {
  folio: string | null;
  pageId: string;
}

/**
 * The two optional keys of a row that touches a page end inside a sentence (unit VW90, design 9.24.11, Q-A 3:1.6).
 * Both are absent on every other row, so a record of an old run keeps its shape. The key names follow the design text.
 */
export interface RowLinks {
  /** The row ends the page inside a sentence. The later page holds the rest. The English text of the row is the full sentence. */
  continues?: RowLink;
  /** The row starts with the rest of a sentence that began on the earlier page. */
  continues_from?: RowLink;
}

/** One row of the reader text: one sentence group of the page. */
export interface ReaderRow extends RowLinks {
  key: string;
  shortKey: string;
  part: "lines" | "block_title";
  ja: string;
  /** Agent text (ED_3) of the shown run. Empty when no ED_3 item cites the group. */
  ed3: string;
  jaMarks: ReaderMark[];
  edMarks: ReaderMark[];
  /** True for a row of the block type site_text of a web article (page chrome such as "関連"). Unit RT73a. Absent for other rows. */
  site?: boolean;
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

export interface ReaderViewRow extends RowLinks {
  key: string;
  shortKey: string;
  part: "lines" | "block_title";
  ja: string;
  jaMarks: ReaderMark[];
  agent: { text: string; marks: ReaderMark[]; agreedByTranslator: boolean };
  /** The row of the human version, or null when the page has none. For a web article the Human version is the kendojidai.com text (unit RT73a). */
  human: { text: string; marks: ReaderMark[]; kind: HumanKind; facts: ReaderFact[] } | null;
  /** True for a row of a web article: the key has the form <page_id>/web/<unit> (VISION-viewer 15.26.4). A page of 18d4ac29 holds agent rows and web rows. */
  web: boolean;
  /** True for a site_text row of a web article. Unit RT73a. */
  site: boolean;
}

/**
 * One block of a v1 md file (VISION-viewer 15.26.9). The v1 placeholder is text of the browser Gemini agent of v1, for display testing only.
 * It counts in no number, it is not searched, and it never reaches the database (owner round 73c answers 2 and 3, round 73d answer 8).
 */
export interface ReaderV1Row {
  /** <page_id>/v1/<NN>, NN the number of the block on the page. */
  key: string;
  ja: string;
  en: string;
  /** Empty when the block has no ZH line. */
  zh: string;
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
  /** True when the page has a human version: an admin chose one, or it is the default choice (the kendojidai.com text of a web article). */
  hasHuman: boolean;
  /** True when the page record holds an Agent text (the ED_3 text of a run). False for a web article page with only Original text rows. Unit RT73a. */
  hasAgent: boolean;
  /** Who chose the human version: "default" (S2, kendojidai.com) or "admin". Null when the page has none. */
  humanBy: "default" | "admin" | null;
  /** The v1 placeholder blocks of the page, or an empty list (no md file, no folder on this machine). They count in no number. */
  v1: ReaderV1Row[];
  /** The label lines of the page (VISION-viewer l240-249 and 15.26.7). The screen always shows the line for the shown text. */
  label: { agent: string; human: string; v1: string };
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
  /** book, magazine-year, web-capture, or web-article (catalog_items.kind). The code tests the kind, not the page count (VISION-viewer 15.26.6.1). */
  kind: string;
}

// ---------------------------------------------------------------- Reader dashboard (unit RC4, round 70). VISION-viewer 15.23.

/** Placement facts of a web article (catalog_items.placement, written by S2): the web date and the print stamp of the magazine issue. */
export interface DashPlacement {
  webYear: number | null;
  webMonth: number | null;
  printYear: number | null;
  printMonth: number | null;
}

/** One work of the Reader dashboard: a row of catalog_items. */
export interface DashWork {
  slug: string;
  /** book, magazine-year, web-capture, or web-article. A record that S2 wrote before round 70 has an empty kind. The loader names it web-article when the slug has 8 hex digits. */
  kind: string;
  titleEn: string;
  titleJa: string;
  author: string;
  publisher: string;
  year: string;
  pages: number;
  synopsis: string;
  isbn: string;
  /** Metadata key part_of: the slug of the full book (men0 and men1 name men_full), or a title text. */
  partOf: string;
  /** Unit VW77e: metadata keys part_title_en and part_title_ja (Lectures on Kendo has 3 books with one title and 3 part titles). Empty or missing for any other work. */
  partTitleEn?: string;
  partTitleJa?: string;
  /** Web date as text, for example 2019-10-21. Empty for a work that is not a web article. */
  webDate: string;
  placement: DashPlacement;
  /** English pages that readers can read, sorted (catalog_items.translated, written by S2). */
  translated: number[];
  /** False when the numbers of translated pages are not known for this work (the database has no S2 data yet and the reader cannot read reader_pages). */
  known: boolean;
  /** Page number of the saved place of the signed-in account, or null. */
  resumeAt: number | null;
}

/** One article row of a magazine month (magazine_chapters.articles). */
export interface DashArticle {
  order: number;
  titleEn: string;
  titleJa: string;
  pageStart: number;
  pageEnd: number;
}

export interface DashChapter extends ReaderChapter {
  book: string;
  articles: DashArticle[];
}

export interface ReaderBookIndex extends ReaderBookFacts {
  /** Digits of a page ID: 3, or 4 when the book has more than 999 pages. */
  digits: number;
  /** True when the item has page images: a book or a magazine year with pages. The web article has none (unit RC2, round 65), also now that it has A4 pages (unit RT73a). */
  images: boolean;
  /** Kind of the work (catalog_items.kind). */
  kind: string;
  /** Translated pages: the pages with an Agent text or a Human version (unit RT73a, VISION-viewer 15.26.10). */
  textPages: number[];
  /** Pages with an Agent text. */
  agentPages: number[];
  /** Pages with a Human version. */
  humanPages: number[];
  /** Pages that the scroll view asks the server for: every page with a reader_pages record, and every page with a v1 md file. The v1 file adds to no count. */
  dataPages: number[];
  /** Pages with a v1 md file on this machine (unit RT73b). The component list shows the v1 rows when this list is not empty. They add to no count. */
  v1Pages: number[];
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
/** Page line of the default Human version, the kendojidai.com text (round 73c answer 7, "From kendojidai.com (Recommended)"). */
export const LABEL_HUMAN_DEFAULT = "Human translation from kendojidai.com.";
/** Page lines of the v1 placeholder (round 73b answer 11 for EN and ZH, unit default D20 for the JA line). */
export const LABEL_V1 = "v1 Gemini translation placeholder.";
export const LABEL_V1_JA = "v1 Gemini placeholder text.";
export const LABEL_AGREE_ROW = "AI translation, checked by a translator";
export const LABEL_SYNOPSIS = "Written by an AI agent";
export const NO_TEXT = "No agent translation yet";
/** Reasons in the component list for a component that the page lacks (VISION-viewer 15.26.6.2). NO_TEXT is the reason of Agent text. */
export const NO_HUMAN = "No human version for this page";
export const NO_JA = "No Japanese text for this page";
export const NO_V1 = "No v1 text for this page";
export const NO_TERMS = "No term marks on this page";
export const NO_IMAGE = "No page image for this page";
export const PAGE_VIEW_ONLY = "Page view only";
export const PAIR_NEEDS = "Needs Original text and one English text";
export const KEEP_ONE = "Keep at least one panel";
/** A page with no Agent text, no Human version, no Original text, and no v1 file (unit default D29). */
export const NO_PAGE_TEXT = "No text for this page yet.";
export const WAITING = "Your account waits for approval by an admin.";

export function pageLabel(n: number): string {
  return `Page ${n}`;
}

/** Dashboard words (unit RC4, round 70). */
export const DASHBOARD_TITLE = "Reader dashboard";
export const SEARCH_WAITING = "Page text search opens after approval.";
export const SEARCH_NEEDS_S2 = "Search needs the next database update (S2).";
