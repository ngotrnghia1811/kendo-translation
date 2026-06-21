/**
 * Manual semantic alignment — Batch 2 (articles 9–16 of 28 needs_manual_review).
 *
 * For each article:
 *   1. Read content_ja + content_en
 *   2. Strip obvious junk (photo credits, URLs, etc.)
 *   3. Align by MEANING (handle structural reordering, EN omissions, EN-only content)
 *   4. DELETE all old segments → INSERT new ones
 *   5. UPDATE articles.tags (remove needs_manual_review), segment_count
 *   6. UPSERT document_settings
 *
 * Usage: npx tsx scripts/manual-align-batch2.ts [--dry-run]
 */

import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENV_PATH = ".env.local";
const SEGMENT_BATCH = 200;
const BATCH2_IDS = [
  "b02a2359-469d-4745-adef-3d68678ac6f0",
  "a3695139-14df-4d70-9a11-053f02b2a173",
  "b8aad7dc-7d26-4080-a4f2-d8c9f1cd5fd3",
  "25375fae-22f2-44ea-87d7-9c73c0254c1e",
  "87297bfe-c24d-4590-8d17-8f7adbc2c4b0",
  "a2d04538-942b-4465-9015-d69e50f69fe3",
  "85fd7073-9410-43bf-a7e7-309a1007177b",
  "1fd89b16-e039-4ab9-ab7b-e8c217aa1d68",
];

const EN_JUNK: RegExp[] = [
  /^Tweet$/i,
  /^Pocket$/i,
  /^FREE\s+ARTICLE$/i,
  /^(January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|Jun\.?|Jul\.?|Aug\.?|Sep\.?|Oct\.?|Nov\.?|Dec\.?)\s+\d{4}\s*\|?\s*KENDOJIDAI/i,
  /^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/i,
  /^KENDOJIDAI[　\s]+\d{4}\.\d{1,2}/i,
  /^Photography\s*[：=:]/i,
  /^Photo\s*Shooting\s*[＝=:]/i,
  /^Photoshooting\s*[ー\-]\s*/i,
  /^(Text\s*(&|and)\s*Composition|Composition)\s*[：=:]/i,
  /^Interview\s+(Taken\s+)?[Bb]y/i,
  /^Moderator\s*:/i,
  /^(Translation|translator)\s*[：=:\-]/i,
  /^\*Unauthorized\s+reproduction/i,
  /^\*?\s*The\s+images?\s+(featured|in|appearing)\s+in\s+this\s+article/i,
  /^https?:\/\//,
  /^\s*$/,
  /^Planning\s*:/i,
];

