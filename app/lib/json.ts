import "server-only";
import { promises as fs } from "node:fs";
import { resolveInside } from "./safe-path";

/** Read and parse a JSON file inside the data folder. Return null when the file is missing or broken. */
export async function readJson<T = unknown>(rel: string): Promise<T | null> {
  try {
    const full = await resolveInside(rel);
    return JSON.parse(await fs.readFile(full, "utf-8")) as T;
  } catch (e) {
    if ((e as Error).name === "PathError") throw e;
    return null;
  }
}

export async function readText(rel: string): Promise<string | null> {
  try {
    const full = await resolveInside(rel);
    return await fs.readFile(full, "utf-8");
  } catch (e) {
    if ((e as Error).name === "PathError") throw e;
    return null;
  }
}

export async function readJsonl<T = unknown>(rel: string): Promise<T[]> {
  const t = await readText(rel);
  if (!t) return [];
  const out: T[] = [];
  for (const line of t.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      /* skip broken line */
    }
  }
  return out;
}

export async function listDir(rel: string): Promise<string[]> {
  try {
    const full = await resolveInside(rel);
    return await fs.readdir(full);
  } catch (e) {
    if ((e as Error).name === "PathError") throw e;
    return [];
  }
}

export async function exists(rel: string): Promise<boolean> {
  try {
    await fs.access(await resolveInside(rel));
    return true;
  } catch (e) {
    if ((e as Error).name === "PathError") throw e;
    return false;
  }
}
