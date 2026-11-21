import { jsonResponse } from "@/lib/api";
import { htvError, readBody } from "@/lib/htv-api";
import { foreignOrigin } from "@/lib/htv-origin";
import { clearViewCookie, setTokenCookie } from "@/lib/htv-session";
import { pbSignIn, userSettings } from "@/lib/pb";
import { DEFAULT_THEME_READER } from "@/lib/htv-settings";
import { hasThemeCookie, writeTheme } from "@/lib/theme";
import { clearLinkCookie } from "@/lib/view-link-cookie";

export const dynamic = "force-dynamic";

// Round 54 answer 10 (Q-A 2026-10-28 l129): the login route calls PocketBase and sets an httpOnly cookie with the user token.
// The route never logs or returns the password or the token. The answer holds the user (email, name, role) only.
export async function POST(req: Request) {
  try {
    const foreign = foreignOrigin(req);
    if (foreign) return foreign;
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) return jsonResponse({ error: "Send JSON." }, 415);
    const body = await readBody(req);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return jsonResponse({ error: "Enter the email and the password." }, 400);
    const r = await pbSignIn(email, password);
    if (!r.ok) return jsonResponse({ error: r.message }, r.status === 503 ? 503 : 401);
    await setTokenCookie(req, r.token);
    // Unit VW119 (Q-A 3:103.5 row 2): a new sign-in starts in the Admin view, so an old view cookie does not carry over.
    await clearViewCookie();
    // Unit VW120 (Q-A 3:107.5 row 5 and the unit default): a sign-in replaces a view-only link, so the link cookie goes.
    await clearLinkCookie();
    // Round 58 answer 6 (Q-A l204): the theme of the account goes into the cookie, so a second device gets it at sign-in.
    try {
      const saved = (await userSettings(r.token, r.user.id)).theme;
      if (saved) await writeTheme(req, saved);
      // Unit RC1 (round 63 answer 7): a reader with no saved theme and no cookie starts in the default theme of the reader pages.
      else if (r.user.role === "reader" && !(await hasThemeCookie())) await writeTheme(req, DEFAULT_THEME_READER);
    } catch {
      /* the sign-in does not depend on the settings */
    }
    return jsonResponse({ ok: true, user: { email: r.user.email, name: r.user.name, role: r.user.role, approved: r.user.approved } });
  } catch (e) {
    return htvError(e);
  }
}
