import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { dataRoot } from "./config";
import { resolveInside } from "./safe-path";
import {
  kindOfFile,
  pageFolderRel,
  sortEntries,
  MAX_FOLDER_ENTRIES,
  MAX_VIEW_BYTES,
  PHASE2_PAGES,
  PHASE2_SUMMARY,
  PHASE2_TRENDS,
  type FolderEntry,
  type JsonViewKind,
} from "./json-view";

// JSON viewer (unit VW89, round 90): the server reads for the page /json. Accepted design Q-A 3:1.7 and 3:1.8.
// Every path goes through resolveInside, so a read stays inside the Translator data folder (round 44 answer 13).
// Read only: no function of this file writes a file.

/** One phase 2 report file or folder for the top of the folder list (Q-A 3:1.7 item 4). */
export interface ReportItem {
  label: string;
  path: string;
  folder: boolean;
}

export type JsonView =
  | { view: "folder"; path: string; entries: FolderEntry[]; total: number; reports: ReportItem[] | null }
  | { view: "file"; path: string; kind: JsonViewKind; bytes: number; text: string }
  | { view: "big"; path: string; bytes: number }
  | { view: "type"; path: string }
  | { view: "missing"; path: string }
  | { view: "refused"; path: string; cause: string };

async function folderEntries(rel: string, full: string): Promise<{ entries: FolderEntry[]; total: number }> {
  const dirents = await fs.readdir(full, { withFileTypes: true });
  const all: FolderEntry[] = [];
  for (const d of dirents) {
    const p = rel ? `${rel}/${d.name}` : d.name;
    let folder = d.isDirectory();
    let bytes: number | null = null;
    if (d.isFile() || d.isSymbolicLink()) {
      try {
        const st = await fs.stat(path.join(full, d.name));
        folder = st.isDirectory();
        bytes = folder ? null : st.size;
      } catch {
        bytes = null;
      }
    }
    all.push({ name: d.name, path: p, folder, bytes, kind: folder ? null : kindOfFile(d.name) });
  }
  const sorted = sortEntries(all);
  return { entries: sorted.slice(0, MAX_FOLDER_ENTRIES), total: sorted.length };
}

/**
 * Q-A 3:1.7 item 4: the phase 2 report files of the store book-store/paired-dataset when they exist:
 * report/summary.json, the folder trends/, and the file critiques/reference.json of each page run folder.
 * The page pointers pages/<page>.json name the page run folders (field folder, translator_run.py:3040, phase2_report.py:53-55).
 */
export async function phase2Reports(): Promise<ReportItem[]> {
  const out: ReportItem[] = [];
  const isFile = async (rel: string) => fs.stat(await resolveInside(rel)).then((s) => s.isFile(), () => false);
  const isDir = async (rel: string) => fs.stat(await resolveInside(rel)).then((s) => s.isDirectory(), () => false);
  if (await isFile(PHASE2_SUMMARY)) out.push({ label: "Phase 2 report", path: PHASE2_SUMMARY, folder: false });
  if (await isDir(PHASE2_TRENDS)) out.push({ label: "Phase 2 trends", path: PHASE2_TRENDS, folder: true });
  if (await isDir(PHASE2_PAGES)) {
    const root = await dataRoot();
    const names = (await fs.readdir(await resolveInside(PHASE2_PAGES))).filter((n) => n.endsWith(".json")).sort();
    for (const name of names) {
      let ptr: { page_id?: unknown; folder?: unknown } | null = null;
      try {
        ptr = JSON.parse(await fs.readFile(await resolveInside(`${PHASE2_PAGES}/${name}`), "utf-8"));
      } catch {
        ptr = null;
      }
      const folder = pageFolderRel(ptr?.folder, root);
      if (!folder) continue;
      const rel = `${folder}/critiques/reference.json`;
      try {
        if (await isFile(rel)) out.push({ label: `Reference critiques of ${typeof ptr?.page_id === "string" ? ptr.page_id : name.replace(/\.json$/, "")}`, path: rel, folder: false });
      } catch {
        // A pointer that leaves the data folder is skipped.
      }
    }
  }
  return out;
}

/** Load what the page /json shows for a path relative to the Translator data folder. An empty path is the data folder itself. */
export async function loadJsonView(rel: string | undefined): Promise<JsonView> {
  // An absolute path stays as it is, so resolveInside refuses it.
  const p = (rel ?? "").trim().replace(/(.)\/+$/, "$1");
  let full: string;
  try {
    full = p ? await resolveInside(p) : await dataRoot();
  } catch (e) {
    if ((e as Error).name === "PathError") return { view: "refused", path: p, cause: (e as Error).message };
    throw e;
  }
  let st;
  try {
    st = await fs.stat(full);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT" || (e as NodeJS.ErrnoException).code === "ENOTDIR") return { view: "missing", path: p };
    throw e;
  }
  if (st.isDirectory()) {
    const { entries, total } = await folderEntries(p, full);
    return { view: "folder", path: p, entries, total, reports: p ? null : await phase2Reports() };
  }
  const kind = kindOfFile(p);
  if (!st.isFile() || !kind) return { view: "type", path: p };
  if (st.size > MAX_VIEW_BYTES) return { view: "big", path: p, bytes: st.size };
  return { view: "file", path: p, kind, bytes: st.size, text: await fs.readFile(full, "utf-8") };
}
