/**
 * Fix the 5 articles with diff ≥ 11 that realign-mismatch-articles.ts
 * couldn't resolve.
 *
 * Strategy per article (see investigation in task description):
 *   - Enhanced junk strip patterns for BOTH EN and JP
 *   - Adaptive merge thresholds (higher when fragmentation is extreme)
 *   - Multiple merge passes when needed
 *
 * Usage:
 *   npx tsx scripts/fix-5-large-mismatch-articles.ts --dry-run
 *   npx tsx scripts/fix-5-large-mismatch-articles.ts
 */

import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENV_PATH = ".env.local";
const SEGMENT_BATCH = 200;

// Article IDs for the 5 articles with diff ≥ 11
const TARGET_IDS = [
  "644a64be-8499-4dea-8362-7a863f9a85d4", // Students Surpassing Part 2 (diff=28)
  "c8cd5522-564f-4bad-a433-d6a3829506da", // Students Surpassing Part 1 (diff=18)
  "068a6b5d-fd80-4d7f-a501-36830073a073", // Increasing continuation rate (diff=16)
  "ffca4b1e-e73a-432d-9ac5-9f3c64c60f0c", // How to maintain children's motivation (diff=14)
  "a954735a-f770-4389-a968-4effa804d7e5", // Stuart Gibson (diff=11)
  "7537fc31-aa9e-44a3-bb7c-b20245ed59ca", // POSTPONE NSSU (diff=11)
];

// ENHANCED junk patterns (original + newly discovered)
const EN_JUNK_ENHANCED: RegExp[] = [
  /^Tweet$/i,
  /^Pocket$/i,
  /^FREE\s+ARTICLE$/i,
  /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|Jun\.?|Jul\.?|Aug\.?|Sep\.?|Oct\.?|Nov\.?|Dec\.?)\s+\d{4}\s*\|?\s*KENDOJIDAI/i,
  /^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/i,          // NEW: "2019.3 KENDOJIDAI" etc
  /^Photography\s*:/i,
  /^(Text\s*(&|and)\s*Composition|Composition)\s*:/i,
  /^Interview\s+(Taken\s+)?[Bb]y/i,               // NEW: "Interview Taken by: ..."
  /^Moderator\s*:/i,                               // NEW: "Moderator: ..."
  /^Translation\s*[：=:]/i,                        // NEW: "Translation: ..." / "Translation — ..."
  /^\*Unauthorized\s+reproduction/i,
  /^\*?\s*The\s+images?\s+(featured|in|appearing)\s+in\s+this\s+article/i,
  /^\s*$/,
];

