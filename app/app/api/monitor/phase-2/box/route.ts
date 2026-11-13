import { jsonResponse, errorResponse } from "@/lib/api";
import { monitorOffResponse } from "@/lib/monitor";
import { dataRoot } from "@/lib/config";
import { isSafeSegment } from "@/lib/safe-path";
import { loadBoxMonitor, loadMonitorItem } from "@/lib/training-monitor-load";
import type { MonitorUnchanged } from "@/lib/training-monitor";

export const dynamic = "force-dynamic";

// Unit VW98 (round 91), Q-A 3:23.3 and 3:23.4: the training monitor of one box in the run view /runs/<stamp>. Read only.
// Summary (the live poll every 3 s): ?list=<stamp>&box=TL_2[&sig=<signature of the data that the screen holds>].
//   When the signature did not change, the answer is {unchanged: true, sig}, so the poll stays light.
// One opened line: ?item=critique&box=TL_2&folder=pilot-run/<page folder>/<run folder>&queue=<queue ID>,
//   ?item=update&box=TL_2&page=<page ID>, or ?item=rubric&box=QA_0&change=<change ID>.
//   A page call line uses the step data API /api/monitor/phase-2/step (step=box:TL_2).
export async function GET(req: Request) {
  try {
    const off = await monitorOffResponse();
    if (off) return off;
    const q = new URL(req.url).searchParams;
    const root = await dataRoot();
    const item = q.get("item");
    if (item) {
      return jsonResponse(await loadMonitorItem(root, { item, box: q.get("box"), folder: q.get("folder"), queueId: q.get("queue"), page: q.get("page"), change: q.get("change") }));
    }
    const list = q.get("list") ?? "";
    if (!isSafeSegment(list)) return jsonResponse({ error: "The request names no valid list stamp." }, 400);
    const data = await loadBoxMonitor(root, list, q.get("box") ?? "");
    const sig = q.get("sig");
    if (sig && sig === data.sig && !data.error) {
      const same: MonitorUnchanged = { unchanged: true, sig, generatedEpoch: data.generatedEpoch, millis: data.millis };
      return jsonResponse(same);
    }
    return jsonResponse(data);
  } catch (e) {
    return errorResponse(e);
  }
}
