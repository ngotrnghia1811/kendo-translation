/**
 * Clean re-importer for kendo book content sourced from the
 * `book-postprocessing/<book>/pages/page_NNN.md` files.
 *
 * WHY pages/*.md and NOT triplet.json:
 *   triplet.json has alignment-corruption bugs (it sometimes shifts the EN
 *   text into the JA slot and blanks EN). The page .md files are correctly
 *   aligned and are the source of truth (verified directly by the caller).
 *
 * Per the locked project decisions (Schema option 1, bilingual JA→EN only):
 *   - ZH is dropped entirely.
 *   - Each block = one segment (no sentence splitting).
 *   - position is zero-based ascending across the whole book (page asc,
 *     block order within page).
 *   - paragraph_boundaries = [0,1,...,N-1] (every segment is its own para).
 *   - Headings kept as segments with metadata.kind = 'heading'.
 *   - Segment status on insert = 'qa_approved'.
 *   - metadata = { imported_from_pipeline:true, source_file:'<dir>/pages',
 *     page:<N>, ...(heading? {kind:'heading'}) }.
 *
 * IMPORT PROCEDURE per article (delete-then-insert):
 *   1. DELETE all segments where article_id = <id>.
 *   2. INSERT new segments (batches of 500).
 *   3. UPDATE articles: segment_count, segmented=true,
 *      translation_status='qa_approved'.
 *   4. UPSERT document_settings: paragraph_boundaries=[0..N-1] (+counts).
 *
 * Existing article rows are PRESERVED (we never create/delete articles).
 *
 * Usage:
 *   npx tsx scripts/import-clean-triplets.ts <dir-name>     # one book
 *   npx tsx scripts/import-clean-triplets.ts <dir-name> --dry-run
 *   npx tsx scripts/import-clean-triplets.ts --all          # gated bulk (18)
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ENV_PATH = '.env.local';
const CLEAN_ROOT = '/Users/nghiango-mbp/git_repo/universal-agent_v2/book-postprocessing';

/** dir-name -> { id, title }. PRESERVE these article rows; never recreate. */
const ARTICLE_MAP: Record<string, { id: string; title: string }> = {
  '100 practice full':    { id: 'eb180692-f702-400c-9d8f-1ee09309b6c2', title: '100 Practice Full' },
  'Eiga Full':            { id: '33ca2416-50c1-4b93-a4ff-5318da576c35', title: 'Eiga Full' },
  'Etiqu 1 Full':         { id: 'aea3e1a6-fe6a-408b-b57d-4942900670f4', title: 'Etiqu 1 Full' },
  'Hayashi Full':         { id: '42f1851e-1d21-4bbf-966b-d1cfef54471d', title: 'Hayashi Full' },
  'KodaSS 200 full':      { id: '9fb879ce-9247-45fb-9db7-d4fdedff7496', title: 'KodaSS 200 Full' },
  'Left foot full':       { id: 'cb602626-be32-4b5f-ac0e-337fa8807aae', title: 'Left Foot Full' },
  'Lifelong Full':        { id: '11bf7ade-a84c-493e-9964-b2f09286c6c3', title: 'Lifelong Full' },
  'Men Full':             { id: 'db9e53c2-941c-471c-9a62-abcb7bb91d42', title: 'Men Full' },
  'Mental Full':          { id: 'abe50f79-c04f-41c1-9409-faee5a389c62', title: 'Mental Full' },
  'Ogawa lecture part 1': { id: '086772e8-9bf4-4881-849e-3597f90aa884', title: 'Ogawa Lecture Part 1' },
  'Ogawa lecture part 2': { id: 'f877550e-9a53-45ca-ac36-f440bb5e4c32', title: 'Ogawa Lecture Part 2' },
  'Ogawa lecture part 3': { id: '05410dcf-74ba-4655-a7c2-53879c0b8880', title: 'Ogawa Lecture Part 3' },
  'SumiSS 10 c 1 Full':   { id: '119888a3-96e5-420a-ba8e-9b1f25acd44e', title: 'SumiSS 10 C 1 Full' },
  'SumiSS Train Full':    { id: '4bb88ee9-933a-4511-80fb-cc66dcd026b0', title: 'SumiSS Train Full' },
  'Tanden Full':          { id: '084983bb-8f91-42b1-b5b3-4add46bfc5a1', title: 'Tanden Full' },
  'Tani ss full':         { id: 'f43c7bb9-6f4c-4c5d-abcb-bbf8317fa356', title: 'Tani Ss Full' },
  'baba 1 clean':         { id: '86adf815-b0ca-46eb-bab7-b6fb040b845c', title: 'Baba 1 Clean' },
  'baba 2 clean':         { id: 'ab187703-3a17-46ae-bca5-f30b9cd916a4', title: 'Baba 2 Clean' },
};

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
// Script detection (adapted from scripts/import-trilingual-references.ts).
// Used ONLY to split single-line trilingual blocks and the merged EN+ZH tail
// of 2-line blocks. NEVER applied to clean per-line content.
// ---------------------------------------------------------------------------

