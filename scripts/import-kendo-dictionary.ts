/**
 * Import script for the kendo dictionary supplement into the Supabase
 * `terminology` table.
 *
 * Input file (3880 lines, ~645 entries):
 *   /Users/nghiango-mbp/git_repo/git_upload/kendo-dictionary/kendo_dictionary_update.md
 *
 * Each entry block is three lines (JA / EN / ZH) separated by a `---` line:
 *
 *   動作 (どうさ / Dōsa): 身体の動きや所作のこと...
 *   Actions / Movements: Physical motions and bodily actions...
 *   动作: 身体的动作与所作...
 *   ---
 *
 * Parsing:
 *   - Split on `\n---\n` block delimiters.
 *   - First non-blank line in each block = Japanese line.
 *     → source_term = text before first `(`, trimmed.
 *     → reading     = text inside first `(...)`, kept as-is.
 *     → jp_notes    = text after the `: ` on the Japanese line (parsed
 *                     but NOT written to the DB — note column is English).
 *   - Remaining lines = classify by dominant script (CJK vs Latin):
 *       If Latin present and CJK count ≤ Latin count → English line.
 *       Otherwise → Chinese line (skipped entirely).
 *     From the English line:
 *       target_term = text before `:`, trimmed.
 *       notes       = text after `:`, trimmed (English explanation).
 *   - Blocks with zero usable lines, `#` / `##` headers, or section
 *     markers are skipped.
 *
 * Database:
 *   Table  : public.terminology
 *   Columns: source_term, target_term, reading*, notes*, domain='kendo',
 *            term_type='preferred'  (* = nullable)
 *
 *   Upsert strategy: SELECT existing (source_term, domain) → skip matches
 *   (--force overwrites them via UPDATE).
 *
 * Usage:
 *   npx tsx scripts/import-kendo-dictionary.ts --dry-run
 *   npx tsx scripts/import-kendo-dictionary.ts
 *   npx tsx scripts/import-kendo-dictionary.ts --limit 10
 *   npx tsx scripts/import-kendo-dictionary.ts --force
 */

import { readFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INPUT_PATH =
  "/Users/nghiango-mbp/git_repo/git_upload/kendo-dictionary/kendo_dictionary_update.md";
const ENV_PATH = ".env.local";
const BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Entry {
  source_term: string;
  target_term: string;
  reading: string | null;
  notes: string | null; // English explanation
  zh_notes: string | null; // Chinese gloss/definition (populated from ZH lines)
}

interface ExistingRow {
  id: string;
  source_term: string;
  target_term: string;
  reading: string | null;
  notes: string | null;
  zh_notes: string | null;
}

// ---------------------------------------------------------------------------
// Env loading (mirrors scripts/import-clean-triplets.ts)
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
// Character classification helpers
// ---------------------------------------------------------------------------

const RE_CJK =
  /[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\u9FFF]/;
const RE_LATIN = /[A-Za-z]/;
const RE_HAN = /[\u3400-\u4DBF\u4E00-\u9FFF]/;  // CJK Unified Ideographs only (no kana)

function countCjk(s: string): number {
  let n = 0;
  for (const ch of s) {
    if (RE_CJK.test(ch)) n++;
  }
  return n;
}

function countLatin(s: string): number {
  let n = 0;
  for (const ch of s) {
    if (RE_LATIN.test(ch)) n++;
  }
  return n;
}

function countHan(s: string): number {
  let n = 0;
  for (const ch of s) {
    if (RE_HAN.test(ch)) n++;
  }
  return n;
}

/**
 * Classify a line as English if it contains Latin characters and the number
 * of CJK characters does not exceed the number of Latin characters.
 * Otherwise treat it as Chinese (skip).
 */
function isEnglishLine(line: string): boolean {
  const latin = countLatin(line);
  if (latin === 0) return false;
  const cjk = countCjk(line);
  return cjk <= latin;
}

/**
 * Classify a line as Chinese-candidate (ZH) if it has more Han characters
 * than Latin, and is not already classified as English.
 * Returns false for pure-kana (JA) lines.
 */
function isChineseLine(line: string): boolean {
  const han = countHan(line);
  const latin = countLatin(line);
  // Require at least one Han char and more Han than Latin
  return han > 0 && han > latin;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Extract `source_term`, `reading`, and `jp_notes` from the Japanese line.
 *
 * Format:  TERM (READING): DEFINITION
 *   source_term → TERM (before the first `(`)
 *   reading     → everything inside the first `(...)` group
 *   jp_notes    → everything after the first `:` (the Japanese definition)
 *
 * If the expected `(` or `:` is absent, we degrade gracefully:
 *   - no `(` → reading = null, source_term = everything before `:`
 *   - no `:` → jp_notes = null, source_term = all text
 */
function parseJapaneseLine(
  line: string,
): { source_term: string; reading: string | null; jp_notes: string | null } {
  const trimmed = line.trim();

  // Find the reading group inside the first `(...)`
  const parenOpen = trimmed.indexOf("(");
  let source_term: string;
  let reading: string | null = null;
  let afterReading: string;

  if (parenOpen >= 0) {
    const parenClose = trimmed.indexOf(")", parenOpen);
    if (parenClose >= 0) {
      source_term = trimmed.slice(0, parenOpen).trim();
      reading = trimmed.slice(parenOpen + 1, parenClose).trim();
      afterReading = trimmed.slice(parenClose + 1).trim();
    } else {
      // Unclosed paren — treat the whole thing as source_term
      source_term = trimmed;
      reading = null;
      afterReading = "";
    }
  } else {
    source_term = trimmed;
    afterReading = "";
  }

  // Now extract jp_notes from afterReading (which starts with `: ` typically)
  let jp_notes: string | null = null;
  if (afterReading.startsWith(":")) {
    jp_notes = afterReading.slice(1).trim() || null;
  } else if (afterReading.length > 0) {
    // No colon but there is trailing text — treat it all as notes
    jp_notes = afterReading;
  }

  // If no paren was found but there's a colon in source_term, split on first colon
  if (reading === null && jp_notes === null) {
    const colonIdx = source_term.indexOf(":");
    if (colonIdx >= 0) {
      jp_notes = source_term.slice(colonIdx + 1).trim() || null;
      source_term = source_term.slice(0, colonIdx).trim();
    }
  }

  return { source_term, reading, jp_notes };
}

/**
 * Extract `target_term` and `notes` from the English line.
 *
 * Format:  TERM: EXPLANATION
 *   target_term → text before `:`, trimmed
 *   notes       → text after  `:`, trimmed
 *
 * If no `:`, target_term = whole line, notes = null.
 */
function parseEnglishLine(
  line: string,
): { target_term: string; notes: string | null } {
  const trimmed = line.trim();
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx < 0) {
    return { target_term: trimmed, notes: null };
  }
  return {
    target_term: trimmed.slice(0, colonIdx).trim(),
    notes: trimmed.slice(colonIdx + 1).trim() || null,
  };
}

/**
 * Parse one block (delimited by `---`).  Returns an Entry if a JA+EN pair
 * can be extracted, or null if the block is a header / empty / invalid.
 */
function parseBlock(rawBlock: string): Entry | null {
  const lines = rawBlock
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  // Skip file-level header and section headers
  const firstLine = lines[0];
  if (firstLine.startsWith("#") || firstLine.startsWith("##")) return null;

  // The first non-blank line is always the Japanese line
  const jaLine = lines[0];
  const { source_term, reading } = parseJapaneseLine(jaLine);
  if (!source_term) return null; // cannot have entry without source term

  // Remaining lines: find the English line, then collect ZH lines after it
  let target_term = "";
  let notes: string | null = null;
  let foundEn = false;
  const zhLines: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const ln = lines[i];
    if (!foundEn && isEnglishLine(ln)) {
      const en = parseEnglishLine(ln);
      target_term = en.target_term;
      notes = en.notes;
      foundEn = true;
      continue;
    }
    if (foundEn) {
      // After EN line: collect ZH-candidate lines
      if (isChineseLine(ln)) {
        zhLines.push(ln);
      }
    }
    // Before EN line: non-EN lines are skipped (could be JA continuation or ZH preceding EN)
  }

  if (!target_term) return null; // skip entries with no English translation

  const zh_notes = zhLines.length > 0 ? zhLines.join(' ').replace(/\s+/g, ' ').trim() || null : null;

  return {
    source_term,
    target_term,
    reading: reading || null,
    notes,
    zh_notes,
  };
}

