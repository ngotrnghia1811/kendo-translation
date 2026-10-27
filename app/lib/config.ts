import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Round 44 answer 13 (Q-A l142): "with the path in one configuration file".
 * The file is viewer.config.json in the app folder. The environment variable VIEWER_CONFIG
 * points to another file (the pause test uses it for a fixture folder).
 */
export interface ViewerConfig {
  translatorDataDir: string;
}

export function configPath(): string {
  return process.env.VIEWER_CONFIG
    ? path.resolve(process.env.VIEWER_CONFIG)
    : path.join(process.cwd(), "viewer.config.json");
}

export async function loadConfig(): Promise<ViewerConfig> {
  const raw = await fs.readFile(configPath(), "utf-8");
  const cfg = JSON.parse(raw) as Partial<ViewerConfig>;
  if (!cfg.translatorDataDir || typeof cfg.translatorDataDir !== "string") {
    throw new Error("viewer.config.json needs the key translatorDataDir.");
  }
  return { translatorDataDir: path.resolve(cfg.translatorDataDir) };
}

export async function dataRoot(): Promise<string> {
  return (await loadConfig()).translatorDataDir;
}