const RE_KANA = /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF]/;
const RE_HAN  = /[\u3400-\u4DBF\u4E00-\u9FFF]/;

type ScriptClass = 'kana' | 'han' | 'latin' | 'neutral';
function classify(ch: string): ScriptClass {
  if (RE_KANA.test(ch)) return 'kana';
  if (RE_HAN.test(ch))  return 'han';
  const cp = ch.codePointAt(0)!;
  if ((cp >= 0x0030 && cp <= 0x0039) ||
      (cp >= 0x0041 && cp <= 0x005A) ||
      (cp >= 0x0061 && cp <= 0x007A) ||
      (cp >= 0x00C0 && cp <= 0x024F)) return 'latin';
  return 'neutral';
}

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
    else chCls = 'unknown';

    if (chCls === 'unknown') { cur.buf += ch; continue; }
    if (cur.cls === 'unknown') { cur.cls = chCls; cur.buf += ch; continue; }
    if (chCls === cur.cls) { cur.buf += ch; continue; }
    flush();
    cur.cls = chCls;
    cur.buf += ch;
  }
  flush();
  return runs;
}

function countScript(buf: string): number {
  let count = 0;
  for (const ch of buf) {
    const cls = classify(ch);
    if (cls === 'kana' || cls === 'han') count += 1;
  }
  return count;
}

/**
 * Assign JA/EN/ZH to script runs (JA→EN→ZH order state machine).
 * - latin run            -> EN
 * - kana run             -> JA
 * - han run              -> JA if no latin seen yet, else ZH
 * - short han (<=3) run sandwiched between two latin runs -> EN (a JA-term
 *   gloss inside English, e.g. "*bushi* (武士 — samurai)")
 */
function assignLangs(runs: ScriptRun[]): Array<{ lang: 'ja' | 'en' | 'zh'; text: string }> {
  let sawLatin = false;
  const out: Array<{ lang: 'ja' | 'en' | 'zh'; text: string }> = [];
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    if (r.cls === 'latin') { sawLatin = true; out.push({ lang: 'en', text: r.buf }); continue; }
    if (r.cls === 'kana') { out.push({ lang: 'ja', text: r.buf }); continue; }
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
  }
  const merged: Array<{ lang: 'ja' | 'en' | 'zh'; text: string }> = [];
  for (const t of out) {
    const last = merged[merged.length - 1];
    if (last && last.lang === t.lang) last.text += t.text;
    else merged.push({ ...t });
  }
  return merged;
}

function splitOneLineTrilingual(line: string): { ja: string; en: string; zh: string } {
  const chunks = assignLangs(splitLineByScript(line));
  const ja: string[] = [], en: string[] = [], zh: string[] = [];
  for (const c of chunks) {
    if (c.lang === 'ja') ja.push(c.text);
    else if (c.lang === 'en') en.push(c.text);
    else zh.push(c.text);
  }
  return { ja: nw(ja.join(' ')), en: nw(en.join(' ')), zh: nw(zh.join(' ')) };
}

