import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_THEME, EMPTY_SETTINGS, isTheme, sanitizeSettings, type PaneSettings, type ThemeName } from "./htv-settings";
import { userSettings } from "./pb";

/*
 * Theme of the whole app (unit UXC step C). Round 58 answer 6 (Q-A 2026-10-28 l204): "Whole app, per account (Recommended)".
 * The cookie "theme" holds the choice. The root layout reads it and writes data-theme on <html>, so the first paint has no jump.
 * A signed-in user also keeps the choice in the account (collection user_settings). The sign-in route copies it into the cookie.
 * The monitor has no sign-in and keeps the choice in the cookie only.
 */
export const THEME_COOKIE = "theme";
const ONE_YEAR = 365 * 24 * 3600;

export async function readTheme(): Promise<ThemeName> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(v) ? v : DEFAULT_THEME;
}

/** Set the theme cookie. Call only in a route handler. */
export async function writeTheme(req: Request, theme: ThemeName): Promise<void> {
  const https = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  (await cookies()).set(THEME_COOKIE, theme, { httpOnly: true, sameSite: "lax", path: "/", secure: https, maxAge: ONE_YEAR });
}

/** The pane settings of a user from the account (collection user_settings). A missing record or collection gives the empty settings. */
export async function loadPaneSettings(token: string, userId: string): Promise<PaneSettings> {
  try {
    return sanitizeSettings((await userSettings(token, userId)).panes);
  } catch {
    return EMPTY_SETTINGS;
  }
}
