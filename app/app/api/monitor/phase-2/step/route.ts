import { jsonResponse, errorResponse } from "@/lib/api";
import { monitorOffResponse } from "@/lib/monitor";
import { dataRoot } from "@/lib/config";
import { loadStepData } from "@/lib/step-tree-load";

export const dynamic = "force-dynamic";

// Unit VW95 (round 91), Q-A 3:19.3 D2: the data of one step (level 3), only when the owner opens it. Read only (D4).
// Query: ?folder=pilot-run/<page folder>/<run folder>&step=box:TL_2 | critic:TL_2 | loss, or ?page=<page id>&step=update:TL_3,
// or ?diff=<box>&version=v2.1.1 (prompt diff of the run view section "Prompt updates", Q-A 3:18.3).
export async function GET(req: Request) {
  try {
    const off = await monitorOffResponse();
    if (off) return off;
    const q = new URL(req.url).searchParams;
    return jsonResponse(await loadStepData(await dataRoot(), { folder: q.get("folder"), step: q.get("step"), page: q.get("page"), diff: q.get("diff"), version: q.get("version") }));
  } catch (e) {
    return errorResponse(e);
  }
}
