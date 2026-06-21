/**
 * Segment bilingual kendojidai.com articles from the `articles` table
 * into the `segments` table so they appear in the /documents reader/editor.
 *
 * Targets articles WHERE:
 *   content_en IS NOT NULL
 *   AND content_ja IS NOT NULL
 *   AND segmented = false
 *
 * Algorithm per article:
 *   1. Split content_en and content_ja into paragraphs on \n\n
 *   2. Strip junk paragraphs (Tweet/Pocket/date-headers/copyright notices)
 *   3. Zip with padding: N = max(len), pair by index;
 *      drop entries where JP is empty, keep if EN is null
 *   4. DELETE existing segments for the article, then INSERT new ones
 *      (batches of 200)
 *   5. UPDATE articles: segmented=true, segment_count=N, translation_status='qa_approved'
 *   6. UPSERT document_settings: paragraph_boundaries=[0..N-1], source_lang=ja, target_lang=en
 *
 * Usage:
 *   npx tsx scripts/segment-kendojidai-bilingual.ts --dry-run          # show what would happen
 *   npx tsx scripts/segment-kendojidai-bilingual.ts --dry-run --limit 5 # show first 5
 *   npx tsx scripts/segment-kendojidai-bilingual.ts --inspect           # print raw paras for 3 articles
 *   npx tsx scripts/segment-kendojidai-bilingual.ts                     # run all
 *   npx tsx scripts/segment-kendojidai-bilingual.ts --limit 10          # pilot first 10
 *   npx tsx scripts/segment-kendojidai-bilingual.ts --article-id UUID   # single article
 */

import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENV_PATH = ".env.local";
const SEGMENT_BATCH = 200; // insert segments in batches of this size
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
  source_text: string;   // Japanese
  target_text: string | null; // English
  status: string;
  source_lang: string;
  target_lang: string;
  metadata: Record<string, unknown>;
}

interface ImportResult {
  id: string;
  title: string | null;
  count: number;
  skipped: number;    // entries dropped because JP was empty
  reason?: string;     // set on failure
}

