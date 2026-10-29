import "server-only";
import { notFound, redirect } from "next/navigation";
import { loadConfig } from "./config";
import { jsonResponse } from "./api";

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
 * Round 58 unit default: the first page "/" sends the visitor to the human-translation-view when the monitor is off.
 * A 404 as first screen of the deployed app is a bad start.
 */
export async function requireMonitorOrTranslate(): Promise<void> {
  if (!(await monitorEnabled())) redirect("/translate");
}

/** Monitor API route: return the 404 answer when the monitor is off, else null. Call it first, before any file read. */
export async function monitorOffResponse(): Promise<Response | null> {
  return (await monitorEnabled()) ? null : jsonResponse({ error: "Not found" }, 404);
}
