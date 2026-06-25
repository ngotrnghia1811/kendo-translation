/**
 * Apply Migration 014 (bulk_update_ruby_data RPC) via Supabase Management API.
 *
 * Non-interactive. Workflow:
 *   1. Load SUPABASE_ACCESS_TOKEN (PAT, sbp_*) from .env.local.
 *   2. POST the 014_bulk_update_ruby_data.sql CREATE OR REPLACE FUNCTION.
 *   3. POST-VERIFY: to_regprocedure confirms function exists.
 *   4. SMOKE: call the function with a trivial batch.
 *
 * Usage:  npx tsx scripts/dashboard-recon/apply-migration-014.ts
 */

import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const MIGRATION_PATH = 'supabase/migrations/014_bulk_update_ruby_data.sql';
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
  // APPLY migration
  // =========================================================================
  console.log('=== Applying Migration 014 ===\n');
  const sql = await readFile(MIGRATION_PATH, 'utf8');
  console.log(`Loaded ${sql.length} bytes from ${MIGRATION_PATH}. POSTing...\n`);
  const { status, body } = await runQuery(token, sql);
  console.log(`HTTP ${status}`);
  console.log(JSON.stringify(body, null, 2), '\n');
  if (!ok(status)) {
    console.error('FAILED applying migration 014.');
    process.exit(3);
  }

  // =========================================================================
  // POST-VERIFY: function registered
  // =========================================================================
  console.log('=== Post-verify: function registered ===\n');
  const verify = await runQuery(token, `
    SELECT
      to_regprocedure('public.bulk_update_ruby_data(uuid[], jsonb[])') IS NOT NULL AS fn_exists,
      proname,
      pg_get_function_result(oid)        AS return_type,
      pg_get_function_arguments(oid)     AS arguments
    FROM pg_proc
    WHERE proname = 'bulk_update_ruby_data'
      AND pronamespace = 'public'::regnamespace;`);
  console.log(`[${verify.status}]`, JSON.stringify(verify.body, null, 2), '\n');

  // =========================================================================
  // SMOKE: call with trivial batch
  // =========================================================================
  console.log('=== Smoke: call with empty arrays ===\n');
  const smoke = await runQuery(token, `
    SELECT bulk_update_ruby_data('{}'::uuid[], '{}'::jsonb[]) AS updated_count;`);
  console.log(`[${smoke.status}]`);
  if (Array.isArray(smoke.body) && smoke.body.length > 0) {
    const row = smoke.body[0] as Record<string, unknown>;
    const count = row['updated_count'] ?? row['bulk_update_ruby_data'];
    if (count === 0) {
      console.log(`  → empty batch returned ${count} (expected 0). RPC functional.`);
    } else {
      console.log(`  ⚠️  returned ${count} (expected 0 for empty batch)`);
    }
  } else {
    console.log(JSON.stringify(smoke.body, null, 2));
  }

  console.log('\n=== Migration 014 applied and verified ===');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
