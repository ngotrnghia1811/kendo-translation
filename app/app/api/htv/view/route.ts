import { jsonResponse } from "@/lib/api";
import { htvError, readBody } from "@/lib/htv-api";
import { foreignOrigin } from "@/lib/htv-origin";
import { clearViewCookie, getSession, setViewCookie } from "@/lib/htv-session";
import { parseViewChoice } from "@/lib/view-as";

export const dynamic = "force-dynamic";

// Unit VW119 (plan item P56, Q-A 3:103.5 rows 1 and 2): set or clear the view of an admin.
// POST { view: "admin" | "translator" | "reader" }. "admin" clears the view cookie. The other two set it, with the flags and the lifetime of the token cookie.
// Only an account with the real role admin can call it, also in a view (so that the admin can go back). Any other signed-in account gets 403, and a request
// without a session gets 401. A request from another site gets 403 (foreignOrigin), and the body must be JSON, as for the other routes that change a cookie.
// This route does not use guard(): guard() refuses a request that changes data in a view, and this route changes no data (a cookie only).
export async function POST(req: Request) {
  try {
    const foreign = foreignOrigin(req);
    if (foreign) return foreign;
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) return jsonResponse({ error: "Send JSON." }, 415);
    const s = await getSession();
    if (!s) return jsonResponse({ error: "Sign in first." }, 401);
    if (s.realRole !== "admin") return jsonResponse({ error: "Only the admin can do this." }, 403);
    const choice = parseViewChoice((await readBody(req)).view);
    if (!choice) return jsonResponse({ error: "The view must be admin, translator, or reader." }, 400);
    if (choice === "admin") await clearViewCookie();
    else await setViewCookie(req, s.token, choice);
    return jsonResponse({ ok: true, view: choice });
  } catch (e) {
    return htvError(e);
  }
}
