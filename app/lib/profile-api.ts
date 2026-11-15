import "server-only";
import { jsonResponse } from "./api";
import { loadConfig } from "./config";
import { htvError } from "./htv-api";
import { ProfileError, type PbCtx } from "./profile-pb";

/* Helpers of the routes /api/profile/* (unit VW105). One place for the PocketBase address and the error answers. */

/** The PocketBase address and the token of the signed-in person, for the calls of lib/profile-pb.ts. */
export async function profileCtx(token: string): Promise<PbCtx> {
  return { baseUrl: (await loadConfig()).pocketbaseUrl, token };
}

/** The answer for an error. A ProfileError has a plain message and a status. Another error goes to the shared mapper of the routes (no body, no password). */
export function profileErrorResponse(e: unknown): Response {
  if (e instanceof ProfileError) {
    const status = e.status === 401 ? 401 : e.status === 503 ? 503 : e.status === 400 ? 400 : 502;
    return jsonResponse({ error: e.message }, status);
  }
  return htvError(e);
}
