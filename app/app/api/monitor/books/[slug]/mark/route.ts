import { handleBookAction } from "@/lib/book-actions";

export const dynamic = "force-dynamic";

// Unit VW77b1 (round 81), VISION-viewer 15.24.10 (plan name) and 15.27.3: the buttons Run, Run phase 4, and Resume write request.json.
// POST only. Body {"action": "run" | "resume", "phase": "agent-phase-3" | "agent-phase-4"}. The checks and the file form are in lib/book-actions.ts.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return handleBookAction(req, ctx.params, "mark");
}
