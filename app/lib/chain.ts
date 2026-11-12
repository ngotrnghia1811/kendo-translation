// Pure parsing for the book chain screens (unit V2, round 48 answer 9, Q-A 2026-10-27 l55).
// No file access and no server import here, so a test can call every function.
// Every reader accepts a file without the new keys. A missing key gives null or an empty list, never an error.
// The Translator code that writes each file: translator_run.py (chain_table, list_summary_doc, run_page, critic_only_page),
// translator/book_memory.py (memory_rows), translator/messages.py (block_* functions), critic_compare.py (build).

import type { ChainRow, PageBookMemory, CriticSession, WebCandidate, WebRow } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
}

function isObj(v: unknown): v is Record<string, J> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

// ---------------------------------------------------------------- list files

/**
 * "chain" when the list file or progress.json holds kind "chain". "book-run" when it holds kind "book-run" (the list folder of run-book, unit VW77e, Q-A 3:11.3 V4).
 * Every other list, also an old one, is "list".
 */
export function listKindOf(...docs: unknown[]): "chain" | "book-run" | "list" {
  if (docs.some((d) => isObj(d) && d.kind === "chain")) return "chain";
  return docs.some((d) => isObj(d) && d.kind === "book-run") ? "book-run" : "list";
}

/** The first string value of a key in the given list files. Null when no file has the key. */
export function firstString(key: string, ...docs: unknown[]): string | null {
  for (const d of docs) {
    if (isObj(d) && typeof d[key] === "string" && d[key] !== "") return d[key] as string;
  }
  return null;
}

export function firstNumber(key: string, ...docs: unknown[]): number | null {
  for (const d of docs) {
    if (isObj(d) && num(d[key]) !== null) return num(d[key]);
  }
  return null;
}

export function firstBool(key: string, ...docs: unknown[]): boolean | null {
  for (const d of docs) {
    if (isObj(d) && typeof d[key] === "boolean") return d[key] as boolean;
  }
  return null;
}

/**
 * The chains table of list.json or list-summary.json: {book, pages, state, accepted, memory_file, memory_pairs}.
 * Unit T4 adds critic_failures (a count). A row without a string book is skipped. Null when the key chains is not a list.
 */
export function parseChains(v: unknown): ChainRow[] | null {
  if (!Array.isArray(v)) return null;
  const out: ChainRow[] = [];
  for (const r of v as J[]) {
    if (!isObj(r) || typeof r.book !== "string" || r.book === "") continue;
    const list = (x: unknown): string[] => (Array.isArray(x) ? x.map(String) : []);
    out.push({
      book: r.book,
      pages: list(r.pages),
      state: str(r.state) || "unknown",
      accepted: list(r.accepted),
      memoryFile: str(r.memory_file),
      memoryPairs: num(r.memory_pairs),
      criticFailures: num(r.critic_failures),
    });
  }
  return out;
}

/** Key book_memory of a page row or a page summary: {verdict, written, pairs, marks, ...}. Null when absent. */
export function parseBookMemory(v: unknown): PageBookMemory | null {
  if (!isObj(v)) return null;
  return {
    verdict: typeof v.verdict === "string" ? v.verdict : null,
    written: typeof v.written === "boolean" ? v.written : null,
    pairs: num(v.pairs),
    marks: num(v.marks),
  };
}

/** A list of failure texts. Null when the key is absent, so the caller can tell "no failure" from "old file". */
export function failureList(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
}

// ---------------------------------------------------------------- book translation memory

export interface MemoryPair {
  pairId: string;
  part: string;
  ja: string;
  en: string;
  runId: string;
  writtenAt: string;
  edIndex: number | null;
  split: string | null;
}

export interface MemoryPage {
  pageId: string;
  pairs: MemoryPair[];
}

/**
 * Rows of book-memory/<book>.jsonl, grouped by page in file order.
 * Row keys: book, page_id, run_id, split, pair_id, ja, en, part, ed_index, written_at (translator/book_memory.py memory_rows).
 * A row without a page_id goes to the page "unknown". An old row without part shows part "".
 */
