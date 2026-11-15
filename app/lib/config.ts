import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Round 44 answer 13 (Q-A l142): "with the path in one configuration file".
 * The file is viewer.config.json in the app folder. The environment variable VIEWER_CONFIG
 * points to another file (the pause test uses it for a fixture folder).
 *
 * Round 58 answer 7 (Q-A 2026-10-28 l205): "Env settings for Vercel (Recommended), Hide monitor on deploy (Recommended)".
 * Three environment variables override the file keys, so Vercel holds the settings and no deploy file is needed:
 *   VIEWER_RUN_SOURCE       "files" or "pocketbase"      over the key runSource
 *   VIEWER_POCKETBASE_URL   address of PocketBase        over the key pocketbaseUrl
 *   VIEWER_MONITOR          on, off, true, false, 1, 0   over the key monitor
 * An empty variable counts as not set.
 */
export interface ViewerConfig {
  /** Folder of the Translator data. Empty only when runSource is "pocketbase" (the monitor tabs then have no folder to read). */
  translatorDataDir: string;
  /** Run settings only. Default: config beside translatorDataDir (VISION 15.24.9). */
  translatorConfigDir: string;
  /**
   * Source of the human-translation-view (unit S2C, round 56): "files" (default) reads the run folders on this Mac.
   * "pocketbase" reads the snapshots that the sync command S2 uploaded into the collection page_runs. The monitor tabs always read files.
   */
  runSource: "files" | "pocketbase";
  /** Round 54 answer 10 (Q-A 2026-10-28 l129): "pocketbaseUrl in config file (Recommended)". Default http://127.0.0.1:8090. */
  pocketbaseUrl: string;
  /**
   * Round 58 answer 7 (Q-A 2026-10-28 l205): "A monitor setting turns the monitor pages and routes into 'not found' and hides the tabs".
   * Default true. The deployed app sets it to false.
   */
  monitor: boolean;
}

export const DEFAULT_POCKETBASE_URL = "http://127.0.0.1:8090";

/** Hosts that may use plain http. Same rule as pb_users.py and sync-runs.mjs. `URL.hostname` writes IPv6 in brackets. */
const LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]"];

export function configPath(): string {
  return process.env.VIEWER_CONFIG
    ? path.resolve(process.env.VIEWER_CONFIG)
    : path.join(process.cwd(), "viewer.config.json");
}

/** Value of an environment variable, trimmed. Undefined when the variable is missing or empty. */
function envValue(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

function parseRunSource(value: unknown, where: string): "files" | "pocketbase" {
  if (value !== "files" && value !== "pocketbase") throw new Error(`${where} must be "files" or "pocketbase".`);
  return value;
}

function parseMonitorEnv(value: string): boolean {
  const v = value.toLowerCase();
  if (v === "on" || v === "true" || v === "1") return true;
  if (v === "off" || v === "false" || v === "0") return false;
  throw new Error("The environment variable VIEWER_MONITOR must be on, off, true, false, 1, or 0.");
}

/**
 * Round 58 answer 7 (Q-A 2026-10-28 l205), safety rule of the unit: the sign-in sends passwords to PocketBase.
 * Plain http works for 127.0.0.1, localhost, and [::1] only. Every other host needs https.
 */
function checkPocketbaseUrl(value: string, where: string): string {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error(`${where} must be an address that starts with http:// or https:// and names a host.`);
  }
  if ((u.protocol !== "http:" && u.protocol !== "https:") || !u.hostname) {
    throw new Error(`${where} must be an address that starts with http:// or https:// and names a host.`);
  }
  if (u.protocol === "http:" && !LOCAL_HOSTS.includes(u.hostname)) {
    throw new Error(`${where} uses plain http for ${u.hostname}. Plain http works for 127.0.0.1, localhost, and [::1] only. Use https://.`);
  }
  return value.replace(/\/+$/, "");
}

/** Read the config file. Return null when the file does not exist. Other read errors pass through as before. */
async function readConfigFile(file: string): Promise<Partial<ViewerConfig> | null> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf-8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
  return JSON.parse(raw) as Partial<ViewerConfig>;
}

