import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PbError, pbRefresh, pbUserOfToken, tokenSecondsLeft } from "./pb";
import type { SessionUser } from "./htv-types";

/*
 * Sign-in state of the human-translation-view (round 54 answer 10, Q-A 2026-10-28 l129: "A login route sets an httpOnly
 * cookie with the user token. Page scripts never see the token."). The cookie holds the PocketBase token of the user.
 * Round 54 answer 9 (l128): sign-in on the human-translation-view only. The agent-translation-monitor stays open.
 */

export const COOKIE_NAME = "htv_token";
export const SIGN_IN_PATH = "/translate/sign-in";

/** Refresh the token when less than this many seconds are left (the PocketBase token of a user lives 432000 s = 5 days). [unit default] */
const REFRESH_BELOW_SECONDS = 3 * 86400;

export interface Session {
  token: string;
  user: SessionUser;
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await pbUserOfToken(token);
  return user ? { token, user } : null;
}

/**
 * For pages: no session sends the visitor to the sign-in page, which returns to `nextPath` after sign-in.
 * If PocketBase is not reachable, the answer is `{ down: message }` and the page shows the message.
 */
export async function requireSession(nextPath: string): Promise<Session | { down: string }> {
  let s: Session | null = null;
  try {
    s = await getSession();
  } catch (e) {
    if (e instanceof PbError && e.status === 503) return { down: e.message };
    throw e;
  }
  if (!s) redirect(`${SIGN_IN_PATH}?next=${encodeURIComponent(nextPath)}`);
  return s;
}

/** True for a path inside the human-translation-view. Used to check the `next` value after sign-in. */
export function isSafeNext(next: string | null | undefined): next is string {
  return typeof next === "string" && /^\/translate(\/[A-Za-z0-9._-]+)*$/.test(next) && !next.includes("..");
}

/** Cookie options. Secure only on https (a plain http page on this Mac must keep the cookie). */
export function cookieOptions(req: Request, token: string) {
  const https = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: https,
    maxAge: Math.max(60, tokenSecondsLeft(token)),
  };
}

/** Set the token cookie. Call only in a route handler. */
export async function setTokenCookie(req: Request, token: string): Promise<void> {
  (await cookies()).set(COOKIE_NAME, token, cookieOptions(req, token));
}

export async function clearTokenCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** Token refresh (route handler only). Returns the user, or null when the token is no longer valid. */
export async function refreshSession(req: Request): Promise<{ user: SessionUser; refreshed: boolean } | null> {
  const s = await getSession();
  if (!s) return null;
  if (tokenSecondsLeft(s.token) >= REFRESH_BELOW_SECONDS) return { user: s.user, refreshed: false };
  const fresh = await pbRefresh(s.token);
  if (!fresh) return null;
  await setTokenCookie(req, fresh.token);
  return { user: fresh.user, refreshed: true };
}
