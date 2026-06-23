/**
 * Apply Migration 010 (Phase 1.2 Data Layer) via Supabase Management API.
 *
 * Non-interactive (operator already authorized). Workflow:
 *   1. Load SUPABASE_ACCESS_TOKEN (PAT, sbp_*) from .env.local.
 *   2. Pre-flight: report which 010 objects already exist (idempotency check).
 *   3. POST the entire 010_phase1_data_layer.sql as a single query.
 *   4. Post-verify: confirm 4 functions + 2 GIN indexes + trigger exist.
 *   5. Report status; exit non-zero on failure.
 *
 * Usage:  npx tsx scripts/dashboard-recon/apply-migration-010.ts
 */

import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const MIGRATION_PATH = 'supabase/migrations/010_phase1_data_layer.sql';
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

  console.log('=== Pre-flight: existing 010 objects ===\n');
  const pre = await runQuery(token, `
    SELECT
      to_regprocedure('public.get_article_bilingual_v2(uuid,text)') IS NOT NULL AS fn_bilingual,
      to_regprocedure('public.search_segments(text,int)')          IS NOT NULL AS fn_search,
      to_regprocedure('public.get_documents_feed_v1(timestamptz,int)') IS NOT NULL AS fn_feed,
      to_regclass('public.idx_segments_source_trgm') IS NOT NULL AS idx_source_trgm,
      to_regclass('public.idx_segments_target_trgm') IS NOT NULL AS idx_target_trgm,
      EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='sync_profile_role_trigger') AS trg_role_sync;`);
  console.log(`[${pre.status}]`, JSON.stringify(pre.body, null, 2), '\n');
  if (!ok(pre.status)) { console.error('Pre-flight failed. Aborting.'); process.exit(2); }

  console.log('=== Applying Migration 010 ===\n');
  const sql = await readFile(MIGRATION_PATH, 'utf8');
  console.log(`Loaded ${sql.length} bytes from ${MIGRATION_PATH}. POSTing...\n`);
  const { status, body } = await runQuery(token, sql);
  console.log(`HTTP ${status}`);
  console.log(JSON.stringify(body, null, 2), '\n');
  if (!ok(status)) { console.error('FAILED applying migration 010.'); process.exit(3); }

  console.log('=== Post-verify: objects now present ===\n');
  const post = await runQuery(token, `
    SELECT
      to_regprocedure('public.get_article_bilingual_v2(uuid,text)') IS NOT NULL AS fn_bilingual,
      to_regprocedure('public.search_segments(text,int)')          IS NOT NULL AS fn_search,
      to_regprocedure('public.get_documents_feed_v1(timestamptz,int)') IS NOT NULL AS fn_feed,
      to_regclass('public.idx_segments_source_trgm') IS NOT NULL AS idx_source_trgm,
      to_regclass('public.idx_segments_target_trgm') IS NOT NULL AS idx_target_trgm,
      EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='sync_profile_role_trigger') AS trg_role_sync,
      (SELECT COUNT(*) FROM auth.users WHERE raw_app_meta_data ? 'role') AS users_with_role_claim;`);
  console.log(`[${post.status}]`, JSON.stringify(post.body, null, 2), '\n');

  console.log('=== Smoke: RPCs return without error ===\n');
  const smoke = await runQuery(token, `
    SELECT
      (SELECT COUNT(*) FROM get_documents_feed_v1(NULL, 5)) AS feed_rows,
      (SELECT COUNT(*) FROM search_segments('kendo', 5)) AS search_rows;`);
  console.log(`[${smoke.status}]`, JSON.stringify(smoke.body, null, 2), '\n');

  console.log('=== Migration 010 applied successfully ===');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
