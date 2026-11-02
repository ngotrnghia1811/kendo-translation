import { handleRestartOptions } from "@/lib/restart-data";

export const dynamic = "force-dynamic";

// Unit VW77b2 (round 82): the data of the Restart dialog on the Monitor dashboard `/`. GET only. It reads files and writes nothing.
// The route name is a unit default of VW77b2. The rules are in lib/restart-rules.ts, the file reads in lib/restart-data.ts.
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return handleRestartOptions(req, ctx.params);
}
