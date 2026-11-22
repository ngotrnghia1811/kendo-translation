import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse } from "@/lib/htv-api";
import { isSafeSegment } from "@/lib/safe-path";
import { loadBookSearch } from "@/lib/search-data";
import { refuseWrite } from "@/lib/search-refuse";

export const dynamic = "force-dynamic";

// Unit VW124 (Q-A 3:117.5 rows 2 and 3): the search inside one book. The answer holds the lines of all opened pages of the book that hold the words, grouped by page, at most 80 hits.
// GET /api/read/book-search?slug=left_foot_full&q=seme
// A visitor of a view-only link reads this too (GET only). A reader who waits for approval gets no hit.
export async function GET(req: Request) {
  try {
    const g = await guard(req, { mutating: false, allowLink: true });
    if (isResponse(g)) return g;
    const sp = new URL(req.url).searchParams;
    const slug = sp.get("slug") ?? "";
    if (!slug || !isSafeSegment(slug)) return jsonResponse({ error: "Send the book in the query slug." }, 400);
    return jsonResponse(await loadBookSearch(g.token, g.user, slug, sp.get("q") ?? ""));
  } catch (e) {
    return htvError(e);
  }
}

// A write method never works here.
export const POST = refuseWrite;
export const PUT = refuseWrite;
export const PATCH = refuseWrite;
export const DELETE = refuseWrite;