export function parseMemoryRows(rows: unknown[]): MemoryPage[] {
  const pages: MemoryPage[] = [];
  const byId = new Map<string, MemoryPage>();
  for (const r of rows as J[]) {
    if (!isObj(r)) continue;
    const pageId = str(r.page_id) || "unknown";
    let pg = byId.get(pageId);
    if (!pg) {
      pg = { pageId, pairs: [] };
      byId.set(pageId, pg);
      pages.push(pg);
    }
    pg.pairs.push({
      pairId: str(r.pair_id),
      part: str(r.part),
      ja: str(r.ja),
      en: str(r.en),
      runId: str(r.run_id),
      writtenAt: str(r.written_at),
      edIndex: num(r.ed_index),
      split: typeof r.split === "string" ? r.split : null,
    });
  }
  return pages;
}

/**
 * The memory file of a chain row. The file lies in the list folder: book-memory/<book>.jsonl (run_chain).
 * Return the path relative to the data folder, or null when the book name is not one safe segment.
 */
export function memoryPathInList(listRel: string, book: string): string | null {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(book) && !book.includes("..") ? `${listRel}/book-memory/${book}.jsonl` : null;
}

/** A memory_file text from a chains row ("data/<...>/book-memory/<name>.jsonl") as a path relative to the data folder. Null if the shape differs. */
export function memoryPathFromRow(memoryFile: string): string | null {
  const rel = memoryFile.replace(/^\/+/, "").replace(/^data\//, "");
  return /^([A-Za-z0-9][A-Za-z0-9._-]*\/)+book-memory\/[A-Za-z0-9][A-Za-z0-9._-]*\.jsonl$/.test(rel) && !rel.includes("..") ? rel : null;
}

// ---------------------------------------------------------------- chain inputs of a box message

export const CHAIN_BLOCKS = ["previous_page_pair", "book_translation_memory", "earlier_term_marks"] as const;
export type ChainBlockName = (typeof CHAIN_BLOCKS)[number];

/**
 * The text between the line "[BLOCK name]" and the line "[END name]" of a message file (messages/<box>.txt).
 * A line counts only when it holds the marker alone, so a rule sentence that names the block does not match.
 * Return null when the message has no such block. A block without an end line runs to the end of the text.
 */
export function cutBlock(text: string, name: string): string | null {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trimEnd() === `[BLOCK ${name}]`);
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && l.trimEnd() === `[END ${name}]`);
  return lines.slice(start + 1, end < 0 ? lines.length : end).join("\n");
}

export type ChainBlocks = Record<ChainBlockName, string | null>;

export function cutChainBlocks(text: string): ChainBlocks {
  return {
    previous_page_pair: cutBlock(text, "previous_page_pair"),
    book_translation_memory: cutBlock(text, "book_translation_memory"),
    earlier_term_marks: cutBlock(text, "earlier_term_marks"),
  };
}

/** The first line of the block previous_page_pair is "from: <box> on page <page ID>" (messages.py block_previous_page_pair). */
export function previousPageOf(block: string | null): { box: string; pageId: string } | null {
  if (!block) return null;
  const m = /^from: (\S+) on page (\S+)\s*$/m.exec(block);
  return m ? { box: m[1], pageId: m[2] } : null;
}

/** "pairs_found: 3" in the block book_translation_memory. Null when the line is absent. */
export function pairsFound(block: string | null): number | null {
  if (!block) return null;
  const m = /^pairs_found: (\d+)\s*$/m.exec(block);
  return m ? Number(m[1]) : null;
}

/** "pages_read: 2" in the block earlier_term_marks. Null when the line is absent. */
export function pagesRead(block: string | null): number | null {
  if (!block) return null;
  const m = /^pages_read: (\d+)\s*$/m.exec(block);
  return m ? Number(m[1]) : null;
}

// ---------------------------------------------------------------- critic mode on a page

/** Keys of a calls.jsonl row in session mode. The separate mode and old files have none of them: every field is null. */
export interface SessionCallFields {
  criticMode: string | null;
  sessionTurn: number | null;
  sessionTurnMessage: string | null;
  sessionId: string | null;
  sessionRestart: string | null;
  sessionFirstMessage: boolean | null;
}

export function sessionFields(row: unknown): SessionCallFields {
  const r: J = isObj(row) ? row : {};
  return {
    criticMode: typeof r.critic_mode === "string" ? r.critic_mode : null,
    sessionTurn: num(r.session_turn),
    sessionTurnMessage: typeof r.session_turn_message === "string" ? r.session_turn_message : null,
    sessionId: typeof r.session_id === "string" ? r.session_id : null,
    // session_restart is a text (for example "export unreadable ...") or null.
    sessionRestart: r.session_restart === null || r.session_restart === undefined || r.session_restart === false ? null : str(r.session_restart),
    sessionFirstMessage: typeof r.session_first_message === "boolean" ? r.session_first_message : null,
  };
}