export async function loadConfig(): Promise<ViewerConfig> {
  const file = configPath();
  const envSource = envValue("VIEWER_RUN_SOURCE");
  const fromFile = await readConfigFile(file);
  // Round 58 answer 7: without a file, the environment alone makes the config. VIEWER_RUN_SOURCE is the sign that it is set.
  if (fromFile === null && envSource === undefined) {
    throw new Error(`The config file ${file} does not exist. Create it, or set the environment variable VIEWER_RUN_SOURCE (and VIEWER_POCKETBASE_URL).`);
  }
  const cfg = fromFile ?? {};
  const runSource =
    envSource !== undefined
      ? parseRunSource(envSource, "The environment variable VIEWER_RUN_SOURCE")
      : cfg.runSource !== undefined
        ? parseRunSource(cfg.runSource, "viewer.config.json: the key runSource")
        : "files";
  const hasDir = typeof cfg.translatorDataDir === "string" && cfg.translatorDataDir !== "";
  if (!hasDir && runSource === "files") {
    throw new Error("viewer.config.json needs the key translatorDataDir.");
  }
  const envPb = envValue("VIEWER_POCKETBASE_URL");
  const filePb = typeof cfg.pocketbaseUrl === "string" && cfg.pocketbaseUrl.trim() ? cfg.pocketbaseUrl.trim() : undefined;
  const pocketbaseUrl =
    envPb !== undefined
      ? checkPocketbaseUrl(envPb, "The environment variable VIEWER_POCKETBASE_URL")
      : filePb !== undefined
        ? checkPocketbaseUrl(filePb, "viewer.config.json: the key pocketbaseUrl")
        : DEFAULT_POCKETBASE_URL;
  const envMonitor = envValue("VIEWER_MONITOR");
  if (envMonitor === undefined && cfg.monitor !== undefined && typeof cfg.monitor !== "boolean") {
    throw new Error("viewer.config.json: the key monitor must be true or false.");
  }
  const monitor = envMonitor !== undefined ? parseMonitorEnv(envMonitor) : (cfg.monitor ?? true);
  // The folder is a setting of the owner at run time. The comment tells the build not to trace the whole project for this path.
  const translatorDataDir = hasDir ? path.resolve(/* turbopackIgnore: true */ cfg.translatorDataDir as string) : "";
  if (cfg.translatorConfigDir !== undefined && (typeof cfg.translatorConfigDir !== "string" || !cfg.translatorConfigDir.trim())) {
    throw new Error("viewer.config.json: the key translatorConfigDir must name a folder.");
  }
  const translatorConfigDir = cfg.translatorConfigDir
    ? path.resolve(/* turbopackIgnore: true */ cfg.translatorConfigDir)
    : translatorDataDir ? path.join(path.dirname(translatorDataDir), "config") : "";
  return { translatorDataDir, translatorConfigDir, runSource, pocketbaseUrl, monitor };
}

export async function dataRoot(): Promise<string> {
  const dir = (await loadConfig()).translatorDataDir;
  if (!dir) throw new Error("viewer.config.json has no translatorDataDir. The agent-translation-monitor needs it.");
  return dir;
}

/**
 * Page images of the reader pages (unit RC2, round 65 answer 6: "Signed short link (Recommended)").
 * Four environment variables set them. An empty variable counts as not set.
 *   VIEWER_PAGE_IMAGE_SOURCE  "files" (default, the images sit on this Mac) or "signed" (deploy: a signed short link to PocketBase)
 *   VIEWER_PAGE_IMAGE_DIR     files mode: folder of the images, one subfolder for each book. Default ../data/page-images from the app folder.
 *   VIEWER_PAGE_IMAGE_URL     signed mode: base address, for example https://pb-v2.kendotranslation.com/page-images
 *   VIEWER_PAGE_IMAGE_KEY     signed mode: the signing key (a secret, at least 32 characters, for example from `openssl rand -hex 32`)
 * The PocketBase hook (data/scripts/pocketbase/pb_hooks/page_images.pb.js) holds the same key in its variable PAGE_IMAGE_KEY.
 * No message of this file shows the value of the key.
 */
