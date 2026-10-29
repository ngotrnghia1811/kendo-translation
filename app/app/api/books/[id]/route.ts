import { getBookDetail } from "@/lib/books";
import { jsonResponse, errorResponse } from "@/lib/api";
import { monitorOffResponse } from "@/lib/monitor";

export const dynamic = "force-dynamic";

// Round 48 answer 9 (Q-A 2026-10-27 l55): "the Books Details part loaded on request". One item per call, so the page /books stays small.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Round 58 answer 7 (Q-A 2026-10-28 l205): monitor off gives 404 before any file read.
    const off = await monitorOffResponse();
    if (off) return off;
    const { id } = await ctx.params;
    const detail = await getBookDetail(id);
    return detail ? jsonResponse(detail) : jsonResponse({ error: "No such book or article." }, 404);
  } catch (e) {
    return errorResponse(e);
  }
}