const JP_JUNK_ENHANCED: RegExp[] = [
  /^Tweet$/i,
  /^Pocket$/i,
  /^FREE\s+ARTICLE$/i,
  /^無料記事$/i,                                    // NEW: "Free article" in Japanese
  /^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/,
  /^撮影[＝=：:]/i,                                 // NEW: Photography credit
  /^写真[＝=]/i,
  /^構成[＝=]/i,
  /^取材[＝=：:]/i,                                 // NEW: Interview/Reporting credit
  /^文[＝=：:]/i,                                   // NEW: Text/Author credit
  /^翻訳[＝=：:]/i,                                 // NEW: Translation credit
  /^司会[＝=：:]/i,                                 // NEW: Moderator credit
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

interface FixResult {
  id: string;
  title: string | null;
  oldSegments: number;
  newSegments: number;
  oldDiff: number;
  newDiff: number;
  nullEn: number;
  enParas: number;
  jpParas: number;
  enMerged: number;
  jpMerged: number;
  mergeThresholdEn: number;
  mergeThresholdJp: number;
  reason?: string;
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
// Paragraph splitting & junk stripping (with enhanced patterns)
// ---------------------------------------------------------------------------

function splitParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n");
  return normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function stripJunk(paras: string[], lang: "en" | "ja"): string[] {
  const patterns = lang === "en" ? EN_JUNK_ENHANCED : JP_JUNK_ENHANCED;
  return paras.filter((p) => !patterns.some((re) => re.test(p)));
}

// ---------------------------------------------------------------------------
// Merge short paragraphs
// ---------------------------------------------------------------------------

function mergeShortForward(paras: string[], threshold: number): string[] {
  let result = [...paras];
  let changed = true;
  let iterations = 0;
  const MAX_ITER = 30;

  while (changed && iterations < MAX_ITER) {
    changed = false;
    iterations++;
    const next: string[] = [];
    let i = 0;
    while (i < result.length) {
      if (result[i].length < threshold && i + 1 < result.length) {
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
// Adaptive threshold selection
// ---------------------------------------------------------------------------

interface MergeConfig {
  enThreshold: number;
  jpThreshold: number;
}

/**
 * Choose merge thresholds based on the article's paragraph profile.
 * Strategy:
 *   - If one side has many very short paragraphs (names, metadata lines),
 *     increase that side's threshold to force more merging.
 *   - If diff is > 15, use more aggressive thresholds.
 *   - Cap thresholds to avoid over-merging real content.
 */
function chooseThresholds(
  enParas: string[],
  jpParas: string[],
): MergeConfig {
  const diff = Math.abs(enParas.length - jpParas.length);
  const enShortCount = enParas.filter(p => p.length < 80).length;
  const jpShortCount = jpParas.filter(p => p.length < 40).length;
  const enShortRatio = enShortCount / enParas.length;
  const jpShortRatio = jpShortCount / jpParas.length;

  let enThreshold = 80;
  let jpThreshold = 40;

  // If JP has more paragraphs AND high ratio of very short ones → merge JP harder
  if (jpParas.length > enParas.length && jpShortRatio > 0.4) {
    jpThreshold = 60;
    if (diff > 20) jpThreshold = 80;
    else if (diff > 15) jpThreshold = 70;
  }

  // If EN has more paragraphs AND high ratio of very short ones → merge EN harder
  if (enParas.length > jpParas.length && enShortRatio > 0.3) {
    enThreshold = 120;
    if (diff > 20) enThreshold = 150;
    else if (diff > 15) enThreshold = 130;
  }

  return { enThreshold, jpThreshold };
}

// ---------------------------------------------------------------------------
// Core fix algorithm for one article
// ---------------------------------------------------------------------------

function fixArticle(
  content_en: string,
  content_ja: string,
): { pairs: AlignedPair[]; enParas: number; jpParas: number; enMerged: number; jpMerged: number; enThresh: number; jpThresh: number } {
  // 1. Split + strip with ENHANCED junk patterns
  const enParasRaw = splitParagraphs(content_en ?? "");
  const jpParasRaw = splitParagraphs(content_ja ?? "");
  const enParas = stripJunk(enParasRaw, "en");
  const jpParas = stripJunk(jpParasRaw, "ja");

  // 2. Choose adaptive thresholds
  const { enThreshold, jpThreshold } = chooseThresholds(enParas, jpParas);

  // 3. Apply merge on the side with more paragraphs
  //    OR apply to BOTH sides if both are heavily fragmented
  let enWork = [...enParas];
  let jpWork = [...jpParas];

  if (enParas.length > jpParas.length) {
    enWork = mergeShortForward(enParas, enThreshold);
    // Also merge JP lightly if it has many short paragraphs
    if (jpParas.filter(p => p.length < 40).length / jpParas.length > 0.3) {
      jpWork = mergeShortForward(jpParas, 40);
    }
  } else if (jpParas.length > enParas.length) {
    jpWork = mergeShortForward(jpParas, jpThreshold);
    // Also merge EN lightly if it has many short paragraphs
    if (enParas.filter(p => p.length < 80).length / enParas.length > 0.3) {
      enWork = mergeShortForward(enParas, 80);
    }
  } else {
    // Equal count but both may be fragmented
    if (enParas.filter(p => p.length < 80).length / enParas.length > 0.3) {
      enWork = mergeShortForward(enParas, 80);
    }
    if (jpParas.filter(p => p.length < 40).length / jpParas.length > 0.3) {
      jpWork = mergeShortForward(jpParas, 40);
    }
  }

  // 4. Zip at paragraph level
  const pairs = zipAlign(jpWork, enWork);

  return {
    pairs,
    enParas: enParas.length,
    jpParas: jpParas.length,
    enMerged: enWork.length,
    jpMerged: jpWork.length,
    enThresh: enThreshold,
    jpThresh: jpThreshold,
  };
}

// ---------------------------------------------------------------------------
// Import one article (delete-then-insert + update articles + upsert doc_settings)
// ---------------------------------------------------------------------------

async function importFix(
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
      fixed_from_large_mismatch: true,
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

  // 3. UPDATE articles
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
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

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
  // Fetch the 6 target articles (5 titles, 6 rows due to Part 1/Part 2)
  // -----------------------------------------------------------------------
  const articles: ArticleRow[] = [];
  for (const id of TARGET_IDS) {
    const { data, error } = await sb
      .from("articles")
      .select("id, title, content_en, content_ja")
      .eq("id", id)
      .single();
    if (error || !data) {
      console.warn(`[warn] Article ${id} not found: ${error?.message ?? "no rows"}`);
      continue;
    }
    articles.push(data as ArticleRow);
  }
  console.log(`[info] Found ${articles.length} articles to fix.\n`);

  // -----------------------------------------------------------------------
  // Process articles
  // -----------------------------------------------------------------------
  const results: FixResult[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const label = `[${i + 1}/${articles.length}]`;
    const content_en = article.content_en ?? "";
    const content_ja = article.content_ja ?? "";

    try {
      const { pairs, enParas, jpParas, enMerged, jpMerged, enThresh, jpThresh } =
        fixArticle(content_en, content_ja);
      const newDiff = Math.abs(enMerged - jpMerged);
      const nullEn = pairs.filter((p) => p.en === null).length;

      // Get old segment count
      const { count: oldCount } = await sb
        .from("segments")
        .select("*", { count: "exact", head: true })
        .eq("article_id", article.id);
      const oldDiff = Math.abs(enParas - jpParas);

      const result: FixResult = {
        id: article.id,
        title: article.title,
        oldSegments: oldCount || 0,
        newSegments: pairs.length,
        oldDiff,
        newDiff,
        nullEn,
        enParas,
        jpParas,
        enMerged,
        jpMerged,
        mergeThresholdEn: enThresh,
        mergeThresholdJp: jpThresh,
      };

      const improved = newDiff < oldDiff || (newDiff <= oldDiff && pairs.length !== oldCount);
      const statusIcon = improved ? "✓ FIX" : "✗ NO-OP";
      console.log(
        `${label} ${statusIcon} ${article.title?.slice(0, 70) ?? "(no title)"}`
        + `\n  old: diff=${oldDiff} seg=${result.oldSegments} (EN=${enParas} JP=${jpParas})`
        + `\n  new: diff=${newDiff} seg=${pairs.length} (EN=${enMerged} JP=${jpMerged})`
        + `\n  thresholds: EN=${enThresh} JP=${jpThresh} | nullEN=${nullEn}`,
      );

      // Show first 5 pairs in dry-run
      if (dryRun && improved) {
        console.log(`  First 5 pairs:`);
        pairs.slice(0, 5).forEach((p, idx) => {
          console.log(`  [${idx}] JP: ${p.jp.slice(0, 120)}${p.jp.length > 120 ? "…" : ""}`);
          console.log(`       EN: ${(p.en ?? "(null)").slice(0, 120)}${(p.en ?? "").length > 120 ? "…" : ""}`);
        });
      }
      console.log(""); // blank line between articles

      results.push(result);

      // Import if not dry-run AND improved
      if (!dryRun && improved) {
        const importResult = await importFix(sb, article, pairs, enParas, jpParas);
        if ("reason" in importResult) {
          console.error(`  ✗ Import failed: ${importResult.reason}`);
          result.reason = importResult.reason;
        } else {
          console.log(`  ✓ DB updated.\n`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${label} ✗ ERROR: ${msg}\n`);
      results.push({
        id: article.id,
        title: article.title,
        oldSegments: 0, newSegments: 0,
        oldDiff: 0, newDiff: 0,
        nullEn: 0,
        enParas: 0, jpParas: 0,
        enMerged: 0, jpMerged: 0,
        mergeThresholdEn: 0, mergeThresholdJp: 0,
        reason: msg,
      });
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log(`${"=".repeat(60)}`);
  console.log(`Summary:${dryRun ? " DRY-RUN" : " EXECUTED"}`);
  console.log(`  Articles processed: ${results.length}`);
  const fixed = results.filter(r => !r.reason && r.newDiff < r.oldDiff);
  const noop = results.filter(r => !r.reason && r.newDiff >= r.oldDiff);
  const failed = results.filter(r => r.reason);
  console.log(`  Fixed (improved):  ${fixed.length}`);
  console.log(`  No-op (no change): ${noop.length}`);
  console.log(`  Failed:            ${failed.length}`);

  if (fixed.length > 0) {
    console.log("\n  Fixed articles:");
    for (const r of fixed) {
      console.log(`    ${r.title?.slice(0, 60)} — diff ${r.oldDiff}→${r.newDiff} — seg ${r.oldSegments}→${r.newSegments} — nullEN=${r.nullEn}`);
    }
  }

  if (noop.length > 0) {
    console.log("\n  No improvement:");
    for (const r of noop) {
      console.log(`    ${r.title?.slice(0, 60)} — diff ${r.oldDiff}→${r.newDiff}`);
    }
  }

  if (failed.length > 0) {
    console.log("\n  Failed:");
    for (const r of failed) {
      console.log(`    ${r.title?.slice(0, 60)} — ${r.reason}`);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(99);
});
