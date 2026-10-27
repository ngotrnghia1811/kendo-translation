import { loadExtra, EXTRA_PARTS, type ExtraPart } from "@/lib/page-extra";
import { jsonResponse, errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

// Round 43 answer 7 (Q-A l111): the extra items load only when the owner ticks them.
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const part = q.get("part") as ExtraPart;
    if (!EXTRA_PARTS.includes(part)) return jsonResponse({ error: "Unknown part." }, 400);
    const data = await loadExtra(q.get("run") ?? "", part, Number(q.get("stage") ?? "3"));
    return jsonResponse(data);
  } catch (e) {
    return errorResponse(e);
  }
}
