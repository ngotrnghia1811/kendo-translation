import "server-only";
import { promises as fs } from "node:fs";
import { exists, listDir, readJson, readText } from "./json";
import { bookTitle } from "./books";
import { folderToPageId } from "./format";
import { isSafeSegment, PathError, resolveInside } from "./safe-path";
import { edForGroups, groupKey, placeMarks, sentenceGroups } from "./htv-groups";
import { parseTl3Message } from "./htv-panel";
import type { HtvPageData, HtvPageRow, HtvRow, HtvRun, TermEntry, TermLang } from "./htv-types";

/*
 * ALL run reads of the human-translation-view sit in this one module (round 54 answer 8, Q-A 2026-10-28 l127:
 * "option 1 for dev. but these data will be uploaded for deployment right?"). Option 1 = run folders on this Mac.
 * For the deploy, the sync command S2 uploads one snapshot per finished page run into the collection page_runs.
 * The switch to page_runs then changes the functions of this file only: finishedRuns, loadHtvPage, and the termbase read.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

const PILOT = "pilot-run";

/**
 * Finished runs of one page folder, newest first.
 * Round 53 answer 8 (Q-A l102): "Count it if QA_3 gave a verdict (Recommended)". A run is finished when summary.json holds
 * qa.QA_3.verdict (PASS or FAIL) and the files results/TS_3.json and results/ED_3.json exist. The status text does not matter.
 * Folders that start with plan- are plan runs and never match the time stamp rule.
 * Newest = the largest started_utc of run.json (round 54 answer 10, l129). A folder name breaks a tie.
 */
export async function finishedRuns(pageFolder: string): Promise<HtvRun[]> {
  const names = (await listDir(`${PILOT}/${pageFolder}`)).filter((n) => /^\d{8}T\d{6}Z/.test(n));
  const out: HtvRun[] = [];
  for (const runId of names) {
    const rel = `${PILOT}/${pageFolder}/${runId}`;
    const summary = await readJson<J>(`${rel}/summary.json`);
    const q3 = summary?.qa?.QA_3;
    const verdict = q3?.verdict;
    if (verdict !== "PASS" && verdict !== "FAIL") continue;
    if (!(await exists(`${rel}/results/ED_3.json`)) || !(await exists(`${rel}/results/TS_3.json`))) continue;
    const runJson = await readJson<J>(`${rel}/run.json`);
    out.push({
      runId,
      startedUtc: typeof runJson?.started_utc === "string" ? runJson.started_utc : "",
      status: String(summary?.status ?? ""),
      verdict,
      score: typeof q3?.page_score === "number" ? q3.page_score : null,
    });
  }
  out.sort((a, b) => (a.startedUtc < b.startedUtc ? 1 : a.startedUtc > b.startedUtc ? -1 : a.runId < b.runId ? 1 : a.runId > b.runId ? -1 : 0));
  return out;
}

/** The shown run: the run of the admin mark if it is finished, else the newest finished run (round 51 answer 8, Q-A l53). */
export function pickShownRun(runs: HtvRun[], markedRunId: string | null): { run: HtvRun; marked: boolean; staleMark: boolean } | null {
  if (runs.length === 0) return null;
  if (markedRunId) {
    const hit = runs.find((r) => r.runId === markedRunId);
    if (hit) return { run: hit, marked: true, staleMark: false };
    return { run: runs[0], marked: false, staleMark: true };
  }
  return { run: runs[0], marked: false, staleMark: false };
}

/** All pages with at least one finished run, FAIL pages included (round 51 answer 13, Q-A l58). `marks` maps page ID to the marked run ID. */
export async function listFinishedPages(marks: Map<string, string>): Promise<HtvPageRow[]> {
  const rows: HtvPageRow[] = [];
  const titles = new Map<string, string>();
  for (const name of (await listDir(PILOT)).sort()) {
    const parsed = folderToPageId(name);
    if (!parsed || !isSafeSegment(name)) continue;
    const runs = await finishedRuns(name);
    const pageId = `${parsed.slug}/${parsed.page}`;
    const shown = pickShownRun(runs, marks.get(pageId) ?? null);
    if (!shown) continue;
    if (!titles.has(parsed.slug)) titles.set(parsed.slug, await bookTitle(parsed.slug));
    rows.push({
      pageId,
      slug: parsed.slug,
      page: parsed.page,
      bookTitle: titles.get(parsed.slug) ?? "",
      verdict: shown.run.verdict,
      score: shown.run.score,
      shownRunId: shown.run.runId,
      marked: shown.marked,
      runCount: runs.length,
    });
  }
  return rows;
}

