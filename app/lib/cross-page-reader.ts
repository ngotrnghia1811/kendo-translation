// Cross-page sentence, Reader page part (unit VW90, Q-A 3:1.6; design 9.24.11 of docs/drafts/translator-design.md in the Translator worktree).
// Owner rule (round 70 answer 18): a sentence that starts at the end of one page and ends at the start of a later page is translated once, as the FULL sentence,
// and the full English text is copied back to the earlier page. Round 71 answer 13: the full English text shows on both pages.
// Round 72 answer 16 item 2: the earlier page keeps its own JA half, shows the full English text, and has the note "The sentence continues on page 54."
// (54 = the printed page number, the folio, of the later page).
// The Translator (units TR90 and TR91) writes two files (schema cross-page-v1) in the run folder of the pages (Q-A 3:4.7 "Two file names"):
//   results/cross_page.json       role first_half, in the run folder of the EARLIER page (its last lines continue on the later page)
//   results/cross_page_from.json  role second_half, in the run folder of the LATER page (its first lines continue a sentence of the earlier page)
// A middle page can hold both files. This file turns the two files into reader data. The code is pure: no fs, no server, no server-only marker.
// Callers: app/scripts/sync-runs.mjs (the sync command S2), app/lib/pb.ts, app/lib/reader-data.ts, app/lib/reader-layout.ts.
// Plain Node loads it through the resolve hook, so it uses erasable TypeScript and `import type` only.

import type { BuiltRun } from "./htv-build";
import type { HtvRow } from "./htv-types";
import type { RowLink, RowLinks } from "./reader-types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

export const CROSS_PAGE_SCHEMA = "cross-page-v1";
/** The file of the earlier page, role first_half (Q-A 3:1.5 item 1). */
export const CROSS_PAGE_REL = "results/cross_page.json";
/** The file of the later page, role second_half (Q-A 3:4.7). A second_half inside cross_page.json is not read: no real file of the older form exists (unit default VW90). */
export const CROSS_PAGE_FROM_REL = "results/cross_page_from.json";

export type CrossRole = "first_half" | "second_half";
/** The file name that holds a role. */
export const crossRel = (role: CrossRole): string => (role === "first_half" ? CROSS_PAGE_REL : CROSS_PAGE_FROM_REL);

/** Same rule as PAGE_ID_RULE in scripts/sync-runs.mjs: the form slug/pNNN. */
const PAGE_ID_RULE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/p\d+$/;

/** What S2 uses of the file. `other` is the later page for first_half (to_page, to_folio) and the earlier page for second_half (from_page, from_folio). */
export interface CrossPageFile {
  role: CrossRole;
  tsIds: string[];
  /** The full sentence of a first_half file. Empty for second_half (the later page has its full English text already). */
  fullEn: string;
  other: RowLink;
}

export type CrossRead = { state: "none" } | { state: "skip"; reason: string } | { state: "ok"; file: CrossPageFile };

const bookOf = (pageId: string): string => pageId.slice(0, pageId.lastIndexOf("/"));

/** A folio is text or null. A number or an object is not a folio. Empty text counts as null. */
function folioOf(v: J): { ok: true; folio: string | null } | { ok: false } {
  if (v === undefined || v === null) return { ok: true, folio: null };
  if (typeof v !== "string") return { ok: false };
  const t = v.trim();
  return { ok: true, folio: t === "" ? null : t };
}

/**
 * Read the text of the file that holds the role `want` (crossRel(want)) for the page `pageId`.
 *   none  the run has no such file (text is null). An old run: nothing changes.
 *   skip  the file is damaged or does not belong to this page or to this file name. The reason is one plain sentence part. The caller prints one warning line.
 *   ok    the file passes every check below
 * Checks (unit default VW90): valid JSON object, schema cross-page-v1, role first_half or second_half and equal to `want` (Q-A 3:4.7: the file name fixes the role),
 * page_id equal to the page, ts_ids a non-empty list of text, and for first_half a non-empty full_en.
 * The partner page (to_page or from_page) must have the form slug/pNNN, the same slug as the page, and a number other than the page.
 * The folio (to_folio or from_folio) must be text or null. The code checks only the keys that the role uses. A file that fails one check is skipped as a whole.
 */
