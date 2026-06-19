#!/usr/bin/env npx tsx
/**
 * Fix 184 bad segments in the Sword Theory book.
 *
 * Problem: the trilingual page files (ZH/JA/EN or JA/EN/ZH) were processed
 * by import-clean-triplets.ts which assumes JA/EN/ZH for 3-line blocks.
 * For blocks in ZH/JA/EN order, line[1] (JA) was stored as target_text
 * instead of line[2] (EN). This left 184 segments with CJK-only target_text.
 *
 * Fix: parse pages using the same block ordering as the importer, then for
 * each bad segment find the line in the raw block that contains Latin
 * characters and use it as the corrected target_text.
 *
 * Usage:
 *   npx tsx scripts/fix-sword-theory-zh-targets.ts           # apply fixes
 *   npx tsx scripts/fix-sword-theory-zh-targets.ts --dry-run # preview only
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// =========================================================================
// Config
// =========================================================================

const PAGES_DIR =
  '/Users/nghiango-mbp/git_repo/universal-agents_v2/book-postprocessing/Chinese Translation Sword Theory Part 1/pages/';
const ARTICLE_ID = '8dda4689-a92b-4a4c-94ad-93cce4c9b1df';
const ENV_PATH = '.env.local';

// =========================================================================
// Script-detection helpers (same as import-clean-triplets.ts)
// =========================================================================

const RE_KANA = /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/;
const RE_HAN  = /[\u3400-\u4DBF\u4E00-\u9FFF]/;

function hasCjk(s: string): boolean {
  return RE_KANA.test(s) || RE_HAN.test(s);
}

function hasLatin(s: string): boolean {
  return /[A-Za-z]/.test(s);
}

function nw(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

// =========================================================================
// Block parsing (replicates import-clean-triplets.ts parseBlockLines
// but also captures raw lines)
// =========================================================================

interface RawBlock {
  page: number;
  /** Lines after heading strip, non-empty filter, BEFORE parseBlockLines. */
  rawLines: string[];
  /** JA as computed by parseBlockLines (may be wrong for ZH/JA/EN blocks). */
  ja: string;
  /** EN as computed by parseBlockLines (may be wrong). */
  en: string;
  /** Shape string for telemetry. */
  shape: string;
}

/**
 * Minimal parseBlockLines needed to determine ja/en for the keep filter.
 * We also return the raw lines (post-heading-strip lines).
 *
 * For 3-line blocks: ja=lines[0], en=lines[1] — importer takes verbatim.
 * For 2-line blocks: uses script-split logic (B1/B2).
 * For 1-line blocks: trilingual split.
 * For >=4 lines: classifies lines by dominant script.
 */
function parseBlockLinesForFix(
  lines: string[],
): { ja: string; en: string; shape: string } {
  if (lines.length === 3) {
    return { ja: nw(lines[0]), en: nw(lines[1]), shape: '3' };
  }

  if (lines.length === 1) {
    // Use simple heuristic: find Latin run, treat rest as JA
    let enPart = '';
    let jaPart = '';
    let inLatin = false;
    let latinBuf = '';
    for (const ch of lines[0]) {
      const isLatin = hasLatin(ch);
      if (isLatin) {
        if (!inLatin) {
          inLatin = true;
          latinBuf = ch;
        } else {
          latinBuf += ch;
        }
      } else {
        if (inLatin) {
          enPart += latinBuf;
          latinBuf = '';
          inLatin = false;
        }
        jaPart += ch;
      }
    }
    if (inLatin) enPart += latinBuf;
    return { ja: nw(jaPart), en: nw(enPart), shape: '1' };
  }

  if (lines.length === 2) {
    const l0 = lines[0];
    const l1 = lines[1];
    const l0HasLatin = hasLatin(l0);
    if (!l0HasLatin) {
      // B1: JA on line0, EN+ZH merged on line1
      // Extract Latin portion from line1
      let enPart = '';
      let inLatin = false;
      let buf = '';
      for (const ch of l1) {
        if (hasLatin(ch)) {
          if (!inLatin) { inLatin = true; buf = ch; }
          else { buf += ch; }
        } else {
          if (inLatin) { enPart += buf + ' '; buf = ''; inLatin = false; }
        }
      }
      if (inLatin) enPart += buf;
      return { ja: nw(l0), en: nw(enPart), shape: '2:B1' };
    }
    // B2: JA+EN merged on line0, ZH on line1 — extract Latin from line0
    let enPart = '';
    let inLatin = false;
    let buf = '';
    for (const ch of l0) {
      if (hasLatin(ch)) {
        if (!inLatin) { inLatin = true; buf = ch; }
        else { buf += ch; }
      } else {
        if (inLatin) { enPart += buf + ' '; buf = ''; inLatin = false; }
      }
    }
    if (inLatin) enPart += buf;
    return { ja: nw(l0), en: nw(enPart), shape: '2:B2' };
  }

  // >=4 lines: classify by dominant script (simplified)
  const ja: string[] = [];
  const en: string[] = [];
  let sawEn = false;
  for (const raw of lines) {
    const ln = nw(raw);
    if (!ln) continue;
    if (/^\d+\.$/.test(ln)) continue;
    if (hasLatin(ln)) {
      en.push(ln);
      sawEn = true;
    } else if (hasCjk(ln) && !sawEn) {
      ja.push(ln);
    }
    // CJK after EN → ZH, drop
  }
  return { ja: nw(ja.join(' ')), en: nw(en.join(' ')), shape: `${lines.length}` };
}

