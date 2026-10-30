// Pure build code of the human-translation-view (unit S2C, round 56).
// It turns the parsed files of one run into the rows, the panel, the terms, and the notes of a page.
// Two callers use it: app/lib/htv-runs.ts (source "files") and app/scripts/sync-runs.mjs (the sync command S2).
// So the rules exist once and a snapshot equals the page that the files give (VISION-viewer 15.14.7).
// The file has no fs and no server-only marker. Its relative imports have no extension, like all app files.
// Plain Node loads it through the resolve hook in app/scripts/ts-resolve-hook.mjs.

import { edForGroups, groupKey, placeMarks, sentenceGroups } from "./htv-groups";
import { parseTl3Message } from "./htv-panel";
import type { PanelData } from "./htv-panel";
import type { HtvRow, HtvRun, TermEntry, TermLang, TermMark } from "./htv-types";
import type { ReaderExtra, ReaderMark, ReaderRow } from "./reader-types";
import { searchColumns } from "./reader-search";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

/** Format number of the snapshot (VISION-viewer 15.14.3, shape A). Change it when the build output changes its shape. */
export const SNAPSHOT_FORMAT = 1;

/** A run folder name starts with a time stamp. Plan runs (plan-...) never match. */
export const RUN_FOLDER_RULE = /^\d{8}T\d{6}Z/;

/**
 * The finished-run rule (round 53 answer 8, Q-A l102): summary.json holds qa.QA_3.verdict (PASS or FAIL) and the files
 * results/TS_3.json and results/ED_3.json exist. The status text does not matter. Returns null when the run is not finished.
 */
export function finishedRunOf(runId: string, summary: J, runJson: J, hasTs3: boolean, hasEd3: boolean): HtvRun | null {
  const q3 = summary?.qa?.QA_3;
  const verdict = q3?.verdict;
  if (verdict !== "PASS" && verdict !== "FAIL") return null;
  if (!hasTs3 || !hasEd3) return null;
  return {
    runId,
    startedUtc: typeof runJson?.started_utc === "string" ? runJson.started_utc : "",
    status: String(summary?.status ?? ""),
    verdict,
    score: typeof q3?.page_score === "number" ? q3.page_score : null,
  };
}

/** Newest first: the largest started_utc, then the folder name (round 54 answer 10, Q-A l129). */
export function sortRuns(runs: HtvRun[]): HtvRun[] {
  return runs.sort((a, b) => (a.startedUtc < b.startedUtc ? 1 : a.startedUtc > b.startedUtc ? -1 : a.runId < b.runId ? 1 : a.runId > b.runId ? -1 : 0));
}

function parts(r: J): J {
  return r?.after_program_step ?? r?.model_result ?? {};
}

/** Compact form of a termbase entry for the pop-up (round 51 answer 14, Q-A l59: first definition, expand for the full entry). */
export function termEntryView(e: J): TermEntry {
  const langs: TermLang[] = ((e.langSec ?? []) as J[]).map((ls) => ({
    lang: String(ls.lang ?? ""),
    terms: ((ls.termSec ?? []) as J[]).map((t) => ({
      term: String(t.term ?? ""),
      preferred: t.administrativeStatus === "preferredTerm-admn-sts",
      agentWritten: t["x-agent-written"] === true,
    })),
    definitions: ((ls.definition ?? []) as J[]).map((d) => ({ text: String(d.text ?? ""), agentWritten: d["x-agent-written"] === true })),
  }));
  const romajiPref = e["x-romaji-preferred"]?.text;
  const romaji = typeof romajiPref === "string" && romajiPref ? romajiPref : String(e["x-romaji"]?.[0]?.text ?? "");
  return {
    id: String(e.id),
    headword: String(e["x-headword"] ?? ""),
    readings: ((e["x-readings"] ?? []) as J[]).map((r) => String(r.text ?? "")).filter(Boolean),
    romaji,
    common: String(e["x-common"]?.value ?? ""),
    langs,
  };
}

/** The parsed files of one run. A missing file is null. `termbase` maps entry ID to the raw entry and is empty when the file is missing. */
export interface RunFiles {
  ts3: J | null;
  ed3: J | null;
  termMarks: J | null;
  enFormCheck: J | null;
  tl3Message: string | null;
  termbase: Map<string, J>;
}

