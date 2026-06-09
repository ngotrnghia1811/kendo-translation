/**
 * Import script for kendojidai.com/kendojidai.net bilingual (and monolingual)
 * articles into the Supabase `articles` table.
 *
 * Source data (on external SSD):
 *   /Volumes/SSD2T/project_archive/mARTr/data_crawler/
 *     kendo_jidai/matched_posts.json           — 315 bilingual matches + unmatched EN/JP
 *     kendo_jidai/kendojidai_data.json         — 550 EN articles (lookup by url)
 *     kendo_jidai_jp/kendojidai_jp_data.json   — 399 JP articles (lookup by url)
 *
 * Three import modes (controlled by --only):
 *   bilingual (default) — matched pairs  → content_en + content_ja, status='draft'
 *   en-only              — unmatched EN  → content_en only,      status='pending'
 *   jp-only              — unmatched JP  → content_ja only,      status='pending'
 *
 * Deduplication:
 *   Loads existing source_url_en / source_url_ja from the DB and skips
 *   articles whose URLs already exist (unless --force).
 *
 * Usage:
 *   npx tsx scripts/import-kendojidai-bilingual.ts --dry-run --limit 5
 *   npx tsx scripts/import-kendojidai-bilingual.ts --dry-run --limit 5 --only bilingual
 *   npx tsx scripts/import-kendojidai-bilingual.ts
 *   npx tsx scripts/import-kendojidai-bilingual.ts --only en
 *   npx tsx scripts/import-kendojidai-bilingual.ts --force
 *   npx tsx scripts/import-kendojidai-bilingual.ts --backfill --dry-run
 *     (backfill: UPDATE existing rows that have null content_en or content_ja)
 */

import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MATCHED_POSTS_PATH =
  "/Volumes/SSD2T/project_archive/mARTr/data_crawler/kendo_jidai/matched_posts.json";
const EN_DATA_PATH =
  "/Volumes/SSD2T/project_archive/mARTr/data_crawler/kendo_jidai/kendojidai_data.json";
const JP_DATA_PATH =
  "/Volumes/SSD2T/project_archive/mARTr/data_crawler/kendo_jidai_jp/kendojidai_jp_data.json";
const ENV_PATH = ".env.local";
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchItem {
  en_url: string;
  jp_url: string;
  match_score: number;
  en_title: string;
  jp_title: string;
  en_slug: string;
  jp_slug: string;
  date: string;
}

interface UnmatchedItem {
  url: string;
  title: string;
  date: string;
}

interface MatchedPosts {
  match_date: string;
  min_score: number;
  stats: {
    total_matches: number;
    unmatched_en: number;
    unmatched_jp: number;
    en_articles: number;
    jp_articles: number;
  };
  matches: MatchItem[];
  unmatched_en: UnmatchedItem[];
  unmatched_jp: UnmatchedItem[];
}

interface ArticleData {
  url: string;
  title: string;
  author: string;
  published_date: string;
  categories: string[];
  tags: string[];
  content: string;
  excerpt: string;
  scraped_at: string;
  metadata: unknown;
}

