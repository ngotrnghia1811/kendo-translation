// Types of the human-translation-view. Shared by server code and client components. No runtime code.
import type { PanelData } from "./htv-panel";

/** Roles of section 4 of the Viewer vision. The v1 value qa has no meaning in v2 and counts as reader (section 15.12.2). */
export type Role = "admin" | "translator" | "reader";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  /**
   * True when the person can read the page text of the reader pages: a translator, an admin, or a reader that an admin approved
   * (round 63 answer 4, Q-A 2026-10-28 l308). A new sign-up is a reader with approved false.
   */
  approved: boolean;
}

/** One finished run of a page. */
export interface HtvRun {
  runId: string;
  /** started_utc of run.json. */
  startedUtc: string;
  /** status of summary.json, for example completed or completed with failures. */
  status: string;
  verdict: "PASS" | "FAIL";
  score: number | null;
}

/** One row of the page list. */
export interface HtvPageRow {
  pageId: string;
  slug: string;
  page: string;
  bookTitle: string;
  verdict: "PASS" | "FAIL";
  score: number | null;
  shownRunId: string;
  /** True when an admin run mark picks the shown run. */
  marked: boolean;
  runCount: number;
}

/** A term mark with offsets that count characters (code points) of the row text. */
export interface TermMark {
  start: number;
  end: number;
  markId: string;
  entryId: string;
  surface: string;
  /** Result of the EN form check for this mark (follows, breaks, or note), or null when the file has no item for it. */
  result: string | null;
  detail: string | null;
}

export interface HtvRow {
  key: string;
  /** Short form of the key, for example L01-L08. */
  shortKey: string;
  part: "lines" | "block_title";
  tsIds: string[];
  ja: string;
  /** ED_3 text of the shown run. Empty when no ED_3 item cites the group (round 51 answer 15). */
  ed3: string;
  jaMarks: TermMark[];
  edMarks: TermMark[];
}

export interface TermLang {
  lang: string;
  terms: { term: string; preferred: boolean; agentWritten: boolean }[];
  definitions: { text: string; agentWritten: boolean }[];
}

export interface TermEntry {
  id: string;
  headword: string;
  readings: string[];
  romaji: string;
  common: string;
  langs: TermLang[];
}

export interface HtvPageData {
  pageId: string;
  slug: string;
  page: string;
  bookTitle: string;
  verdict: "PASS" | "FAIL";
  score: number | null;
  runId: string;
  startedUtc: string;
  status: string;
  runs: HtvRun[];
  /** Run ID of the admin run mark, or null. */
  markedRunId: string | null;
  /** Plain note when the mark names a run that is not finished. */
  markNote: string;
  rows: HtvRow[];
  panel: PanelData;
  terms: Record<string, TermEntry>;
  /** Plain notes about missing files of an old run. */
  notes: string[];
}

/** One saved version of a page: every Save writes one record for every row, all with the same number. */
export interface VersionInfo {
  version: number;
  /** PocketBase time text of the first record of the version. */
  created: string;
  runId: string;
  rows: number;
  /** Count of rows with the agree tick (round 58 answer 4). */
  agreed: number;
}

export interface SavedRow {
  groupKey: string;
  text: string;
  /** True when the translator ticked "Agree with the agent text" for this row. */
  agree: boolean;
  runId: string;
  jaText: string;
  /** Agent text (ED_3) of the run that the row was saved for. */
  ed3Text: string;
}

export interface CommentView {
  id: string;
  userName: string;
  mine: boolean;
  groupKey: string;
  runId: string;
  text: string;
  shared: boolean;
  created: string;
  updated: string;
}

// ---------------------------------------------------------------- book screen (unit UXC, round 59)

/** One row of the book list. */
export interface HtvBookRow {
  slug: string;
  /** English title, else Japanese title. "" when the book has no title. */
  title: string;
  /** English title (unit VW109). */
  titleEn: string;
  /** Japanese title (unit VW109). */
  titleJa: string;
  /** Page count of the book (catalog_items.pages or items.filled.jsonl). */
  pages: number;
  /** Count of pages with a finished run. */
  tagged: number;
  /** Unit VW112: the page numbers with a finished run, sorted. The fold tree of /translate counts them by month (lib/translate-dash.ts). */
  taggedPages?: number[];
}

/** Tag of a page with an agent translation: the shown run, its verdict and score. Pages without a tag have no entry. */
export interface HtvPageTag {
  /** Page number, for example 48 for p048. */
  n: number;
  verdict: "PASS" | "FAIL";
  score: number | null;
  shownRunId: string;
  marked: boolean;
}

/** A month heading of a magazine year (collection magazine_chapters or magazine-chapters.jsonl). */
export interface ChapterHead {
  chapter: string;
  /** Month number 1 to 12, or null for the front chapter. */
  month: number | null;
  year: number | null;
  titleEn: string;
  pageStart: number;
  pageEnd: number;
}

/** The page index of a book: the data that the server sends at once. */
export interface HtvBookIndex {
  slug: string;
  /** English title, else Japanese title. "" when the book has no title. */
  title: string;
  /** English title (unit VW109). */
  titleEn: string;
  /** Japanese title (unit VW109). */
  titleJa: string;
  /** Count of page sections. */
  pages: number;
  /** Digits of a page ID: 3, or 4 when the book has more than 999 pages (pages.py id_digits). */
  digits: number;
  tags: HtvPageTag[];
  chapters: ChapterHead[];
}

/** The loaded data of one page section: the page data (null when the page has no finished run) and the saved data of the user. */
export interface HtvBookPage {
  n: number;
  pageId: string;
  data: HtvPageData | null;
  versions: VersionInfo[];
  rows: SavedRow[];
  comments: CommentView[];
  /** Plain note when PocketBase did not give the saved data. */
  pbNote: string;
}
