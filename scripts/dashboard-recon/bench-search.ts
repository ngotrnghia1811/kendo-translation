/**
 * bench-search.ts — Benchmark search_segments RPC against live DB.
 *
 * Runs EXPLAIN (ANALYZE, BUFFERS) on three canonical queries,
 * and also a plain SELECT to confirm data shape.
 * Reads only — EXPLAIN ANALYZE does NOT modify data.
 *
 * Usage:  npx tsx scripts/dashboard-recon/bench-search.ts
 */

import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const ENV_PATH = '.env.local';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function loadEnv(): Promise<Record<string, string>> {
  const raw = await readFile(ENV_PATH, 'utf8');
  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

async function runQuery(token: string, sql: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

function ok(status: number) { return status === 200 || status === 201; }

async function main() {
  const env = await loadEnv();
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (!token || !token.startsWith('sbp_')) {
    console.error('FATAL: SUPABASE_ACCESS_TOKEN missing or not a PAT (sbp_*) in .env.local');
    process.exit(1);
  }

  // =========================================================================
  // STEP 1: Confirm current function source
  // =========================================================================
  console.log('=== STEP 1: Current search_segments source (preview) ===\n');
  const src = await runQuery(token, `
    SELECT prosrc FROM pg_proc
    WHERE proname = 'search_segments'
      AND pronamespace = 'public'::regnamespace;`);
  if (Array.isArray(src.body) && src.body.length > 0) {
    const row = src.body[0] as Record<string, unknown>;
    console.log(String(row['prosrc'] ?? '').slice(0, 500));
  }
  console.log();

  // =========================================================================
  // STEP 2: EXPLAIN ANALYZE baselines
  // =========================================================================
  console.log('=== STEP 2: EXPLAIN (ANALYZE, BUFFERS) baselines ===\n');

  const queries = [
    { label: "search_segments('kote', 20)", sql: "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM search_segments('kote', 20);" },
    { label: "search_segments('men', 20)",  sql: "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM search_segments('men', 20);" },
    { label: "search_segments('剣道', 20)",  sql: "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM search_segments('剣道', 20);" },
  ];

  for (const q of queries) {
    console.log(`--- ${q.label} ---`);
    const { status: s, body: b } = await runQuery(token, q.sql);
    console.log(`HTTP ${s}`);
    if (ok(s) && Array.isArray(b)) {
      for (const row of b) {
        const plan = typeof row === 'object' && row !== null
          ? (row as Record<string, unknown>)['QUERY PLAN']
          : row;
        if (plan) console.log(`  ${plan}`);
      }
    } else {
      console.log(JSON.stringify(b, null, 2));
    }
    console.log();
  }

  // =========================================================================
  // STEP 3: Plain SELECT to confirm data shape
  // =========================================================================
  console.log('=== STEP 3: Data shape smoke ===\n');
  const smoke = await runQuery(token, "SELECT * FROM search_segments('kote', 3);");
  console.log(`[${smoke.status}]`, JSON.stringify(smoke.body, null, 2), '\n');

  // =========================================================================
  // STEP 4: Row counts to understand selectivity
  // =========================================================================
  console.log('=== STEP 4: Selectivity stats ===\n');
  const stats = await runQuery(token, `
    SELECT
      (SELECT count(*) FROM segments) AS total_segments,
      (SELECT count(*) FROM segments WHERE target_text IS NOT NULL) AS bilingual_segments,
      (SELECT count(*) FROM segments WHERE source_text ILIKE '%kote%') AS kote_source,
      (SELECT count(*) FROM segments WHERE target_text ILIKE '%kote%') AS kote_target,
      (SELECT count(*) FROM segments WHERE source_text ILIKE '%men%') AS men_source,
      (SELECT count(*) FROM segments WHERE target_text ILIKE '%men%') AS men_target,
      (SELECT count(*) FROM segments WHERE source_text ILIKE '%剣道%') AS kendo_source,
      (SELECT count(*) FROM segments WHERE target_text ILIKE '%剣道%') AS kendo_target;`);
  console.log(`[${stats.status}]`, JSON.stringify(stats.body, null, 2), '\n');

  // =========================================================================
  // STEP 5: Existing indexes
  // =========================================================================
  console.log('=== STEP 5: Existing indexes on segments ===\n');
  const indexes = await runQuery(token, `
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'segments'
    ORDER BY indexname;`);
  console.log(`[${indexes.status}]`);
  if (Array.isArray(indexes.body)) {
    for (const row of indexes.body) {
      const r = row as Record<string, unknown>;
      console.log(`  ${r['indexname']}: ${r['indexdef']}`);
    }
  }

  console.log('\n=== bench-search complete ===');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
