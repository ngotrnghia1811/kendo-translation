// The running update point of the phase 2 run (unit VW103, round 91). Pure functions: no file access, no clock of their own, no server-only import.
// A client component and a plain node test (scripts/vw103-test.mjs) can import this file. Use only erasable TypeScript syntax here (no enum, no parameter property).
// Owner words (Q-A 3:35.4), after 10 identical terminal lines during an update point: "This tell nothing about what happen? what is the process? etc".
// Owner pick (Q-A 3:36.4): "Both: Translator lines in TR93, Viewer now (VW103)". Owner rule (Q-A 3:17.4): "Annotate the names intuitively and properly ... Apply this for EVERYTHING."
// Box codes stay codes and get a hover (Q-A 3:18.5, 3:19.2): the texts of this file keep "QA_2" as it is, and components/BoxCode.tsx adds the hover.
//
// Words of the Translator (docs/agents/translator.md "Training model"): an update point rewrites the prompt of one box. It runs after a page, once for each box that
// reached N = 3 critiques. Its 4 roles run in this order: 1 critique-grouper, 2 critique-group-check-judge (one call for each critique group), 3 prompt-rewrite-optimizer,
// 4 prompt-audit-judge (ACCEPT or REJECT). After a REJECT the optimizer runs again with the reject reasons (update_agents.py rewrite: try_no 2).
//
// File facts, read 2026-11-13 20:18 PST on the real data (read only), and in <T2>/data/scripts/translator:
//   - history.jsonl rows: update-point-started {box, page, queue_ids}, prompt-live, rubric-table-live, update-point-ended {box, result}. The page row page-done comes BEFORE
//     the update points of that page, so the page is already accepted while its update point runs, and status.json holds running_page null and running_boxes [].
//   - Folder <store>/update-points/<article>_<page>/: calls.jsonl gets one row when a role call ends: {tag, update_role, update_page, ok, seconds, model, started_utc, attempts [...]}.
//     started_utc of a row is the start of the LAST attempt, not of the call. An attempt is {attempt, card, seconds, blocked, error, ...}.
//   - raw/ holds, for each try n of a call with the tag T (launcher.py run_attempt, lines 702-723): T.try<n>.sent (written at the start of the try), T.try<n>.jsonl (events, grows),
//     T.try<n>.stderr, and T.try<n>.export.json (written when the try ends, only if the event stream names a session). Tags: <BOX>-grouper, <BOX>-judge-CG-<id>,
//     <BOX>-optimizer-try<k>, <BOX>-audit-try<k> (update_agents.py). A re-run of the same update point writes the same names again, so the file times decide.
//   - Card of a try (launcher.py card_for_attempt, unit TR91): try 1 on the own card of the model, each next try on the next card of card_failover, after the last card the first again.
//   - Event stream: {"type":"error","error":{"type":"provider.content-filter","message":...}} for a block. A try that hangs has only step_start events.
// The status.json key running_update of the Translator unit TR93 wins over the folder rule when it exists (brief of VW103): key absent = folder rule, key null = no update point.
import { parseUtcIso } from "./pst";
import { CARD_NAMES, CARD_ORDER, clockNear } from "./phase2-wait";
import type { Phase2Wait } from "./phase2-wait";
import { providerWords } from "./model-card";
import { ROLE_ORDER, isContentFilter, waitTexts } from "./phase2-wait-reason";
import type { WaitExtra } from "./phase2-wait-reason";
import { UPDATE_ROLE_WORDS } from "./step-tree";

/** The number of roles of an update point. */
export const ROLES_TOTAL = ROLE_ORDER.length;
/** [unit default VW103] A running try that wrote no event for this many seconds shows the line "No new output from this try for ...". */
export const QUIET_AFTER_S = 300;
/** A file that is older than the start of the update point by more than this many seconds belongs to an earlier run of the same names. */
const SLACK_S = 1;
const MAX_TRIES = 6;

type Rec = Record<string, unknown>;

function rec(v: unknown): Rec | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : null;
}
function str(v: unknown, max = 80): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  if (t === "") return null;
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}
function posInt(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 1000 ? Math.round(v) : null;
}

// ---------------------------------------------------------------- words

