import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { dataRoot } from "./config";

/** Thrown when a requested path leaves the Translator data folder. */
export class PathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathError";
  }
}

/**
 * Round 44 answer 13 (Q-A l142): "Server-side file reads only inside that folder: reject paths that leave it."
 * Resolve a path that is relative to the data folder. Reject absolute paths, NUL bytes,
 * "../" escapes, and symbolic links that point outside the folder.
 */
export async function resolveInside(rel: string, root?: string): Promise<string> {
  const base = root ?? (await dataRoot());
  if (typeof rel !== "string" || rel.length === 0) throw new PathError("Empty path.");
  if (rel.includes("\0")) throw new PathError("Path holds a NUL byte.");
  if (path.isAbsolute(rel)) throw new PathError("Absolute paths are not allowed.");
  const full = path.resolve(base, rel);
  if (full !== base && !full.startsWith(base + path.sep)) {
    throw new PathError("Path leaves the data folder: " + rel);
  }
  // Symbolic link check: the real path of the deepest existing parent must stay inside the folder.
  const realBase = await fs.realpath(base);
  let probe = full;
  for (;;) {
    try {
      const real = await fs.realpath(probe);
      if (real !== realBase && !real.startsWith(realBase + path.sep)) {
        throw new PathError("Link leaves the data folder: " + rel);
      }
      break;
    } catch (e) {
      if (e instanceof PathError) throw e;
      const parent = path.dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
  }
  return full;
}

/** A progress.json folder looks like "data/pilot-run/x". The data folder is "data", so drop the prefix. */
export function stripDataPrefix(p: string): string {
  return p.replace(/^\/+/, "").replace(/^data\//, "");
}

/** A single path segment such as a list stamp or a run folder name. */
export function isSafeSegment(s: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s) && !s.includes("..");
}

/** Fixed settings names only. Refuse links, directories, and hard-linked files. */
export async function settingsFile(root: string, name: string): Promise<string> {
  if (!["translator-settings.json", "translator-settings.history.jsonl"].includes(name)) throw new PathError("Not a settings file.");
  if (!root) throw new PathError("No Translator configuration folder.");
  const base = await fs.realpath(root);
  const full = path.join(base, name);
  try {
    const st = await fs.lstat(full);
    if (!st.isFile() || st.nlink !== 1) throw new PathError("The settings file must be a regular file without links.");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  return full;
}
