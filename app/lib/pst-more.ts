// More PST helpers (unit VW77b1, round 81). Pure functions. Shared by server and client code.
// Round 81 answers 17 and 18 (Q-A 2026-11-02 l22, l23): the Lists tab /runs, the run view /runs/<stamp>, the Reader dashboard /read,
// and the book screens /read/<slug> show their times in PST (UTC minus 8 hours) all year, like the Monitor dashboard.
// This file is new on purpose. Reason (unit VW77a): `next dev` keeps one instance of a module for each route handler that loaded it before.
// A new export in an old module can give a 500 until the dev server restarts. A new file has no old instance.
import { parseUtcIso, pstDateTime, pstClock, PST_OFFSET_S } from "./pst";

/** "2026-10-28 23:50 PST" for an epoch in seconds. The old helper `dateTime` of lib/format.ts treated 0 and null as "no time". Same here. */
export function pstDateTimeOrDash(epoch: number | null | undefined): string {
  return epoch ? pstDateTime(epoch) : "–";
}

/** "23:50 PST" for an epoch in seconds. 0 and null give "–". */
export function pstClockOrDash(epoch: number | null | undefined): string {
  return epoch ? pstClock(epoch) : "–";
}

/** "2026-10-28T07:50:00Z" gives "2026-10-27 23:50 PST". Any other text stays as it is (an empty text stays empty). */
export function pstFromUtcText(text: string): string {
  const e = parseUtcIso(text);
  return e === null ? text : pstDateTime(e);
}

/**
 * A PocketBase time "2026-10-28 07:50:00.123Z" gives the PST calendar date "2026-10-27" (the date part of the PST time).
 * Any other form gives "". The Reader book screen shows the date of a page check in the label "AI translation, checked by a person (2026-10-27)".
 */
export function pstDateOfPb(pb: unknown): string {
  const m = typeof pb === "string" ? /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d):(\d\d)/.exec(pb) : null;
  if (!m) return "";
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms - PST_OFFSET_S * 1000).toISOString().slice(0, 10);
}

/** The UTC form that store.py utc_iso writes: "2026-11-05T09:30:00Z", no milliseconds. */
export function utcIso(epochMs: number): string {
  return new Date(epochMs).toISOString().replace(/\.\d+Z$/, "Z");
}
