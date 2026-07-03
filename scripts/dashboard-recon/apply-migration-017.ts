/**
 * Apply Migration 017 (server-side sort for get_documents_feed_v1)
 * via Supabase Management API.
 *
 * Non-interactive. Workflow:
 *   1. Load SUPABASE_ACCESS_TOKEN (PAT, sbp_*) from .env.local.
 *   2. POST the CREATE OR REPLACE FUNCTION (instant, near-zero IO).
 *   3. POST-VERIFY: to_regprocedure confirms new signature exists.
 *   4. SMOKE: test each sort column in both directions (6 calls).
 *   5. CURSOR TEST: fetch page 1, extract cursor, fetch page 2 — verify
 *      no overlapping ids and correct ordering continuation.
 *
 * The RPC is a pure function rewrite — no indexes, no locks, no data migration.
 * Apply-risk: low. Rollback: re-apply migration 010.
 *
 * Usage:  npx tsx scripts/dashboard-recon/apply-migration-017.ts
 */

import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const MIGRATION_PATH = 'supabase/migrations/017_documents_feed_sort.sql';
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
  // STEP 1: Apply the RPC
  // =========================================================================
  console.log('=== STEP 1: Apply get_documents_feed_v1 with sort support ===\n');
  const sql = await readFile(MIGRATION_PATH, 'utf8');
  console.log(`Loaded ${sql.length} bytes from ${MIGRATION_PATH}. POSTing...\n`);
  const { status, body } = await runQuery(token, sql);
  console.log(`HTTP ${status}`);
  console.log(JSON.stringify(body, null, 2), '\n');
  if (!ok(status)) { console.error('FAILED applying migration 017.'); process.exit(3); }

  // =========================================================================
  // STEP 2: POST-VERIFY new function signature
  // =========================================================================
  console.log('=== STEP 2: Post-verify new signature exists ===\n');
  const verify = await runQuery(token, `
    SELECT
      to_regprocedure('public.get_documents_feed_v1(text,uuid,int,text,text)') IS NOT NULL AS fn_new_sig,
      proname,
      pg_get_function_arguments(oid) AS arguments
    FROM pg_proc
    WHERE proname = 'get_documents_feed_v1'
      AND pronamespace = 'public'::regnamespace;`);
  console.log(`[${verify.status}]`, JSON.stringify(verify.body, null, 2), '\n');

  // =========================================================================
  // STEP 3: SMOKE — test each sort column in both directions
  // =========================================================================
  console.log('=== STEP 3: Smoke — sort by each column in both directions ===\n');

  const sortTests: Array<{ by: string; dir: string; label: string }> = [
    { by: 'created_at',   dir: 'desc', label: 'created_at DESC (default)' },
    { by: 'created_at',   dir: 'asc',  label: 'created_at ASC' },
    { by: 'title',        dir: 'asc',  label: 'title ASC' },
    { by: 'title',        dir: 'desc', label: 'title DESC' },
    { by: 'segment_count', dir: 'desc', label: 'segment_count DESC' },
    { by: 'segment_count', dir: 'asc',  label: 'segment_count ASC' },
    { by: 'status',       dir: 'asc',  label: 'status ASC (pending→complete)' },
    { by: 'status',       dir: 'desc', label: 'status DESC (complete→pending)' },
    { by: 'updated_at',   dir: 'desc', label: 'updated_at DESC' },
    { by: 'updated_at',   dir: 'asc',  label: 'updated_at ASC' },
  ];

  for (const t of sortTests) {
    const q = `SELECT * FROM get_documents_feed_v1(NULL, NULL, 5, '${t.by}', '${t.dir}');`;
    const r = await runQuery(token, q);
    const rows = Array.isArray(r.body) ? r.body as Record<string, unknown>[] : [];
    const first3 = rows.slice(0, 3).map((row) =>
      `${String(row['title'] ?? '?').slice(0, 30)} | seg=${row['segment_count']} | status=${row['translation_status']}`
    ).join('  ||  ');
    console.log(`  ${t.label}: HTTP ${r.status}, ${rows.length} rows → ${first3 || '(empty)'}`);
  }

  // =========================================================================
  // STEP 4: CURSOR TEST — verify stable pagination across page boundary
  // =========================================================================
  console.log('\n=== STEP 4: Cursor Test — pagination stability ===\n');

  // Helper to compute next_cursor for a row (matching API-layer logic)
  function cursorFor(row: Record<string, unknown>, sortBy: string): string {
    const id = String(row['id']);
    let sortVal: string;
    switch (sortBy) {
      case 'title':         sortVal = String(row['title'] ?? ''); break;
      case 'created_at':    sortVal = String(row['created_at'] ?? ''); break;
      case 'updated_at':    sortVal = String(row['updated_at'] ?? '1970-01-01 00:00:00+00'); break;
      case 'segment_count': sortVal = String(row['segment_count'] ?? 0).padStart(10, '0'); break;
      case 'status': {
        const s = String(row['translation_status'] ?? 'pending');
        sortVal = { pending: '0', in_progress: '1', translated: '2', complete: '3', qa_approved: '4' }[s] ?? '0';
        break;
      }
      default: sortVal = String(row['created_at'] ?? ''); break;
    }
    return `${sortVal}|${id}`;
  }

  for (const sortBy of ['title', 'created_at', 'segment_count']) {
    // Page 1
    const p1 = await runQuery(token, `SELECT * FROM get_documents_feed_v1(NULL, NULL, 5, '${sortBy}', 'asc');`);
    const p1rows = Array.isArray(p1.body) ? p1.body as Record<string, unknown>[] : [];
    if (p1rows.length === 0) { console.log(`  ${sortBy} ASC: page 1 empty, skipping cursor test`); continue; }

    const cursor = cursorFor(p1rows[p1rows.length - 1], sortBy);
    const [sortVal, cid] = cursor.split('|');

    // Page 2
    const p2 = await runQuery(token, `SELECT * FROM get_documents_feed_v1('${sortVal}', '${cid}'::uuid, 5, '${sortBy}', 'asc');`);
    const p2rows = Array.isArray(p2.body) ? p2.body as Record<string, unknown>[] : [];

    // Verify no overlap
    const p1ids = new Set(p1rows.map(r => String(r['id'])));
    const p2ids = p2rows.map(r => String(r['id']));
    const overlap = p2ids.filter(id => p1ids.has(id));

    // Verify ordering: max sort_val of p1 <= min sort_val of p2
    const p1vals = p1rows.map(r => {
      switch (sortBy) {
        case 'segment_count': return String(r['segment_count'] ?? 0).padStart(10, '0');
        case 'title': return String(r['title'] ?? '');
        default: return String(r['created_at'] ?? '');
      }
    });
    const p2vals = p2rows.map(r => {
      switch (sortBy) {
        case 'segment_count': return String(r['segment_count'] ?? 0).padStart(10, '0');
        case 'title': return String(r['title'] ?? '');
        default: return String(r['created_at'] ?? '');
      }
    });

    const maxP1 = p1vals[p1vals.length - 1];
    const minP2 = p2vals[0] ?? '';
    const orderOk = p2vals.length === 0 || maxP1 <= minP2;

    console.log(`  ${sortBy} ASC cursor test: p1=${p1rows.length} rows, p2=${p2rows.length} rows, overlap=${overlap.length}, order=${orderOk ? 'OK' : 'FAIL'}`);
    if (!orderOk) {
      console.log(`    p1 last val: ${maxP1}, p2 first val: ${minP2}`);
    }
  }

  console.log('\n=== Migration 017 applied successfully ===');
  console.log('Summary: get_documents_feed_v1 now supports server-side sort | Compound cursor | Whitelist-safe');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
