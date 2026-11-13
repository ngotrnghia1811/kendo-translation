import { jsonResponse } from "@/lib/api";
import { htvError, readBody } from "@/lib/htv-api";
import { foreignOrigin } from "@/lib/htv-origin";
import { pbSignUp } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Public sign-up of a reader (unit RC1, round 63 answer 4, Q-A 2026-10-28 l308: "Reader role, not approved").
// The route sends name, email, and password to PocketBase with no secret and no token. The create rule of users (migration 1793300006)
// forces role reader and approved false. The route never logs or returns the password. The new account sees titles and no text until an admin approves it.
// The limit on the number of sign-ups lives in PocketBase (unit VW101, Q-A 3:31.2 to 3:31.4): migration 1793300014 allows 5 sign-ups per hour
// for one network address, and the route has no limit of its own. The route passes the HTTP status 429 of PocketBase on, with the message
// "Too many sign-ups from this network. Try again later." (pbSignUp in lib/pb.ts). Not verified: which address PocketBase counts for a sign-up
// that comes from the Vercel app (the address that Caddy sees: Vercel server addresses are shared by all readers who sign up on the website).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const foreign = foreignOrigin(req);
    if (foreign) return foreign;
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) return jsonResponse({ error: "Send JSON." }, 415);
    const body = await readBody(req);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || name.length > 100) return jsonResponse({ error: "Enter your name (100 characters or fewer)." }, 400);
    if (!EMAIL.test(email) || email.length > 200) return jsonResponse({ error: "Enter a valid email." }, 400);
    if (password.length < 8 || password.length > 72) return jsonResponse({ error: "The password must have 8 to 72 characters." }, 400);
    const r = await pbSignUp(name, email, password);
    if (!r.ok) return jsonResponse({ error: r.message }, r.status === 503 || r.status === 400 || r.status === 429 ? r.status : 502);
    return jsonResponse({ ok: true });
  } catch (e) {
    return htvError(e);
  }
}
