import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, parsePageId, readBody } from "@/lib/htv-api";
import { rowsForSave } from "@/lib/htv-runs";
import { runMarkOf, saveVersion } from "@/lib/pb";

export const dynamic = "force-dynamic";

const MAX_TEXT = 100000; // the PocketBase field max of own_translations.text (migration 1793300001)

// Round 51 answer 7 (Q-A 2026-10-28 l52): "Option 1. But user have to click save to save it". Round 54 answer 7 (l126):
// "Every row, one page number". One Save writes one record for every row of the shown run, empty rows included.
// All records get the same version number. The server builds ts_ids, part, ja_text, and ed3_text from the run folder.
// The browser sends only the group key and the own text of each row.
export async function POST(req: Request) {
  try {
    const g = await guard(req, { mutating: true, write: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    const { slug, page, pageId } = parsePageId(body.pageId);
    const runId = typeof body.runId === "string" ? body.runId : "";
    if (!Array.isArray(body.rows)) return jsonResponse({ error: "Send the list of rows." }, 400);
    const sent = new Map<string, string>();
    for (const r of body.rows as unknown[]) {
      const o = r as { groupKey?: unknown; text?: unknown };
      if (typeof o?.groupKey !== "string" || typeof o?.text !== "string") return jsonResponse({ error: "Each row needs groupKey and text." }, 400);
      if (o.text.length > MAX_TEXT) return jsonResponse({ error: "One row is longer than 100000 characters." }, 400);
      sent.set(o.groupKey, o.text);
    }
    // The shown run is decided on the server (admin mark first, else newest). The run ID from the browser must match it.
    const run = await rowsForSave(slug, page, await runMarkOf(g.token, pageId), g.token);
    if (!run || run.runId !== runId) return jsonResponse({ error: "The page now shows another run. Reload the page before you save." }, 409);
    const same = run.rows.length === sent.size && run.rows.every((r) => sent.has(r.key));
    if (!same) return jsonResponse({ error: "The list of rows differs from the run. Reload the page before you save." }, 409);
    const out = await saveVersion(
      g.token,
      g.user,
      pageId,
      runId,
      slug,
      run.rows.map((r) => ({ groupKey: r.key, tsIds: r.tsIds, part: r.part, jaText: r.ja, ed3Text: r.ed3, text: sent.get(r.key) ?? "" })),
    );
    return jsonResponse({ ok: true, ...out, runId });
  } catch (e) {
    return htvError(e);
  }
}
