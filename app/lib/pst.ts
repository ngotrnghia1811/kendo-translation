// PST helpers of the Monitor dashboard (unit VW77a, round 80). Pure functions. Shared by server and client code.
// lib/format.ts re-exports them, so the screens import them from "./format" or "@/lib/format" like the other helpers.
// The code of the rules (lib/book-status-rules.ts) imports this file directly. Reason: the dev server `next dev` keeps one instance of a module
// for all route handlers. A route handler that was loaded before this unit kept its old instance of lib/format.ts, so the new route
// /api/monitor/books saw no new export in it. A new file has no old instance. A restart of `next dev` is not needed then.
// Round 80 answer 19 (Q-A 2026-11-01 l141, reading l156): every time on the Monitor dashboard `/` shows in PST (UTC minus 8 hours) all year.
// The helpers add 8 hours to the minus and read the UTC fields. They do not use the time zone of the Mac. Example: 2026-07-10T16:00:00Z shows "08:00 PST"
// when the wall clock in Pacific summer time reads 09:00. The local-time helpers of lib/format.ts stay for the Lists tab and the run view.
export const PST_OFFSET_S = 8 * 3600;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pstParts(epoch: number) {
  const d = new Date((epoch - PST_OFFSET_S) * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), hh: p(d.getUTCHours()), mm: p(d.getUTCMinutes()), p };
}

/** "08:00 PST" */
export function pstClock(epoch: number | null | undefined): string {
  if (epoch === null || epoch === undefined || !Number.isFinite(epoch)) return "–";
  const t = pstParts(epoch);
  return `${t.hh}:${t.mm} PST`;
}

/** "Oct 29 21:12 PST" */
export function pstStamp(epoch: number | null | undefined): string {
  if (epoch === null || epoch === undefined || !Number.isFinite(epoch)) return "–";
  const t = pstParts(epoch);
  return `${MONTHS[t.mo]} ${t.d} ${t.hh}:${t.mm} PST`;
}

/** "2026-11-04 00:15 PST" (the form of the run ID text, round 80 answer 16) */
export function pstDateTime(epoch: number | null | undefined): string {
  if (epoch === null || epoch === undefined || !Number.isFinite(epoch)) return "–";
  const t = pstParts(epoch);
  return `${t.y}-${t.p(t.mo + 1)}-${t.p(t.d)} ${t.hh}:${t.mm} PST`;
}

/** "22:06:12 PST" (the header "Updated 22:06:12 PST") */
export function pstClockSeconds(epoch: number | null | undefined): string {
  if (epoch === null || epoch === undefined || !Number.isFinite(epoch)) return "–";
  const t = pstParts(epoch);
  return `${t.hh}:${t.mm}:${t.p(new Date((epoch - PST_OFFSET_S) * 1000).getUTCSeconds())} PST`;
}

/** Epoch seconds of a UTC stamp "2026-07-10T16:00:00Z", or null for any other form. */
export function parseUtcIso(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)Z$/.exec(text);
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  // A date that Date.UTC moves ("2026-13-01", "2026-02-30") is not a UTC stamp. The round trip catches it, like strptime in store.py.
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 19) + "Z" !== text) return null;
  return ms / 1000;
}

/**
 * Relative time (VISION-viewer 15.24.4.6): under 1 min "just now", under 60 min "N min ago", under 48 h "N h ago", else "N days ago".
 * A time in the future (a clock that differs a little) counts as "just now".
 */
export function relativeTime(epoch: number, now: number): string {
  const s = Math.max(0, now - epoch);
  if (s < 60) return "just now";
  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(s / 3600);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

/** The run ID "2026-11-04T00:15:00-08:00" as text "2026-11-04 00:15 PST". Null for any other form (round 80 answer 16: "PST only"). */
export function runIdText(runId: unknown): string | null {
  if (typeof runId !== "string") return null;
  const m = /^(\d{4}-\d\d-\d\d)T(\d\d:\d\d):\d\d-08:00$/.exec(runId);
  return m ? `${m[1]} ${m[2]} PST` : null;
}