/** Key critic_session of summary.json: {critic_mode, session_turn_message, session_ids, session_restarts, turns}. Null when absent. */
export function parseCriticSession(v: unknown): CriticSession | null {
  if (!isObj(v)) return null;
  return {
    criticMode: str(v.critic_mode) || "session",
    turnMessage: str(v.session_turn_message),
    sessionIds: Array.isArray(v.session_ids) ? v.session_ids.map(String) : [],
    restarts: Array.isArray(v.session_restarts) ? v.session_restarts.length : 0,
    turns: num(v.turns),
  };
}

/** Folder names "critic-<mode>-<stamp>" of a page run folder, newest stamp first. */
export function criticOnlyFolders(names: string[]): string[] {
  return names
    .filter((n) => /^critic-(separate|session)-\d{8}T\d{6}Z$/.test(n))
    .sort((a, b) => (a.slice(a.lastIndexOf("-") + 1) < b.slice(b.lastIndexOf("-") + 1) ? 1 : -1));
}

export interface CriticOnlySummary {
  folder: string;
  mode: string;
  status: string;
  critiquesTotal: number | null;
  byBoxType: { boxType: string; critiques: number }[];
  modelCalls: number | null;
  failedCalls: string[];
  costUsd: number | null;
  seconds: number | null;
  session: CriticSession | null;
  plan: boolean;
  /** False when the folder has no summary.json (the run did not finish). */
  hasSummary: boolean;
}

/** One critic-<mode>-<stamp>/summary.json (translator_run.py critic_summary). A null summary gives a row with hasSummary false. */
export function parseCriticOnlySummary(folder: string, s: unknown): CriticOnlySummary {
  const m = /^critic-(separate|session)-/.exec(folder);
  const d: J = isObj(s) ? s : {};
  const cbt: J = isObj(d.critiques_by_box_type) ? d.critiques_by_box_type : {};
  return {
    folder,
    mode: typeof d.critic_mode === "string" ? d.critic_mode : m ? m[1] : "",
    status: str(d.status),
    critiquesTotal: num(d.critiques_total),
    byBoxType: Object.entries(cbt).map(([boxType, v]) => ({ boxType, critiques: num((v as J)?.critiques) ?? 0 })),
    modelCalls: num(d.model_calls),
    failedCalls: Array.isArray(d.failed_calls) ? d.failed_calls.map(String) : [],
    costUsd: num(d.cost_usd_models),
    seconds: num(d.seconds_model_calls),
    session: parseCriticSession(d.critic_session),
    plan: d.plan === true,
    hasSummary: isObj(s),
  };
}

// ---------------------------------------------------------------- compare table (critic_compare.py)

export interface CompareVariantTotals {
  variant: string;
  pages: number | null;
  critiques: number | null;
  byBoxType: { TS: number | null; TL: number | null; ED: number | null; QA: number | null };
  citingIssues: number | null;
  citingOtherQa: number | null;
  calls: number | null;
  failedCalls: number | null;
  jsonRepairs: number | null;
  retries: number | null;
  sessionRestarts: number | null;
  costUsd: number | null;
  seconds: number | null;
}

export interface CompareView {
  /** Name of the folder critic-compare/<name>/. */
  folder: string;
  generatedUtc: string;
  inputs: string[];
  rule: string;
  /** Totals over all pages, in the order of the key variants. */
  all: CompareVariantTotals[];
  /** Totals over the pages that every variant covers. Same variants. */
  common: CompareVariantTotals[];
  pageCount: number;
  commonPageCount: number;
}

function totalsOf(variant: string, t: unknown): CompareVariantTotals {
  const d: J = isObj(t) ? t : {};
  const b: J = isObj(d.by_box_type) ? d.by_box_type : {};
  return {
    variant,
    pages: num(d.pages),
    critiques: num(d.critiques),
    byBoxType: { TS: num(b.TS), TL: num(b.TL), ED: num(b.ED), QA: num(b.QA) },
    citingIssues: num(d.critiques_citing_issues),
    citingOtherQa: num(d.critiques_citing_other_qa_level),
    calls: num(d.calls),
    failedCalls: num(d.failed_calls),
    jsonRepairs: num(d.json_repairs),
    retries: num(d.retries),
    sessionRestarts: num(d.session_restarts),
    costUsd: num(d.cost_usd),
    seconds: num(d.seconds),
  };
}

