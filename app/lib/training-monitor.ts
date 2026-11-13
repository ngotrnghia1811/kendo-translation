// Unit VW98 (round 91, card P33.1): the training monitor of one box in the run view /runs/<stamp> of a phase 2 list. Pure: no file read
// (lib/training-monitor-load.ts reads the files). Use only erasable TypeScript syntax here (no enum, no parameter property): scripts/vw98-test.mjs
// runs this file with plain node.
// Owner words, Q-A 3:22.4 note (2026-11-12): "Add a training monitor page in the run view page: User pick an individual component (e.g TL_2) to see ALL
// information relevant to that component in the run (all its critique history, all its updates, etc) in similar chronological order."
// Owner pick Q-A 3:23.3: "Section with box picker in the run view". Owner pick Q-A 3:23.4: "Header plus time line as shown", note: "With training
// statistics (number of critique, types, updates, etc)".
// Owner rule Q-A 3:17.4: every ID and every state gets a readable label. Q-A 3:18.5: box codes stay, the hover gives the name (lib/box-names.ts).
// Owner rules Q-A 3:15.2, 3:20.2: tokens, never money (no dollar amounts). Short form "Tokens in (with cache) / out".
//
// Data rules (field names checked on the files of the live phase 2 run, read only, 2026-11-12):
//   - A critique is one row of critiques/queue-<BOX>.jsonl of a page run folder: queue_id, page_id, reviewed_box, instruction_version, source_type
//     ("box-critic" or "reference"), critique {critique_id, failure_mode, reason, evidence, ...}. The rows of the reference-diff-critic for this box
//     are in the same file (source_type "reference"), so critiques/reference.json is not counted again.
//   - The queue of a box (data/scripts/translator/critique_queue.py lines 9-11): the critiques of the pages that the run accepted (page-done), minus the
//     queue IDs that an event "update-point-ended" of the run lists. A queue ID counts once.
//   - Soft and hard: a critique group of the commit file update-points/<page>/commit-<BOX>.json (ctx.groups[].mark "soft" or "hard") lists its queue IDs.
//     A critique gets the mark of its group. A critique that no update point used yet has no mark.

import { boxHelp } from "./box-names";
import { stepWord, type Word } from "./step-tree";
import { sumTokens, type TokenCounts } from "./tokens-sum";
import type { FrozenBox, OverflowRow } from "./run-store"; // unit VW85

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

// ---------------------------------------------------------------- boxes

/** The 16 boxes in grid order: level 0 (TS_0, TL_0, ED_0, QA_0), then levels 1, 2, 3. */
export const MONITOR_BOXES: string[] = [0, 1, 2, 3].flatMap((n) => ["TS", "TL", "ED", "QA"].map((s) => `${s}_${n}`));

/** The box of the query key "box", or null. Only the 16 box codes pass. */
export function parseBoxParam(v: string | null | undefined): string | null {
  return typeof v === "string" && MONITOR_BOXES.includes(v) ? v : null;
}

/** The readable name of a box for the header: "translation stage, writes the English draft of the page. Level 2 of 4 (...)". */
export function boxName(box: string): string {
  const h = boxHelp(box);
  return h ? h.replace(/^[A-Z]{2}_[0-3]: /, "") : box;
}

/** The address of the training monitor of a box in the run view of a list. A box-critic code links to its box. Null for another code. */
export function monitorHref(stamp: string, code: string): string | null {
  const m = /^(?:box-critic\.)?((?:TS|TL|ED|QA)_[0-3])$/.exec(code);
  if (!m || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(stamp)) return null;
  return `/runs/${stamp}?box=${m[1]}#training-monitor`;
}

// ---------------------------------------------------------------- words