// =========================================================================
// Page parsing — builds position-indexed array of RawBlocks
// =========================================================================

async function parseAllPages(): Promise<{
  blocks: RawBlock[];              // filtered: only blocks that the importer kept
  totalBlocksSeen: number;
  skippedUntranslated: number;
  skippedOther: number;
  shapeCounts: Record<string, number>;
  errors: string[];
}> {
  const files = (await readdir(PAGES_DIR))
    .filter((f) => /^page_\d{3}\.md$/.test(f))
    .sort();

  const blocks: RawBlock[] = [];
  let totalBlocksSeen = 0;
  let skippedUntranslated = 0;
  let skippedOther = 0;
  const shapeCounts: Record<string, number> = {};
  const errors: string[] = [];

  for (const f of files) {
    const pageMatch = f.match(/^page_(\d{3})\.md$/);
    if (!pageMatch) continue;
    const page = Number(pageMatch[1]);
    const content = await readFile(join(PAGES_DIR, f), 'utf8');

    let lines = content.split('\n');
    // Drop leading "Page N" header line
    if (lines.length && /^Page\s+\d+\s*$/.test(lines[0].trim())) {
      lines = lines.slice(1);
    }
    const body = lines.join('\n');
    const rawBlocks = body.split(/\n---\n/);

    for (const rb of rawBlocks) {
      // Split into lines, filter empty
      let cl = rb.split('\n').filter((l) => l.trim().length > 0);
      if (cl.length === 0) continue;

      // Strip 【Heading】 prefix if present
      if (cl[0].trim() === '【Heading】') {
        cl = cl.slice(1);
      }
      if (cl.length === 0) continue;

      totalBlocksSeen += 1;

      // Capture raw lines (trimmed but not normalized)
      const rawLines = cl.map((l) => l.trim());

      // Parse to determine ja/en (same as importer)
      const { ja, en, shape } = parseBlockLinesForFix(cl);

      shapeCounts[shape] = (shapeCounts[shape] || 0) + 1;

      const jaOk = ja.trim().length > 0;
      const enOk = en.trim().length > 0;

      if (jaOk && enOk) {
        blocks.push({ page, rawLines, ja, en, shape });
      } else if (jaOk && !enOk) {
        skippedUntranslated += 1;
      } else {
        skippedOther += 1;
      }
    }
  }

  return {
    blocks,
    totalBlocksSeen,
    skippedUntranslated,
    skippedOther,
    shapeCounts,
    errors,
  };
}

/**
 * Given a raw block, find the best Latin-text line to use as EN.
 * Strategy:
 *   1. Find all lines containing Latin (A-Za-z).
 *   2. Pick the one with the longest Latin-letter run.
 *   3. Fall back: pick the first Latin-containing line.
 */
