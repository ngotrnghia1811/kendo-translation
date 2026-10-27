import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { listDir, readJson, exists } from "./json";
import { resolveInside, stripDataPrefix, isSafeSegment, PathError } from "./safe-path";
import { pageHref } from "./format";
import type { RunDetail, RunPageRow, RunSummary } from "./types";

const LISTS = "pilot-run/lists";
export const PAUSE_NAME = "PAUSE";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

function num(v: unknown, d = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : d;
}

function summarize(stamp: string, p: J): RunSummary {
  return {
    stamp,
    state: String(p.state ?? "unknown"),
    pagesDone: num(p.pages_done),
    pagesTotal: num(p.pages_total),
    callsDone: num(p.calls_done),
    callsTotal: num(p.calls_total),
    callsFailed: num(p.calls_failed),
    callsFlagged: num(p.calls_flagged),
    costModelsUsd: num(p.cost_models_usd),
    costListedUsd: num(p.cost_listed_usd),
    startedEpoch: p.started_epoch ?? null,
    updatedEpoch: p.updated_epoch ?? null,
    pausedSinceEpoch: p.paused_since_epoch ?? null,
  };
}

/** Round 44 answer 13 (Q-A l142), tab Runs: every list folder, newest first. */
export async function listRuns(): Promise<RunSummary[]> {
  const names = (await listDir(LISTS)).filter(isSafeSegment).sort().reverse();
  const out: RunSummary[] = [];
  for (const stamp of names) {
    const p = await readJson<J>(`${LISTS}/${stamp}/progress.json`);
    if (p) out.push(summarize(stamp, p));
  }
  return out;
}

function runFolderName(folder: string): string {
  return path.posix.basename(stripDataPrefix(folder));
}

/** Round 44 answer 13 (Q-A l142): run view, one row per page. */
export async function getRun(stamp: string): Promise<RunDetail | null> {
  if (!isSafeSegment(stamp)) throw new PathError("Bad list name.");
  const p = await readJson<J>(`${LISTS}/${stamp}/progress.json`);
  if (!p) return null;
  const now = Date.now() / 1000;
  const rows: RunPageRow[] = [];
  for (const pg of (p.pages ?? []) as J[]) {
    const folderRel = pg.folder ? stripDataPrefix(String(pg.folder)) : "";
    let qa3Verdict: string | null = null;
    let qa3Score: number | null = null;
    if (folderRel) {
      const s = await readJson<J>(`${folderRel}/summary.json`);
      const q = s?.qa?.QA_3;
      if (q) {
        qa3Verdict = q.verdict ?? null;
        qa3Score = q.page_score ?? null;
      }
    }
    const started = pg.started_epoch ?? null;
    const ended = pg.ended_epoch ?? null;
    let minutes: number | null = null;
    if (started && ended) minutes = (ended - started) / 60;
    else if (started && pg.state === "running") minutes = (now - started) / 60;
    const folderName = folderRel ? runFolderName(folderRel) : "";
    rows.push({
      pageId: String(pg.page_id),
      kind: String(pg.kind ?? ""),
      state: String(pg.state ?? ""),
      runFolder: folderName,
      callsDone: num(pg.calls_done),
      callsTotal: num(pg.calls_total),
      callsFailed: num(pg.calls_failed),
      running: Array.isArray(pg.running) ? pg.running.map(String) : [],
      usd: num(pg.models_usd),
      minutes,
      qa3Verdict,
      qa3Score,
      href: pageHref(String(pg.page_id), folderName || undefined),
    });
  }
  return {
    ...summarize(stamp, p),
    elapsedBeforeSeconds: num(p.elapsed_before),
    pauseSecondsTotal: num(p.pause_seconds_total),
    pausedSinceUtc: p.paused_since_utc ?? null,
    pauseFileExists: await exists(`${LISTS}/${stamp}/${PAUSE_NAME}`),
    pages: rows,
    serverTimeEpoch: now,
  };
}

/**
 * Round 43 answer 8 (Q-A l112): "Pause before next call (Recommended)".
 * Same file rule as `translator_run.py pause --list DIR [--off]` (cmd_pause):
 * the folder must hold list.json. On: create PAUSE with one JSON line, never overwrite.
 * Off: delete PAUSE. This is the only write the app makes under the Translator folder.
 */
export async function setPause(stamp: string, on: boolean): Promise<{ ok: boolean; message: string; status: number }> {
  if (!isSafeSegment(stamp)) throw new PathError("Bad list name.");
  const dir = await resolveInside(`${LISTS}/${stamp}`);
  if (!(await exists(`${LISTS}/${stamp}/list.json`))) {
    return { ok: false, status: 404, message: "This folder has no list.json. It is not a list folder." };
  }
  const prog = await readJson<J>(`${LISTS}/${stamp}/progress.json`);
  const state = String(prog?.state ?? "");
  if (state !== "running" && state !== "paused") {
    return { ok: false, status: 409, message: `The list state is "${state}". Pause works only while the list is running or paused.` };
  }
  const file = path.join(dir, PAUSE_NAME);
  if (on) {
    try {
      const line = JSON.stringify({ who: "viewer", when_utc: new Date().toISOString().replace(/\.\d+Z$/, "Z") }) + "\n";
      await fs.writeFile(file, line, { encoding: "utf-8", flag: "wx" });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") return { ok: true, status: 200, message: "The pause file exists already." };
      throw e;
    }
    return { ok: true, status: 200, message: "Pause file created. New calls wait. Calls that run now finish." };
  }
  try {
    await fs.unlink(file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { ok: true, status: 200, message: "No pause file. Nothing to do." };
    throw e;
  }
  return { ok: true, status: 200, message: "Pause file deleted. A waiting run goes on within a few seconds." };
}
