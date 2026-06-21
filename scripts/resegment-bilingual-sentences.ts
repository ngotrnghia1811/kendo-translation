/**
 * Re-segment bilingual kendojidai articles from paragraph-level to
 * sentence-level alignment using period/。 splitting.
 *
 * Algorithm per article:
 *   1. Read content_en and content_ja from `articles`
 *   2. Strip junk lines (enhanced patterns from fix-5-large-mismatch-articles.ts)
 *   3. Split into sentences (splitJpSentences / splitEnSentences)
 *   4. Pair sentences using greedy 1:1 zip alignment
 *   5. Delete existing segments, insert new ones (batches of 200)
 *   6. Update article and document_settings
 *
 * Usage:
 *   npx tsx scripts/resegment-bilingual-sentences.ts --dry-run
 *   npx tsx scripts/resegment-bilingual-sentences.ts --dry-run --limit 5
 *   npx tsx scripts/resegment-bilingual-sentences.ts --article-id UUID --dry-run
 *   npx tsx scripts/resegment-bilingual-sentences.ts --article-id UUID
 *   npx tsx scripts/resegment-bilingual-sentences.ts --limit 10
 *   npx tsx scripts/resegment-bilingual-sentences.ts
 */

import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENV_PATH = ".env.local";
const SEGMENT_BATCH = 200;

// ENHANCED junk patterns (from fix-5-large-mismatch-articles.ts)
const EN_JUNK: RegExp[] = [
  /^Tweet$/i,
  /^Pocket$/i,
  /^FREE\s+ARTICLE$/i,
  /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|Jun\.?|Jul\.?|Aug\.?|Sep\.?|Oct\.?|Nov\.?|Dec\.?)\s+\d{4}\s*\|?\s*KENDOJIDAI/i,
  /^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/i,
  /^Photography\s*:/i,
  /^(Text\s*(&|and)\s*Composition|Composition)\s*:/i,
  /^Interview\s+(Taken\s+)?[Bb]y/i,
  /^Moderator\s*:/i,
  /^Translation\s*[：=:]/i,
  /^\*Unauthorized\s+reproduction/i,
  /^\*?\s*The\s+images?\s+(featured|in|appearing)\s+in\s+this\s+article/i,
  /^\s*$/,
];