function findLatinLine(rawLines: string[]): string | null {
  let best: string | null = null;
  let bestScore = -1;

  for (const ln of rawLines) {
    if (hasLatin(ln)) {
      // Count consecutive Latin letters (rough quality score)
      const latinRunLen = (ln.match(/[A-Za-z]+/g) || []).reduce(
        (max, m) => Math.max(max, m.length),
        0,
      );
      if (latinRunLen > bestScore) {
        bestScore = latinRunLen;
        best = ln;
      }
    }
  }

  return best ? nw(best) : null;
}

// =========================================================================
// DB interaction
// =========================================================================

interface BadSegment {
  id: string;
  position: number;
  source_text: string;
  target_text: string;
}

/** Query DB for segments with non-Latin target_text. */
async function fetchBadSegments(sb: SupabaseClient): Promise<BadSegment[]> {
  // We query all segments for this article, then filter in JS,
  // because the supabase-js REST API doesn't support regex.
  // Alternative: use raw SQL via REST API.
  const all: BadSegment[] = [];
  const BATCH = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from('segments')
      .select('id,position,source_text,target_text')
      .eq('article_id', ARTICLE_ID)
      .order('position', { ascending: true })
      .range(from, from + BATCH - 1);

    if (error) throw new Error(`Failed to fetch segments: ${error.message}`);
    if (!data || data.length === 0) break;

    all.push(
      ...(data as BadSegment[]).filter(
        (s) =>
          !hasLatin(s.target_text) &&
          s.target_text.trim().length > 0 &&
          !/^\d+$/.test(s.target_text.trim()),
      ),
    );
    from += BATCH;
  }

  return all;
}

interface FixRecord {
  id: string;
  position: number;
  current: string;
  corrected: string;
  page: number;
  shape: string;
}

// =========================================================================
// Main
// =========================================================================

