// Rules of the Restart dialog on the Monitor dashboard `/` (unit VW77b2, round 82). Pure functions: no file access, no clock, no server-only import.
// The server code (restart-data.ts) reads the files and passes them in as RestartInput. A test runs this file with plain node and the resolve hook
// (scripts/ts-resolve-hook.mjs). Use only erasable TypeScript syntax here (no enum, no parameter property).
//
// Sources:
//   VISION-viewer.md 15.31.2 (the dialog), 15.32.2 (notes and facts), 15.32.3 (quick select rows), 15.32.7 (same phase only), 15.32.9 (defaults 1 to 5),
//   15.33.6 (Starting versions in run 2 or later).
//   Q-A 2026-11-01: round 78 answers 4 and 5 (l66, l67), round 79 answers 4 to 8 (l96 to l100), round 80 answers 17 and 20 and 21 (l139, l142, l143).
//   <T2>/data/scripts/translator/prompts.py (labels), restart.py (prompt_dirs, find_label), critique_queue.py (history events).
// New file on purpose: the dev server keeps old module instances (see the note in lib/pst.ts), so new helpers live in new files.

export const BOXES: string[] = ["TS", "TL", "ED", "QA"].flatMap((s) => [0, 1, 2, 3].map((l) => `${s}_${l}`)); // prompts.py:20-21
export const LABEL_RE = /^v([234])\.([1-9][0-9]*)\.(0|[1-9][0-9]*)$/; // prompts.py:27
export const PHASE_NUMBER: Record<string, number> = { "agent-phase-2": 2, "agent-phase-3": 3, "agent-phase-4": 4 };

/** "v4.1.3" gives {phase 4, run 1, updates 3}. Any other text gives null. */
export function parseVersionLabel(text: unknown): { phase: number; run: number; updates: number } | null {
  const m = typeof text === "string" ? LABEL_RE.exec(text) : null;
  return m ? { phase: +m[1], run: +m[2], updates: +m[3] } : null;
}

// ---------------------------------------------------------------- input (what the server reads)

/** One version file prompts/<BOX>/<label>.json (the keys of prompts.py VERSION_KEYS that the dialog needs). */
export interface VersionInput {
  box: string;
  label: string;
  /** The label that this version was copied or rewritten from (parent.version), or null. */
  parent: string | null;
  /** The key update_point as stored. Its form is not fixed yet (unit TR77d builds the update step), so the rules accept a page ID text and ignore a number. */
  updatePoint: unknown;
  createdUtc: string | null;
  /** The length of critique_ids, or null when the key is absent or not a list. */
  critiqueCount: number | null;
}

/** One page record pages/<pid>.json plus the prompts block of the run.json of the page folder (null when run.json or its block is missing). */
export interface PageInput {
  id: string; // "mental_full/p061"
  n: number; // 61
  accepted: boolean;
  verdict: string | null; // "PASS" or "FAIL"
  acceptedUtc: string | null;
  used: Record<string, string> | null; // box to the label that the page used
}

/** One run of the book: the current run (archive null) or one folder archive/<run ID folder>/. */
export interface RunInput {
  /** The run number from the labels of the current pointers. Null when no pointer names a label of the phase. */
  run: number | null;
  archive: string | null;
  /** The pointer files prompts/<BOX>/current of this run (null when the file is missing or holds a bad label). */
  pointers: Record<string, string | null>;
  pages: PageInput[];
}

export interface RestartInput {
  phase: string; // "agent-phase-4"
  versions: VersionInput[]; // every version file of the phase, in the current run and in the archived runs
  runs: RunInput[];
  /** Labels that earlier Restarts picked, from the history events `restart` (field chosen): box to labels. */
  previousChosen: Record<string, string[]>;
}

// ---------------------------------------------------------------- output

export interface VersionRow {
  label: string;
  run: number;
  updates: number;
  notes: string[]; // fixed order, see notesOf
  noteText: string; // the notes joined with ", " (two notes in one cell)
  pagesLive: string; // "run 1, p061-p065 (5)", "none", or "Not stored"
  passFail: string; // "4 / 1", "none", or "Not stored"
  critiquesUsed: string; // "none", "5", or "Not stored"
  optionText: string; // the text of the option in the pick list
}

export interface QuickRow {
  id: string; // "start", "last", or "run1-p075"
  text: string; // "Starting versions", "Last live versions", "Run 1, after the update point at p075"
  prompts: Record<string, string>; // the 16 labels
}

export interface BoxOptions {
  box: string;
  current: string | null;
  versions: VersionRow[];
}