/** "21 s", "8 min 12 s", "1 h 05 min". A negative value shows as "0 s". */
export function durationText(seconds: number): string {
  const t = Math.max(0, Math.round(seconds));
  if (t < 60) return `${t} s`;
  const m = Math.floor(t / 60);
  if (m < 60) return `${m} min ${t - m * 60} s`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m - h * 60).padStart(2, "0")} min`;
}

export interface TagInfo {
  box: string;
  /** Name of the role: a key of UPDATE_ROLE_WORDS. */
  role: string;
  /** Number of the role, 1 to 4. */
  roleN: number;
  /** "CG-U1" for a judge call. */
  group: string | null;
  /** The k of "optimizer-try<k>" and "audit-try<k>": 2 means the second round after a REJECT. */
  round: number | null;
}

/** The parts of a call tag of the update point: "QA_2-optimizer-try2" gives box QA_2, role 3, round 2. Null for another tag. */
export function roleOfTag(tag: string): TagInfo | null {
  const m = /^((?:TS|TL|ED|QA)_[0-3])-(?:(grouper)|judge-([A-Za-z0-9._-]+)|optimizer-try(\d{1,2})|audit-try(\d{1,2}))$/.exec(tag);
  if (!m) return null;
  const role = m[2] ? ROLE_ORDER[0] : m[3] ? ROLE_ORDER[1] : m[4] ? ROLE_ORDER[2] : ROLE_ORDER[3];
  return { box: m[1], role, roleN: ROLE_ORDER.indexOf(role) + 1, group: m[3] ?? null, round: m[4] ? Number(m[4]) : m[5] ? Number(m[5]) : null };
}

/** The card ID for a value of the field card: an ID stays, a short name ("uonlp") gives its ID, another value (a provider such as xai) stays. */
export function cardIdOf(v: unknown): string | null {
  const t = str(v, 40);
  if (!t) return null;
  if (Object.hasOwn(CARD_NAMES, t)) return t;
  const hit = Object.keys(CARD_NAMES).find((id) => CARD_NAMES[id] === t);
  return hit ?? t;
}

/** "Claude card uonlp" for a known card ID, "provider xai" for another value (the rule of lib/model-card.ts). */
export function cardPhrase(card: string): string {
  return providerWords(card);
}

/** The card of try n by the card order (TR91): the own card of the model for try 1, each next try the next card, wrapping. Null when the provider is no card. */
export function cardForTry(provider: string | null, n: number): string | null {
  if (!provider) return null;
  const at = CARD_ORDER.indexOf(provider);
  return at < 0 ? null : CARD_ORDER[(at + n - 1) % CARD_ORDER.length];
}

/** The provider (card ID or other provider) that a role uses, read from the rows of calls.jsonl of an update point. Null when no row of the role exists. */
export function providerOfRole(rows: unknown[], role: string): string | null {
  for (const r0 of rows) {
    const r = rec(r0);
    if (!r || r.kind !== "model" || r.update_role !== role) continue;
    const attempts = Array.isArray(r.attempts) ? r.attempts : [];
    const first = rec(attempts[0]);
    const card = str(first?.card, 40);
    if (card) return card;
    const model = str(r.model, 120);
    const slash = model ? model.indexOf("/") : -1;
    if (model && slash > 0) return model.slice(0, slash);
  }
  return null;
}

// ---------------------------------------------------------------- the facts

export type TryOutcome = "blocked" | "error" | "no-answer" | "answer";

/** One finished try of the running role. */
export interface TryFact {
  n: number;
  card: string | null;
  /** True when the card comes from the card order and not from a field of the run. */
  byRule: boolean;
  startEpoch: number | null;
  endEpoch: number | null;
  outcome: TryOutcome;
  /** Short words of the error, or null. */
  detail: string | null;
}

/** The running update point, as the screens show it. JSON-safe. */
export interface UpdateLive {
  /** "status": the key running_update of status.json (TR93). "folder": the history rows and the files of the update point folder. */
  source: "status" | "folder";
  /** Page ID after which the update point runs: "0a9f6ca7/p004". */
  page: string | null;
  box: string;
  /** Role name, or null when not known. */
  role: string | null;
  roleN: number | null;
  roles: number;
  /** "CG-U1" of a judge call. */
  group: string | null;
  /** Round of the optimizer or the audit (1, 2). */
  round: number | null;
  tag: string | null;
  /** The running try, or the next try when `between` is true. Null when not known. */
  tryN: number | null;
  card: string | null;
  cardFromRule: boolean;
  startedEpoch: number | null;
  tryStartedEpoch: number | null;
  /** Seconds since the last event of the running try. Null when not known. */
  quietSeconds: number | null;
  /** Number of other calls that run at the same time. */
  parallel: number;
  /** True when no call runs at this moment (between two roles, or during a wait before the next try). */
  between: boolean;
  /** Finished tries of the same call, oldest first. */
  earlier: TryFact[];
  /** The key "waiting" of status.json, or null. */
  wait: Phase2Wait | null;
  waitExtra: WaitExtra | null;
  /**
   * True when a content filter wait of this box runs now (the key "waiting" has reason "content filter", the box of this update point, and an end time in the future).
   * The call then waits for its next try. The try number of the key running_update is not used then, because it is not known if it names the try that ended or the next one.
   */
  filterWait?: boolean;
}

// ---------------------------------------------------------------- the key running_update (TR93)

/** What a running_update object or a history row says about the running update point. */
export interface LiveBase {
  page: string | null;
  box: string;
  role: string | null;
  roleN: number | null;
  roles: number | null;
  tag: string | null;
  tryN: number | null;
  card: string | null;
  startedEpoch: number | null;
  tryStartedEpoch: number | null;
}

/**
 * The value of the key running_update: {page, box, role, role_n, roles, tag, try, card, started_utc, try_started_utc}. These names are the exact shape that the
 * TR93 builder wrote (message of aki-main, 2026-11-13 20:39 PST): "try" counts all tries of the call (1 to 7: 3 tries, then up to 4 more after the content filter waits),
 * and "card" can be null for a model that has no card. Null when the value is no object or holds no box. An unknown key is ignored. This function never throws.
 */
export function runningUpdateOf(v: unknown): LiveBase | null {
  const r = rec(v);
  if (!r) return null;
  const tag = str(r.tag, 80);
  const info = tag ? roleOfTag(tag) : null;
  const box = str(r.box, 20) ?? info?.box ?? null;
  if (!box) return null;
  const roleRaw = str(r.role, 60);
  const role = roleRaw ?? info?.role ?? null;
  const byName = role ? ROLE_ORDER.indexOf(role) + 1 : 0;
  return {
    page: str(r.page, 120),
    box,
    role,
    roleN: posInt(r.role_n) ?? (byName > 0 ? byName : (info?.roleN ?? null)),
    roles: posInt(r.roles),
    tag,
    tryN: posInt(r.try),
    card: cardIdOf(r.card),
    startedEpoch: parseUtcIso(r.started_utc),
    tryStartedEpoch: parseUtcIso(r.try_started_utc),
  };
}

// ---------------------------------------------------------------- the open update point of history.jsonl (folder rule)

/** The JSON object rows of a text from the end of history.jsonl. `cut` is true when the text starts in the middle of the file: the first line may be partial. A broken line is skipped. */
export function rowsOfTail(text: string, cut: boolean): Rec[] {
  const lines = text.split("\n");
  if (cut) lines.shift();
  const out: Rec[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    try {
      const v = rec(JSON.parse(t));
      if (v) out.push(v);
    } catch {
      /* skip a broken line (some rows hold control characters) */
    }
  }
  return out;
}

export interface OpenUpdate {
  box: string;
  page: string;
  startedEpoch: number | null;
  /** Pages of the update points that started in the rows, newest first, without doubles. The loader looks there for the card of a role. */
  pages: string[];
}

/**
 * The update point that started and did not end, from the rows of history.jsonl (the rule of updatePoints of lib/step-tree.ts: a "start" row resets, the box
 * names the update point). Null when none is open. With several open, the last one that started wins.
 */
export function openUpdateOf(rows: Rec[]): OpenUpdate | null {
  const open = new Map<string, Rec>();
  const pages: string[] = [];
  for (const r of rows) {
    if (r.event === "start") {
      open.clear();
      continue;
    }
    const box = str(r.box, 20);
    if (!box) continue;
    if (r.event === "update-point-started") {
      open.delete(box);
      open.set(box, r);
      const p = str(r.page, 120);
      if (p) {
        const i = pages.indexOf(p);
        if (i >= 0) pages.splice(i, 1);
        pages.unshift(p);
      }
    } else if (r.event === "update-point-ended") open.delete(box);
  }
  const last = [...open.values()].pop();
  if (!last) return null;
  const page = str(last.page, 120);
  return page ? { box: str(last.box, 20) as string, page, startedEpoch: parseUtcIso(last.utc), pages } : null;
}

// ---------------------------------------------------------------- the files of the folder raw/ (folder rule)

export interface RawKind {
  tag: string;
  n: number;
  kind: "sent" | "export" | "jsonl";
}

/**
 * The part of a file name of raw/ that the rule needs: "QA_2-optimizer-try1.try2.sent" gives tag QA_2-optimizer-try1, try 2, kind "sent".
 * Only the three files .sent, .export.json and .jsonl of a tag of `box` count. Any other name gives null.
 */
export function parseRawName(name: string, box: string): RawKind | null {
  const m = /^(.+)\.try(\d{1,2})\.(sent|export\.json|jsonl)$/.exec(name);
  if (!m || !m[1].startsWith(`${box}-`) || !roleOfTag(m[1])) return null;
  return { tag: m[1], n: Number(m[2]), kind: m[3] === "sent" ? "sent" : m[3] === "jsonl" ? "jsonl" : "export" };
}

/** One try of one call, from the times of its files (milliseconds). */
export interface TryScan {
  tag: string;
  n: number;
  sentMs: number;
  /** Time of the file .export.json, or null when it does not exist. */
  exportMs: number | null;
  jsonlMs: number | null;
}

/** The tries from the files with their times. A try with no .sent file is left out (the .sent file is the start of a try). */
export function assembleTries(files: (RawKind & { mtimeMs: number })[]): TryScan[] {
  const map = new Map<string, TryScan>();
  const at = (f: RawKind) => {
    const k = `${f.tag}#${f.n}`;
    let s = map.get(k);
    if (!s) {
      s = { tag: f.tag, n: f.n, sentMs: -1, exportMs: null, jsonlMs: null };
      map.set(k, s);
    }
    return s;
  };
  for (const f of files) {
    const s = at(f);
    if (f.kind === "sent") s.sentMs = f.mtimeMs;
    else if (f.kind === "export") s.exportMs = f.mtimeMs;
    else s.jsonlMs = f.mtimeMs;
  }
  return [...map.values()].filter((s) => s.sentMs >= 0).sort((a, b) => a.sentMs - b.sentMs || a.n - b.n);
}

