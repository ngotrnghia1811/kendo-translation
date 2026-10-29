import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Round 44 answer 13 (Q-A l142): "with the path in one configuration file".
 * The file is viewer.config.json in the app folder. The environment variable VIEWER_CONFIG
 * points to another file (the pause test uses it for a fixture folder).
 */
export interface ViewerConfig {
  /** Folder of the Translator data. Empty only when runSource is "pocketbase" (the monitor tabs then have no folder to read). */
  translatorDataDir: string;
  /**
   * Source of the human-translation-view (unit S2C, round 56): "files" (default) reads the run folders on this Mac.
   * "pocketbase" reads the snapshots that the sync command S2 uploaded into the collection page_runs. The monitor tabs always read files.
   */
  runSource: "files" | "pocketbase";
  /** Round 54 answer 10 (Q-A 2026-10-28 l129): "pocketbaseUrl in config file (Recommended)". Default http://127.0.0.1:8090. */
  pocketbaseUrl: string;
}

export const DEFAULT_POCKETBASE_URL = "http://127.0.0.1:8090";

export function configPath(): string {
  return process.env.VIEWER_CONFIG
    ? path.resolve(process.env.VIEWER_CONFIG)
    : path.join(process.cwd(), "viewer.config.json");
}

export async function loadConfig(): Promise<ViewerConfig> {
  const raw = await fs.readFile(configPath(), "utf-8");
  const cfg = JSON.parse(raw) as Partial<ViewerConfig>;
  if (cfg.runSource !== undefined && cfg.runSource !== "files" && cfg.runSource !== "pocketbase") {
    throw new Error('viewer.config.json: the key runSource must be "files" or "pocketbase".');
  }
  const runSource = cfg.runSource ?? "files";
  const hasDir = typeof cfg.translatorDataDir === "string" && cfg.translatorDataDir !== "";
  if (!hasDir && runSource === "files") {
    throw new Error("viewer.config.json needs the key translatorDataDir.");
  }
  const pb = typeof cfg.pocketbaseUrl === "string" && cfg.pocketbaseUrl.trim() ? cfg.pocketbaseUrl.trim() : DEFAULT_POCKETBASE_URL;
  return { translatorDataDir: hasDir ? path.resolve(cfg.translatorDataDir as string) : "", runSource, pocketbaseUrl: pb.replace(/\/+$/, "") };
}

export async function dataRoot(): Promise<string> {
  const dir = (await loadConfig()).translatorDataDir;
  if (!dir) throw new Error("viewer.config.json has no translatorDataDir. The agent-translation-monitor needs it.");
  return dir;
}
