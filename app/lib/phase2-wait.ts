// Quota wait of the live Phase 2 row (unit VW92, round 91). Pure functions: no file access, no clock of their own, no server-only import.
// Owner pick Q-A 3:7.6 (2026-11-11 PST): "Small unit VW92 now". Accepted A11 to A13 of the quota wait: Q-A 3:7.4.
// Quota wait = a Translator model call waits until the usage limit of a card resets. A card = one Claude login account in oc2.
// Source of the key: <T2> data/scripts/translator_run.py make_quota_watch (lines 201-231, unit TR91 follow-up 1). The run writes the key "waiting" of
// <data>/book-store/paired-dataset/status.json: {reason: "usage limit", page, box, since_utc, until_utc, wait_s, source, cards, calls}.
// The key holds the oldest wait. It goes away when the last wait ends (translator_run.py 223 and 3472). The heartbeat stays fresh during a wait.
// Source of the values: data/scripts/translator/launcher.py quota_wait_plan (lines 272-296): source is "retry-after", "usage file" or "step",
// cards is a sorted list of card IDs (claude-028c2ffe) or provider IDs (xai, google). Times have the form "2026-11-11T18:40:00Z".
// A new file, because the dev server keeps old module instances (see the note of lib/pst.ts). Use only erasable TypeScript syntax here.
import { pageShort } from "./book-status-rules";
import { PST_OFFSET_S, parseUtcIso, pstClock, pstStamp } from "./pst";

/**
 * The cards of the oc2 login accounts and their short names. Source: config/translator-models.yaml lines 271-276 of <T2> and the brief of unit VW92.
 * The e-mail addresses of the cards stay out of this public code (Q-A 3:22.3).
 * [unit default VW92] The screen shows the short name and never the e-mail address. An ID that is not in this list shows as it is (for example xai, google).
 */
export const CARD_NAMES: Record<string, string> = {
  "claude-028c2ffe": "ntngh",
  "claude-aade7ca8": "uonlp",
  "claude-7f6d8610": "ngotr",
};
/** Order of the known cards on the screen. */
export const CARD_ORDER = ["claude-028c2ffe", "claude-aade7ca8", "claude-7f6d8610"];
const MAX_CARDS = 8;
const MAX_WORD = 40;

/** What the row needs from the key "waiting". `untilEpoch` is always a number: a key with no end time gives no wait. */
export interface Phase2Wait {
  /** Text of the key "reason", or null. The run writes "usage limit". */
  reason: string | null;
  /** Short page name: "p057". */
  page: string | null;
  /** Tag of the box or the agent: "TL_1". */
  box: string | null;
  sinceEpoch: number | null;
  untilEpoch: number;
  /** "retry-after", "usage file" or "step". Any other value gives null. */
  source: "retry-after" | "usage file" | "step" | null;
  /** The card IDs as written, without doubles. */
  cards: string[];
  /** Number of calls that wait now (1 or more), or null. */
  calls: number | null;
}

