import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, readBody } from "@/lib/htv-api";
import { deleteComment, updateComment } from "@/lib/pb";

export const dynamic = "force-dynamic";

const ID = /^[A-Za-z0-9]+$/;

// Round 51 answer 10 (Q-A 2026-10-28 l55): the writer edits own comments. Round 52 answer 12 (l83): the writer can change private to shared.
// The PocketBase rule lets only the writer update a comment (the admin cannot edit the text of another user).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const g = await guard(req, { mutating: true, write: true });
    if (isResponse(g)) return g;
    const { id } = await ctx.params;
    if (!ID.test(id)) return jsonResponse({ error: "Bad comment ID." }, 400);
    const b = await readBody(req);
    const changes: { text?: string; shared?: boolean } = {};
    if (typeof b.text === "string") {
      const t = b.text.trim();
      if (!t) return jsonResponse({ error: "Write the comment text first." }, 400);
      if (t.length > 100000) return jsonResponse({ error: "The comment is too long." }, 400);
      changes.text = t;
    }
    if (typeof b.shared === "boolean") changes.shared = b.shared;
    if (Object.keys(changes).length === 0) return jsonResponse({ error: "Nothing to change." }, 400);
    return jsonResponse({ ok: true, comment: await updateComment(g.token, g.user, id, changes) });
  } catch (e) {
    return htvError(e);
  }
}

// Round 53 answer 10 (Q-A 2026-10-28 l104): "Writer and admin". The writer deletes own comments, and the admin deletes any comment.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const g = await guard(req, { mutating: true, write: true });
    if (isResponse(g)) return g;
    const { id } = await ctx.params;
    if (!ID.test(id)) return jsonResponse({ error: "Bad comment ID." }, 400);
    await deleteComment(g.token, id);
    return jsonResponse({ ok: true });
  } catch (e) {
    return htvError(e);
  }
}
