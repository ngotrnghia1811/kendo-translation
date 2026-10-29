import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, readBody } from "@/lib/htv-api";
import { PANES_MAX_BYTES, sanitizeReader, sanitizeSettings } from "@/lib/htv-settings";
import { saveUserSettings, userSettings } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Settings of the reader pages (unit RC1, round 63). Owner 2026-10-07 l67: "Per account, all devices".
// The route changes the key reader of user_settings.panes and keeps the other keys. It takes the user from the session.
// A reader who waits for approval keeps settings too (the settings are not page text).
export async function PUT(req: Request) {
  try {
    const g = await guard(req, { mutating: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    const reader = sanitizeReader(body.reader);
    if (!reader) return jsonResponse({ error: "Send the key reader with valid values." }, 400);
    const old = sanitizeSettings((await userSettings(g.token, g.user.id)).panes);
    const panes = { ...old, reader: { ...(old.reader ?? {}), ...reader } };
    if (JSON.stringify(panes).length > PANES_MAX_BYTES) return jsonResponse({ error: "The settings are too large." }, 400);
    await saveUserSettings(g.token, g.user.id, { panes });
    return jsonResponse({ ok: true, reader: panes.reader });
  } catch (e) {
    return htvError(e);
  }
}
