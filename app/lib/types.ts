// Shared types. No server imports here, so client components can use them.
import type { TokenCounts, TokenSum } from "./tokens-sum"; // type only (unit VW93): erased at run time

export type ListState = string; // running, paused, completed, completed with failures, interrupted, ...

export interface RunSummary {
  stamp: string;
  state: ListState;
  pagesDone: number;
  pagesTotal: number;
  callsDone: number;
  callsTotal: number;
  callsFailed: number;
  callsFlagged: number;
  costModelsUsd: number;
  costListedUsd: number;
  /** Unit VW93 (Q-A 3:15.2): key "tokens" of progress.json, with calls_done as the calls count. Null in an older list with no such key. */
  tokens: TokenCounts | null;
  startedEpoch: number | null;
  updatedEpoch: number | null;
  pausedSinceEpoch: number | null;
  /** "chain" for a list from run-chain (key kind in progress.json). "book-run" for a list folder of run-book (unit VW77e). Every other list is "list". */
  listKind: "chain" | "book-run" | "list";
  /** Critic mode from list.json. Null when the key is absent (a list from before the critic mode). */
  criticMode: string | null;
  /** Count of books that run at the same time (key book_jobs). Null when the key is absent. */
  bookJobs: number | null;
}

export interface RunPageRow {
  pageId: string; // "slug/pNNN"
  kind: string;
  state: string;
  runFolder: string; // folder name, e.g. 20261026T190914Z-r41
  callsDone: number;
  callsTotal: number;
  callsFailed: number;
  running: string[];
  usd: number;
  /** Unit VW93: key "tokens" of the page row in progress.json, with calls_done as the calls count. Null in an older list. */
  tokens: TokenCounts | null;
  minutes: number | null;
  qa3Verdict: string | null;
  qa3Score: number | null;
  href: string;
  /** Text of skipped_reason in progress.json. Null when the page was not skipped. */
  skippedReason: string | null;
  /** Failure lists of the page row in list-summary.json. Null when the file has no such key (old file). */
  forwardFailures: string[] | null;
  criticFailures: string[] | null;
  /** Key book_memory of the page row in list-summary.json (chain pages only). */
  bookMemory: PageBookMemory | null;
  /** Unit VW94 (Q-A 3:17.4): readable name of the article of a page ID that starts with 8 hex digits. Missing or null for other pages. */
  article?: RunPageArticle | null;
  /** Unit VW94 (Q-A 3:17.5): an earlier list of the same phase 2 run accepted this page. Missing or null otherwise. */
  acceptedBefore?: RunPageAcceptedBefore | null;
}

/** Unit VW94: the article of a page row. `title` is "title not found" when no single item matches the short ID. */
export interface RunPageArticle {
  shortId: string;
  title: string;
  titleJa: string | null;
  found: boolean;
  /** "page 1 of 3" */
  pageOf: string | null;
}

/** Unit VW94: the mark "accepted before restart" of a page row. */
export interface RunPageAcceptedBefore {
  text: string;
  verdict: string | null;
  runFolder: string | null;
  href: string;
}

export interface PageBookMemory {
  verdict: string | null;
  written: boolean | null;
  pairs: number | null;
  marks: number | null;
}

/** One row of the chains table in list.json (or list-summary.json). */
export interface ChainRow {
  book: string;
  pages: string[];
  state: string;
  accepted: string[];
  memoryFile: string;
  memoryPairs: number | null;
  /** Count of failed box-critic calls (unit T4). Null when the key is absent. */
  criticFailures: number | null;
}

export interface RunDetail extends RunSummary {
  noCritic: boolean | null;
  noVoyage: boolean | null;
  /** The chains table. Null when the list is not a chain list or has no chains key. */
  chains: ChainRow[] | null;
  elapsedBeforeSeconds: number;
  pauseSecondsTotal: number;
  pausedSinceUtc: string | null;
  pauseFileExists: boolean;
  pages: RunPageRow[];
  serverTimeEpoch: number;
  /** Unit VW94 (Q-A 3:17.5): a line about the phase 2 run of this list and its restarts. Missing or null for other lists. */
  phase2Note?: string | null;
  /** Unit VW94 fix round (Q-A 3:17.4): true for a list of the phase 2 run (book paired-dataset). The run view heading uses it. */
  phase2List?: boolean;
}

export interface BookPage {
  pageId: string;
  pageName: string; // pNNN
  runFolder: string;
  verdict: string | null;
  score: number | null;
}

export interface BookRow {
  id: string; // slug or article ID
  group: "book" | "magazine" | "article";
  titleJa: string;
  titleEn: string;
  author: string;
  publisher: string;
  year: number | null;
  confidence: string;
  pages: number | null;
  pagesWithRuns: BookPage[];
  /** True when items.filled.jsonl (or items.draft.jsonl) has a row for the item. The row itself loads on request (/api/books/<id>). */
  hasMeta: boolean;
  /** Count of month chapters of a magazine year. Null for every other group. */
  chapterCount: number | null;
}