/**
 * A try runs while its file .sent exists and its file .export.json is missing or older than the .sent file (a re-run of the same update point leaves an
 * old .export.json). A try does not run when the call has ended (calls.jsonl holds its tag, `ended`) or when a later try of the same tag exists.
 * [unit default VW103] Files that are older than the start of the update point belong to an earlier run and do not count.
 */
export function pickTries(scans: TryScan[], sinceEpoch: number | null, ended: Set<string>): { running: TryScan[]; finished: TryScan[] } {
  const sinceMs = sinceEpoch === null ? 0 : (sinceEpoch - SLACK_S) * 1000;
  const mine = scans.filter((s) => s.sentMs >= sinceMs);
  const top = new Map<string, number>();
  for (const s of mine) top.set(s.tag, Math.max(top.get(s.tag) ?? 0, s.n));
  const open = (s: TryScan) => s.exportMs === null || s.exportMs < s.sentMs;
  const running = mine.filter((s) => open(s) && s.n === top.get(s.tag) && !ended.has(s.tag)).sort((a, b) => b.sentMs - a.sentMs);
  // Every other try is finished. A try with no .export.json that a later try or the end of the call replaced counts as finished too.
  const finished = mine.filter((s) => !running.includes(s));
  return { running, finished };
}

/** The end time of a finished try in milliseconds: the file .export.json, else the last event, else the start. */
export function tryEndMs(s: TryScan): number {
  return s.exportMs !== null && s.exportMs >= s.sentMs ? s.exportMs : (s.jsonlMs ?? s.sentMs);
}

