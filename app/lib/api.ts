import "server-only";
import { PathError } from "./safe-path";

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Map an error to a response. A path that leaves the data folder gives 403. */
export function errorResponse(e: unknown): Response {
  if (e instanceof PathError) return jsonResponse({ error: e.message }, 403);
  return jsonResponse({ error: (e as Error).message ?? "Server error" }, 500);
}
