import { jsonResponse } from "@/lib/api";
import { guardReader, htvError, isResponse, parsePageId, readBody } from "@/lib/htv-api";
import { addBookmark, removeBookmark } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Bookmarks of a reader (unit RC1, round 63 answer 7). Own records only: the rules of the collection bookmarks decide.
// POST { pageId, note? } adds a bookmark. DELETE { id } removes one.
export async function POST(req: Request) {
  try {
    const g = await guardReader(req, { mutating: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    const p = parsePageId(body.pageId);
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    return jsonResponse({ ok: true, bookmark: await addBookmark(g.token, g.user.id, p.pageId, p.slug, note) });
  } catch (e) {
    return htvError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const g = await guardReader(req, { mutating: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    if (typeof body.id !== "string" || !/^[A-Za-z0-9]+$/.test(body.id)) return jsonResponse({ error: "Send the bookmark ID." }, 400);
    await removeBookmark(g.token, body.id);
    return jsonResponse({ ok: true });
  } catch (e) {
    return htvError(e);
  }
}
