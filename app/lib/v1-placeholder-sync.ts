// S2 side of the v1 placeholder: read the md files of v1 and build one record for each page (unit VW104).
// Owner picks of 2026-11-14: Q-A 3:44.4 "Show the placeholder on v2", Q-A 3:45.2 "A. PocketBase collection", Q-A 3:45.3 "Rules stay, defaults OK".
// No server-only marker, so S2 (plain Node) and a test script can load it. It reads files. It never writes a file and never calls PocketBase.
// The v1 text goes into no search column, no count, and not into the column translated of catalog_items: this file imports none of that code.
import { createHash } from "node:crypto";
import { promises as fs, type Dirent } from "node:fs";
import path from "node:path";
import { v1FileName, v1PageOfFile } from "./reader-v1";
import { V1_MD_MAX_CHARS, v1PageIdOf, type V1Record } from "./v1-placeholder-rules";

/** Same rule as isSafeSegment in lib/safe-path.ts and SEGMENT_RULE in scripts/sync-runs.mjs. */
const SEGMENT_RULE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const PAGE_FILE_LIKE = /^page_\d+\.md$/;
/** How many files one work reads at the same time. */
const READ_AT_ONCE = 16;

export interface V1Load {
  /** False when the folder does not exist or cannot be read. */
  dirFound: boolean;
  /** One record for each page file that S2 can use, sorted by work and page number. */
  records: V1Record[];
  /** Plain texts, one for each file or folder that S2 skipped because it is damaged. S2 prints each one as "Warning: ...". */
  warnings: string[];
  /** Number of works (folders) that have at least one record. */
  works: number;
  /** Sum of the sizes of the files of the records, in bytes. */
  bytes: number;
  /** Number of entries that are no work folder and no page file (for example the file SHA256SUMS). They are skipped without a warning. */
  ignored: number;
}

/** Run fn for every item, `size` at the same time. */
async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

/**
 * Read <dir>/<slug>/page_NNN.md of every work folder. The folder name is the slug (the app reads the same folders: lib/reader-v1-files.ts).
 * Skipped without a warning: a file that is no folder in <dir> (SHA256SUMS), a link, and a file in a work folder whose name is no page_<digits>.md.
 * Skipped with one warning: a page file name that is not the exact form (page_051.md, page_1000.md), and a page file that cannot be read,
 * is not valid UTF-8, holds a NUL byte, or has more characters than the field md holds (V1_MD_MAX_CHARS).
 * The page ID uses 4 digits for a work whose highest page number is over 999 (the digits of reader_pages, v1PageIdOf).
 */
export async function loadV1Records(dir: string): Promise<V1Load> {
  const out: V1Load = { dirFound: false, records: [], warnings: [], works: 0, bytes: 0, ignored: 0 };
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  out.dirFound = true;
  const strict = new TextDecoder("utf-8", { fatal: true });
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    if (!entry.isDirectory()) {
      out.ignored++;
      continue;
    }
    const slug = entry.name;
    if (!SEGMENT_RULE.test(slug)) {
      out.warnings.push(`the folder ${JSON.stringify(slug)} is not a safe work name. The folder is skipped.`);
      continue;
    }
    let names: string[];
    try {
      names = (await fs.readdir(path.join(dir, slug))).sort();
    } catch {
      out.warnings.push(`the folder ${slug} cannot be read. The folder is skipped.`);
      continue;
    }
    const pages: { name: string; n: number }[] = [];
    for (const name of names) {
      if (!PAGE_FILE_LIKE.test(name)) {
        out.ignored++;
        continue;
      }
      const n = v1PageOfFile(name);
      if (n < 1 || v1FileName(n) !== name) {
        out.warnings.push(`${slug}/${name} is not a page file name (page_051.md, page_1000.md over 999). The file is skipped.`);
        continue;
      }
      pages.push({ name, n });
    }
    const lastPage = pages.reduce((m, p) => Math.max(m, p.n), 0);
    const made: V1Record[] = [];
    const size = new Map<number, number>();
    await pool(pages, READ_AT_ONCE, async ({ name, n }) => {
      const where = `${slug}/${name}`;
      let buf: Buffer;
      try {
        buf = await fs.readFile(path.join(dir, slug, name));
      } catch (e) {
        out.warnings.push(`${where} cannot be read (${(e as NodeJS.ErrnoException)?.code ?? "read error"}). The file is skipped.`);
        return;
      }
      let md: string;
      try {
        md = strict.decode(buf);
      } catch {
        out.warnings.push(`${where} is not valid UTF-8. The file is skipped.`);
        return;
      }
      if (md.includes("\0")) {
        out.warnings.push(`${where} holds a NUL byte. The file is skipped.`);
        return;
      }
      if (md.length > V1_MD_MAX_CHARS) {
        out.warnings.push(`${where} has ${md.length} characters. The field md holds ${V1_MD_MAX_CHARS} at most. The file is skipped.`);
        return;
      }
      made.push({ slug, n, page_id: v1PageIdOf(slug, n, lastPage), md, sha256: createHash("sha256").update(buf).digest("hex") });
      size.set(n, buf.length);
    });
    if (made.length === 0) continue;
    made.sort((a, b) => a.n - b.n);
    out.records.push(...made);
    out.works++;
    for (const v of size.values()) out.bytes += v;
  }
  out.warnings.sort();
  return out;
}
