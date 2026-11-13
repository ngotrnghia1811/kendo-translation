import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PathError, isSafeSegment, resolveInside } from "./safe-path";
import { PHASE2_BOOK, parseHistory } from "./phase2-articles";
import { callsByTag, UPDATE_ROLE_WORDS, versionChange } from "./step-tree";
import { loadStepData, loadStepSummary, safeRunFolder } from "./step-tree-load";
import { parseUtcIso, pstDateTime } from "./pst";
import { pageHref } from "./format";
import { jsonViewHref, sizeMb } from "./json-view";
import { lineDiff, diffCounts } from "./line-diff";
import type { Section, StepData } from "./step-data";
import { modelOptionText } from "./readable-names";
import {
  MONITOR_BOXES,
  buildBoxMonitor,
  emptyMonitor,
  pageWords,
  sourceWord,
  type BoxMonitor,
  type MonitorInput,
  type MonitorPageInput,
  type MonitorRubricInput,
  type MonitorUpdateInput,
} from "./training-monitor";

/**
 * Server side of the training monitor (unit VW98, round 91). It reads files and writes none.
 * The summary reuses loadStepSummary (pages of the whole phase 2 run in run order across restarts, titles, update points of the run).
 * Per page it reads only the light files of one box: calls.jsonl, reference-diff-critic/calls.jsonl, run.json, summary.json, critiques/queue-<BOX>.jsonl.
 * Files of a page run that ended do not change, so their parse stays in memory. The running page is read again at each call.
 * The big files (messages/, parsed/, update point messages) load only when the owner opens a line (loadMonitorItem).
 */

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const STORE = path.join("book-store", PHASE2_BOOK);

async function readTextRel(root: string, rel: string): Promise<string | null> {
  try {
    return await fs.readFile(await resolveInside(rel, root), "utf-8");
  } catch (e) {
    if (e instanceof PathError) throw e;
    return null;
  }
}

async function readJsonRel(root: string, rel: string): Promise<unknown> {
  const t = await readTextRel(root, rel);
  if (t === null) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/** One JSON value per line. A broken line (for example the half line of a file that grows now) is skipped. */
export function parseJsonLines(text: string | null): unknown[] {
  const out: unknown[] = [];
  for (const line of (text ?? "").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* skip a broken line */
    }
  }
  return out;
}

async function listDirRel(root: string, rel: string): Promise<string[]> {
  try {
    return await fs.readdir(await resolveInside(rel, root));
  } catch (e) {
    if (e instanceof PathError) throw e;
    return [];
  }
}

interface Cached<T> {
  key: string;
  value: T;
}

/** Parse a file again only when its modification time or size changed. */
async function cachedParse<T>(root: string, rel: string, cache: Map<string, Cached<T>>, parse: (text: string | null) => T): Promise<T> {
  const file = await resolveInside(rel, root);
  let key = "missing";
  try {
    const st = await fs.stat(file);
    key = `${st.mtimeMs}:${st.size}`;
  } catch {
    /* missing file */
  }
  const hit = cache.get(file);
  if (hit && hit.key === key) return hit.value;
  const value = parse(key === "missing" ? null : await readTextRel(root, rel));
  cache.set(file, { key, value });
  return value;
}

// ---------------------------------------------------------------- history: queue IDs of each update point, N of each run

interface HistoryFacts {
  /** `${box}|${page}|${startedEpoch}` -> queue IDs (the end event replaces those of the start event). */
  queueIds: Map<string, string[]>;
  /** run_id -> N of its start row. */
  runN: Map<string, { n: number | null; source: string | null }>;
}

const historyCache = new Map<string, Cached<HistoryFacts>>();

const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Queue IDs per update point and N per run, from the rows of history.jsonl in file order. */
export function historyFacts(rows: Rec[]): HistoryFacts {
  const queueIds = new Map<string, string[]>();
  const runN = new Map<string, { n: number | null; source: string | null }>();
  const open = new Map<string, string>();
  for (const r of rows) {
    if (r.event === "start") {
      open.clear();
      const run = str(r.run_id);
      if (run) runN.set(run, { n: num(r.update_n), source: str(r.update_n_source) });
      continue;
    }
    const box = str(r.box);
    if (!box) continue;
    if (r.event === "update-point-started") {
      const key = `${box}|${str(r.page) ?? ""}|${parseUtcIso(r.utc) ?? ""}`;
      queueIds.set(key, ids(r.queue_ids));
      open.set(box, key);
    } else if (r.event === "update-point-ended") {
      const key = open.get(box);
      if (key && Array.isArray(r.queue_ids)) queueIds.set(key, ids(r.queue_ids));
      open.delete(box);
    }
  }
  return { queueIds, runN };
}