/** Event kinds of the time line and their tick box words. All are on at the start (Q-A 3:23.4). */
export const EVENT_KINDS = ["call", "critique", "update", "rubric"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export const EVENT_KIND_WORDS: Record<EventKind, string> = {
  call: "Page calls",
  critique: "Critiques",
  update: "Update points",
  rubric: "Rubric table changes",
};

/** Words of a critique source (queue row key source_type). [unit default VW98] "reference" shows as reference-diff-critic, the name of its call. */
export const SOURCE_WORDS: Record<string, { label: string; help: string }> = {
  "box-critic": { label: "box-critic", help: "box-critic: the critic call of this box in the backward pass of the page. It reads the output of the box." },
  reference: {
    label: "reference-diff-critic",
    help: "reference-diff-critic (source_type \"reference\"): the loss function. It compares the final ED_3 English with the human English of the dataset.",
  },
};

export function sourceWord(source: string | null): { label: string; help: string } {
  if (source && Object.hasOwn(SOURCE_WORDS, source)) return SOURCE_WORDS[source];
  return { label: source ?? "source not stored", help: `Critique source "${source ?? "not stored"}" (queue row key source_type). The Viewer has no plain word for it.` };
}

/** Status of one critique in the queue of its box. */
export type CritiqueStatus = "used" | "waiting" | "page-running" | "page-stopped";
export const CRITIQUE_STATUS_WORDS: Record<CritiqueStatus, Word> = {
  used: { pill: "done", label: "Used by an update point", help: "Used: an update point of this box grouped this critique and rewrote the prompt from it (history.jsonl update-point-ended, queue_ids)." },
  waiting: { pill: "waiting", label: "Waits in the queue", help: "Waits in the queue: the page is accepted and no update point used this critique yet. An update point starts when the queue of the box reaches N." },
  "page-running": { pill: "running", label: "Page translating now", help: "The page of this critique runs now. The critique joins the queue when the run accepts the page." },
  "page-stopped": {
    pill: "interrupted",
    label: "Not in the queue",
    help: "Not in the queue: the run stopped before the end of this page run. Only the critiques of accepted pages join the queue (critique_queue.py).",
  },
};

// ---------------------------------------------------------------- input from the loader

/** A page of the run in run order, with the light facts of this box. */
export interface MonitorPageInput {
  pageId: string;
  title: string;
  titleFound: boolean;
  /** "page 2 of 3", or null. */
  pageOf: string | null;
  /** Key of PAGE_WORDS of lib/step-tree.ts: accepted, accepted-fail, failed, running, stopped. */
  state: string;
  folder: string | null;
  runFolder: string | null;
  running: boolean;
  /** End time (ended pages) or start time (other pages). */
  epoch: number | null;
  /** The call of this box on the page (rows of calls.jsonl with the tag of the box), or null. */
  call: { model: string | null; seconds: number | null; tokens: TokenCounts | null; ok: boolean; calls: number; startedEpoch: number | null; program: boolean; error: string | null } | null;
  /** Start time of the call box-critic.<BOX>, and of the reference-diff-critic. */
  criticEpoch: number | null;
  lossEpoch: number | null;
  /** run.json prompts.<BOX>.version: the prompt version that the page used. */
  promptVersion: string | null;
  /** QA boxes: verdict and page score of summary.json qa.<BOX> (else results/<BOX>.json score). */
  qa: { verdict: string | null; score: number | null } | null;
  /** Rows of critiques/queue-<BOX>.jsonl (all rows of the file). */
  queue: unknown[];
}

export interface MonitorUpdateInput {
  page: string;
  pageText: string;
  startedEpoch: number | null;
  endedEpoch: number | null;
  result: string | null;
  version: string | null;
  parent: string | null;
  softGroups: number | null;
  hardGroups: number | null;
  rubric: { version: string | null; parent: string | null; changeIds: string[] } | null;
  /** Other events of the box while the update point ran (prompt-rejected, ...). */
  events: string[];
  seconds: number | null;
  calls: number;
  tokens: TokenCounts | null;
  /** Queue IDs of the start event, replaced by those of the end event. */
  queueIds: string[];
  /** commit-<BOX>.json audit.verdict, or null. */
  audit: string | null;
  /** commit-<BOX>.json ctx.groups. */
  groups: { id: string; mark: string | null; queueIds: string[] }[];
}

export interface MonitorRubricInput {
  changeId: string;
  epoch: number | null;
  kind: string | null;
  row: number | null;
  name: string | null;
  page: string | null;
  pageText: string | null;
  version: string | null;
  parent: string | null;
}

export interface MonitorInput {
  box: string;
  stamp: string;
  runId: string | null;
  runLabel: string;
  runWord: Word;
  pages: MonitorPageInput[];
  updates: MonitorUpdateInput[];
  rubric: MonitorRubricInput[];
  /** Prompt versions of prompts/<BOX>/ (file names without .json), in version order, and the text of the file "current". */
  versions: string[];
  liveVersion: string | null;
  /** QA boxes: rubric-tables/<BOX>/current. */
  liveRubric: string | null;
  /** N of the run: status.json update_n, else the start row of the run. */
  n: number | null;
  nSource: string | null;
  runActive: boolean;
  runningPage: string | null;
  runningBoxes: string[];
}

// ---------------------------------------------------------------- output

interface PageRef {
  id: string;
  title: string;
  titleFound: boolean;
  pageOf: string | null;
}

export interface CallEvent {
  kind: "call";
  key: string;
  epoch: number | null;
  page: PageRef;
  folder: string | null;
  runFolder: string | null;
  /** Key of STEP_WORDS of lib/step-tree.ts. */
  state: string;
  running: boolean;
  model: string | null;
  seconds: number | null;
  tokens: TokenCounts | null;
  calls: number;
  promptVersion: string | null;
  verdict: string | null;
  score: number | null;
  error: string | null;
}

export interface CritiqueEvent {
  kind: "critique";
  key: string;
  epoch: number | null;
  page: PageRef;
  folder: string | null;
  queueId: string;
  source: string | null;
  /** The first 100 characters of failure_mode and of reason. */
  failureMode: string | null;
  reason: string | null;
  instructionVersion: string | null;
  status: CritiqueStatus;
  /** "soft", "hard", or null (no group yet, or the group has no mark). */
  mark: string | null;
  groupId: string | null;
  /** Start time of the update point that used it. */
  usedEpoch: number | null;
  running: boolean;
}

export interface UpdateEvent {
  kind: "update";
  key: string;
  epoch: number | null;
  endedEpoch: number | null;
  page: PageRef;
  pageText: string;
  result: string | null;
  version: string | null;
  parent: string | null;
  softGroups: number | null;
  hardGroups: number | null;
  audit: string | null;
  rejected: number;
  queueCount: number;
  seconds: number | null;
  calls: number;
  tokens: TokenCounts | null;
  rubric: string | null;
  running: boolean;
}

export interface RubricEvent {
  kind: "rubric";
  key: string;
  epoch: number | null;
  changeId: string;
  changeKind: string | null;
  row: number | null;
  name: string | null;
  page: string | null;
  pageText: string | null;
  version: string | null;
  parent: string | null;
  running: false;
}

export type MonitorEvent = CallEvent | CritiqueEvent | UpdateEvent | RubricEvent;

export interface Count {
  label: string;
  n: number;
}

export interface MonitorStats {
  critiques: {
    total: number;
    bySource: Count[];
    byStatus: Count[];
    /** Failure modes cut to 120 characters, most frequent first, at most 40. */
    byFailureMode: Count[];
    failureModes: number;
    soft: number;
    hard: number;
    noMark: number;
  };
  waiting: { count: number; n: number | null; nSource: string | null };
  updates: {
    total: number;
    byResult: Count[];
    rejectedTries: number;
    audit: Count[];
    softGroups: number;
    hardGroups: number;
    running: number;
  };
  versions: { list: string[]; live: string | null };
  calls: {
    pages: number;
    failed: number;
    seconds: number;
    meanSeconds: number | null;
    tokens: TokenCounts | null;
    qa: { pass: number; fail: number; other: number; meanScore: number | null } | null;
  };
  rubric: { changes: number; live: string | null } | null;
  /** Critiques per page in run order (pages with a page run folder). */
  trend: { pageId: string; label: string; n: number }[];
}

export interface BoxMonitor {
  box: string;
  stamp: string;
  name: string;
  runId: string | null;
  runLabel: string;
  runWord: Word;
  now: { page: string | null; pageLabel: string | null; boxes: string[]; thisBox: boolean } | null;
  stats: MonitorStats;
  events: MonitorEvent[];
  /** Signature of the content. An answer with the same signature carries no change. */
  sig: string;
  generatedEpoch: number;
  millis: number;
  error: string | null;
  /** Unit VW85 (Q-A 3:26.3): the book of a book run. Missing for the phase 2 run. */
  book?: { slug: string; title: string | null; phase: string | null };
  /** Unit VW85 (Q-A 3:26.3 (b)): the freeze of this box in the run, or null. Missing for the phase 2 run. */
  frozen?: FrozenBox | null;
  /** Unit VW85 (Q-A 3:26.3 (c)): the overflow critiques whose start box is this box. Missing for the phase 2 run. */
  overflow?: OverflowRow[];
}

/** The text of an unchanged poll answer: the client keeps its data. */
export interface MonitorUnchanged {
  unchanged: true;
  sig: string;
  generatedEpoch: number;
  millis: number;
}

// ---------------------------------------------------------------- build

/** A text cut to `max` characters with "…" at the end. */
export function cut(text: string | null, max = 100): string | null {
  if (text === null) return null;
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

function counts(values: string[]): Count[] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
}

/** Sort key of a version label "v2.1.10": the numbers. */
export function versionKey(v: string): number[] {
  return (v.match(/\d+/g) ?? []).map(Number);
}

export function sortVersions(list: string[]): string[] {
  return [...list].sort((a, b) => {
    const x = versionKey(a);
    const y = versionKey(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? -1) !== (y[i] ?? -1)) return (x[i] ?? -1) - (y[i] ?? -1);
    return a.localeCompare(b);
  });
}

