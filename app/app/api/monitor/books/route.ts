import { loadMonitor } from "@/lib/book-status";
import { jsonResponse, errorResponse } from "@/lib/api";
import { monitorOffResponse } from "@/lib/monitor";

export const dynamic = "force-dynamic";

// Unit VW77a (round 80), VISION-viewer 15.24.10: GET only. The Monitor dashboard polls this route every 3 seconds. The route reads files and writes none.
// Monitor off gives the 404 of monitorOffResponse before any file read (round 58 answer 7, Q-A 2026-10-28 l205). The route holds no state.
export async function GET() {
  try {
    const off = await monitorOffResponse();
    if (off) return off;
    return jsonResponse(await loadMonitor());
  } catch (e) {
    return errorResponse(e);
  }
}