// ---------------------------------------------------------------- page run folders

interface PageBoxFiles {
  calls: ReturnType<typeof callsByTag>;
  lossEpoch: number | null;
  prompts: Rec | null;
  qa: Record<string, { verdict: string | null; score: number | null }>;
  queues: Map<string, unknown[]>;
}

const endedFolders = new Map<string, PageBoxFiles>();

async function loadPageBox(root: string, folder: string, box: string, ended: boolean): Promise<PageBoxFiles> {
  let files = ended ? endedFolders.get(folder) : undefined;
  if (!files) {
    const calls = callsByTag(parseJsonLines(await readTextRel(root, path.join(folder, "calls.jsonl"))));
    const loss = callsByTag(parseJsonLines(await readTextRel(root, path.join(folder, "reference-diff-critic", "calls.jsonl")))).get("reference-diff-critic");
    const run = rec(await readJsonRel(root, path.join(folder, "run.json")));
    const summary = rec(await readJsonRel(root, path.join(folder, "summary.json")));
    const qa: PageBoxFiles["qa"] = {};
    const sq = rec(summary?.qa);
    for (const n of [0, 1, 2, 3]) {
      const s = rec(sq?.[`QA_${n}`]);
      if (s) qa[`QA_${n}`] = { verdict: str(s.verdict), score: num(s.page_score) };
    }
    files = { calls, lossEpoch: loss?.startedEpoch ?? null, prompts: rec(run?.prompts), qa, queues: new Map() };
    if (ended) endedFolders.set(folder, files);
  }
  if (box.startsWith("QA_") && !files.qa[box]) {
    const r = rec(rec(await readJsonRel(root, path.join(folder, "results", `${box}.json`)))?.score);
    if (r) files.qa[box] = { verdict: str(r.verdict), score: num(r.page_score) };
  }
  if (!files.queues.has(box) || !ended) {
    files.queues.set(box, parseJsonLines(await readTextRel(root, path.join(folder, "critiques", `queue-${box}.jsonl`))));
  }
  return files;
}

// ---------------------------------------------------------------- store files of one box

interface CommitFacts {
  audit: string | null;
  groups: { id: string; mark: string | null; queueIds: string[] }[];
}

const commitCache = new Map<string, Cached<CommitFacts | null>>();
const rubricCache = new Map<string, Cached<unknown[]>>();

function commitFacts(text: string | null): CommitFacts | null {
  if (text === null) return null;
  let c: Rec | null = null;
  try {
    c = rec(JSON.parse(text));
  } catch {
    return null;
  }
  if (!c) return null;
  const groups = Array.isArray(rec(c.ctx)?.groups) ? (rec(c.ctx)?.groups as unknown[]) : [];
  return {
    audit: str(rec(c.audit)?.verdict),
    groups: groups.map((g0) => {
      const g = rec(g0) ?? {};
      return { id: str(g.group_id) ?? "?", mark: str(g.mark), queueIds: ids(g.queue_ids) };
    }),
  };
}

function statusFacts(status: Rec | null): { state: string | null; runId: string | null; runningPage: string | null; runningBoxes: string[]; n: number | null; nSource: string | null } {
  return {
    state: str(status?.state),
    runId: str(status?.run_id),
    runningPage: str(status?.running_page),
    runningBoxes: ids(status?.running_boxes),
    n: num(status?.update_n),
    nSource: str(status?.update_n_source),
  };
}

// ---------------------------------------------------------------- summary

