import "server-only";
import { q } from "./pb";
import { parseV1Md } from "./reader-v1";
import type { ReaderV1Row } from "./reader-types";
import { isSafeSegment } from "./safe-path";
import { V1_COLLECTION } from "./v1-placeholder-rules";

/*
 * Read the v1 placeholder from the PocketBase collection v1_placeholders (unit VW104).
 * Owner picks of 2026-11-14: Q-A 3:44.4 "Show the placeholder on v2", Q-A 3:45.2 "A. PocketBase collection", Q-A 3:45.3 "Rules stay, defaults OK" (VISION-viewer 15.26.9).
 * The public v2 site has no v1 md files, so in PocketBase mode (VIEWER_RUN_SOURCE=pocketbase) the md text of a page comes from this collection.
 * The call uses the token of the signed-in reader, so the read rule of the collection applies: only an approved reader, a translator, or an admin gets a record.
 * One rule in one place: the text splits into JA, EN, and ZH rows with parseV1Md of lib/reader-v1.ts, as for the files (lib/reader-v1-files.ts).
 * Any failure (no token, HTTP 401 or 403, a missing collection, a network error, a bad answer) gives an empty list: the Viewer shows no placeholder and nothing breaks.
 * The page numbers add to no count and the text goes into no search column.
 */

export interface V1PbOptions {
  /** PocketBase address, without a trailing slash. */
  baseUrl: string;
  /** Token of the signed-in reader. */
  token: string;
  /** A replacement for fetch. Only the tests set it. */
  fetchFn?: typeof fetch;
}

/** Most records that one list call asks for. The same size as listAll in lib/pb.ts. */
export const V1_PER_PAGE = 500;
/** Most page numbers in one filter. A screen of pages is far below this. A longer list makes more than one call. */
export const V1_NUMBERS_PER_CALL = 100;
const MAX_PAGES = 200;

/** Every record of the list that the filter selects. The records hold only the fields in `fields`. Throws on any failure. */
async function listRecords(o: V1PbOptions, filter: string, fields: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  const doFetch = o.fetchFn ?? fetch;
  for (let page = 1; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({ perPage: String(V1_PER_PAGE), page: String(page), sort: "n", filter, fields });
    const res = await doFetch(`${o.baseUrl}/api/collections/${V1_COLLECTION}/records?${qs.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: o.token },
      cache: "no-store",
    });
    if (res.status < 200 || res.status >= 300) throw new Error(`PocketBase answered HTTP ${res.status} for ${V1_COLLECTION}.`);
    const data = (await res.json()) as { items?: unknown; totalPages?: unknown };
    if (!Array.isArray(data.items)) throw new Error(`PocketBase gave no list for ${V1_COLLECTION}.`);
    out.push(...(data.items as Record<string, unknown>[]));
    if (page >= Number(data.totalPages ?? 1)) break;
  }
  return out;
}

/**
 * Page numbers of a work that have a record, sorted. Only the field n is read.
 * One list call for a work with 500 pages or fewer. A work with 1,051 pages (kendojidai_2014) takes three calls, 500 records each.
 */
export async function v1PbNumbers(o: V1PbOptions, slug: string): Promise<number[]> {
  if (!o.token || !isSafeSegment(slug)) return [];
  try {
    const recs = await listRecords(o, `slug=${q(slug)}`, "n");
    return recs.map((r) => Number(r.n)).filter((n) => Number.isInteger(n) && n > 0).sort((a, b) => a - b);
  } catch {
    return [];
  }
}

/**
 * The v1 rows of some pages of a work. The answer has one list for each number in `nums`, in the same order, and an empty list for a page without a record.
 * One list call asks for the pages of the screen (filter: the work and the page numbers). It makes one more call for each 100 numbers.
 * `pageIds[i]` is the page ID of page `nums[i]`. The row keys use it (parseV1Md).
 */
export async function v1PbRows(o: V1PbOptions, slug: string, nums: number[], pageIds: string[]): Promise<ReaderV1Row[][]> {
  const empty = () => nums.map(() => [] as ReaderV1Row[]);
  const wanted = nums.filter((n) => Number.isInteger(n) && n >= 1);
  if (!o.token || !isSafeSegment(slug) || wanted.length === 0) return empty();
  try {
    const md = new Map<number, string>();
    for (let i = 0; i < wanted.length; i += V1_NUMBERS_PER_CALL) {
      const group = wanted.slice(i, i + V1_NUMBERS_PER_CALL);
      const recs = await listRecords(o, `slug=${q(slug)} && (${group.map((n) => `n=${n}`).join(" || ")})`, "n,md");
      for (const r of recs) md.set(Number(r.n), typeof r.md === "string" ? r.md : "");
    }
    return nums.map((n, i) => (md.has(n) ? parseV1Md(md.get(n) as string, pageIds[i]) : []));
  } catch {
    return empty();
  }
}
