import { handleClearMark } from "@/lib/book-restart-actions";

export const dynamic = "force-dynamic";

// Unit VW77b2 (round 82 answer 10): the button Clear mark. POST only. Body {} or {"requested_utc": "<press time of the mark in the dialog>"}.
// The mark moves to request.done.json and request.json goes away. The checks are in lib/book-restart-actions.ts.
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return handleClearMark(req, ctx.params);
}
