import { getRun } from "@/lib/runs";
import { jsonResponse, errorResponse } from "@/lib/api";
import { monitorOffResponse } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ stamp: string }> }) {
  try {
    // Round 58 answer 7 (Q-A 2026-10-28 l205): monitor off gives 404 before any file read.
    const off = await monitorOffResponse();
    if (off) return off;
    const { stamp } = await ctx.params;
    const run = await getRun(stamp);
    return run ? jsonResponse(run) : jsonResponse({ error: "No such list." }, 404);
  } catch (e) {
    return errorResponse(e);
  }
}
