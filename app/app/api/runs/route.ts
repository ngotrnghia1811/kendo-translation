import { listRuns } from "@/lib/runs";
import { jsonResponse, errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

// Round 43 answer 10 (Q-A l114): "Read files, refresh often". The browser polls this route every 3 seconds.
export async function GET() {
  try {
    return jsonResponse(await listRuns());
  } catch (e) {
    return errorResponse(e);
  }
}
