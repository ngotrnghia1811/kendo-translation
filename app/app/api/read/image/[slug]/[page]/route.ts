import { createHmac } from "node:crypto";
import { promises as fs } from "node:fs";
import { jsonResponse } from "@/lib/api";
import { loadPageImageConfig } from "@/lib/config";
import { guardReader, htvError, isResponse } from "@/lib/htv-api";
import { idDigits } from "@/lib/htv-books";
import { catalogInfo } from "@/lib/pb";
import { PathError, resolveInside } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

/** The signed link lives this many seconds. The PocketBase hook accepts a link that ends within 900 seconds. */
const LINK_SECONDS = 600;
const NO_IMAGE = "No page image available.";

// Original page image (unit RC2, round 65). GET /api/read/image/left_foot_full/p048
// Who: the same rule as /api/read/page (an approved reader, a translator, or an admin). No session gives 401. A reader who waits for approval gives 403.
// Which pages: books and magazine years that catalog_items knows, with a page number from 1 to the page count, written with the digits of the book.
// The web article has no page image (its page count is 0), so it gives 404.
// Source "files" (this Mac): the route reads <dir>/<slug>/<page>.webp. Source "signed" (deploy): the route sends the browser to a signed short link
// of the PocketBase hook (data/scripts/pocketbase/pb_hooks/page_images.pb.js). The text that PocketBase checks is "<slug>/<page>.webp:<exp>".
export async function GET(req: Request, ctx: { params: Promise<{ slug: string; page: string }> }) {
  try {
    // Unit VW120 (Q-A 3:106.5 row 3): a visitor of a view-only link reads this too (GET only; a link visitor never changes data). The image is the same as for an approved reader.
    const g = await guardReader(req, { mutating: false, allowLink: true });
    if (isResponse(g)) return g;
    const { slug, page } = await ctx.params;
    if (!/^[a-z0-9_]+$/.test(slug) || !/^p\d{3,4}$/.test(page)) return jsonResponse({ error: "Bad page ID." }, 400);
    const cfg = loadPageImageConfig();
    const info = (await catalogInfo(g.token, slug)).get(slug);
    const pages = info?.pages ?? 0;
    const n = parseInt(page.slice(1), 10);
    // Unit RT73a: a web article has A4 pages now, but no page image. The kind test replaces the test "pages is 0" for it.
    if (info?.kind === "web-article" || pages === 0 || n < 1 || n > pages || page.length - 1 !== idDigits(pages)) return jsonResponse({ error: NO_IMAGE }, 404);

    if (cfg.source === "signed") {
      const exp = Math.floor(Date.now() / 1000) + LINK_SECONDS;
      const sig = createHmac("sha256", cfg.key).update(`${slug}/${page}.webp:${exp}`).digest("hex");
      return new Response(null, {
        status: 302,
        headers: { Location: `${cfg.url}/${slug}/${page}.webp?exp=${exp}&sig=${sig}`, "Cache-Control": "private, no-store" },
      });
    }

    let bytes: Buffer;
    try {
      bytes = await fs.readFile(await resolveInside(`${slug}/${page}.webp`, cfg.dir));
    } catch (e) {
      if (e instanceof PathError) throw e;
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "EISDIR" || code === "ENOTDIR") return jsonResponse({ error: NO_IMAGE }, 404);
      throw e;
    }
    return new Response(new Uint8Array(bytes), { status: 200, headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=600" } });
  } catch (e) {
    return htvError(e);
  }
}
