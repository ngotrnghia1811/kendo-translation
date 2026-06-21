/**
 * Re-segment bilingual kendojidai articles using HIERARCHICAL alignment
 * with SMART CLASSIFIER:
 *
 *   1. Paragraph-level alignment (junk strip + adaptive merge + zip)
 *   2. Hierarchical: within each paragraph pair, split sentences → 1:1 zip
 *   3. Classifier:
 *      - If para_diff > --max-diff OR null_EN_rate > --max-null-rate →
 *        fall back to paragraph-level alignment, tag article needs_manual_review
 *      - Otherwise → use hierarchical sentence segments (better granularity)
 *
 * Thresholds (overridable via CLI):
 *   --max-diff N          paragraph diff threshold (default: 10)
 *   --max-null-rate 0.XX  null EN rate threshold (default: 0.30)
 *
 * Usage:
 *   npx tsx scripts/resegment-hierarchical.ts --dry-run --limit 20
 *   npx tsx scripts/resegment-hierarchical.ts --dry-run
 *   npx tsx scripts/resegment-hierarchical.ts --article-id UUID --dry-run
 *   npx tsx scripts/resegment-hierarchical.ts --article-id UUID
 *   npx tsx scripts/resegment-hierarchical.ts --limit 10
 *   npx tsx scripts/resegment-hierarchical.ts --max-diff 8 --max-null-rate 0.25
 *   npx tsx scripts/resegment-hierarchical.ts
 */

import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENV_PATH = ".env.local";
const SEGMENT_BATCH = 200;
const EN_MERGE_THRESHOLD = 80;
const JP_MERGE_THRESHOLD = 40;
const DEFAULT_MAX_DIFF = 10;
const DEFAULT_MAX_NULL_RATE = 0.30;

// Enhanced junk patterns (from fix-5-large-mismatch-articles.ts)
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
  tags: string[] | null;
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

