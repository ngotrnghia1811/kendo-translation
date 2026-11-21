import { jsonResponse } from "@/lib/api";
import { htvError, readBody } from "@/lib/htv-api";
import { foreignOrigin } from "@/lib/htv-origin";
import { isTheme } from "@/lib/htv-settings";
import { getSession } from "@/lib/htv-session";
import { saveUserSettings } from "@/lib/pb";
import { writeTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

// Round 58 answer 6 (Q-A 2026-10-28 l204): the switch Light / High-contrast dark. The route sets the cookie "theme".
// A signed-in user also keeps the theme in the account (user_settings.theme). The monitor has no sign-in, so it keeps the cookie only.
// This route is not a monitor route: it works with the monitor off.
export async function PUT(req: Request) {
  try {
    const foreign = foreignOrigin(req);
    if (foreign) return foreign;
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) return jsonResponse({ error: "Send JSON." }, 415);
    const body = await readBody(req);
    if (!isTheme(body.theme)) return jsonResponse({ error: "The theme must be light, dark, sepia, solarized-light, or solarized-dark." }, 400);
    await writeTheme(req, body.theme);
    let account = false;
    try {
      const s = await getSession();
      // Unit VW119 (Q-A 3:103.5 row 6): in a view the theme works in this browser (the cookie), so an admin can check every theme. The account save is skipped,
      // because nothing can change data in a view [unit default VW119].
      if (s && !s.view) {
        await saveUserSettings(s.token, s.user.id, { theme: body.theme });
        account = true;
      }
    } catch {
      // The cookie is set. A failed account save (PocketBase down, collection missing) does not undo it.
    }
    return jsonResponse({ ok: true, theme: body.theme, account });
  } catch (e) {
    return htvError(e);
  }
}
