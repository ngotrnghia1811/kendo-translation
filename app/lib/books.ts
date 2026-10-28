import "server-only";
import { listDir, readJson, readJsonl } from "./json";
import { folderToPageId } from "./format";
import { chaptersOf, parseChapterRows } from "./chapters";
import { parseWebRows, webRowsOfChapter } from "./chain";
import { isSafeSegment, PathError } from "./safe-path";
import type { BookDetail, BookPage, BookRow, ChapterWeb } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type J = any;

const PILOT = "pilot-run";

/** Run folders of a page, newest first. A real run folder starts with the digits of its time stamp. */
export async function runFoldersOf(pageFolder: string): Promise<string[]> {
  const names = await listDir(`${PILOT}/${pageFolder}`);
  return names.filter((n) => /^\d{8}T\d{6}Z/.test(n)).sort().reverse();
}

async function loadMetadata(): Promise<Map<string, J>> {
  // items.filled.jsonl is the filled file (unit MM). Use it when it exists, else the draft.
  let rows = await readJsonl<J>("item-metadata/items.filled.jsonl");
  if (rows.length === 0) rows = await readJsonl<J>("item-metadata/items.draft.jsonl");
  const m = new Map<string, J>();
  for (const r of rows) m.set(String(r.item_id), r);
  return m;
}

/** Rows of item-metadata/magazine-chapters.jsonl (unit M1). An absent file gives an empty list. A bad line is skipped by readJsonl. */
async function loadChapters() {
  return parseChapterRows(await readJsonl<unknown>("item-metadata/magazine-chapters.jsonl"));
}

/**
 * Round 44 answer 13 (Q-A l142), tab Books: every book from book-slugs.json with metadata
 * and the pages that have run folders. Web articles with runs go to the group "article".
 */
export async function listBooks(): Promise<BookRow[]> {
  const slugs = await readJson<J>("pilot-sample/book-slugs.json");
  const meta = await loadMetadata();
  const allChapters = await loadChapters();

  // Scan pilot-run/<slug>_pNNN/ once.
  const byId = new Map<string, BookPage[]>();
  for (const name of await listDir(PILOT)) {
    const parsed = folderToPageId(name);
    if (!parsed) continue;
    const runs = await runFoldersOf(name);
    if (runs.length === 0) continue;
    const s = await readJson<J>(`${PILOT}/${name}/${runs[0]}/summary.json`);
    const q = s?.qa?.QA_3;
    const list = byId.get(parsed.slug) ?? [];
    list.push({
      pageId: `${parsed.slug}/${parsed.page}`,
      pageName: parsed.page,
      runFolder: runs[0],
      verdict: q?.verdict ?? null,
      score: q?.page_score ?? null,
    });
    byId.set(parsed.slug, list);
  }
  for (const l of byId.values()) l.sort((a, b) => a.pageId.localeCompare(b.pageId));

  const rows: BookRow[] = [];
  const seen = new Set<string>();
  for (const b of (slugs?.books ?? []) as J[]) {
    const m = meta.get(String(b.slug));
    seen.add(String(b.slug));
    rows.push({
      id: String(b.slug),
      group: b.magazine_year ? "magazine" : "book",
      titleJa: m?.title_ja ?? "",
      titleEn: m?.title_en ?? "",
      author: m?.author_ja || m?.author_en || "",
      publisher: m?.publisher ?? "",
      year: m?.publish_year ?? null,
      confidence: m?.confidence ?? "",
      pages: b.pages ?? m?.pages ?? null,
      pagesWithRuns: byId.get(String(b.slug)) ?? [],
      // Round 48 answer 9 (Q-A 2026-10-27 l55): the row itself (meta, chapters, web candidates) loads on request, see getBookDetail.
      hasMeta: !!m,
      chapterCount: b.magazine_year && allChapters.length > 0 ? chaptersOf(allChapters, String(b.slug)).length : null,
    });
  }
  // Web articles (and any other ID) that have run folders.
  for (const [id, pages] of byId) {
    if (seen.has(id)) continue;
    const m = meta.get(id);
    rows.push({
      id,
      group: "article",
      titleJa: m?.title_ja ?? "",
      titleEn: m?.title_en ?? "",
      author: m?.author_ja || m?.author_en || "",
      publisher: m?.publisher ?? "",
      year: m?.publish_year ?? null,
      confidence: m?.confidence ?? "",
      pages: m?.pages ?? null,
      pagesWithRuns: pages,
      hasMeta: !!m,
      chapterCount: null,
    });
  }
  return rows;
}

export async function bookTitle(slug: string): Promise<string> {
  const meta = await loadMetadata();
  const m = meta.get(slug);
  return m?.title_en || m?.title_ja || "";
}

/**
 * Round 48 answer 9 (Q-A 2026-10-27 l55): the Details part of one Books row, loaded on request (/api/books/<id>).
 * It holds the whole metadata row (round 47 answer 13), the month chapters of a magazine year, and the web candidates per chapter (unit M2).
 * Null when the ID is neither a book of book-slugs.json nor an article with run folders, the same rule as listBooks.
 */
export async function getBookDetail(id: string): Promise<BookDetail | null> {
  if (!isSafeSegment(id)) throw new PathError("Bad book name.");
  const slugs = await readJson<J>("pilot-sample/book-slugs.json");
  const entry = ((slugs?.books ?? []) as J[]).find((b) => String(b.slug) === id);
  let group: BookDetail["group"] | null = entry ? (entry.magazine_year ? "magazine" : "book") : null;
  if (!group) {
    for (const name of await listDir(PILOT)) {
      if (folderToPageId(name)?.slug === id && (await runFoldersOf(name)).length > 0) {
        group = "article";
        break;
      }
    }
  }
  if (!group) return null;
  const meta = (await loadMetadata()).get(id) ?? null;
  let chapters: BookDetail["chapters"] = null;
  const web: Record<string, ChapterWeb> = {};
  let webFileFound = false;
  if (group === "magazine") {
    const all = await loadChapters();
    chapters = all.length > 0 ? chaptersOf(all, id) : null;
    const webRows = parseWebRows(await readJsonl<unknown>("item-metadata/web-magazine-candidates.jsonl"));
    webFileFound = webRows.length > 0;
    for (const c of chapters ?? []) {
      const w = webRowsOfChapter(webRows, c.chapter);
      if (w.linked.length > 0 || w.other.length > 0) web[c.chapter] = w;
    }
  }
  return { id, group, meta, chapters, web, webFileFound };
}