/** The training monitor of one box in the phase 2 run of the list `stamp`. A wrong box or a read error gives a plain message. */
export async function loadBoxMonitor(root: string, stamp: string, box: string): Promise<BoxMonitor> {
  const t0 = Date.now();
  const gen = Math.floor(t0 / 1000);
  if (!MONITOR_BOXES.includes(box)) return emptyMonitor(box, stamp, `Unknown box code ${JSON.stringify(box)}. Pick one of the 16 boxes.`, gen, 0);
  try {
    const summary = await loadStepSummary(root, stamp, new Set());
    if (summary.error) return emptyMonitor(box, stamp, summary.error, gen, Date.now() - t0);
    const status = statusFacts(rec(await readJsonRel(root, path.join(STORE, "status.json"))));
    const facts = await cachedParse(root, path.join(STORE, "history.jsonl"), historyCache, (t) => historyFacts(parseHistory(t ?? "")));
    const runActive = summary.pages.some((p) => p.running) || (status.state === "running" && status.runId !== null && status.runId === summary.runId);
    const pages: MonitorPageInput[] = [];
    for (const p of summary.pages) {
      const folder = safeRunFolder(p.folder);
      let input: MonitorPageInput = {
        pageId: p.pageId,
        title: p.title,
        titleFound: p.titleFound,
        pageOf: p.pageOf,
        state: p.state,
        folder,
        runFolder: p.runFolder,
        running: p.running,
        epoch: p.epoch,
        call: null,
        criticEpoch: null,
        lossEpoch: null,
        promptVersion: null,
        qa: null,
        queue: [],
      };
      if (folder) {
        const f = await loadPageBox(root, folder, box, !p.running);
        input = {
          ...input,
          call: f.calls.get(box) ?? null,
          criticEpoch: f.calls.get(`box-critic.${box}`)?.startedEpoch ?? null,
          lossEpoch: f.lossEpoch,
          promptVersion: str(rec(f.prompts?.[box])?.version),
          qa: box.startsWith("QA_") ? (f.qa[box] ?? null) : null,
          queue: f.queues.get(box) ?? [],
        };
      }
      pages.push(input);
    }
    const updates: MonitorUpdateInput[] = [];
    for (const u of summary.updates) {
      if (u.box !== box) continue;
      const dir = u.page.replace("/", "_");
      const commit =
        u.endedEpoch !== null && isSafeSegment(dir) ? await cachedParse(root, path.join(STORE, "update-points", dir, `commit-${box}.json`), commitCache, commitFacts) : null;
      updates.push({
        page: u.page,
        pageText: u.pageText,
        startedEpoch: u.startedEpoch,
        endedEpoch: u.endedEpoch,
        result: u.result,
        version: u.version,
        parent: u.parent,
        softGroups: u.softGroups,
        hardGroups: u.hardGroups,
        rubric: u.rubric,
        events: u.events,
        seconds: u.seconds,
        calls: u.calls,
        tokens: u.tokens,
        queueIds: facts.queueIds.get(`${box}|${u.page}|${u.startedEpoch ?? ""}`) ?? [],
        audit: commit?.audit ?? null,
        groups: commit?.groups ?? [],
      });
    }
    const rubric: MonitorRubricInput[] = [];
    let liveRubric: string | null = null;
    if (box.startsWith("QA_")) {
      const rows = await cachedParse(root, path.join(STORE, "rubric-tables", "changes.jsonl"), rubricCache, parseJsonLines);
      const runStart = summary.runId ? Date.parse(summary.runId) / 1000 : null;
      for (const r0 of rows) {
        const r = rec(r0);
        const changeId = str(r?.change_id);
        if (!r || !changeId || r.box !== box) continue;
        const epoch = parseUtcIso(r.utc);
        // Only the changes of this run: from its start time on (the change rows hold no run ID).
        if (runStart !== null && Number.isFinite(runStart) && epoch !== null && epoch < runStart) continue;
        const page = str(r.page) ?? str(r.update_point);
        const node = page ? summary.pages.find((x) => x.pageId === page) : undefined;
        const name = str(rec(r.text_after)?.name) ?? str(rec(r.text_before)?.name);
        rubric.push({
          changeId,
          epoch,
          kind: str(r.kind),
          row: num(r.row),
          name,
          page,
          pageText: node ? pageWords(node) : (summary.updates.find((x) => x.page === page)?.pageText ?? page),
          version: str(r.version),
          parent: str(r.parent) ?? str(rec(r.parent)?.version),
        });
      }
      liveRubric = (await readTextRel(root, path.join(STORE, "rubric-tables", box, "current")))?.trim() || null;
    }
    const versions = (await listDirRel(root, path.join(STORE, "prompts", box)))
      .filter((f) => /^v[0-9][0-9.]*\.json$/.test(f))
      .map((f) => f.slice(0, -5));
    const liveVersion = (await readTextRel(root, path.join(STORE, "prompts", box, "current")))?.trim() || null;
    const runN = summary.runId ? facts.runN.get(summary.runId) : undefined;
    const statusIsRun = status.runId !== null && status.runId === summary.runId;
    const input: MonitorInput = {
      box,
      stamp,
      runId: summary.runId,
      runLabel: summary.runLabel,
      runWord: summary.runWord,
      pages,
      updates,
      rubric,
      versions,
      liveVersion,
      liveRubric,
      n: statusIsRun && status.n !== null ? status.n : (runN?.n ?? null),
      nSource: statusIsRun && status.n !== null ? `status.json update_n, ${status.nSource ?? "source not stored"}` : runN?.n != null ? `start row of the run, ${runN.source ?? "source not stored"}` : null,
      runActive,
      runningPage: runActive ? status.runningPage : null,
      runningBoxes: runActive ? status.runningBoxes : [],
    };
    return buildBoxMonitor(input, gen, Date.now() - t0);
  } catch (e) {
    return emptyMonitor(box, stamp, `The training monitor cannot read the phase 2 files: ${(e as Error).message}`, gen, Date.now() - t0);
  }
}

