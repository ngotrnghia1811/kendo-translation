import "server-only";
import { cookies } from "next/headers";
import { LINK_COOKIE, LINK_MAX_AGE_SECONDS, LINK_MIN_AGE_SECONDS, isLinkKey } from "./view-link";

/*
 * Unit VW120 (Q-A 3:107.5 rows 1 and 2): the cookie `htv_link` of a view-only link. The value is the key of the link.
 * The cookie is httpOnly, so page scripts never read the key. This file holds only the cookie work, so lib/htv-session.ts can import it with no import cycle.
 */

/** The key in the cookie, or null when there is no cookie or the value does not have the form of a key. A forged value counts as no cookie. */
export async function linkKeyOfCookie(): Promise<string | null> {
  const v = (await cookies()).get(LINK_COOKIE)?.value;
  return isLinkKey(v) ? v : null;
}

/** True when the browser holds a cookie of a link (the link can still be off or ended). */
export async function hasLinkCookie(): Promise<boolean> {
  return (await linkKeyOfCookie()) !== null;
}

/** Cookie options. Secure only on https (a plain http page on this Mac must keep the cookie). The life stays between 60 s and 30 days. */
export function linkCookieOptions(req: Request, seconds: number) {
  const https = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: https,
    maxAge: Math.max(LINK_MIN_AGE_SECONDS, Math.min(LINK_MAX_AGE_SECONDS, Math.floor(seconds))),
  };
}

/** Set the cookie of a link (route handler only). */
export async function setLinkCookie(req: Request, key: string, seconds: number): Promise<void> {
  (await cookies()).set(LINK_COOKIE, key, linkCookieOptions(req, seconds));
}

/** Clear the cookie of a link (route handler only). A sign-in and a dead link call it. */
export async function clearLinkCookie(): Promise<void> {
  (await cookies()).delete(LINK_COOKIE);
}
