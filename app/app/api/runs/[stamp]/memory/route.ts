import { loadMemoryBook } from "@/lib/chain-load";
import { jsonResponse, errorResponse } from "@/lib/api";
import { monitorOffResponse } from "@/lib/monitor";

export const dynamic = "force-dynamic";

// Round 48 answer 9 (Q-A 2026-10-27 l55): the book translation memory pairs of one book. The panel asks for them when the owner opens the book.
export async function GET(req: Request, ctx: { params: Promise<{ stamp: string }> }) {
  try {
    // Round 58 answer 7 (Q-A 2026-10-28 l205): monitor off gives 404 before any file read.
    const off = await monitorOffResponse();
    if (off) return off;
    const { stamp } = await ctx.params;
    const book = new URL(req.url).searchParams.get("book") ?? "";
    const data = await loadMemoryBook(stamp, book);
    return data ? jsonResponse(data) : jsonResponse({ error: "This list has no chain for that book." }, 404);
  } catch (e) {
    return errorResponse(e);
  }
}
