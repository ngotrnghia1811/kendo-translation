/**
 * One-shot importer for `*_trilingual.md` files produced by the
 * `_references/gemini_kendo_book_translator/` upstream pipeline.
 *
 * Per docs/BACKEND-HANDOFF-DATA-IMPORT.md (decisions locked by aki-main):
 *   - Schema option 1: bilingual JA→EN, ZH is dropped (logged in aggregate).
 *   - Each paragraph block = one segment (no sentence splitting).
 *   - position is zero-based ascending across the whole book.
 *   - paragraph_boundaries = [0, 1, ..., N-1] (every segment starts a paragraph).
 *   - Headings are kept as segments with metadata.kind = 'heading'.
 *   - Segment status on insert = 'qa_approved' (pipeline-finalized).
 *   - metadata = { imported_from_pipeline: true, source_file, page }.
 *   - Idempotent: upsert by articles.title; skip if already exists.
 *
 * Usage:
 *   npx tsx scripts/import-trilingual-references.ts <path-to-trilingual.md>
 */

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Env loading (same convention as scripts/dashboard-recon/apply-migration.ts)
// ---------------------------------------------------------------------------

const ENV_PATH = '.env.local';

async function loadEnv(): Promise<Record<string, string>> {
  const raw = await readFile(ENV_PATH, 'utf8');
  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

interface ParsedBlock {
  page: number;
  blockIndex: number;        // index of paragraph block within the page (0-based)
  isHeading: boolean;
  ja: string;
  en: string;
  zhCharsDropped: number;    // for aggregate stats
}

interface ParseResult {
  blocks: ParsedBlock[];
  totalPages: number;
  totalBlocksSeen: number;
  skipped: Array<{ page: number; blockIndex: number; reason: string }>;
  zhCharsDropped: number;
  zhRunsDropped: number;
  quirks: string[];
}

// Unicode-script helpers.
const RE_HIRAGANA = /[\u3040-\u309F]/;
const RE_KATAKANA = /[\u30A0-\u30FF\u31F0-\u31FF]/;   // include katakana-phonetic-extensions
const RE_HAN      = /[\u3400-\u4DBF\u4E00-\u9FFF]/;
const RE_KANA     = /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/;

// Character classifier: returns 'ja' | 'zh' | 'en' | 'punct'.
// JA = any kana char.
// ZH = Han char (we'll re-attribute Han to JA if the surrounding run is kana-bearing — handled in run merging).
// EN = ASCII letters/digits.
// punct/space = neutral, attached to neighbour.
type ScriptClass = 'kana' | 'han' | 'latin' | 'neutral';
function classify(ch: string): ScriptClass {
  if (RE_KANA.test(ch)) return 'kana';
  if (RE_HAN.test(ch))  return 'han';
  // ASCII letters/digits + a few latin-extension ranges
  const cp = ch.codePointAt(0)!;
  if ((cp >= 0x0030 && cp <= 0x0039) ||
      (cp >= 0x0041 && cp <= 0x005A) ||
      (cp >= 0x0061 && cp <= 0x007A) ||
      (cp >= 0x00C0 && cp <= 0x024F)) return 'latin';
  return 'neutral';
}

/**
 * Split a single line into ordered chunks tagged by dominant script.
 * The classifier walks char-by-char, accumulating contiguous runs of the same
 * script class. Neutral chars (punctuation, spaces, italic markers,
 * `[T/N: ...]`, `[cite_start]...[cite: N]`, parens) attach to the current run.
 *
 * The trickiest case is Format B / C where JA + EN + ZH sit on one line
 * separated by ASCII spaces. The script class transitions kana→latin→han are
 * exactly the segment boundaries we want.
 */
/**
 * Split a single line into ordered runs tagged by SCRIPT CLASS only
 * (kana / han / latin). Language assignment is deferred to the buffer-level
 * pass, because Format A spans multiple lines: a pure-Han line by itself is
 * ambiguous (JA proper-noun heading vs ZH translation) and only the
 * surrounding JA→EN→ZH order disambiguates.
 *
 * Neutral chars (punct, spaces, italic asterisks, `[T/N: ...]`,
 * `[cite_start]...[cite: N]`, full-width brackets, em-dashes) attach to the
 * current run.
 */
type ScriptRun = { cls: 'kana' | 'han' | 'latin' | 'unknown'; buf: string };

function splitLineByScript(line: string): ScriptRun[] {
  if (!line.trim()) return [];

  const runs: ScriptRun[] = [];
  let cur: ScriptRun = { cls: 'unknown', buf: '' };

  const flush = () => {
    if (cur.buf) runs.push(cur);
    cur = { cls: 'unknown', buf: '' };
  };

  for (const ch of line) {
    const cls = classify(ch);
    let chCls: ScriptRun['cls'];
    if (cls === 'kana') chCls = 'kana';
    else if (cls === 'han') chCls = 'han';
    else if (cls === 'latin') chCls = 'latin';
    else chCls = 'unknown';                  // neutral / punct

    if (chCls === 'unknown') {
      cur.buf += ch;
      continue;
    }
    if (cur.cls === 'unknown') {
      cur.cls = chCls;
      cur.buf += ch;
      continue;
    }
    if (chCls === cur.cls) {
      cur.buf += ch;
      continue;
    }
    // Script transition.
    flush();
    cur.cls = chCls;
    cur.buf += ch;
  }
  flush();
  return runs;
}

/**
 * Assign language tags to a sequence of script runs collected across an
 * entire paragraph buffer. Trilingual rows follow JA → EN → ZH order, whether
 * laid out as three separate lines (Format A) or concatenated on one line
 * (Format B), or hybrid (Format C: JA on one line, EN+ZH on the next).
 *
 * Rule (state machine driven by the first time we see each script):
 *   - 'latin' run → EN. The first latin run also marks the JA→EN boundary.
 *   - 'kana'  run → JA.
 *   - 'han'   run → JA if no latin has been seen yet, else ZH.
 *   - Short 'han' run (≤ 3 Han chars) sandwiched between two latin runs is
 *     a JA-term GLOSS inside English text ("*bushi* (武士 — samurai)") and
 *     gets attached to EN.
 *   - 'unknown' (pure-punctuation) runs are dropped.
 */
function assignLangs(runs: ScriptRun[]): Array<{ lang: 'ja' | 'en' | 'zh'; text: string }> {
  let sawLatin = false;
  const out: Array<{ lang: 'ja' | 'en' | 'zh'; text: string }> = [];
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    if (r.cls === 'latin') {
      sawLatin = true;
      out.push({ lang: 'en', text: r.buf });
      continue;
    }
    if (r.cls === 'kana') {
      out.push({ lang: 'ja', text: r.buf });
      continue;
    }
    if (r.cls === 'han') {
      const prev = runs[i - 1];
      const next = runs[i + 1];
      const isShort = countScript(r.buf) <= 3;
      if (isShort && prev && prev.cls === 'latin' && next && next.cls === 'latin') {
        out.push({ lang: 'en', text: r.buf });
        continue;
      }
      out.push({ lang: sawLatin ? 'zh' : 'ja', text: r.buf });
      continue;
    }
    // 'unknown' → drop
  }
  // Merge adjacent same-lang runs.
  const merged: Array<{ lang: 'ja' | 'en' | 'zh'; text: string }> = [];
  for (const t of out) {
    const last = merged[merged.length - 1];
    if (last && last.lang === t.lang) last.text += t.text;
    else merged.push({ ...t });
  }
  return merged;
}