export interface PageImageConfig {
  source: "files" | "signed";
  /** Absolute folder (files mode). Empty in signed mode. */
  dir: string;
  /** Base address without a trailing slash (signed mode). Empty in files mode. */
  url: string;
  /** Signing key (signed mode). Empty in files mode. Never put it in a message or a log. */
  key: string;
}

export const DEFAULT_PAGE_IMAGE_DIR = "../data/page-images";
const MIN_PAGE_IMAGE_KEY = 32;

export function loadPageImageConfig(): PageImageConfig {
  const source = envValue("VIEWER_PAGE_IMAGE_SOURCE") ?? "files";
  if (source !== "files" && source !== "signed") throw new Error('The environment variable VIEWER_PAGE_IMAGE_SOURCE must be "files" or "signed".');
  if (source === "files") {
    const dir = path.resolve(/* turbopackIgnore: true */ process.cwd(), envValue("VIEWER_PAGE_IMAGE_DIR") ?? DEFAULT_PAGE_IMAGE_DIR);
    return { source, dir, url: "", key: "" };
  }
  const rawUrl = envValue("VIEWER_PAGE_IMAGE_URL");
  if (rawUrl === undefined) throw new Error("Signed page images need the environment variable VIEWER_PAGE_IMAGE_URL. It is not set.");
  const url = checkPocketbaseUrl(rawUrl, "The environment variable VIEWER_PAGE_IMAGE_URL");
  const key = envValue("VIEWER_PAGE_IMAGE_KEY");
  if (key === undefined) throw new Error("Signed page images need the environment variable VIEWER_PAGE_IMAGE_KEY. It is not set.");
  if (key.length < MIN_PAGE_IMAGE_KEY) throw new Error(`The environment variable VIEWER_PAGE_IMAGE_KEY must have at least ${MIN_PAGE_IMAGE_KEY} characters.`);
  return { source, dir: "", url, key };
}

/**
 * The app key for public sign-ups (unit VW102, Q-A 3:33.3 "Count per reader, with an app key (VW102)").
 *   VIEWER_SIGN_UP_KEY  a secret, at least 32 characters, for example from `openssl rand -hex 32`. No default value.
 * The route /api/read/sign-up sends it to PocketBase in the header X-Kendo-Sign-Up-Key. The PocketBase hook
 * data/scripts/pocketbase/pb_hooks/sign_up_key.pb.js refuses a public sign-up without the same value in its variable SIGN_UP_KEY.
 * An empty variable counts as not set. Not set: the app sends no key (the local PocketBase on port 8090 loads no hook, so it needs none).
 * A key that is too short throws a plain error. No message of this file shows the value of the key.
 */
export const MIN_SIGN_UP_KEY = 32;

export function loadSignUpKey(): string | undefined {
  const key = envValue("VIEWER_SIGN_UP_KEY");
  if (key !== undefined && key.length < MIN_SIGN_UP_KEY) {
    throw new Error(`The environment variable VIEWER_SIGN_UP_KEY must have at least ${MIN_SIGN_UP_KEY} characters.`);
  }
  return key;
}

/**
 * The v1 md files (unit RT73a, round 73d answer 8: "This Mac, copy in data folder (Recommended)"; VISION-viewer 15.26.9).
 * They hold the v1 placeholder: JA, EN, and ZH lines of the browser Gemini agent of v1, for display testing only.
 *   VIEWER_V1_DIR  folder of the md files, one subfolder for each work: <dir>/<slug>/page_NNN.md. Default ../data/v1-md from the app folder.
 * The hosted site has no such folder. In PocketBase mode (VIEWER_RUN_SOURCE=pocketbase) the app reads the collection v1_placeholders instead and never this folder
 * (unit VW104, Q-A 3:44.4 and 3:45.2). Sync command S2 uploads this folder into the collection (option --v1-dir, same default). A missing folder is not an error: the Viewer shows no placeholder.
 * An empty variable counts as not set.
 */
export const DEFAULT_V1_DIR = "../data/v1-md";

export function loadV1Config(): { dir: string } {
  return { dir: path.resolve(/* turbopackIgnore: true */ process.cwd(), envValue("VIEWER_V1_DIR") ?? DEFAULT_V1_DIR) };
}