// ---------------------------------------------------------------- data of one opened line

export interface MonitorItemQuery {
  /** "critique", "update" or "rubric". A page call uses the step data API (step=box:TL_2). */
  item: string | null;
  box: string | null;
  folder: string | null;
  queueId: string | null;
  page: string | null;
  change: string | null;
}

/** Keys that hold money. The Viewer shows tokens, never money (Q-A 3:15.2, 3:20.2). */
const MONEY_KEY = /cost/i;

/** A copy of a JSON value without the keys that hold money. */
export function withoutMoney(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(withoutMoney);
  const r = rec(v);
  if (!r) return v;
  const out: Rec = {};
  for (const [k, x] of Object.entries(r)) if (!MONEY_KEY.test(k)) out[k] = withoutMoney(x);
  return out;
}

/** Rows "key path" -> value text of a JSON value. Long texts stay whole. */
export function flatPairs(v: unknown, prefix = ""): [string, string][] {
  const r = rec(v);
  if (Array.isArray(v)) {
    if (v.every((x) => x === null || typeof x !== "object")) return [[prefix || "value", v.length ? v.map((x) => String(x)).join(", ") : "(empty list)"]];
    return v.flatMap((x, i) => flatPairs(x, `${prefix}[${i}]`));
  }
  if (r) {
    const out: [string, string][] = [];
    for (const [k, x] of Object.entries(r)) if (!MONEY_KEY.test(k)) out.push(...flatPairs(x, prefix ? `${prefix}.${k}` : k));
    return out;
  }
  return [[prefix || "value", v === null || v === undefined ? "–" : String(v)]];
}

function textSection(title: string, text: string | null, file: string): Section {
  if (text === null) return { kind: "note", text: `${title}: the file ${file} does not exist.` };
  return { kind: "text", title, text, mb: sizeMb(Buffer.byteLength(text, "utf-8")), file };
}

const BOX = /^(?:TS|TL|ED|QA)_[0-3]$/;

function safePage(page: string | null): string | null {
  if (!page) return null;
  const parts = page.split("/");
  return parts.length === 2 && parts.every(isSafeSegment) ? page : null;
}

/** Order of the update role messages: grouper, group check judges, then optimizer and audit per try. */
export function messageOrder(name: string): number[] {
  if (/-grouper\.txt$/.test(name)) return [0, 0];
  if (/-judge-/.test(name)) return [1, 0];
  const m = /-(optimizer|audit)-try(\d+)\.txt$/.exec(name);
  if (m) return [2 + Number(m[2]), m[1] === "optimizer" ? 0 : 1];
  return [9, 0];
}

function roleOfMessage(name: string): string {
  if (/-grouper\.txt$/.test(name)) return "critique-grouper";
  if (/-judge-/.test(name)) return "critique-group-check-judge";
  if (/-optimizer-/.test(name)) return "prompt-rewrite-optimizer";
  if (/-audit-/.test(name)) return "prompt-audit-judge";
  return "";
}