interface ArticleRow {
  title: string | null;
  title_ja: string | null;
  content_en: string | null;
  content_ja: string | null;
  source_url: string | null;
  source_url_en: string | null;
  source_url_ja: string | null;
  match_score: number | null;
  translation_status: "draft" | "pending";
  segmented: boolean;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Env loading (same pattern as scripts/import-kendo-dictionary.ts)
// ---------------------------------------------------------------------------

async function loadEnv(): Promise<Record<string, string>> {
  const raw = await readFile(ENV_PATH, "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------

async function loadJson<T>(path: string): Promise<T> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as T;
}

function buildArticleLookup(
  articles: ArticleData[],
): Map<string, ArticleData> {
  const map = new Map<string, ArticleData>();
  for (const a of articles) {
    map.set(a.url, a);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Tag helpers
// ---------------------------------------------------------------------------

/**
 * Merge two tag arrays: deduplicate and lowercase.
 */
function mergeTags(tagsA: string[], tagsB: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of [...tagsA, ...tagsB]) {
    const lower = t.toLowerCase().trim();
    if (lower && !seen.has(lower)) {
      seen.add(lower);
      result.push(lower);
    }
  }
  return result;
}

function normalizeTags(tags: string[]): string[] {
  return mergeTags(tags, []);
}

// ---------------------------------------------------------------------------
// Dedup: load existing URLs from the articles table
// ---------------------------------------------------------------------------

async function loadExistingUrlSets(
  sb: SupabaseClient,
): Promise<{ enSet: Set<string>; jpSet: Set<string> }> {
  const enSet = new Set<string>();
  const jpSet = new Set<string>();

  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await sb
      .from("articles")
      .select("source_url_en, source_url_ja")
      .range(offset, offset + pageSize - 1);

    if (error)
      throw new Error(`Failed to load existing articles: ${error.message}`);
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      for (const row of data as { source_url_en: string | null; source_url_ja: string | null }[]) {
        if (row.source_url_en) enSet.add(row.source_url_en);
        if (row.source_url_ja) jpSet.add(row.source_url_ja);
      }
      offset += pageSize;
      if (data.length < pageSize) hasMore = false;
    }
  }

  return { enSet, jpSet };
}

// ---------------------------------------------------------------------------
// Build rows for each mode
// ---------------------------------------------------------------------------

interface BuildResult {
  rows: ArticleRow[];
  skipped: number;
  warnings: string[];
}

/**
 * Mode: bilingual — matched pairs.
 */
function buildBilingualRows(
  matches: MatchItem[],
  enLookup: Map<string, ArticleData>,
  jpLookup: Map<string, ArticleData>,
  limit: number | null,
  enExisting: Set<string>,
  jpExisting: Set<string>,
  force: boolean,
): BuildResult {
  const rows: ArticleRow[] = [];
  let skipped = 0;
  const warnings: string[] = [];

  const items = limit ? matches.slice(0, limit) : matches;

  for (const m of items) {
    // Dedup check
    if (!force && (enExisting.has(m.en_url) || jpExisting.has(m.jp_url))) {
      skipped++;
      continue;
    }

    const enArticle = enLookup.get(m.en_url);
    const jpArticle = jpLookup.get(m.jp_url);

    if (!enArticle) {
      warnings.push(
        `[bilingual] EN content not found for URL: ${m.en_url}`,
      );
    }
    if (!jpArticle) {
      warnings.push(
        `[bilingual] JP content not found for URL: ${m.jp_url}`,
      );
    }

    const tags = mergeTags(
      enArticle?.tags ?? [],
      jpArticle?.tags ?? [],
    );

    rows.push({
      title: m.en_title,
      title_ja: m.jp_title,
      content_en: enArticle?.content ?? null,
      content_ja: jpArticle?.content ?? null,
      source_url: m.en_url,
      source_url_en: m.en_url,
      source_url_ja: m.jp_url,
      match_score: m.match_score,
      translation_status: "draft",
      segmented: false,
      tags,
    });
  }

  return { rows, skipped, warnings };
}

/**
 * Mode: en-only — unmatched EN articles.
 */
function buildEnOnlyRows(
  unmatched: UnmatchedItem[],
  enLookup: Map<string, ArticleData>,
  limit: number | null,
  enExisting: Set<string>,
  force: boolean,
): BuildResult {
  const rows: ArticleRow[] = [];
  let skipped = 0;
  const warnings: string[] = [];

  const items = limit ? unmatched.slice(0, limit) : unmatched;

  for (const u of items) {
    if (!force && enExisting.has(u.url)) {
      skipped++;
      continue;
    }

    const article = enLookup.get(u.url);
    if (!article) {
      warnings.push(`[en-only] Content not found for URL: ${u.url}`);
    }

    rows.push({
      title: u.title,
      title_ja: null,
      content_en: article?.content ?? null,
      content_ja: null,
      source_url: u.url,
      source_url_en: u.url,
      source_url_ja: null,
      match_score: null,
      translation_status: "pending",
      segmented: false,
      tags: article ? normalizeTags(article.tags) : [],
    });
  }

  return { rows, skipped, warnings };
}

/**
 * Mode: jp-only — unmatched JP articles.
 */
function buildJpOnlyRows(
  unmatched: UnmatchedItem[],
  jpLookup: Map<string, ArticleData>,
  limit: number | null,
  jpExisting: Set<string>,
  force: boolean,
): BuildResult {
  const rows: ArticleRow[] = [];
  let skipped = 0;
  const warnings: string[] = [];

  const items = limit ? unmatched.slice(0, limit) : unmatched;

  for (const u of items) {
    if (!force && jpExisting.has(u.url)) {
      skipped++;
      continue;
    }

    const article = jpLookup.get(u.url);
    if (!article) {
      warnings.push(`[jp-only] Content not found for URL: ${u.url}`);
    }

    rows.push({
      title: u.title,           // JP title as the primary title (no EN title available)
      title_ja: u.title,
      content_en: null,
      content_ja: article?.content ?? null,
      source_url: u.url,
      source_url_en: null,
      source_url_ja: u.url,
      match_score: null,
      translation_status: "pending",
      segmented: false,
      tags: article ? normalizeTags(article.tags) : [],
    });
  }

  return { rows, skipped, warnings };
}

// ---------------------------------------------------------------------------
// Database insert
// ---------------------------------------------------------------------------

async function dbInsert(
  sb: SupabaseClient,
  rows: ArticleRow[],
  label: string,
): Promise<number> {
  if (rows.length === 0) return 0;

  let inserted = 0;
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(
      `[${label}] Inserting batch ${batchNum}/${totalBatches} (${batch.length} rows, offset ${i})...`,
    );

    const { error } = await sb.from("articles").insert(
      batch.map((r) => ({
        title: r.title,
        title_ja: r.title_ja,
        content_en: r.content_en,
        content_ja: r.content_ja,
        source_url: r.source_url,
        source_url_en: r.source_url_en,
        source_url_ja: r.source_url_ja,
        match_score: r.match_score,
        translation_status: r.translation_status,
        segmented: r.segmented,
        tags: r.tags,
      })),
    );

    if (error) {
      console.error(
        `[${label}] Batch ${batchNum}/${totalBatches} FAILED: ${error.message}`,
      );
      // Continue with next batch as specified
      continue;
    }

    inserted += batch.length;
  }

