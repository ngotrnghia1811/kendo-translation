import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, readBody } from "@/lib/htv-api";
import { adminUpdateUser } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Admin: approve a reader, remove the approval, disable or enable an account (unit RC1, round 63 answer 4).
// POST { id, approved?: boolean, disabled?: boolean }. The user update rule of PocketBase lets only an admin change these two fields (migration 1793300006).
// An admin cannot disable the own account here (a lock-out).
export async function POST(req: Request) {
  try {
    const g = await guard(req, { mutating: true, admin: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    if (typeof body.id !== "string" || !/^[A-Za-z0-9]+$/.test(body.id)) return jsonResponse({ error: "Send the user ID." }, 400);
    const changes: { approved?: boolean; disabled?: boolean } = {};
    if (typeof body.approved === "boolean") changes.approved = body.approved;
    if (typeof body.disabled === "boolean") changes.disabled = body.disabled;
    if (Object.keys(changes).length === 0) return jsonResponse({ error: "Send approved or disabled." }, 400);
    if (body.id === g.user.id && changes.disabled === true) return jsonResponse({ error: "You cannot disable your own account." }, 400);
    await adminUpdateUser(g.token, body.id, changes);
    return jsonResponse({ ok: true });
  } catch (e) {
    return htvError(e);
  }
}
