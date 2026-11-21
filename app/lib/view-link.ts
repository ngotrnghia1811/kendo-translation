/*
 * Unit VW120: the view-only link. Pure rules and texts (no server code, no cookies), so a test can run them with no network.
 * Owner request (Q-A 3:105.8, 2026-11-20 23:43 PST): "Can we create a view-only link: people with link can be a reader without sign-up,
 * but all operation is only strictly view-only?" Owner picks: Q-A 3:106.5 (rows 1 to 7), Q-A 3:107.4 (Route A: key check), Q-A 3:107.5 (builder rows 1 to 12).
 * The link `https://kendotranslation.com/v/<key>` sets the cookie `htv_link`. The server sends the key to PocketBase in the header `X-Kendo-View-Key`.
 * The read rules of the reader lists accept that header (migration 1793300018). The key never goes into page HTML, client scripts, or logs.
 */

/** Cookie with the key of the link (httpOnly). Q-A 3:107.5 row 1. */
export const LINK_COOKIE = "htv_link";
/** Cookie with the Page or Scroll view of a link visitor. The browser keeps it. Q-A 3:106.5 row 4: "The theme and the view are kept only in that browser." */
export const LINK_VIEW_COOKIE = "htv_link_view";
/** Header that carries the key to PocketBase. A header, not a URL, so the request log of PocketBase does not hold the key. */
export const LINK_KEY_HEADER = "X-Kendo-View-Key";
/** Prefix of the session token of a link visitor. The token is the key with this prefix. It never leaves the server. */
export const LINK_TOKEN_PREFIX = "viewkey:";

/** The key: 43 characters of base64url (32 random bytes). Q-A 3:107.5 row 1. */
export const LINK_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const LINK_KEY_LENGTH = 43;

/** The cookie lasts at most 30 days (Q-A 3:107.5 row 2). */
export const LINK_MAX_AGE_SECONDS = 30 * 86400;
/** A cookie that lives less than this is no use. */
export const LINK_MIN_AGE_SECONDS = 60;

/** The band text (Q-A 3:107.5 row 4). The words `LINK_BAND_ACTION` are a link to /sign-up. */
export const LINK_BAND_BEFORE = "This is a view-only page. Please sign up to save your place and bookmarks: ";
export const LINK_BAND_ACTION = "Create an account";
export const LINK_BAND_TEXT = `${LINK_BAND_BEFORE}${LINK_BAND_ACTION}.`;
/** The bar of a link visitor shows this text instead of a name (Q-A 3:107.5 row 9). */
export const LINK_BAR_TEXT = "View-only link";
/** The text of a link that is off, ended, or not known (Q-A 3:107.5 row 3). */
export const LINK_DEAD_TEXT = "This link no longer works.";
/** The page of a dead link. */
export const LINK_DEAD_PATH = "/link-ended";
/** The admin page of the links. */
export const LINK_ADMIN_PATH = "/admin/links";
/** The pages of a link visitor tell search engines not to list them (Q-A 3:107.5 row 7). */
export const LINK_ROBOTS = { index: false, follow: false } as const;
export const LINK_ROBOTS_HEADER = "noindex, nofollow";

/** The most characters of the name of a link. The same limit as the list view_links. */
export const LINK_NAME_MAX = 120;

export function isLinkKey(x: unknown): x is string {
  return typeof x === "string" && LINK_KEY_PATTERN.test(x);
}

/** The path of a link, for example `/v/<key>`. */
export function linkPath(key: string): string {
  return `/v/${key}`;
}

/** The session token of a link visitor. */
export function linkToken(key: string): string {
  return LINK_TOKEN_PREFIX + key;
}

/** True when the token belongs to a link visitor. */
export function isLinkToken(token: string | undefined | null): boolean {
  return typeof token === "string" && token.startsWith(LINK_TOKEN_PREFIX);
}

/** The key of a link token, or null. */
export function linkKeyOfToken(token: string | undefined | null): string | null {
  if (!isLinkToken(token)) return null;
  const key = (token as string).slice(LINK_TOKEN_PREFIX.length);
  return isLinkKey(key) ? key : null;
}

/**
 * The headers that carry the identity of a request to PocketBase: `Authorization` for a signed-in person,
 * the key header for a link visitor. A bad link token gives no header at all, so the request is anonymous.
 */
export function authHeadersOf(token: string | undefined | null): Record<string, string> {
  if (!token) return {};
  if (isLinkToken(token)) {
    const key = linkKeyOfToken(token);
    return key ? { [LINK_KEY_HEADER]: key } : {};
  }
  return { Authorization: token };
}

export type LinkState = "on" | "off" | "ended";

/** A PocketBase date text ("2026-12-01 07:59:59.000Z") as epoch milliseconds, or null when it is empty or not a date. */
export function pbTimeMs(text: unknown): number | null {
  if (typeof text !== "string" || !text.trim()) return null;
  const ms = Date.parse(text.trim().replace(" ", "T"));
  return Number.isFinite(ms) ? ms : null;
}

/** State of a link. A link that is off is "off" first. A link past its end date is "ended". Q-A 3:106.5 row 6. */
export function linkState(link: { off: boolean; ends: string | null }, nowMs: number): LinkState {
  if (link.off) return "off";
  const end = pbTimeMs(link.ends);
  if (end !== null && end <= nowMs) return "ended";
  return "on";
}

/**
 * Life of the cookie in seconds: at most 30 days, and not past the end date. At least 60 seconds, so a link that ends in a few seconds still works for the open.
 * Q-A 3:107.5 row 2: "The cookie lasts until the link ends or is turned off, at most 30 days." (Turn off is checked by the server at every page.)
 */
export function linkCookieSeconds(ends: string | null, nowMs: number): number {
  const end = pbTimeMs(ends);
  const left = end === null ? LINK_MAX_AGE_SECONDS : Math.floor((end - nowMs) / 1000);
  return Math.max(LINK_MIN_AGE_SECONDS, Math.min(LINK_MAX_AGE_SECONDS, left));
}

/** The end date of a form field (`YYYY-MM-DD`, a PST calendar day) as the PocketBase date text of the end of that day in PST (UTC-8): next day 07:59:59 UTC. Null for empty text. */
export function linkEndOfDay(date: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const day = new Date(Date.UTC(y, mo - 1, d));
  if (day.getUTCFullYear() !== y || day.getUTCMonth() !== mo - 1 || day.getUTCDate() !== d) return null;
  const next = new Date(Date.UTC(y, mo - 1, d + 1));
  return `${next.toISOString().slice(0, 10)} 07:59:59.000Z`;
}

/** The link text that the admin copies: the origin of the site and `/v/<key>`. The origin comes from the request, else the live site. Q-A 3:106.5 row 2. */
export const LINK_DEFAULT_ORIGIN = "https://kendotranslation.com";

export function linkUrl(origin: string, key: string): string {
  return `${origin.replace(/\/+$/, "")}${linkPath(key)}`;
}