export interface RestartOptions {
  phase: string;
  phaseNum: number;
  quick: QuickRow[];
  boxes: BoxOptions[];
  /** Words for the owner: a quick select row that is missing, a box with no version. */
  problems: string[];
}

// ---------------------------------------------------------------- helpers

/** "p061" from 61. Page numbers have 3 digits in the page IDs of the book store (p001 to p999). */
export function pageName(n: number): string {
  return "p" + String(n).padStart(3, "0");
}

/** 61 from "p061" or "mental_full/p061". Null for any other text. */
export function pageNumberOf(text: unknown): number | null {
  const m = typeof text === "string" ? /(?:^|\/)p(\d+)$/.exec(text) : null;
  return m ? +m[1] : null;
}

/** Folder form of a run ID (store.py run_id_folder): 2026-11-04T00:15:00-08:00 gives 20261104T001500-0800. Null for any other form. */
export function runIdFolder(runId: unknown): string | null {
  const m = typeof runId === "string" ? /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)-08:00$/.exec(runId) : null;
  return m ? `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6]}-0800` : null;
}

function runOfPages(runs: RunInput[], run: number): PageInput[] {
  return runs.filter((r) => r.run === run).flatMap((r) => r.pages);
}

/**
 * The page after which the update point made this version, or null when no stored fact names it [unit default VW77b2].
 * 1. The key update_point holds a page ID text ("p060" or "mental_full/p060"): that page. (A number there is the count of updates, not a page.)
 * 2. Else the newest accepted page of the same run with accepted_utc at or before created_utc. The update point runs after a page and before the next
 *    page starts, so this page is the page of the update point.
 */
export function updateAfter(v: VersionInput, pages: PageInput[]): number | null {
  const direct = pageNumberOf(v.updatePoint);
  if (direct !== null) return direct;
  const created = v.createdUtc ? Date.parse(v.createdUtc) : NaN;
  if (!Number.isFinite(created)) return null;
  let best: number | null = null;
  for (const p of pages) {
    if (!p.accepted || !p.acceptedUtc) continue;
    const t = Date.parse(p.acceptedUtc);
    if (Number.isFinite(t) && t <= created && (best === null || p.n > best)) best = p.n;
  }
  return best;
}

/**
 * Facts of one version of one box: the pages on which it was live, and the PASS and FAIL counts of those pages (VISION 15.32.2).
 * Only accepted pages count [unit default VW77b2]: a page that failed and runs again is not part of the result of the run.
 * "Not stored" when no page record of the run exists, or when no readable page names the version and a page of the run has no readable run.json block.
 * When some pages are readable and others are not, the text names the pages that are Not stored (up to 3, else the count).
 */
function factsOf(box: string, label: string, run: number, pages: PageInput[]): { pagesLive: string; passFail: string } {
  const accepted = pages.filter((p) => p.accepted);
  if (pages.length === 0) return { pagesLive: "Not stored", passFail: "Not stored" };
  const live = accepted.filter((p) => p.used !== null && p.used[box] === label).sort((a, b) => a.n - b.n);
  if (live.length === 0) {
    return accepted.some((p) => p.used === null) ? { pagesLive: "Not stored", passFail: "Not stored" } : { pagesLive: "none", passFail: "none" };
  }
  const first = live[0];
  const last = live[live.length - 1];
  const span = first.n === last.n ? pageName(first.n) : `${pageName(first.n)}-${pageName(last.n)}`;
  const pass = live.filter((p) => p.verdict === "PASS").length;
  const fail = live.filter((p) => p.verdict === "FAIL").length;
  // A page of the run with no readable run.json can have used this version too. The row names those pages [unit default VW77b2].
  const unknown = accepted.filter((p) => p.used === null).sort((a, b) => a.n - b.n);
  const unknownText = unknown.length === 0 ? "" : unknown.length <= 3 ? `, ${unknown.map((p) => pageName(p.n)).join(" and ")} Not stored` : `, ${unknown.length} pages Not stored`;
  return { pagesLive: `run ${run}, ${span} (${live.length})${unknownText}`, passFail: `${pass} / ${fail}` };
}

// ---------------------------------------------------------------- the options

