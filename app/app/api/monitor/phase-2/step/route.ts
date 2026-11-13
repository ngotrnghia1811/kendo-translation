import { jsonResponse, errorResponse } from "@/lib/api";
import { monitorOffResponse } from "@/lib/monitor";
import { dataRoot } from "@/lib/config";
import { loadStepData } from "@/lib/step-tree-load";
import { storeOfQuery } from "@/lib/run-store-load";

export const dynamic = "force-dynamic";

// Unit VW95 (round 91), Q-A 3:19.3 D2: the data of one step (level 3), only when the owner opens it. Read only (D4).
// Query: ?folder=pilot-run/<page folder>/<run folder>&step=box:TL_2 | critic:TL_2 | loss, or ?page=<page id>&step=update:TL_3,
// or ?diff=<box>&version=v2.1.1 (prompt diff of the run view section "Prompt updates", Q-A 3:18.3).
export async function GET(req: Request) {
  try {
    const off = await monitorOffResponse();
    if (off) return off;
    const q = new URL(req.url).searchParams;
    const root = await dataRoot();
    // Unit VW85 (Q-A 3:26.3 (a)): &list=<stamp> or &book=<slug> names the store of a book run. Without both: the phase 2 store.
    const store = await storeOfQuery(root, q.get("list"), q.get("book"));
    if ("error" in store) return jsonResponse({ error: store.error }, 400);
    return jsonResponse(await loadStepData(root, { folder: q.get("folder"), step: q.get("step"), page: q.get("page"), diff: q.get("diff"), version: q.get("version") }, store));
  } catch (e) {
    return errorResponse(e);
  }
}
