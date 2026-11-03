// Critique share and stop flags of the Details view `/monitor/<slug>` (unit VW77c, round 86). Pure functions: no file access, no server-only import.
// A test runs this file with plain node and the resolve hook (scripts/ts-resolve-hook.mjs). Use only erasable TypeScript syntax here.
//
// The events come from <T2>/data/book-store/<book>/history.jsonl. The rules copy <T2>/data/scripts/translator/critique_queue.py at HEAD 6214100:
//   current_run_events   the events after the last "restart" or "phase-changed" event
//   critique_share       used = queue IDs of the events update-point-ended with the result "rewrite live", dropped = the result "rejected twice"
//   double_reject_row    a "rejected twice" adds to the row, a "rewrite live" ends it, a "resumed" event after a "box-stopped" event of the box ends it
// Owner words: round 74 answer 2 (Q-A 2026-10-31 l28): "option 1. we will want to record the percentage of actually used critique vs rejected".
// VISION-viewer 15.27.4 (stop flag) and 15.27.5 (critique share). Test: scripts/smoke.mjs mode `details` runs critique_share of the Translator on the same events.

export type HistoryEvent = Record<string, unknown> & { event?: unknown };

export const RESET_EVENTS = ["restart", "phase-changed"]; // critique_queue.py RESET_EVENTS
export const UPDATE_ENDED = "update-point-ended";
export const UPDATE_STARTED = "update-point-started";
export const PROMPT_REJECTED = "prompt-rejected";
export const BOX_STOPPED = "box-stopped";
export const RESUMED = "resumed";
export const DOUBLE_REJECT_LIMIT = 3; // critique_queue.py DOUBLE_REJECT_LIMIT

/** The events of the current book run: the events after the last reset event (critique_queue.py current_run_events). */
export function currentRunEvents(events: HistoryEvent[]): HistoryEvent[] {
  let last = -1;
  events.forEach((ev, i) => {
    if (typeof ev.event === "string" && RESET_EVENTS.includes(ev.event)) last = i;
  });
  return events.slice(last + 1);
}

/** Python round(x, 1): the exact binary value decides, a tie goes to the even digit. toFixed(1) of JavaScript rounds a tie up (6.25 gives 6.3, Python gives 6.2). */
export function pyRound1(x: number): number {
  // A tie at one decimal is a value n + 0.25 or n + 0.75. Both are exact in binary, and x * 4 is exact too.
  if (Number.isInteger(x * 4) && !Number.isInteger(x * 2)) {
    const k = Math.floor(x * 10);
    return (k % 2 === 0 ? k : k + 1) / 10;
  }
  return Number(x.toFixed(1));
}

/** Same keys as the dict of critique_queue.py _share, so that a test can compare the JSON of both. */
export interface Share {
  used: number;
  dropped: number;
  total: number;
  used_percent: number | null;
  dropped_percent: number | null;
}

function share(used: number, dropped: number): Share {
  const total = used + dropped;
  return {
    used,
    dropped,
    total,
    used_percent: total ? pyRound1((100.0 * used) / total) : null,
    dropped_percent: total ? pyRound1((100.0 * dropped) / total) : null,
  };
}

export interface ShareResult {
  boxes: Record<string, Share>;
  total: Share;
}

function idCount(ev: HistoryEvent): number {
  const q = ev.queue_ids;
  return Array.isArray(q) ? q.length : 0;
}

/**
 * The critique share of the current book run (critique_queue.py critique_share). `boxes` sets the box order with all boxes shown.
 * Without `boxes`, the result holds the boxes that have an event update-point-ended, in the order of the first event.
 */
export function critiqueShare(events: HistoryEvent[], boxes?: string[]): ShareResult {
  const used = new Map<string, number>();
  const dropped = new Map<string, number>();
  for (const b of boxes ?? []) {
    used.set(b, 0);
    dropped.set(b, 0);
  }
  for (const ev of currentRunEvents(events)) {
    if (ev.event !== UPDATE_ENDED) continue;
    const box = typeof ev.box === "string" ? ev.box : "null"; // json.dumps writes None as null
    const n = idCount(ev);
    if (!used.has(box)) used.set(box, 0);
    if (!dropped.has(box)) dropped.set(box, 0);
    if (ev.result === "rewrite live") used.set(box, (used.get(box) ?? 0) + n);
    else if (ev.result === "rejected twice") dropped.set(box, (dropped.get(box) ?? 0) + n);
  }
  const out: Record<string, Share> = {};
  let u = 0;
  let d = 0;
  for (const [b, v] of used) {
    out[b] = share(v, dropped.get(b) ?? 0);
    u += v;
    d += dropped.get(b) ?? 0;
  }
  return { boxes: out, total: share(u, d) };
}