/** The outcome of a finished try from the text of its event file (.jsonl, one JSON object per line). */
export function outcomeOfEvents(text: string): { outcome: TryOutcome; detail: string | null } {
  let err: { type: string; message: string } | null = null;
  let hasText = false;
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let e: Rec | null = null;
    try {
      e = rec(JSON.parse(t));
    } catch {
      continue;
    }
    if (!e) continue;
    if (e.type === "error") {
      const x = rec(e.error);
      err = { type: str(x?.type, 60) ?? "", message: str(x?.message, 300) ?? "" };
    } else if (e.type === "text") hasText = true;
  }
  if (err) {
    if (/content[-_. ]?filter/i.test(`${err.type} ${err.message}`)) return { outcome: "blocked", detail: null };
    const words = [err.type, err.message.split(/[.:]\s/)[0]].filter((x) => x !== "").join(": ");
    return { outcome: "error", detail: str(words, 90) };
  }
  return { outcome: hasText ? "answer" : "no-answer", detail: null };
}

// ---------------------------------------------------------------- the view

export interface LiveInput {
  source: "status" | "folder";
  base: LiveBase;
  /** Epoch seconds of the read. */
  now: number;
  /** All tries of the box in raw/. */
  scans: TryScan[];
  /** Tags whose call ended in this update point (rows of calls.jsonl with a start time after the start of the update point). */
  ended: Set<string>;
  /** Outcome of each finished try, key "<tag>#<n>". A missing key gives "no-answer". */
  outcomes: Map<string, { outcome: TryOutcome; detail: string | null }>;
  /** The provider (card ID) of the model of a role, or null. */
  providerOf: (role: string | null) => string | null;
  wait: Phase2Wait | null;
  waitExtra: WaitExtra | null;
}