/** Split a merged "EN ... ZH" tail line: leading latin/gloss = EN, trailing CJK = ZH. */
function splitEnZh(line: string): { en: string; zh: string } {
  const chunks = assignLangs(splitLineByScript(line));
  const en: string[] = [], zh: string[] = [];
  for (const c of chunks) {
    if (c.lang === 'en') en.push(c.text);
    else if (c.lang === 'zh') zh.push(c.text);
    // any stray 'ja' on an EN/ZH line is folded into EN (kana inside English gloss)
    else en.push(c.text);
  }
  return { en: nw(en.join(' ')), zh: nw(zh.join(' ')) };
}

function nw(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Does a string contain any CJK (kana or han)? */
function hasCjk(s: string): boolean {
  return RE_KANA.test(s) || RE_HAN.test(s);
}
/** Does a string contain ASCII-Latin letters? */
function hasLatin(s: string): boolean {
  return /[A-Za-z]/.test(s);
}

// ---------------------------------------------------------------------------
// Block parsing
// ---------------------------------------------------------------------------

interface ParsedBlock {
  page: number;
  isHeading: boolean;
  ja: string;
  en: string;
}

interface BookParse {
  blocks: ParsedBlock[];
  totalBlocksSeen: number;
  skippedUntranslated: number; // JA present, EN empty
  skippedOther: number;        // neither, or EN-only, or empty
  headingSegments: number;
  pages: number[];             // pages that produced >=1 block
  minPage: number;
  maxPage: number;
  // edge-case telemetry
  nThreeLine: number;
  nSingleLine: number;
  nTwoLine: number;
  nOther: number;
  anomalies: string[];
}

/**
 * Parse one block's content lines (heading marker already stripped) into
 * { ja, en } by classifying lines. Returns ZH too (dropped by caller).
 *
 * Strategy by line count:
 *   3 lines (NORMAL): line[0]=JA, line[1]=EN, line[2]=ZH — taken verbatim.
 *     Preserves inline [T/N: ...] and gloss markers in EN exactly.
 *   1 line (EDGE A): script-split into JA/EN/ZH.
 *   2 lines (EDGE B): two sub-cases detected by script content:
 *     (B1) line[0]=JA, line[1]=EN+ZH merged -> JA = line0, splitEnZh(line1).
 *     (B2) line[0]=JA+EN merged, line[1]=ZH -> JA/EN from line0 split, drop line1.
 *   >=4 lines: classify each line as JA / EN / ZH by its dominant script and
 *     join per-language in order (handles wrapped JA + numbering noise).
 */
function parseBlockLines(lines: string[]): { ja: string; en: string; shape: string } {
  if (lines.length === 3) {
    // NORMAL clean case — take verbatim, no script-splitting.
    return { ja: nw(lines[0]), en: nw(lines[1]), shape: '3' };
  }

  if (lines.length === 1) {
    const r = splitOneLineTrilingual(lines[0]);
    return { ja: r.ja, en: r.en, shape: '1' };
  }

  if (lines.length === 2) {
    const l0 = lines[0], l1 = lines[1];
    // Detect whether line0 already contains EN (Latin). If line0 is pure
    // JA (CJK, no Latin sentence), it's B1 (JA / EN+ZH). If line0 has Latin,
    // it's B2 (JA+EN / ZH).
    const l0HasLatin = hasLatin(l0);
    if (!l0HasLatin) {
      // B1: JA on line0, EN+ZH merged on line1.
      const { en } = splitEnZh(l1);
      return { ja: nw(l0), en, shape: '2:B1' };
    }
    // B2: JA+EN merged on line0, ZH on line1 (drop line1 = ZH).
    const r = splitOneLineTrilingual(l0);
    return { ja: r.ja, en: r.en, shape: '2:B2' };
  }

  // >=4 lines: classify each line by dominant script, join in order.
  // A line is JA if it has CJK and no Latin sentence; EN if it has Latin;
  // ZH lines are detected as CJK-only lines that appear AFTER an EN line.
  const ja: string[] = [], en: string[] = [];
  let sawEn = false;
  for (const raw of lines) {
    const ln = nw(raw);
    if (!ln) continue;
    // Numbering noise like "1." / "2." -> skip.
    if (/^\d+\.$/.test(ln)) continue;
    const latin = hasLatin(ln);
    const cjk = hasCjk(ln);
    if (latin && !sawEn) {
      // First Latin-bearing line: it may be EN, possibly EN+ZH merged.
      const { en: e } = splitEnZh(ln);
      en.push(e);
      sawEn = true;
    } else if (latin && sawEn) {
      // Additional Latin line after EN — still EN content (rare wrap).
      const { en: e } = splitEnZh(ln);
      en.push(e);
    } else if (cjk && !sawEn) {
      // CJK before any EN -> JA (possibly a JA-with-leading-digit heading line).
      ja.push(ln);
    } else {
      // CJK after EN -> ZH -> drop.
    }
  }
  return { ja: nw(ja.join(' ')), en: nw(en.join(' ')), shape: `${lines.length}` };
}

function parsePage(content: string, page: number, acc: BookParse): ParsedBlock[] {
  let lines = content.split('\n');
  // Drop leading "Page N" header line.
  if (lines.length && /^Page\s+\d+\s*$/.test(lines[0].trim())) {
    lines = lines.slice(1);
  }
  const body = lines.join('\n');
  const rawBlocks = body.split(/\n---\n/);
  const out: ParsedBlock[] = [];

  for (const rb of rawBlocks) {
    let cl = rb.split('\n').filter((l) => l.trim().length > 0);
    if (cl.length === 0) continue;

    let isHeading = false;
    if (cl[0].trim() === '【Heading】') {
      isHeading = true;
      cl = cl.slice(1);
    }
    if (cl.length === 0) continue;

    acc.totalBlocksSeen += 1;

    const { ja, en, shape } = parseBlockLines(cl);

    // edge-case telemetry
    if (shape === '3') acc.nThreeLine += 1;
    else if (shape === '1') acc.nSingleLine += 1;
    else if (shape.startsWith('2')) acc.nTwoLine += 1;
    else acc.nOther += 1;

    const jaOk = ja.trim().length > 0;
    const enOk = en.trim().length > 0;

    if (jaOk && enOk) {
      if (isHeading) acc.headingSegments += 1;
      out.push({ page, isHeading, ja, en });
    } else if (jaOk && !enOk) {
      acc.skippedUntranslated += 1;
    } else {
      acc.skippedOther += 1;
    }
  }
  return out;
}

async function parseBook(dirName: string): Promise<BookParse> {
  const pagesDir = join(CLEAN_ROOT, dirName, 'pages');
  const files = (await readdir(pagesDir))
    .filter((f) => /^page_\d{3}\.md$/.test(f))
    .sort();

  const acc: BookParse = {
    blocks: [], totalBlocksSeen: 0, skippedUntranslated: 0, skippedOther: 0,
    headingSegments: 0, pages: [], minPage: Infinity, maxPage: -Infinity,
    nThreeLine: 0, nSingleLine: 0, nTwoLine: 0, nOther: 0, anomalies: [],
  };

  for (const f of files) {
    const page = Number(f.match(/^page_(\d{3})\.md$/)![1]);
    const content = await readFile(join(pagesDir, f), 'utf8');
    const blocks = parsePage(content, page, acc);
    if (blocks.length > 0) {
      acc.pages.push(page);
      acc.minPage = Math.min(acc.minPage, page);
      acc.maxPage = Math.max(acc.maxPage, page);
    }
    acc.blocks.push(...blocks);
  }

  if (!Number.isFinite(acc.minPage)) { acc.minPage = 0; acc.maxPage = 0; }
  return acc;
}

// ---------------------------------------------------------------------------
// DB import (delete-then-insert)
// ---------------------------------------------------------------------------

async function importBook(
  sb: SupabaseClient,
  dirName: string,
  parse: BookParse,
): Promise<{ articleId: string; inserted: number }> {
  const map = ARTICLE_MAP[dirName];
  if (!map) throw new Error(`no article mapping for dir "${dirName}"`);
  const articleId = map.id;
  const N = parse.blocks.length;
  const sourceFile = `${dirName}/pages`;

  // 1. DELETE existing segments for this article.
  const { error: delErr } = await sb.from('segments').delete().eq('article_id', articleId);
  if (delErr) throw new Error(`segments delete failed: ${delErr.message}`);
  console.log(`[ok] deleted existing segments for article ${articleId}`);

  // 2. INSERT new segments in batches of 500, position = running 0-based index.
  const BATCH = 500;
  let inserted = 0;
  for (let offset = 0; offset < N; offset += BATCH) {
    const slice = parse.blocks.slice(offset, offset + BATCH);
    const rows = slice.map((b, i) => ({
      article_id: articleId,
      position: offset + i,
      source_text: b.ja,
      target_text: b.en,
      source_lang: 'ja',
      target_lang: 'en',
      status: 'qa_approved',
      metadata: {
        imported_from_pipeline: true,
        source_file: sourceFile,
        page: b.page,
        ...(b.isHeading ? { kind: 'heading' } : {}),
      },
    }));
    const { error: segErr } = await sb.from('segments').insert(rows);
    if (segErr) throw new Error(`segments insert failed at offset=${offset}: ${segErr.message}`);
    inserted += rows.length;
    console.log(`[ok] inserted segments ${offset}..${offset + rows.length - 1} (total ${inserted}/${N})`);
  }

  // 3. UPDATE articles row (preserve the row; just update counts/status).
  const { error: artErr } = await sb
    .from('articles')
    .update({ segment_count: N, segmented: true, translation_status: 'qa_approved' })
    .eq('id', articleId);
  if (artErr) throw new Error(`articles update failed: ${artErr.message}`);
  console.log(`[ok] updated article segment_count=${N}`);

  // 4. UPSERT document_settings: paragraph_boundaries = [0..N-1].
  const boundaries = Array.from({ length: N }, (_, i) => i);
  const { error: dsErr } = await sb
    .from('document_settings')
    .upsert(
      {
        article_id: articleId,
        source_lang: 'ja',
        target_lang: 'en',
        paragraph_boundaries: boundaries,
        total_segments: N,
        translated_count: N,
        reviewed_count: N,
        approved_count: N,
        assigned_translators: [],
      },
      { onConflict: 'article_id' },
    );
  if (dsErr) throw new Error(`document_settings upsert failed: ${dsErr.message}`);
  console.log(`[ok] upserted document_settings (paragraph_boundaries length=${N})`);

  return { articleId, inserted };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function printParseSummary(dirName: string, p: BookParse) {
  console.log(`\n=== parse summary: ${dirName} ===`);
  console.log(`blocks_seen:           ${p.totalBlocksSeen}`);
  console.log(`segments (JA+EN):      ${p.blocks.length}`);
  console.log(`  of which headings:   ${p.headingSegments}`);
  console.log(`skipped_untranslated:  ${p.skippedUntranslated}   (JA only, no EN)`);
  console.log(`skipped_other:         ${p.skippedOther}          (neither / EN-only / empty)`);
  console.log(`page range:            ${p.minPage}..${p.maxPage}`);
  console.log(`block shapes:          3-line=${p.nThreeLine} 1-line=${p.nSingleLine} 2-line=${p.nTwoLine} other=${p.nOther}`);
  if (p.anomalies.length) {
    console.log(`anomalies:`);
    for (const a of p.anomalies) console.log(`  - ${a}`);
  }
}

async function verify(sb: SupabaseClient, articleId: string, N: number) {
  console.log(`\n=== DB verification ===`);
  const { data: art } = await sb
    .from('articles')
    .select('id,title,segment_count,segmented,translation_status')
    .eq('id', articleId)
    .single();
  console.log(`article: ${JSON.stringify(art)}`);

  const { data: ds } = await sb
    .from('document_settings')
    .select('paragraph_boundaries,total_segments')
    .eq('article_id', articleId)
    .single();
  const pbLen = (ds as { paragraph_boundaries: number[] } | null)?.paragraph_boundaries?.length ?? -1;
  console.log(`document_settings.paragraph_boundaries length: ${pbLen} (expected ${N}, match=${pbLen === N})`);

  const { count: segCount } = await sb
    .from('segments')
    .select('*', { count: 'exact', head: true })
    .eq('article_id', articleId);
  console.log(`segments row count in DB: ${segCount}`);

  const fmt = (s: { position: number; source_text: string; target_text: string; metadata: { page?: number; kind?: string } }) =>
    `  pos=${s.position} page=${s.metadata?.page} kind=${s.metadata?.kind ?? '-'} | JA="${s.source_text.slice(0, 40)}" | EN="${s.target_text.slice(0, 40)}"`;

  const { data: first5 } = await sb
    .from('segments')
    .select('position,source_text,target_text,metadata')
    .eq('article_id', articleId)
    .order('position', { ascending: true })
    .limit(5);
  console.log(`FIRST 5 segments:`);
  for (const s of (first5 ?? []) as any[]) console.log(fmt(s));

  const { data: lastAny } = await sb
    .from('segments')
    .select('position,source_text,target_text,metadata')
    .eq('article_id', articleId)
    .order('position', { ascending: false })
    .limit(3);
  console.log(`LAST 3 segments:`);
  for (const s of ((lastAny ?? []) as any[]).reverse()) console.log(fmt(s));

  // Class A artifact check: old pos 1 had EN "*Ken* (剣 — sword)*Ken*（".
  const { data: kenRows } = await sb
    .from('segments')
    .select('position,source_text,target_text,metadata')
    .eq('article_id', articleId)
    .eq('source_text', '剣');
  console.log(`\nClass A artifact check — segments with JA exactly "剣":`);
  for (const s of (kenRows ?? []) as any[]) {
    const clean = s.target_text === '*Ken* (剣 — sword)';
    console.log(`  pos=${s.position} EN="${s.target_text}" kind=${s.metadata?.kind ?? '-'} CLEAN=${clean}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function runOne(sb: SupabaseClient, dirName: string, dryRun: boolean) {
  if (!ARTICLE_MAP[dirName]) {
    console.error(`FATAL: "${dirName}" is not in the article map.`);
    process.exit(1);
  }
  console.log(`[info] parsing book "${dirName}" ...`);
  const parse = await parseBook(dirName);
  printParseSummary(dirName, parse);

  if (parse.blocks.length === 0) {
    console.error('FATAL: no segments parsed; refusing to import empty book.');
    process.exit(1);
  }

  if (dryRun) {
    console.log(`\n[dry-run] no DB writes performed.`);
    // Offline preview of the Class A target block.
    const ken = parse.blocks.find((b) => b.ja === '剣');
    if (ken) console.log(`[dry-run] "剣" block -> EN="${ken.en}" heading=${ken.isHeading}`);
    return;
  }

  console.log(`\n[info] importing into DB...`);
  const { articleId } = await importBook(sb, dirName, parse);
  await verify(sb, articleId, parse.blocks.length);
}

interface BookResult {
  dir: string;
  articleId: string;
  title: string;
  blocksSeen: number;
  inserted: number;       // segments inserted (JA+EN both present)
  headings: number;
  skippedUntranslated: number;
  skippedOther: number;
  error?: string;
}

async function runAll(sb: SupabaseClient, dryRun: boolean) {
  const dirs = Object.keys(ARTICLE_MAP);
  console.log(`[info] --all bulk import over ${dirs.length} books (sequential)${dryRun ? ' [dry-run]' : ''}\n`);

  const results: BookResult[] = [];

  for (const dir of dirs) {
    const map = ARTICLE_MAP[dir];
    try {
      console.log(`\n############################################################`);
      console.log(`# BOOK: ${dir}  (article ${map.id})`);
      console.log(`############################################################`);

      const parse = await parseBook(dir);
      printParseSummary(dir, parse);

      if (parse.blocks.length === 0) {
        throw new Error('no segments parsed; refusing to import empty book.');
      }

      let inserted = 0;
      if (dryRun) {
        console.log(`[dry-run] no DB writes performed for ${dir}.`);
        inserted = parse.blocks.length;
      } else {
        const res = await importBook(sb, dir, parse);
        inserted = res.inserted;
        await verify(sb, res.articleId, parse.blocks.length);
      }

      const r: BookResult = {
        dir,
        articleId: map.id,
        title: map.title,
        blocksSeen: parse.totalBlocksSeen,
        inserted,
        headings: parse.headingSegments,
        skippedUntranslated: parse.skippedUntranslated,
        skippedOther: parse.skippedOther,
      };
      results.push(r);

      console.log(
        `\n[BOOK DONE] dir="${dir}" blocks_seen=${r.blocksSeen} ` +
        `segments_inserted=${r.inserted} headings=${r.headings} ` +
        `skipped_untranslated=${r.skippedUntranslated} skipped_other=${r.skippedOther}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n[BOOK FAILED] dir="${dir}" article=${map.id} :: ${msg}`);
      console.error(`[info] continuing to next book...`);
      results.push({
        dir,
        articleId: map.id,
        title: map.title,
        blocksSeen: 0,
        inserted: 0,
        headings: 0,
        skippedUntranslated: 0,
        skippedOther: 0,
        error: msg,
      });
    }
  }

  // -------- Totals table --------
  console.log(`\n\n============================================================`);
  console.log(`TOTALS TABLE (${results.length} books)`);
  console.log(`============================================================`);
  const pad = (s: string | number, n: number) => String(s).padEnd(n);
  const padL = (s: string | number, n: number) => String(s).padStart(n);
  console.log(
    `${pad('dir', 24)} ${padL('seen', 6)} ${padL('inserted', 9)} ${padL('headings', 9)} ${padL('untrans', 8)} ${padL('other', 6)}  status`,
  );
  console.log('-'.repeat(80));

  let tSeen = 0, tIns = 0, tHead = 0, tUntr = 0, tOther = 0, nErr = 0;
  for (const r of results) {
    tSeen += r.blocksSeen;
    tIns += r.inserted;
    tHead += r.headings;
    tUntr += r.skippedUntranslated;
    tOther += r.skippedOther;
    if (r.error) nErr += 1;
    console.log(
      `${pad(r.dir, 24)} ${padL(r.blocksSeen, 6)} ${padL(r.inserted, 9)} ${padL(r.headings, 9)} ` +
      `${padL(r.skippedUntranslated, 8)} ${padL(r.skippedOther, 6)}  ${r.error ? 'ERROR: ' + r.error : 'ok'}`,
    );
  }
  console.log('-'.repeat(80));
  console.log(
    `${pad('TOTALS', 24)} ${padL(tSeen, 6)} ${padL(tIns, 9)} ${padL(tHead, 9)} ${padL(tUntr, 8)} ${padL(tOther, 6)}`,
  );
  console.log(`\nGRAND TOTALS: segments_inserted=${tIns}  skipped_untranslated=${tUntr}  skipped_other=${tOther}  books_errored=${nErr}`);
  if (nErr > 0) {
    console.log(`ERRORED BOOKS:`);
    for (const r of results) if (r.error) console.log(`  - ${r.dir}: ${r.error}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');
  const positional = args.filter((a) => !a.startsWith('--'));

  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local');
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  if (all) {
    await runAll(sb, dryRun);
    return;
  }

  const dirName = positional[0];
  if (!dirName) {
    console.error('Usage: npx tsx scripts/import-clean-triplets.ts <dir-name> [--dry-run]');
    console.error('       npx tsx scripts/import-clean-triplets.ts --all   (gated)');
    process.exit(1);
  }

  await runOne(sb, dirName, dryRun);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(99);
});
