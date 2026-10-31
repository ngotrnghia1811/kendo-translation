import "server-only";
import { promises as fs } from "node:fs";
import { loadV1Config } from "./config";
import { parseV1Md, v1FileName, v1PageOfFile } from "./reader-v1";
import type { ReaderV1Row } from "./reader-types";
import { isSafeSegment, resolveInside } from "./safe-path";

/*
 * Read the v1 md files on this machine (unit RT73a, round 73d answer 8: "This Mac, copy in data folder (Recommended)"; VISION-viewer 15.26.9).
 * Layout: <VIEWER_V1_DIR>/<slug>/page_NNN.md, byte copies of the files of the v1 folders. Default folder: ../data/v1-md from the app folder.
 * Every read stays inside that folder (resolveInside: no absolute path, no "..", no link that leaves the folder).
 * A missing folder, a missing file, a refused path, or a read error gives an empty list: the Viewer shows no placeholder and nothing breaks.
 */

async function dirExists(dir: string): Promise<boolean> {
  try {
    return (await fs.stat(dir)).isDirectory();
  } catch {
    return false;
  }
}

/** The v1 blocks of page n of a work, or an empty list. */
export async function v1PageRows(slug: string, n: number, pageId: string): Promise<ReaderV1Row[]> {
  if (!isSafeSegment(slug) || !Number.isInteger(n) || n < 1) return [];
  try {
    const { dir } = loadV1Config();
    if (!(await dirExists(dir))) return [];
    const file = await resolveInside(`${slug}/${v1FileName(n)}`, dir);
    return parseV1Md(await fs.readFile(file, "utf-8"), pageId);
  } catch {
    // A path that leaves the folder (PathError), a missing file, or a read error: no placeholder for this page.
    return [];
  }
}

/** Page numbers of a work that have a v1 md file, sorted. The numbers add to no count. */
export async function v1PageNumbers(slug: string): Promise<number[]> {
  if (!isSafeSegment(slug)) return [];
  try {
    const { dir } = loadV1Config();
    if (!(await dirExists(dir))) return [];
    const folder = await resolveInside(slug, dir);
    return (await fs.readdir(folder)).map(v1PageOfFile).filter((n) => n > 0).sort((a, b) => a - b);
  } catch {
    return [];
  }
}