/**
 * Count contiguous-script chars (Han or kana) inside a run buffer.
 * Used to distinguish short "gloss" Han runs from long ZH-sentence runs.
 */
function countScript(buf: string): number {
  let count = 0;
  for (const ch of buf) {
    const cls = classify(ch);
    if (cls === 'kana' || cls === 'han') count += 1;
  }
  return count;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function parse(content: string, sourceFile: string): ParseResult {
  const lines = content.split('\n');
  const blocks: ParsedBlock[] = [];
  const skipped: ParseResult['skipped'] = [];
  const quirks: string[] = [];
  let zhCharsDropped = 0;
  let zhRunsDropped = 0;
  let totalPages = 0;
  let totalBlocksSeen = 0;

  let currentPage = 0;
  let blockIndexInPage = 0;
  let buffer: string[] = [];
  let pendingHeading = false;
  let inPage = false;
  let sawFileHeader = false;

  const flushBlock = () => {
    if (buffer.length === 0) {
      pendingHeading = false;
      return;
    }
    totalBlocksSeen += 1;
    const isHeading = pendingHeading;
    pendingHeading = false;

    // Collect script runs across ALL lines in the buffer FIRST, then assign
    // languages with a single JA→EN→ZH state machine. This is what makes
    // Format A (three separate lines: JA / EN / ZH where JA and ZH may both
    // be pure-Han) parse correctly: we only see the JA→latin→ZH transition
    // when looking at the buffer as a whole.
    const allRuns: ScriptRun[] = [];
    for (const ln of buffer) {
      const r = splitLineByScript(ln);
      // Push a neutral run between lines as a soft separator so the
      // language-assigner sees them as distinct "chunks" but they still
      // merge correctly in the final pass.
      if (allRuns.length > 0 && r.length > 0) {
        allRuns.push({ cls: 'unknown', buf: ' ' });
      }
      allRuns.push(...r);
    }
    const chunks = assignLangs(allRuns);

    const jaParts: string[] = [];
    const enParts: string[] = [];
    let zhCharsThisBlock = 0;
    let zhRunsThisBlock  = 0;
    for (const c of chunks) {
      if (c.lang === 'ja') jaParts.push(c.text);
      else if (c.lang === 'en') enParts.push(c.text);
      else if (c.lang === 'zh') {
        zhCharsThisBlock += c.text.length;
        zhRunsThisBlock  += 1;
      }
    }

    const ja = normalizeWhitespace(jaParts.join(' '));
    const en = normalizeWhitespace(enParts.join(' '));

    zhCharsDropped += zhCharsThisBlock;
    zhRunsDropped  += zhRunsThisBlock;

    const blockIdx = blockIndexInPage++;
    if (!ja && !en) {
      skipped.push({ page: currentPage, blockIndex: blockIdx, reason: 'empty after parse (likely pure-ZH or pure-punct)' });
      buffer = [];
      return;
    }
    if (!ja || !en) {
      skipped.push({ page: currentPage, blockIndex: blockIdx, reason: !ja ? 'missing JA' : 'missing EN' });
      console.warn(`[warn] page ${currentPage} block ${blockIdx}: ${!ja ? 'missing JA' : 'missing EN'}, skipping`);
      buffer = [];
      return;
    }
    blocks.push({
      page: currentPage,
      blockIndex: blockIdx,
      isHeading,
      ja,
      en,
      zhCharsDropped: zhCharsThisBlock,
    });
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/\s+$/, ''); // trim trailing whitespace; preserve leading
    const trimmed = line.trim();

    // ---- File header (lines 1–6 typically) ---------------------------------
    if (!sawFileHeader) {
      if (trimmed.startsWith('# ') ||
          trimmed.startsWith('**Generated:**') ||
          trimmed.startsWith('**Pages translated:**')) {
        continue;
      }
      if (trimmed === '---' && !inPage) {
        // The first `---` we see before any Page marker is the
        // file-header terminator.
        sawFileHeader = true;
        continue;
      }
    }

    // ---- Page markers ------------------------------------------------------
    const pageOpen = trimmed.match(/^Page\s+(\d+)\s*$/);
    if (pageOpen) {
      flushBlock();
      currentPage = Number(pageOpen[1]);
      totalPages = Math.max(totalPages, currentPage);
      blockIndexInPage = 0;
      inPage = true;
      sawFileHeader = true;
      continue;
    }

    const pageEnd = trimmed.match(/^===\s*END OF PAGE\s+(\d+)\s*===\s*$/);
    if (pageEnd) {
      flushBlock();
      inPage = false;
      continue;
    }

    if (!inPage) {
      // Lines outside a page (between END OF PAGE N and Page N+1) — ignore.
      if (trimmed && !trimmed.match(/^---+$/)) {
        // Don't bother quirk-logging blanks.
      }
      continue;
    }

    // ---- Paragraph separator ----------------------------------------------
    if (trimmed === '---') {
      flushBlock();
      continue;
    }

    // ---- Heading marker ----------------------------------------------------
    if (trimmed === '【Heading】') {
      flushBlock();           // close any current block first
      pendingHeading = true;
      continue;
    }

    // ---- Blank line: just a soft separator inside a buffer ----------------
    if (trimmed === '') {
      continue;
    }

    buffer.push(trimmed);
  }

  // EOF flush
  flushBlock();

  if (totalPages === 0) {
    quirks.push('No `Page N` markers found — file may not be a trilingual export.');
  }

  return {
    blocks,
    totalPages,
    totalBlocksSeen,
    skipped,
    zhCharsDropped,
    zhRunsDropped,
    quirks,
  };
}