export interface BuiltRun {
  rows: HtvRow[];
  panel: PanelData;
  terms: Record<string, TermEntry>;
  notes: string[];
}

/** Build the rows, the panel, the terms, and the notes of one run. The page ID has the form slug/pNNN. */
export function buildRun(pageId: string, files: RunFiles): BuiltRun {
  const notes: string[] = [];

  const ts = parts(files.ts3);
  const ed = parts(files.ed3);
  const groups = sentenceGroups(ts);
  const edRows = edForGroups(groups, ed);

  const jaText = new Map<string, string>();
  for (const part of ["lines", "block_title"]) for (const it of (ts[part] ?? []) as J[]) jaText.set(String(it.item_id), String(it.text ?? ""));

  const marksFile = files.termMarks;
  const checkFile = files.enFormCheck;
  if (!marksFile) notes.push("This run has no term marks file, so the page shows no term highlight.");
  const marks = ((marksFile?.marks ?? []) as J[]).filter((m) => m && m.ja);
  const checks = new Map<string, J>();
  for (const c of (checkFile?.items ?? []) as J[]) checks.set(`${c.entry_id}|${c.ja_item}`, c);

  const rows: HtvRow[] = groups.map((g, gi) => {
    const placed = placeMarks(g, jaText, edRows[gi], marks, checks);
    const key = groupKey(pageId, g);
    return {
      key,
      shortKey: key.slice(key.lastIndexOf("/") + 1),
      part: g.part,
      tsIds: g.ts_ids,
      ja: g.ja,
      ed3: edRows[gi].text,
      jaMarks: placed.ja,
      edMarks: placed.en,
    };
  });

  // Termbase entries that the marks of this page cite.
  const terms: Record<string, TermEntry> = {};
  const wanted = new Set(marks.map((m) => String(m.entry_id)));
  if (wanted.size > 0) {
    for (const id of wanted) {
      const e = files.termbase.get(id);
      if (e) terms[id] = termEntryView(e);
    }
    if (files.termbase.size === 0) notes.push("The termbase file is missing, so the term pop-up has no entry text.");
  }

  const panel = parseTl3Message(files.tl3Message);
  return { rows, panel, terms, notes };
}

/** Parse the lines of termbase.draft.jsonl into a map of entry ID to entry. A broken line is skipped. */
export function parseTermbase(text: string): Map<string, J> {
  const entries = new Map<string, J>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e?.id) entries.set(String(e.id), e);
    } catch {
      /* skip a broken line */
    }
  }
  return entries;
}

// ---------------------------------------------------------------- snapshot (shape A, VISION-viewer 15.14.3)

export interface Snapshot extends BuiltRun {
  snapshot_format: number;
  page_id: string;
  run_id: string;
  started_utc: string;
  status: string;
  verdict: "PASS" | "FAIL";
  score: number | null;
}

/** The snapshot of one finished run. Key names follow HtvRow, PanelData, and TermEntry. */
export function makeSnapshot(pageId: string, run: HtvRun, built: BuiltRun): Snapshot {
  return {
    snapshot_format: SNAPSHOT_FORMAT,
    page_id: pageId,
    run_id: run.runId,
    started_utc: run.startedUtc,
    status: run.status,
    verdict: run.verdict,
    score: run.score,
    rows: built.rows,
    panel: built.panel,
    terms: built.terms,
    notes: built.notes,
  };
}

/** Read a stored snapshot back. Returns an error text when the record is not a snapshot that this app can read. */
export function readSnapshot(raw: J, pageId: string, runId: string): { ok: true; snap: Snapshot } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: `The snapshot of ${pageId} run ${runId} is empty.` };
  if (raw.snapshot_format !== SNAPSHOT_FORMAT) {
    return { ok: false, error: `The snapshot of ${pageId} run ${runId} has snapshot_format ${String(raw.snapshot_format)}. This app reads format ${SNAPSHOT_FORMAT}. Run the sync command S2 again.` };
  }
  if (!Array.isArray(raw.rows) || typeof raw.panel !== "object" || typeof raw.terms !== "object") {
    return { ok: false, error: `The snapshot of ${pageId} run ${runId} lacks rows, panel, or terms.` };
  }
  return { ok: true, snap: raw as Snapshot };
}