/** The view of the running update point from the facts. Pure. */
export function buildLive(i: LiveInput): UpdateLive {
  const b = i.base;
  const { running: live, finished } = pickTries(i.scans, b.startedEpoch, i.ended);
  let tag = b.tag;
  let tryN = b.tryN;
  let tryStarted = b.tryStartedEpoch;
  let quiet: number | null = null;
  let parallel = 0;
  let between = false;
  if (i.source === "folder") {
    tag = null;
    tryN = null;
    tryStarted = null;
    if (live.length > 0) {
      const cur = live[0];
      tag = cur.tag;
      tryN = cur.n;
      tryStarted = Math.floor(cur.sentMs / 1000);
      quiet = Math.max(0, i.now - Math.max(cur.sentMs, cur.jsonlMs ?? 0) / 1000);
      parallel = live.length - 1;
    } else {
      between = true;
      const last = [...finished].sort((a, c) => tryEndMs(c) - tryEndMs(a))[0];
      if (last) {
        tag = last.tag;
        // The call of this tag did not end: the next try comes after a wait. Else the whole call ended and the next role comes.
        tryN = i.ended.has(last.tag) ? null : last.n + 1;
      }
    }
  } else if (tag) {
    // The key running_update names the try. The files of the folder add the quiet time and the calls that run at the same time (when the file of the try is there).
    const s = i.scans.find((x) => x.tag === tag && x.n === tryN);
    if (s) {
      if (tryStarted === null) tryStarted = Math.floor(s.sentMs / 1000);
      if (live.some((x) => x.tag === s.tag && x.n === s.n)) {
        quiet = Math.max(0, i.now - Math.max(s.sentMs, s.jsonlMs ?? 0) / 1000);
        parallel = live.length - 1;
      }
    }
  }
  // A content filter wait of this box (TR93: the key "waiting", reason "content filter"): the call waits for its next try. The try number of the key is not shown then.
  const w = i.wait;
  const filterWait = w !== null && isContentFilter(w) && w.untilEpoch > i.now && (!w.box || w.box === b.box);
  if (filterWait && i.source === "status") {
    between = true;
    tryN = null;
    tryStarted = null;
    quiet = null;
  }
  const info = tag ? roleOfTag(tag) : null;
  const role = info?.role ?? b.role;
  const roleN = info?.roleN ?? b.roleN ?? (role ? ROLE_ORDER.indexOf(role) + 1 || null : null);
  const provider = i.providerOf(role);
  // [unit default VW103] The key running_update names the card itself (TR93 skips a card whose usage window is full), so the card order rule is for the folder source only.
  // A null card in the key shows no card. The same holds for the earlier tries: their cards are not stored while the call runs, so the lines show no card.
  const byStatus = i.source === "status";
  let card = byStatus ? b.card : null;
  let cardFromRule = false;
  if (!byStatus && !card && tryN !== null && !between) {
    card = cardForTry(provider, tryN);
    cardFromRule = card !== null;
  }
  const earlier: TryFact[] = [];
  // A call that ended (a row in calls.jsonl) has no next try, so its tries are no news.
  if (tag && !i.ended.has(tag)) {
    for (const s of finished.filter((x) => x.tag === tag).sort((a, c) => a.n - c.n)) {
      if (s.n === tryN && !between) continue;
      const o = i.outcomes.get(`${s.tag}#${s.n}`) ?? { outcome: "no-answer" as TryOutcome, detail: null };
      const c = byStatus ? null : cardForTry(provider, s.n);
      earlier.push({ n: s.n, card: c, byRule: c !== null, startEpoch: s.sentMs / 1000, endEpoch: tryEndMs(s) / 1000, outcome: o.outcome, detail: o.detail });
    }
  }
  return {
    source: i.source,
    page: b.page,
    box: b.box,
    role,
    roleN,
    roles: b.roles ?? ROLES_TOTAL,
    group: info?.group ?? null,
    round: info?.round ?? null,
    tag,
    tryN,
    card,
    cardFromRule,
    startedEpoch: b.startedEpoch,
    tryStartedEpoch: tryStarted,
    quietSeconds: quiet,
    parallel,
    between,
    earlier: earlier.slice(-MAX_TRIES),
    wait: i.wait,
    waitExtra: i.waitExtra,
    filterWait,
  };
}

