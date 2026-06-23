/**
 * Apply Migration 011 (fix search_segments performance) via Supabase Management API.
 *
 * Non-interactive. Workflow:
 *   1. Load SUPABASE_ACCESS_TOKEN (PAT, sbp_*) from .env.local.
 *   2. POST the 011_fix_search_segments.sql as a single query.
 *   3. BENCHMARK: EXPLAIN ANALYZE on search_segments('kote', 50) and search_segments('men', 50).
 *   4. Report timings and plan nodes.
 *
 * Usage:  npx tsx scripts/dashboard-recon/apply-migration-011.ts
 */

import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const MIGRATION_PATH = 'supabase/migrations/011_fix_search_segments.sql';
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

  console.log('=== Applying Migration 011 ===\n');
  const sql = await readFile(MIGRATION_PATH, 'utf8');
  console.log(`Loaded ${sql.length} bytes from ${MIGRATION_PATH}. POSTing...\n`);
  const { status, body } = await runQuery(token, sql);
  console.log(`HTTP ${status}`);
  if (!ok(status)) {
    console.error(JSON.stringify(body, null, 2));
    console.error('FAILED applying migration 011.');
    process.exit(3);
  }
  // For CREATE OR REPLACE FUNCTION, successful response is empty array []
  console.log(JSON.stringify(body, null, 2), '\n');

  // Verify function exists
  console.log('=== Post-verify: function registered ===\n');
  const verify = await runQuery(token, `
    SELECT to_regprocedure('public.search_segments(text,int)') IS NOT NULL AS fn_search;`);
  console.log(`[${verify.status}]`, JSON.stringify(verify.body, null, 2), '\n');

  // ===========================================================================
  // BENCHMARK
  // ===========================================================================
  const queries = [
    { label: "search_segments('kote', 50)", sql: "EXPLAIN ANALYZE SELECT * FROM search_segments('kote', 50);" },
    { label: "search_segments('men', 50)",  sql: "EXPLAIN ANALYZE SELECT * FROM search_segments('men', 50);" },
    { label: "search_segments('剣道', 50)",  sql: "EXPLAIN ANALYZE SELECT * FROM search_segments('剣道', 50);" },
  ];

  console.log('=== BENCHMARK: EXPLAIN ANALYZE ===\n');
  for (const q of queries) {
    console.log(`--- ${q.label} ---`);
    const { status: s, body: b } = await runQuery(token, q.sql);
    console.log(`HTTP ${s}`);
    if (ok(s) && Array.isArray(b)) {
      for (const row of b) {
        // The EXPLAIN output comes as rows with a "QUERY PLAN" column
        const plan = typeof row === 'object' && row !== null ? (row as Record<string,unknown>)['QUERY PLAN'] : row;
        if (plan) console.log(`  ${plan}`);
      }
    } else {
      console.log(JSON.stringify(b, null, 2));
    }
    console.log();
  }

  // Also run a plain SELECT to confirm data shape
  console.log('=== Smoke: data shape ===\n');
  const smoke = await runQuery(token, "SELECT * FROM search_segments('kote', 3);");
  console.log(`[${smoke.status}]`, JSON.stringify(smoke.body, null, 2), '\n');

  console.log('=== Migration 011 applied and benchmarked ===');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
