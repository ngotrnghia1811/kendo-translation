import { handleBookAction } from "@/lib/book-actions";

export const dynamic = "force-dynamic";

// Unit VW77b1 (round 81), VISION-viewer 15.24.4.5 (round 71 answer 10): the button Pause of a Running book writes the file PAUSE in book-store/<slug>/.
// The route name is a unit default of VW77b1. The old pilot Pause stays at /api/pause (Lists tab, run view). POST only. Body {} (any JSON object).
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return handleBookAction(req, ctx.params, "pause");
}
