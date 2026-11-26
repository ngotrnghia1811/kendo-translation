import "server-only";
import { createHmac } from "node:crypto";
import { promises as fs } from "node:fs";
import { jsonResponse } from "./api";
import { loadPageImageConfig, type PageImageConfig } from "./config";
import { idDigits } from "./htv-books";
import type { Session } from "./htv-session";
import { catalogInfo } from "./pb";
import { loadReaderIndex, loadReaderPages } from "./reader-data";
import { PathError, resolveInside } from "./safe-path";
import { loadPaneSettings } from "./theme";
import type { OfflinePlan } from "./offline-copy";

/*
 * Server part of the offline copy (unit VW131, Q-A 3:134.3 rows 2 and 4).
 * The plan uses the same loaders as the book page /read/<book> (loadReaderIndex, loadReaderPages, loadPaneSettings) with the token of the session.
 * So the plan holds only what the reader may read online now: the PocketBase rules and the table reader_opens decide, as on the book page.
 * The routes that call this file use guardReader without allowLink: a visitor of a view-only link gets 401, a reader who waits gets 403.
 */

const NO_IMAGE = "No page image available.";
/** Pages of text for one call of loadReaderPages while the plan counts the size. [unit default] */
const TEXT_CHUNK = 40;
/** Image size requests at the same time in signed mode. [unit default] */
const SIZE_PARALLEL = 12;
/** Same value as the image route: the signed link lives this many seconds. */
const LINK_SECONDS = 600;

function signedUrl(cfg: PageImageConfig, slug: string, page: string): string {
  const exp = Math.floor(Date.now() / 1000) + LINK_SECONDS;
  const sig = createHmac("sha256", cfg.key).update(`${slug}/${page}.webp:${exp}`).digest("hex");
  return `${cfg.url}/${slug}/${page}.webp?exp=${exp}&sig=${sig}`;
}

/** Bytes of one image, or null when the image does not exist. Files mode: the file size. Signed mode: the total of a 1-byte range request. */
async function imageSize(cfg: PageImageConfig, slug: string, page: string): Promise<number | null> {
  if (cfg.source === "files") {
    try {
      const st = await fs.stat(await resolveInside(`${slug}/${page}.webp`, cfg.dir));
      return st.isFile() ? st.size : null;
    } catch (e) {
      if (e instanceof PathError) throw e;
      return null;
    }
  }
  const r = await fetch(signedUrl(cfg, slug, page), { headers: { Range: "bytes=0-0" }, cache: "no-store" });
  try {
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`The image server answered ${r.status}.`);
    const total = /\/(\d+)\s*$/.exec(r.headers.get("content-range") ?? "")?.[1] ?? r.headers.get("content-length");
    const n = total ? parseInt(total, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  } finally {
    // Read the body (1 byte, or a short error text). A cancel of the body hung in `next dev` (measured in this unit: 3 minutes for 6 pages).
    await r.arrayBuffer().catch(() => undefined);
  }
}

async function inParallel<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * The plan of a copy. `sizes` false skips the size count: the book screen uses it to find new pages and closed pages (rows 4 and 6).
 * Returns null when the reader cannot see the book (the same answer as the book page: not found).
 */
export async function offlinePlan(s: Session, slug: string, sizes: boolean): Promise<OfflinePlan | null> {
  const index = await loadReaderIndex(s.token, s.user, slug);
  if (!index) return null;
  const settings = (await loadPaneSettings(s.token, s.user.id)).reader ?? {};
  const textPages = index.dataPages;
  const allImages = index.images && index.kind !== "web-article" ? Array.from({ length: index.pages }, (_, i) => i + 1) : [];
  let textBytes = 0;
  let imageBytes = 0;
  let imagePages = allImages;
  if (sizes) {
    for (let i = 0; i < textPages.length; i += TEXT_CHUNK) {
      const pages = await loadReaderPages(s.token, slug, textPages.slice(i, i + TEXT_CHUNK), index.digits);
      for (const p of pages) textBytes += Buffer.byteLength(JSON.stringify({ pages: [p] }));
    }
    const cfg = loadPageImageConfig();
    const found = await inParallel(allImages, SIZE_PARALLEL, (n) => imageSize(cfg, slug, `p${String(n).padStart(index.digits, "0")}`));
    imagePages = allImages.filter((_, i) => found[i] !== null);
    imageBytes = found.reduce<number>((a, b) => a + (b ?? 0), 0);
  }
  return {
    slug,
    title: index.titleEn || index.titleJa || slug,
    index,
    settings,
    user: { name: s.user.name, email: s.user.email, role: s.user.role, approved: s.user.approved },
    textPages,
    imagePages,
    textBytes,
    imageBytes,
  };
}

/**
 * The bytes of one page image from the same origin, for the save. The checks are the checks of GET /api/read/image/<book>/<page>.
 * Signed mode: the live images sit on another origin with no CORS header, so a page script cannot read them. The server reads them here.
 */
export async function offlineImage(s: Session, slug: string, page: string): Promise<Response> {
  if (!/^[a-z0-9_]+$/.test(slug) || !/^p\d{3,4}$/.test(page)) return jsonResponse({ error: "Bad page ID." }, 400);
  const info = (await catalogInfo(s.token, slug)).get(slug);
  const pages = info?.pages ?? 0;
  const n = parseInt(page.slice(1), 10);
  if (info?.kind === "web-article" || pages === 0 || n < 1 || n > pages || page.length - 1 !== idDigits(pages)) return jsonResponse({ error: NO_IMAGE }, 404);
  const cfg = loadPageImageConfig();
  let bytes: Uint8Array;
  if (cfg.source === "signed") {
    const r = await fetch(signedUrl(cfg, slug, page), { cache: "no-store" });
    if (r.status === 404) return jsonResponse({ error: NO_IMAGE }, 404);
    if (!r.ok) return jsonResponse({ error: `The image server answered ${r.status}.` }, 502);
    bytes = new Uint8Array(await r.arrayBuffer());
  } else {
    try {
      bytes = new Uint8Array(await fs.readFile(await resolveInside(`${slug}/${page}.webp`, cfg.dir)));
    } catch (e) {
      if (e instanceof PathError) throw e;
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "EISDIR" || code === "ENOTDIR") return jsonResponse({ error: NO_IMAGE }, 404);
      throw e;
    }
  }
  return new Response(new Uint8Array(bytes), { status: 200, headers: { "Content-Type": "image/webp", "Content-Length": String(bytes.byteLength), "Cache-Control": "private, no-store" } });
}
