/**
 * Creates new article rows for kendojidai 2014-2018.
 *
 * These years do NOT yet exist in the DB (unlike 2010-2013 which are
 * pre-existing). Run this script BEFORE importing segment data for those
 * years via the importer.
 *
 * Usage:
 *   npx tsx scripts/create-kendojidai-articles.ts
 *   npx tsx scripts/create-kendojidai-articles.ts --dry-run
 */

import { readFile } from 'node:fs/promises';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ENV_PATH = '.env.local';

const KENDOJIDAI_NEW: Array<{ title: string; year: number }> = [
  { title: 'Kendojidai 2014', year: 2014 },
  { title: 'Kendojidai 2015', year: 2015 },
  { title: 'Kendojidai 2016', year: 2016 },
  { title: 'Kendojidai 2017', year: 2017 },
  { title: 'Kendojidai 2018', year: 2018 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local');
    process.exit(1);
  }

  const sb: SupabaseClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = KENDOJIDAI_NEW.map((entry) => ({
    title: entry.title,
    language: 'ja',
    segmented: false,
    segment_count: 0,
    translation_status: 'draft',
    metadata: { source: 'kendojidai_magazine', year: entry.year },
  }));

  if (dryRun) {
    console.log('[dry-run] Would upsert the following rows:');
    for (const r of rows) {
      console.log(`  ${r.title}  language=${r.language}  segmented=${r.segmented}  status=${r.translation_status}  metadata=${JSON.stringify(r.metadata)}`);
    }
    console.log('\n[dry-run] No DB writes performed.');
    return;
  }

  console.log('[info] Upserting kendojidai 2014-2018 articles...');
  const { error: upsertErr } = await sb
    .from('articles')
    .upsert(rows, { onConflict: 'title', ignoreDuplicates: false });
  if (upsertErr) {
    console.error(`FATAL: upsert failed: ${upsertErr.message}`);
    process.exit(1);
  }

  // Query back to confirm and print UUIDs.
  const titles = KENDOJIDAI_NEW.map((e) => e.title);
  const { data: created, error: queryErr } = await sb
    .from('articles')
    .select('id, title')
    .in('title', titles);
  if (queryErr) {
    console.error(`FATAL: query-back failed: ${queryErr.message}`);
    process.exit(1);
  }

  console.log('\nCreated/found articles:');
  for (const row of (created ?? []) as Array<{ id: string; title: string }>) {
    console.log(`  ${row.title}: ${row.id}`);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(99);
});