const KIND_ORDER: Record<EventKind, number> = { call: 0, critique: 1, update: 2, rubric: 3 };

/** Run order: by clock time. A tie keeps the order call, critique, update point, rubric table change. An event with no time goes last. */
export function sortEvents(events: MonitorEvent[]): MonitorEvent[] {
  const t = (e: MonitorEvent) => (e.epoch === null ? Number.MAX_SAFE_INTEGER : e.epoch);
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => t(a.e) - t(b.e) || KIND_ORDER[a.e.kind] - KIND_ORDER[b.e.kind] || a.i - b.i)
    .map((x) => x.e);
}

/** FNV-1a hash of a text, as 8 hex digits. */
export function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** The training monitor of one box: header statistics and the time line in run order. */
export function buildBoxMonitor(input: MonitorInput, generatedEpoch: number, millis: number): BoxMonitor {
  const box = input.box;
  const events: MonitorEvent[] = [];
  // The update point that used each queue ID, and the group mark of each queue ID.
  const usedBy = new Map<string, { epoch: number | null; mark: string | null; groupId: string | null }>();
  for (const u of input.updates) {
    if (u.endedEpoch === null) continue;
    for (const id of u.queueIds) if (!usedBy.has(id)) usedBy.set(id, { epoch: u.startedEpoch, mark: null, groupId: null });
    for (const g of u.groups) {
      for (const id of g.queueIds) {
        const prev = usedBy.get(id);
        if (prev && prev.groupId === null) usedBy.set(id, { ...prev, mark: g.mark, groupId: g.id });
      }
    }
  }
  const seen = new Set<string>();
  const trend: MonitorStats["trend"] = [];
  const statusOf: string[] = [];
  const sources: string[] = [];
  const modes: string[] = [];
  let soft = 0;
  let hard = 0;
  let noMark = 0;
  let waiting = 0;
  const callTokens: (TokenCounts | null)[] = [];
  let callPages = 0;
  let callFailed = 0;
  let seconds = 0;
  let secondsN = 0;
  const qaVerdicts: string[] = [];
  const qaScores: number[] = [];
  for (const p of input.pages) {
    const ref: PageRef = { id: p.pageId, title: p.title, titleFound: p.titleFound, pageOf: p.pageOf };
    const boxRunning = p.running && input.runActive && input.runningBoxes.includes(box);
    if (p.call || boxRunning) {
      const c = p.call;
      let state = "done";
      if (boxRunning) state = "running";
      else if (c && !c.ok) state = "failed";
      else if (c?.program) state = "program";
      events.push({
        kind: "call",
        key: `call:${p.pageId}:${p.runFolder ?? ""}`,
        epoch: c?.startedEpoch ?? (boxRunning ? Number.MAX_SAFE_INTEGER - 1 : p.epoch),
        page: ref,
        folder: p.folder,
        runFolder: p.runFolder,
        state,
        running: boxRunning,
        model: c ? (c.program ? "program" : c.model) : null,
        seconds: c?.seconds ?? null,
        tokens: c?.tokens ?? null,
        calls: c && !c.program ? c.calls : 0,
        promptVersion: p.promptVersion,
        verdict: p.qa?.verdict ?? null,
        score: p.qa?.score ?? null,
        error: c?.error ?? null,
      });
      if (c) {
        callPages++;
        if (!c.ok) callFailed++;
        if (c.seconds !== null) {
          seconds += c.seconds;
          secondsN++;
        }
        if (!c.program) callTokens.push(c.tokens);
      }
      if (p.qa && !boxRunning) {
        if (p.qa.verdict) qaVerdicts.push(p.qa.verdict);
        if (p.qa.score !== null) qaScores.push(p.qa.score);
      }
    }
    let onPage = 0;
    const accepted = p.state === "accepted" || p.state === "accepted-fail";
    for (const r0 of p.queue) {
      const r = rec(r0);
      const queueId = str(r?.queue_id);
      if (!r || !queueId) continue;
      const reviewed = str(r.reviewed_box);
      if (reviewed !== null && reviewed !== box) continue;
      const dedupe = `${queueId}@${p.folder ?? ""}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      onPage++;
      const c = rec(r.critique) ?? {};
      const source = str(r.source_type);
      const used = usedBy.get(queueId);
      let status: CritiqueStatus;
      if (used) status = "used";
      else if (accepted) status = "waiting";
      else if (p.running) status = "page-running";
      else status = "page-stopped";
      if (status === "waiting") waiting++;
      const mark = used?.mark ?? null;
      if (mark === "soft") soft++;
      else if (mark === "hard") hard++;
      else noMark++;
      statusOf.push(CRITIQUE_STATUS_WORDS[status].label);
      sources.push(sourceWord(source).label);
      const fm = str(c.failure_mode);
      modes.push(cut(fm, 120) ?? "no failure mode stored");
      const sourceEpoch = source === "reference" ? (p.lossEpoch ?? p.criticEpoch) : (p.criticEpoch ?? p.lossEpoch);
      events.push({
        kind: "critique",
        key: `critique:${queueId}@${p.runFolder ?? ""}`,
        epoch: sourceEpoch ?? p.epoch,
        page: ref,
        folder: p.folder,
        queueId,
        source,
        failureMode: cut(fm),
        reason: cut(str(c.reason)),
        instructionVersion: str(r.instruction_version) ?? str(c.instruction_version),
        status,
        mark,
        groupId: used?.groupId ?? null,
        usedEpoch: used?.epoch ?? null,
        running: status === "page-running",
      });
    }
    if (p.folder) trend.push({ pageId: p.pageId, label: `${p.pageOf ? `${p.pageOf} of ` : ""}${p.title} (${p.pageId})`, n: onPage });
  }
  const results: string[] = [];
  const audits: string[] = [];
  let rejectedTries = 0;
  let softGroups = 0;
  let hardGroups = 0;
  let updatesRunning = 0;
  for (const u of input.updates) {
    const running = u.endedEpoch === null;
    if (running) updatesRunning++;
    const rejected = u.events.filter((e) => e === "prompt-rejected").length;
    rejectedTries += rejected;
    results.push(u.result ?? (running ? "not ended yet" : "result not stored"));
    if (!running) audits.push(u.audit ?? "no audit stored");
    softGroups += u.softGroups ?? 0;
    hardGroups += u.hardGroups ?? 0;
    const page = input.pages.find((p) => p.pageId === u.page);
    events.push({
      kind: "update",
      key: `update:${u.page}:${u.startedEpoch ?? ""}`,
      epoch: u.startedEpoch,
      endedEpoch: u.endedEpoch,
      page: { id: u.page, title: page?.title ?? u.pageText, titleFound: page?.titleFound ?? false, pageOf: page?.pageOf ?? null },
      pageText: u.pageText,
      result: u.result,
      version: u.version,
      parent: u.parent,
      softGroups: u.softGroups,
      hardGroups: u.hardGroups,
      audit: u.audit,
      rejected,
      queueCount: u.queueIds.length,
      seconds: u.seconds,
      calls: u.calls,
      tokens: u.tokens,
      rubric: u.rubric ? `${u.rubric.parent ?? "no earlier version"} -> ${u.rubric.version ?? "?"}` : null,
      running,
    });
  }
  for (const r of input.rubric) {
    events.push({
      kind: "rubric",
      key: `rubric:${r.changeId}`,
      epoch: r.epoch,
      changeId: r.changeId,
      changeKind: r.kind,
      row: r.row,
      name: r.name,
      page: r.page,
      pageText: r.pageText,
      version: r.version,
      parent: r.parent,
      running: false,
    });
  }
  const isQa = box.startsWith("QA_");
  const stats: MonitorStats = {
    critiques: {
      total: statusOf.length,
      bySource: counts(sources),
      byStatus: counts(statusOf),
      byFailureMode: counts(modes).slice(0, 40),
      failureModes: new Set(modes).size,
      soft,
      hard,
      noMark,
    },
    waiting: { count: waiting, n: input.n, nSource: input.nSource },
    updates: { total: input.updates.length, byResult: counts(results), rejectedTries, audit: counts(audits), softGroups, hardGroups, running: updatesRunning },
    versions: { list: sortVersions(input.versions), live: input.liveVersion },
    calls: {
      pages: callPages,
      failed: callFailed,
      seconds,
      meanSeconds: secondsN ? seconds / secondsN : null,
      tokens: sumTokens(callTokens).tokens,
      qa: isQa
        ? {
            pass: qaVerdicts.filter((v) => v === "PASS").length,
            fail: qaVerdicts.filter((v) => v === "FAIL").length,
            other: qaVerdicts.filter((v) => v !== "PASS" && v !== "FAIL").length,
            meanScore: qaScores.length ? qaScores.reduce((a, b) => a + b, 0) / qaScores.length : null,
          }
        : null,
    },
    rubric: isQa ? { changes: input.rubric.length, live: input.liveRubric } : null,
    trend,
  };
  const runningPage = input.runActive ? input.pages.find((p) => p.running) : undefined;
  const now = input.runActive
    ? {
        page: runningPage?.pageId ?? input.runningPage,
        pageLabel: runningPage ? `${runningPage.pageOf ? `${runningPage.pageOf} of ` : ""}${runningPage.title}` : null,
        boxes: input.runningBoxes,
        thisBox: input.runningBoxes.some((b) => b === box || b === `box-critic.${box}`) || events.some((e) => e.kind === "update" && e.running),
      }
    : null;
  const sorted = sortEvents(events);
  const body = { box, stamp: input.stamp, name: boxName(box), runId: input.runId, runLabel: input.runLabel, runWord: input.runWord, now, stats, events: sorted };
  return { ...body, sig: hashText(JSON.stringify(body)), generatedEpoch, millis, error: null };
}

/** An empty monitor with a plain message. */
export function emptyMonitor(box: string, stamp: string, error: string | null, generatedEpoch: number, millis: number): BoxMonitor {
  const input: MonitorInput = {
    box,
    stamp,
    runId: null,
    runLabel: "phase 2 run",
    runWord: stepWord("waiting"),
    pages: [],
    updates: [],
    rubric: [],
    versions: [],
    liveVersion: null,
    liveRubric: null,
    n: null,
    nSource: null,
    runActive: false,
    runningPage: null,
    runningBoxes: [],
  };
  return { ...buildBoxMonitor(input, generatedEpoch, millis), error };
}

// ---------------------------------------------------------------- text of the lines (shared by the screen and the test)

/** "2 min 24 s", "45 s", or "–". */
export function durationText(s: number | null): string {
  if (s === null || !Number.isFinite(s)) return "–";
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s - h * 3600) / 60);
  const sec = Math.round(s - h * 3600 - m * 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min ${sec} s`;
}

/** "page 2 of 3 of <title>", or the title alone. */
export function pageWords(p: { title: string; pageOf: string | null }): string {
  return p.pageOf ? `${p.pageOf} of ${p.title}` : p.title;
}

/** "3 soft, 0 hard groups", or null when the end event holds no group counts. */
export function groupsWords(soft: number | null, hard: number | null): string | null {
  if (soft === null && hard === null) return null;
  return `${soft ?? 0} soft, ${hard ?? 0} hard groups`;
}

/** "critique from box-critic (soft)". */
export function critiqueHead(e: Pick<CritiqueEvent, "source" | "mark" | "status">): string {
  const mark = e.mark ? e.mark : e.status === "used" ? "group mark not stored" : "not grouped yet";
  return `critique from ${sourceWord(e.source).label} (${mark})`;
}

/** "N = 3 (status.json update_n, rule)". */
export function nText(n: number | null, source: string | null): string {
  if (n === null) return "N not stored";
  return `N = ${n}${source ? ` (${source})` : ""}`;
}

/** "2 of N = 3 critiques wait in the queue". */
export function waitingText(w: MonitorStats["waiting"]): string {
  const c = `${w.count} ${w.count === 1 ? "critique waits" : "critiques wait"} in the queue`;
  return w.n === null ? `${c} (N not stored)` : `${c}. An update point starts at N = ${w.n}.`;
}