function parts(r: J): J {
  return r?.after_program_step ?? r?.model_result ?? {};
}

// ---------------------------------------------------------------- termbase

interface TermbaseCache {
  stamp: string;
  entries: Map<string, J>;
}
let termbaseCache: TermbaseCache | null = null;

async function termbaseEntries(): Promise<Map<string, J>> {
  const rel = "termbase/termbase.draft.jsonl";
  const full = await resolveInside(rel);
  let stamp = "none";
  try {
    const st = await fs.stat(full);
    stamp = `${st.mtimeMs}:${st.size}`;
  } catch {
    return new Map();
  }
  if (termbaseCache && termbaseCache.stamp === stamp) return termbaseCache.entries;
  const text = (await readText(rel)) ?? "";
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
  termbaseCache = { stamp, entries };
  return entries;
}

/** Compact form of a termbase entry for the pop-up (round 51 answer 14, Q-A l59: first definition, expand for the full entry). */
function termEntryView(e: J): TermEntry {
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

// ---------------------------------------------------------------- one page

/**
 * Round 50 answers 8 to 13 and round 51 (Q-A 2026-10-28 l29-60): the rows of the human-translation-view.
 * One row for each sentence group of TS_3 (the book memory rule), with the ED_3 text of the shown run.
 * `markedRunId` is the admin run mark of the page, or null. Returns null when the page has no finished run.
 */
export async function loadHtvPage(slug: string, page: string, markedRunId: string | null): Promise<HtvPageData | null> {
  if (!isSafeSegment(slug) || !/^p\d+$/.test(page)) throw new PathError("Bad page name.");
  const pageFolder = `${slug}_${page}`;
  const pageId = `${slug}/${page}`;
  const runs = await finishedRuns(pageFolder);
  const shown = pickShownRun(runs, markedRunId);
  if (!shown) return null;
  const runRel = `${PILOT}/${pageFolder}/${shown.run.runId}`;
  const notes: string[] = [];

  const ts = parts(await readJson<J>(`${runRel}/results/TS_3.json`));
  const ed = parts(await readJson<J>(`${runRel}/results/ED_3.json`));
  const groups = sentenceGroups(ts);
  const edRows = edForGroups(groups, ed);

  const jaText = new Map<string, string>();
  for (const part of ["lines", "block_title"]) for (const it of (ts[part] ?? []) as J[]) jaText.set(String(it.item_id), String(it.text ?? ""));

  const marksFile = await readJson<J>(`${runRel}/programs/term_marks.ED_3.json`);
  const checkFile = await readJson<J>(`${runRel}/programs/en_form_check.ED_3.json`);
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
    const book = await termbaseEntries();
    for (const id of wanted) {
      const e = book.get(id);
      if (e) terms[id] = termEntryView(e);
    }
    if (book.size === 0) notes.push("The termbase file is missing, so the term pop-up has no entry text.");
  }

  const tl3 = await readText(`${runRel}/messages/TL_3.txt`);
  const panel = parseTl3Message(tl3);

  return {
    pageId,
    slug,
    page,
    bookTitle: await bookTitle(slug),
    verdict: shown.run.verdict,
    score: shown.run.score,
    runId: shown.run.runId,
    startedUtc: shown.run.startedUtc,
    status: shown.run.status,
    runs,
    markedRunId: shown.marked ? shown.run.runId : null,
    markNote: shown.staleMark ? `The run mark names ${markedRunId}, which is not a finished run. The page shows the newest finished run.` : "",
    rows,
    panel,
    terms,
    notes,
  };
}

/** Rows of the run that the page shows now (admin mark first, else newest). The save route builds the records from them on the server. */
export async function rowsForSave(slug: string, page: string, markedRunId: string | null): Promise<{ rows: HtvRow[]; runId: string } | null> {
  const data = await loadHtvPage(slug, page, markedRunId);
  if (!data) return null;
  return { rows: data.rows, runId: data.runId };
}

