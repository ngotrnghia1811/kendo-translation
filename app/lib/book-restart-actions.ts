import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { jsonResponse, errorResponse } from "./api";
import { monitorOffResponse } from "./monitor";
import { loadBookFresh } from "./book-status";
import { isSafeSegment, resolveInside } from "./safe-path";
import { utcIso } from "./pst-more";
import { pstClock } from "./pst";
import { BOXES, restartBodyProblem, restartMarkText } from "./restart-rules";
import type { MonitorRow } from "./book-status-rules";

/**
 * Write side of the Restart button and the Clear mark button (unit VW77b2, round 82). New file on purpose (VW77b1 default 19: the dev server keeps old
 * module instances, so new helpers live in new files).
 *
 * 1. Restart: POST /api/monitor/books/<slug>/mark with {"action": "restart", "phase": "agent-phase-4", "prompts": {16 boxes: labels}}.
 *    lib/book-actions.ts reads the body after its first four checks and calls writeRestartMark. Checks in this order:
 *      Monitor off 404, foreign Origin 403, not JSON 415, slug not in the book set 404 (all in handleBookAction),
 *      body wrong 400 (phase, exactly 16 boxes, each label of the form v<phase>.<run>.<n> and of the phase),
 *      state 409 (no run, Not started, pilot row, a Restart waits), request.json exists 409,
 *      a label has no file in prompts/<BOX>/ or archive/<folder>/prompts/<BOX>/ 409 (names the box and the label), then write.
 *    The bytes equal store.write_mark(root, book, "restart", phase, prompts=map) at the same press time (store.py:324-358, write_json_atomic):
 *    json.dumps(mark, ensure_ascii=False, indent=1) + "\n", keys schema, book, action, phase, prompts (BOXES order), requested_utc, requested_by.
 *    The file is written as request.json.part and linked to request.json, as in VW77b1 (a link fails when request.json appeared in the meantime).
 * 2. Clear mark: POST /api/monitor/books/<slug>/clear-mark with {} or {"requested_utc": "<the press time the dialog showed>"}.
 *    Same first four checks, then: the body must be an object 400, no mark 409, a live process 409, the press time differs from the file 409.
 *    The mark moves to request.done.json with two added keys cleared_utc and cleared_by "Monitor dashboard", then request.json goes away
 *    [aki-main proposal in the brief of VW77b2, picked as unit default]. Nothing in <T2>/data/scripts reads request.done.json
 *    (grep of unit VW77b2). store.clear_mark does the same two steps with the keys handled_utc and handled_by_pid.
 */

const MARK_BY = "Monitor dashboard"; // store.py:324

function foreignOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

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

/** The first box whose label has no file in prompts/<BOX>/ or archive/<folder>/prompts/<BOX>/ of the book. Null when all 16 exist (restart.py find_label). */
async function missingFile(bookDir: string, prompts: Record<string, string>): Promise<{ box: string; label: string } | null> {
  let archives: string[] = [];
  try {
    archives = (await fs.readdir(path.join(bookDir, "archive"), { withFileTypes: true })).filter((i) => i.isDirectory() && isSafeSegment(i.name)).map((i) => i.name).sort();
  } catch {
    /* no archive folder */
  }
  for (const b of BOXES) {
    const file = `${prompts[b]}.json`;
    let found = await fileExists(path.join(bookDir, "prompts", b, file));
    for (let i = 0; !found && i < archives.length; i++) found = await fileExists(path.join(bookDir, "archive", archives[i], "prompts", b, file));
    if (!found) return { box: b, label: prompts[b] };
  }
  return null;
}