function rec(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function word(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  if (t === "") return null;
  return t.length <= MAX_WORD ? t : t.slice(0, MAX_WORD - 1).trimEnd() + "…";
}

/**
 * The wait from the value of the key "waiting". Null when the value is no object or when no end time can be found
 * (until_utc, else since_utc plus wait_s). A wrong type in any other field only drops that field. This function never throws.
 */
export function waitOf(v: unknown): Phase2Wait | null {
  const w = rec(v);
  if (!w) return null;
  const since = parseUtcIso(w.since_utc);
  let until = parseUtcIso(w.until_utc);
  const len = typeof w.wait_s === "number" && Number.isFinite(w.wait_s) && w.wait_s >= 0 ? w.wait_s : null;
  if (until === null && since !== null && len !== null) until = since + len;
  if (until === null) return null;
  const cards: string[] = [];
  if (Array.isArray(w.cards)) {
    for (const c of w.cards) {
      const id = word(c);
      if (id !== null && !cards.includes(id) && cards.length < MAX_CARDS) cards.push(id);
    }
  }
  const src = w.source === "retry-after" || w.source === "usage file" || w.source === "step" ? w.source : null;
  const calls = typeof w.calls === "number" && Number.isFinite(w.calls) && w.calls >= 1 ? Math.round(w.calls) : null;
  return { reason: word(w.reason), page: pageShort(word(w.page)), box: word(w.box), sinceEpoch: since, untilEpoch: until, source: src, cards, calls };
}

/**
 * The cards as short text: "all 3 cards", "card ntngh", "cards ntngh, uonlp". An ID that is not a known card shows as it is, with no word "card":
 * "xai", "ntngh, xai". Null when the list is empty.
 */
export function cardsText(cards: string[]): string | null {
  if (cards.length === 0) return null;
  const known = CARD_ORDER.filter((id) => cards.includes(id));
  const other = cards.filter((id) => !(id in CARD_NAMES));
  const names = [...known.map((id) => CARD_NAMES[id]), ...other];
  if (known.length === CARD_ORDER.length) return other.length === 0 ? `all ${known.length} cards` : `all ${known.length} cards, ${other.join(", ")}`;
  if (other.length === 0) return `${known.length === 1 ? "card" : "cards"} ${names.join(", ")}`;
  return names.join(", ");
}

/** The PST day number of an epoch (UTC minus 8 hours, the project rule). */
function pstDay(epoch: number): number {
  return Math.floor((epoch - PST_OFFSET_S) / 86400);
}

/**
 * "20:19 PST" on the day of `now`, else "Nov 12 02:10 PST".
 * [unit default VW92] A wait can end after midnight PST. The date shows only then.
 */
export function clockNear(epoch: number, now: number): string {
  return pstDay(epoch) === pstDay(now) ? pstClock(epoch) : pstStamp(epoch);
}

/** How the end time came, in plain words. Null for a source that the run does not write. */
export function sourceText(source: Phase2Wait["source"]): string | null {
  switch (source) {
    case "retry-after":
      return "End time from the retry-after value of the error.";
    case "usage file":
      return "End time from the reset time in the usage file.";
    case "step":
      return "End time is a fixed step, because no reset time is known.";
    default:
      return null;
  }
}

export interface Phase2WaitText {
  /** "Waiting for the usage limit until 20:19 PST (all 3 cards)." */
  main: string;
  /** "Wait started 18:40 PST at p057, box TL_1. 2 calls wait. End time from the usage file." Null when the key holds no detail. */
  detail: string | null;
}

/**
 * The two lines of a quota wait at the clock `now` (epoch seconds).
 * If the end time is already past while the key is still there, the run has not yet written "quota-resumed" (it checks every second).
 * [unit default VW92] The line then says that the planned end is past. It shows no negative time and does not hide the wait.
 */
export function waitText(w: Phase2Wait, now: number): Phase2WaitText {
  const lead = w.reason === "usage limit" ? "Waiting for the usage limit" : w.reason ? `Waiting (${w.reason})` : "Waiting";
  const cards = cardsText(w.cards);
  const who = cards ? ` (${cards})` : "";
  const end = clockNear(w.untilEpoch, now);
  const main = w.untilEpoch > now ? `${lead} until ${end}${who}.` : `${lead}. The planned end, ${end}, is past${who}.`;
  const where = w.page && w.box ? ` at ${w.page}, box ${w.box}` : w.page ? ` at ${w.page}` : w.box ? ` at box ${w.box}` : "";
  const parts: string[] = [];
  if (w.sinceEpoch !== null) parts.push(`Wait started ${clockNear(w.sinceEpoch, now)}${where}.`);
  else if (where) parts.push(`Wait${where}.`);
  if (w.calls !== null && w.calls >= 2) parts.push(`${w.calls} calls wait.`);
  const src = sourceText(w.source);
  if (src) parts.push(src);
  return { main, detail: parts.length ? parts.join(" ") : null };
}
