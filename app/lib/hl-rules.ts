// Color highlight rules of the Monitor pages (unit VW127, plan P67, card P67.1).
// Owner visual issue 20261122-164451-f6e316 (2026-11-22 16:44 PST), comment word for word: "Add some highlight color to the information.\r\nUse as much color highlight as possible".
// Owner pick Q-A 3:122.4 "Rows 1-9, all Monitor pages". The rows (aki-main proposal, accepted by the owner):
//   1 book title: bold, accent color.            2 page ID (p023): a small blue chip.
//   3 box names: TS teal, TL blue, ED purple, QA orange. A critic of a box: the same color with a dashed border.
//   4 times (clock times, dates, PST): green. Durations ("2 h 5 min", "37.9 min", "21 h ago"): bold.
//   5 last sign of life: green under 2 min, amber from 2 to 10 min, red over 10 min.
//   6 counts (pages done of total, calls, tokens, failed calls): bold. A failed count above 0: red.
//   7 stop reasons: finished or completed green, pause amber, an error or a failure red.
//   8 folder names: gray monospace, small.       9 contrast: every new text pair reaches 4.5 to 1 in all 5 themes (scripts/vw127-test.mjs).
// This file is pure: no file access, no clock of its own, no server-only import. A test runs it with plain node (scripts/vw127-test.mjs).
// Use only erasable TypeScript syntax here (no enum, no parameter property).
// The rules only CUT a text into segments. The text itself never changes: the segments joined give the old string byte for byte (the test proves it).
// A new file, because the dev server keeps old module instances (VW77a lesson): lib/book-status-rules.ts and lib/phase2-row.ts get no change and no new export.
import type { Seg } from "./book-status-rules";
import { agoText } from "./book-status-rules";

/** The kind of one piece of a line. "plain" has no highlight. */
export type HlKind = "plain" | "title" | "page" | "box" | "critic" | "time" | "duration" | "count" | "failed" | "reason" | "alive" | "folder";
/** The meaning of a color: good = green, warn = amber, bad = red, none = no color rule (gray). */
export type HlTone = "good" | "warn" | "bad" | "none";
export type HlStage = "TS" | "TL" | "ED" | "QA";

export interface HlSeg {
  kind: HlKind;
  text: string;
  /** Set for the kinds alive, reason and failed. */
  tone?: HlTone;
  /** Set for the kinds box and critic. */
  stage?: HlStage;
}

/** All kinds that a segment can have, in the order of the rows. A test checks that each one is drawn. */
export const HL_KINDS: HlKind[] = ["title", "page", "box", "critic", "time", "duration", "count", "failed", "reason", "alive", "folder"];

// ---------------------------------------------------------------- row 5: last sign of life

/** Unit VW127 (Q-A 3:122.4 row 5): the color of the age of the last sign of life, in seconds. Under 120 s green, 120 s to 600 s amber, over 600 s red, unknown gray. */
export const ALIVE_AMBER_FROM_S = 120;
export const ALIVE_RED_OVER_S = 600;

export function aliveTone(ageSeconds: number | null | undefined): HlTone {
  if (ageSeconds === null || ageSeconds === undefined || !Number.isFinite(ageSeconds)) return "none";
  const s = Math.max(0, ageSeconds);
  if (s < ALIVE_AMBER_FROM_S) return "good";
  if (s <= ALIVE_RED_OVER_S) return "warn";
  return "bad";
}

// ---------------------------------------------------------------- row 6: counts

/** Unit VW127 (Q-A 3:122.4 row 6): a failed count above 0 is red, 0 is not. */
export function failedTone(n: number | null | undefined): HlTone {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? "bad" : "none";
}

// ---------------------------------------------------------------- row 7: stop reasons

/**
 * Unit VW127 (Q-A 3:122.4 row 7): the color of a stop reason text.
 *   green: finished, completed, target reached.   amber: Pause, Ctrl-C, Restart, interrupted (a person or a signal stopped the run).
 *   red: a failure or an error (fail, error, invalid, gone, silent, guard, rule).   Another text: none (no color).
 */
