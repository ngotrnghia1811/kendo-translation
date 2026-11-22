import "server-only";
import { jsonResponse, errorResponse } from "./api";
import { monitorOffResponse } from "./monitor";
import { localWriteProblem } from "./local-write";
import { loadBookFresh } from "./book-status";
import { readBookSettings, saveBookSettings } from "./book-settings";
import { isSafeBookName } from "./book-settings-rules";
import { SettingsWriteError } from "./settings-run";
import { object } from "./settings-schema";
import { parseSettingsJson, stringifySettingsJson } from "./settings-json";

// Unit VW122 (plan P61, card P61.2, Q-A 3:112.3 rows 1 to 3, 6 and 11). One body for the two methods of /api/monitor/books/<slug>/settings.
//   GET  the reading of the book file, the global side and the merge view (the form and the dialogs read it). It writes nothing.
//   PUT  body {"sha1": <sha1 of the book file that the form read, or null>, "settings": <nested keys that the file must hold>}  saves the book file and one history line.
// Checks, in this order (the order of the other Monitor routes):
//   1. Monitor switch off: 404 "Not found".   2. PUT only: foreign Origin or no loopback Host: 403.   3. PUT only: content type not JSON: 415.
//   4. Name not safe, or the book is not in the Monitor list (loadBookFresh): 404.   5. PUT only: body wrong: 400.   6. The save (400, 409, 503 as in lib/book-settings.ts).
const settingsResponse = (value: unknown) => new Response(stringifySettingsJson(value), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export async function handleBookSettings(req: Request, params: Promise<{ slug: string }>, kind: "get" | "put"): Promise<Response> {
  try {
    const off = await monitorOffResponse(); // 1
    if (off) return off;
    if (kind === "put") {
      const guard = localWriteProblem(req); // 2
      if (guard) return jsonResponse({ error: guard }, 403);
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") ?? "")) return jsonResponse({ error: "Send JSON." }, 415); // 3
    }
    const { slug } = await params; // 4
    if (!isSafeBookName(slug)) return jsonResponse({ error: "Not found" }, 404);
    if (!(await loadBookFresh(slug))) return jsonResponse({ error: "Not found" }, 404);
    if (kind === "get") return settingsResponse(await readBookSettings(slug));
    let body: unknown;
    try { body = parseSettingsJson(await req.text()); } catch { return jsonResponse({ error: "The body is not JSON." }, 400); } // 5
    if (!object(body) || !(body.sha1 === null || (typeof body.sha1 === "string" && /^[a-f0-9]{40}$/.test(body.sha1))) || !Object.hasOwn(body, "settings") || Object.keys(body).some((k) => !["sha1", "settings"].includes(k))) {
      return jsonResponse({ error: "Body needs sha1 and settings only." }, 400);
    }
    return settingsResponse(await saveBookSettings(slug, body.settings, body.sha1 as string | null)); // 6
  } catch (e) {
    if (e instanceof SettingsWriteError) return jsonResponse({ error: e.message, saved: e.saved }, e.status);
    if (e instanceof Error && e.message.startsWith("config/book-settings/")) return jsonResponse({ error: e.message }, 400);
    return errorResponse(e);
  }
}
