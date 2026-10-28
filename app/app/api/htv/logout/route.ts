import { jsonResponse } from "@/lib/api";
import { clearTokenCookie } from "@/lib/htv-session";

export const dynamic = "force-dynamic";

// Sign out: the cookie is cleared. The token in PocketBase is not revoked (PocketBase tokens are stateless).
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return jsonResponse({ error: "Foreign origin." }, 403);
  await clearTokenCookie();
  return jsonResponse({ ok: true });
}
