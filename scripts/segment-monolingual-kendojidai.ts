/**
 * Segment monolingual (EN-only and JP-only) kendojidai.com articles from the
 * `articles` table into the `segments` table.
 *
 * Targets articles WHERE:
 *   (content_en IS NOT NULL AND content_ja IS NULL AND segmented = false)  -- EN-only
 *   OR
 *   (content_ja IS NOT NULL AND content_en IS NULL AND segmented = false)  -- JP-only
 *
 * No alignment needed — paragraph splitting + junk removal only.
 *
 * Algorithm per article:
 *   1. Read the non-null content (content_en or content_ja)
 *   2. Split into paragraphs on \n\n+
 *   3. Strip junk paragraphs (enhanced patterns from resegment-hierarchical.ts
 *      + additional patterns identified across sessions)
 *   4. Filter very short paragraphs (< 10 chars after trim)
 *   5. Create segments: source_text = paragraph, target_text = null
 *      status = 'qa_approved'
 *      metadata: { monolingual: true, lang: 'en'|'jp', source: 'kendojidai_monolingual' }
 *   6. INSERT segments in batches of 200
 *   7. UPDATE articles: segmented=true, segment_count=N, translation_status='qa_approved'
 *   8. UPSERT document_settings
 *
 * Usage:
 *   npx tsx scripts/segment-monolingual-kendojidai.ts --dry-run           # show what would happen
 *   npx tsx scripts/segment-monolingual-kendojidai.ts --dry-run --limit 10
 *   npx tsx scripts/segment-monolingual-kendojidai.ts                     # run all
 *   npx tsx scripts/segment-monolingual-kendojidai.ts --limit 10          # pilot first 10
 *   npx tsx scripts/segment-monolingual-kendojidai.ts --inspect --limit 3 # print raw/stripped
 */

import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENV_PATH = ".env.local";
const SEGMENT_BATCH = 200; // insert segments in batches of this size
const MIN_PARAGRAPH_CHARS = 10; // drop paragraphs shorter than this after trimming

/**
 * EN junk patterns — comprehensive set derived from:
 *   scripts/resegment-hierarchical.ts
 *   scripts/fix-5-large-mismatch-articles.ts
 *   + additional patterns from monolingual investigation
 */
const EN_JUNK: RegExp[] = [
  /^Tweet$/i,
  /^Pocket$/i,
  /^FREE\s+ARTICLE$/i,
  // Date headers: "KENDOJIDAI 2020.3" (KENDOJIDAI before date)
  /^KENDOJIDAI\s+\d{4}\.\d{1,2}/i,
  // Date headers: "June 2020 | KENDOJIDAI" (month-name before date)
  /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|Jun\.?|Jul\.?|Aug\.?|Sep\.?|Oct\.?|Nov\.?|Dec\.?)\s+\d{4}\s*\|?\s*KENDOJIDAI/i,
  // Date headers: "2020.3 KENDOJIDAI" (date before KENDOJIDAI)
  /^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/i,
  // Credit lines
  /^Photography\s*:/i,
  /^(Text\s*(&|and)\s*Composition|Composition)\s*:/i,
  /^Interview\s+(Taken\s+)?[Bb]y/i,
  /^Moderator\s*:/i,
  /^Translation\s*[：=:]/i,
  // COVID / editorial notes
  /^\*This article/i,
  // Copyright / legal
  /^\*Unauthorized\s+reproduction/i,
  /^\*?\s*The\s+images?\s+(featured|in|appearing)\s+in\s+this\s+article/i,
  // Standalone URLs (social media share links etc.)
  /^https?:\/\//,
  // Whitespace-only
  /^\s*$/,
];

/**
 * JP junk patterns — comprehensive set derived from:
 *   scripts/resegment-hierarchical.ts
 *   scripts/fix-5-large-mismatch-articles.ts
 *   + additional patterns from monolingual investigation
 */
