import {
  OFFLINE_PREFIX,
  OFFLINE_SHELL_CACHE,
  OFFLINE_SHELL_PATH,
  bookCacheName,
  clearsCopies,
  gonePages,
  offlineDataKey,
  offlinePlaceKey,
  pageDataKey,
  pageIdOf,
  pageImageKey,
  saveImageHref,
  saveParts,
  slugOfCache,
  type OfflineCopy,
  type OfflinePlan,
} from "./offline-copy";
import type { ReaderPageData } from "./reader-types";

/*
 * Browser part of the offline copy (unit VW131, Q-A 3:134.3 rows 2 to 6). Only client components import this file.
 * The page itself saves the copy into Cache Storage with the sign-in of the browser. The service worker public/offline-sw.js only answers from it.
 * Layout of the caches:
 *   kendo-offline-book-<slug>-v1   the text of each page (key /api/read/page?ids=<book>%2Fp048), each image (key /api/read/image/<book>/p048), the facts (offlineDataKey)
 *   kendo-offline-shell-v1         the HTML of /read/offline-copy and the files under /_next/static that it loads
 * The reading place sits in localStorage (offlinePlaceKey).
 */

export const SW_URL = "/offline-sw.js";
/** Pages of text for one call of /api/read/page. The route answers 8 at most (MAX_IDS). */
const TEXT_CHUNK = 8;
/** Image downloads at the same time. [unit default] */
const IMAGE_PARALLEL = 4;

export class OfflineError extends Error {}

export function offlineSupported(): boolean {
  return typeof window !== "undefined" && "caches" in window && "serviceWorker" in navigator && window.isSecureContext;
}

/** The registration of the service worker. Scope "/": it answers only the addresses of offlineRoute, the images and texts of saved books, and /_next/static. */
export async function registerOfflineWorker(): Promise<void> {
  await navigator.serviceWorker.register(SW_URL, { scope: "/", updateViaCache: "none" });
}

async function unregisterOfflineWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.filter((r) => [r.active, r.waiting, r.installing].some((w) => w?.scriptURL.endsWith(SW_URL))).map((r) => r.unregister()));
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

/** The facts of the copy of one book, or null. */
export async function readCopy(slug: string): Promise<OfflineCopy | null> {
  if (!offlineSupported()) return null;
  const name = bookCacheName(slug);
  if (!(await caches.has(name))) return null;
  const hit = await (await caches.open(name)).match(offlineDataKey(slug));
  return hit ? ((await hit.json()) as OfflineCopy) : null;
}

/** Every saved copy of this device, newest first. */
export async function listCopies(): Promise<OfflineCopy[]> {
  if (!offlineSupported()) return [];
  const slugs = (await caches.keys()).map(slugOfCache).filter((s): s is string => s !== null);
  const copies = await Promise.all(slugs.map(readCopy));
  return copies.filter((c): c is OfflineCopy => c !== null).sort((a, b) => b.savedAt - a.savedAt);
}

let slugsOnce: Promise<Set<string>> | null = null;
/** The slugs of the saved copies, read once for each page load (the mark of the book list). */
export function savedSlugs(): Promise<Set<string>> {
  slugsOnce ??= listCopies()
    .then((c) => new Set(c.map((x) => x.slug)))
    .catch(() => new Set<string>());
  return slugsOnce;
}

/** The text of saved pages. A page that the copy lacks is not in the answer. */
export async function readPages(slug: string, pageIds: string[]): Promise<ReaderPageData[]> {
  const cache = await caches.open(bookCacheName(slug));
  const out: ReaderPageData[] = [];
  for (const id of pageIds) {
    const hit = await cache.match(pageDataKey(id));
    if (hit) out.push(...((await hit.json()) as { pages: ReaderPageData[] }).pages);
  }
  return out;
}