/**
 * The compare.json keys: generated_utc, inputs, rule_other_qa_level, variants, page_order, common_pages, pages, totals,
 * totals_common_pages. The per-page table (key pages) is not read: the run view shows totals only.
 * Return null when the document has no variants or no totals.
 */
export function parseCompare(folder: string, doc: unknown): CompareView | null {
  if (!isObj(doc) || !Array.isArray(doc.variants) || !isObj(doc.totals)) return null;
  const variants = doc.variants.map(String);
  const common: J = isObj(doc.totals_common_pages) ? doc.totals_common_pages : {};
  return {
    folder,
    generatedUtc: str(doc.generated_utc),
    inputs: Array.isArray(doc.inputs) ? doc.inputs.map(String) : [],
    rule: str(doc.rule_other_qa_level),
    all: variants.map((v) => totalsOf(v, (doc.totals as J)[v])),
    common: variants.filter((v) => v in common).map((v) => totalsOf(v, common[v])),
    pageCount: Array.isArray(doc.page_order) ? doc.page_order.length : 0,
    commonPageCount: Array.isArray(doc.common_pages) ? doc.common_pages.length : 0,
  };
}

/**
 * True when a compare belongs to a list stamp.
 * The brief names the folder critic-compare/<stamp>/. The script names it by the time of the compare (critic_compare.py l53, l312),
 * and lists the input folders inside compare.json. So a compare matches when the folder name equals the stamp
 * or one input path ends with the list folder name.
 */
export function compareMatchesList(folder: string, doc: unknown, stamp: string): boolean {
  if (folder === stamp) return true;
  if (!isObj(doc) || !Array.isArray(doc.inputs)) return false;
  return doc.inputs.some((i: unknown) => typeof i === "string" && i.replace(/\/+$/, "").split("/").pop() === stamp);
}

// ---------------------------------------------------------------- web candidates (unit M2)

function candidate(c: J): WebCandidate {
  return {
    book: str(c?.book),
    chapter: str(c?.chapter),
    order: num(c?.order),
    titleJa: str(c?.title_ja),
    titleEn: str(c?.title_en),
    pageStart: num(c?.page_start),
    pageEnd: num(c?.page_end),
    pageGuess: c?.page_guess === true,
    total: num(c?.total),
  };
}

/**
 * Rows of item-metadata/web-magazine-candidates.jsonl.
 * Old keys: record_id, stamp_text, title_ja, title_en, url, candidates, status.
 * New keys of unit M2: link ({book, chapter, order, title_ja, total} or null) and link_status (a text).
 */
export function parseWebRows(rows: unknown[]): WebRow[] {
  const out: WebRow[] = [];
  for (const r of rows as J[]) {
    if (!isObj(r) || typeof r.record_id !== "string") continue;
    const l: J = r.link;
    out.push({
      recordId: r.record_id,
      titleJa: str(r.title_ja),
      titleEn: str(r.title_en),
      url: str(r.url),
      stampText: str(r.stamp_text),
      status: str(r.status),
      candidates: Array.isArray(r.candidates) ? r.candidates.filter(isObj).map(candidate) : [],
      link: isObj(l) && typeof l.chapter === "string" ? { book: str(l.book), chapter: l.chapter, order: num(l.order), titleJa: str(l.title_ja), total: num(l.total) } : null,
      linkStatus: typeof r.link_status === "string" ? r.link_status : null,
    });
  }
  return out;
}

/**
 * The web rows of one chapter. linked: the link points at the chapter. other: no link there, but a candidate lies in the chapter
 * (round 48 note l60: only the best web match links to an entry, the other web articles of the entry keep the candidate list).
 * Both lists keep the file order. A row never sits in both lists.
 */
export function webRowsOfChapter(rows: WebRow[], chapter: string): { linked: WebRow[]; other: WebRow[] } {
  const linked: WebRow[] = [];
  const other: WebRow[] = [];
  for (const r of rows) {
    if (r.link && r.link.chapter === chapter) linked.push(r);
    else if (r.candidates.some((c) => c.chapter === chapter)) other.push(r);
  }
  return { linked, other };
}
