/**
 * Apply Migration 018 (server-side document search in get_documents_feed_v1)
 * via Supabase Management API.
 *
 * Usage:  npx tsx scripts/dashboard-recon/apply-migration-018.ts
 */

import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const MIGRATION_PATH = 'supabase/migrations/018_documents_search.sql';
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

  // STEP 1: Apply the RPC
  console.log('=== STEP 1: Apply get_documents_feed_v1 with search support ===\n');
  const sql = await readFile(MIGRATION_PATH, 'utf8');
  console.log(`Loaded ${sql.length} bytes from ${MIGRATION_PATH}. POSTing...\n`);
  const { status, body } = await runQuery(token, sql);
  console.log(`HTTP ${status}`);
  console.log(JSON.stringify(body, null, 2), '\n');
  if (!ok(status)) { console.error('FAILED applying migration 018.'); process.exit(3); }

  // STEP 2: POST-VERIFY new function signature
  console.log('=== STEP 2: Post-verify new 6-param signature ===\n');
  const verify = await runQuery(token, `
    SELECT
      to_regprocedure('public.get_documents_feed_v1(text,uuid,int,text,text,text)') IS NOT NULL AS fn_new_sig,
      proname,
      pg_get_function_arguments(oid) AS arguments
    FROM pg_proc
    WHERE proname = 'get_documents_feed_v1'
      AND pronamespace = 'public'::regnamespace;`);
  console.log(`[${verify.status}]`, JSON.stringify(verify.body, null, 2), '\n');

  // STEP 3: SMOKE — search without cursor (p_search_term = 'ken')
  console.log('=== STEP 3: Smoke — search for "ken" (no cursor) ===\n');
  const smoke = await runQuery(token, `
    SELECT * FROM get_documents_feed_v1(
      NULL, NULL, 5, 'created_at', 'desc', 'ken'
    );`);
  const rows = Array.isArray(smoke.body) ? smoke.body as Record<string, unknown>[] : [];
  console.log(`HTTP ${smoke.status}, ${rows.length} rows:`);
  for (const r of rows.slice(0, 5)) {
    console.log(`  ${String(r['title'] ?? '?').slice(0, 60)} | status=${r['translation_status']}`);
  }

  // STEP 4: Verify search respects cursor (page 2 of same search)
  if (rows.length > 0) {
    console.log('\n=== STEP 4: Cursor test with search ===\n');
    const last = rows[rows.length - 1];
    const cursorVal = String(last['created_at'] ?? '');
    const cursorId = String(last['id']);
    const p2 = await runQuery(token, `
      SELECT * FROM get_documents_feed_v1(
        '${cursorVal}', '${cursorId}'::uuid, 5, 'created_at', 'desc', 'ken'
      );`);
    const p2rows = Array.isArray(p2.body) ? p2.body as Record<string, unknown>[] : [];
    const p1ids = new Set(rows.map(r => String(r['id'])));
    const overlap = p2rows.filter(r => p1ids.has(String(r['id'])));
    console.log(`Page 2: ${p2rows.length} rows, overlap with page 1: ${overlap.length}`);
  }

  // STEP 5: Verify NULL search term works same as before
  console.log('\n=== STEP 5: NULL search (backward compat) ===\n');
  const nullSearch = await runQuery(token, `
    SELECT count(*) AS cnt FROM get_documents_feed_v1(NULL, NULL, 5, 'created_at', 'desc', NULL);
  `);
  console.log(`NULL search (default):`, JSON.stringify(nullSearch.body), '\n');

  console.log('=== Migration 018 applied successfully ===');
  console.log('Summary: get_documents_feed_v1 now supports p_search_term | ILIKE on title | Backward compatible');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