async function loadEnv(): Promise<Record<string, string>> {
  const raw = await readFile(ENV_PATH, 'utf8');
  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('='.repeat(70));
  console.log('Sword Theory — Fix ZH targets');
  console.log('='.repeat(70));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no DB writes)' : 'LIVE (will update DB)'}`);
  console.log(`Article ID: ${ARTICLE_ID}`);
  console.log(`Pages dir: ${PAGES_DIR}`);
  console.log('');

  // ---- Phase 1: Parse pages ----
  console.log('[1/4] Parsing page files...');
  const parse = await parseAllPages();
  console.log(
    `  blocks_seen:         ${parse.totalBlocksSeen}`,
  );
  console.log(
    `  segments (kept):     ${parse.blocks.length}`,
  );
  console.log(
    `  skipped no-EN:       ${parse.skippedUntranslated}`,
  );
  console.log(
    `  skipped other:       ${parse.skippedOther}`,
  );
  console.log(`  shape distribution: ${JSON.stringify(parse.shapeCounts)}`);
  if (parse.errors.length > 0) {
    console.log(`  errors: ${parse.errors.length}`);
    for (const e of parse.errors.slice(0, 10)) console.log(`    - ${e}`);
  }
  console.log('');

  // ---- Phase 2: Connect to DB ----
  console.log('[2/4] Connecting to Supabase...');
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('FATAL: Supabase creds missing from .env.local');
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  console.log(`  URL: ${url}`);
  console.log('');

  // ---- Phase 3: Fetch bad segments ----
  console.log('[3/4] Fetching bad segments from DB...');
  const badSegments = await fetchBadSegments(sb);
  console.log(`  Found ${badSegments.length} segments with non-Latin target_text`);
  console.log('');

  // ---- Phase 4: Match and generate fixes ----
  console.log('[4/4] Matching segments to page blocks and preparing fixes...');
  const fixes: FixRecord[] = [];
  const skipped: string[] = [];
  const outOfRange: string[] = [];
  const alreadyCorrect: string[] = [];

  for (const seg of badSegments) {
    const pos = seg.position;

    if (pos < 0 || pos >= parse.blocks.length) {
      outOfRange.push(
        `position=${pos} (blocks available: 0..${parse.blocks.length - 1})`,
      );
      continue;
    }

    const block = parse.blocks[pos];
    const latinLine = findLatinLine(block.rawLines);

    if (!latinLine) {
      skipped.push(
        `pos=${pos} page=${block.page} shape=${block.shape} — no Latin line in block`,
      );
      continue;
    }

    // Normalize for comparison
    if (nw(latinLine) === nw(seg.target_text)) {
      alreadyCorrect.push(
        `pos=${pos} — already matches extracted Latin line`,
      );
      continue;
    }

    fixes.push({
      id: seg.id,
      position: pos,
      current: seg.target_text,
      corrected: latinLine,
      page: block.page,
      shape: block.shape,
    });
  }

  console.log(
    `  Fixable:     ${fixes.length}`,
  );
  console.log(
    `  Skipped:     ${skipped.length} (no Latin found in block)`,
  );
  console.log(
    `  Out of range: ${outOfRange.length} (position past block count)`,
  );
  console.log(
    `  Already OK:  ${alreadyCorrect.length} (Latin line == current target)`,
  );
  console.log('');

  // ---- Show preview ----
  if (fixes.length > 0) {
    console.log('─'.repeat(70));
    console.log('PREVIEW (first 20 fixes):');
    console.log('─'.repeat(70));
    for (const f of fixes.slice(0, 20)) {
      console.log(
        `  pos=${String(f.position).padStart(4)} page=${String(f.page).padStart(3)} shape=${f.shape.padEnd(5)} | cur="${f.current.slice(0, 40)}" → new="${f.corrected.slice(0, 40)}"`,
      );
    }
    if (fixes.length > 20) {
      console.log(`  ... and ${fixes.length - 20} more`);
    }
    console.log('');
  }

  if (skipped.length > 0) {
    console.log('─'.repeat(70));
    console.log('SKIPPED (no Latin line in block):');
    console.log('─'.repeat(70));
    for (const s of skipped.slice(0, 15)) console.log(`  ${s}`);
    if (skipped.length > 15) console.log(`  ... and ${skipped.length - 15} more`);
    console.log('');
  }

  if (outOfRange.length > 0) {
    console.log('─'.repeat(70));
    console.log('OUT OF RANGE:');
    console.log('─'.repeat(70));
    for (const s of outOfRange) console.log(`  ${s}`);
    console.log('');
  }

  // ---- Apply fixes ----
  if (fixes.length === 0) {
    console.log('No fixes to apply. Done.');
    return;
  }

  if (dryRun) {
    console.log('[dry-run] Would update', fixes.length, 'segments.');
    console.log('[dry-run] No DB writes performed.');
    return;
  }

  console.log(`Applying ${fixes.length} fixes to DB...`);
  let applied = 0;
  let failed = 0;

  // Batch updates in groups of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < fixes.length; i += BATCH_SIZE) {
    const batch = fixes.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (f) => {
      const { error } = await sb
        .from('segments')
        .update({ target_text: f.corrected })
        .eq('id', f.id)
        .eq('article_id', ARTICLE_ID);
      if (error) {
        console.error(`  FAIL pos=${f.position}: ${error.message}`);
        failed += 1;
      } else {
        applied += 1;
      }
    });
    await Promise.all(promises);
    console.log(
      `  batch ${Math.floor(i / BATCH_SIZE) + 1}: ${applied} applied, ${failed} failed (of ${Math.min(i + BATCH_SIZE, fixes.length)})`,
    );
  }

  console.log('');
  console.log('='.repeat(70));
  console.log(`DONE: ${applied} segments updated, ${failed} failed, ${skipped.length} skipped`);
  console.log('='.repeat(70));

  // ---- Verification ----
  console.log('');
  console.log('Verification — re-querying bad segments...');
  const remaining = await fetchBadSegments(sb);
  console.log(`  Bad segments remaining: ${remaining.length} (was ${badSegments.length})`);
  console.log(`  Improvement: ${badSegments.length - remaining.length} segments fixed`);

  if (remaining.length > 0) {
    console.log('  Remaining bad segments:');
    for (const s of remaining.slice(0, 10)) {
      console.log(
        `    pos=${String(s.position).padStart(4)} | "${s.target_text.slice(0, 50)}"`,
      );
    }
    if (remaining.length > 10) {
      console.log(`    ... and ${remaining.length - 10} more`);
    }
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(99);
});
