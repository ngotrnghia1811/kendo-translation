import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, parsePageId, readBody } from "@/lib/htv-api";
import { createComment } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Round 50 answer 10 (Q-A 2026-10-28 l31) and round 51 answer 10 (l55): a comment attaches to one sentence row.
// A new comment starts private unless the writer ticks "shared".
export async function POST(req: Request) {
  try {
    const g = await guard(req, { mutating: true, write: true });
    if (isResponse(g)) return g;
    const b = await readBody(req);
    const { pageId } = parsePageId(b.pageId);
    const groupKey = typeof b.groupKey === "string" ? b.groupKey : "";
    const text = typeof b.text === "string" ? b.text.trim() : "";
    const runId = typeof b.runId === "string" ? b.runId : "";
    if (!groupKey.startsWith(pageId + "/ts3/")) return jsonResponse({ error: "Bad row key." }, 400);
    if (!text) return jsonResponse({ error: "Write the comment text first." }, 400);
    if (text.length > 100000) return jsonResponse({ error: "The comment is too long." }, 400);
    const c = await createComment(g.token, g.user, { pageId, groupKey, runId, text, shared: b.shared === true });
    return jsonResponse({ ok: true, comment: c });
  } catch (e) {
    return htvError(e);
  }
}
