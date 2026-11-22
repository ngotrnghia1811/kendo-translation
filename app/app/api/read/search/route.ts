import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse } from "@/lib/htv-api";
import { parseSearchParams } from "@/lib/search-core";
import { loadSearch } from "@/lib/search-data";
import { refuseWrite } from "@/lib/search-refuse";

export const dynamic = "force-dynamic";

// Unit VW124 (Q-A 3:117.4 row 1: "Results come while you type"): the search page asks for the hits of the typed words.
// GET /api/read/search?q=seme&tab=pages&screen=2
// The answer holds the counts of the tabs and the hits of one screen. A reader who waits for approval gets book hits only. A visitor of a view-only link reads this too
// (GET only; a link visitor never changes data). The PocketBase rules of reader_pages are the gate for the page text.
export async function GET(req: Request) {
  try {
    const g = await guard(req, { mutating: false, allowLink: true });
    if (isResponse(g)) return g;
    const p = parseSearchParams(Object.fromEntries(new URL(req.url).searchParams));
    return jsonResponse(await loadSearch(g.token, g.user, p.q, p.tab, p.screen));
  } catch (e) {
    return htvError(e);
  }
}

// A write method never works here.
export const POST = refuseWrite;
export const PUT = refuseWrite;
export const PATCH = refuseWrite;
export const DELETE = refuseWrite;
