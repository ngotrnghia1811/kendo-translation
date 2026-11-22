import { jsonResponse } from "@/lib/api";
import { monitorOffResponse } from "@/lib/monitor";
import { isLocalIssueId } from "@/lib/visual-issues-local-rules";
import { localIssuePicture } from "@/lib/visual-issues-local";

export const dynamic = "force-dynamic";

// Unit VW121 (plan item P60, Q-A 3:112.2 row 6): the picture of one issue of this Mac, for the list page /monitor/issues.
// GET /api/monitor/issues/<id>/picture. With the Monitor switch off the answer is 404 before any file read (row 4). The <id> must have the form of a folder name
// that the server made (for example 20261121-184500-3fa9c1). Any other text gives 400. The route reads picture.png of that one folder and nothing else.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const off = await monitorOffResponse();
    if (off) return off;
    const { id } = await ctx.params;
    if (!isLocalIssueId(id)) return jsonResponse({ error: "Bad issue ID." }, 400);
    const png = await localIssuePicture(id);
    if (!png) return jsonResponse({ error: "Not found" }, 404);
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" },
    });
  } catch {
    return jsonResponse({ error: "Not found" }, 404);
  }
}
