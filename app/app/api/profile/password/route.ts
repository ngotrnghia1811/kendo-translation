import { jsonResponse } from "@/lib/api";
import { guard, isResponse, readBody } from "@/lib/htv-api";
import { clearTokenCookie } from "@/lib/htv-session";
import { profileCtx, profileErrorResponse } from "@/lib/profile-api";
import { changePassword } from "@/lib/profile-pb";
import { AFTER_PASSWORD_PATH, passwordProblem } from "@/lib/profile-rules";

export const dynamic = "force-dynamic";

// Change of the password (unit VW105, Q-A 3:60.4 row 3). POST { oldPassword, newPassword, newPasswordAgain }.
// PocketBase checks the old password. After a change PocketBase ends the old sign-in tokens, so the route clears the cookie
// and the page sends the person to the sign-in page. The route never logs or returns a password. Every role can use it, also a reader who waits for approval.
export async function POST(req: Request) {
  try {
    const g = await guard(req, { mutating: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    const str = (v: unknown): string => (typeof v === "string" ? v : "");
    const oldPassword = str(body.oldPassword);
    const newPassword = str(body.newPassword);
    const bad = passwordProblem(oldPassword, newPassword, str(body.newPasswordAgain));
    if (bad) return jsonResponse({ error: bad }, 400);
    await changePassword(await profileCtx(g.token), g.user.id, oldPassword, newPassword);
    await clearTokenCookie();
    return jsonResponse({ ok: true, next: AFTER_PASSWORD_PATH });
  } catch (e) {
    return profileErrorResponse(e);
  }
}