export function reasonTone(text: string): HlTone {
  const t = text.trim();
  if (t === "") return "none";
  if (/\b(fail(?:s|ed|ure)?|errors?|invalid|gone|silent|guard|rule)\b/i.test(t)) return "bad";
  if (/\b(finished|completed?|target reached|target-reached)\b/i.test(t)) return "good";
  if (/^(pause|ctrl-c|restart)\b/i.test(t) || /\b(pause requested|interrupted)\b/i.test(t)) return "warn";
  return "none";
}

// ---------------------------------------------------------------- the cutter

const STAGE = "(?:TS|TL|ED|QA)";
const MONTHS = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
const AGO = "(?:\\d+ s ago|\\d+ min ago|\\d+ h ago|\\d+ days? ago|just now)";

// Order matters: at one place the first alternative that matches wins. The longer forms stand first.
const PARTS: string[] = [
  // critic of a box: "box-critic.ED_3" (the code of the Translator) or the words "critic of box ED_3" / "critic of ED_3"
  `(?<critic>(?<![\\w.-])(?:box-critic\\.${STAGE}_[0-3]|critic of (?:box )?${STAGE}_[0-3])(?!\\w))`,
  `(?<box>(?<![\\w.-])${STAGE}_[0-3](?!\\w))`,
  // page ID: p023, p0798. A name inside a path ("ogawa_lecture_part2_p089/", "left_foot_full/p012") has a letter, digit, underscore, dot, dash or slash before it and does not match.
  `(?<page>(?<![A-Za-z0-9_./-])p\\d{3,4}(?![A-Za-z0-9_]))`,
  // last sign of life: the age after these words (the exact seconds come from the caller when it has them)
  `(?<alive>(?<=Last sign of life )${AGO})`,
  // stop reasons
  `(?<reasonvalue>(?<=Stop reason: )[^(]*?(?= \\(|\\.?$))`,
  `(?<reasonby>(?<=Stopped by )(?:Pause|Ctrl-C|Restart|failure)(?![\\w-]))`,
  `(?<reasonphrase>(?:its pages in )?the list finished|the list ended with \\d+ errors?|the list was interrupted|the process is (?:gone|silent)|FAIL(?: \\(old rule\\))?|Pause requested|(?<![\\w-])Completed(?![\\w-]))`,
  // times (PST): "2026-11-22 17:29 PST", "Oct 28 21:12 PST", "08:00 PST", "22:06:12 PST", a plain date "2026-11-22"
  `(?<time>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}(?::\\d{2})? PST|${MONTHS} \\d{1,2} \\d{2}:\\d{2} PST|\\d{2}:\\d{2}(?::\\d{2})? PST|(?<![\\d-])\\d{4}-\\d{2}-\\d{2}(?![\\dT:-]))`,
  // durations: "N s ago", "N min ago", "N h ago", "N days ago", "just now", "2 h 5 min", "37.9 min", "12 min 30 s", "1h 25m", "ETA 64h", "30 s"
  `(?<duration>${AGO}|(?:ETA )?(?<![\\w.:-])\\d+ ?h(?: ?\\d+ ?m(?:in)?)?(?![\\w])|(?<![\\w.:-])\\d+(?:\\.\\d+)? min(?: \\d+ s)?(?![\\w])|(?<![\\w.:-])\\d+(?:\\.\\d+)? s(?![\\w]))`,
  // counts: "37 of 120 pages", "2 / 640", "2 list folders", "1 error", "1,665 calls", "input 10,715,711"
  `(?<count>(?<![\\w.,:-])\\d[\\d,]* of \\d[\\d,]*(?: pages?)?(?![\\w])|(?<![\\w.,:-])\\d[\\d,]* / \\d[\\d,]*(?![\\w])|(?<![\\w.,:-])\\d[\\d,]* (?:pages? done|pages?|list folders?|errors?|calls?|books?|articles?|pairs?)(?![\\w])|(?<=(?:input|output|reasoning|cache read|cache write) )\\d[\\d,]*)`,
];