// ---------------------------------------------------------------- the text

export interface LiveLine {
  /** Name of the line for a test and for data-phase2-item. */
  key: string;
  text: string;
}

/** "role 3 of 4 prompt-rewrite-optimizer (writes the new prompt, round 2 after an audit REJECT)". Null when no role is known. */
export function roleText(u: UpdateLive): string | null {
  if (!u.role && u.roleN === null) return null;
  const name = u.role ?? ROLE_ORDER[(u.roleN ?? 1) - 1] ?? "";
  const extra: string[] = [];
  const words = UPDATE_ROLE_WORDS[name];
  if (words) extra.push(words);
  if (u.group) extra.push(`group ${u.group}`);
  if (u.round !== null && u.round >= 2) extra.push(name === "prompt-rewrite-optimizer" ? `round ${u.round} after an audit REJECT` : `round ${u.round}`);
  const n = u.roleN !== null ? `role ${u.roleN} of ${u.roles} ` : "role ";
  return `${n}${name}${extra.length ? ` (${extra.join(", ")})` : ""}`.trim();
}

/** "try 2 on Claude card uonlp". Null when no try number is known. */
export function tryText(u: UpdateLive): string | null {
  if (u.tryN === null) return null;
  return `try ${u.tryN}${u.card ? ` on ${cardPhrase(u.card)}` : ""}`;
}

/** The pieces after the box: role, try with card, time of the try. The same pieces serve the row and the step view. */
export function updatePieces(u: UpdateLive, now: number): string[] {
  const out: string[] = [];
  const role = roleText(u);
  if (u.between) {
    out.push("no call runs at this moment");
    if (role && u.filterWait && u.tryN === null) out.push(`${role}, the next try starts after the content filter wait`);
    else if (role && u.tryN !== null) out.push(`${role}, try ${u.tryN - 1} ended, try ${u.tryN} comes next`);
    else if (role) out.push(`last call: ${role}`);
    else out.push("the first call has not started yet");
    return out;
  }
  if (role) out.push(role);
  const t = tryText(u);
  if (t) out.push(t);
  if (u.tryStartedEpoch !== null) out.push(durationText(now - u.tryStartedEpoch));
  else if (u.startedEpoch !== null) out.push(`${durationText(now - u.startedEpoch)} since the update point started`);
  return out;
}

function triesLine(t: TryFact): string {
  const what =
    t.outcome === "blocked" ? "blocked by the content filter" : t.outcome === "error" ? `error${t.detail ? `: ${t.detail}` : ""}` : t.outcome === "answer" ? "answer not accepted" : "no answer";
  const after = t.startEpoch !== null && t.endEpoch !== null ? ` after ${durationText(t.endEpoch - t.startEpoch)}` : "";
  return `Try ${t.n}${t.card ? ` on ${cardPhrase(t.card)}` : ""}: ${what}${after}.`;
}

