import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse } from "@/lib/htv-api";
import { issuePicture } from "@/lib/visual-issues";
import { isIssueId } from "@/lib/visual-issue-rules";

export const dynamic = "force-dynamic";

// Admin: the picture of one visual issue (unit VW118, plan item P53, Q-A 3:99.5 row 7: "open issues first, with the picture").
// GET /api/admin/issues/<id>/picture. Only an admin passes (401 without a session, 403 for another role). The file of PocketBase is protected,
// so the app reads it with a short-lived file token of the admin and streams the PNG. The browser never sees the file token.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const g = await guard(req, { mutating: false, admin: true });
    if (isResponse(g)) return g;
    const { id } = await ctx.params;
    if (!isIssueId(id)) return jsonResponse({ error: "Bad issue ID." }, 400);
    return await issuePicture(g.token, id);
  } catch (e) {
    return htvError(e);
  }
}