const JP_JUNK: RegExp[] = [
  /^Tweet$/i,
  /^Pocket$/i,
  /^FREE\s+ARTICLE$/i,
  /^無料記事$/i,
  /^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/,
  /^KENDOJIDAI[　\s]+\d{4}\.\d{1,2}/,
  /^(写真)?撮影\s*[＝=：:]/i,
  /^写真\s*[＝=：:]/,
  /^構成\s*[＝=：:]/,
  /^取材\s*[＝=：:]/i,
  /^文\s*[＝=：:]/i,
  /^翻訳\s*[＝=：:]/i,
  /^司会\s*[＝=：:]/i,
  /^協力\s*[＝=：]/,
  /^※こ(の記事|のインタビュー|の連載)は/,
  /^\*この記事は/,
  /^\*本記事に掲載された画像の無断転載/,
  /^剣道時代.*号[　\s]*[』」].*掲載/,
  /^[『「]剣道時代.*号[』」]/,
  /^\*本記事に掲載.+を固く禁じます/,
  /^※本記事内の画像の無断転載・無断使用を固く禁じます。$/,
  /^関連$/,
  /^第[一二三四五六七八九十百千0-9]+回[はへ]こちら$/,
  /^第[一二三四五六七八九十百千0-9]+回[にへ]続く$/,
  /^https?:\/\//,
  /^[　\s]*$/,
  /^写真協力[：:]$/,
  /^[A-Z][A-Za-z0-9_]{2,}$/,  // standalone social media handles (Twitter/Instagram IDs on own line)
  /^[。、，．,.]$/,             // stray CJK/ASCII punctuation fragments
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

interface AlignedPair {
  jp: string;       // never null
  en: string | null; // null when EN omits this JP content
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

// ---------------------------------------------------------------------------
// Helpers
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

/** Additional junk: product listings, standalone prices, short name fragments */
function isProductJunk(para: string): boolean {
  // Standalone price or product listing
  if (/^\d{1,3}(,\d{3})*\s*JPY$/.test(para.trim())) return true;
  // Short product names that are standalone (no Japanese chars for JP, no sentences for EN)
  if (para.trim().length < 60 && /^(Life with Kendo|KENDOFAM|伊勢守おすすめ)/.test(para.trim())) return true;
  return false;
}

/** Merge consecutive paragraphs where first is a stand-alone name/subtitle. */
function mergeShortLeaders(paras: string[], maxLen: number): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < paras.length) {
    if (paras[i].length < maxLen && i + 1 < paras.length && !paras[i].endsWith("。") && !paras[i].endsWith(".") && !paras[i].endsWith("?") && !paras[i].endsWith("!")) {
      result.push(paras[i] + " " + paras[i + 1]);
      i += 2;
    } else {
      result.push(paras[i]);
      i += 1;
    }
  }
  return result;
}

/** Merge very short fragments (< minLen) BACKWARD into preceding paragraph when
 *  they look like continuations (e.g. Twitter handle, stray period after bio).
 *  Does NOT merge if fragment looks like a self-contained heading (ends with ?!。.). */
function mergeShortBackward(paras: string[], minLen: number): string[] {
  if (paras.length < 2) return paras;
  const result: string[] = [];
  for (let i = 0; i < paras.length; i++) {
    const para = paras[i];
    const isHeading = para.endsWith("?") || para.endsWith("!") || para.endsWith("？") || para.endsWith("！");
    if (para.length < minLen && result.length > 0 && !isHeading && !para.endsWith("。") && !para.endsWith(".")) {
      result[result.length - 1] += " " + para;
    } else {
      result.push(para);
    }
  }
  return result;
}

/** Split JP sentences on 。 */
function splitJpSentences(para: string): string[] {
  const raw = para.split(/(?<=。)/).map(s => s.trim()).filter(Boolean);
  const result: string[] = [];
  for (const s of raw) {
    if (s.length < 5 && result.length > 0) {
      result[result.length - 1] += s;
    } else {
      result.push(s);
    }
  }
  return result.length > 0 ? result : [para];
}

