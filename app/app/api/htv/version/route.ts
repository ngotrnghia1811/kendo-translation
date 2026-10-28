import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, parsePageId } from "@/lib/htv-api";
import { savedRows } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Load one saved version of the page into the boxes (round 51 answer 7, Q-A 2026-10-28 l52). The user reads own versions only.
export async function GET(req: Request) {
  try {
    const g = await guard(req, { mutating: false });
    if (isResponse(g)) return g;
    const u = new URL(req.url);
    const { pageId } = parsePageId(u.searchParams.get("pageId"));
    const version = Number(u.searchParams.get("version"));
    if (!Number.isInteger(version) || version < 1) return jsonResponse({ error: "Bad version number." }, 400);
    const rows = await savedRows(g.token, g.user.id, pageId, version);
    if (rows.length === 0) return jsonResponse({ error: "No such version." }, 404);
    return jsonResponse({ version, rows });
  } catch (e) {
    return htvError(e);
  }
}