// ---------------------------------------------------------------------------
// Title derivation
// ---------------------------------------------------------------------------

function deriveTitle(filePath: string): string {
  const base = basename(filePath).replace(/_trilingual\.md$/i, '').replace(/\.md$/i, '');
  // Title-case: split on spaces / underscores / hyphens; capitalize tokens
  // that are not already mixed-case (preserve things like "Baba" / "ZH").
  return base
    .split(/[\s_]+/)
    .map(tok => tok.length === 0
      ? tok
      : (tok[0].toUpperCase() + tok.slice(1)))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// DB insert
// ---------------------------------------------------------------------------

interface InsertResult {
  articleId: string;
  segmentsInserted: number;
}

async function insertAll(
  sb: SupabaseClient,
  title: string,
  blocks: ParsedBlock[],
  sourceFile: string,
): Promise<InsertResult> {
  const N = blocks.length;

  // 1. Article
  //
  // NOTE: types/database.ts declares `articles.status`, but the live DB schema
  // (verified via Management API on 2026-05-28) does NOT have that column.
  // Per scope ("Schema option 1: no schema change", "do NOT modify
  // types/database.ts"), we omit `status` from the insert and rely on
  // `translation_status='qa_approved'` to mark this article as
  // pipeline-imported. Logged as a schema-drift quirk in the run report.
  const { data: articleRow, error: artErr } = await sb
    .from('articles')
    .insert({
      title,
      content_ja: null,
      content_en: null,
      translation_status: 'qa_approved',
      quality_score: null,
      segmented: true,
      segment_count: N,
    })
    .select('id, title, segment_count')
    .single();

  if (artErr || !articleRow) {
    throw new Error(`articles insert failed: ${artErr?.message ?? 'no row returned'}`);
  }
  const articleId: string = (articleRow as { id: string }).id;
  console.log(`[ok] inserted article id=${articleId} title="${title}"`);

  // 2. Segments — batches of 500
  const BATCH = 500;
  let inserted = 0;
  for (let offset = 0; offset < N; offset += BATCH) {
    const slice = blocks.slice(offset, offset + BATCH);
    const rows = slice.map((b, i) => ({
      article_id: articleId,
      position: offset + i,
      source_text: b.ja,
      target_text: b.en,
      source_lang: 'ja',
      target_lang: 'en',
      status: 'qa_approved',
      translated_by: null,
      reviewed_by: null,
      metadata: {
        imported_from_pipeline: true,
        source_file: sourceFile,
        page: b.page,
        ...(b.isHeading ? { kind: 'heading' } : {}),
      },
    }));
    const { error: segErr } = await sb.from('segments').insert(rows);
    if (segErr) {
      throw new Error(`segments insert failed at offset=${offset}: ${segErr.message}`);
    }
    inserted += rows.length;
    console.log(`[ok] inserted segments ${offset}..${offset + rows.length - 1} (running total ${inserted}/${N})`);
  }

  // 3. document_settings
  const boundaries = Array.from({ length: N }, (_, i) => i);
  const { error: dsErr } = await sb.from('document_settings').insert({
    article_id: articleId,
    source_lang: 'ja',
    target_lang: 'en',
    paragraph_boundaries: boundaries,
    total_segments: N,
    translated_count: N,
    reviewed_count: N,
    approved_count: N,
    assigned_translators: [],
  });
  if (dsErr) {
    throw new Error(`document_settings insert failed: ${dsErr.message}`);
  }
  console.log(`[ok] inserted document_settings (paragraph_boundaries length=${N})`);

  return { articleId, segmentsInserted: inserted };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: npx tsx scripts/import-trilingual-references.ts <path-to-trilingual.md>');
    process.exit(1);
  }

  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL missing from .env.local');
    process.exit(1);
  }
  if (!key) {
    console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY missing from .env.local');
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const filePath = arg;
  const sourceFile = basename(filePath);
  console.log(`[info] reading ${filePath}`);
  const content = await readFile(filePath, 'utf8');
  console.log(`[info] read ${content.length} bytes, ${content.split('\n').length} lines`);

  const title = deriveTitle(filePath);
  console.log(`[info] derived title="${title}"`);

  // Idempotency check
  const { data: existing, error: lookupErr } = await sb
    .from('articles')
    .select('id, title')
    .eq('title', title)
    .maybeSingle();
  if (lookupErr) {
    console.error(`FATAL: lookup of existing article failed: ${lookupErr.message}`);
    process.exit(1);
  }
  if (existing) {
    console.log(`[skip] article "${title}" already imported (id=${(existing as { id: string }).id})`);
    process.exit(0);
  }

  // Parse
  console.log(`[info] parsing...`);
  const t0 = Date.now();
  const parsed = parse(content, sourceFile);
  const t1 = Date.now();
  console.log(`[info] parse complete in ${t1 - t0}ms`);
  console.log(`[info] pages=${parsed.totalPages}, blocks_seen=${parsed.totalBlocksSeen}, blocks_kept=${parsed.blocks.length}, blocks_skipped=${parsed.skipped.length}`);
  console.log(`[info] dropped ${parsed.zhRunsDropped} ZH runs / ${parsed.zhCharsDropped} ZH chars (option 1: bilingual import per BACKEND-HANDOFF-DATA-IMPORT.md)`);

  if (parsed.skipped.length > 0) {
    const reasonCounts = new Map<string, number>();
    for (const s of parsed.skipped) {
      reasonCounts.set(s.reason, (reasonCounts.get(s.reason) ?? 0) + 1);
    }
    console.log(`[info] skip reasons:`);
    for (const [reason, n] of reasonCounts) console.log(`         ${n}× ${reason}`);
  }
  if (parsed.quirks.length > 0) {
    console.log(`[info] parser quirks:`);
    for (const q of parsed.quirks) console.log(`         - ${q}`);
  }

  if (parsed.blocks.length === 0) {
    console.error('FATAL: no segments parsed; refusing to insert empty article.');
    process.exit(1);
  }

  // Insert
  console.log(`[info] inserting into DB...`);
  const result = await insertAll(sb, title, parsed.blocks, sourceFile);

  // Verification
  console.log(`\n=== verification ===`);
  const { data: verifyArt } = await sb
    .from('articles')
    .select('id, title, segment_count, translation_status')
    .eq('id', result.articleId)
    .single();
  console.log(`article: ${JSON.stringify(verifyArt)}`);

  const { data: verifyByStatus } = await sb
    .from('segments')
    .select('status')
    .eq('article_id', result.articleId);
  if (verifyByStatus) {
    const counts = new Map<string, number>();
    for (const r of verifyByStatus as Array<{ status: string }>) {
      counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    }
    console.log(`segments by status:`);
    for (const [s, n] of counts) console.log(`  ${n}  ${s}`);
  }

  const { data: firstThree } = await sb
    .from('segments')
    .select('position, source_text, target_text, metadata')
    .eq('article_id', result.articleId)
    .order('position', { ascending: true })
    .limit(3);
  console.log(`first 3 segments (truncated to 100 chars):`);
  for (const s of (firstThree ?? []) as Array<{ position: number; source_text: string; target_text: string; metadata: unknown }>) {
    console.log(`  pos=${s.position}`);
    console.log(`    JA: ${s.source_text.slice(0, 100)}${s.source_text.length > 100 ? '…' : ''}`);
    console.log(`    EN: ${s.target_text.slice(0, 100)}${s.target_text.length > 100 ? '…' : ''}`);
    console.log(`    meta: ${JSON.stringify(s.metadata)}`);
  }

  console.log(`\n=== summary ===`);
  console.log(`pages:              ${parsed.totalPages}`);
  console.log(`blocks_seen:        ${parsed.totalBlocksSeen}`);
  console.log(`segments_inserted:  ${result.segmentsInserted}`);
  console.log(`blocks_skipped:     ${parsed.skipped.length}`);
  console.log(`zh_runs_dropped:    ${parsed.zhRunsDropped}`);
  console.log(`zh_chars_dropped:   ${parsed.zhCharsDropped}`);
  console.log(`article_id:         ${result.articleId}`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(99);
});
