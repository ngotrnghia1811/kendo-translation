import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, parsePageId } from "@/lib/htv-api";
import { loadBookPages } from "@/lib/htv-books";

export const dynamic = "force-dynamic";

const MAX_IDS = 8; // [unit default] the window of the book screen is 5 pages at most

// Book screen (unit UXC step D, round 59): the browser asks for the data of the page sections near the screen.
// GET /api/htv/page?ids=left_foot_full/p048,left_foot_full/p049
// The answer holds, for each page, the page data of the shown run (null when the page has no finished run), and for a translator or admin
// the saved versions, the newest saved rows, and the comments. Unit RC1 (round 63): a reader gets 403 and uses /api/read/page.
export async function GET(req: Request) {
  try {
    const g = await guard(req, { mutating: false, staff: true });
    if (isResponse(g)) return g;
    const raw = new URL(req.url).searchParams.get("ids") ?? "";
    const ids = raw.split(",").filter(Boolean);
    if (ids.length === 0) return jsonResponse({ error: "Send the page IDs in the query ids." }, 400);
    if (ids.length > MAX_IDS) return jsonResponse({ error: `Ask for ${MAX_IDS} pages at most.` }, 400);
    const items = ids.map((id) => {
      const p = parsePageId(id);
      return { slug: p.slug, page: p.page };
    });
    return jsonResponse({ pages: await loadBookPages(items, g.user, g.token) });
  } catch (e) {
    return htvError(e);
  }
}
