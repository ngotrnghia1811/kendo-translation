// Types of the human-translation-view. Shared by server code and client components. No runtime code.
import type { PanelData } from "./htv-panel";

/** Roles of section 4 of the Viewer vision. The v1 value qa has no meaning in v2 and counts as reader (section 15.12.2). */
export type Role = "admin" | "translator" | "reader";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
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
}

export interface SavedRow {
  groupKey: string;
  text: string;
  runId: string;
  jaText: string;
}

export interface CommentView {
  id: string;
  userId: string;
  userName: string;
  mine: boolean;
  groupKey: string;
  runId: string;
  text: string;
  shared: boolean;
  created: string;
  updated: string;
}