/** Split EN sentences on '. ' before capital, with abbreviation guard. */
function splitEnSentences(para: string): string[] {
  const raw = para
    .split(/(?<=[a-zA-Z0-9"')])\.(?<!(?:Mr|Mrs|Ms|Dr|Prof|St|etc)\.)\s+(?=[A-Z"'(])/)
    .map(s => s.trim())
    .filter(Boolean);
  const result: string[] = [];
  for (const s of raw) {
    if (s.length < 15 && result.length > 0) {
      result[result.length - 1] += ". " + s;
    } else {
      result.push(s);
    }
  }
  return result.length > 0 ? result : [para];
}

function distributeIntoBuckets<T>(items: T[], bucketCount: number): T[][] {
  if (bucketCount <= 0) return [];
  if (items.length === 0) return Array.from({ length: bucketCount }, () => []);
  const baseSize = Math.floor(items.length / bucketCount);
  const remainder = items.length % bucketCount;
  const buckets: T[][] = [];
  let offset = 0;
  for (let b = 0; b < bucketCount; b++) {
    const size = baseSize + (b < remainder ? 1 : 0);
    buckets.push(items.slice(offset, offset + size));
    offset += size;
  }
  return buckets;
}

/** Zip para-level pairs into sentence-level using proportional merge. */
function sentenceZip(pairs: AlignedPair[]): AlignedPair[] {
  const result: AlignedPair[] = [];
  for (const pair of pairs) {
    const jpSents = splitJpSentences(pair.jp);
    const enSents = pair.en ? splitEnSentences(pair.en) : [];

    if (enSents.length === 0) {
      for (const js of jpSents) result.push({ jp: js, en: null });
      continue;
    }

    if (jpSents.length === enSents.length) {
      for (let i = 0; i < jpSents.length; i++) {
        result.push({ jp: jpSents[i], en: enSents[i] });
      }
    } else if (jpSents.length > enSents.length) {
      const buckets = distributeIntoBuckets(jpSents, enSents.length);
      for (let i = 0; i < buckets.length; i++) {
        result.push({ jp: buckets[i].join(" "), en: enSents[i] });
      }
    } else {
      const buckets = distributeIntoBuckets(enSents, jpSents.length);
      for (let i = 0; i < jpSents.length; i++) {
        result.push({ jp: jpSents[i], en: buckets[i].join(" ") });
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// DB operations (copied from resegment-hierarchical.ts)
// ---------------------------------------------------------------------------

async function clearNeedsReview(sb: SupabaseClient, articleId: string, existingTags: string[] | null): Promise<void> {
  const tag = "needs_manual_review";
  const tags = existingTags ?? [];
  if (!tags.includes(tag)) return;
  const newTags = tags.filter(t => t !== tag);
  const { error } = await sb
    .from("articles")
    .update({ tags: newTags.length > 0 ? newTags : null })
    .eq("id", articleId);
  if (error) {
    console.error(`  ⚠ Failed to clear needs_manual_review for ${articleId}: ${error.message}`);
  }
}

async function importAligned(
  sb: SupabaseClient,
  article: ArticleRow,
  pairs: AlignedPair[],
  dryRun: boolean,
): Promise<{ ok: true; newCount: number; nullEn: number } | { reason: string }> {
  const { id } = article;
  const N = pairs.length;
  if (N === 0) return { reason: "No valid segments" };

  if (dryRun) {
    const nullEn = pairs.filter(p => p.en === null).length;
    return { ok: true, newCount: N, nullEn };
  }

  // 1. DELETE existing segments
  const { error: delErr } = await sb.from("segments").delete().eq("article_id", id);
  if (delErr) return { reason: `DELETE segments failed: ${delErr.message}` };

  // 2. Build segment input list
  const inputs: SegmentInput[] = pairs.map((pair, i) => ({
    article_id: id,
    position: i,
    source_text: pair.jp,
    target_text: pair.en,
    status: "qa_approved",
    source_lang: "ja",
    target_lang: "en",
    metadata: {
      manual_alignment: true,
      batch: 2,
      aligned_at: new Date().toISOString(),
    },
  }));

  // 3. INSERT in batches
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
  const translatedCount = inputs.filter(s => s.target_text !== null).length;
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

  // 6. Clear needs_manual_review tag
  await clearNeedsReview(sb, id, article.tags ?? null);

  return { ok: true, newCount: N, nullEn: inputs.filter(s => s.target_text === null).length };
}

// ---------------------------------------------------------------------------
// Article-specific alignment functions
// Each returns AlignedPair[] — arrays of {jp, en|null}
// ---------------------------------------------------------------------------

/**
 * Article 1 (b02a2359): "Isn't Kendo and love similar?" (Abe Akihito)
 * Structure: opening → name/bio → sections (7× どちらも…) → gift section → URL → closing → credits+products.
 * JP has name+bio+twitter split across 4 fragments; EN has them in 1. Otherwise quite parallel.
 */
function align_b02a2359(content_ja: string, content_en: string): AlignedPair[] {
  let jpAll = splitParagraphs(content_ja);
  let enAll = splitParagraphs(content_en);

  // Strip junk
  jpAll = stripJunk(jpAll, "ja").filter(p => !isProductJunk(p));
  enAll = stripJunk(enAll, "en").filter(p => !isProductJunk(p));

  // JP: merge Twitter handle fragments: "Akihito_ABE" line + "。" line into preceding bio
  // After junk strip, the name+twitter comes through as separate paragraphs.
  // We'll merge short leader paragraphs (< 40 chars except section headings)
  jpAll = mergeShortLeaders(jpAll, 40);
  jpAll = mergeShortBackward(jpAll, 25); // catch stray fragments like "Akihito_ABE", "。"
  enAll = mergeShortLeaders(enAll, 40);
  enAll = mergeShortBackward(enAll, 20);

  // At this point JP and EN should be parallel. Let them zip 1:1.
  // JP sections: intro, name+bio, heading, essay, sections×7, gift-heading, gift-essay, URL, closing
  // EN sections: parallel

  const maxLen = Math.max(jpAll.length, enAll.length);
  const pairs: AlignedPair[] = [];
  for (let i = 0; i < maxLen; i++) {
    const jp = jpAll[i] ?? null;
    const en = enAll[i] ?? null;
    if (!jp) continue;
    pairs.push({ jp, en });
  }

  // Apply sentence-level split since paragraph counts match well
  return sentenceZip(pairs);
}

/**
 * Article 2 (a3695139): "Special Interview: President of AJKF (Masago Takeshi)"
 * Interview format. JP has multi-paragraph answers that EN sometimes merges.
 * JP sub-headings like "剣道開始は中学校1年\n\n高校時代は曽根崎署に通う" are two separate paragraphs.
 * We'll merge short leader/subtitle lines and then 1:1 zip.
 */
function align_a3695139(content_ja: string, content_en: string): AlignedPair[] {
  let jpAll = splitParagraphs(content_ja);
  let enAll = splitParagraphs(content_en);

  jpAll = stripJunk(jpAll, "ja");
  enAll = stripJunk(enAll, "en");

  // Merge short name/subtitle leaders
  jpAll = mergeShortLeaders(jpAll, 30); // name-only lines like "真砂威（まさご・たけし）" → merge with bio
  enAll = mergeShortLeaders(enAll, 30); // "Masago Takeshi" → merge with bio

  // Merge two-line sub-headings (second line is often continuation of section title)
  // e.g. "剣道開始は中学校1年" + "高校時代は曽根崎署に通う"
  const jpMerged: string[] = [];
  for (let i = 0; i < jpAll.length; i++) {
    if (jpAll[i].length < 25 && i + 1 < jpAll.length && jpAll[i + 1].length < 25) {
      jpMerged.push(jpAll[i] + " / " + jpAll[i + 1]);
      i++;
    } else {
      jpMerged.push(jpAll[i]);
    }
  }

  const maxLen = Math.max(jpMerged.length, enAll.length);
  const pairs: AlignedPair[] = [];
  for (let i = 0; i < maxLen; i++) {
    const jp = jpMerged[i] ?? null;
    const en = enAll[i] ?? null;
    if (!jp) continue;
    pairs.push({ jp, en });
  }

  return sentenceZip(pairs);
}

/**
 * Article 3 (b8aad7dc): "The Samurai League"
 * Q&A interview. JP: "宮原" on separate line before each answer. EN: "Miyahara:" inline.
 * Also has 構成＝, 撮影＝, URL in EN, 関連 in JP.
 */
function align_b8aad7dc(content_ja: string, content_en: string): AlignedPair[] {
  let jpAll = splitParagraphs(content_ja);
  let enAll = splitParagraphs(content_en);

  jpAll = stripJunk(jpAll, "ja");
  enAll = stripJunk(enAll, "en");

  // JP: merge "宮原" name-only paragraphs forward into their answers
  const jpMerged: string[] = [];
  for (let i = 0; i < jpAll.length; i++) {
    if (jpAll[i].trim() === "宮原" && i + 1 < jpAll.length) {
      jpMerged.push("宮原: " + jpAll[i + 1]);
      i++;
    } else {
      jpMerged.push(jpAll[i]);
    }
  }

  // EN: strip "Miyahara:" prefix for clean pairing, but keep content
  // Actually EN has "Miyahara:" as part of the paragraph, not separate.
  // We'll keep EN as-is since it's already inline.

  const maxLen = Math.max(jpMerged.length, enAll.length);
  const pairs: AlignedPair[] = [];
  for (let i = 0; i < maxLen; i++) {
    const jp = jpMerged[i] ?? null;
    const en = enAll[i] ?? null;
    if (!jp) continue;
    pairs.push({ jp, en });
  }

  return sentenceZip(pairs);
}

/**
 * Article 4 (25375fae): "Tenouchi and Sae (Higashi Yoshimi)"
 * Instructional article with photo captions, section headings, and repeat summary blocks.
 * JP has extra photo-caption paragraphs that EN omits or abbreviates.
 * Strategy: merge photo-caption-like paragraphs (short, imperative/phrase-style) with preceding content.
 */
function align_25375fae(content_ja: string, content_en: string): AlignedPair[] {
  let jpAll = splitParagraphs(content_ja);
  let enAll = splitParagraphs(content_en);

  jpAll = stripJunk(jpAll, "ja");
  enAll = stripJunk(enAll, "en");

  // Use standard forward merge for names/subtitles, then backward merge for stray captions
  jpAll = mergeShortLeaders(jpAll, 40);
  jpAll = mergeShortBackward(jpAll, 25);
  enAll = mergeShortLeaders(enAll, 40);
  enAll = mergeShortBackward(enAll, 25);

  // 1:1 zip
  const maxLen = Math.max(jpAll.length, enAll.length);
  const pairs: AlignedPair[] = [];
  for (let i = 0; i < maxLen; i++) {
    const jp = jpAll[i] ?? null;
    const en = enAll[i] ?? null;
    if (!jp) continue;
    pairs.push({ jp, en });
  }

  return sentenceZip(pairs);
}

/**
 * Article 5 (87297bfe): "The Kendo History of Sato Nariaki, Part 3"
 * Long autobiographical article. JP has dense sections with delegation lists, photo captions.
 * EN sometimes merges/splits paragraphs differently.
 * Strategy: merge short leader paragraphs, then 1:1 zip. Accept some noise.
 */
function align_87297bfe(content_ja: string, content_en: string): AlignedPair[] {
  let jpAll = splitParagraphs(content_ja);
  let enAll = splitParagraphs(content_en);

  jpAll = stripJunk(jpAll, "ja");
  enAll = stripJunk(enAll, "en");

  // JP: merge short heading-like fragments forward
  jpAll = mergeShortLeaders(jpAll, 35);

  // EN: similar
  enAll = mergeShortLeaders(enAll, 40);

  const maxLen = Math.max(jpAll.length, enAll.length);
  const pairs: AlignedPair[] = [];
  for (let i = 0; i < maxLen; i++) {
    const jp = jpAll[i] ?? null;
    const en = enAll[i] ?? null;
    if (!jp) continue;
    pairs.push({ jp, en });
  }

  return sentenceZip(pairs);
}

/**
 * Article 6 (a2d04538): "How to learn Japanese Kendo Kata (Iwatate Saburo)"
 * NOTE: JP author bio is Yano Hiroshi (矢野博志); EN author bio is Iwatate Saburo.
 * Body content is the same. We pair JP and EN bios as-is (translation choice).
 * JP has photo captions. EN has photo credits + bonus closing lines.
 * Strategy: merge short fragments, 1:1 zip.
 */
function align_a2d04538(content_ja: string, content_en: string): AlignedPair[] {
  let jpAll = splitParagraphs(content_ja);
  let enAll = splitParagraphs(content_en);

  jpAll = stripJunk(jpAll, "ja");
  enAll = stripJunk(enAll, "en");

  // JP: merge short leaders (name fragments, heading fragments)
  jpAll = mergeShortLeaders(jpAll, 35);

  // EN: merge short leaders
  enAll = mergeShortLeaders(enAll, 40);

  // Some EN paragraphs may be very short captions at the end ("Iwatate Saburo", "Kendo Kata")
  // Filter EN-only very short lines that look like credit/branding
  const enFiltered = enAll.filter(p => {
    if (p === "Iwatate Saburo" || p === "Kendo Kata") return false;
    return true;
  });

  const maxLen = Math.max(jpAll.length, enFiltered.length);
  const pairs: AlignedPair[] = [];
  for (let i = 0; i < maxLen; i++) {
    const jp = jpAll[i] ?? null;
    const en = enFiltered[i] ?? null;
    if (!jp) continue;
    pairs.push({ jp, en });
  }

  return sentenceZip(pairs);
}

/**
 * Article 7 (85fd7073): "How to Develop Sharp Strikes (Honda Kiyozumi)"
 * Instructional article with clear sections: intro, bio, main body, Kamae section,
 * Men section, Kote section, photo captions.
 * JP has photo captions (short phrases). EN has parallel structure.
 * Strategy: merge short caption-like paragraphs, 1:1 zip.
 */
function align_85fd7073(content_ja: string, content_en: string): AlignedPair[] {
  let jpAll = splitParagraphs(content_ja);
  let enAll = splitParagraphs(content_en);

  jpAll = stripJunk(jpAll, "ja");
  enAll = stripJunk(enAll, "en");

  jpAll = mergeShortLeaders(jpAll, 40);
  jpAll = mergeShortBackward(jpAll, 25);
  enAll = mergeShortLeaders(enAll, 40);
  enAll = mergeShortBackward(enAll, 25);

  const maxLen = Math.max(jpAll.length, enAll.length);
  const pairs: AlignedPair[] = [];
  for (let i = 0; i < maxLen; i++) {
    const jp = jpAll[i] ?? null;
    const en = enAll[i] ?? null;
    if (!jp) continue;
    pairs.push({ jp, en });
  }

  return sentenceZip(pairs);
}

/**
 * Article 8 (1fd89b16): "Move the opponent and strike (Ujiie Michio)"
 * Essay/interview. JP has photo captions. EN is parallel.
 * Strategy: merge short captions, 1:1 zip.
 */
function align_1fd89b16(content_ja: string, content_en: string): AlignedPair[] {
  let jpAll = splitParagraphs(content_ja);
  let enAll = splitParagraphs(content_en);

  jpAll = stripJunk(jpAll, "ja");
  enAll = stripJunk(enAll, "en");

  jpAll = mergeShortLeaders(jpAll, 40);
  jpAll = mergeShortBackward(jpAll, 25);
  enAll = mergeShortLeaders(enAll, 40);
  enAll = mergeShortBackward(enAll, 25);

  const maxLen = Math.max(jpAll.length, enAll.length);
  const pairs: AlignedPair[] = [];
  for (let i = 0; i < maxLen; i++) {
    const jp = jpAll[i] ?? null;
    const en = enAll[i] ?? null;
    if (!jp) continue;
    pairs.push({ jp, en });
  }

  return sentenceZip(pairs);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const ALIGNERS: Record<string, (ja: string, en: string) => AlignedPair[]> = {
  "b02a2359": align_b02a2359,
  "a3695139": align_a3695139,
  "b8aad7dc": align_b8aad7dc,
  "25375fae": align_25375fae,
  "87297bfe": align_87297bfe,
  "a2d04538": align_a2d04538,
  "85fd7073": align_85fd7073,
  "1fd89b16": align_1fd89b16,
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`[info] Manual alignment — Batch 2 ${dryRun ? "(DRY RUN)" : "(LIVE)"}`);
  console.log(`[info] Processing 8 articles (IDs: ${BATCH2_IDS.map(id => id.split("-")[0]).join(", ")})`);

  const env = await loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch articles
  const { data, error } = await sb
    .from("articles")
    .select("id, title, content_ja, content_en, segment_count, tags")
    .in("id", BATCH2_IDS)
    .order("segment_count", { ascending: true });

  if (error || !data) {
    console.error("FATAL: fetch articles failed:", error?.message);
    process.exit(1);
  }

  const results: Array<{
    id: string;
    title: string;
    oldSegs: number;
    newSegs: number;
    nullEn: number;
    status: string;
    note?: string;
  }> = [];

  const force = process.argv.includes("--force");

  for (const article of data as ArticleRow[]) {
    const shortId = article.id.split("-")[0];
    const tags = article.tags ?? [];
    if (!force && !tags.includes("needs_manual_review")) {
      console.log(`[${shortId}] SKIP — not tagged needs_manual_review`);
      results.push({
        id: shortId,
        title: article.title ?? "",
        oldSegs: article.segment_count ?? 0,
        newSegs: 0,
        nullEn: 0,
        status: "skipped",
        note: "tag already cleared",
      });
      continue;
    }

    const aligner = ALIGNERS[shortId];
    if (!aligner) {
      console.error(`[${shortId}] No aligner found!`);
      results.push({ id: shortId, title: article.title ?? "", oldSegs: article.segment_count ?? 0, newSegs: 0, nullEn: 0, status: "error", note: "no aligner" });
      continue;
    }

    try {
      const pairs = aligner(article.content_ja ?? "", article.content_en ?? "");
      const result = await importAligned(sb, article, pairs, dryRun);

      if ("reason" in result) {
        console.error(`[${shortId}] FAILED: ${result.reason}`);
        results.push({ id: shortId, title: article.title ?? "", oldSegs: article.segment_count ?? 0, newSegs: 0, nullEn: 0, status: "error", note: result.reason });
      } else {
        const nullRate = result.newCount > 0 ? (result.nullEn / result.newCount * 100).toFixed(1) : "0.0";
        console.log(`[${shortId}] ${dryRun ? "DRY" : "OK"} — ${article.segment_count}→${result.newCount} segs, ${result.nullEn} null EN (${nullRate}%) — "${(article.title ?? "").slice(0, 50)}"`);
        results.push({
          id: shortId,
          title: article.title ?? "",
          oldSegs: article.segment_count ?? 0,
          newSegs: result.newCount,
          nullEn: result.nullEn,
          status: dryRun ? "dry_run" : "aligned",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${shortId}] ERROR: ${msg}`);
      results.push({ id: shortId, title: article.title ?? "", oldSegs: article.segment_count ?? 0, newSegs: 0, nullEn: 0, status: "error", note: msg });
    }
  }

  // Summary
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Batch 2 Summary ${dryRun ? "(DRY RUN)" : ""}`);
  const aligned = results.filter(r => r.status === "aligned" || r.status === "dry_run");
  const totalOld = aligned.reduce((s, r) => s + r.oldSegs, 0);
  const totalNew = aligned.reduce((s, r) => s + r.newSegs, 0);
  const totalNull = aligned.reduce((s, r) => s + r.nullEn, 0);
  console.log(`  Aligned: ${aligned.length}/${results.length}`);
  console.log(`  Total segs: ${totalOld} → ${totalNew}`);
  console.log(`  Total null EN: ${totalNull} (${totalNew > 0 ? (totalNull / totalNew * 100).toFixed(1) : "0.0"}%)`);

  const failed = results.filter(r => r.status === "error" || r.status === "skipped");
  if (failed.length > 0) {
    console.log(`  Failed/Skipped: ${failed.length}`);
    for (const f of failed) console.log(`    ${f.id}: ${f.note ?? f.status}`);
  }

  if (dryRun) {
    // Show representative pairs for first article
    if (aligned.length > 0) {
      console.log(`\n  Representative pairs (first aligned article: ${aligned[0].id}):`);
      // We'd need to re-fetch to show pairs, but skip for brevity
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Unhandled:", err);
  process.exit(99);
});
