import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, readBody } from "@/lib/htv-api";
import { PANES_MAX_BYTES, sanitizeClear, sanitizeReader, sanitizeSettings } from "@/lib/htv-settings";
import { saveUserSettings, userSettings } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Settings of the reader pages (unit RC1, round 63). Owner 2026-10-07 l67: "Per account, all devices".
// The route changes the key reader of user_settings.panes and keeps the other keys. It takes the user from the session.
// A reader who waits for approval keeps settings too (the settings are not page text).
// Unit RT73b (VISION-viewer 15.26.6.2): the body can also hold `clear`, a list of layout keys to remove. The button "Reset layout" sends it.
export async function PUT(req: Request) {
  try {
    const g = await guard(req, { mutating: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    const reader = sanitizeReader(body.reader);
    const clear = sanitizeClear(body.clear);
    if (!reader && clear.length === 0) return jsonResponse({ error: "Send the key reader with valid values." }, 400);
    const old = sanitizeSettings((await userSettings(g.token, g.user.id)).panes);
    const merged = { ...(old.reader ?? {}), ...(reader ?? {}) };
    for (const k of clear) delete merged[k];
    const panes = { ...old, reader: merged };
    if (JSON.stringify(panes).length > PANES_MAX_BYTES) return jsonResponse({ error: "The settings are too large." }, 400);
    await saveUserSettings(g.token, g.user.id, { panes });
    return jsonResponse({ ok: true, reader: panes.reader });
  } catch (e) {
    return htvError(e);
  }
}
