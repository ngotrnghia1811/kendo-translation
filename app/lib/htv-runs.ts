import "server-only";
import { promises as fs } from "node:fs";
import { exists, listDir, readJson, readText } from "./json";
import { bookTitle } from "./books";
import { loadConfig } from "./config";
import { folderToPageId } from "./format";
import { isSafeSegment, PathError, resolveInside } from "./safe-path";
import { buildRun, finishedRunOf, parseTermbase, readSnapshot, RUN_FOLDER_RULE, sortRuns } from "./htv-build";
import { catalogTitles, pageRunRows, pageRunSnapshot, PbError } from "./pb";
import type { HtvPageData, HtvPageRow, HtvRow, HtvRun } from "./htv-types";

/*
 * ALL run reads of the human-translation-view sit in this one module (round 54 answer 8, Q-A 2026-10-28 l127:
 * "option 1 for dev. but these data will be uploaded for deployment right?"). Option 1 = run folders on this Mac.
 * For the deploy, the sync command S2 (app/scripts/sync-runs.mjs) uploads one snapshot per finished page run into the collection page_runs.
 * The config key runSource picks the source: "files" (default, the run folders) or "pocketbase" (the records of page_runs).
 * The rules that turn run files into rows, panel, terms, and notes sit in htv-build.ts, so that S2 and this file use one copy.
 * The switch changes this file and four callers. They pass the user token, because page_runs needs it (round 56 unit S2C).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

const PILOT = "pilot-run";

/** True when the config key runSource is "pocketbase". The default "files" reads the run folders on this Mac. */
async function fromServer(): Promise<boolean> {
  return (await loadConfig()).runSource === "pocketbase";
}

/**
 * Finished runs of one page folder, newest first.
 * Round 53 answer 8 (Q-A l102): "Count it if QA_3 gave a verdict (Recommended)". A run is finished when summary.json holds
 * qa.QA_3.verdict (PASS or FAIL) and the files results/TS_3.json and results/ED_3.json exist. The status text does not matter.
 * Folders that start with plan- are plan runs and never match the time stamp rule.
 * Newest = the largest started_utc of run.json (round 54 answer 10, l129). A folder name breaks a tie.
 * Source "pocketbase": the records of page_runs, read with the token of the user and without the snapshot field.
 */
export async function finishedRuns(pageFolder: string, token: string): Promise<HtvRun[]> {
  if (await fromServer()) {
    const parsed = folderToPageId(pageFolder);
    if (!parsed) return [];
    // pageRunRows adds the page ID to each row. A run of the page view holds the five run fields only.
    return sortRuns((await pageRunRows(token, `${parsed.slug}/${parsed.page}`)).map(({ runId, startedUtc, status, verdict, score }) => ({ runId, startedUtc, status, verdict, score })));
  }
  return finishedRunsFromFiles(pageFolder);
}