/** Key web_link of an article row in magazine-chapters.jsonl (unit M2). */
export interface WebLink {
  recordId: string;
  titleJa: string;
  titleEn: string;
  url: string;
  total: number | null;
  status: string;
}

/** One candidate of a web row in web-magazine-candidates.jsonl. */
export interface WebCandidate {
  book: string;
  chapter: string;
  order: number | null;
  titleJa: string;
  titleEn: string;
  pageStart: number | null;
  pageEnd: number | null;
  pageGuess: boolean;
  total: number | null;
}

/** One row of web-magazine-candidates.jsonl. link and linkStatus come from unit M2. An old file has neither. */
export interface WebRow {
  recordId: string;
  titleJa: string;
  titleEn: string;
  url: string;
  stampText: string;
  status: string;
  candidates: WebCandidate[];
  /** Key link: the one table of contents entry of the best match. Null when the row has no link or the key is absent. */
  link: { book: string; chapter: string; order: number | null; titleJa: string; total: number | null } | null;
  /** Key link_status. Null when the key is absent. */
  linkStatus: string | null;
}

/** What /api/books/<id> returns: the Details part of one Books row. */
export interface BookDetail {
  id: string;
  group: "book" | "magazine" | "article";
  meta: Record<string, unknown> | null;
  /** Month chapters of a magazine year. Null when the file magazine-chapters.jsonl is absent or empty. Other groups: null. */
  chapters: ChapterRow[] | null;
  /** Web rows that point at one chapter, by chapter ID. Empty for other groups. */
  web: Record<string, ChapterWeb>;
  /** True when the web candidate file exists and has rows. */
  webFileFound: boolean;
}

/** The web rows of one chapter. linked: rows whose link points at the chapter. other: rows with a candidate in the chapter but no link there. */
export interface ChapterWeb {
  linked: WebRow[];
  other: WebRow[];
}

export interface ChapterArticle {
  order: number | null;
  seriesJa: string;
  titleJa: string;
  titleEn: string;
  titleEnStatus: string; // "draft" or another status text
  pageStart: number | null;
  pageEnd: number | null;
  pageGuess: boolean;
  /** Key web_link (unit M2). Null when the key is absent or null. */
  webLink: WebLink | null;
}

export interface ChapterRow {
  book: string; // item_id of the magazine year
  bookTitleEn: string;
  year: number | null;
  month: number | null; // null for the front chapter
  chapter: string;
  chapterTitleEn: string;
  chapterTitleJa: string;
  pageStart: number | null;
  pageEnd: number | null;
  pageCount: number | null;
  articleCount: number;
  articles: ChapterArticle[];
}

export interface BoxItem {
  id: string;
  section: string;
  text: string;
  jaRefs: string[];
  jaText: string;
}

export interface StageText {
  box: string; // ED_0
  items: BoxItem[];
  termList: { ja: string; en: string }[];
  reasoning: string;
}

export interface QaIssue {
  id: string;
  row: number | null;
  severity: number | null;
  jaPiece: string;
  enPiece: string;
  reason: string;
  suspectedStage: string;
}

export interface QaMark {
  target: string;
  mark: string; // confirmed, false_alarm (old), still_in_ed, not_in_ed (new), or any other text
  reason: string;
  /** Issue ID of the QA box itself for a still_in_ed mark. Null for old marks and program marks. */
  ownIssueId: string | null;
}

export interface QaStage {
  box: string; // QA_0
  verdict: string | null;
  score: number | null;
  penalty: number | null;
  cells: { row: number; name: string; value: number }[];
  issues: QaIssue[];
  marks: QaMark[];
  programMarks: QaMark[];
  reasoning: string;
}

export interface CritiqueCount {
  boxType: string;
  critiques: number;
  n: number | null;
  reachedN: boolean | null;
  note: string;
}

export interface PageData {
  pageId: string;
  slug: string;
  pageName: string;
  kind: string;
  runFolder: string;
  runRel: string; // path relative to the data folder
  runFolders: string[];
  status: string;
  failures: string[];
  costModelsUsd: number | null;
  costListedUsd: number | null;
  /** Unit VW93: the tokens of the model calls in calls.jsonl (summary.json "tokens" when calls.jsonl has no model call). `tokens` null: no token data. */
  tokenSum: TokenSum;
  wallSeconds: number | null;
  modelCalls: number | null;
  failedCalls: string[];
  flaggedCalls: string[];
  ed: StageText[];
  qa: QaStage[];
  critiqueCounts: CritiqueCount[];
  imagePath: string | null;
  bookTitle: string;
  /** Key critic_mode of summary.json. Null in an old file. */
  criticMode: string | null;
  /** Key critic_session of summary.json (session mode only). */
  criticSession: CriticSession | null;
  /** Key book_memory of summary.json (chain pages only). */
  bookMemory: PageBookMemory | null;
  /** Folder names critic-<mode>-<stamp> inside the run folder (output of the command critic-only), newest first. */
  criticOnlyFolders: string[];
}

export interface CriticSession {
  criticMode: string;
  turnMessage: string;
  sessionIds: string[];
  restarts: number;
  turns: number | null;
}
