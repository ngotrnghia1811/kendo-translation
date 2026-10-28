import { loadCompares } from "@/lib/chain-load";
import { jsonResponse, errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

// Round 48 answer 9 (Q-A 2026-10-27 l55): the compare table of the two critic modes. An empty list means no compare.json for this list.
export async function GET(_req: Request, ctx: { params: Promise<{ stamp: string }> }) {
  try {
    const { stamp } = await ctx.params;
    return jsonResponse(await loadCompares(stamp));
  } catch (e) {
    return errorResponse(e);
  }
}
