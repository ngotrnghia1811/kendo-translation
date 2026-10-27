// Shared types. No server imports here, so client components can use them.

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
  startedEpoch: number | null;
  updatedEpoch: number | null;
  pausedSinceEpoch: number | null;
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
  minutes: number | null;
  qa3Verdict: string | null;
  qa3Score: number | null;
  href: string;
}

export interface RunDetail extends RunSummary {
  elapsedBeforeSeconds: number;
  pauseSecondsTotal: number;
  pausedSinceUtc: string | null;
  pauseFileExists: boolean;
  pages: RunPageRow[];
  serverTimeEpoch: number;
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
  mark: string;
  reason: string;
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
  wallSeconds: number | null;
  modelCalls: number | null;
  failedCalls: string[];
  flaggedCalls: string[];
  ed: StageText[];
  qa: QaStage[];
  critiqueCounts: CritiqueCount[];
  imagePath: string | null;
  bookTitle: string;
}