  return inserted;
}

// ---------------------------------------------------------------------------
// Backfill: UPDATE existing rows with null content_en or content_ja
// ---------------------------------------------------------------------------

async function backfillBilateral(
  sb: SupabaseClient,
  enLookup: Map<string, ArticleData>,
  jpLookup: Map<string, ArticleData>,
  dryRun: boolean,
  limit: number | null,
): Promise<void> {
  console.log("[backfill] Loading existing bilingual rows with null content...");

  // Fetch rows that have both source URLs but null content_en
  const allRows: { id: string; source_url_en: string | null; source_url_ja: string | null; content_en: string | null; content_ja: string | null }[] = [];
  let page = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb
      .from("articles")
      .select("id, source_url_en, source_url_ja, content_en, content_ja")
      .not("source_url_en", "is", null)
      .or("content_en.is.null,content_ja.is.null")
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (error) { console.error("[backfill] Load error:", error.message); break; }
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE) break;
    page++;
  }

  console.log(`[backfill] Found ${allRows.length} rows with null content_en or content_ja.`);

  const toUpdate = limit !== null ? allRows.slice(0, limit) : allRows;
  let updated = 0;
  let warnings = 0;

  for (const row of toUpdate) {
    const updates: Record<string, string | null> = {};

    if (row.content_en === null && row.source_url_en) {
      const art = enLookup.get(row.source_url_en);
      if (art?.content) {
        updates.content_en = art.content;
      } else {
        console.warn(`  ⚠ No EN content for ${row.source_url_en}`);
        warnings++;
      }
    }
    if (row.content_ja === null && row.source_url_ja) {
      const art = jpLookup.get(row.source_url_ja);
      if (art?.content) {
        updates.content_ja = art.content;
      } else {
        console.warn(`  ⚠ No JP content for ${row.source_url_ja}`);
        warnings++;
      }
    }

    if (Object.keys(updates).length === 0) continue;

    if (dryRun) {
      console.log(`  [dry-run] Would update ${row.id}: ${Object.keys(updates).join(", ")}`);
      updated++;
      continue;
    }

    const { error } = await sb.from("articles").update(updates).eq("id", row.id);
    if (error) {
      console.error(`  ✗ Update failed for ${row.id}: ${error.message}`);
    } else {
      updated++;
    }
  }

  console.log(`[backfill] Done. ${updated} rows updated${dryRun ? " (dry-run)" : ""}. ${warnings} content-not-found warnings.\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const backfill = args.includes("--backfill");

  // Parse --only
  const onlyIdx = args.indexOf("--only");
  let onlyMode: "bilingual" | "en" | "jp" | null = null;
  if (onlyIdx >= 0) {
    const mode = args[onlyIdx + 1];
    if (mode === "bilingual" || mode === "en" || mode === "jp") {
      onlyMode = mode;
    } else {
      console.error(
        "Error: --only requires one of: bilingual | en | jp",
      );
      process.exit(1);
    }
  }

  // Parse --limit N
  let limit: number | null = null;
  const limitIdx = args.indexOf("--limit");
  if (limitIdx >= 0) {
    const limitVal = args[limitIdx + 1];
    if (limitVal && /^\d+$/.test(limitVal)) {
      limit = Number(limitVal);
    } else {
      console.error("Error: --limit requires a positive integer argument.");
      process.exit(1);
    }
  }

  if (dryRun) {
    console.log("[info] DRY-RUN mode — no DB writes will be performed.\n");
  }
  if (force) {
    console.log("[info] FORCE mode — dedup check will be skipped.\n");
  }
  if (backfill) {
    console.log("[info] BACKFILL mode — will UPDATE existing rows with null content_en/content_ja.\n");
  }

  // -----------------------------------------------------------------------
  // 1. Load source data files
  // -----------------------------------------------------------------------
  console.log(`[info] Loading matched_posts.json...`);
  const matchedPosts = await loadJson<MatchedPosts>(MATCHED_POSTS_PATH);
  console.log(
    `[info] Loaded: ${matchedPosts.matches.length} matches, ` +
      `${matchedPosts.unmatched_en.length} unmatched EN, ` +
      `${matchedPosts.unmatched_jp.length} unmatched JP.`,
  );

  console.log(`[info] Loading EN article data...`);
  const enArticles = await loadJson<ArticleData[]>(EN_DATA_PATH);
  const enLookup = buildArticleLookup(enArticles);
  console.log(`[info] Loaded ${enArticles.length} EN articles.`);

  console.log(`[info] Loading JP article data...`);
  const jpArticles = await loadJson<ArticleData[]>(JP_DATA_PATH);
  const jpLookup = buildArticleLookup(jpArticles);
  console.log(`[info] Loaded ${jpArticles.length} JP articles.\n`);

  // -----------------------------------------------------------------------
  // 2. Load environment & connect to DB
  // -----------------------------------------------------------------------
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "FATAL: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local",
    );
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // -----------------------------------------------------------------------
  // 3. Load existing URLs (dedup)
  // -----------------------------------------------------------------------
  let enExisting = new Set<string>();
  let jpExisting = new Set<string>();

  if (!force) {
    console.log("[info] Loading existing article URLs from DB...");
    const sets = await loadExistingUrlSets(sb);
    enExisting = sets.enSet;
    jpExisting = sets.jpSet;
    console.log(
      `[info] Found ${enExisting.size} existing source_url_en, ` +
        `${jpExisting.size} existing source_url_ja in DB.\n`,
    );
  } else {
    console.log("[info] FORCE mode — skipping dedup check.\n");
  }

  // -----------------------------------------------------------------------
  // 4. Backfill mode — UPDATE existing rows with missing content
  // -----------------------------------------------------------------------
  if (backfill) {
    await backfillBilateral(sb, enLookup, jpLookup, dryRun, limit);
    console.log("Done.");
    return;
  }

  // -----------------------------------------------------------------------
  // 5. Determine which modes to run
  // -----------------------------------------------------------------------
  const runBilingual = !onlyMode || onlyMode === "bilingual";
  const runEnOnly = !onlyMode || onlyMode === "en";
  const runJpOnly = !onlyMode || onlyMode === "jp";

  // -----------------------------------------------------------------------
  // 5. Process each mode — build rows, print summary, optionally insert
  // -----------------------------------------------------------------------
  let totalInserted = 0;
  let totalSkipped = 0;
  let grandTotal = 0;

  // --- bilingual ---
  if (runBilingual) {
    const result = buildBilingualRows(
      matchedPosts.matches,
      enLookup,
      jpLookup,
      limit,
      enExisting,
      jpExisting,
      force,
    );

    const total = (limit ?? matchedPosts.matches.length);
    grandTotal += total;
    totalSkipped += result.skipped;

    console.log(
      `[bilingual] ${total} pairs found; ` +
        `${result.skipped} already in DB; ` +
        `${result.rows.length} to insert.`,
    );

    for (const w of result.warnings) {
      console.warn(`  ⚠ ${w}`);
    }

    if (result.rows.length > 0) {
      if (dryRun) {
        console.log(
          `[bilingual] DRY-RUN — would insert ${result.rows.length} rows.\n`,
        );
        totalInserted += result.rows.length; // count for dry-run summary
      } else {
        const inserted = await dbInsert(sb, result.rows, "bilingual");
        console.log(
          `[bilingual] Done. ${inserted} inserted, ${result.skipped} skipped.\n`,
        );
        totalInserted += inserted;
      }
    } else {
      console.log(`[bilingual] No rows to insert.\n`);
    }
  }

  // --- en-only ---
  if (runEnOnly) {
    const result = buildEnOnlyRows(
      matchedPosts.unmatched_en,
      enLookup,
      limit,
      enExisting,
      force,
    );

    const total = (limit ?? matchedPosts.unmatched_en.length);
    grandTotal += total;
    totalSkipped += result.skipped;

    console.log(
      `[en-only] ${total} articles found; ` +
        `${result.skipped} already in DB; ` +
        `${result.rows.length} to insert.`,
    );

    for (const w of result.warnings) {
      console.warn(`  ⚠ ${w}`);
    }

    if (result.rows.length > 0) {
      if (dryRun) {
        console.log(
          `[en-only] DRY-RUN — would insert ${result.rows.length} rows.\n`,
        );
        totalInserted += result.rows.length;
      } else {
        const inserted = await dbInsert(sb, result.rows, "en-only");
        console.log(
          `[en-only] Done. ${inserted} inserted, ${result.skipped} skipped.\n`,
        );
        totalInserted += inserted;
      }
    } else {
      console.log(`[en-only] No rows to insert.\n`);
    }
  }

  // --- jp-only ---
  if (runJpOnly) {
    const result = buildJpOnlyRows(
      matchedPosts.unmatched_jp,
      jpLookup,
      limit,
      jpExisting,
      force,
    );

    const total = (limit ?? matchedPosts.unmatched_jp.length);
    grandTotal += total;
    totalSkipped += result.skipped;

    console.log(
      `[jp-only] ${total} articles found; ` +
        `${result.skipped} already in DB; ` +
        `${result.rows.length} to insert.`,
    );

    for (const w of result.warnings) {
      console.warn(`  ⚠ ${w}`);
    }

    if (result.rows.length > 0) {
      if (dryRun) {
        console.log(
          `[jp-only] DRY-RUN — would insert ${result.rows.length} rows.\n`,
        );
        totalInserted += result.rows.length;
      } else {
        const inserted = await dbInsert(sb, result.rows, "jp-only");
        console.log(
          `[jp-only] Done. ${inserted} inserted, ${result.skipped} skipped.\n`,
        );
        totalInserted += inserted;
      }
    } else {
      console.log(`[jp-only] No rows to insert.\n`);
    }
  }

  // -----------------------------------------------------------------------
  // 6. Grand summary
  // -----------------------------------------------------------------------
  console.log(
    `Summary: ${totalInserted} ${dryRun ? "would be " : ""}inserted, ` +
      `${totalSkipped} skipped. ${grandTotal} total articles processed.`,
  );

  if (dryRun) {
    console.log("[dry-run] No DB writes performed.");
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(99);
});
