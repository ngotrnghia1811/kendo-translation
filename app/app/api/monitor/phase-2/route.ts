import { jsonResponse, errorResponse } from "@/lib/api";
import { monitorOffResponse } from "@/lib/monitor";
import { dataRoot } from "@/lib/config";
import { isSafeSegment } from "@/lib/safe-path";
import { loadStepSummary } from "@/lib/step-tree-load";
import { parseOpenParam } from "@/lib/step-tree";

export const dynamic = "force-dynamic";

// Unit VW95 (round 91), Q-A 3:19.3 D2: levels 1 and 2 of the step view in one light call. Read only (D4).
// ?list=<list stamp> gives the run of that list (run view /runs/<stamp>, Q-A 3:18.3). Without it: the run of status.json.
export async function GET(req: Request) {
  try {
    const off = await monitorOffResponse();
    if (off) return off;
    const q = new URL(req.url).searchParams;
    const list = q.get("list");
    if (list !== null && !isSafeSegment(list)) return jsonResponse({ error: "The list name is not valid." }, 400);
    // ?open=<page id>,<page id>: the open pages of the screen carry their steps (level 2). The running page always does.
    return jsonResponse(await loadStepSummary(await dataRoot(), list, parseOpenParam(q.get("open"))));
  } catch (e) {
    return errorResponse(e);
  }
}
