import "server-only";
import { errorResponse, jsonResponse } from "./api";
import { getSession, type Session } from "./htv-session";
import { foreignOrigin } from "./htv-origin";
import { PbError } from "./pb";
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
export async function guard(req: Request, opts: { mutating: boolean; write?: boolean; admin?: boolean }): Promise<Session | Response> {
  if (opts.mutating) {
    const foreign = foreignOrigin(req);
    if (foreign) return foreign;
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) return jsonResponse({ error: "Send JSON." }, 415);
  }
  const s = await getSession();
  if (!s) return jsonResponse({ error: "Sign in first." }, 401);
  if (opts.admin && s.user.role !== "admin") return jsonResponse({ error: "Only the admin can do this." }, 403);
  if (opts.write && s.user.role === "reader") return jsonResponse({ error: "Your account can read only." }, 403);
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
