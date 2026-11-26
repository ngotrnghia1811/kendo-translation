import { jsonResponse } from "@/lib/api";
import { guardReader, htvError, isResponse } from "@/lib/htv-api";
import { offlinePlan } from "@/lib/offline-copy-server";
import { isSafeSegment } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

// The plan of an offline copy (unit VW131, Q-A 3:134.3 rows 2 and 4).
//   GET /api/read/offline?slug=left_foot_full            the plan with the size (the prompt "Save 12.6 MB for offline reading?")
//   GET /api/read/offline?slug=left_foot_full&sizes=0   the plan without the size (the book screen looks for new pages and closed pages)
// Who: an approved reader, a translator, or an admin (guardReader). No allowLink: a visitor of a view-only link gets 401 and keeps no copy (row 1).
// The plan uses the loaders of the book page, so it holds only the pages that the reader may read online now.
export async function GET(req: Request) {
  try {
    const g = await guardReader(req, { mutating: false });
    if (isResponse(g)) return g;
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") ?? "";
    if (!/^[a-z0-9_]+$/.test(slug) || !isSafeSegment(slug)) return jsonResponse({ error: "Bad book name." }, 400);
    const plan = await offlinePlan(g, slug, url.searchParams.get("sizes") !== "0");
    if (!plan) return jsonResponse({ error: "No such book." }, 404);
    return new Response(JSON.stringify(plan), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
  } catch (e) {
    return htvError(e);
  }
}
