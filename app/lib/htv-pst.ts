// PST text for the screens /translate and /admin (unit TF83, round 84). Pure functions. Shared by server and client code.
// Round 82 answer 14 (Q-A 2026-11-02 l63): "Times on /translate and /admin: PST in a later unit (Recommended)". Round 83 answer 20 and round 84 answer 6 (l115, l132): this unit does it.
// The rule of the Monitor dashboard applies (round 79 answer 9, Q-A 2026-11-01 l101: "PST all year (UTC-8)"). Every time ends with "PST" (round 81 answer 25, Q-A 2026-11-02 l30: "Times end with PST").
// This file is new on purpose (unit VW77a): `next dev` keeps one old instance of an old module. Unit TF84 (round 85 answer 20) removed the old helper `utcTime` of lib/htv-format.ts.
// The helpers read the UTC fields and subtract 8 hours. They do not use the time zone of the Mac or of the browser, so the server render and the browser render agree.
import { PST_OFFSET_S, pstDateTime } from "./pst";

// A PocketBase time "2026-10-27 18:04:12.345Z" or a UTC stamp "2026-10-27T18:04:12Z". The seconds and the offset are optional.
const TIME_RE = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?(?:\.\d+)?(Z|[+-]\d\d:?\d\d)?$/;

function epochOf(text: unknown): number | null {
  const m = typeof text === "string" ? TIME_RE.exec(text.trim()) : null;
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
  if (!Number.isFinite(ms)) return null;
  let offsetS = 0; // no zone letter means UTC: the fields of this app (created, started_utc) are UTC
  const z = m[7];
  if (z && z !== "Z") {
    const o = /^([+-])(\d\d):?(\d\d)$/.exec(z);
    if (o) offsetS = (o[1] === "-" ? -1 : 1) * (+o[2] * 3600 + +o[3] * 60);
  }
  return ms / 1000 - offsetS;
}

/**
 * "2026-10-27 18:04:12.345Z" gives "2026-10-27 10:04 PST". Any other form gives "" (like the removed utcTime), so a caller can write `pstTime(x) || "this moment"`.
 * Example: a comment written at 2026-10-27 18:04 UTC shows "2026-10-27 10:04 PST". A time at 03:00 UTC shows the day before: 2026-10-28 03:00Z is "2026-10-27 19:00 PST".
 */
export function pstTime(text: unknown): string {
  const e = epochOf(text);
  return e === null ? "" : pstDateTime(e);
}

/** Same as pstTime, but a text that is no time stays as it is (for example a start time that a run file wrote in another form). */
export function pstTimeOrText(text: unknown): string {
  return pstTime(text) || (typeof text === "string" ? text : "");
}

/**
 * The PST day of a time, with the zone word: "2026-10-28 03:00:00.000Z" gives "2026-10-27 PST". Any other form gives "".
 * The place keeps its date form (the list of waiting readers on /admin/readers shows a day only) [unit default TF83].
 */
export function pstDay(text: unknown): string {
  const e = epochOf(text);
  return e === null ? "" : `${new Date((e - PST_OFFSET_S) * 1000).toISOString().slice(0, 10)} PST`;
}