interface Summary {
  processed: number;
  totalSegments: number;
  failed: ImportResult[];
  largeMismatches: { id: string; title: string | null; enCount: number; jpCount: number }[];
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

// ---------------------------------------------------------------------------
// Alignment
// ---------------------------------------------------------------------------

interface AlignedPair {
  jp: string;       // Japanese paragraph (always present)
  en: string | null; // English paragraph (can be null)
}

/**
 * Zip JP and EN paragraphs by index. Pad the shorter array with nulls.
 * Drop entries where JP is empty/null.
 * N = max(jp.length, en.length).
 */
function alignParas(jp: string[], en: string[]): AlignedPair[] {
  const N = Math.max(jp.length, en.length);
  const result: AlignedPair[] = [];
  for (let i = 0; i < N; i++) {
    const jpText = jp[i] ?? null;
    const enText = en[i] ?? null;
    // Drop if JP is empty/null — we never want a segment without source_text
    if (!jpText) continue;
    result.push({ jp: jpText, en: enText });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Import one article
// ---------------------------------------------------------------------------

async function importArticle(
  sb: SupabaseClient,
  article: ArticleRow,
  dryRun: boolean,
): Promise<ImportResult> {
  const { id, title, content_en, content_ja } = article;

  // 1. Split + strip
  const enParasRaw = splitParagraphs(content_en ?? "");
  const jpParasRaw = splitParagraphs(content_ja ?? "");
  const enParas = stripJunk(enParasRaw, "en");
  const jpParas = stripJunk(jpParasRaw, "ja");

  // 2. Align
  const aligned = alignParas(jpParas, enParas);
  const N = aligned.length;
  const skipped = Math.max(jpParas.length, enParas.length) - N;

  if (N === 0) {
    return { id, title, count: 0, skipped, reason: "No aligned paragraphs after stripping" };
  }

  if (dryRun) {
    return { id, title, count: N, skipped };
  }

  // 3. DELETE existing segments for this article
  const { error: delErr } = await sb.from("segments").delete().eq("article_id", id);
  if (delErr) {
    return { id, title, count: 0, skipped, reason: `DELETE segments failed: ${delErr.message}` };
  }

  // 4. INSERT new segments in batches
  const segments: SegmentInput[] = aligned.map((pair, i) => ({
    article_id: id,
    position: i,
    source_text: pair.jp,
    target_text: pair.en,
    status: "qa_approved",
    source_lang: "ja",
    target_lang: "en",
    metadata: {
      imported_from_kendojidai: true,
      paragraph_count_en: enParas.length,
      paragraph_count_ja: jpParas.length,
    },
  }));

  for (let offset = 0; offset < segments.length; offset += SEGMENT_BATCH) {
    const batch = segments.slice(offset, offset + SEGMENT_BATCH);
    const { error: segErr } = await sb.from("segments").insert(batch);
    if (segErr) {
      return {
        id,
        title,
        count: 0,
        skipped,
        reason: `INSERT segments failed at offset=${offset}: ${segErr.message}`,
      };
    }
  }

  // 5. UPDATE articles
  const { error: artErr } = await sb
    .from("articles")
    .update({ segmented: true, segment_count: N, translation_status: "qa_approved" })
    .eq("id", id);
  if (artErr) {
    return {
      id,
      title,
      count: 0,
      skipped,
      reason: `UPDATE articles failed: ${artErr.message}`,
    };
  }

  // 6. UPSERT document_settings
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
  if (dsErr) {
    return {
      id,
      title,
      count: N, // segments were already inserted
      skipped,
      reason: `UPSERT document_settings failed (segments inserted): ${dsErr.message}`,
    };
  }

  return { id, title, count: N, skipped };
}

// ---------------------------------------------------------------------------
// Inspect mode: print raw + stripped paragraphs for debugging junk patterns
// ---------------------------------------------------------------------------

async function inspectArticles(sb: SupabaseClient, limit: number): Promise<void> {
  console.log(`[inspect] Fetching up to ${limit} bilingual unsegmented articles...\n`);
  const { data, error } = await sb
    .from("articles")
    .select("id, title, content_en, content_ja")
    .not("content_en", "is", null)
    .not("content_ja", "is", null)
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
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Article: ${article.title} (${article.id})`);
    console.log(`${"=".repeat(70)}`);

    // Raw paragraphs
    const enRaw = splitParagraphs(article.content_en ?? "");
    const jpRaw = splitParagraphs(article.content_ja ?? "");
    console.log(`\nEN raw (${enRaw.length} paragraphs):`);
    enRaw.forEach((p, i) => console.log(`  [${i}] ${p.slice(0, 120)}${p.length > 120 ? "…" : ""}`));
    console.log(`\nJP raw (${jpRaw.length} paragraphs):`);
    jpRaw.forEach((p, i) => console.log(`  [${i}] ${p.slice(0, 120)}${p.length > 120 ? "…" : ""}`));

    // Stripped
    const enClean = stripJunk(enRaw, "en");
    const jpClean = stripJunk(jpRaw, "ja");
    console.log(`\nEN stripped (${enClean.length} paragraphs):`);
    enClean.forEach((p, i) => console.log(`  [${i}] ${p.slice(0, 120)}${p.length > 120 ? "…" : ""}`));
    console.log(`\nJP stripped (${jpClean.length} paragraphs):`);
    jpClean.forEach((p, i) => console.log(`  [${i}] ${p.slice(0, 120)}${p.length > 120 ? "…" : ""}`));

    // Aligned
    const aligned = alignParas(jpClean, enClean);
    console.log(`\nAligned: ${aligned.length} pairs (skipped ${Math.max(enClean.length, jpClean.length) - aligned.length})`);
    aligned.slice(0, 5).forEach((pair, i) => {
      console.log(`  [${i}] JP: ${pair.jp.slice(0, 80)}${pair.jp.length > 80 ? "…" : ""}`);
      console.log(`       EN: ${(pair.en ?? "(null)").slice(0, 80)}${(pair.en ?? "").length > 80 ? "…" : ""}`);
    });
    if (aligned.length > 5) console.log(`  ... and ${aligned.length - 5} more pairs`);
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
    console.error(
      "FATAL: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local",
    );
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // -----------------------------------------------------------------------
  // Inspect mode — print raw/stripped/aligned paragraphs
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
    `[info]${dryRun ? " DRY-RUN" : ""}${limit ? ` LIMIT=${limit}` : ""}${articleId ? ` ARTICLE=${articleId}` : ""}`
    + " — processing bilingual unsegmented articles.",
  );

  let articles: ArticleRow[];

  if (articleId) {
    // Single article mode
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
      console.error(`FATAL: article ${articleId} is not bilingual (missing content_en or content_ja).`);
      process.exit(1);
    }
    articles = [data as ArticleRow];
    console.log(`Found: 1 specific article (${(data as ArticleRow).title})`);
  } else {
    // Paginate through all matching articles
    articles = [];
    let page = 0;
    const PAGE_SIZE = 100;
    while (true) {
      const query = sb
        .from("articles")
        .select("id, title, content_en, content_ja")
        .not("content_en", "is", null)
        .not("content_ja", "is", null)
        .eq("segmented", false)
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
    console.log(`Found: ${articles.length} articles to process.`);
  }

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
    largeMismatches: [],
  };

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const label = `[${i + 1}/${articles.length}]`;

    try {
      const result = await importArticle(sb, article, dryRun);
      if (result.reason) {
        console.log(`${label} ✗ ${result.title ?? "(no title)"} — ${result.reason}`);
        summary.failed.push(result);
        continue;
      }

      // Check for large en/jp count mismatch
      const enCount = splitParagraphs(article.content_en ?? "").length;
      const jpCount = splitParagraphs(article.content_ja ?? "").length;
      const mismatch = Math.abs(enCount - jpCount);

      console.log(
        `${label} ✓ ${result.title ?? "(no title)"} — ${result.count} segments`
        + ` (en=${enCount}, jp=${jpCount}${mismatch > 5 ? ` ⚠ mismatch=${mismatch}` : ""})`,
      );

      summary.processed++;
      summary.totalSegments += result.count;

      if (mismatch > 5) {
        summary.largeMismatches.push({
          id: result.id,
          title: result.title,
          enCount,
          jpCount,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${label} ✗ ${article.title ?? "(no title)"} — ERROR: ${msg}`);
      summary.failed.push({ id: article.id, title: article.title, count: 0, skipped: 0, reason: msg });
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log(
    `\n${"=".repeat(60)}\nSummary:\n`
    + `  Processed: ${summary.processed}${dryRun ? " (dry-run)" : ""}\n`
    + `  Total segments: ${summary.totalSegments}\n`
    + `  Failed: ${summary.failed.length}`,
  );
  if (summary.failed.length > 0) {
    console.log("  Failed articles:");
    for (const f of summary.failed) {
      console.log(`    ${f.id} — ${f.reason}`);
    }
  }
  if (summary.largeMismatches.length > 0) {
    console.log(`  Large paragraph-count mismatches (>5): ${summary.largeMismatches.length}`);
    for (const m of summary.largeMismatches) {
      console.log(`    ${m.id} "${m.title}" — en=${m.enCount}, jp=${m.jpCount}`);
    }
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(99);
});
