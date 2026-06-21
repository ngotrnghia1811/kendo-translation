/**
 * Re-segment 103 paragraph-mismatch bilingual kendojidai articles
 * using a smarter alignment algorithm.
 *
 * Root cause: the EN (or JP) scraper preserved HTML <br> line breaks as \n\n
 * paragraph breaks, creating many short fragments on one side.
 *
 * Algorithm:
 *   1. Strip junk paragraphs (same regex as segment-kendojidai-bilingual.ts).
 *   2. Determine direction: if one side has MORE paragraphs, merge its short
 *      consecutive paragraphs (<80 chars EN, <40 chars JP) into the next one.
 *   3. Split both sides into sentences.
 *   4. Zip with JP as source_text, EN as target_text (pad with null on EN side).
 *   5. Delete existing segments, insert new ones, update articles + document_settings.
 *
 * Usage:
 *   npx tsx scripts/realign-mismatch-articles.ts --dry-run     # show what would happen
 *   npx tsx scripts/realign-mismatch-articles.ts --dry-run --limit 5
 *   npx tsx scripts/realign-mismatch-articles.ts               # re-import all 103
 *   npx tsx scripts/realign-mismatch-articles.ts --article-id UUID  # single article
 *   npx tsx scripts/realign-mismatch-articles.ts --force       # skip dry-run prompt
 */

import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENV_PATH = ".env.local";
const SEGMENT_BATCH = 200;
const MISMATCH_TSV = "/tmp/mismatch-report.tsv";
const EN_MERGE_THRESHOLD = 80;
const JP_MERGE_THRESHOLD = 40;

const EN_JUNK: RegExp[] = [
  /^Tweet$/i,
  /^Pocket$/i,
  /^FREE\s+ARTICLE$/i,
  /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|Jun\.?|Jul\.?|Aug\.?|Sep\.?|Oct\.?|Nov\.?|Dec\.?)\s+\d{4}\s*\|?\s*KENDOJIDAI/i,
  /^Photography\s*:/i,
  /^(Text\s*(&|and)\s*Composition|Composition)\s*:/i,
  /^\*Unauthorized\s+reproduction/i,
  /^\*?\s*The\s+images?\s+(featured|in|appearing)\s+in\s+this\s+article/i,
  /^\s*$/,
];