export function readPlace(slug: string): number | null {
  try {
    const n = Number(localStorage.getItem(offlinePlaceKey(slug)));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function writePlace(slug: string, n: number): void {
  try {
    localStorage.setItem(offlinePlaceKey(slug), String(n));
  } catch {
    // A full or blocked storage keeps no place. The copy still works.
  }
}

function dropPlaces(slug?: string): void {
  try {
    for (const k of Object.keys(localStorage)) if (slug ? k === offlinePlaceKey(slug) : k.startsWith(OFFLINE_PREFIX)) localStorage.removeItem(k);
  } catch {
    // No storage: nothing to remove.
  }
}

/** Row 6 and sign-out: remove every copy, every reading place, and the service worker of this device. */
export async function clearOfflineCopies(): Promise<void> {
  slugsOnce = null;
  dropPlaces();
  if (typeof window === "undefined" || !("caches" in window)) return;
  const names = (await caches.keys()).filter((n) => n.startsWith(OFFLINE_PREFIX));
  await Promise.all(names.map((n) => caches.delete(n)));
  await unregisterOfflineWorker();
}

/** Remove the copy of one book. The last copy also removes the screen files and the service worker. */
export async function removeCopy(slug: string): Promise<void> {
  slugsOnce = null;
  await caches.delete(bookCacheName(slug));
  dropPlaces(slug);
  if ((await listCopies()).length === 0) {
    dropPlaces();
    await caches.delete(OFFLINE_SHELL_CACHE);
    await unregisterOfflineWorker();
  }
}

/** Ask the server for the plan. A failed sign-in check removes every copy (row 6). */
export async function fetchPlan(slug: string, sizes: boolean): Promise<{ plan: OfflinePlan | null; status: number }> {
  const r = await fetch(`/api/read/offline?slug=${encodeURIComponent(slug)}${sizes ? "" : "&sizes=0"}`, { cache: "no-store" });
  if (clearsCopies(r.status)) await clearOfflineCopies();
  if (!r.ok) return { plan: null, status: r.status };
  return { plan: (await r.json()) as OfflinePlan, status: r.status };
}

/** Remove from a copy the pages that the reader can no longer read online (the gate follows the next online visit). Returns the new facts. */
export async function pruneCopy(copy: OfflineCopy, online: OfflinePlan): Promise<OfflineCopy> {
  const gone = gonePages(online, copy);
  if (gone.length === 0) return copy;
  const cache = await caches.open(bookCacheName(copy.slug));
  await Promise.all(gone.map((n) => cache.delete(pageDataKey(pageIdOf(copy.slug, n, copy.index.digits)))));
  const drop = new Set(gone);
  const next: OfflineCopy = { ...copy, index: { ...online.index, resumeAt: copy.index.resumeAt }, textPages: copy.textPages.filter((n) => !drop.has(n)) };
  await cache.put(offlineDataKey(copy.slug), json(next));
  return next;
}

async function check(r: Response, what: string): Promise<Response> {
  if (clearsCopies(r.status)) {
    await clearOfflineCopies();
    throw new OfflineError("The sign-in check failed.");
  }
  if (!r.ok) throw new OfflineError(`The server answered ${r.status} for ${what}.`);
  return r;
}

async function inParallel<T>(items: T[], limit: number, fn: (x: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/** The files under /_next/static that the shell HTML names, and the files that its CSS names (fonts). */
export function staticFilesOf(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/\/_next\/static\/[^"'\s\\)<>]+/g)) out.add(m[0].replace(/&amp;/g, "&"));
  return [...out];
}

function cssFilesOf(css: string, base: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    if (m[1].startsWith("data:")) continue;
    const u = new URL(m[1], base);
    if (u.origin === location.origin && u.pathname.startsWith("/_next/static/")) out.push(u.pathname + u.search);
  }
  return out;
}

/** Save the shell page and its files. A failed file stops the save, because the copy cannot open without it. */
async function saveShell(): Promise<void> {
  const r = await check(await fetch(OFFLINE_SHELL_PATH, { cache: "no-store", credentials: "same-origin" }), "the screen files");
  if (r.redirected || !(r.headers.get("content-type") ?? "").includes("text/html")) throw new OfflineError("The screen files are not available.");
  const html = await r.text();
  const shell = await caches.open(OFFLINE_SHELL_CACHE);
  // The HTML names the first files. A file that the screen loads later (an async chunk) is not in the HTML, so the files that this
  // Reader screen loaded so far are saved too. The service worker adds the later ones while the reader reads online (public/offline-sw.js).
  const loaded = performance
    .getEntriesByType("resource")
    .map((e) => new URL(e.name))
    .filter((u) => u.origin === location.origin && u.pathname.startsWith("/_next/static/"))
    .map((u) => u.pathname + u.search);
  const files = [...new Set([...staticFilesOf(html), ...loaded])];
  const seen = new Set(files);
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const got = await fetch(f, { credentials: "same-origin" });
    if (!got.ok) throw new OfflineError(`The screen file ${f.split("/").pop()} is not available.`);
    if (f.split("?")[0].endsWith(".css")) {
      const css = await got.clone().text();
      for (const extra of cssFilesOf(css, new URL(f, location.origin).href)) {
        if (seen.has(extra)) continue;
        seen.add(extra);
        files.push(extra);
      }
    }
    await shell.put(f, got);
  }
  await shell.put(OFFLINE_SHELL_PATH, new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } }));
}

