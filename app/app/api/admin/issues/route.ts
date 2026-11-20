import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, readBody } from "@/lib/htv-api";
import { resolveIssue } from "@/lib/visual-issues";
import { checkResolveNote, isIssueId } from "@/lib/visual-issue-rules";

export const dynamic = "force-dynamic";

// Admin: "Mark resolved" with a note (unit VW118, plan item P53, Q-A 3:99.5 rows 7 and 8).
// POST { id, note? }. The note holds the unit and the commit, for example "unit VW1xx, commit abc1234" (row 8). The state becomes "resolved".
// Only an admin passes (guard: 401 without a session, 403 for another role). The update rule of PocketBase lets only an admin change a record (migration 1793300017).
export async function POST(req: Request) {
  try {
    const g = await guard(req, { mutating: true, admin: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    if (!isIssueId(body.id)) return jsonResponse({ error: "Send the issue ID." }, 400);
    const note = checkResolveNote(body.note);
    if (!note.ok) return jsonResponse({ error: note.error }, 400);
    await resolveIssue(g.token, body.id, note.note);
    return jsonResponse({ ok: true });
  } catch (e) {
    return htvError(e);
  }
}
