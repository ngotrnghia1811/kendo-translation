import type { ReaderSettings } from "./htv-settings";
import type { Role } from "./htv-types";
import type { ReaderBookIndex } from "./reader-types";

/*
 * Offline copy of a book for the reader pages (unit VW131).
 * Owner request (Q-A 3:132.1): "Add a read-offline button to a book for `reader`." Owner pick Q-A 3:133.3 "A: save in this browser".
 * Owner pick Q-A 3:134.3 "Accept rows 1 to 7": the button, the size prompt, the band, the mark, update and remove, the offline limits, and the account-off rule.
 * This file holds the pure parts: names, texts, and rules. It has no server code and no browser code, so the routes, the client components,
 * and scripts/vw131-test.mjs use it. The service worker public/offline-sw.js cannot import it, so it repeats the cache names. The test compares them.
 */

/** Every cache of this feature starts with this text. Sign-out removes every cache with it. */
export const OFFLINE_PREFIX = "kendo-offline-";
/** Cache of the screen files: the HTML of the shell page and the files under /_next/static that it loads. */
export const OFFLINE_SHELL_CACHE = "kendo-offline-shell-v1";
/** The shell page. The service worker answers a reader address with it when the network fails (app/read/offline-copy/page.tsx). */
export const OFFLINE_SHELL_PATH = "/read/offline-copy";
const BOOK_CACHE_START = "kendo-offline-book-";
const BOOK_CACHE_END = "-v1";
/** localStorage key of the last theme of a reader screen. The shell page uses it, because the theme cookie is httpOnly. */
export const OFFLINE_THEME_KEY = "kendo-offline-theme";
/** localStorage keys of the reading place start with this text (row 5: "The reading place is kept on the device"). */
export const OFFLINE_PLACE_PREFIX = "kendo-offline-place-";

/** One cache for each saved book. */
export function bookCacheName(slug: string): string {
  return `${BOOK_CACHE_START}${slug}${BOOK_CACHE_END}`;
}

/** The slug of a book cache name, or null for another name. */
export function slugOfCache(name: string): string | null {
  if (!name.startsWith(BOOK_CACHE_START) || !name.endsWith(BOOK_CACHE_END)) return null;
  const slug = name.slice(BOOK_CACHE_START.length, name.length - BOOK_CACHE_END.length);
  return /^[a-z0-9_]+$/.test(slug) ? slug : null;
}

/** Key of the facts of a copy in its book cache. No route answers this address. The save writes it last, so a broken save has no facts. */
export function offlineDataKey(slug: string): string {
  return `${OFFLINE_SHELL_PATH}/data/${slug}`;
}

/** Key of the text of one page: the same address that the scroll view asks for with one page (components/ReaderBook.tsx fetchPages). */
export function pageDataKey(pageId: string): string {
  return `/api/read/page?ids=${encodeURIComponent(pageId)}`;
}

/** Key of the image of one page: the same address that the Reader uses (components/ReaderImage.tsx imageHref). */
export function pageImageKey(pageId: string): string {
  return `/api/read/image/${pageId}`;
}

/** Address that gives the bytes of one page image from the same origin, for the save only (app/api/read/offline/image/[slug]/[page]/route.ts). */
export function saveImageHref(pageId: string): string {
  return `/api/read/offline/image/${pageId}`;
}

export function offlinePlaceKey(slug: string): string {
  return `${OFFLINE_PLACE_PREFIX}${slug}`;
}

export function pageIdOf(slug: string, n: number, digits: number): string {
  return `${slug}/p${String(n).padStart(digits, "0")}`;
}

/** What the server sends before a save (GET /api/read/offline?slug=). Only what the reader may read online now, through the same gate. */
export interface OfflinePlan {
  slug: string;
  title: string;
  index: ReaderBookIndex;
  settings: ReaderSettings;
  user: { name: string; email: string; role: Role; approved: boolean };
  /** Pages whose text the copy keeps: the pages that the scroll view asks the server for (index.dataPages). */
  textPages: number[];
  /** Pages whose image the copy keeps: every page with an image file. */
  imagePages: number[];
  /** Bytes of the text of textPages, as the copy stores it. 0 when the route ran without sizes. */
  textBytes: number;
  /** Bytes of the images of imagePages. 0 when the route ran without sizes. */
  imageBytes: number;
}

/** The facts of a saved copy (the entry offlineDataKey of the book cache). */
export interface OfflineCopy extends OfflinePlan {
  /** Time of the save in ms since 1970 (UTC). */
  savedAt: number;
}