/** The full data of one line of the time line. A wrong query gives a plain message. */
export async function loadMonitorItem(root: string, q: MonitorItemQuery): Promise<StepData> {
  try {
    const box = q.box && BOX.test(q.box) ? q.box : null;
    if (!box) return { title: "Training monitor", sections: [{ kind: "note", text: "The request names no valid box." }] };
    if (q.item === "critique") return await loadCritique(root, box, safeRunFolder(q.folder), q.queueId);
    if (q.item === "update") return await loadUpdate(root, box, safePage(q.page));
    if (q.item === "rubric") return await loadRubricChange(root, box, q.change);
    return { title: "Training monitor", sections: [{ kind: "note", text: `The request names no valid item: ${JSON.stringify(q.item)}.` }] };
  } catch (e) {
    return { title: "Training monitor", sections: [{ kind: "note", text: `The data cannot be read: ${(e as Error).message}` }] };
  }
}

async function loadCritique(root: string, box: string, folder: string | null, queueId: string | null): Promise<StepData> {
  if (!folder || !queueId) return { title: "Critique", sections: [{ kind: "note", text: "The request names no valid page run folder and queue ID." }] };
  const rel = path.join(folder, "critiques", `queue-${box}.jsonl`);
  const row = rec(parseJsonLines(await readTextRel(root, rel)).find((r) => rec(r)?.queue_id === queueId));
  if (!row) return { title: "Critique", sections: [{ kind: "note", text: `The file ${rel} holds no critique with the queue ID ${queueId}.` }] };
  const source = sourceWord(str(row.source_type));
  const page = str(row.page_id);
  const msg = str(row.source_type) === "reference" ? path.join(folder, "reference-diff-critic", "messages", "reference-diff-critic.txt") : path.join(folder, "messages", `box-critic.${box}.txt`);
  const sections: Section[] = [
    { kind: "pairs", title: "Critique record (all fields)", rows: [["Source", `${source.label}: ${source.help}`], ...flatPairs(row)] },
    {
      kind: "links",
      title: "Files",
      links: [
        ...(page ? [{ text: "Page view of this page run", href: pageHref(page, folder.split("/")[2]) }] : []),
        { text: `critiques/queue-${box}.jsonl`, href: jsonViewHref(rel) },
        { text: "Exact text sent to the critic", href: jsonViewHref(msg) },
      ],
    },
  ];
  return { title: `Critique ${queueId}`, code: box, sections };
}

