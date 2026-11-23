// Unit VW126 PST fix (owner pick Q-A 3:122.2 "Fix PST, then commit"). Project rule: every time on a screen shows in PST (UTC-8 all year).
// The files keep UTC: proposals.jsonl, proposal-reviews.jsonl and the decisions lines are not changed. Only the screen text changes.
// Pure functions. No server-only marker, so the client panel can load this file. It reuses the helpers of lib/htv-pst.ts (no new time code).
import { pstTime, pstTimeOrText } from "./htv-pst";

/** "2026-11-22T23:10:01Z" gives "2026-11-22 15:10 PST". A text that is no time stays as it is. */
export function pstScreen(utc: string): string {
  return pstTimeOrText(utc);
}

/**
 * The first and the last proposal time of one group as one screen text.
 * Two times in the same PST minute give one time. Example: "2026-11-22 15:10 PST to 2026-11-22 16:40 PST".
 */
export function pstRange(firstUtc: string, lastUtc: string): string {
  const first = pstTimeOrText(firstUtc);
  const last = pstTimeOrText(lastUtc);
  return first === last ? last : `${first} to ${last}`;
}

// The archive folder of `rebuild-live --apply` is named with a UTC stamp, for example archive/20261123T020136Z.
const STAMP_RE = /(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z/g;

/**
 * The output of the rebuild for the screen: each UTC folder stamp gets its PST time behind it.
 * The stamp stays, because it is the real folder name. Example: "archive/20261123T020136Z (2026-11-22 18:01 PST)".
 */
export function pstInOutput(output: string): string {
  return output.replace(STAMP_RE, (stamp, y: string, mo: string, d: string, h: string, mi: string, s: string) => {
    const pst = pstTime(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
    return pst ? `${stamp} (${pst})` : stamp;
  });
}
