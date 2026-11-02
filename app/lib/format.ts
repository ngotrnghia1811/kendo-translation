// Small formatting helpers. Shared by server and client code.

export function usd(v: number | null | undefined): string {
  if (v === null || v === undefined) return "–";
  return "$" + v.toFixed(2);
}

export function dateTime(epoch: number | null | undefined): string {
  if (!epoch) return "–";
  const d = new Date(epoch * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function clock(epoch: number | null | undefined): string {
  if (!epoch) return "–";
  const d = new Date(epoch * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function minutes(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "–";
  return (seconds / 60).toFixed(1);
}

export function isLive(state: string): boolean {
  return state === "running" || state === "paused";
}

/** Page folder name "slug_pNNN" to page ID "slug/pNNN". */
export function folderToPageId(name: string): { slug: string; page: string } | null {
  const m = /^(.+)_(p\d+)$/.exec(name);
  return m ? { slug: m[1], page: m[2] } : null;
}

export function pageHref(pageId: string, runFolder?: string): string {
  const [slug, page] = pageId.split("/");
  const q = runFolder ? `?run=${encodeURIComponent(runFolder)}` : "";
  return `/page/${encodeURIComponent(slug)}/${encodeURIComponent(page)}${q}`;
}

// ---------------------------------------------------------------- PST helpers (unit VW77a)
// Round 80 answer 19 (Q-A 2026-11-01 l141, reading l156): every time on the Monitor dashboard `/` shows in PST (UTC minus 8 hours) all year.
// The code sits in lib/pst.ts and shows here too. The helpers above keep the local time for the Lists tab and the run view.
export { PST_OFFSET_S, pstClock, pstStamp, pstDateTime, pstClockSeconds, parseUtcIso, relativeTime, runIdText } from "./pst";
