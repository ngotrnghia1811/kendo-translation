import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse } from "@/lib/htv-api";
import { refreshSession } from "@/lib/htv-session";

export const dynamic = "force-dynamic";

// Token refresh. The pages of the human-translation-view call it once on load. PocketBase user tokens live 5 days [check: H1 2026-10-28 15:17 jwt exp claim on PocketBase 0.39.10].
export async function POST(req: Request) {
  try {
    const g = await guard(req, { mutating: true });
    if (isResponse(g)) return g;
    const r = await refreshSession(req);
    if (!r) return jsonResponse({ error: "Sign in first." }, 401);
    return jsonResponse({ ok: true, refreshed: r.refreshed });
  } catch (e) {
    return htvError(e);
  }
}
