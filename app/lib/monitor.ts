import "server-only";
import { notFound, redirect } from "next/navigation";
import { loadConfig } from "./config";
import { jsonResponse } from "./api";
import { getSession, READER_SIGN_IN_PATH } from "./htv-session";
import { PbError } from "./pb";

/**
 * Round 58 answer 7 (Q-A 2026-10-28 l205): "A monitor setting turns the monitor pages and routes into 'not found' and hides the tabs.
 * Benefit: no empty public monitor and no Mac path in errors."
 * The setting is the key monitor in viewer.config.json or the environment variable VIEWER_MONITOR (see lib/config.ts).
 */
export async function monitorEnabled(): Promise<boolean> {
  return (await loadConfig()).monitor;
}

/** Monitor page: show the 404 page when the monitor is off. Call it first, before any data read. */
export async function requireMonitor(): Promise<void> {
  if (!(await monitorEnabled())) notFound();
}

/**
 * Front door "/" (unit RC4, round 70). Round 68 answer 4: "/ opens the dashboard (Recommended)". Round 69 answer 11: "Reading right (Recommended)".
 * Round 58 unit default (before): with the monitor off, "/" sent every visitor to /translate.
 * Now, with the monitor off, "/" sends the person by the sign-in state and the role (VISION-viewer 15.23.7):
 *   no session            /sign-in (the page holds the link "Create an account")
 *   reader                /read (the Reader dashboard, also a reader who waits for approval)
 *   translator or admin   /translate
 * With the monitor on (the Mac), "/" keeps the runs table of the Monitor dashboard and this function returns at once.
 * If PocketBase is not reachable, the function returns the message and the page shows it.
 */
export async function frontDoor(): Promise<{ down: string } | void> {
  if (await monitorEnabled()) return;
  let target: string;
  try {
    const s = await getSession();
    target = !s ? READER_SIGN_IN_PATH : s.user.role === "reader" ? "/read" : "/translate";
  } catch (e) {
    if (e instanceof PbError && e.status === 503) return { down: e.message };
    throw e;
  }
  redirect(target);
}

/** Monitor API route: return the 404 answer when the monitor is off, else null. Call it first, before any file read. */
export async function monitorOffResponse(): Promise<Response | null> {
  return (await monitorEnabled()) ? null : jsonResponse({ error: "Not found" }, 404);
}
