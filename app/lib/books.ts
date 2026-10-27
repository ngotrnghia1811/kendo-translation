import "server-only";
import { listDir, readJson, readJsonl } from "./json";
import { folderToPageId } from "./format";
import type { BookPage, BookRow } from "./types";

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

/**
 * Round 44 answer 13 (Q-A l142), tab Books: every book from book-slugs.json with metadata
 * and the pages that have run folders. Web articles with runs go to the group "article".
 */
export async function listBooks(): Promise<BookRow[]> {
  const slugs = await readJson<J>("pilot-sample/book-slugs.json");
  const meta = await loadMetadata();

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
    });
  }
  return rows;
}

export async function bookTitle(slug: string): Promise<string> {
  const meta = await loadMetadata();
  const m = meta.get(slug);
  return m?.title_en || m?.title_ja || "";
}
