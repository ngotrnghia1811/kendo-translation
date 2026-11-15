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
/** Sign-in and sign-up pages of the reader pages (unit RC1, round 63 answer 4). */
export const READER_SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";

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
export async function requireSession(nextPath: string, signInPath: string = SIGN_IN_PATH): Promise<Session | { down: string }> {
  let s: Session | null = null;
  try {
    s = await getSession();
  } catch (e) {
    if (e instanceof PbError && e.status === 503) return { down: e.message };
    throw e;
  }
  if (!s) redirect(`${signInPath}?next=${encodeURIComponent(nextPath)}`);
  return s;
}

/**
 * For the pages of the human-translation-view: a reader goes to /read (round 63 answer 4: "/translate sends reader to /read").
 * A reader has no data there, because page_runs is closed to readers (migration 1793300009).
 */
export async function requireStaff(nextPath: string): Promise<Session | { down: string }> {
  const s = await requireSession(nextPath);
  if ("down" in s) return s;
  if (s.user.role === "reader") redirect("/read");
  return s;
}

/** For the pages of /read: the sign-in page of the reader pages. */
export async function requireReaderSession(nextPath: string): Promise<Session | { down: string }> {
  return requireSession(nextPath, READER_SIGN_IN_PATH);
}

/** For the pages of /admin: only the admin role. Another signed-in role goes to /read. */
export async function requireAdmin(nextPath: string): Promise<Session | { down: string }> {
  const s = await requireSession(nextPath, READER_SIGN_IN_PATH);
  if ("down" in s) return s;
  if (s.user.role !== "admin") redirect("/read");
  return s;
}

/** True for a path inside the human-translation-view, the reader pages, the admin pages, or the profile page. Used to check the `next` value after sign-in. Unit VW105 adds /profile. */
export function isSafeNext(next: string | null | undefined): next is string {
  return typeof next === "string" && /^\/(translate|read|admin|profile)(\/[A-Za-z0-9._-]+)*$/.test(next) && !next.includes("..");
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