const JP_JUNK: RegExp[] = [
  /^Tweet$/i,
  /^Pocket$/i,
  /^FREE\s+ARTICLE$/i,
  /^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/,
  /^写真[＝=]/,
  /^構成[＝=]/,
  /^※この記事は/,
  /^\*本記事に掲載された画像の無断転載/,
  /^\*本記事に掲載.+を固く禁じます/,
  /^[　\s]*$/,
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArticleRow {
  id: string;
  title: string | null;
  title_ja: string | null;
  content_en: string | null;
  content_ja: string | null;
}

interface SegmentInput {
  article_id: string;
  position: number;
  source_text: string;
  target_text: string | null;
  status: string;
  source_lang: string;
  target_lang: string;
  metadata: Record<string, unknown>;
}

interface AlignedPair {
  jp: string;
  en: string | null;
}

interface RealignResult {
  id: string;
  title: string | null;
  oldCount: number;
  oldDiff: number;
  newCount: number;
  newDiff: number;
  nullEn: number;
  reason?: string;
}

interface MismatchRow {
  diff: number;
  en_count: number;
  jp_count: number;
  direction: string;
  title: string;
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
// Paragraph splitting & junk stripping
// ---------------------------------------------------------------------------

function splitParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n");
  return normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function stripJunk(paras: string[], lang: "en" | "ja"): string[] {
  const patterns = lang === "en" ? EN_JUNK : JP_JUNK;
  return paras.filter((p) => !patterns.some((re) => re.test(p)));
}

// ---------------------------------------------------------------------------
// Merge short paragraphs (forward direction: short → next)
// ---------------------------------------------------------------------------

/**
 * Iteratively merge consecutive paragraphs where the FIRST is shorter than
 * `threshold` into the NEXT paragraph (join with " ").
 * Repeats until no more short paragraphs remain or max iterations reached.
 */
function mergeShortForward(paras: string[], threshold: number): string[] {
  let result = [...paras];
  let changed = true;
  let iterations = 0;
  const MAX_ITER = 20;

  while (changed && iterations < MAX_ITER) {
    changed = false;
    iterations++;
    const next: string[] = [];
    let i = 0;
    while (i < result.length) {
      if (result[i].length < threshold && i + 1 < result.length) {
        // Merge current short paragraph into the next one
        next.push(result[i] + " " + result[i + 1]);
        i += 2;
        changed = true;
      } else {
        next.push(result[i]);
        i += 1;
      }
    }
    result = next;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Alignment
// ---------------------------------------------------------------------------

/**
 * Zip JP and EN paragraph arrays. JP = source_text, EN = target_text.
 * Pad shorter array with nulls. Drop entries where JP is empty.
 * N = max(jp.length, en.length).
 */
function zipAlign(jp: string[], en: string[]): AlignedPair[] {
  const N = Math.max(jp.length, en.length);
  const result: AlignedPair[] = [];
  for (let i = 0; i < N; i++) {
    const jpText = jp[i] ?? null;
    const enText = en[i] ?? null;
    if (!jpText) continue;
    result.push({ jp: jpText, en: enText });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Core realignment algorithm for one article
// ---------------------------------------------------------------------------

/**
 * Merge short paragraphs on the side with more paragraphs, then zip at paragraph level.
 * Returns the aligned pairs and metadata about the transformation.
 */
function realignArticle(
  content_en: string,
  content_ja: string,
): { pairs: AlignedPair[]; enParas: number; jpParas: number; enMerged: number; jpMerged: number } {
  // 1. Split + strip junk
  const enParasRaw = splitParagraphs(content_en ?? "");
  const jpParasRaw = splitParagraphs(content_ja ?? "");
  const enParas = stripJunk(enParasRaw, "en");
  const jpParas = stripJunk(jpParasRaw, "ja");

  // 2. Determine direction and merge the side with more paragraphs
  let enWork = [...enParas];
  let jpWork = [...jpParas];

  if (enParas.length > jpParas.length) {
    enWork = mergeShortForward(enParas, EN_MERGE_THRESHOLD);
  } else if (jpParas.length > enParas.length) {
    jpWork = mergeShortForward(jpParas, JP_MERGE_THRESHOLD);
  }

  // 3. Zip at paragraph level (no sentence splitting)
  const pairs = zipAlign(jpWork, enWork);

  return {
    pairs,
    enParas: enParas.length,
    jpParas: jpParas.length,
    enMerged: enWork.length,
    jpMerged: jpWork.length,
  };
}

// ---------------------------------------------------------------------------
// Import one article (delete-then-insert + update articles + upsert doc_settings)
// ---------------------------------------------------------------------------

async function importRealigned(
  sb: SupabaseClient,
  article: ArticleRow,
  pairs: AlignedPair[],
  enParas: number,
  jpParas: number,
): Promise<{ ok: true } | { reason: string }> {
  const { id } = article;
  const N = pairs.length;

  // 1. DELETE existing segments
  const { error: delErr } = await sb.from("segments").delete().eq("article_id", id);
  if (delErr) return { reason: `DELETE segments failed: ${delErr.message}` };

  // 2. INSERT new segments in batches
  const segments: SegmentInput[] = pairs.map((pair, i) => ({
    article_id: id,
    position: i,
    source_text: pair.jp,
    target_text: pair.en,
    status: "qa_approved",
    source_lang: "ja",
    target_lang: "en",
    metadata: {
      realigned_from_paragraph_mismatch: true,
      paragraph_count_en: enParas,
      paragraph_count_ja: jpParas,
    },
  }));

  for (let offset = 0; offset < segments.length; offset += SEGMENT_BATCH) {
    const batch = segments.slice(offset, offset + SEGMENT_BATCH);
    const { error: segErr } = await sb.from("segments").insert(batch);
    if (segErr) {
      return { reason: `INSERT segments failed at offset=${offset}: ${segErr.message}` };
    }
  }

  // 3. UPDATE articles (preserve segmented=true, update segment_count)
  const { error: artErr } = await sb
    .from("articles")
    .update({ segment_count: N, translation_status: "qa_approved" })
    .eq("id", id);
  if (artErr) return { reason: `UPDATE articles failed: ${artErr.message}` };

  // 4. UPSERT document_settings
  const boundaries = Array.from({ length: N }, (_, i) => i);
  const { error: dsErr } = await sb
    .from("document_settings")
    .upsert(
      {
        article_id: id,
        source_lang: "ja",
        target_lang: "en",
        paragraph_boundaries: boundaries,
        total_segments: N,
        translated_count: N,
        reviewed_count: N,
        approved_count: N,
        assigned_translators: [],
      },
      { onConflict: "article_id" },
    );
  if (dsErr) return { reason: `UPSERT document_settings failed: ${dsErr.message}` };

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Read mismatch report TSV
// ---------------------------------------------------------------------------

async function readMismatchReport(): Promise<MismatchRow[]> {
  const raw = await readFile(MISMATCH_TSV, "utf8");
  const lines = raw.trim().split("\n");
  // Skip header
  const rows: MismatchRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length >= 5) {
      rows.push({
        diff: Number(cols[0]),
        en_count: Number(cols[1]),
        jp_count: Number(cols[2]),
        direction: cols[3],
        title: cols.slice(4).join("\t"), // title may contain tabs? unlikely but safe
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");

  let limit: number | null = null;
  const limitIdx = args.indexOf("--limit");
  if (limitIdx >= 0) {
    const val = args[limitIdx + 1];
    if (val && /^\d+$/.test(val)) limit = Number(val);
    else { console.error("Error: --limit requires a positive integer argument."); process.exit(1); }
  }

  let articleId: string | null = null;
  const articleIdIdx = args.indexOf("--article-id");
  if (articleIdIdx >= 0) {
    articleId = args[articleIdIdx + 1];
    if (!articleId || !/^[0-9a-f-]{36}$/.test(articleId)) {
      console.error("Error: --article-id requires a valid UUID argument.");
      process.exit(1);
    }
  }

  // -----------------------------------------------------------------------
  // Environment & DB
  // -----------------------------------------------------------------------
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("FATAL: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // -----------------------------------------------------------------------
  // Get articles to process
  // -----------------------------------------------------------------------
  let articles: ArticleRow[];

  if (articleId) {
    const { data, error } = await sb
      .from("articles")
      .select("id, title, content_en, content_ja")
      .eq("id", articleId)
      .single();
    if (error || !data) {
      console.error(`FATAL: article ${articleId} not found: ${error?.message ?? "no rows"}`);
      process.exit(1);
    }
    if (!data.content_en || !data.content_ja) {
      console.error(`FATAL: article ${articleId} is not bilingual.`);
      process.exit(1);
    }
    articles = [data as ArticleRow];
  } else {
    // Read mismatch report, look up each title
    const mismatches = await readMismatchReport();
    console.log(`[info] Read ${mismatches.length} mismatch articles from ${MISMATCH_TSV}`);

    articles = [];
    for (const m of mismatches) {
      // Search by title — try exact match first
      // Some titles have special chars. Use ilike for fuzzy matching.
      const { data, error } = await sb
        .from("articles")
        .select("id, title, content_en, content_ja")
        .eq("title", m.title)
        .not("content_en", "is", null)
        .not("content_ja", "is", null)
        .maybeSingle();

      if (error) {
        console.warn(`[warn] Query error for "${m.title}": ${error.message}`);
        continue;
      }
      if (!data) {
        console.warn(`[warn] Article not found in DB: "${m.title}"`);
        continue;
      }
      articles.push(data as ArticleRow);

      if (limit && articles.length >= limit) break;
    }
    console.log(`[info] Matched ${articles.length} articles in DB (of ${mismatches.length} in report)`);
  }

  if (articles.length === 0) {
    console.log("Nothing to process.");
    return;
  }

  // -----------------------------------------------------------------------
  // Process articles
  // -----------------------------------------------------------------------
  const results: RealignResult[] = [];
  let totalOldSegments = 0;
  let totalNewSegments = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const label = `[${i + 1}/${articles.length}]`;
    const content_en = article.content_en ?? "";
    const content_ja = article.content_ja ?? "";

    try {
      const { pairs, enParas, jpParas, enMerged, jpMerged } = realignArticle(content_en, content_ja);
      const newDiff = Math.abs(enMerged - jpMerged);
      const nullEn = pairs.filter((p) => p.en === null).length;

      // Get old segment count from existing segments
      const { count: oldCount } = await sb
        .from("segments")
        .select("*", { count: "exact", head: true })
        .eq("article_id", article.id);
      const oldDiff = Math.abs(enParas - jpParas);

      const result: RealignResult = {
        id: article.id,
        title: article.title,
        oldCount: oldCount || 0,
        oldDiff,
        newCount: pairs.length,
        newDiff,
        nullEn,
      };

      const improved = newDiff <= oldDiff;
      const statusIcon = improved ? "✓" : "✗ SKIP";
      console.log(
        `${label} ${statusIcon} ${article.title?.slice(0, 60) ?? "(no title)"}`
        + ` — diff ${oldDiff}→${newDiff} | seg ${result.oldCount}→${pairs.length}`
        + ` (EN=${enMerged} JP=${jpMerged}, null=${nullEn})`,
      );

      // Show first 5 pairs in dry-run mode
      if (dryRun && improved) {
        console.log(`  First 5 pairs:`);
        pairs.slice(0, 5).forEach((p, idx) => {
          console.log(`  [${idx}] JP: ${p.jp.slice(0, 100)}${p.jp.length > 100 ? "…" : ""}`);
          console.log(`       EN: ${(p.en ?? "(null)").slice(0, 100)}${(p.en ?? "").length > 100 ? "…" : ""}`);
        });
      }

      results.push(result);
      totalOldSegments += result.oldCount;
      if (improved) totalNewSegments += pairs.length;

      // Import if not dry-run AND the alignment actually improved
      if (!dryRun && improved) {
        const importResult = await importRealigned(sb, article, pairs, enParas, jpParas);
        if ("reason" in importResult) {
          console.error(`  ✗ Import failed: ${importResult.reason}`);
          result.reason = importResult.reason;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${label} ✗ ERROR: ${msg}`);
      results.push({
        id: article.id,
        title: article.title,
        oldCount: 0,
        oldDiff: 0,
        newCount: 0,
        newDiff: 0,
        nullEn: 0,
        reason: msg,
      });
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  const improved = results.filter((r) => !r.reason && r.newDiff <= r.oldDiff);
  const skipped = results.filter((r) => !r.reason && r.newDiff > r.oldDiff);
  const failed = results.filter((r) => r.reason);

  console.log(
    `\n${"=".repeat(60)}`
    + `\nSummary:${dryRun ? " DRY-RUN" : ""}`
    + `\n  Articles: ${results.length}`
    + `\n  Re-aligned: ${improved.length}`
    + `\n  Skipped (no improvement): ${skipped.length}`
    + `\n  Failed:   ${failed.length}`
    + `\n  Total old segments: ${totalOldSegments}`
    + `\n  Total new segments: ${totalNewSegments}`,
  );

  if (skipped.length > 0) {
    console.log("\n  Skipped (merge didn't improve paragraph-count diff):");
    for (const s of skipped) {
      console.log(`    ${s.id} "${s.title}" — diff ${s.oldDiff}→${s.newDiff}`);
    }
  }

  if (failed.length > 0) {
    console.log("\n  Failed articles:");
    for (const f of failed) {
      console.log(`    ${f.id} "${f.title}" — ${f.reason}`);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(99);
});