interface HierarchicalResult {
  id: string;
  title: string | null;
  oldSegments: number;
  newSegments: number;
  paraPairs: number;
  totalJpSents: number;
  totalEnSents: number;
  nullEn: number;
  nullEnRate: number;
  enParasRaw: number;
  jpParasRaw: number;
  enParasMerged: number;
  jpParasMerged: number;
  paraDiff: number;
  /** 'hierarchical' | 'paragraph_kept' | 'skipped' */
  classification: string;
  /** e.g. 'high_diff', 'high_null_rate' */
  hardReason?: string;
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
// Paragraph alignment (merge short paragraphs, from realign-mismatch-articles.ts)
// ---------------------------------------------------------------------------

/**
 * Iteratively merge consecutive paragraphs where the FIRST is shorter than
 * `threshold` into the NEXT paragraph (join with " ").
 * Repeats until no more merges occur or max iterations reached.
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

/**
 * Align paragraphs using merge strategy.
 * Merges the side with MORE paragraphs to reduce diff.
 * Returns pairs of [jpParagraph, enParagraph] (jp never null, en can be null).
 */
function alignParagraphs(
  jpParas: string[],
  enParas: string[],
): { pairs: Array<[string, string | null]>; jpMerged: number; enMerged: number } {
  let jpWork = [...jpParas];
  let enWork = [...enParas];

  if (enParas.length > jpParas.length) {
    enWork = mergeShortForward(enParas, EN_MERGE_THRESHOLD);
  } else if (jpParas.length > enParas.length) {
    jpWork = mergeShortForward(jpParas, JP_MERGE_THRESHOLD);
  }

  const maxLen = Math.max(jpWork.length, enWork.length);
  const pairs: Array<[string, string | null]> = [];
  for (let i = 0; i < maxLen; i++) {
    const jp = jpWork[i] ?? null;
    const en = enWork[i] ?? null;
    if (!jp) continue; // skip entries where JP is null
    pairs.push([jp, en]);
  }

  return { pairs, jpMerged: jpWork.length, enMerged: enWork.length };
}

// ---------------------------------------------------------------------------
// Sentence splitting (within a single paragraph)
// ---------------------------------------------------------------------------

/** Split a Japanese paragraph into sentences on 。, merging short fragments. */
function splitJpSentences(para: string): string[] {
  const raw = para
    .split(/(?<=。)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const result: string[] = [];
  for (const s of raw) {
    if (s.length < 5 && result.length > 0) {
      result[result.length - 1] += s;
    } else {
      result.push(s);
    }
  }
  return result.length > 0 ? result : [para]; // fallback: return as-is
}

/** Split an English paragraph into sentences on '. ' before capital letter,
 *  merging short fragments. Avoids splitting abbreviations. */
function splitEnSentences(para: string): string[] {
  // Split: period + whitespace + uppercase letter or quote-start + uppercase
  const raw = para
    .split(/(?<=[a-zA-Z0-9"')])\.\s+(?=[A-Z"'(])/)
    .map((s) => s.trim())
    .filter(Boolean);

  const result: string[] = [];
  for (const s of raw) {
    if (s.length < 15 && result.length > 0) {
      result[result.length - 1] += ". " + s;
    } else {
      result.push(s);
    }
  }
  return result.length > 0 ? result : [para]; // fallback: return as-is
}

// ---------------------------------------------------------------------------
// Core hierarchical resegmentation
// ---------------------------------------------------------------------------

interface SegmentWithMeta {
  source_text: string;
  target_text: string | null;
  para_index: number;
  sent_index: number;
}

/**
 * Hierarchical algorithm:
 *   1. Paragraph-level alignment (junk strip + merge + zip)
 *   2. Within each paragraph pair: split sentences → 1:1 zip
 *   3. Flatten: each (jpSent, enSent) becomes one DB segment
 *
 * Returns all segments with para/sent metadata, skipping pairs with empty JP.
 */
function resegmentHierarchical(
  content_en: string,
  content_ja: string,
): {
  segments: SegmentWithMeta[];
  paraPairs: number;
  totalJpSents: number;
  totalEnSents: number;
  enParasRaw: number;
  jpParasRaw: number;
  enParasMerged: number;
  jpParasMerged: number;
} {
  // 1. Split paragraphs + strip junk
  const enParasRaw = splitParagraphs(content_en ?? "");
  const jpParasRaw = splitParagraphs(content_ja ?? "");
  const enParas = stripJunk(enParasRaw, "en");
  const jpParas = stripJunk(jpParasRaw, "ja");

  // 2. Align paragraphs (merge + zip)
  const { pairs: paraPairs, jpMerged, enMerged } = alignParagraphs(jpParas, enParas);

  // 3. Within each paragraph pair: split sentences + 1:1 zip
  const segments: SegmentWithMeta[] = [];
  let totalJpSents = 0;
  let totalEnSents = 0;

  for (let paraIdx = 0; paraIdx < paraPairs.length; paraIdx++) {
    const [jpPara, enPara] = paraPairs[paraIdx];
    const jpSents = splitJpSentences(jpPara);
    const enSents = enPara ? splitEnSentences(enPara) : [];

    totalJpSents += jpSents.length;
    totalEnSents += enSents.length;

    const maxSent = Math.max(jpSents.length, enSents.length);
    for (let sentIdx = 0; sentIdx < maxSent; sentIdx++) {
      const jpSent = jpSents[sentIdx] ?? "";
      if (!jpSent) continue; // skip pairs with empty JP (cannot have segment without source_text)
      segments.push({
        source_text: jpSent,
        target_text: enSents[sentIdx] ?? null,
        para_index: paraIdx,
        sent_index: sentIdx,
      });
    }
  }

  return {
    segments,
    paraPairs: paraPairs.length,
    totalJpSents,
    totalEnSents,
    enParasRaw: enParas.length,
    jpParasRaw: jpParas.length,
    enParasMerged: enMerged,
    jpParasMerged: jpMerged,
  };
}

// ---------------------------------------------------------------------------
// Paragraph-level fallback (for hard cases)
// ---------------------------------------------------------------------------

/**
 * Zip aligned paragraph pairs into flat segments WITHOUT sentence splitting.
 * This is the fallback for articles that are too misaligned for sentence-level.
 */
function zipParagraphs(
  paraPairs: Array<[string, string | null]>,
): SegmentWithMeta[] {
  return paraPairs.map(([jp, en], idx) => ({
    source_text: jp,
    target_text: en,
    para_index: idx,
    sent_index: 0,
  }));
}

// ---------------------------------------------------------------------------
// markNeedsReview — tag article for manual review
// ---------------------------------------------------------------------------

async function markNeedsReview(
  sb: SupabaseClient,
  articleId: string,
  existingTags: string[] | null,
): Promise<void> {
  const tag = "needs_manual_review";
  const tags = existingTags ?? [];
  if (tags.includes(tag)) return; // already tagged
  const { error } = await sb
    .from("articles")
    .update({ tags: [...tags, tag] })
    .eq("id", articleId);
  if (error) {
    console.error(`  ⚠ Failed to tag article ${articleId}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// importResegmented — delete-then-insert + update articles + upsert doc_settings
// ---------------------------------------------------------------------------

async function importResegmented(
  sb: SupabaseClient,
  article: ArticleRow,
  segments: SegmentWithMeta[],
  metadata?: Record<string, unknown>,
): Promise<{ ok: true } | { reason: string }> {
  const { id } = article;
  const N = segments.length;

  if (N === 0) return { reason: "No valid segments (all JP sentences were empty)" };

  // 1. DELETE existing segments
  const { error: delErr } = await sb.from("segments").delete().eq("article_id", id);
  if (delErr) return { reason: `DELETE segments failed: ${delErr.message}` };

  // 2. Build segment input list
  const baseMeta = metadata ?? { hierarchical: true };
  const inputs: SegmentInput[] = segments.map((seg, i) => ({
    article_id: id,
    position: i,
    source_text: seg.source_text,
    target_text: seg.target_text,
    status: "qa_approved",
    source_lang: "ja",
    target_lang: "en",
    metadata: {
      ...baseMeta,
      para_index: seg.para_index,
      sent_index: seg.sent_index,
    },
  }));

  // 3. INSERT new segments in batches
  for (let offset = 0; offset < N; offset += SEGMENT_BATCH) {
    const batch = inputs.slice(offset, offset + SEGMENT_BATCH);
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
  const translatedCount = inputs.filter((s) => s.target_text !== null).length;
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
// Check if article has already been segmented hierarchically
// ---------------------------------------------------------------------------

async function isAlreadyDone(sb: SupabaseClient, articleId: string): Promise<boolean> {
  const { data, error } = await sb
    .from("segments")
    .select("metadata")
    .eq("article_id", articleId)
    .eq("position", 0)
    .maybeSingle();

  if (error || !data) return false;

  const meta = data.metadata as Record<string, unknown> | null;
  return meta?.classified === true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const skipAlreadyDone = args.includes("--skip-already-done");

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

  // Parse --max-diff N
  let maxDiff = DEFAULT_MAX_DIFF;
  const maxDiffIdx = args.indexOf("--max-diff");
  if (maxDiffIdx >= 0) {
    const val = args[maxDiffIdx + 1];
    if (val && /^\d+$/.test(val)) {
      maxDiff = Number(val);
    } else {
      console.error("Error: --max-diff requires a positive integer argument.");
      process.exit(1);
    }
  }

  // Parse --max-null-rate 0.XX
  let maxNullRate = DEFAULT_MAX_NULL_RATE;
  const maxNullRateIdx = args.indexOf("--max-null-rate");
  if (maxNullRateIdx >= 0) {
    const val = args[maxNullRateIdx + 1];
    if (val && /^0?\.\d+$/.test(val)) {
      maxNullRate = Number(val);
    } else {
      console.error("Error: --max-null-rate requires a decimal argument (e.g. 0.30).");
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
  // -----------------------------------------------------------------------
  const modeLabel = `${dryRun ? "DRY-RUN " : ""}${limit ? `LIMIT=${limit} ` : ""}${articleId ? `ARTICLE=${articleId} ` : ""}${skipAlreadyDone ? "SKIP-DONE " : ""}`;
  console.log(`[info] ${modeLabel}— smart classifier (maxDiff=${maxDiff}, maxNullRate=${maxNullRate.toFixed(2)})`);
  console.log(`[info] Hard case: para_diff > ${maxDiff} OR null_EN_rate > ${(maxNullRate * 100).toFixed(0)}%`);

  let articles: ArticleRow[];

  if (articleId) {
    const { data, error } = await sb
      .from("articles")
      .select("id, title, content_en, content_ja, segment_count, tags")
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
    articles = [];
    let page = 0;
    const PAGE_SIZE = 100;
    while (true) {
      const query = sb
        .from("articles")
        .select("id, title, content_en, content_ja, segment_count, tags")
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
    console.log(`Found: ${articles.length} bilingual segmented articles to classify.`);
  }

  // Filter out already-done articles if --skip-already-done
  if (skipAlreadyDone) {
    const filtered: ArticleRow[] = [];
    for (const a of articles) {
      if (await isAlreadyDone(sb, a.id)) {
        console.log(`  SKIP (already classified): "${a.title}"`);
      } else {
        filtered.push(a);
      }
    }
    console.log(`After filtering: ${filtered.length} articles to process.`);
    articles = filtered;
  }

  if (articles.length === 0) {
    console.log("Nothing to process.");
    return;
  }

  // -----------------------------------------------------------------------
  // Process articles with smart classifier
  // -----------------------------------------------------------------------
  const results: HierarchicalResult[] = [];
  let totalOldSegments = 0;
  let totalNewSegments = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const label = `[${i + 1}/${articles.length}]`;
    const content_en = article.content_en ?? "";
    const content_ja = article.content_ja ?? "";

    try {
      // ---- Step 1: Paragraph-level alignment ----
      const enParasRaw = splitParagraphs(content_en);
      const jpParasRaw = splitParagraphs(content_ja);
      const enParas = stripJunk(enParasRaw, "en");
      const jpParas = stripJunk(jpParasRaw, "ja");

      const { pairs: paraPairs, jpMerged, enMerged } = alignParagraphs(jpParas, enParas);
      const paraDiff = Math.abs(enMerged - jpMerged);

      // ---- Step 2: Hierarchical sentence split ----
      const hierResult = resegmentHierarchical(content_en, content_ja);
      const nullEn = hierResult.segments.filter(s => s.target_text === null).length;
      const nullEnRate = hierResult.segments.length > 0
        ? nullEn / hierResult.segments.length
        : 0;

      // ---- Step 3: Classify ----
      const isHardCase = paraDiff > maxDiff || nullEnRate > maxNullRate;
      let classification: string;
      let hardReason: string | undefined;
      let finalSegments: SegmentWithMeta[];
      let importMeta: Record<string, unknown>;

      if (isHardCase) {
        classification = "paragraph_kept";
        hardReason = paraDiff > maxDiff ? "high_diff" : "high_null_rate";
        finalSegments = zipParagraphs(paraPairs);
        importMeta = {
          classified: true,
          paragraph_fallback: true,
          hard_reason: hardReason,
          para_diff: paraDiff,
          null_en_rate: nullEnRate,
        };
      } else {
        classification = "hierarchical";
        finalSegments = hierResult.segments;
        importMeta = {
          classified: true,
          hierarchical: true,
          para_diff: paraDiff,
          null_en_rate: nullEnRate,
        };
      }

      const oldSegs = article.segment_count ?? 0;
      const newSegs = finalSegments.length;
      const changeSign = newSegs > oldSegs ? "↑" : newSegs < oldSegs ? "↓" : "=";

      const hardTag = isHardCase ? ` ⚠ ${hardReason}` : "";
      const clsIcon = isHardCase ? "📄" : "🔬";
      console.log(
        `${label} ${dryRun ? "🔍" : clsIcon} ${article.title?.slice(0, 60) ?? "(no title)"}`
        + ` — ${classification}${hardTag}`
        + `\n  Paras: EN=${enParas.length}→${enMerged} JP=${jpParas.length}→${jpMerged}`
        + ` pairs=${paraPairs.length} diff=${paraDiff}`
        + `\n  Sents: JP=${hierResult.totalJpSents} EN=${hierResult.totalEnSents}`
        + ` | nullEN=${nullEn}/${hierResult.segments.length} (${(nullEnRate * 100).toFixed(1)}%)`
        + `\n  Segs: ${oldSegs}→${newSegs} ${changeSign}${Math.abs(newSegs - oldSegs)}`
        + ` (${(newSegs / Math.max(1, paraPairs.length)).toFixed(1)} per para)`,
      );

      // Show first 5 pairs in dry-run mode
      if (dryRun) {
        console.log(`\n  First 5 ${classification === "hierarchical" ? "sentence" : "paragraph"} pairs:`);
        finalSegments.slice(0, 5).forEach((seg, idx) => {
          const jpPreview = seg.source_text.slice(0, 140);
          const enPreview = (seg.target_text ?? "(null)").slice(0, 140);
          const jpSuffix = seg.source_text.length > 140 ? "…" : "";
          const enSuffix = (seg.target_text ?? "").length > 140 ? "…" : "";
          console.log(`  [${idx}] JP: ${jpPreview}${jpSuffix}`);
          console.log(`       EN: ${enPreview}${enSuffix}`);
        });
        if (finalSegments.length > 5) console.log(`  ... and ${finalSegments.length - 5} more pairs`);
      }

      console.log(""); // blank line between articles

      const result: HierarchicalResult = {
        id: article.id,
        title: article.title,
        oldSegments: oldSegs,
        newSegments: newSegs,
        paraPairs: paraPairs.length,
        totalJpSents: hierResult.totalJpSents,
        totalEnSents: hierResult.totalEnSents,
        nullEn,
        nullEnRate,
        enParasRaw: enParas.length,
        jpParasRaw: jpParas.length,
        enParasMerged: enMerged,
        jpParasMerged: jpMerged,
        paraDiff,
        classification,
        hardReason,
      };

      results.push(result);
      totalOldSegments += oldSegs;
      totalNewSegments += newSegs;

      // Import if not dry-run
      if (!dryRun) {
        const importResult = await importResegmented(sb, article, finalSegments, importMeta);
        if ("reason" in importResult) {
          console.error(`  ✗ Import failed: ${importResult.reason}`);
          result.reason = importResult.reason;
        } else {
          if (isHardCase) {
            await markNeedsReview(sb, article.id, article.tags ?? null);
            console.log(`  ✓ DB updated (paragraphs) + tagged needs_manual_review.`);
          } else {
            console.log(`  ✓ DB updated (hierarchical sentences).`);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${label} ✗ ERROR: ${msg}\n`);
      results.push({
        id: article.id,
        title: article.title,
        oldSegments: article.segment_count ?? 0,
        newSegments: 0,
        paraPairs: 0,
        totalJpSents: 0,
        totalEnSents: 0,
        nullEn: 0,
        nullEnRate: 0,
        enParasRaw: 0,
        jpParasRaw: 0,
        enParasMerged: 0,
        jpParasMerged: 0,
        paraDiff: 0,
        classification: "error",
        reason: msg,
      });
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  const succeeded = results.filter((r) => !r.reason);
  const failed = results.filter((r) => r.reason);
  const hierarchical = succeeded.filter((r) => r.classification === "hierarchical");
  const paraKept = succeeded.filter((r) => r.classification === "paragraph_kept");
  const hardDiff = paraKept.filter((r) => r.hardReason === "high_diff");
  const hardNull = paraKept.filter((r) => r.hardReason === "high_null_rate");

  const summaryTitle = dryRun ? "DRY-RUN" : "EXECUTED";

  console.log(`${"=".repeat(70)}`);
  console.log(`Classification Summary: ${summaryTitle}`);
  console.log(`  Thresholds:           maxDiff=${maxDiff}, maxNullRate=${maxNullRate.toFixed(2)}`);
  console.log(`  Articles processed:   ${results.length}`);
  console.log(`  Succeeded:            ${succeeded.length}`);
  console.log(`  Failed:               ${failed.length}`);
  console.log(`  --- Classification ---`);
  console.log(`  Hierarchical (good):  ${hierarchical.length}`);
  console.log(`  Paragraph kept (hard): ${paraKept.length}`);
  console.log(`    - high_diff (>${maxDiff}): ${hardDiff.length}`);
  console.log(    `  - high_null_rate (>${(maxNullRate * 100).toFixed(0)}%): ${hardNull.length}`);
  console.log(`  --- Segment counts ---`);
  console.log(`  Total old segments:   ${totalOldSegments}`);
  console.log(`  Total new segments:   ${totalNewSegments}`);

  if (succeeded.length > 0) {
    const avgOld = Math.round(totalOldSegments / succeeded.length);
    const avgNew = Math.round(totalNewSegments / succeeded.length);
    const avgNullRate = succeeded.reduce((s, r) => s + r.nullEnRate, 0) / succeeded.length;

    console.log(`  --- Per-article averages ---`);
    console.log(`  Avg old segments:     ${avgOld}`);
    console.log(`  Avg new segments:     ${avgNew} (${(avgNew / Math.max(1, avgOld)).toFixed(1)}x)`);
    console.log(`  Avg null EN rate:     ${(avgNullRate * 100).toFixed(1)}%`);
    console.log(`  Avg para diff:        ${Math.round(succeeded.reduce((s, r) => s + r.paraDiff, 0) / succeeded.length)}`);

    if (hierarchical.length > 0) {
      const hAvgNew = Math.round(hierarchical.reduce((s, r) => s + r.newSegments, 0) / hierarchical.length);
      const hAvgNull = hierarchical.reduce((s, r) => s + r.nullEnRate, 0) / hierarchical.length;
      console.log(`  --- Hierarchical only (${hierarchical.length} articles) ---`);
      console.log(`  Avg new segments:     ${hAvgNew}`);
      console.log(`  Avg null EN rate:     ${(hAvgNull * 100).toFixed(1)}%`);
    }

    if (paraKept.length > 0) {
      const pAvgNew = Math.round(paraKept.reduce((s, r) => s + r.newSegments, 0) / paraKept.length);
      const pAvgDiff = Math.round(paraKept.reduce((s, r) => s + r.paraDiff, 0) / paraKept.length);
      const pAvgNull = paraKept.reduce((s, r) => s + r.nullEnRate, 0) / paraKept.length;
      console.log(`  --- Paragraph-kept only (${paraKept.length} articles) ---`);
      console.log(`  Avg new segments:     ${pAvgNew}`);
      console.log(`  Avg para diff:        ${pAvgDiff}`);
      console.log(`  Avg null EN rate:     ${(pAvgNull * 100).toFixed(1)}%`);
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
