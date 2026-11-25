import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { BOX_TYPES, PAIRED_BOOK, buildBoxMap, isBookSlug, parseScoreFile, type AuditMark, type BookChoice, type BoxMap, type ModelValue, type VersionInput } from "./vector-map-rules";

// Unit VW106: read the stored prompt versions of one box type and build its vector map.
// Q-A 3:63.2 "Read-only map first" and Q-A 3:64.5 row 4: read only, no model call, no change of the run.
// Files: <data>/book-store/paired-dataset/prompts/<box>/v*.json (prompt versions)
//        <data>/book-store/paired-dataset/point-scores/<box>/<version>.json (model scores of point_scores.py, Q-A 3:65.6)
// Unit default: the map is built on the server per request and kept in memory by file path, size, and mtime.
// Unit VW130 (Q-A 3:133.2 rows 1 to 4): the same files of any book below <data>/book-store/<book>/. The book is the folder name, and the default is paired-dataset.
// The prompts of phase 3 sit in <book>/agent-phase-3/prompts. The map does not read them. The score files appear while point_scores.py runs, so a missing file is normal.

/** The folder of a book below book-store. A name that is not a safe folder name throws, so no address can leave book-store. */
function bookDir(dataRoot: string, book: string): string {
  if (!isBookSlug(book)) throw new Error("Bad book folder name.");
  return path.join(dataRoot, "book-store", book);
}

export const promptsDir = (dataRoot: string, box: string, book: string = PAIRED_BOOK) => path.join(bookDir(dataRoot, book), "prompts", box);
export const scoresDir = (dataRoot: string, box: string, book: string = PAIRED_BOOK) => path.join(bookDir(dataRoot, book), "point-scores", box);

const cache = new Map<string, { key: string; map: BoxMap }>();

async function listVersionFiles(dir: string): Promise<string[]> {
  try {
    return (await fs.readdir(dir)).filter((f) => /^v[\w.-]+\.json$/.test(f)).sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function statKey(file: string): Promise<string> {
  try {
    const s = await fs.stat(file);
    return `${s.size}:${s.mtimeMs}`;
  } catch {
    return "-";
  }
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function toInput(raw: Record<string, unknown>, file: string): VersionInput {
  const parent = raw.parent as { version?: unknown } | null | undefined;
  const audit = raw.audit as { marks?: unknown } | null | undefined;
  const marks: AuditMark[] = Array.isArray(audit?.marks)
    ? (audit.marks as Record<string, unknown>[]).map((m) => ({ group_id: str(m?.group_id) ?? "", mark: str(m?.mark) ?? "", covering_quote: str(m?.covering_quote) ?? "" }))
    : [];
  return {
    version: str(raw.version) ?? path.basename(file, ".json"),
    parent: str(parent?.version),
    sha1: str(raw.sha1) ?? "",
    text: str(raw.text) ?? "",
    created_utc: str(raw.created_utc),
    update_point: str(raw.update_point),
    group_ids: strList(raw.group_ids),
    critique_ids: strList(raw.critique_ids),
    marks,
  };
}

/** The vector map of one box type. A box without a folder gives a map without versions. */
export async function loadBoxMap(dataRoot: string, box: string, book: string = PAIRED_BOOK): Promise<BoxMap> {
  const dir = promptsDir(dataRoot, box, book);
  const sdir = scoresDir(dataRoot, box, book);
  const files = await listVersionFiles(dir);
  const keys = await Promise.all(files.flatMap((f) => [statKey(path.join(dir, f)), statKey(path.join(sdir, f))]));
  const key = files.map((f, i) => `${f}=${keys[2 * i]}/${keys[2 * i + 1]}`).join("|");
  const hit = cache.get(dir);
  if (hit && hit.key === key) return hit.map;
  const inputs: VersionInput[] = [];
  for (const f of files) {
    const file = path.join(dir, f);
    // A file that the run writes at this moment can be half written. Skip it. The next request reads it again.
    try {
      inputs.push(toInput(JSON.parse(await fs.readFile(file, "utf-8")) as Record<string, unknown>, file));
    } catch {
      continue;
    }
  }
  // Unit VW130 [unit default]: the first version of a phase 4 box has a parent in the phase 3 folder (<book>/agent-phase-3/prompts), which this map does not read.
  // In a book, one version whose parent is not among the read versions is the start of the map, so the parent chain is not "broken" (no false note).
  // Two or more such versions still break the chain. The paired dataset keeps the old rule.
  if (book !== PAIRED_BOOK) {
    const known = new Set(inputs.map((i) => i.version));
    const dangling = inputs.filter((i) => i.parent !== null && !known.has(i.parent));
    if (dangling.length === 1 && !inputs.some((i) => i.parent === null)) dangling[0].parent = null;
  }
  const scores = new Map<string, Map<string, ModelValue>>();
  for (const i of inputs) {
    try {
      const s = parseScoreFile(JSON.parse(await fs.readFile(path.join(sdir, `${i.version}.json`), "utf-8")), i.sha1);
      if (s) scores.set(i.version, s);
    } catch {
      // No score file: the screen shows "Not measured".
    }
  }
  const map = buildBoxMap(box, inputs, (v) => scores.get(v) ?? null);
  cache.set(dir, { key, map });
  return map;
}

/** The number of version files of each box type, for the box picker. */
export async function versionCounts(dataRoot: string, boxes: readonly string[], book: string = PAIRED_BOOK): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const b of boxes) out[b] = (await listVersionFiles(promptsDir(dataRoot, b, book))).length;
  return out;
}

/** True when the book has at least one stored prompt version (a file prompts/<box>/v*.json). A name that is not a safe folder name gives false. Unit VW130. */
export async function bookHasPromptVersions(dataRoot: string, book: string): Promise<boolean> {
  if (!isBookSlug(book)) return false;
  for (const box of BOX_TYPES) if ((await listVersionFiles(promptsDir(dataRoot, box, book))).length > 0) return true;
  return false;
}

/**
 * The books of the select: each folder below book-store that has stored prompt versions, without the paired dataset (it is the default choice).
 * A folder with no prompts folder, or one with no version file, is left out. Sorted by folder name. Unit VW130.
 */
export async function listPromptBooks(dataRoot: string): Promise<BookChoice[]> {
  let names: string[];
  try {
    names = (await fs.readdir(path.join(dataRoot, "book-store"), { withFileTypes: true })).filter((e) => e.isDirectory() && isBookSlug(e.name) && e.name !== PAIRED_BOOK).map((e) => e.name);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const out: BookChoice[] = [];
  for (const slug of names.sort()) {
    const counts = await versionCounts(dataRoot, BOX_TYPES, slug);
    const versions = Object.values(counts).reduce((a, n) => a + n, 0);
    if (versions > 0) out.push({ slug, versions });
  }
  return out;
}