/** Restart press, after the checks of handleBookAction up to the JSON object. */
export async function writeRestartMark(found: { row: MonitorRow; root: string }, slug: string, body: Record<string, unknown>): Promise<Response> {
  const problem = restartBodyProblem(body);
  if (problem) return fail(400, problem); // 400
  const phase = body.phase as string;
  const prompts = body.prompts as Record<string, string>;
  const button = found.row.buttons.find((b) => b.id === "restart"); // 409 state
  if (!button || button.stateReason !== null) return fail(409, button?.stateReason ?? "Restart does not fit this book.");
  if (found.row.phaseId !== null && found.row.phaseId !== phase) return fail(409, `Restart must use the phase of the run (${found.row.phaseId}).`);
  const dir = await resolveInside(`book-store/${slug}`, found.root);
  const final = path.join(dir, "request.json");
  if (await fileExists(final)) return fail(409, "A mark waits already");
  const miss = await missingFile(dir, prompts); // 409 label
  if (miss) return fail(409, `Box ${miss.box} has the label ${miss.label}, but no file has it. Pick another version.`);
  const requested = utcIso(Date.now());
  const part = final + ".part";
  await fs.writeFile(part, restartMarkText(slug, phase, prompts, requested), { encoding: "utf-8", flag: "w" });
  try {
    await fs.link(part, final);
  } catch (e) {
    await fs.unlink(part).catch(() => undefined);
    if ((e as NodeJS.ErrnoException).code === "EEXIST") return fail(409, "A mark waits already");
    throw e;
  }
  await fs.unlink(part);
  const at = pstClock(Date.parse(requested) / 1000);
  const running = found.row.key === "running" || found.row.key === "running-pause";
  return jsonResponse({
    ok: true,
    action: "restart",
    phase,
    requested_utc: requested,
    message: running
      ? `Mark written: Restart requested ${at}. The process finishes the current page and its update point, then it archives the run and ends.`
      : `Mark written: Restart requested ${at}. An opencode agent runs the restart.`,
  });
}

/** POST /api/monitor/books/<slug>/clear-mark */
export async function handleClearMark(req: Request, params: Promise<{ slug: string }>): Promise<Response> {
  try {
    const off = await monitorOffResponse(); // 1
    if (off) return off;
    if (foreignOrigin(req)) return fail(403, "Foreign origin."); // 2
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) return fail(415, "Send JSON."); // 3
    const { slug } = await params; // 4
    if (typeof slug !== "string" || !isSafeSegment(slug)) return fail(404, "Not found");
    const found = await loadBookFresh(slug);
    if (!found) return fail(404, "Not found");
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail(400, "The body is not JSON.");
    }
    if (!isObject(body)) return fail(400, "The body must be a JSON object.");
    if (body.requested_utc !== undefined && typeof body.requested_utc !== "string") return fail(400, "requested_utc must be a text.");
    const button = found.row.buttons.find((b) => b.id === "clear"); // 5
    if (!button || button.stateReason !== null) return fail(409, button?.stateReason ?? "This action does not fit the book.");

    const dir = await resolveInside(`book-store/${slug}`, found.root);
    const file = path.join(dir, "request.json");
    let text: string;
    try {
      text = await fs.readFile(file, "utf-8");
    } catch {
      return fail(409, "There is no mark to clear.");
    }
    let doc: unknown = null;
    try {
      doc = JSON.parse(text);
    } catch {
      /* an unreadable mark is kept as text */
    }
    if (typeof body.requested_utc === "string" && !(isObject(doc) && doc.requested_utc === body.requested_utc)) {
      return fail(409, "The mark changed since the dialog opened. Read the row again."); // the dialog showed another mark
    }
    const cleared = utcIso(Date.now());
    const done = isObject(doc) ? { ...doc, cleared_utc: cleared, cleared_by: MARK_BY } : { unreadable_text: text.slice(0, 4000), cleared_utc: cleared, cleared_by: MARK_BY };
    const target = path.join(dir, "request.done.json");
    await fs.writeFile(target + ".part", JSON.stringify(done, null, 1) + "\n", { encoding: "utf-8", flag: "w" });
    await fs.rename(target + ".part", target); // as store.atomic_write (os.replace)
    try {
      await fs.unlink(file);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return fail(409, "The mark is gone already.");
      throw e;
    }
    return jsonResponse({ ok: true, cleared_utc: cleared, message: `Mark cleared: ${found.row.markText ?? "request.json"}. The book stays ${found.row.baseLabel}. No run starts.` });
  } catch (e) {
    return errorResponse(e);
  }
}
