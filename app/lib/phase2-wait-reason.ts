// Content filter wait of the live Phase 2 row and of the step view (unit VW103, round 91). Pure functions: no file access, no clock of their own,
// no server-only import. A new file, because the dev server keeps old module instances (see the note of lib/pst.ts). Use only erasable TypeScript syntax here.
// Owner words (Q-A 3:35.4): "This tell nothing about what happen? what is the process? etc". Owner pick (Q-A 3:36.4): "Both: Translator lines in TR93, Viewer now (VW103)".
//
// Source of the key: the Translator unit TR93 (written at the same time as this unit). During a content filter wait of 30 minutes it writes the existing key
// "waiting" of <data>/book-store/paired-dataset/status.json with the same shape as the quota wait (lib/phase2-wait.ts: reason, page, box, since_utc, until_utc,
// wait_s, source, cards, calls) and extra fields. Exact shape that aki-main sent from the TR93 builder (2026-11-13 20:39 PST):
//   {"reason": "content filter", "page": "<article>/p004", "box": "QA_2", "since_utc": ..., "until_utc": ..., "wait_s": 1800.0, "source": "content filter rule",
//    "cards": ["claude-028c2ffe", "claude-aade7ca8", "claude-7f6d8610"], "role": "prompt-rewrite-optimizer", "tag": "QA_2-optimizer-try1", "wait_n": 1, "waits": 4, "calls": 1}
// The value "content filter rule" of "source" is no source of waitOf (lib/phase2-wait.ts knows 3), so waitOf gives source null. This file does not use the source.
// It reads reason, page, box, since_utc, until_utc (waitOf), role, wait_n and waits. It also reads a few other names for the same fields (an older brief named them
// only in words) and ignores every other key. A key that is missing gives a text without that part.
import { clockNear, waitText } from "./phase2-wait";
import type { Phase2Wait } from "./phase2-wait";
// The plain words of the 4 roles are the ones of VW95 (lib/step-tree.ts UPDATE_ROLE_WORDS). One place for the words.
import { UPDATE_ROLE_WORDS as ROLE_WORDS } from "./step-tree";

/** The names of the 4 roles of an update point, in run order (update_agents.py ROLES, update_step.py ROLE_*). */
export const ROLE_ORDER = ["critique-grouper", "critique-group-check-judge", "prompt-rewrite-optimizer", "prompt-audit-judge"];

/** What the row needs from the extra fields of the key "waiting". Every field can be null. */
export interface WaitExtra {
  /** "wait n" of "wait n of 4". */
  n: number | null;
  /** The "4" of "wait n of 4". */
  of: number | null;
  /** The role name, for example "prompt-rewrite-optimizer". */
  role: string | null;
  /** Number of the role (1 to 4). */
  roleN: number | null;
}

function rec(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function count(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 1000 ? Math.round(v) : null;
}

function pick(w: Record<string, unknown>, names: string[]): unknown {
  for (const n of names) if (n in w) return w[n];
  return undefined;
}

/** The extra fields of the value of the key "waiting". Null when the value is no object. This function never throws. */
export function waitExtraOf(v: unknown): WaitExtra | null {
  const w = rec(v);
  if (!w) return null;
  const roleRaw = pick(w, ["role", "update_role", "role_name"]);
  const role = typeof roleRaw === "string" && roleRaw.trim() !== "" ? roleRaw.trim().slice(0, 60) : null;
  const byName = role ? ROLE_ORDER.indexOf(role) + 1 : 0;
  return {
    n: count(pick(w, ["wait_n", "wait_no", "wait_index", "n"])),
    of: count(pick(w, ["wait_of", "wait_max", "max_waits", "waits", "wait_total", "of"])),
    role,
    roleN: count(pick(w, ["role_n", "roleN", "role_no"])) ?? (byName > 0 ? byName : null),
  };
}

/** True when the reason of the key "waiting" names the content filter ("content filter", "content-filter"). */
export function isContentFilter(w: Phase2Wait | null | undefined): boolean {
  return w !== null && w !== undefined && w.reason !== null && /content[ -]?filter/i.test(w.reason);
}

/** "role 3 of 4 prompt-rewrite-optimizer (writes the new prompt)", or null when no role is known. */
export function roleLine(role: string | null, roleN: number | null): string | null {
  if (!role && roleN === null) return null;
  const name = role ?? ROLE_ORDER[(roleN ?? 1) - 1] ?? null;
  const n = roleN ?? (role ? ROLE_ORDER.indexOf(role) + 1 : 0);
  const words = name && ROLE_WORDS[name] ? ` (${ROLE_WORDS[name]})` : "";
  return `${n > 0 ? `role ${n} of ${ROLE_ORDER.length} ` : "role "}${name ?? ""}${words}`.trim();
}

export interface WaitTexts {
  main: string;
  detail: string | null;
}

/**
 * The two lines of a wait. A quota wait keeps its text (waitText of lib/phase2-wait.ts). A content filter wait gets its own words:
 * "Content filter wait 1 of 4: the next try starts at 18:32 PST." and "Wait started 18:02 PST at p004, box QA_2. Role 3 of 4 prompt-rewrite-optimizer (writes the new prompt)."
 * [unit default VW103] The source sentence of a quota wait ("End time from ...") stays out of a content filter wait, because the end is a fixed 30 minutes after the block.
 */
export function waitTexts(w: Phase2Wait, x: WaitExtra | null | undefined, now: number): WaitTexts {
  if (!isContentFilter(w)) return waitText(w, now);
  const nth = x && x.n !== null ? ` ${x.n}${x.of !== null ? ` of ${x.of}` : ""}` : "";
  const end = clockNear(w.untilEpoch, now);
  const main = w.untilEpoch > now ? `Content filter wait${nth}: the next try starts at ${end}.` : `Content filter wait${nth}: the planned end, ${end}, is past. The next try starts at once.`;
  const where = w.page && w.box ? ` at ${w.page}, box ${w.box}` : w.page ? ` at ${w.page}` : w.box ? ` at box ${w.box}` : "";
  const parts: string[] = [];
  if (w.sinceEpoch !== null) parts.push(`Wait started ${clockNear(w.sinceEpoch, now)}${where}.`);
  else if (where) parts.push(`Wait${where}.`);
  const role = x ? roleLine(x.role, x.roleN) : null;
  if (role) parts.push(`${role.charAt(0).toUpperCase()}${role.slice(1)}.`);
  return { main, detail: parts.length ? parts.join(" ") : null };
}
