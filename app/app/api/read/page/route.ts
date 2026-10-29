import { jsonResponse } from "@/lib/api";
import { guardReader, htvError, isResponse, parsePageId } from "@/lib/htv-api";
import { loadReaderPages } from "@/lib/reader-data";

export const dynamic = "force-dynamic";

const MAX_IDS = 8; // [unit default] the window of the scroll view is 5 pages at most

// Reader pages (unit RC1, round 63): the browser asks for the text of the pages near the screen.
// GET /api/read/page?ids=left_foot_full/p048,left_foot_full/p049   (one book in one call)
// The answer holds ReaderPageData for each page: the rows, the term entries, the extras, and the AI label lines.
// It holds no verdict, no score, no QA field, no TL_3 panel, and no reasoning. A reader who waits for approval gets 403.
export async function GET(req: Request) {
  try {
    const g = await guardReader(req, { mutating: false });
    if (isResponse(g)) return g;
    const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean);
    if (ids.length === 0) return jsonResponse({ error: "Send the page IDs in the query ids." }, 400);
    if (ids.length > MAX_IDS) return jsonResponse({ error: `Ask for ${MAX_IDS} pages at most.` }, 400);
    const parsed = ids.map(parsePageId);
    if (new Set(parsed.map((p) => p.slug)).size !== 1) return jsonResponse({ error: "Ask for one book in one call." }, 400);
    const digits = Math.max(...parsed.map((p) => p.page.length - 1));
    const nums = parsed.map((p) => parseInt(p.page.slice(1), 10));
    return jsonResponse({ pages: await loadReaderPages(g.token, parsed[0].slug, nums, digits) });
  } catch (e) {
    return htvError(e);
  }
}