const JP_JUNK: RegExp[] = [
  /^Tweet$/i,
  /^Pocket$/i,
  /^FREE\s+ARTICLE$/i,
  /^無料記事$/i,
  /^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/,
  /^撮影[＝=：:]/i,
  /^写真[＝=]/,
  /^構成[＝=]/,
  /^取材[＝=：:]/i,
  /^文[＝=：:]/i,
  /^翻訳[＝=：:]/i,
  /^司会[＝=：:]/i,
  /^※こ(の記事|のインタビュー|の連載)は/,
  /^\*本記事に掲載された画像の無断転載/,
  /^剣道時代.*号[　\s]*[』」].*掲載/,
  /^[『「]剣道時代.*号[』」]/,
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
  segment_count: number | null;
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

interface SentencePair {
  jp: string | null;
  en: string | null;
}

interface ResegmentResult {
  id: string;
  title: string | null;
  oldSegments: number;
  newSegments: number;
  jpSentences: number;
  enSentences: number;
  nullEn: number;
  nullJp: number;
  diff: number;
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
// Paragraph splitting & junk stripping (same as existing scripts)
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
// Sentence splitting
// ---------------------------------------------------------------------------

/** Split Japanese text into sentences on 。, merging short fragments (<5 chars).
 *  Also applies junk patterns at the sentence level to catch metadata lines
 *  that were in the same paragraph as real content. */
function splitJpSentences(text: string): string[] {
  const paras = stripJunk(splitParagraphs(text), "ja");
  if (paras.length === 0) return [];

  // Join into one string (remove \n\n paragraph boundaries)
  const joined = paras.join(" ");

  // Split on 。 keeping it at end of previous sentence
  const raw = joined
    .split(/(?<=。)/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Apply junk patterns at sentence level (catch metadata lines that were
  // in the same paragraph as real content, separated by single \n)
  const filtered = raw.filter((s) => !JP_JUNK.some((re) => re.test(s)));

  // Merge very short fragments (< 5 chars) with previous sentence
  const result: string[] = [];
  for (const s of filtered) {
    if (s.length < 5 && result.length > 0) {
      result[result.length - 1] += s;
    } else {
      result.push(s);
    }
  }
  return result;
}

/** Split English text into sentences on '. ', handling abbreviations and merging short fragments.
 *  Also applies junk patterns at the sentence level. */
function splitEnSentences(text: string): string[] {
  const paras = stripJunk(splitParagraphs(text), "en");
  if (paras.length === 0) return [];

  // Join into one string
  const joined = paras.join(" ");

  // Split: period + space(s) + uppercase letter or quote-start + uppercase
  // Also capture period at end of string
  const raw = joined
    .split(/(?<=[a-zA-Z0-9"')])\.\s+(?=[A-Z"'(])/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Apply junk patterns at sentence level
  const filtered = raw.filter((s) => !EN_JUNK.some((re) => re.test(s)));

  // Merge very short fragments (< 10 chars) with next sentence
  const result: string[] = [];
  for (const s of filtered) {
    if (s.length < 10 && result.length > 0) {
      result[result.length - 1] += ". " + s;
    } else {
      result.push(s);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sentence alignment (greedy 1:1 zip)
// ---------------------------------------------------------------------------

/**
 * Simple 1:1 zip: pad the shorter side with null.
 * JP sentences always go in source_text; EN in target_text.
 */
function alignSentences(jpSents: string[], enSents: string[]): SentencePair[] {
  const maxLen = Math.max(jpSents.length, enSents.length);
  const pairs: SentencePair[] = [];
  for (let i = 0; i < maxLen; i++) {
    pairs.push({ jp: jpSents[i] ?? null, en: enSents[i] ?? null });
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// Core resegmentation for one article
// ---------------------------------------------------------------------------

function resegmentArticle(content_en: string, content_ja: string): {
  pairs: SentencePair[];
  jpSentences: number;
  enSentences: number;
} {
  const jpSents = splitJpSentences(content_ja);
  const enSents = splitEnSentences(content_en);
  const pairs = alignSentences(jpSents, enSents);
  return { pairs, jpSentences: jpSents.length, enSentences: enSents.length };
}

// ---------------------------------------------------------------------------
// Import one article (delete-then-insert + update articles + upsert doc_settings)
// ---------------------------------------------------------------------------

async function importResegmented(
  sb: SupabaseClient,
  article: ArticleRow,
  pairs: SentencePair[],
  jpSentences: number,
  enSentences: number,
): Promise<{ ok: true } | { reason: string }> {
  const { id } = article;

  // 1. DELETE existing segments
  const { error: delErr } = await sb.from("segments").delete().eq("article_id", id);
  if (delErr) return { reason: `DELETE segments failed: ${delErr.message}` };

  // 2. Build segment list (skip pairs where JP is null — no segment without source_text)
  const segments: SegmentInput[] = [];
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (!pair.jp) continue;
    segments.push({
      article_id: id,
      position: segments.length,
      source_text: pair.jp,
      target_text: pair.en,
      status: "qa_approved",
      source_lang: "ja",
      target_lang: "en",
      metadata: {
        sentence_aligned: true,
        jp_sentence_count: jpSentences,
        en_sentence_count: enSentences,
      },
    });
  }

  const N = segments.length;
  if (N === 0) return { reason: "No valid segments (all JP sentences were null)" };

  // 3. INSERT new segments in batches
  for (let offset = 0; offset < N; offset += SEGMENT_BATCH) {
    const batch = segments.slice(offset, offset + SEGMENT_BATCH);
    const { error: segErr } = await sb.from("segments").insert(batch);
    if (segErr) {
      return { reason: `INSERT segments failed at offset=${offset}: ${segErr.message}` };
    }
  }

  // 4. UPDATE articles
  const { error: artErr } = await sb
    .from("articles")
    .update({ segment_count: N, segmented: true, translation_status: "qa_approved" })
    .eq("id", id);
  if (artErr) return { reason: `UPDATE articles failed: ${artErr.message}` };

  // 5. UPSERT document_settings
  const boundaries = Array.from({ length: N }, (_, i) => i);
  const translatedCount = segments.filter((s) => s.target_text !== null).length;
  const { error: dsErr } = await sb
    .from("document_settings")
    .upsert(
      {
        article_id: id,
        source_lang: "ja",
        target_lang: "en",
        paragraph_boundaries: boundaries,
        total_segments: N,
        translated_count: translatedCount,
        reviewed_count: translatedCount,
        approved_count: translatedCount,
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

  // Parse --limit N
  let limit: number | null = null;
  const limitIdx = args.indexOf("--limit");
  if (limitIdx >= 0) {
    const val = args[limitIdx + 1];
    if (val && /^\d+$/.test(val)) {
      limit = Number(val);
    } else {
      console.error("Error: --limit requires a positive integer argument.");
      process.exit(1);
    }
  }

  // Parse --article-id UUID
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
  // Fetch articles to process
  //   Target: content_en IS NOT NULL AND content_ja IS NOT NULL AND segmented = true
  // -----------------------------------------------------------------------
  const modeLabel = `${dryRun ? "DRY-RUN " : ""}${limit ? `LIMIT=${limit} ` : ""}${articleId ? `ARTICLE=${articleId} ` : ""}`;
  console.log(`[info] ${modeLabel}— resegmenting bilingual articles (paragraph → sentence).`);

  let articles: ArticleRow[];

  if (articleId) {
    // Single article mode — bypass segmented filter to allow retry
    const { data, error } = await sb
      .from("articles")
      .select("id, title, content_en, content_ja, segment_count")
      .eq("id", articleId)
      .single();
    if (error || !data) {
      console.error(`FATAL: article ${articleId} not found: ${error?.message ?? "no rows"}`);
      process.exit(1);
    }
    if (!data.content_en || !data.content_ja) {
      console.error(`FATAL: article ${articleId} is not bilingual (missing content_en or content_ja).`);
      process.exit(1);
    }
    articles = [data as ArticleRow];
    console.log(`Found: 1 specific article — "${(data as ArticleRow).title}"`);
  } else {
    // Paginate through all matching bilingual segmented articles
    articles = [];
    let page = 0;
    const PAGE_SIZE = 100;
    while (true) {
      const query = sb
        .from("articles")
        .select("id, title, content_en, content_ja, segment_count")
        .not("content_en", "is", null)
        .not("content_ja", "is", null)
        .eq("segmented", true)
        .order("created_at", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) {
        console.error(`FATAL: articles query failed: ${error.message}`);
        process.exit(1);
      }
      if (!data || data.length === 0) break;

      articles.push(...(data as ArticleRow[]));
      if (limit && articles.length >= limit) {
        articles = articles.slice(0, limit);
        break;
      }
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    console.log(`Found: ${articles.length} bilingual segmented articles to resegment.`);
  }

  if (articles.length === 0) {
    console.log("Nothing to process.");
    return;
  }

  // -----------------------------------------------------------------------
  // Process articles
  // -----------------------------------------------------------------------
  const results: ResegmentResult[] = [];
  let totalOldSegments = 0;
  let totalNewSegments = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const label = `[${i + 1}/${articles.length}]`;
    const content_en = article.content_en ?? "";
    const content_ja = article.content_ja ?? "";

    try {
      const { pairs, jpSentences, enSentences } = resegmentArticle(content_en, content_ja);
      const nullEn = pairs.filter((p) => p.en === null).length;
      const nullJp = pairs.filter((p) => p.jp === null).length;
      const diff = Math.abs(jpSentences - enSentences);
      // Actual segment count after filtering null-JP entries
      const actualSegments = pairs.filter((p) => p.jp !== null).length;

      const result: ResegmentResult = {
        id: article.id,
        title: article.title,
        oldSegments: article.segment_count ?? 0,
        newSegments: actualSegments,
        jpSentences,
        enSentences,
        nullEn,
        nullJp,
        diff,
      };

      const oldSegs = result.oldSegments;
      const newSegs = actualSegments;
      const changeSign = newSegs > oldSegs ? "↑" : newSegs < oldSegs ? "↓" : "=";
      console.log(
        `${label} ${dryRun ? "🔍" : "✓"} ${article.title?.slice(0, 60) ?? "(no title)"}`
        + ` — JP=${jpSentences} sentences EN=${enSentences} sentences diff=${diff}`
        + ` | seg ${oldSegs}→${newSegs} ${changeSign}${Math.abs(newSegs - oldSegs)}`
        + ` | nullEN=${nullEn} nullJP=${nullJp}`,
      );

      // Show first 5 pairs in dry-run mode
      if (dryRun) {
        console.log(`  First 5 sentence pairs:`);
        pairs.slice(0, 5).forEach((p, idx) => {
          const jpPreview = (p.jp ?? "(null)").slice(0, 120);
          const enPreview = (p.en ?? "(null)").slice(0, 120);
          const jpSuffix = (p.jp ?? "").length > 120 ? "…" : "";
          const enSuffix = (p.en ?? "").length > 120 ? "…" : "";
          console.log(`  [${idx}] JP: ${jpPreview}${jpSuffix}`);
          console.log(`       EN: ${enPreview}${enSuffix}`);
        });
        if (pairs.length > 5) console.log(`  ... and ${pairs.length - 5} more pairs`);
      }

      results.push(result);
      totalOldSegments += oldSegs;
      totalNewSegments += newSegs;

      // Import if not dry-run
      if (!dryRun) {
        const importResult = await importResegmented(sb, article, pairs, jpSentences, enSentences);
        if ("reason" in importResult) {
          console.error(`  ✗ Import failed: ${importResult.reason}`);
          result.reason = importResult.reason;
        } else {
          console.log(`  ✓ DB updated.`);
        }
      }

      console.log(""); // blank line between articles
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${label} ✗ ERROR: ${msg}\n`);
      results.push({
        id: article.id,
        title: article.title,
        oldSegments: article.segment_count ?? 0,
        newSegments: 0,
        jpSentences: 0,
        enSentences: 0,
        nullEn: 0,
        nullJp: 0,
        diff: 0,
        reason: msg,
      });
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  const succeeded = results.filter((r) => !r.reason);
  const failed = results.filter((r) => r.reason);

  console.log(`${"=".repeat(70)}`);
  console.log(`Summary:${dryRun ? " DRY-RUN" : " EXECUTED"}`);
  console.log(`  Articles processed:  ${results.length}`);
  console.log(`  Succeeded:           ${succeeded.length}`);
  console.log(`  Failed:              ${failed.length}`);
  console.log(`  Total old segments:  ${totalOldSegments}`);
  console.log(`  Total new segments:  ${totalNewSegments}`);

  if (succeeded.length > 0) {
    const avgJpSent = Math.round(
      succeeded.reduce((sum, r) => sum + r.jpSentences, 0) / succeeded.length,
    );
    const avgEnSent = Math.round(
      succeeded.reduce((sum, r) => sum + r.enSentences, 0) / succeeded.length,
    );
    const avgOldSeg = Math.round(
      succeeded.reduce((sum, r) => sum + r.oldSegments, 0) / succeeded.length,
    );
    const avgNewSeg = Math.round(
      succeeded.reduce((sum, r) => sum + r.newSegments, 0) / succeeded.length,
    );
    const avgDiff = Math.round(
      succeeded.reduce((sum, r) => sum + r.diff, 0) / succeeded.length,
    );
    const avgNullEn = Math.round(
      succeeded.reduce((sum, r) => sum + r.nullEn, 0) / succeeded.length,
    );

    console.log(`  --- Per-article averages ---`);
    console.log(`  Avg JP sentences:    ${avgJpSent}`);
    console.log(`  Avg EN sentences:    ${avgEnSent}`);
    console.log(`  Avg old segments:    ${avgOldSeg}`);
    console.log(`  Avg new segments:    ${avgNewSeg}`);
    console.log(`  Avg JP/EN diff:      ${avgDiff}`);
    console.log(`  Avg null EN entries: ${avgNullEn}`);
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
