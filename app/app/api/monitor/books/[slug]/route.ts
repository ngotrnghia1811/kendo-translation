import { loadBookDetail } from "@/lib/book-detail";
import { jsonResponse, errorResponse } from "@/lib/api";
import { monitorOffResponse } from "@/lib/monitor";
import { isSafeSegment } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

// Unit VW77c (round 86), VISION-viewer 15.24.5 and 15.24.10: GET only. The Details view polls this route every 3 seconds. The route reads files and writes none.
// Order of the checks: monitor off gives the 404 of monitorOffResponse before any file read (round 58 answer 7), a slug that is not safe or not in the book set gives 404.
// The write routes of this folder (mark, pause, clear-mark) keep their own files. The restart-options route stays as it is.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const off = await monitorOffResponse();
    if (off) return off;
    const { slug } = await ctx.params;
    if (typeof slug !== "string" || !isSafeSegment(slug)) return jsonResponse({ error: "Not found" }, 404);
    const detail = await loadBookDetail(slug);
    if (!detail) return jsonResponse({ error: "Not found" }, 404);
    return jsonResponse(detail);
  } catch (e) {
    return errorResponse(e);
  }
}
