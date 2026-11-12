import { jsonResponse } from "@/lib/api";
import { guard, htvError, isResponse, readBody } from "@/lib/htv-api";
import { closeRun, listOpensOfBook, listOpensOfRuns, openRun } from "@/lib/pb";
import { isOpenSource, PILOT_SOURCE, type OpenSource, type ReaderOpen } from "@/lib/reader-opens-rule";
import { runExists } from "@/lib/reader-opens";
import { bookRunExists } from "@/lib/book-run-exists";
import { BOOK_RUN_SOURCE, isBookStoreName, isRunIdFolder } from "@/lib/book-run-rules";
import { isSafeSegment } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

/*
 * Admin gate for agent text (unit RT74, round 75 answer 3, qa-memory-2026-10-31.md:53: "Admin opens any run").
 * Only the admin reaches this route. A reader gets 403, a visitor without a session gets 401.
 *   GET    ?book=<slug>                  the opened runs of one book
 *   GET    ?run_ids=<id>,<id>            the opens of some run IDs, for all books (the run view of the Monitor dashboard)
 *   PUT    {source, book, run_id}        open one run (or {source, book, run_ids: [...]} for the page runs of one list run)
 *   DELETE {source, book, run_id}        close one run (or run_ids)
 * Any state of a run can open, also an unfinished run (the owner: "any run"). A run without a folder on disk cannot open.
 * Readers see a change after the next S2 run.
 * Unit VW77e: the source "book-store" opens one book run (round 78 answer 8). The book is the book store folder (never paired-dataset),
 * and the run ID is the folder form, for example 20261111T183021-0800 (Q-A 3:11.2 D1). The run folder is checked in the 3 places of the book store.
 */

const MAX_IDS = 500;

function sourceOf(v: unknown): OpenSource | null {
  if (v === undefined || v === null || v === "") return PILOT_SOURCE;
  return isOpenSource(v) ? v : null;
}

/** The run IDs of a body or a query: run_id (one) or run_ids (a list). Each one is a safe name. Null when the input is bad. */
function runIdsOf(one: unknown, many: unknown): string[] | null {
  const raw = Array.isArray(many) ? many : typeof many === "string" && many ? many.split(",") : one === undefined ? [] : [one];
  if (raw.length === 0 || raw.length > MAX_IDS) return null;
  const ids = [...new Set(raw)];
  return ids.every((x): x is string => typeof x === "string" && isSafeSegment(x)) ? ids : null;
}

export async function GET(req: Request) {
  try {
    const g = await guard(req, { mutating: false, admin: true });
    if (isResponse(g)) return g;
    const u = new URL(req.url);
    const source = sourceOf(u.searchParams.get("source"));
    if (!source) return jsonResponse({ error: "Bad source." }, 400);
    const book = u.searchParams.get("book");
    if (book) {
      if (!isSafeSegment(book)) return jsonResponse({ error: "Bad book name." }, 400);
      return jsonResponse({ opens: await listOpensOfBook(g.token, source, book) });
    }
    const ids = runIdsOf(u.searchParams.get("run_id") ?? undefined, u.searchParams.get("run_ids"));
    if (!ids) return jsonResponse({ error: "Send book, or run_id, or run_ids (up to " + MAX_IDS + ")." }, 400);
    return jsonResponse({ opens: await listOpensOfRuns(g.token, source, ids) });
  } catch (e) {
    return htvError(e);
  }
}

/** The checked input of PUT and DELETE, or a response with status 400. */
async function target(req: Request): Promise<{ source: OpenSource; book: string; runIds: string[] } | Response> {
  const b = await readBody(req);
  const source = sourceOf(b.source);
  if (!source) return jsonResponse({ error: "Bad source." }, 400);
  if (typeof b.book !== "string" || !isSafeSegment(b.book)) return jsonResponse({ error: "Bad book name." }, 400);
  const runIds = runIdsOf(b.run_id, b.run_ids);
  if (!runIds) return jsonResponse({ error: "Send run_id or run_ids (up to " + MAX_IDS + ", safe names)." }, 400);
  if (source === BOOK_RUN_SOURCE) {
    if (!isBookStoreName(b.book)) return jsonResponse({ error: "Bad book name." }, 400);
    if (!runIds.every(isRunIdFolder)) return jsonResponse({ error: "Bad run ID. A book run ID has the folder form, for example 20261111T183021-0800." }, 400);
  }
  return { source, book: b.book, runIds };
}

export async function PUT(req: Request) {
  try {
    const g = await guard(req, { mutating: true, admin: true });
    if (isResponse(g)) return g;
    const t = await target(req);
    if (t instanceof Response) return t;
    // Check every run first, so that a bad run opens nothing.
    for (const runId of t.runIds) {
      const there = t.source === PILOT_SOURCE ? await runExists(g.token, t.book, runId) : await bookRunExists(t.book, runId);
      if (!there) return jsonResponse({ error: `The run ${runId} of ${t.book} has no run folder. It cannot open.` }, 400);
    }
    let opened = 0;
    for (const runId of t.runIds) {
      const o: ReaderOpen = { source: t.source, book: t.book, runId };
      if (await openRun(g.token, g.user, o)) opened++;
    }
    return jsonResponse({ ok: true, opened, runs: t.runIds.length });
  } catch (e) {
    return htvError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const g = await guard(req, { mutating: true, admin: true });
    if (isResponse(g)) return g;
    const t = await target(req);
    if (t instanceof Response) return t;
    let closed = 0;
    for (const runId of t.runIds) {
      if (await closeRun(g.token, { source: t.source, book: t.book, runId })) closed++;
    }
    return jsonResponse({ ok: true, closed, runs: t.runIds.length });
  } catch (e) {
    return htvError(e);
  }
}