/** "10 of 15 (66.7 percent)". A box with no critique in its events reads "0 of 0". */
export function shareText(count: number, total: number, percent: number | null): string {
  return percent === null ? `${count} of ${total}` : `${count} of ${total} (${percent.toFixed(1)} percent)`;
}

// ---------------------------------------------------------------- stop flags

/** One try of a rewrite that the audit or a check rejected (event prompt-rejected). */
export interface RejectTry {
  try: number | null;
  /** The failed checks of the try in the order format, message-rebuild, audit. The old event form holds the field `check` only. */
  checks: string[];
  reasons: string[];
}

/** One update point that ended with the result "rejected twice". */
export interface DoubleReject {
  /** The page after which the update point ran (event update-point-started, key page). Null when the event is missing. */
  page: string | null;
  tries: RejectTry[];
  queueIds: string[];
}

export interface StopFlag {
  box: string;
  count: number;
  /** "ED_2 stopped after 3 double REJECTs in a row" (VISION 15.27.4, round 73b answer 2, round 74 answer 5). */
  text: string;
  /** The double REJECTs of the row, oldest first, as many as the count. */
  rejects: DoubleReject[];
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function tryOf(ev: HistoryEvent): RejectTry {
  const checks = strList(ev.checks);
  const one = typeof ev.check === "string" && ev.check !== "" ? [ev.check] : [];
  return { try: typeof ev.try === "number" ? ev.try : null, checks: checks.length > 0 ? checks : one, reasons: strList(ev.reasons) };
}

/**
 * The boxes that are stopped now: a box-stopped event of the current run that no later "resumed" event ended (double_reject_row).
 * Each flag carries the double REJECTs of the row. A Resume after the stop sets the row of the stopped box back to 0, so its flag goes away.
 */
export function stopFlags(events: HistoryEvent[]): StopFlag[] {
  const open = new Map<string, { page: string | null; tries: RejectTry[] }>();
  const row = new Map<string, DoubleReject[]>();
  const flags = new Map<string, StopFlag>();
  for (const ev of currentRunEvents(events)) {
    const box = typeof ev.box === "string" ? ev.box : null;
    if (ev.event === UPDATE_STARTED && box) {
      open.set(box, { page: typeof ev.page === "string" ? ev.page : null, tries: [] });
    } else if (ev.event === PROMPT_REJECTED && box) {
      const o = open.get(box) ?? { page: null, tries: [] };
      o.tries.push(tryOf(ev));
      open.set(box, o);
    } else if (ev.event === UPDATE_ENDED && box) {
      const o = open.get(box) ?? { page: null, tries: [] };
      if (ev.result === "rejected twice") row.set(box, [...(row.get(box) ?? []), { page: o.page, tries: o.tries, queueIds: strList(ev.queue_ids) }]);
      else row.set(box, []);
      open.delete(box);
    } else if (ev.event === BOX_STOPPED && box) {
      const mine = row.get(box) ?? [];
      const count = typeof ev.count === "number" && ev.count > 0 ? ev.count : mine.length || DOUBLE_REJECT_LIMIT;
      flags.set(box, { box, count, text: `${box} stopped after ${count} double REJECTs in a row`, rejects: mine.slice(-count) });
    } else if (ev.event === RESUMED) {
      for (const b of flags.keys()) row.set(b, []);
      flags.clear();
    }
  }
  return [...flags.values()];
}

function pageName(page: string | null): string | null {
  if (!page) return null;
  const i = page.lastIndexOf("/");
  return i >= 0 ? page.slice(i + 1) : page;
}

/**
 * The reject reasons that the flag shows [unit default VW77c]: for each double REJECT of the row, the reasons of its last try with the names of the failed checks.
 * Example: { head: "After p050, try 2, check audit", reasons: ["AUDIT FAIL: the new text drops the rule for term lists."] }.
 */
export function rejectLines(flag: StopFlag): { head: string; reasons: string[] }[] {
  return flag.rejects.map((dr) => {
    const last = dr.tries.length > 0 ? dr.tries[dr.tries.length - 1] : null;
    const where = pageName(dr.page);
    const parts: string[] = [];
    if (where) parts.push(`After ${where}`);
    if (last?.try != null) parts.push(`try ${last.try}`);
    if (last && last.checks.length > 0) parts.push(`${last.checks.length === 1 ? "check" : "checks"} ${last.checks.join(" and ")}`);
    return { head: parts.length > 0 ? parts.join(", ") : "Update point", reasons: last && last.reasons.length > 0 ? last.reasons : ["No reason is stored."] };
  });
}
