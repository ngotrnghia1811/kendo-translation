import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, parsePageId, readBody } from "@/lib/htv-api";
import { mergeRows } from "@/lib/reader-data";
import { adminVersionRows, adminVersionsOfPage, chooseVersion, chosenVersionOf, clearChosenVersion, pageCheckOf, PbError, readerPageRecords } from "@/lib/pb";

export const dynamic = "force-dynamic";

// Admin: choose which human version the readers can switch to (unit RC1, round 63 answer 6, Q-A 2026-10-28 l310: "Admin page /admin/versions").
// GET ?pageId=slug/pNNN                        the saved versions of all translators, the chosen version, and the page check
// GET ?pageId=...&userId=...&version=N         preview: the rows as a reader sees them with that version, with the fact marks of the kendojidai.com text (unit RT73b)
// POST { action: "choose", pageId, userId, version }   copy the version into reader_versions (one record for each page)
// POST { action: "clear", pageId }             remove the choice
// The rules of PocketBase let only an admin write reader_versions. The copy keeps the text valid when the translator saves a newer version.
export async function GET(req: Request) {
  try {
    const g = await guard(req, { mutating: false, admin: true });
    if (isResponse(g)) return g;
    const u = new URL(req.url).searchParams;
    const p = parsePageId(u.get("pageId"));
    const userId = u.get("userId");
    const version = Number(u.get("version"));
    if (userId) {
      if (!/^[A-Za-z0-9]+$/.test(userId) || !Number.isInteger(version) || version < 1) return jsonResponse({ error: "Send userId and version." }, 400);
      const rec = (await readerPageRecords(g.token, [p.pageId]))[0];
      if (!rec) return jsonResponse({ error: "This page has no reader text." }, 404);
      const rows = await adminVersionRows(g.token, p.pageId, userId, version);
      const merged = mergeRows(rec, { pageId: p.pageId, version, runId: rec.runId, rows });
      return jsonResponse({ rows: merged.map((r) => ({ key: r.key, shortKey: r.shortKey, ja: r.ja, agent: r.agent.text, human: r.human?.text ?? "", kind: r.human?.kind ?? "agent", facts: r.human?.facts ?? [] })) });
    }
    const versions = await adminVersionsOfPage(g.token, p.pageId);
    const chosen = await chosenVersionOf(g.token, p.pageId);
    const check = await pageCheckOf(g.token, p.pageId);
    return jsonResponse({ versions, chosen: chosen ? { userId: chosen.userId, version: chosen.version } : null, check });
  } catch (e) {
    return htvError(e);
  }
}

export async function POST(req: Request) {
  try {
    const g = await guard(req, { mutating: true, admin: true });
    if (isResponse(g)) return g;
    const body = await readBody(req);
    const p = parsePageId(body.pageId);
    if (body.action === "clear") {
      await clearChosenVersion(g.token, p.pageId);
      return jsonResponse({ ok: true });
    }
    if (body.action !== "choose") return jsonResponse({ error: "The action must be choose or clear." }, 400);
    const userId = typeof body.userId === "string" ? body.userId : "";
    const version = Number(body.version);
    if (!/^[A-Za-z0-9]+$/.test(userId) || !Number.isInteger(version) || version < 1) return jsonResponse({ error: "Send userId and version." }, 400);
    if ((await readerPageRecords(g.token, [p.pageId])).length === 0) return jsonResponse({ error: "This page has no reader text. Run the sync command S2 first." }, 404);
    const meta = (await adminVersionsOfPage(g.token, p.pageId)).find((v) => v.userId === userId && v.version === version);
    if (!meta) throw new PbError(404, "This saved version does not exist.");
    const rows = await adminVersionRows(g.token, p.pageId, userId, version);
    await chooseVersion(g.token, g.user, p.pageId, { userId, version, runId: meta.runId, rows });
    return jsonResponse({ ok: true, rows: rows.length });
  } catch (e) {
    return htvError(e);
  }
}
