import { monitorOffResponse } from "@/lib/monitor";
import { jsonResponse, errorResponse } from "@/lib/api";
import { localWriteProblem } from "@/lib/local-write";
import { readSettings, saveSettings, settingsHistoryText, SettingsWriteError } from "@/lib/settings-run";
import { object } from "@/lib/settings-schema";
import { parseSettingsJson, stringifySettingsJson } from "@/lib/settings-json";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const settingsResponse = (value: unknown) => new Response(stringifySettingsJson(value), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export async function GET(req: Request) {
  try {
    const off = await monitorOffResponse(); if (off) return off;
    if (new URL(req.url).searchParams.get("history") === "1") return new Response(await settingsHistoryText(), { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="translator-settings.history.jsonl"' } });
    return settingsResponse(await readSettings());
  } catch (e) { return errorResponse(e); }
}
export async function PUT(req: Request) {
  try {
    const off = await monitorOffResponse(); if (off) return off;
    const guard = localWriteProblem(req); if (guard) return jsonResponse({ error: guard }, 403);
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") ?? "")) return jsonResponse({ error: "Send JSON." }, 415);
    let body: unknown;
    try { body = parseSettingsJson(await req.text()); } catch { return jsonResponse({ error: "The body is not JSON." }, 400); }
    if (!object(body) || !(body.sha1 === null || (typeof body.sha1 === "string" && /^[a-f0-9]{40}$/.test(body.sha1))) || !Object.hasOwn(body, "settings") || Object.keys(body).some((k) => !["sha1", "settings"].includes(k))) return jsonResponse({ error: "Body needs sha1 and settings only." }, 400);
    return settingsResponse(await saveSettings(body.settings, body.sha1));
  } catch (e) {
    if (e instanceof SettingsWriteError) return jsonResponse({ error: e.message, saved: e.saved }, e.status);
    if (e instanceof Error && e.message.startsWith("translator-settings")) return jsonResponse({ error: e.message }, 400);
    return errorResponse(e);
  }
}
