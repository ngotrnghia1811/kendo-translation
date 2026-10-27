import { getRun } from "@/lib/runs";
import { jsonResponse, errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ stamp: string }> }) {
  try {
    const { stamp } = await ctx.params;
    const run = await getRun(stamp);
    return run ? jsonResponse(run) : jsonResponse({ error: "No such list." }, 404);
  } catch (e) {
    return errorResponse(e);
  }
}