async function loadUpdate(root: string, box: string, page: string | null): Promise<StepData> {
  if (!page) return { title: "Update point", sections: [{ kind: "note", text: "The request names no valid page." }] };
  const base = await loadStepData(root, { folder: null, step: `update:${box}`, page, diff: null, version: null });
  const dir = path.join(STORE, "update-points", page.replace("/", "_"));
  const commitRel = path.join(dir, `commit-${box}.json`);
  const commit = rec(await readJsonRel(root, commitRel));
  const groups = Array.isArray(rec(commit?.ctx)?.groups) ? (rec(commit?.ctx)?.groups as unknown[]) : [];
  const sections: Section[] = [];
  for (const s of base.sections) {
    if (s.kind === "units" && s.title === "Critique groups") {
      sections.push({
        kind: "units",
        title: `Critique groups (${groups.length})`,
        rows: groups.map((g0) => {
          const g = rec(g0) ?? {};
          const parts = [
            `${str(g.mark) ?? "mark not stored"}`,
            str(g.name),
            str(g.failure_mode) && str(g.failure_mode) !== str(g.name) ? `failure mode: ${str(g.failure_mode)}` : null,
            `${ids(g.queue_ids).length} critiques: ${ids(g.queue_ids).join(", ") || "–"}`,
            str(g.judge_reason) ? `group check judge: ${str(g.judge_reason)}` : null,
          ].filter((x): x is string => x !== null);
          return { id: str(g.group_id) ?? "?", text: parts.join(" · ") };
        }),
      });
    } else if (s.kind === "units" && s.title === "Calls of the update point") {
      // Readable model names with the Claude card name (Q-A 3:17.4, 3:21.3).
      sections.push({ ...s, rows: s.rows.map((r) => ({ ...r, text: r.text.replace(/, model ([^,\s]+),/, (_m, v: string) => `, model ${modelOptionText(v)},`) })) });
    } else if (s.kind !== "links") sections.push(s);
  }
  const names = (await listDirRel(root, path.join(dir, "messages")))
    .filter((n) => n.startsWith(`${box}-`) && n.endsWith(".txt"))
    .sort((a, b) => {
      const x = messageOrder(a);
      const y = messageOrder(b);
      return x[0] - y[0] || x[1] - y[1] || a.localeCompare(b);
    });
  for (const n of names) {
    const role = roleOfMessage(n);
    const word = UPDATE_ROLE_WORDS[role];
    const rel = path.join(dir, "messages", n);
    sections.push(textSection(`Exact text sent: ${n.slice(0, -4)}${word ? ` (${word})` : ""}`, await readTextRel(root, rel), rel));
  }
  if (!names.length) sections.push({ kind: "note", text: `No update role messages of ${box} exist in ${path.join(dir, "messages")}.` });
  if (commit) {
    const shown = withoutMoney(commit);
    sections.push(textSection(`Commit file commit-${box}.json (keys that hold money left out)`, JSON.stringify(shown, null, 2), commitRel));
  } else sections.push({ kind: "note", text: `The commit file ${commitRel} does not exist (the update point did not end, or it wrote no commit).` });
  const links = [{ text: `commit-${box}.json`, href: jsonViewHref(commitRel) }, { text: "calls.jsonl of the update point", href: jsonViewHref(path.join(dir, "calls.jsonl")) }, { text: "Update point folder", href: jsonViewHref(dir) }];
  for (const n of names) links.push({ text: `messages/${n}`, href: jsonViewHref(path.join(dir, "messages", n)) });
  sections.push({ kind: "links", title: "Files", links });
  return { title: `Update point of ${box}`, code: box, sections };
}

async function loadRubricChange(root: string, box: string, change: string | null): Promise<StepData> {
  if (!change) return { title: "Rubric table change", sections: [{ kind: "note", text: "The request names no change ID." }] };
  const rel = path.join(STORE, "rubric-tables", "changes.jsonl");
  const row = rec(parseJsonLines(await readTextRel(root, rel)).find((r) => rec(r)?.change_id === change && rec(r)?.box === box));
  if (!row) return { title: "Rubric table change", sections: [{ kind: "note", text: `The file ${rel} holds no change ${change} of ${box}.` }] };
  const before = JSON.stringify(row.text_before ?? null, null, 2);
  const after = JSON.stringify(row.text_after ?? null, null, 2);
  const lines = lineDiff(before, after);
  const epoch = parseUtcIso(row.utc);
  const scalar = flatPairs(Object.fromEntries(Object.entries(row).filter(([k]) => !["text_before", "text_after", "row_before", "row_after"].includes(k))));
  const sections: Section[] = [
    { kind: "pairs", title: "Change", rows: [["Time", epoch !== null ? pstDateTime(epoch) : "–"], ["Version", versionChange(str(row.parent), str(row.version)) ?? "–"], ...scalar] },
    { kind: "diff", title: `Row text ${str(row.kind) ?? "change"}, row ${num(row.row) ?? "?"}`, lines, counts: diffCounts(lines) },
  ];
  const rb = JSON.stringify(row.row_before ?? null, null, 2);
  const ra = JSON.stringify(row.row_after ?? null, null, 2);
  if (rb !== before || ra !== after) {
    const rl = lineDiff(rb, ra);
    sections.push({ kind: "diff", title: "Whole row", lines: rl, counts: diffCounts(rl) });
  }
  const links = [{ text: "rubric-tables/changes.jsonl", href: jsonViewHref(rel) }];
  for (const v of [str(row.parent), str(row.version)]) {
    if (v && /^v[0-9][0-9.]*$/.test(v)) links.push({ text: `rubric-tables/${box}/${v}.json`, href: jsonViewHref(path.join(STORE, "rubric-tables", box, `${v}.json`)) });
  }
  sections.push({ kind: "links", title: "Files", links });
  return { title: `Rubric table change ${change} of ${box}`, code: box, sections };
}
