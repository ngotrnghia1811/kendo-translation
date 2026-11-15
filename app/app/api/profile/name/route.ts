import { jsonResponse } from "@/lib/api";
import { guard, isResponse, readBody } from "@/lib/htv-api";
import { profileCtx, profileErrorResponse } from "@/lib/profile-api";
import { updateName } from "@/lib/profile-pb";
import { cleanName, nameProblem } from "@/lib/profile-rules";

export const dynamic = "force-dynamic";

// Display name of the signed-in person (unit VW105, Q-A 3:60.4 row 2). Every role can change the own name, also a reader who waits for approval.
// PUT { name } saves the name. The body to PocketBase holds the key name only, so the person cannot change the role, the approval, or "disabled" here.
// The rule of the collection users refuses those keys as well (migration 1793300006 lines 29-30).
export async function PUT(req: Request) {
  try {
    const g = await guard(req, { mutating: true });
    if (isResponse(g)) return g;
    const name = cleanName((await readBody(req)).name);
    const bad = nameProblem(name);
    if (bad) return jsonResponse({ error: bad }, 400);
    return jsonResponse({ ok: true, name: await updateName(await profileCtx(g.token), g.user.id, name) });
  } catch (e) {
    return profileErrorResponse(e);
  }
}