const CUT_RE = new RegExp(PARTS.join("|"), "gu");

/** The stage of a box code or a critic text: "box-critic.ED_3" gives "ED". */
export function stageOf(code: string): HlStage | null {
  const m = /(TS|TL|ED|QA)_[0-3]/.exec(code);
  return m ? (m[1] as HlStage) : null;
}

/** The age in seconds that a text "3 s ago" or "2 min ago" names, at the precision of the text. Null for another text. "just now" is 0. */
export function agoSeconds(text: string): number | null {
  if (text === "just now") return 0;
  const m = /^(\d+) (s|min|h|days?) ago$/.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "s" ? n : m[2] === "min" ? n * 60 : m[2] === "h" ? n * 3600 : n * 86400;
}

/**
 * Cut a text into segments. The segments joined give the text again, byte for byte.
 * A text with no known piece gives one plain segment. An empty text gives no segment.
 */
export function hlSplit(text: string): HlSeg[] {
  const out: HlSeg[] = [];
  let at = 0;
  const plain = (to: number) => {
    if (to > at) out.push({ kind: "plain", text: text.slice(at, to) });
  };
  for (const m of text.matchAll(CUT_RE)) {
    const i = m.index ?? 0;
    const g = m.groups ?? {};
    const t = m[0];
    if (t === "") continue;
    let seg: HlSeg | null = null;
    if (g.critic !== undefined) seg = { kind: "critic", text: t, stage: stageOf(t) ?? undefined };
    else if (g.box !== undefined) seg = { kind: "box", text: t, stage: stageOf(t) ?? undefined };
    else if (g.page !== undefined) seg = { kind: "page", text: t };
    else if (g.alive !== undefined) seg = { kind: "alive", text: t, tone: aliveTone(agoSeconds(t)) };
    else if (g.reasonvalue !== undefined) {
      const tone = reasonTone(t);
      seg = tone === "none" ? null : { kind: "reason", text: t, tone };
    } else if (g.reasonby !== undefined) seg = { kind: "reason", text: t, tone: t === "failure" ? "bad" : "warn" };
    else if (g.reasonphrase !== undefined) {
      const tone = reasonTone(t);
      seg = tone === "none" ? null : { kind: "reason", text: t, tone };
    } else if (g.time !== undefined) seg = { kind: "time", text: t };
    else if (g.duration !== undefined) seg = { kind: "duration", text: t };
    else if (g.count !== undefined) seg = { kind: "count", text: t };
    if (!seg) continue;
    plain(i);
    out.push(seg);
    at = i + t.length;
  }
  plain(text.length);
  return out;
}

/** The text of a list of segments. */
export function hlJoin(segs: HlSeg[]): string {
  return segs.map((s) => s.text).join("");
}

/**
 * Line 2 of a book row (lib/book-status-rules.ts Seg[]) as segments at the clock `now`.
 * A string piece is cut by hlSplit. A time piece {ago} is "alive" when "Last sign of life " stands before it (the exact age gives the tone), else a duration.
 * hlJoin of the result equals lineText(segs, now) of lib/book-status-rules.ts.
 */
export function hlOfLine(segs: Seg[], now: number): HlSeg[] {
  const out: HlSeg[] = [];
  let before = "";
  for (const s of segs) {
    if (typeof s === "string") {
      out.push(...hlSplit(s));
      before += s;
      continue;
    }
    const text = agoText(s.ago, now, s.secs);
    if (/Last sign of life $/.test(before)) out.push({ kind: "alive", text, tone: aliveTone(now - s.ago) });
    else out.push({ kind: "duration", text });
    before += text;
  }
  return out;
}
