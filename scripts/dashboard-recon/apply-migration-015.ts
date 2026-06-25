/**
 * Apply Migration 015 (set-based bulk_update_ruby_data RPC + partial index)
 * via Supabase Management API.
 *
 * Non-interactive. Workflow:
 *   1. Load SUPABASE_ACCESS_TOKEN (PAT, sbp_*) from .env.local.
 *   2. POST the set-based CREATE OR REPLACE FUNCTION (cheap, near-zero IO).
 *   3. POST-VERIFY: to_regprocedure confirms function exists.
 *   4. SMOKE: call the function with a trivial batch.
 *   5. Attempt partial index CONCURRENTLY. If it fails (txn block, timeout,
 *      or exhausted DB), try plain CREATE INDEX IF NOT EXISTS. If that also
 *      fails, report the index as authored-but-deferred.
 *
 * Usage:  npx tsx scripts/dashboard-recon/apply-migration-015.ts
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
  // STEP 1: Apply the set-based RPC (critical path — near-zero IO)
  // =========================================================================
  console.log('=== STEP 1: Apply set-based bulk_update_ruby_data RPC ===\n');

  const rpcSql = `
CREATE OR REPLACE FUNCTION bulk_update_ruby_data(
  p_ids uuid[],
  p_ruby jsonb[]
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  n int;
BEGIN
  WITH u AS (
    SELECT unnest(p_ids) AS id, unnest(p_ruby) AS rd
  )
  UPDATE segments s SET ruby_data = u.rd FROM u WHERE s.id = u.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

COMMENT ON FUNCTION bulk_update_ruby_data(uuid[], jsonb[]) IS
  'Set-based bulk-update segments.ruby_data via unnest. Replaces the per-row-loop 014 version — one UPDATE per batch, far less WAL/IO.';
`.trim();

  const rpcResult = await runQuery(token, rpcSql);
  console.log(`HTTP ${rpcResult.status}`);
  console.log(JSON.stringify(rpcResult.body, null, 2), '\n');

  if (!ok(rpcResult.status)) {
    console.error('FATAL: Failed to apply set-based RPC.');
    process.exit(3);
  }

  // =========================================================================
  // STEP 2: POST-VERIFY function registered
  // =========================================================================
  console.log('=== STEP 2: Post-verify function registered ===\n');
  const verify = await runQuery(token, `
    SELECT
      to_regprocedure('public.bulk_update_ruby_data(uuid[], jsonb[])') IS NOT NULL AS fn_exists,
      proname,
      pg_get_function_result(oid)        AS return_type,
      pg_get_function_arguments(oid)     AS arguments,
      prosrc                             AS source_start
    FROM pg_proc
    WHERE proname = 'bulk_update_ruby_data'
      AND pronamespace = 'public'::regnamespace;`);
  console.log(`[${verify.status}]`, JSON.stringify(verify.body, null, 2), '\n');

  // =========================================================================
  // STEP 3: SMOKE — call with empty batch
  // =========================================================================
  console.log('=== STEP 3: Smoke — call with empty batch ===\n');
  const smoke = await runQuery(token, `
    SELECT bulk_update_ruby_data('{}'::uuid[], '{}'::jsonb[]) AS updated_count;`);
  console.log(`[${smoke.status}]`);
  if (Array.isArray(smoke.body) && smoke.body.length > 0) {
    const row = smoke.body[0] as Record<string, unknown>;
    const count = row['updated_count'] ?? row['bulk_update_ruby_data'];
    if (count === 0) {
      console.log(`  ✓ empty batch returned ${count} (expected 0). RPC functional.`);
    } else {
      console.log(`  ⚠️  returned ${count} (expected 0 for empty batch)`);
    }
  } else {
    console.log(JSON.stringify(smoke.body, null, 2));
  }

  // =========================================================================
  // STEP 4: Source check — confirm set-based (unnest), not loop
  // =========================================================================
  console.log('\n=== STEP 4: Source check — confirm set-based body ===\n');
  const srcCheck = await runQuery(token, `
    SELECT prosrc FROM pg_proc
    WHERE proname = 'bulk_update_ruby_data'
      AND pronamespace = 'public'::regnamespace;`);
  if (Array.isArray(srcCheck.body) && srcCheck.body.length > 0) {
    const row = srcCheck.body[0] as Record<string, unknown>;
    const src = String(row['prosrc'] ?? '');
    if (src.includes('unnest')) {
      console.log('  ✓ Source contains "unnest" — set-based RPC confirmed.');
    } else {
      console.log('  ⚠️  Source does NOT contain "unnest" — may still be the loop version.');
      console.log(`  Source preview: ${src.slice(0, 200)}`);
    }
  }

  // =========================================================================
  // STEP 5: Attempt partial index (CONCURRENTLY, may fail on exhausted DB)
  // =========================================================================
  console.log('\n=== STEP 5: Attempt partial index ===\n');

  // 5a: Try CONCURRENTLY first
  const idxSql1 = 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seg_ruby_null ON segments (id) WHERE ruby_data IS NULL;';
  console.log('Trying CONCURRENTLY...');
  const idxResult1 = await runQuery(token, idxSql1);
  console.log(`HTTP ${idxResult1.status}`);
  console.log(JSON.stringify(idxResult1.body, null, 2));

  if (ok(idxResult1.status)) {
    console.log('  ✓ Partial index CONCURRENTLY applied OK.');
  } else {
    const errMsg = JSON.stringify(idxResult1.body);
    console.log(`  CONCURRENTLY failed: ${errMsg}`);
    console.log('  → Trying plain CREATE INDEX IF NOT EXISTS...');

    // 5b: Fall back to plain (non-concurrent) CREATE INDEX
    const idxSql2 = 'CREATE INDEX IF NOT EXISTS idx_seg_ruby_null ON segments (id) WHERE ruby_data IS NULL;';
    const idxResult2 = await runQuery(token, idxSql2);
    console.log(`HTTP ${idxResult2.status}`);
    console.log(JSON.stringify(idxResult2.body, null, 2));

    if (ok(idxResult2.status)) {
      console.log('  ✓ Plain CREATE INDEX applied OK.');
    } else {
      console.log('  ✗ Plain CREATE INDEX also failed.');
      console.log('  → Partial index DDL is AUTHORED and READY to apply once DB recovers.');
      console.log('     File: supabase/migrations/015_bulk_update_ruby_data_setbased.sql');
    }
  }

  console.log('\n=== Migration 015 applied ===');
  console.log('Summary: set-based RPC live ✓ | Partial index: see STEP 5 above');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
