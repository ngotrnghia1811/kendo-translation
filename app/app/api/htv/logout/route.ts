import { jsonResponse } from "@/lib/api";
import { foreignOrigin } from "@/lib/htv-origin";
import { clearTokenCookie } from "@/lib/htv-session";

export const dynamic = "force-dynamic";

// Sign out: the cookie is cleared. The token in PocketBase is not revoked (PocketBase tokens are stateless).
export async function POST(req: Request) {
  const foreign = foreignOrigin(req);
  if (foreign) return foreign;
  await clearTokenCookie();
  return jsonResponse({ ok: true });
}
