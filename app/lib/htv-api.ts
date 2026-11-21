import "server-only";
import { errorResponse, jsonResponse } from "./api";
import { getSession, type Session } from "./htv-session";
import { foreignOrigin } from "./htv-origin";
import { PbError } from "./pb";
import { refusalText } from "./view-as";
import { getLinkSession } from "./view-link-server";
import { LINK_DEAD_TEXT } from "./view-link";
import { isSafeSegment, PathError } from "./safe-path";

/* Helpers for the routes /api/htv/*. */

/** A page ID "slug/pNNN" split and checked with the same rules as the page view. */
export function parsePageId(pageId: unknown): { slug: string; page: string; pageId: string } {
  if (typeof pageId !== "string") throw new PathError("Bad page name.");
  const m = /^([^/]+)\/(p\d+)$/.exec(pageId);
  if (!m || !isSafeSegment(m[1])) throw new PathError("Bad page name.");
  return { slug: m[1], page: m[2], pageId };
}

/**
 * Guard for a route. A request that changes data must come from the same origin and carry JSON (same rule as /api/pause).
 * Returns the session, or a response with status 401 (not signed in) or 403 (role).
 */
export async function guard(req: Request, opts: { mutating: boolean; write?: boolean; admin?: boolean; staff?: boolean; allowInView?: boolean; allowLink?: boolean }): Promise<Session | Response> {
  if (opts.mutating) {
    const foreign = foreignOrigin(req);
    if (foreign) return foreign;
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) return jsonResponse({ error: "Send JSON." }, 415);
  }
  const s = await getSession();
  if (!s) {
    // Unit VW120 (Q-A 3:106.5 row 4, Q-A 3:107.5 row 5): a visitor of a view-only link may read, never change. `allowLink` works for a request that does not
    // change data (mutating false) and only on the GET routes that the reader pages need. A real session above always wins. Every other route answers 401 here.
    if (opts.allowLink && !opts.mutating && !opts.admin && !opts.staff && !opts.write) {
      const l = await getLinkSession();
      if (l === "dead") return jsonResponse({ error: LINK_DEAD_TEXT }, 401);
      if (l) return l;
    }
    return jsonResponse({ error: "Sign in first." }, 401);
  }
  // Unit VW119 (Q-A 3:103.5 row 6): in a view nothing can change data. A request that changes data answers 403 with the plain line, before any other role check.
  // A route that must still work in a view (the token refresh, reading progress that it skips by itself) passes `allowInView`. The routes view, login, logout,
  // and issues do not use this check for the refusal: the view route and the issue route (row 7) are exceptions by design.
  if (s.view && opts.mutating && !opts.allowInView) return jsonResponse({ error: refusalText(s.view) }, 403);
  if (opts.admin && s.user.role !== "admin") return jsonResponse({ error: "Only the admin can do this." }, 403);
  // Unit RC1 (round 63 answer 4): the data of the human-translation-view is for translators and admins. Readers use /read.
  if (opts.staff && s.user.role === "reader") return jsonResponse({ error: "This view is for translators and admins. Use the reader pages at /read." }, 403);
  // Unit VW119 (Q-A 3:103.5 rows 6 and 7): the write check looks at the real role. A request that changes data is refused above in a view, and the route
  // of the visual issues (not mutating, write: true) must work in the reader view, because the icon stays there.
  if (opts.write && s.realRole === "reader") return jsonResponse({ error: "Your account can read only." }, 403);
  return s;
}

export function isResponse(x: unknown): x is Response {
  return x instanceof Response;
}

/** Map an error to a response. PocketBase failures keep their status when it is a client error. */
export function htvError(e: unknown): Response {
  if (e instanceof PbError) {
    const status = e.status === 401 ? 401 : e.status === 403 ? 403 : e.status === 404 ? 404 : e.status === 503 ? 503 : e.status === 400 ? 400 : 502;
    return jsonResponse({ error: e.message }, status);
  }
  return errorResponse(e);
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Guard for the routes /api/read/* that return page text or save a place (unit RC1, round 63 answer 4).
 * Same checks as guard(), and a reader who waits for approval gets 403 with the plain line of the screen.
 * The PocketBase rules block such a reader as well, so this is a clear answer and not the only lock.
 */
export async function guardReader(req: Request, opts: { mutating: boolean; allowInView?: boolean; allowLink?: boolean }): Promise<Session | Response> {
  const g = await guard(req, { mutating: opts.mutating, allowInView: opts.allowInView, allowLink: opts.allowLink });
  if (isResponse(g)) return g;
  if (!g.user.approved) return jsonResponse({ error: "Your account waits for approval by an admin." }, 403);
  return g;
}
