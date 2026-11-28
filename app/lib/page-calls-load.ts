import "server-only";
// Unit VW132 (Q-A 3:140.3): the file reads of the rule in lib/page-calls.ts. Read only. A missing or broken file gives "no skipped call".
import { readJson, readJsonl } from "./json";
import { stripDataPrefix } from "./safe-path";
import { bookRunBookOf, frozenBoxes } from "./run-store";
import { criticSkipBoxes, listCallsTotal, listIsLive, pageCalls, pageInputOf, summaryBoxesOf, type PageCalls } from "./page-calls";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

/** The phase in which the Translator freezes boxes (freeze.py freeze_on). Phases 2 and 3 never freeze, so no call is skipped there. */
const FREEZE_PHASE = "agent-phase-4";

function rows(p: J): J[] {
  return Array.isArray(p?.pages) ? p.pages : [];
}

/** A page that can still make calls: running, or waiting without a skipped_reason. */
function canStillRun(pg: J): boolean {
  return pg?.state === "running" || (pg?.state === "waiting" && !pg?.skipped_reason);
}

/**
 * The boxes whose critic call a page of this list skips if it starts now. The Translator reads the frozen set at the start of each page
 * (translator_run.py l4159) and the set changes only between pages (an update point or a silent freeze), so the frozen set now is the set of the page that runs.
 * Source: the event box-frozen in book-store/<book>/history.jsonl, the same file and rule as the frozen boxes of the Details view (lib/run-store.ts frozenBoxes).
 * Null when the list is not live, is not a phase 4 run of a real book, or has no page that can run: then no forecast applies.
 */
export async function forecastBoxesOf(p: J): Promise<string[] | null> {
  if (!p || !listIsLive(String(p.state ?? "")) || p.phase !== FREEZE_PHASE) return null;
  const book = bookRunBookOf(p);
  if (!book || !rows(p).some(canStillRun)) return null;
  const history = await readJsonl<Record<string, unknown>>(`book-store/${book}/history.jsonl`);
  return criticSkipBoxes(frozenBoxes(history, null).map((f) => f.box));
}

/** True when the page ended in a way that the rule reads its summary.json: not done, not running, not waiting. */
function needsSummary(pg: J): boolean {
  return !!pg?.folder && pg.state !== "done" && pg.state !== "running" && pg.state !== "waiting";
}

/**
 * The calls that run for each page of a list and the total of the list. The Lists page /runs uses this (it does not read every summary.json).
 * It reads summary.json only for a page that failed or stopped. The run view reads every summary.json already and calls pageCalls itself.
 */
export async function loadListCalls(p: J): Promise<{ total: number; pages: PageCalls[] }> {
  const forecast = await forecastBoxesOf(p);
  const pages: PageCalls[] = [];
  for (const pg of rows(p)) {
    const boxes = needsSummary(pg) ? summaryBoxesOf(await readJson<J>(`${stripDataPrefix(String(pg.folder))}/summary.json`)) : null;
    pages.push(pageCalls(pageInputOf(pg, boxes, forecast)));
  }
  const planned = typeof p?.calls_total === "number" && Number.isFinite(p.calls_total) ? p.calls_total : 0;
  return { total: listCallsTotal(pages, planned), pages };
}
