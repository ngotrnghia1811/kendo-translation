import { handleBookSettings } from "@/lib/book-settings-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Unit VW122 (plan P61, card P61.2, Q-A 3:112.3): the Run settings of one book on the Monitor dashboard `/` on this Mac. GET reads, PUT saves the book file
// <config folder>/book-settings/<slug>.json and one history line. The checks and the file work are in lib/book-settings-api.ts and lib/book-settings.ts.
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return handleBookSettings(req, ctx.params, "get");
}

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return handleBookSettings(req, ctx.params, "put");
}