function parseEntries(content: string): Entry[] {
  // Split on `---` line separators. The regex matches `---` on its own line,
  // consuming surrounding newlines.
  const blocks = content.split(/\n---\n/);
  const entries: Entry[] = [];

  for (const raw of blocks) {
    const entry = parseBlock(raw);
    if (entry) entries.push(entry);
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Database operations
// ---------------------------------------------------------------------------

/**
 * Build a Map<source_term, ExistingRow> for all terminology rows with
 * domain = 'kendo' so we can check for duplicates.
 */
async function loadExistingMap(
  sb: SupabaseClient,
): Promise<Map<string, ExistingRow>> {
  const map = new Map<string, ExistingRow>();

  // Paginate: the table might have many rows.
  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await sb
      .from("terminology")
      .select("id,source_term,target_term,reading,notes,zh_notes")
      .eq("domain", "kendo")
      .range(offset, offset + pageSize - 1)
      .order("source_term");

    if (error) throw new Error(`Failed to load existing terms: ${error.message}`);
    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      for (const row of data as unknown as ExistingRow[]) {
        map.set(row.source_term, row);
      }
      offset += pageSize;
    }
  }

  return map;
}

async function dbInsert(
  sb: SupabaseClient,
  entries: Entry[],
  dryRun: boolean,
): Promise<number> {
  if (dryRun || entries.length === 0) return 0;

  let inserted = 0;

  for (let offset = 0; offset < entries.length; offset += BATCH_SIZE) {
    const slice = entries.slice(offset, offset + BATCH_SIZE);
    const rows = slice.map((e) => ({
      source_term: e.source_term,
      target_term: e.target_term,
      reading: e.reading,
      notes: e.notes,
      zh_notes: e.zh_notes ?? null,
      domain: "kendo",
      term_type: "preferred",
    }));

    const { error } = await sb.from("terminology").insert(rows);
    if (error) {
      throw new Error(
        `Insert failed at offset=${offset}: ${error.message}`,
      );
    }
    inserted += rows.length;
  }

  return inserted;
}

