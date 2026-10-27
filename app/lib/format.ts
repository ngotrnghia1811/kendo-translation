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
