import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, readBody } from "@/lib/htv-api";
import { PANES_MAX_BYTES, sanitizeSettings } from "@/lib/htv-settings";
import { saveUserSettings, userSettings } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Pane settings of the human-translation-view (unit UXC step E, round 59). Round 58 answer 5 (Q-A 2026-10-28 l203): a setting cog on every pane.
// Round 59 answer 6 (l224): "Kept in your account". The route reads and writes the record of the signed-in user in the collection user_settings.
// It takes the user from the session, never from the request, and PocketBase rules (own record only) apply to the token of the user.
// A reader can keep settings too (the reader has the same screen), so the route does not need the write role.
export async function GET(req: Request) {
  try {
    const g = await guard(req, { mutating: false });
    if (isResponse(g)) return g;
    const s = await userSettings(g.token, g.user.id);
    return jsonResponse({ theme: s.theme, panes: sanitizeSettings(s.panes) });
  } catch (e) {
    return htvError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const g = await guard(req, { mutating: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    if (body.panes === undefined) return jsonResponse({ error: "Send the key panes." }, 400);
    const panes = sanitizeSettings(body.panes);
    if (JSON.stringify(panes).length > PANES_MAX_BYTES) return jsonResponse({ error: "The settings are too large." }, 400);
    await saveUserSettings(g.token, g.user.id, { panes });
    return jsonResponse({ ok: true, panes });
  } catch (e) {
    return htvError(e);
  }
}
