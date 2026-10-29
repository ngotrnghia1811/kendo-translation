import { listRuns } from "@/lib/runs";
import { jsonResponse, errorResponse } from "@/lib/api";
import { monitorOffResponse } from "@/lib/monitor";

export const dynamic = "force-dynamic";

// Round 43 answer 10 (Q-A l114): "Read files, refresh often". The browser polls this route every 3 seconds.
export async function GET() {
  try {
    // Round 58 answer 7 (Q-A 2026-10-28 l205): monitor off gives 404 before any file read.
    const off = await monitorOffResponse();
    if (off) return off;
    return jsonResponse(await listRuns());
  } catch (e) {
    return errorResponse(e);
  }
}
