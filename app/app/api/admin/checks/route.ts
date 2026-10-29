import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, parsePageId, readBody } from "@/lib/htv-api";
import { clearPageCheck, readerPageRecords, setPageCheck } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Admin: record that a person checked the agent translation of a page (unit RC1, round 63 answer 6: "Collection page_checks").
// POST { action: "set", pageId, note? } or { action: "clear", pageId }.
// With a check, the AI label of the page reads "AI translation, checked by a person". Only an admin writes page_checks (migration 1793300007).
export async function POST(req: Request) {
  try {
    const g = await guard(req, { mutating: true, admin: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    const p = parsePageId(body.pageId);
    if (body.action === "clear") {
      await clearPageCheck(g.token, p.pageId);
      return jsonResponse({ ok: true });
    }
    if (body.action !== "set") return jsonResponse({ error: "The action must be set or clear." }, 400);
    if ((await readerPageRecords(g.token, [p.pageId])).length === 0) return jsonResponse({ error: "This page has no reader text." }, 404);
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    await setPageCheck(g.token, g.user, p.pageId, note);
    return jsonResponse({ ok: true });
  } catch (e) {
    return htvError(e);
  }
}
