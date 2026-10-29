import { jsonResponse } from "@/lib/api";
import { guardReader, htvError, isResponse, parsePageId, readBody } from "@/lib/htv-api";
import { saveReadingProgress } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Saved place of a reader (unit RC1, round 63 answer 7, Q-A 2026-10-28 l311: "Two collections for resume and bookmarks").
// PUT { pageId: "left_foot_full/p048" } saves the last page of that book for the signed-in user. The rule of reading_progress allows own records only.
export async function PUT(req: Request) {
  try {
    const g = await guardReader(req, { mutating: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    const p = parsePageId(body.pageId);
    await saveReadingProgress(g.token, g.user.id, p.slug, p.pageId);
    return jsonResponse({ ok: true, pageId: p.pageId });
  } catch (e) {
    return htvError(e);
  }
}
