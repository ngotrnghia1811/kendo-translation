import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, parsePageId, readBody } from "@/lib/htv-api";
import { finishedRuns } from "@/lib/htv-runs";
import { clearRunMark, setRunMark } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Round 51 answer 8 (Q-A 2026-10-28 l53): "Newest by default, but admin can mark one when needed." One mark for each page (run_marks, unique page_id).
export async function PUT(req: Request) {
  try {
    const g = await guard(req, { mutating: true, admin: true });
    if (isResponse(g)) return g;
    const b = await readBody(req);
    const { slug, page, pageId } = parsePageId(b.pageId);
    const runId = typeof b.runId === "string" ? b.runId : "";
    const runs = await finishedRuns(`${slug}_${page}`);
    if (!runs.some((r) => r.runId === runId)) return jsonResponse({ error: "This run is not a finished run of the page." }, 400);
    await setRunMark(g.token, g.user, pageId, runId);
    return jsonResponse({ ok: true, runId });
  } catch (e) {
    return htvError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const g = await guard(req, { mutating: true, admin: true });
    if (isResponse(g)) return g;
    const b = await readBody(req);
    const { pageId } = parsePageId(b.pageId);
    await clearRunMark(g.token, pageId);
    return jsonResponse({ ok: true });
  } catch (e) {
    return htvError(e);
  }
}
