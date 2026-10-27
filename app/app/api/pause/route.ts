import { setPause } from "@/lib/runs";
import { jsonResponse, errorResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

// Round 43 answer 8 (Q-A l112): "Pause before next call (Recommended)". Round 44 answer 13: a pause button writes PAUSE.
// [agent inference] Local app, no sign-in. The route accepts only JSON bodies and refuses a foreign Origin,
// so a web page from another site cannot press the button.
export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) {
      return jsonResponse({ error: "Foreign origin." }, 403);
    }
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
      return jsonResponse({ error: "Send JSON." }, 415);
    }
    const body = (await req.json()) as { stamp?: unknown; on?: unknown };
    if (typeof body.stamp !== "string" || typeof body.on !== "boolean") {
      return jsonResponse({ error: "Body needs stamp (text) and on (true or false)." }, 400);
    }
    const r = await setPause(body.stamp, body.on);
    return jsonResponse({ ok: r.ok, message: r.message }, r.status);
  } catch (e) {
    return errorResponse(e);
  }
}