/**
 * Everything the Restart dialog shows (VISION 15.31.2, 15.32.2, 15.32.3).
 *
 * Pick list of a box: every saved version of this box in the phase, from prompts/ and archive/<run ID folder>/prompts/, oldest first (round 79 answer 8: same phase only).
 *
 * Notes of a version, in this fixed order (VISION 15.32.9, default 1):
 *   "starting version" (v<phase>.1.0) or "restart start version (copy of vX)" (v<phase>.<run 2 or more>.0),
 *   "last version of run N" (the pointer of an archived run N), "previous restart version" (an earlier Restart picked it),
 *   "current live version" (the pointer of the current run), "update after pNNN".
 *
 * Quick select rows (VISION 15.32.3): "Starting versions" (v<phase>.1.0 for all boxes, round 80 answer 17), "Last live versions" (the 16 pointers of the current run),
 * then for each run of the phase, oldest first, one row for each page X where at least one rewrite went live after X (round 79 answers 6 and 7).
 * The 16 versions of that row [unit default VW77b2]: for each box, the version of that run with the most updates among the versions made after a page up to X.
 * A box with no such version keeps the start version of the run (v<phase>.<run>.0). Example: ED_2 has v4.1.1 after p020 and v4.1.3 after p060. The row
 * "Run 1, after the update point at p050" holds v4.1.1 for ED_2. The row "Run 1, after the update point at p075" holds v4.1.3, unless a later version exists up to p075.
 */
export function buildRestartOptions(input: RestartInput): RestartOptions {
  const phaseNum = PHASE_NUMBER[input.phase] ?? 0;
  const problems: string[] = [];
  const versions = new Map<string, VersionInput>(); // box + label, the first file wins
  for (const v of input.versions) {
    const p = parseVersionLabel(v.label);
    if (!p || p.phase !== phaseNum || !BOXES.includes(v.box)) continue;
    if (!versions.has(v.box + "|" + v.label)) versions.set(v.box + "|" + v.label, v);
  }
  const current = input.runs.find((r) => r.archive === null);
  const currentPointers = current?.pointers ?? {};

  // update-after page of every version with updates, once
  const after = new Map<string, number | null>();
  for (const v of versions.values()) {
    const p = parseVersionLabel(v.label);
    if (p && p.updates >= 1) after.set(v.box + "|" + v.label, updateAfter(v, runOfPages(input.runs, p.run)));
  }

  const rows: BoxOptions[] = BOXES.map((box) => {
    const list = [...versions.values()]
      .filter((v) => v.box === box)
      .map((v) => ({ v, p: parseVersionLabel(v.label) as { phase: number; run: number; updates: number } }))
      .sort((a, b) => a.p.run - b.p.run || a.p.updates - b.p.updates);
    if (list.length === 0) problems.push(`Box ${box} has no saved version of ${input.phase}.`);
    const out: VersionRow[] = list.map(({ v, p }) => {
      const notes: string[] = [];
      if (p.updates === 0) notes.push(p.run === 1 ? "starting version" : `restart start version${v.parent ? ` (copy of ${v.parent})` : ""}`);
      for (const r of input.runs) if (r.archive !== null && r.run !== null && r.pointers[box] === v.label) notes.push(`last version of run ${r.run}`);
      if ((input.previousChosen[box] ?? []).includes(v.label)) notes.push("previous restart version");
      if (currentPointers[box] === v.label) notes.push("current live version");
      if (p.updates >= 1) {
        const a = after.get(box + "|" + v.label) ?? null;
        notes.push(a === null ? "update, page not stored" : `update after ${pageName(a)}`);
      }
      const f = factsOf(box, v.label, p.run, runOfPages(input.runs, p.run));
      const critiquesUsed = p.updates === 0 ? "none" : v.critiqueCount !== null && v.critiqueCount > 0 ? String(v.critiqueCount) : "Not stored";
      const noteText = notes.join(", ");
      return { label: v.label, run: p.run, updates: p.updates, notes, noteText, pagesLive: f.pagesLive, passFail: f.passFail, critiquesUsed, optionText: noteText ? `${v.label} · ${noteText}` : v.label };
    });
    return { box, current: currentPointers[box] ?? null, versions: out };
  });

  // quick select
  const quick: QuickRow[] = [];
  const has = (box: string, label: string) => versions.has(box + "|" + label);
  const start: Record<string, string> = {};
  const startLabel = `v${phaseNum}.1.0`;
  const noStart = BOXES.filter((b) => !has(b, startLabel));
  if (noStart.length === 0) {
    for (const b of BOXES) start[b] = startLabel;
    quick.push({ id: "start", text: "Starting versions", prompts: start });
  } else {
    problems.push(`The quick select "Starting versions" is not offered: ${noStart.join(", ")} ha${noStart.length === 1 ? "s" : "ve"} no file for ${startLabel}.`);
  }
  const live: Record<string, string> = {};
  const noLive = BOXES.filter((b) => !currentPointers[b] || !has(b, currentPointers[b] as string));
  if (noLive.length === 0) {
    for (const b of BOXES) live[b] = currentPointers[b] as string;
    quick.push({ id: "last", text: "Last live versions", prompts: live });
  } else {
    problems.push(`The quick select "Last live versions" is not offered: ${noLive.join(", ")} ha${noLive.length === 1 ? "s" : "ve"} no readable pointer file.`);
  }
  const runNumbers = [...new Set([...versions.values()].map((v) => (parseVersionLabel(v.label) as { run: number }).run))].sort((a, b) => a - b);
  for (const run of runNumbers) {
    const ofRun = [...versions.values()].filter((v) => (parseVersionLabel(v.label) as { run: number }).run === run);
    const pagesX = [...new Set(ofRun.filter((v) => (parseVersionLabel(v.label) as { updates: number }).updates >= 1).map((v) => after.get(v.box + "|" + v.label) ?? null).filter((x): x is number => x !== null))].sort((a, b) => a - b);
    const unplaced = ofRun.filter((v) => (parseVersionLabel(v.label) as { updates: number }).updates >= 1 && (after.get(v.box + "|" + v.label) ?? null) === null);
    for (const v of unplaced) problems.push(`${v.box} ${v.label}: the page of its update point is not stored, so no quick select row names it.`);
    for (const x of pagesX) {
      const prompts: Record<string, string> = {};
      let missing: string | null = null;
      for (const b of BOXES) {
        let pick: VersionInput | null = null;
        let pickUpdates = 0;
        for (const v of ofRun) {
          if (v.box !== b) continue;
          const u = (parseVersionLabel(v.label) as { updates: number }).updates;
          const a = after.get(v.box + "|" + v.label) ?? null;
          if (u >= 1 && a !== null && a <= x && u > pickUpdates) {
            pick = v;
            pickUpdates = u;
          }
        }
        const label = pick ? pick.label : `v${phaseNum}.${run}.0`;
        if (!has(b, label)) {
          missing = `${b} has no file for ${label}`;
          break;
        }
        prompts[b] = label;
      }
      const text = `Run ${run}, after the update point at ${pageName(x)}`;
      if (missing) problems.push(`The quick select "${text}" is not offered: ${missing}.`);
      else quick.push({ id: `run${run}-${pageName(x)}`, text, prompts });
    }
  }
  return { phase: input.phase, phaseNum, quick, boxes: rows, problems };
}