async function dbUpdate(
  sb: SupabaseClient,
  entries: { id: string; target_term: string; reading: string | null; notes: string | null; zh_notes: string | null }[],
  dryRun: boolean,
): Promise<number> {
  if (dryRun || entries.length === 0) return 0;

  let updated = 0;

  // Update one at a time — typically few rows with --force
  for (const e of entries) {
    const { error } = await sb
      .from("terminology")
      .update({
        target_term: e.target_term,
        reading: e.reading,
        notes: e.notes,
        zh_notes: e.zh_notes ?? null,
      })
      .eq("id", e.id);

    if (error) {
      throw new Error(
        `Update failed for id=${e.id} (${e.target_term}): ${error.message}`,
      );
    }
    updated++;
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");

  // Parse --limit N
  let limit: number | null = null;
  const limitIdx = args.indexOf("--limit");
  if (limitIdx >= 0) {
    const limitVal = args[limitIdx + 1];
    if (limitVal && /^\d+$/.test(limitVal)) {
      limit = Number(limitVal);
    } else {
      console.error("Error: --limit requires a positive integer argument.");
      process.exit(1);
    }
  }

  // -----------------------------------------------------------------------
  // 1. Parse the input file
  // -----------------------------------------------------------------------
  console.log(`[info] Reading input file: ${INPUT_PATH}`);
  const content = await readFile(INPUT_PATH, "utf8");
  console.log(`[info] File read: ${content.length} characters, ${content.split("\n").length} lines.`);

  let entries = parseEntries(content);
  console.log(`[info] Parsed ${entries.length} entries total.`);

  if (limit !== null && limit < entries.length) {
    entries = entries.slice(0, limit);
    console.log(`[info] Limited to first ${limit} entries.`);
  }

  if (entries.length === 0) {
    console.log("No entries to import. Exiting.");
    process.exit(0);
  }

  // Print a few samples for verification
  console.log("\nSample entries:");
  for (const e of entries.slice(0, 5)) {
    console.log(
      `  source_term="${e.source_term}"  ` +
        `target_term="${e.target_term}"  ` +
        `reading="${e.reading ?? ""}"  ` +
        `notes="${(e.notes ?? "").slice(0, 60)}"  ` +
        `zh_notes="${(e.zh_notes ?? "").slice(0, 40)}"`,
    );
  }
  if (entries.length > 5) console.log(`  ... and ${entries.length - 5} more.`);

  // -----------------------------------------------------------------------
  // 2. Load environment & connect to DB
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
  // 3. Load existing terms
  // -----------------------------------------------------------------------
  console.log("\n[info] Loading existing terminology rows (domain=kendo)...");
  const existing = await loadExistingMap(sb);
  console.log(`[info] Found ${existing.size} existing terms with domain=kendo.`);

  // -----------------------------------------------------------------------
  // 4. Classify entries: new vs existing
  // -----------------------------------------------------------------------
  const toInsert: Entry[] = [];
  const toUpdate: { id: string; target_term: string; reading: string | null; notes: string | null; zh_notes: string | null }[] = [];
  let skipped = 0;

  for (const entry of entries) {
    const existingRow = existing.get(entry.source_term);
    if (existingRow) {
      if (force) {
        toUpdate.push({
          id: existingRow.id,
          target_term: entry.target_term,
          reading: entry.reading,
          notes: entry.notes,
          zh_notes: entry.zh_notes ?? null,
        });
      } else {
        skipped++;
      }
    } else {
      toInsert.push(entry);
    }
  }

  // -----------------------------------------------------------------------
  // 5. Print summary & execute
  // -----------------------------------------------------------------------
  console.log(`\n=== Import plan ===`);
  console.log(`Parsed entries:       ${entries.length}`);
  console.log(`New (to insert):      ${toInsert.length}`);
  if (force) {
    console.log(`Existing (to update): ${toUpdate.length}`);
  } else {
    console.log(`Skipped (existing):   ${skipped}`);
  }
  console.log(`Mode:                 ${dryRun ? "DRY-RUN" : force ? "FORCE (overwrite)" : "LIVE (skip existing)"}`);

  if (dryRun) {
    console.log("\n[dry-run] No DB writes performed. Parsing stats above.");
    console.log("[dry-run] Done.");
    return;
  }

  // 5a. Insert new rows
  let inserted = 0;
  if (toInsert.length > 0) {
    console.log(`\n[info] Inserting ${toInsert.length} new rows in batches of ${BATCH_SIZE}...`);
    inserted = await dbInsert(sb, toInsert, false);
    console.log(`[ok] Inserted ${inserted} new rows.`);
  }

  // 5b. Update existing rows (--force only)
  let updated = 0;
  if (toUpdate.length > 0) {
    console.log(`\n[info] Updating ${toUpdate.length} existing rows...`);
    updated = await dbUpdate(sb, toUpdate, false);
    console.log(`[ok] Updated ${updated} existing rows.`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Parsed ${entries.length} entries`);
  console.log(`Skipping ${skipped} existing`);
  console.log(`Inserted ${inserted} new rows`);
  if (updated > 0) console.log(`Updated ${updated} existing rows`);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(99);
});