const JP_JUNK: RegExp[] = [
  /^Tweet$/i,
  /^Pocket$/i,
  /^FREE\s+ARTICLE$/i,
  /^無料記事$/i,
  // Date headers: "2020.3 KENDOJIDAI"
  /^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/,
  // Credit / byline lines
  /^(写真)?撮影\s*[＝=：:]/i,
  /^写真\s*[＝=：:]/,
  /^構成\s*[＝=：:]/,
  /^取材\s*[＝=：:]/i,
  /^文\s*[＝=：:]/i,
  /^翻訳\s*[＝=：:]/i,
  /^司会\s*[＝=：:]/i,
  /^協力\s*[＝=：:]/,
  // Editorial / disclaimer lines
  /^※こ(の記事|のインタビュー|の連載)は/,
  /^\*この記事は/,
  /^\*本記事に掲載された画像の無断転載/,
  /^\*本記事に掲載.+を固く禁じます/,
  // Magazine issue headers
  /^剣道時代.*号[　\s]*[』」].*掲載/,
  /^[『「]剣道時代.*号[』」]/,
  // Navigation / series links
  /^関連$/,
  /^第[一二三四五六七八九十百千0-9]+回[はへ]こちら$/,
  /^第[一二三四五六七八九十百千0-9]+回[にへ]続く$/,
  // Standalone URLs
  /^https?:\/\//,
  // Whitespace-only
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

interface ImportResult {
  id: string;
  title: string | null;
  lang: string;
  rawCount: number;     // paragraphs before junk stripping
  cleanedCount: number;  // after junk stripping
  finalCount: number;    // after short-paragraph filter
  reason?: string;
}

interface Summary {
  processed: number;
  totalSegments: number;
  failed: ImportResult[];
}

// ---------------------------------------------------------------------------
// Env loading (same pattern as import-kendojidai-bilingual.ts)
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

/** Normalize CRLF → LF, split on 2+ newlines, trim each paragraph, filter empty. */
function splitParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n");
  return normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Remove paragraphs that match any of the junk patterns for this language. */
function stripJunk(paras: string[], lang: "en" | "ja"): string[] {
  const patterns = lang === "en" ? EN_JUNK : JP_JUNK;
  return paras.filter((p) => !patterns.some((re) => re.test(p)));
}

/** Remove paragraphs that are shorter than MIN_PARAGRAPH_CHARS after trimming. */
function filterShortParas(paras: string[]): string[] {
  return paras.filter((p) => p.trim().length >= MIN_PARAGRAPH_CHARS);
}

// ---------------------------------------------------------------------------
// Segment one article
// ---------------------------------------------------------------------------

async function segmentArticle(
  sb: SupabaseClient,
  article: ArticleRow,
  dryRun: boolean,
): Promise<ImportResult> {
  const { id, title, content_en, content_ja } = article;

  // Determine language and content
  const isEn = content_en !== null && content_ja === null;
  const isJa = content_ja !== null && content_en === null;
  if (!isEn && !isJa) {
    return { id, title, lang: "unknown", rawCount: 0, cleanedCount: 0, finalCount: 0, reason: "Not monolingual" };
  }

  const lang = isEn ? "en" : "ja";
  const content = (isEn ? content_en : content_ja) as string;

  // 1. Split
  const rawParas = splitParagraphs(content);
  const rawCount = rawParas.length;

  // 2. Strip junk
  const cleanedParas = stripJunk(rawParas, lang);
  const cleanedCount = cleanedParas.length;

  // 3. Filter short paragraphs
  const finalParas = filterShortParas(cleanedParas);
  const N = finalParas.length;

  if (N === 0) {
    return {
      id, title, lang, rawCount, cleanedCount, finalCount: 0,
      reason: "No paragraphs after junk stripping + short filter",
    };
  }

  if (dryRun) {
    return { id, title, lang, rawCount, cleanedCount, finalCount: N };
  }

  // 4. DELETE existing segments for this article (idempotent)
  const { error: delErr } = await sb.from("segments").delete().eq("article_id", id);
  if (delErr) {
    return {
      id, title, lang, rawCount, cleanedCount, finalCount: 0,
      reason: `DELETE segments failed: ${delErr.message}`,
    };
  }

  // 5. INSERT new segments in batches
  const sourceLang = isEn ? "en" : "ja";
  const targetLang = isEn ? "ja" : "en";

  const segments: SegmentInput[] = finalParas.map((para, i) => ({
    article_id: id,
    position: i,
    source_text: para,
    target_text: null,
    status: "qa_approved",
    source_lang: sourceLang,
    target_lang: targetLang,
    metadata: {
      monolingual: true,
      lang: sourceLang,
      source: "kendojidai_monolingual",
    },
  }));

  for (let offset = 0; offset < segments.length; offset += SEGMENT_BATCH) {
    const batch = segments.slice(offset, offset + SEGMENT_BATCH);
    const { error: segErr } = await sb.from("segments").insert(batch);
    if (segErr) {
      return {
        id, title, lang, rawCount, cleanedCount, finalCount: 0,
        reason: `INSERT segments failed at offset=${offset}: ${segErr.message}`,
      };
    }
  }

  // 6. UPDATE articles
  const { error: artErr } = await sb
    .from("articles")
    .update({ segmented: true, segment_count: N, translation_status: "qa_approved" })
    .eq("id", id);
  if (artErr) {
    return {
      id, title, lang, rawCount, cleanedCount, finalCount: 0,
      reason: `UPDATE articles failed: ${artErr.message}`,
    };
  }

  // 7. UPSERT document_settings
  const boundaries = Array.from({ length: N }, (_, i) => i);
  const { error: dsErr } = await sb
    .from("document_settings")
    .upsert(
      {
        article_id: id,
        source_lang: sourceLang,
        target_lang: targetLang,
        paragraph_boundaries: boundaries,
        total_segments: N,
        translated_count: N,
        reviewed_count: 0,
        approved_count: N,
        assigned_translators: [],
      },
      { onConflict: "article_id" },
    );
  if (dsErr) {
    return {
      id, title, lang, rawCount, cleanedCount, finalCount: N,
      reason: `UPSERT document_settings failed (segments inserted): ${dsErr.message}`,
    };
  }

  return { id, title, lang, rawCount, cleanedCount, finalCount: N };
}

// ---------------------------------------------------------------------------
// Inspect mode: print raw/stripped paragraphs for debugging junk patterns
// ---------------------------------------------------------------------------

async function inspectArticles(sb: SupabaseClient, limit: number): Promise<void> {
  console.log(`[inspect] Fetching up to ${limit} monolingual unsegmented articles...\n`);

  const { data, error } = await sb
    .from("articles")
    .select("id, title, content_en, content_ja")
    .or("content_en.not.is.null,content_ja.not.is.null")
    .eq("segmented", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error(`[inspect] Query error: ${error.message}`);
    return;
  }
  if (!data || data.length === 0) {
    console.log("[inspect] No matching articles found.");
    return;
  }

  for (const article of data as ArticleRow[]) {
    const isEn = article.content_en !== null && article.content_ja === null;
    const lang = isEn ? "en" : "ja";
    const content = (isEn ? article.content_en : article.content_ja) as string;

    console.log(`\n${"=".repeat(70)}`);
    console.log(`Article: ${article.title} (${article.id.slice(0, 8)}…) [${lang.toUpperCase()}]`);
    console.log(`${"=".repeat(70)}`);

    const rawParas = splitParagraphs(content);
    const cleanedParas = stripJunk(rawParas, lang);
    const finalParas = filterShortParas(cleanedParas);

    console.log(`\nRaw (${rawParas.length} paragraphs):`);
    rawParas.forEach((p, i) => {
      const marker = !cleanedParas.includes(p) ? " [JUNK]" : "";
      console.log(`  [${i}]${marker} ${p.slice(0, 120)}${p.length > 120 ? "…" : ""}`);
    });

    console.log(`\nCleaned + short-filtered (${finalParas.length} paragraphs):`);
    finalParas.forEach((p, i) => {
      console.log(`  [${i}] ${p.slice(0, 150)}${p.length > 150 ? "…" : ""}`);
    });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const inspect = args.includes("--inspect");

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

  // -----------------------------------------------------------------------
  // Environment & DB
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
  // Inspect mode — print raw/stripped paragraphs
  // -----------------------------------------------------------------------
  if (inspect) {
    await inspectArticles(sb, limit ?? 3);
    console.log("\nDone.");
    return;
  }

  // -----------------------------------------------------------------------
  // Fetch articles to process
  // -----------------------------------------------------------------------
  console.log(
    `[info]${dryRun ? " DRY-RUN" : ""}${limit ? ` LIMIT=${limit}` : ""}`
    + " — processing monolingual unsegmented articles.",
  );

  // Paginate through all matching articles
  const articles: ArticleRow[] = [];
  let page = 0;
  const PAGE_SIZE = 100;

  while (true) {
    const { data, error } = await sb
      .from("articles")
      .select("id, title, content_en, content_ja")
      // Match: (en NOT null AND ja IS null AND segmented=false)
      //       OR (ja NOT null AND en IS null AND segmented=false)
      .or(
        "and(content_en.not.is.null,content_ja.is.null,segmented.eq.false)," +
        "and(content_ja.not.is.null,content_en.is.null,segmented.eq.false)",
      )
      .order("created_at", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error(`FATAL: articles query failed: ${error.message}`);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    articles.push(...(data as ArticleRow[]));
    if (limit && articles.length >= limit) {
      articles.splice(limit);
      break;
    }
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`Found: ${articles.length} articles to process.`);

  // Quick language breakdown
  const enOnlyCount = articles.filter((a) => a.content_en !== null && a.content_ja === null).length;
  const jpOnlyCount = articles.filter((a) => a.content_ja !== null && a.content_en === null).length;
  console.log(`  EN-only: ${enOnlyCount}, JP-only: ${jpOnlyCount}`);

  if (articles.length === 0) {
    console.log("Nothing to process.");
    return;
  }

  // -----------------------------------------------------------------------
  // Process articles
  // -----------------------------------------------------------------------
  const summary: Summary = {
    processed: 0,
    totalSegments: 0,
    failed: [],
  };

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const label = `[${i + 1}/${articles.length}]`;

    try {
      const result = await segmentArticle(sb, article, dryRun);
      if (result.reason) {
        console.log(
          `${label} ✗ ${result.title ?? "(no title)"} [${result.lang}]`
          + ` — ${result.reason}`,
        );
        summary.failed.push(result);
        continue;
      }

      const jpct =
        result.rawCount > 0
          ? `(junk=${result.rawCount - result.cleanedCount}, short=${result.cleanedCount - result.finalCount})`
          : "";

      console.log(
        `${label} ✓ ${result.title ?? "(no title)"} [${result.lang}]`
        + ` — ${result.finalCount} segments ${jpct}`
        + ` (raw=${result.rawCount} → cleaned=${result.cleanedCount} → final=${result.finalCount})`,
      );

      summary.processed++;
      summary.totalSegments += result.finalCount;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${label} ✗ ${article.title ?? "(no title)"} — ERROR: ${msg}`);
      summary.failed.push({
        id: article.id,
        title: article.title,
        lang: "?",
        rawCount: 0,
        cleanedCount: 0,
        finalCount: 0,
        reason: msg,
      });
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log(
    `\n${"=".repeat(60)}\nSummary:\n`
    + `  Processed: ${summary.processed}${dryRun ? " (dry-run)" : ""}\n`
    + `  Total segments: ${summary.totalSegments}\n`
    + `  Failed: ${summary.failed.length}\n`
    + `  Avg segments/article: ${summary.processed > 0 ? (summary.totalSegments / summary.processed).toFixed(1) : "N/A"}`,
  );
  if (summary.failed.length > 0) {
    console.log("  Failed articles:");
    for (const f of summary.failed) {
      console.log(`    ${f.id.slice(0, 8)}… — ${f.reason}`);
    }
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(99);
});