/** The first problem of a map of 16 labels against the options, or null. Used by the dialog to switch the Restart button off. */
export function mapProblem(options: RestartOptions, prompts: Record<string, string>): string | null {
  for (const b of options.boxes) {
    const label = prompts[b.box];
    if (!label || !b.versions.some((v) => v.label === label)) return `${b.box} ${label ?? "(no version)"} has no file.`;
  }
  return null;
}

// ---------------------------------------------------------------- the Restart mark (the write route in book-restart-actions.ts uses these two functions)

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** The exact bytes of store.write_mark for a Restart mark. `prompts` must hold the 16 boxes. */
export function restartMarkText(book: string, phase: string, prompts: Record<string, string>, requestedUtc: string): string {
  const ordered: Record<string, string> = {};
  for (const b of BOXES) ordered[b] = prompts[b];
  return JSON.stringify({ schema: "book-request-v1", book, action: "restart", phase, prompts: ordered, requested_utc: requestedUtc, requested_by: "Monitor dashboard" }, null, 1) + "\n";
}

/** Check the body of a Restart press. Returns the words of a 400, or null. */
export function restartBodyProblem(body: Record<string, unknown>): string | null {
  const phase = body.phase;
  if (phase !== "agent-phase-3" && phase !== "agent-phase-4") return 'The body needs phase ("agent-phase-3" or "agent-phase-4").';
  const prompts = body.prompts;
  if (!isPlainObject(prompts)) return "The body needs prompts, a map of the 16 boxes to labels.";
  const keys = Object.keys(prompts);
  const wrong = [...new Set([...keys.filter((k) => !BOXES.includes(k)), ...BOXES.filter((b) => !keys.includes(b))])];
  if (wrong.length > 0) return `prompts must name exactly the 16 boxes. These differ: ${wrong.join(", ")}.`;
  for (const b of BOXES) {
    const label = prompts[b];
    const m = typeof label === "string" ? LABEL_RE.exec(label) : null;
    if (!m) return `prompts: box ${b} has ${JSON.stringify(label)}, which is not a label of the form v<phase>.<run>.<updates>.`;
    if (+m[1] !== PHASE_NUMBER[phase]) return `prompts: box ${b} has label ${label}. The mark names ${phase}, so the label must start with v${PHASE_NUMBER[phase]}.`;
  }
  return null;
}

