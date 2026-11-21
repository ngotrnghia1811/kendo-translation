import { jsonResponse } from "@/lib/api";
import { guardReader, htvError, isResponse, parsePageId, readBody } from "@/lib/htv-api";
import { PbError, saveReadingProgress } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Saved place of a reader (unit RC1, round 63 answer 7, Q-A 2026-10-28 l311: "Two collections for resume and bookmarks").
// PUT { pageId: "left_foot_full/p048" } saves the last page of that book for the signed-in user. The rule of reading_progress allows own records only.
// Unit VW105 (Q-A 3:61.3, finding 3 of DEPLOYCHECK): the first save of a book reads the record, finds none, and creates it. Two saves at the same moment
// (for example the double effect of React in `next dev`) both create. The unique index (user, item_id) of migration 1793300008 refuses the second with HTTP 400.
// The route then tries once more. The record exists now, so the second try is an update.
export async function PUT(req: Request) {
  try {
    // Unit VW119 (Q-A 3:103.5 row 6): "Reading progress and bookmarks are not saved in a view." The page saves the place by itself, so the route answers ok
    // with `skipped` and no error line [unit default VW119]. The page address is still checked.
    const g = await guardReader(req, { mutating: true, allowInView: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    const p = parsePageId(body.pageId);
    if (g.view) return jsonResponse({ ok: true, skipped: true, pageId: p.pageId });
    try {
      await saveReadingProgress(g.token, g.user.id, p.slug, p.pageId);
    } catch (e) {
      if (!(e instanceof PbError) || e.status !== 400) throw e;
      await saveReadingProgress(g.token, g.user.id, p.slug, p.pageId);
    }
    return jsonResponse({ ok: true, pageId: p.pageId });
  } catch (e) {
    return htvError(e);
  }
}
