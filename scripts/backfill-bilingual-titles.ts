/**
 * backfill-bilingual-titles.ts
 *
 * Backfills title_ja for articles missing Japanese titles, and fixes articles
 * where the `title` column contains JP-only text (should be EN).
 *
 * Uses OpenRouter for batch LLM translation, then applies simple per-row UPDATEs.
 * Keeps DB footprint minimal — no DELETE+INSERT, no segment-table involvement.
 *
 * Usage:
 *   npx tsx scripts/backfill-bilingual-titles.ts
 *
 * Requires: OPENROUTER_API_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// ── Config ──────────────────────────────────────────────────────────────────

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase env vars. Check .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  db: { schema: 'public' },
});

const BATCH_SIZE = 25; // titles per LLM call

// Regex: title consists entirely of Japanese characters + punctuation
const JP_ONLY_RE = /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF\s\u3000-\u303F\uFF01-\uFF5E\u2010-\u205E．、。「」『』！？：；（）％＆・～―＝\p{P}]+$/u;

// ── Types ───────────────────────────────────────────────────────────────────

interface TitleRecord {
  id: string;
  title: string;
  title_ja: string | null;
}

// ── LLM translation helpers ─────────────────────────────────────────────────

async function llmTranslate(
  items: { id: string; text: string }[],
  targetLang: 'en' | 'ja',
  retries = 2,
): Promise<Record<string, string>> {
  const langLabel = targetLang === 'en' ? 'English' : 'Japanese';
  const descriptions = items.map((item, i) =>
    `${i + 1}. ${item.text}`
  ).join('\n');

  const prompt = targetLang === 'en'
    ? `You are a professional kendo publication translator. Translate each Japanese article title below into natural, idiomatic English. These are titles from a kendo magazine (剣道時代 / Kendo Jidai). Match the tone of existing English titles in this corpus — they are natural, journalistic, and avoid literal word-for-word translation. KEEP proper names (people, organizations) as-is. Keep the format: one translation per line, numbered to match.

${descriptions}`
    : `You are a professional kendo publication translator. Translate each English article title below into natural, idiomatic Japanese. These are titles from a kendo magazine (剣道時代 / Kendo Jidai). Match the tone of existing Japanese titles in this corpus — they use natural kanji/kana, sound like real magazine article titles, and avoid mechanical literal translation. KEEP proper names (people, organizations) as-is. Keep the format: one translation per line, numbered to match.

${descriptions}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-haiku',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: items.length * 150,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter HTTP ${response.status}: ${errText.slice(0, 500)}`);
      }

      const json = await response.json();
      const raw = json.choices?.[0]?.message?.content || '';

      // Parse numbered list
      const result: Record<string, string> = {};
      const lines = raw.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\d+)\.\s*(.+)/);
        if (match) {
          const idx = parseInt(match[1], 10) - 1;
          const text = match[2].trim();
          if (idx >= 0 && idx < items.length && text.length > 0) {
            result[items[idx].id] = text;
          }
        }
      }

      return result;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  Retry ${attempt + 1}/${retries}: ${(err as Error).message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  throw new Error('Max retries exceeded');
}

// ── DB helpers ──────────────────────────────────────────────────────────────

async function updateTitle(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .update({ title })
    .eq('id', id);
  if (error) {
    console.error(`  UPDATE title failed for ${id}: ${error.message}`);
    throw error;
  }
}

async function updateTitleJa(id: string, title_ja: string): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .update({ title_ja })
    .eq('id', id);
  if (error) {
    console.error(`  UPDATE title_ja failed for ${id}: ${error.message}`);
    throw error;
  }
}

async function updateBoth(id: string, title: string, title_ja: string): Promise<void> {
  // Single UPDATE for both columns to minimise DB round-trips
  const { error } = await supabase
    .from('articles')
    .update({ title, title_ja })
    .eq('id', id);
  if (error) {
    console.error(`  UPDATE both failed for ${id}: ${error.message}`);
    throw error;
  }
}

// ── Query articles needing attention ────────────────────────────────────────

interface NeedsEnTitle {
  id: string;
  jp_title: string; // current title (JP text)
  current_title_ja: string | null;
}

interface NeedsJaTitle {
  id: string;
  en_title: string; // current title (EN text)
}

async function findNeedyArticles(): Promise<{
  needsEnTitle: NeedsEnTitle[];
  needsJaTitle: NeedsJaTitle[];
}> {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, title_ja')
    .order('created_at');

  if (error) throw new Error(`Query failed: ${error.message}`);

  const needsEnTitle: NeedsEnTitle[] = [];
  const needsJaTitle: NeedsJaTitle[] = [];

  for (const row of data || []) {
    const isJpOnly = JP_ONLY_RE.test(row.title || '');
    const hasJa = row.title_ja && row.title_ja.trim().length > 0;

    if (isJpOnly) {
      needsEnTitle.push({
        id: row.id,
        jp_title: row.title,
        current_title_ja: hasJa ? row.title_ja : null,
      });
    } else if (!hasJa) {
      needsJaTitle.push({
        id: row.id,
        en_title: row.title,
      });
    }
  }

  return { needsEnTitle, needsJaTitle };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Bilingual Title Backfill ===\n');

  // 1. Audit
  console.log('1. Querying articles needing attention...');
  const { needsEnTitle, needsJaTitle } = await findNeedyArticles();

  console.log(`   Category A (JP-only title → need EN): ${needsEnTitle.length}`);
  console.log(`   Category B (EN title → need JP title_ja): ${needsJaTitle.length}`);
  console.log(`   Total to process: ${needsEnTitle.length + needsJaTitle.length}\n`);

  if (needsEnTitle.length === 0 && needsJaTitle.length === 0) {
    console.log('Nothing to backfill!');
    return;
  }

  // 2. Process Category A: JP-only title → EN title
  if (needsEnTitle.length > 0) {
    console.log('2. Processing Category A (JP → EN)...');
    let processed = 0;
    const total = needsEnTitle.length;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = needsEnTitle.slice(i, i + BATCH_SIZE);
      console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(total / BATCH_SIZE)} (${batch.length} titles)...`);

      const items = batch.map(a => ({ id: a.id, text: a.jp_title }));
      const translations = await llmTranslate(items, 'en');

      for (const article of batch) {
        const enTitle = translations[article.id];
        if (!enTitle) {
          console.warn(`   ⚠ No translation for ${article.id}: "${article.jp_title.slice(0, 50)}"`);
          continue;
        }

        try {
          await updateBoth(article.id, enTitle, article.jp_title);
          processed++;
        } catch (err) {
          console.error(`   ✗ Failed ${article.id}: ${(err as Error).message}`);
        }
      }
    }

    console.log(`   ✓ Category A done: ${processed}/${total} updated\n`);
  }

  // 3. Process Category B: EN title → JP title_ja
  if (needsJaTitle.length > 0) {
    console.log('3. Processing Category B (EN → JP)...');
    let processed = 0;
    const total = needsJaTitle.length;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = needsJaTitle.slice(i, i + BATCH_SIZE);
      console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(total / BATCH_SIZE)} (${batch.length} titles)...`);

      const items = batch.map(a => ({ id: a.id, text: a.en_title }));
      const translations = await llmTranslate(items, 'ja');

      for (const article of batch) {
        const jaTitle = translations[article.id];
        if (!jaTitle) {
          console.warn(`   ⚠ No translation for ${article.id}: "${article.en_title.slice(0, 50)}"`);
          continue;
        }

        try {
          await updateTitleJa(article.id, jaTitle);
          processed++;
        } catch (err) {
          console.error(`   ✗ Failed ${article.id}: ${(err as Error).message}`);
        }
      }
    }

    console.log(`   ✓ Category B done: ${processed}/${total} updated\n`);
  }

  // 4. Verification
  console.log('4. Verification...');
  const { needsEnTitle: remainingEn, needsJaTitle: remainingJa } = await findNeedyArticles();
  console.log(`   Remaining Cat A (JP-only title): ${remainingEn.length}`);
  console.log(`   Remaining Cat B (missing title_ja): ${remainingJa.length}`);

  if (remainingEn.length === 0 && remainingJa.length === 0) {
    console.log('\n✓ All titles backfilled!');
  } else {
    console.log(`\n⚠ ${remainingEn.length + remainingJa.length} articles still need attention. Re-run the script.`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
