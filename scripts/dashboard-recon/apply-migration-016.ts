/**
 * Apply Migration 016 (fix search_segments 'kote' residual) via Supabase Management API.
 *
 * Non-interactive. Workflow:
 *   1. Load SUPABASE_ACCESS_TOKEN (PAT, sbp_*) from .env.local.
 *   2. POST the CREATE OR REPLACE FUNCTION (instant, no IO).
 *   3. POST-VERIFY: to_regprocedure confirms function exists.
 *   4. BENCHMARK: EXPLAIN ANALYZE on search_segments('kote',20), 'men', '剣道'.
 *   5. SMOKE: verify data shape (3 rows).
 *
 * This is a pure RPC rewrite — no index, no lock, no data migration.
 * Apply-risk: low. Rollback: re-apply migration 011.
 *
 * Usage:  npx tsx scripts/dashboard-recon/apply-migration-016.ts
 */

import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const MIGRATION_PATH = 'supabase/migrations/016_fix_search_kote.sql';
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
  // STEP 1: Apply the RPC (instant, near-zero IO)
  // =========================================================================
  console.log('=== STEP 1: Apply search_segments RPC (no ORDER BY) ===\n');

  const rpcSql = `
CREATE OR REPLACE FUNCTION search_segments(
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  article_id uuid,
  article_title text,
  "position" int,
  source_snippet text,
  target_snippet text,
  status text,
  rank real
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT
    s.id,
    s.article_id,
    a.title AS article_title,
    s.position,
    left(s.source_text, 200) AS source_snippet,
    left(s.target_text, 200) AS target_snippet,
    s.status,
    0.0::real AS rank
  FROM segments s
  JOIN articles a ON a.id = s.article_id
  WHERE s.source_text ILIKE '%' || p_query || '%'
     OR (s.target_text IS NOT NULL AND s.target_text ILIKE '%' || p_query || '%')
  LIMIT p_limit;
$$;
`.trim();

  const rpcResult = await runQuery(token, rpcSql);
  console.log(`HTTP ${rpcResult.status}`);
  console.log(JSON.stringify(rpcResult.body, null, 2), '\n');

  if (!ok(rpcResult.status)) {
    console.error('FATAL: Failed to apply RPC.');
    process.exit(3);
  }

  // =========================================================================
  // STEP 2: POST-VERIFY function registered + ORDER BY absent
  // =========================================================================
  console.log('=== STEP 2: Post-verify function registered (no ORDER BY) ===\n');
  const verify = await runQuery(token, `
    SELECT
      to_regprocedure('public.search_segments(text,int)') IS NOT NULL AS fn_exists,
      prosrc LIKE '%ORDER BY%' AS has_order_by
    FROM pg_proc
    WHERE proname = 'search_segments'
      AND pronamespace = 'public'::regnamespace;`);
  console.log(`[${verify.status}]`, JSON.stringify(verify.body, null, 2), '\n');

  // =========================================================================
  // STEP 3: BENCHMARK — EXPLAIN ANALYZE on three canonical queries
  // =========================================================================
  console.log('=== STEP 3: BENCHMARK — EXPLAIN (ANALYZE, BUFFERS) ===\n');

  const queries = [
    { label: "search_segments('kote', 20)", sql: "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM search_segments('kote', 20);" },
    { label: "search_segments('men', 20)",  sql: "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM search_segments('men', 20);" },
    { label: "search_segments('剣道', 20)",  sql: "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM search_segments('剣道', 20);" },
  ];

  for (const q of queries) {
    // Run twice — first warms cache, second is measured
    await runQuery(token, q.sql.replace('EXPLAIN (ANALYZE, BUFFERS) ', ''));
    const { status: s, body: b } = await runQuery(token, q.sql);
    console.log(`--- ${q.label} ---`);
    console.log(`HTTP ${s}`);
    if (ok(s) && Array.isArray(b)) {
      for (const row of b) {
        const plan = (row as Record<string, unknown>)['QUERY PLAN'];
        if (plan) console.log(`  ${plan}`);
      }
    } else {
      console.log(JSON.stringify(b, null, 2));
    }
    console.log();
  }

  // =========================================================================
  // STEP 4: SMOKE — data shape verification
  // =========================================================================
  console.log('=== STEP 4: Smoke — data shape (3 rows) ===\n');
  const smoke = await runQuery(token, "SELECT * FROM search_segments('kote', 3);");
  console.log(`[${smoke.status}]`);
  if (Array.isArray(smoke.body) && smoke.body.length > 0) {
    const rows = smoke.body as Record<string, unknown>[];
    console.log(`  rows: ${rows.length}`);
    const keys = Object.keys(rows[0]).join(', ');
    console.log(`  keys: ${keys}`);
    for (let i = 0; i < rows.length; i++) {
      console.log(`  [${i}] id=${rows[i]['id']} art=${String(rows[i]['article_title']).slice(0, 30)} pos=${rows[i]['position']} status=${rows[i]['status']}`);
    }
  } else {
    console.log(JSON.stringify(smoke.body, null, 2));
  }

  console.log('\n=== Migration 016 applied ===');
  console.log('Summary: search_segments RPC rewritten (no ORDER BY) | No index changes');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
