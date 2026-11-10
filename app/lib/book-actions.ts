import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { jsonResponse, errorResponse } from "./api";
import { monitorOffResponse } from "./monitor";
import { loadBookFresh } from "./book-status";
import { resolveInside, isSafeSegment } from "./safe-path";
import { utcIso } from "./pst-more";
import { pstClock } from "./pst";
import type { ActionId } from "./book-status-rules";
import { writeRestartMark } from "./book-restart-actions";
import { localWriteProblem } from "./local-write";

/**
 * Write side of the Monitor dashboard buttons (unit VW77b1, round 81). Two routes use it:
 *   POST /api/monitor/books/<slug>/mark   body {"action": "run" | "resume", "phase": "agent-phase-3" | "agent-phase-4"}   writes request.json
 *   POST /api/monitor/books/<slug>/pause  body {}                                                                         writes PAUSE
 * VISION 15.24.10 names the mark route. The pause route name is a unit default of VW77b1.
 * Checks, in this order (brief of VW77b1, step V3):
 *   1. Monitor off: 404 (monitorOffResponse).        2. Foreign Origin: 403.        3. Content type not JSON: 415.
 *   4. Slug not safe or not in the book set: 404.    4b. Body wrong: 400.
 *   5. The action does not fit the book state (fresh read of status.json): 409 with the reason in words.
 *   6. request.json exists already (mark route only): 409 "A mark waits already".
 *   7. Write the file.
 * The Viewer writes only the two names request.json and PAUSE, inside book-store/<slug>/ below the data folder (VISION 15.24.9, last bullet).
 * Unit VW77b2 (round 82): a body with action "restart" goes to writeRestartMark (lib/book-restart-actions.ts) after the object check. The Clear mark
 * route (POST /api/monitor/books/<slug>/clear-mark) also lives there and writes request.done.json and removes request.json.
 */

type Phase = "agent-phase-3" | "agent-phase-4";
const MARK_BY = "Monitor dashboard"; // store.write_mark requested_by (store.py:324)

function fail(status: number, error: string): Response {
  return jsonResponse({ error }, status);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.lstat(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * The exact bytes of store.write_mark for a Run or Resume mark (store.py:350-357): json.dumps(mark, ensure_ascii=False, indent=1) + "\n",
 * keys in the order schema, book, action, phase, requested_utc, requested_by. JSON.stringify with indent 1 gives the same text for these values.
 */
export function markText(book: string, action: "run" | "resume", phase: Phase, requestedUtc: string): string {
  return JSON.stringify({ schema: "book-request-v1", book, action, phase, requested_utc: requestedUtc, requested_by: MARK_BY }, null, 1) + "\n";
}

/** One body for both routes. `kind` tells which route called. */
export async function handleBookAction(req: Request, params: Promise<{ slug: string }>, kind: "mark" | "pause"): Promise<Response> {
  try {
    const off = await monitorOffResponse(); // 1
    if (off) return off;
    const guard = localWriteProblem(req);
    if (guard) return fail(403, guard); // 2
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) return fail(415, "Send JSON."); // 3
    const { slug } = await params; // 4
    if (typeof slug !== "string" || !isSafeSegment(slug)) return fail(404, "Not found");
    const found = await loadBookFresh(slug);
    if (!found) return fail(404, "Not found");
    let body: unknown;
    try {
      body = await req.json(); // 4b
    } catch {
      return fail(400, "The body is not JSON.");
    }
    if (!isObject(body)) return fail(400, "The body must be a JSON object.");
    if (kind === "mark" && body.action === "restart") return writeRestartMark(found, slug, body);

    let id: ActionId;
    let action: "run" | "resume" | null = null;
    let phase: Phase | null = null;
    if (kind === "pause") {
      id = "pause";
    } else {
      if ((body.action !== "run" && body.action !== "resume") || (body.phase !== "agent-phase-3" && body.phase !== "agent-phase-4")) {
        return fail(400, 'The body needs action ("run", "resume", or "restart") and phase ("agent-phase-3" or "agent-phase-4").');
      }
      action = body.action;
      phase = body.phase;
      id = action === "resume" ? "resume" : phase === "agent-phase-3" ? "run" : "run4";
      // Resume continues the phase of the run. A phase that differs from status.json is a wrong press.
      if (action === "resume" && found.row.phaseId !== null && found.row.phaseId !== phase) {
        return fail(409, `Resume must use the phase of the run (${found.row.phaseId}).`);
      }
    }

    const button = found.row.buttons.find((b) => b.id === id); // 5
    if (!button || button.stateReason !== null) return fail(409, button?.stateReason ?? "This action does not fit the book.");

    const dir = await resolveInside(`book-store/${slug}`, found.root);
    if (kind === "pause") {
      await fs.mkdir(dir, { recursive: true });
      // PAUSE form [unit default VW77b1]: one JSON line, like the pilot writer lib/runs.ts setPause. store.pause_exists checks only that the file exists (store.py:204).
      const line = JSON.stringify({ who: "viewer", when_utc: utcIso(Date.now()) }) + "\n";
      try {
        await fs.writeFile(path.join(dir, "PAUSE"), line, { encoding: "utf-8", flag: "wx" });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "EEXIST") return fail(409, "Pause is already requested");
        throw e;
      }
      return jsonResponse({ ok: true, message: "Pause requested. The process finishes the current page and its update point, then it stops." });
    }

    const final = path.join(dir, "request.json");
    if (await fileExists(final)) return fail(409, "A mark waits already"); // 6
    await fs.mkdir(dir, { recursive: true }); // as store.write_mark: the book folder is made when it is missing
    const requested = utcIso(Date.now());
    const part = final + ".part";
    await fs.writeFile(part, markText(slug, action as "run" | "resume", phase as Phase, requested), { encoding: "utf-8", flag: "w" });
    // 7. Same result as store.atomic_write (os.replace of the .part file), but a link fails when request.json appeared in the meantime, so no mark is lost.
    try {
      await fs.link(part, final);
    } catch (e) {
      await fs.unlink(part).catch(() => undefined);
      if ((e as NodeJS.ErrnoException).code === "EEXIST") return fail(409, "A mark waits already");
      throw e;
    }
    await fs.unlink(part);
    const at = pstClock(Date.parse(requested) / 1000);
    const word = action === "run" ? "Run" : "Resume";
    return jsonResponse({ ok: true, action, phase, requested_utc: requested, message: `Mark written: ${word} requested ${at}. An opencode agent starts the run.` });
  } catch (e) {
    return errorResponse(e);
  }
}