export const OFFLINE_WORDS = {
  save: "Read offline",
  counting: "Counting the size…",
  ask: (mb: string) => `Save ${mb} MB for offline reading?`,
  yes: "Save",
  no: "Cancel",
  saving: (mbDone: string, mbTotal: string) => `Saving: ${mbDone} of ${mbTotal} MB.`,
  updating: "Updating the offline copy…",
  saved: (date: string, mb: string) => `Saved for offline on ${date} (${mb} MB).`,
  mark: "Saved for offline",
  update: "Update offline copy",
  updateNote: (n: number) => `This book has ${n} new ${n === 1 ? "page" : "pages"} with text since the save.`,
  remove: "Remove offline copy",
  removed: "The offline copy was removed from this device.",
  band: (date: string) => `Offline copy, saved ${date}`,
  notAvailable: "Not available offline",
  notAvailableOf: (what: string) => `${what}: Not available offline.`,
  failed: (why: string) => `The save stopped. ${why} Nothing was kept.`,
  noSpace: "This device has not enough free space for this copy.",
  noSupport: "This browser cannot keep an offline copy.",
  noCopy: "This book has no offline copy on this device.",
  listTitle: "Offline copies on this device",
  listEmpty: "No offline copies on this device.",
  issue: "Not available offline. The issue was not sent. Your comment and drawing are kept.",
} as const;

/** MB with one decimal (1 MB = 1,000,000 bytes). Q-A 3:134.1 gave the sizes in this unit: left_foot_full has 12.6 MB of images ("13 MB"). */
export function formatMb(bytes: number): string {
  const mb = Math.max(0, bytes) / 1_000_000;
  return mb > 0 && mb < 0.1 ? "0.1" : mb.toFixed(1);
}

/** The date of a time in PST (UTC-8 all year), for example 2026-11-25. */
export function pstDate(ms: number): string {
  return new Date(ms - 8 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Pages that the book has online now and the copy lacks. "Update offline copy" shows when this list is not empty (row 4). */
export function newPages(online: number[], saved: number[]): number[] {
  const have = new Set(saved);
  return online.filter((n) => !have.has(n));
}

/** Pages that the copy has and the reader can no longer read online (the admin closed them). The next online visit removes them from the copy. */
export function closedPages(online: number[], saved: number[]): number[] {
  return newPages(saved, online);
}

type PageLists = Pick<OfflinePlan, "textPages"> & { index: Pick<ReaderBookIndex, "textPages"> };
const union = (a: number[], b: number[]) => [...new Set([...a, ...b])].sort((x, y) => x - y);

/** Row 4: the pages that make "Update offline copy" show: new translated pages (index.textPages) and new pages with data (textPages). */
export function updatePages(online: PageLists, copy: PageLists): number[] {
  return union(newPages(online.index.textPages, copy.index.textPages), newPages(online.textPages, copy.textPages));
}

/** The gate follows the next online visit: the saved pages that lost their translation or their data online leave the copy. */
export function gonePages(online: PageLists, copy: PageLists): number[] {
  return union(closedPages(online.index.textPages, copy.index.textPages), closedPages(online.textPages, copy.textPages)).filter((n) => copy.textPages.includes(n));
}

/** Row 6: an answer of the sign-in check that removes every copy of the device. */
export function clearsCopies(status: number): boolean {
  return status === 401 || status === 403;
}

/** Row 1: who sees the button "Read offline". A visitor of a view-only link and a reader who waits for approval do not. */
export function canSaveOffline(v: { approved: boolean; linkVisitor: boolean }): boolean {
  return v.approved && !v.linkVisitor;
}

/** A reader screen that a person who may not keep a copy opens removes every copy of the device (row 6, privacy). */
export function mustClearOffline(v: { signedIn: boolean; approved: boolean; linkVisitor: boolean }): boolean {
  return !v.signedIn || !canSaveOffline(v);
}

export type OfflineRoute = { kind: "book"; slug: string } | { kind: "list" } | { kind: "search" } | { kind: "dictionary" };

/** The reader addresses that the shell page draws with no network. Every other address has no offline answer. */
export function offlineRoute(pathname: string): OfflineRoute | null {
  const m = /^\/read\/([a-z0-9_]+)\/?$/.exec(pathname);
  if (m) return { kind: "book", slug: m[1] };
  if (pathname === "/read" || pathname === "/read/") return { kind: "list" };
  if (pathname === "/search") return { kind: "search" };
  if (pathname === "/dictionary") return { kind: "dictionary" };
  return null;
}

/** The parts of a save, in order: the text of each page, then each image. */
export function saveParts(plan: Pick<OfflinePlan, "slug" | "textPages" | "imagePages" | "index">): { texts: string[]; images: string[] } {
  const d = plan.index.digits;
  return { texts: plan.textPages.map((n) => pageIdOf(plan.slug, n, d)), images: plan.imagePages.map((n) => pageIdOf(plan.slug, n, d)) };
}

/** Percent of a save, 0 to 100. */
export function percentOf(done: number, total: number): number {
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}
