import "server-only";
import { jsonResponse } from "./api";

/*
 * Origin check for the routes that change data or sign in (unit UXC2, round 61 answer 7, finding 4 of the Next guide review).
 * Next guide 02-guides/server-actions.md, section Security: "The request's Origin is compared to the Host (or X-Forwarded-Host). Mismatches are rejected."
 * One helper serves the four places: guard() in htv-api.ts and the routes login, logout, and theme.
 * Rules:
 *   - A request with no Origin header passes, as before (a script client such as curl or the smoke test sends none).
 *   - An Origin that does not parse as a URL (for example "null" from a sandboxed page) gets 403. Before, new URL("null") threw and logout gave 500.
 *   - The Origin host must equal x-forwarded-host (first value) when that header is present, else host. A request with an Origin and no host gets 403.
 */
export function foreignOrigin(req: Request): Response | null {
  const origin = req.headers.get("origin");
  if (origin === null) return null;
  const refuse = () => jsonResponse({ error: "Foreign origin." }, 403);
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return refuse();
  }
  const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwarded || req.headers.get("host");
  if (!originHost || !host || originHost !== host) return refuse();
  return null;
}
