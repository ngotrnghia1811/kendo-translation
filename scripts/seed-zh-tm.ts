/**
 * Seed script: populate translation_memory with JA→ZH pairs from the segments
 * table so that ZH MAC-RAG compose retrieval works.
 *
 * The segments table has 198,582 ZH segments (target_lang='zh', status='draft')
 * from a bulk import, but there are zero JA→ZH rows in translation_memory.
 * This script reads those segments and inserts matching TM rows.
 *
 * Behaviour:
 *   1. Load .env.local (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 *   2. Page through segments (source_lang='ja', target_lang='zh',
 *      non-null/non-empty source_text + target_text) in batches of 1000.
 *   3. For each batch, check which source_text values already exist in
 *      translation_memory WHERE target_lang='zh' — skip those.
 *   4. INSERT new rows in batches of 500.
 *
 * TM row shape:
 *   source_text  = seg.source_text
 *   target_text  = seg.target_text
 *   source_lang  = 'ja'
 *   target_lang  = 'zh'
 *   domain       = 'kendo'
 *   quality      = '50'       -- machine-translated baseline
 *   human_approved = false
 *   origin       = 'zh_import'
 *   approach     = 'machine_translation_baseline'
 *   article_id   = seg.article_id
 *   created_by   = null       -- seeder has no user context
 *
 * Usage:
 *   npx tsx scripts/seed-zh-tm.ts --dry-run
 *   npx tsx scripts/seed-zh-tm.ts
 *   npx tsx scripts/seed-zh-tm.ts --limit 5000
 */

import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENV_PATH = ".env.local";
const SEGMENT_PAGE_SIZE = 1000;
const INSERT_BATCH_SIZE = 500;

interface SegmentRow {
  source_text: string;
  target_text: string;
  article_id: string | null;
}

// ---------------------------------------------------------------------------
// Env loading
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
// Database helpers
// ---------------------------------------------------------------------------

/**
 * Fetch one page of segment rows matching the ZH import criteria.
 */
async function fetchSegmentPage(
  sb: SupabaseClient,
  offset: number,
  limit: number,
): Promise<SegmentRow[]> {
  const { data, error } = await sb
    .from("segments")
    .select("source_text, target_text, article_id")
    .eq("source_lang", "ja")
    .eq("target_lang", "zh")
    .not("source_text", "is", null)
    .not("target_text", "is", null)
    .neq("source_text", "")
    .neq("target_text", "")
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch segments at offset=${offset}: ${error.message}`);
  }
  return (data as SegmentRow[] | null) ?? [];
}

/**
 * Load all existing (source_text, target_lang='zh') rows from translation_memory
 * into a Set for fast in-memory deduplication.  Pages through TM to handle
 * tables that may grow large over time.
 */
async function loadExistingZHSet(sb: SupabaseClient): Promise<Set<string>> {
  const existing = new Set<string>();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await sb
      .from("translation_memory")
      .select("source_text")
      .eq("target_lang", "zh")
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to load existing TM ZH rows: ${error.message}`);
    }

    const rows = (data as { source_text: string }[] | null) ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      existing.add(row.source_text);
    }

    offset += rows.length;
    if (rows.length < pageSize) break;
  }

  return existing;
}

/**
 * Insert a batch of TM rows.  Returns the number actually inserted.
 */
async function insertTMBatch(
  sb: SupabaseClient,
  rows: SegmentRow[],
  dryRun: boolean,
): Promise<number> {
  if (dryRun || rows.length === 0) return 0;

  const tmRows = rows.map((seg) => ({
    source_text: seg.source_text,
    target_text: seg.target_text,
    source_lang: "ja",
    target_lang: "zh",
    domain: "kendo",
    quality: "50",
    human_approved: false,
    origin: "zh_import",
    approach: "machine_translation_baseline",
    article_id: seg.article_id ?? null,
    created_by: null,
  }));

  const { error } = await sb.from("translation_memory").insert(tmRows);
  if (error) {
    throw new Error(`Insert batch failed (${rows.length} rows): ${error.message}`);
  }
  return rows.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

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

  // -----------------------------------------------------------------------
  // 1. Load environment & connect to DB
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

  console.log(
    `[info] Connected to Supabase. Mode: ${dryRun ? "DRY-RUN" : "LIVE"}`,
  );
  if (limit !== null) {
    console.log(`[info] Limit: first ${limit} segments only.`);
  }

  // -----------------------------------------------------------------------
  // 2. Load existing ZH TM rows for dedup (idempotent re-run support)
  // -----------------------------------------------------------------------
  console.log("[info] Loading existing ZH translation_memory rows for dedup...");
  const existingZHSet = await loadExistingZHSet(sb);
  console.log(`[info] Found ${existingZHSet.size} existing ZH rows in TM.`);

  // -----------------------------------------------------------------------
  // 3. Page through segments and seed TM
  // -----------------------------------------------------------------------
  let totalNew = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let offset = 0;
  let batchNum = 0;

  while (true) {
    batchNum++;

    const pageLimit = limit !== null
      ? Math.min(SEGMENT_PAGE_SIZE, limit - offset)
      : SEGMENT_PAGE_SIZE;

    if (pageLimit <= 0) break;

    const segments = await fetchSegmentPage(sb, offset, pageLimit);

    if (segments.length === 0) break;

    const newSegments = segments.filter((s) => !existingZHSet.has(s.source_text));
    const skippedInBatch = segments.length - newSegments.length;

    // Insert new rows in sub-batches
    let insertedInBatch = 0;
    for (let i = 0; i < newSegments.length; i += INSERT_BATCH_SIZE) {
      const slice = newSegments.slice(i, i + INSERT_BATCH_SIZE);
      try {
        const count = await insertTMBatch(sb, slice, dryRun);
        // In dry-run mode insertTMBatch returns 0; report the slice length instead.
        insertedInBatch += dryRun ? slice.length : count;
      } catch (err) {
        console.error(
          `[error] Insert sub-batch failed at offset=${offset + i}: ${err}`,
        );
        totalErrors += slice.length;
      }
    }

    totalNew += insertedInBatch;
    totalSkipped += skippedInBatch;

    console.log(
      `Seeded batch ${batchNum}: ` +
        `${insertedInBatch} new rows / ${skippedInBatch} skipped (already in TM)` +
        ` [offset=${offset}, fetched=${segments.length}]`,
    );

    offset += segments.length;

    // Stop if we hit the --limit
    if (limit !== null && offset >= limit) break;
  }

  // -----------------------------------------------------------------------
  // 4. Final summary
  // -----------------------------------------------------------------------
  console.log(
    `\nDone. Total new TM rows: ${totalNew} / skipped: ${totalSkipped} / errors: ${totalErrors}`,
  );
  if (dryRun) {
    console.log("[dry-run] No DB writes performed. Counts are estimated.");
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(99);
});
