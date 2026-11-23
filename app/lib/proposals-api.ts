import "server-only";
import { errorResponse, jsonResponse } from "./api";
import { guard, isResponse, readBody } from "./htv-api";
import { localWriteProblem } from "./local-write";
import { monitorOffResponse } from "./monitor";
import { ProposalProblem } from "./proposals-core";
import { commentOnGroup, decideOnGroup, loadProposalsView, rebuildFromTab } from "./proposals-data";

// Unit VW126 (Q-A 3:116.8 "a agent-proposal tab (not for reader)", Q-A 3:117.7 rows 2 to 6). One body for the four routes under /api/dictionary:
//   GET  /api/dictionary/proposals            the tab: the groups, their state, the count of decisions that wait for a rebuild. Translator or admin.
//   POST /api/dictionary/proposals/comment    body {group, text}. Translator or admin. Writes one line into proposal-reviews.jsonl.
//   POST /api/dictionary/proposals/decide     body {group, action: accept | edit-accept | reject, text?, values?, etag}. Admin only.
//   POST /api/dictionary/rebuild              body {apply: boolean}. Admin only. The dry run, or the dry run and then --apply.
// Checks, in this order (the order of the other Monitor routes):
//   1. Monitor switch off (the live site): 404 "Not found". The routes do not exist there.   2. POST only: foreign Origin or no loopback Host: 403.
//   3. POST only: content type not JSON: 415.   4. No session (a visitor of a view-only link has none): 401.   5. POST only: a view ("View as"): 403.
//   6. Role: a reader: 403. A decision or a rebuild needs the admin: 403 for a translator.   7. The body and the files: 400, 404, 409, 503.
// No route accepts a visitor of a view-only link, because `allowLink` is not set.
const personOf = (s: { user: { name: string; email: string; role: string } }) => ({ name: s.user.name || s.user.email, role: s.user.role });

export async function handleProposals(req: Request, kind: "view" | "comment" | "decide" | "rebuild"): Promise<Response> {
  try {
    const off = await monitorOffResponse(); // 1
    if (off) return off;
    if (kind !== "view") {
      const bad = localWriteProblem(req); // 2
      if (bad) return jsonResponse({ error: bad }, 403);
    }
    const g = await guard(req, { mutating: kind !== "view", staff: true, admin: kind === "decide" || kind === "rebuild" }); // 3 to 6
    if (isResponse(g)) return g;
    if (kind === "view") return jsonResponse(await loadProposalsView());
    const body = await readBody(req);
    if (kind === "comment") return jsonResponse(await commentOnGroup(personOf(g), { group: body.group, text: body.text }));
    if (kind === "decide") return jsonResponse(await decideOnGroup(personOf(g), { group: body.group, action: body.action, text: body.text, values: body.values, etag: body.etag }));
    if (typeof body.apply !== "boolean") return jsonResponse({ error: "Body needs apply: true or false." }, 400);
    return jsonResponse(await rebuildFromTab(body.apply));
  } catch (e) {
    if (e instanceof ProposalProblem) return jsonResponse({ error: e.message }, e.status);
    return errorResponse(e);
  }
}
