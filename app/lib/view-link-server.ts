import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, READER_SIGN_IN_PATH, type Session } from "./htv-session";
import type { SessionUser } from "./htv-types";
import { PbError } from "./pb";
import { checkLinkKey } from "./view-link-pb";
import { linkKeyOfCookie } from "./view-link-cookie";
import { LINK_BAR_TEXT, LINK_DEAD_PATH, LINK_DEFAULT_ORIGIN, linkToken } from "./view-link";

/*
 * Unit VW120 (Q-A 3:106.5 rows 3 and 4, Q-A 3:107.5 rows 3 and 5): the session of a link visitor.
 * A link visitor is an approved reader with no account: no id, no e-mail, and a token that is only the key with a prefix (lib/view-link.ts).
 * `getSession()` in lib/htv-session.ts does NOT know a link visitor, so every route that calls guard() answers 401 (no write is possible).
 * Only the pages of /read, /search, and /dictionary and the GET routes with `allowLink` accept a link visitor: the four routes of the reader pages (page, month, ToC, page image),
 * the two search routes (unit VW124), and the dictionary route (unit VW126, /api/read/dictionary). The list of these route files is checked in scripts/vw120-test.mjs.
 * A real session always wins over a link cookie (row 5): a person who is signed in and opens a link stays that person.
 */

export interface LinkSession extends Session {
  link: true;
}

/** The user of a link visitor: an approved reader with the bar text instead of a name. */
export const LINK_USER: SessionUser = { id: "", email: "", name: LINK_BAR_TEXT, role: "reader", approved: true };

/**
 * The link session of the cookie: a session when the link is on and not ended, "dead" when it is off, ended, or not known, null when there is no cookie.
 * One check of PocketBase for each request (React cache). A PocketBase fault throws a PbError with status 503, as getSession() does.
 */
export const getLinkSession = cache(async (): Promise<LinkSession | "dead" | null> => {
  const key = await linkKeyOfCookie();
  if (!key) return null;
  const state = await checkLinkKey(key);
  if (state === "down") throw new PbError(503, "The sign-in server is not reachable. Start PocketBase and try again.");
  if (state === "dead") return "dead";
  return { token: linkToken(key), user: LINK_USER, realRole: "reader", view: null, link: true };
});

/** True for the session of a link visitor. */
export function isLinkSession(s: Session | null | undefined): s is LinkSession {
  return !!s && (s as LinkSession).link === true;
}

/**
 * For the pages of /read: a signed-in person is that person. Else a live link is a link visitor. A dead link goes to the page "This link no longer works."
 * Else the sign-in page, as requireReaderSession does. If PocketBase is not reachable, the answer is `{ down: message }`.
 */
export async function requireReaderOrLink(nextPath: string): Promise<Session | { down: string }> {
  let found: Session | "dead" | null;
  try {
    found = (await getSession()) ?? (await getLinkSession());
  } catch (e) {
    if (e instanceof PbError && e.status === 503) return { down: e.message };
    throw e;
  }
  if (found === "dead") redirect(LINK_DEAD_PATH);
  if (found) return found;
  return redirect(`${READER_SIGN_IN_PATH}?next=${encodeURIComponent(nextPath)}`);
}

/**
 * For the layout: is this request a link visitor with a live link? False for a signed-in person, for no cookie, for a dead link, and on any fault
 * (a fault of PocketBase hides the band and breaks nothing). No cookie costs no call.
 */
export async function linkInfo(): Promise<{ link: boolean }> {
  try {
    if (!(await linkKeyOfCookie())) return { link: false };
    if (await getSession()) return { link: false };
    const l = await getLinkSession();
    return { link: l !== null && l !== "dead" };
  } catch {
    return { link: false };
  }
}

/**
 * The origin of this site for the link text on /admin/links (Q-A 3:107.5 row 8): the host of the request, with https except on this Mac.
 * A host with an odd form gives the live site. [unit default VW120]
 */
export async function linkOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host || !/^[A-Za-z0-9.-]+(:\d{1,5})?$/.test(host)) return LINK_DEFAULT_ORIGIN;
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  const proto = h.get("x-forwarded-proto") === "http" ? "http" : h.get("x-forwarded-proto") === "https" ? "https" : local ? "http" : "https";
  return `${proto}://${host}`;
}
