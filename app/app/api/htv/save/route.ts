import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, parsePageId, readBody } from "@/lib/htv-api";
import { rowsForSave } from "@/lib/htv-runs";
import { runMarkOf, saveVersion } from "@/lib/pb";

export const dynamic = "force-dynamic";

const MAX_TEXT = 100000; // the PocketBase field max of own_translations.text (migration 1793300001)

// Round 51 answer 7 (Q-A 2026-10-28 l52): "Option 1. But user have to click save to save it". Round 54 answer 7 (l126):
// "Every row, one page number". One Save writes one record for every row of the shown run, empty rows included.
// All records get the same version number. The server builds ts_ids, part, ja_text, and ed3_text from the run folder.
// The browser sends the group key, the own text, and the agree tick of each row (round 58 answer 4, l202). A missing agree counts as false.
// Round 59 answer 5 (l223): a tick and own text exclude each other, so the server refuses a row with both.
export async function POST(req: Request) {
  try {
    const g = await guard(req, { mutating: true, write: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    const { slug, page, pageId } = parsePageId(body.pageId);
    const runId = typeof body.runId === "string" ? body.runId : "";
    if (!Array.isArray(body.rows)) return jsonResponse({ error: "Send the list of rows." }, 400);
    const sent = new Map<string, string>();
    const agreeOf = new Map<string, boolean>();
    for (const r of body.rows as unknown[]) {
      const o = r as { groupKey?: unknown; text?: unknown; agree?: unknown };
      if (typeof o?.groupKey !== "string" || typeof o?.text !== "string") return jsonResponse({ error: "Each row needs groupKey and text." }, 400);
      if (o.agree !== undefined && typeof o.agree !== "boolean") return jsonResponse({ error: "The field agree must be true or false." }, 400);
      if (o.text.length > MAX_TEXT) return jsonResponse({ error: "One row is longer than 100000 characters." }, 400);
      if (o.agree === true && o.text.trim() !== "") return jsonResponse({ error: "A row with the agree tick must have an empty own text." }, 400);
      sent.set(o.groupKey, o.text);
      agreeOf.set(o.groupKey, o.agree === true);
    }
    // The shown run is decided on the server (admin mark first, else newest). The run ID from the browser must match it.
    const run = await rowsForSave(slug, page, await runMarkOf(g.token, pageId), g.token);
    if (!run || run.runId !== runId) return jsonResponse({ error: "The page now shows another run. Reload the page before you save." }, 409);
    const same = run.rows.length === sent.size && run.rows.every((r) => sent.has(r.key));
    if (!same) return jsonResponse({ error: "The list of rows differs from the run. Reload the page before you save." }, 409);
    if (run.rows.some((r) => agreeOf.get(r.key) && !r.ed3)) return jsonResponse({ error: "A row without an agent text cannot have the agree tick." }, 400);
    const out = await saveVersion(
      g.token,
      g.user,
      pageId,
      runId,
      slug,
      run.rows.map((r) => ({ groupKey: r.key, tsIds: r.tsIds, part: r.part, jaText: r.ja, ed3Text: r.ed3, text: sent.get(r.key) ?? "", agree: agreeOf.get(r.key) === true })),
    );
    return jsonResponse({ ok: true, ...out, runId });
  } catch (e) {
    return htvError(e);
  }
}
