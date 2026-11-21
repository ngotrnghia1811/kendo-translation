import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, readBody } from "@/lib/htv-api";
import { makeLink, turnOffLink } from "@/lib/view-link-pb";

export const dynamic = "force-dynamic";

// Admin routes of the view-only links (unit VW120, Q-A 3:106.5 rows 1 and 6). Only the admin role. A link visitor has no token, so it gets 401. In a view of an admin the guard answers 403.
// POST  { name, ends? }   make a link. `ends` is a PST day "YYYY-MM-DD" (the link works to the end of that day). The answer holds the ID only, never the key.
// PATCH { id }            turn a link off (the button "Turn off"). The record stays, so the opens stay readable.
// PocketBase checks the admin role again: the list view_links is closed to every other role (migration 1793300018).
export async function POST(req: Request) {
  try {
    const g = await guard(req, { mutating: true, admin: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    const row = await makeLink(g.token, { name: body.name, ends: body.ends, createdBy: g.user.id });
    return jsonResponse({ ok: true, id: row.id }, 201);
  } catch (e) {
    return htvError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const g = await guard(req, { mutating: true, admin: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    if (typeof body.id !== "string") return jsonResponse({ error: "Send the link ID in the key id." }, 400);
    await turnOffLink(g.token, body.id);
    return jsonResponse({ ok: true, id: body.id });
  } catch (e) {
    return htvError(e);
  }
}