export interface SaveProgress {
  doneBytes: number;
  totalBytes: number;
}

/**
 * Save or update the copy of one book (rows 2 and 4). The plan comes from fetchPlan(slug, true).
 * Order: the text of each page, the images that the cache lacks, the screen files, and the facts last.
 * A new save that fails removes its cache. A failed update keeps the old copy: its facts stay as they were.
 */
export async function saveCopy(plan: OfflinePlan, onProgress: (p: SaveProgress) => void, savedAt: number = Date.now()): Promise<OfflineCopy> {
  if (!offlineSupported()) throw new OfflineError("This browser cannot keep an offline copy.");
  const name = bookCacheName(plan.slug);
  const fresh = !(await caches.has(name));
  await registerOfflineWorker();
  void navigator.storage?.persist?.().catch(() => false);
  const cache = await caches.open(name);
  const totalBytes = plan.textBytes + plan.imageBytes;
  let doneBytes = 0;
  const step = (n: number) => {
    doneBytes += n;
    onProgress({ doneBytes: Math.min(doneBytes, totalBytes), totalBytes });
  };
  try {
    const parts = saveParts(plan);
    for (let i = 0; i < parts.texts.length; i += TEXT_CHUNK) {
      const ids = parts.texts.slice(i, i + TEXT_CHUNK);
      const r = await check(await fetch(`/api/read/page?ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" }), "the page text");
      const j = (await r.json()) as { pages: ReaderPageData[] };
      for (const p of j.pages) {
        const body = JSON.stringify({ pages: [p] });
        await cache.put(pageDataKey(p.pageId), new Response(body, { headers: { "Content-Type": "application/json" } }));
        step(new Blob([body]).size);
      }
    }
    await inParallel(parts.images, IMAGE_PARALLEL, async (id) => {
      const key = pageImageKey(id);
      const old = await cache.match(key);
      if (old) {
        step((await old.blob()).size);
        return;
      }
      const r = await fetch(saveImageHref(id), { cache: "no-store" });
      if (r.status === 404) return;
      await check(r, "a page image");
      const blob = await r.blob();
      await cache.put(key, new Response(blob, { headers: { "Content-Type": "image/webp", "Content-Length": String(blob.size) } }));
      step(blob.size);
    });
    await saveShell();
    const copy: OfflineCopy = { ...plan, savedAt };
    const old = fresh ? null : await readCopy(plan.slug);
    if (old) {
      const gone = gonePages(plan, old).filter((n) => !plan.textPages.includes(n));
      await Promise.all(gone.map((n) => cache.delete(pageDataKey(pageIdOf(plan.slug, n, plan.index.digits)))));
    }
    await cache.put(offlineDataKey(plan.slug), json(copy));
    slugsOnce = null;
    return copy;
  } catch (e) {
    if (fresh) await removeCopy(plan.slug).catch(() => undefined);
    if (e instanceof DOMException && e.name === "QuotaExceededError") throw new OfflineError("This device has not enough free space for this copy.");
    throw e instanceof OfflineError ? e : new OfflineError(e instanceof Error ? e.message : "The save failed.");
  }
}