async function finishedRunsFromFiles(pageFolder: string): Promise<HtvRun[]> {
  const names = (await listDir(`${PILOT}/${pageFolder}`)).filter((n) => RUN_FOLDER_RULE.test(n));
  const out: HtvRun[] = [];
  for (const runId of names) {
    const rel = `${PILOT}/${pageFolder}/${runId}`;
    const summary = await readJson<J>(`${rel}/summary.json`);
    const hasEd = await exists(`${rel}/results/ED_3.json`);
    const hasTs = await exists(`${rel}/results/TS_3.json`);
    const runJson = await readJson<J>(`${rel}/run.json`);
    const run = finishedRunOf(runId, summary, runJson, hasTs, hasEd);
    if (run) out.push(run);
  }
  return sortRuns(out);
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

/**
 * All pages with at least one finished run, FAIL pages included (round 51 answer 13, Q-A l58). `marks` maps page ID to the marked run ID.
 * Source "pocketbase": one list of all page_runs without the snapshot, grouped by page ID. The titles come from catalog_items.
 */
export async function listFinishedPages(marks: Map<string, string>, token: string): Promise<HtvPageRow[]> {
  if (await fromServer()) return listFinishedPagesFromServer(marks, token);
  const rows: HtvPageRow[] = [];
  const titles = new Map<string, string>();
  for (const name of (await listDir(PILOT)).sort()) {
    const parsed = folderToPageId(name);
    if (!parsed || !isSafeSegment(name)) continue;
    const runs = await finishedRunsFromFiles(name);
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

async function listFinishedPagesFromServer(marks: Map<string, string>, token: string): Promise<HtvPageRow[]> {
  const all = await pageRunRows(token);
  const byPage = new Map<string, HtvRun[]>();
  for (const r of all) {
    const list = byPage.get(r.pageId);
    if (list) list.push(r);
    else byPage.set(r.pageId, [r]);
  }
  const titles = await catalogTitles(token);
  // The folder name order of the files source: slug_pNNN sorted as text.
  const folderOf = (pageId: string) => pageId.replace(/\/(p\d+)$/, "_$1");
  const rows: HtvPageRow[] = [];
  for (const pageId of [...byPage.keys()].sort((a, b) => (folderOf(a) < folderOf(b) ? -1 : folderOf(a) > folderOf(b) ? 1 : 0))) {
    const parsed = folderToPageId(folderOf(pageId));
    if (!parsed) continue;
    const runs = sortRuns(byPage.get(pageId) ?? []);
    const shown = pickShownRun(runs, marks.get(pageId) ?? null);
    if (!shown) continue;
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
  const entries = parseTermbase((await readText(rel)) ?? "");
  termbaseCache = { stamp, entries };
  return entries;
}

// ---------------------------------------------------------------- one page

/**
 * Round 50 answers 8 to 13 and round 51 (Q-A 2026-10-28 l29-60): the rows of the human-translation-view.
 * One row for each sentence group of TS_3 (the book memory rule), with the ED_3 text of the shown run.
 * `markedRunId` is the admin run mark of the page, or null. Returns null when the page has no finished run.
 * A parity test can pass any finished run ID as `markedRunId` to load that run.
 * Source "pocketbase": the rows, panel, terms, and notes come from the snapshot of the shown run.
 */
export async function loadHtvPage(slug: string, page: string, markedRunId: string | null, token: string): Promise<HtvPageData | null> {
  if (!isSafeSegment(slug) || !/^p\d+$/.test(page)) throw new PathError("Bad page name.");
  const pageFolder = `${slug}_${page}`;
  const pageId = `${slug}/${page}`;
  const server = await fromServer();
  const runs = await finishedRuns(pageFolder, token);
  const shown = pickShownRun(runs, markedRunId);
  if (!shown) return null;
  const markNote = shown.staleMark ? `The run mark names ${markedRunId}, which is not a finished run. The page shows the newest finished run.` : "";

  if (server) {
    const raw = await pageRunSnapshot(token, pageId, shown.run.runId);
    const got = readSnapshot(raw, pageId, shown.run.runId);
    if (!got.ok) throw new PbError(500, got.error);
    const snap = got.snap;
    // The record columns can hold no null score, so the shown run takes its facts from the snapshot.
    const facts: HtvRun = { runId: snap.run_id, startedUtc: snap.started_utc, status: snap.status, verdict: snap.verdict, score: snap.score };
    return {
      pageId,
      slug,
      page,
      bookTitle: (await catalogTitles(token, slug)).get(slug) ?? "",
      verdict: facts.verdict,
      score: facts.score,
      runId: facts.runId,
      startedUtc: facts.startedUtc,
      status: facts.status,
      runs: runs.map((r) => (r.runId === facts.runId ? facts : r)),
      markedRunId: shown.marked ? shown.run.runId : null,
      markNote,
      rows: snap.rows,
      panel: snap.panel,
      terms: snap.terms,
      notes: snap.notes ?? [],
    };
  }

  const runRel = `${PILOT}/${pageFolder}/${shown.run.runId}`;
  const built = buildRun(pageId, {
    ts3: await readJson<J>(`${runRel}/results/TS_3.json`),
    ed3: await readJson<J>(`${runRel}/results/ED_3.json`),
    termMarks: await readJson<J>(`${runRel}/programs/term_marks.ED_3.json`),
    enFormCheck: await readJson<J>(`${runRel}/programs/en_form_check.ED_3.json`),
    tl3Message: await readText(`${runRel}/messages/TL_3.txt`),
    termbase: await termbaseEntries(),
  });

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
    markNote,
    rows: built.rows,
    panel: built.panel,
    terms: built.terms,
    notes: built.notes,
  };
}

/** Rows of the run that the page shows now (admin mark first, else newest). The save route builds the records from them on the server. */
export async function rowsForSave(slug: string, page: string, markedRunId: string | null, token: string): Promise<{ rows: HtvRow[]; runId: string } | null> {
  const data = await loadHtvPage(slug, page, markedRunId, token);
  if (!data) return null;
  return { rows: data.rows, runId: data.runId };
}
