import { jsonResponse } from "@/lib/api";
import { htvError, readBody } from "@/lib/htv-api";
import { setTokenCookie } from "@/lib/htv-session";
import { pbSignIn } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Round 54 answer 10 (Q-A 2026-10-28 l129): the login route calls PocketBase and sets an httpOnly cookie with the user token.
// The route never logs or returns the password or the token. The answer holds the user (email, name, role) only.
export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) return jsonResponse({ error: "Foreign origin." }, 403);
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) return jsonResponse({ error: "Send JSON." }, 415);
    const body = await readBody(req);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return jsonResponse({ error: "Enter the email and the password." }, 400);
    const r = await pbSignIn(email, password);
    if (!r.ok) return jsonResponse({ error: r.message }, r.status === 503 ? 503 : 401);
    await setTokenCookie(req, r.token);
    return jsonResponse({ ok: true, user: { email: r.user.email, name: r.user.name, role: r.user.role } });
  } catch (e) {
    return htvError(e);
  }
}