export function readCrossPage(text: string | null, pageId: string, want: CrossRole): CrossRead {
  if (text === null) return { state: "none" };
  const skip = (reason: string): CrossRead => ({ state: "skip", reason });
  let j: J;
  try {
    j = JSON.parse(text);
  } catch {
    return skip("the file is not valid JSON");
  }
  if (!j || typeof j !== "object" || Array.isArray(j)) return skip("the file is not a JSON object");
  if (j.schema !== CROSS_PAGE_SCHEMA) return skip(`the schema is ${JSON.stringify(j.schema ?? null)}, not ${CROSS_PAGE_SCHEMA}`);
  if (j.role !== "first_half" && j.role !== "second_half") return skip(`the role is ${JSON.stringify(j.role ?? null)}, not first_half or second_half`);
  if (j.role !== want) return skip(`the role is ${j.role}, but this file name needs the role ${want}`);
  if (j.page_id !== pageId) return skip(`page_id is ${JSON.stringify(j.page_id ?? null)}, not ${pageId}`);
  if (!Array.isArray(j.ts_ids) || j.ts_ids.length === 0 || !j.ts_ids.every((x: J) => typeof x === "string" && x !== "")) return skip("ts_ids is not a non-empty list of text");
  const first = want === "first_half";
  if (first && (typeof j.full_en !== "string" || j.full_en.trim() === "")) return skip("full_en is empty");
  const pageKey = first ? "to_page" : "from_page";
  const folioKey = first ? "to_folio" : "from_folio";
  const other = j[pageKey];
  if (typeof other !== "string" || !PAGE_ID_RULE.test(other)) return skip(`${pageKey} is not a page ID of the form slug/pNNN`);
  if (bookOf(other) !== bookOf(pageId)) return skip(`${pageKey} ${other} is in another book`);
  if (other === pageId) return skip(`${pageKey} is the page itself`);
  const folio = folioOf(j[folioKey]);
  if (!folio.ok) return skip(`${folioKey} is not text or null`);
  return { state: "ok", file: { role: want, tsIds: [...j.ts_ids], fullEn: first ? j.full_en : "", other: { folio: folio.folio, pageId: other } } };
}

/** True when both lists hold the same IDs (order does not matter). */
function sameIds(a: string[], b: string[]): boolean {
  const s = new Set(b);
  return a.length === b.length && s.size === b.length && a.every((x) => s.has(x));
}

export interface CrossApplied {
  /** The built run for the reader record. The same object when nothing changes. The input is never changed. */
  built: BuiltRun;
  /** The new keys by row key. Empty when nothing changes. A row that gets both keys (a page with one row only) holds both. */
  links: Map<string, RowLinks>;
  /** One line for the S2 report for each file that applied: first_half first, then second_half. Empty when nothing applies. */
  lines: string[];
  /** One sentence for a warning line of the S2 report for each file that was skipped. The caller adds the page and the run. */
  warnings: string[];
}

/** The text of the two files of a run folder, or null for a file that does not exist: `first` = cross_page.json, `from` = cross_page_from.json. */
export interface CrossTexts {
  first: string | null;
  from: string | null;
}

type One = { built: BuiltRun; links: Map<string, RowLinks>; line: string | null; warning: string | null };