/** The names of the cards in card order, for the note line: "ntngh, uonlp, ngotr". */
function cardOrderNames(): string {
  return CARD_ORDER.map((id) => CARD_NAMES[id] ?? id).join(", ");
}

export interface LineOptions {
  /** Readable name of the page ("<title>, page 4 of 5 (0a9f6ca7/p004)"), or null. */
  pageLabel: string | null;
  /** "row": the line of the phase 2 row with its lead "Now: update point after ...". "step": the lines under the step, lead "Working now:". */
  place: "row" | "step";
  /** True: add the lines of a wait (the row shows them from its own key "waiting"). */
  withWait: boolean;
}

/**
 * The lines of the running update point at the clock `now` (epoch seconds):
 *   update-now      "Now: update point after <title>, page 4 of 5 (id) · box QA_2 · role 3 of 4 ... · try 2 on Claude card uonlp · 8 min 12 s"
 *                   (place "step": "role 3 of 4 ... · try 2 on Claude card uonlp · 8 min 12 s", the component adds the pill "Working now")
 *   update-times    "Update point of box QA_2 started 19:50 PST (13 min 10 s ago). This try started 20:02 PST."
 *   update-quiet    "No new output from this try for 10 min 5 s."   (only after QUIET_AFTER_S)
 *   update-parallel "1 more call runs at the same time."
 *   update-try-<n>  "Try 1 on Claude card ntngh: blocked by the content filter after 21 s."
 *   update-card-note  one line when a card comes from the card order
 *   waiting, waiting-detail   the wait (only with withWait)
 */
export function updateLines(u: UpdateLive, now: number, o: LineOptions): LiveLine[] {
  const out: LiveLine[] = [];
  const pieces = updatePieces(u, now);
  if (o.place === "row") {
    const after = o.pageLabel ? ` after ${o.pageLabel}` : "";
    out.push({ key: "update-now", text: `Now: update point${after} · box ${u.box}${pieces.length ? ` · ${pieces.join(" · ")}` : ""}` });
  } else {
    // The component adds the pill "Working now" before this text (the same pill as the line of the running boxes of a page).
    out.push({ key: "update-now", text: pieces.join(" · ") });
  }
  const times: string[] = [];
  if (u.startedEpoch !== null) times.push(`Update point of box ${u.box} started ${clockNear(u.startedEpoch, now)} (${durationText(now - u.startedEpoch)} ago).`);
  if (!u.between && u.tryStartedEpoch !== null) times.push(`This try started ${clockNear(u.tryStartedEpoch, now)}.`);
  if (times.length) out.push({ key: "update-times", text: times.join(" ") });
  if (u.quietSeconds !== null && u.quietSeconds >= QUIET_AFTER_S) out.push({ key: "update-quiet", text: `No new output from this try for ${durationText(u.quietSeconds)}.` });
  if (u.parallel > 0) out.push({ key: "update-parallel", text: `${u.parallel} more ${u.parallel === 1 ? "call runs" : "calls run"} at the same time.` });
  for (const t of u.earlier) out.push({ key: `update-try-${t.n}`, text: triesLine(t) });
  if (u.cardFromRule || u.earlier.some((t) => t.byRule)) {
    out.push({ key: "update-card-note", text: `Card names follow the card order of the Translator (${cardOrderNames()}): try 1 uses the card of the model, each next try uses the next card.` });
  }
  if (o.withWait && u.wait) {
    const w = waitTexts(u.wait, u.waitExtra, now);
    out.push({ key: "waiting", text: w.main });
    if (w.detail) out.push({ key: "waiting-detail", text: w.detail });
  }
  return out;
}

/** The text after the pill "Working now" in the line of a closed page of the step view: "prompt update of box QA_2 · role 3 of 4 ... · try 2 on Claude card uonlp · 8 min 12 s". */
export function updateSummaryText(u: UpdateLive, now: number): string {
  const pieces = updatePieces(u, now);
  return `prompt update of box ${u.box}${pieces.length ? ` · ${pieces.join(" · ")}` : ""}`;
}