// ---------------------------------------------------------------- reader pages (unit RC1, round 63)
// The sync command S2 turns the built run of a page into one record of the collection reader_pages.
// The record holds reader data only: no verdict, no score, no TL_3 panel, no reasoning, and no EN form check result (round 63 answer 3).

/** Format number of the record in reader_pages. Change it when the shape changes. */
export const READER_FORMAT = 1;

function readerMark(m: TermMark): ReaderMark {
  return { start: m.start, end: m.end, markId: m.markId, entryId: m.entryId, surface: m.surface };
}

/** The rows of a built run without the research fields: the ts_ids and the result and detail of every mark. */
export function readerRows(rows: HtvRow[]): ReaderRow[] {
  return rows.map((r) => ({ key: r.key, shortKey: r.shortKey, part: r.part, ja: r.ja, ed3: r.ed3, jaMarks: r.jaMarks.map(readerMark), edMarks: r.edMarks.map(readerMark) }));
}

/**
 * Items that make no row: the photo captions (line_caption) and the running head (block_pillar), with their JA text.
 * Round 63 answer 5 (Q-A 2026-10-28 l309): "Copy captions (Recommended)". The folio and the figure items stay out. Order: captions by ID, then the running head.
 */
export function readerExtras(ts3: J, ed3: J): ReaderExtra[] {
  const ts = parts(ts3);
  const ed = parts(ed3);
  const ja = new Map<string, string>();
  for (const part of ["line_caption", "block_pillar"]) for (const it of (ts[part] ?? []) as J[]) ja.set(String(it.item_id), String(it.text ?? ""));
  const out: ReaderExtra[] = [];
  for (const [part, kind] of [["line_caption", "caption"], ["block_pillar", "running_head"]] as const) {
    const items = ((ed[part] ?? []) as J[]).map((it) => ({ it, id: String(it.item_id).slice(String(it.item_id).lastIndexOf("/") + 1) }));
    items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const { it, id } of items) {
      const en = String(it.text ?? "");
      if (!en.trim()) continue;
      const refs = ((it.ja_refs ?? []) as J[]).map((r) => ja.get(String(r)) ?? "").join("");
      out.push({ id, kind, ja: refs, en });
    }
  }
  return out;
}

/**
 * The two search columns of a page (unit RC4, round 69 answer 10: "Folded text columns in PocketBase").
 * search_ja holds the Japanese text of the rows and the captions. search_en holds the agent English text, the English captions,
 * and the romaji of the term marks of the page (so that "seme" finds a page whose Japanese text has the mark 攻め). Both are folded (reader-search.ts).
 */
export function readerSearchColumns(rows: ReaderRow[], terms: Record<string, TermEntry>, extras: ReaderExtra[]) {
  const romaji = new Set<string>();
  for (const r of rows) for (const m of [...r.jaMarks, ...r.edMarks]) if (terms[m.entryId]?.romaji) romaji.add(terms[m.entryId].romaji);
  return searchColumns({
    ja: [...rows.map((r) => r.ja), ...extras.map((e) => e.ja)],
    en: [...rows.map((r) => r.ed3), ...extras.map((e) => e.en), ...romaji],
  });
}

/** The body of one reader_pages record (field names as in the collection). `agree` is the list of group keys with the translator tick. */
export function makeReaderPage(pageId: string, itemId: string, runId: string, built: BuiltRun, extras: ReaderExtra[], agree: string[]) {
  const n = parseInt(pageId.slice(pageId.lastIndexOf("/p") + 2), 10);
  const rows = readerRows(built.rows);
  const { search_ja, search_en } = readerSearchColumns(rows, built.terms, extras);
  return {
    page_id: pageId,
    item_id: itemId,
    n: Number.isFinite(n) ? n : 0,
    run_id: runId,
    rows,
    terms: built.terms,
    extras,
    agree: [...agree].sort(),
    search_ja,
    search_en,
  };
}