/** Apply one file (the text of crossRel(want), or null) to the built run. See crossPageForReader. */
function applyOne(pageId: string, built: BuiltRun, text: string | null, want: CrossRole): One {
  const rel = crossRel(want);
  const read = readCrossPage(text, pageId, want);
  const none: One = { built, links: new Map(), line: null, warning: null };
  if (read.state === "none") return none;
  if (read.state === "skip") return { ...none, warning: `${rel} skipped: ${read.reason}.` };
  const f = read.file;
  const first = want === "first_half";
  const at = built.rows.findIndex((r) => r.part === "lines" && (first ? sameIds(r.tsIds, f.tsIds) : f.tsIds.every((id) => r.tsIds.includes(id))));
  if (at < 0) return { ...none, warning: `${rel} skipped: no row ${first ? "has exactly" : "holds"} the ts_ids ${f.tsIds.join(", ")}.` };
  const row = built.rows[at];
  const where = f.other.folio ? `page ${f.other.folio}` : "a page without a folio";
  if (first) {
    const rows: HtvRow[] = built.rows.map((r, i) => (i === at ? { ...r, ed3: f.fullEn, edMarks: [] } : r));
    return {
      built: { ...built, rows },
      links: new Map([[row.key, { continues: f.other }]]),
      line: `cross_page | ${pageId} | first_half | ${row.shortKey} | EN text replaced by the full sentence (${Array.from(f.fullEn).length} characters), ${row.edMarks.length} EN mark(s) dropped | continues on ${where} (${f.other.pageId})`,
      warning: null,
    };
  }
  return {
    built,
    links: new Map([[row.key, { continues_from: f.other }]]),
    line: `cross_page | ${pageId} | second_half | ${row.shortKey} | note only, the EN text stays | starts on ${where} (${f.other.pageId})`,
    warning: null,
  };
}

/**
 * Apply the two files of the SHOWN run to the built run of a page, for the reader record only (Q-A 3:4.7 "Two file names").
 * The snapshot of the page keeps the run as it is (page_runs is the research layer of the Human translation view /translate).
 *   results/cross_page.json (role first_half): the row whose ts_ids equal the file: ed3 becomes full_en, the EN marks of the row are dropped
 *       (their offsets point into the half text), the JA marks stay, and the row gets the key continues.
 *       The search column search_en then holds the full sentence, because it is built from the rows.
 *   results/cross_page_from.json (role second_half): the first row that holds all ts_ids of the file gets the key continues_from.
 *       The text stays: its first English item is the full sentence already.
 * The two files work alone. A middle page with both files gets both changes on its first row and its last row.
 * Unit default VW90: a page with one row only gets both keys on that row, the full sentence of cross_page.json as its English text, and both notes.
 * A file that is damaged, has the wrong role for its name, or whose ts_ids match no row gives one warning and no change. The other file still applies.
 */
export function crossPageForReader(pageId: string, built: BuiltRun, texts: CrossTexts): CrossApplied {
  const a = applyOne(pageId, built, texts.first, "first_half");
  const b = applyOne(pageId, a.built, texts.from, "second_half");
  const links = new Map(a.links);
  for (const [key, v] of b.links) links.set(key, { ...(links.get(key) ?? {}), ...v });
  const some = (list: (string | null)[]): string[] => list.filter((x): x is string => x !== null);
  return { built: b.built, links, lines: some([a.line, b.line]), warnings: some([a.warning, b.warning]) };
}

// ---------------------------------------------------------------- the note on the Reader page

/** The note under the English text of the earlier page. Owner wording (round 72 answer 16 item 2). Without a folio the note names no number. */
export const noteContinues = (l: RowLink): string => (l.folio ? `The sentence continues on page ${l.folio}.` : "The sentence continues on a later page.");

/** The note under the English text of the later page. The wording is design text 9.24.11, not an owner pick (unit default VW90). */
export const noteStarts = (l: RowLink): string => (l.folio ? `The sentence starts on page ${l.folio}.` : "The sentence starts on an earlier page.");

/**
 * The note of a row, or "" when the row has neither key. A row with both keys (a page with one row only) holds both notes, the start note first,
 * as one text with a space between them (unit default VW90).
 */
export function rowNote(r: RowLinks): string {
  return [r.continues_from ? noteStarts(r.continues_from) : "", r.continues ? noteContinues(r.continues) : ""].filter(Boolean).join(" ");
}

function linkOf(v: J): RowLink | null {
  if (!v || typeof v !== "object" || typeof v.pageId !== "string" || v.pageId === "") return null;
  return { folio: typeof v.folio === "string" && v.folio !== "" ? v.folio : null, pageId: v.pageId };
}

/** The two keys of a stored row (a raw JSON row or a typed row). A key with a wrong shape is left out. The result is {} for a row without links. */
export function rowLinks(x: J): RowLinks {
  const out: RowLinks = {};
  const c = linkOf(x?.continues);
  if (c) out.continues = c;
  const f = linkOf(x?.continues_from);
  if (f) out.continues_from = f;
  return out;
}
