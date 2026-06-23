/**
 * Apply Migration 012 (reader window fetch) via Supabase Management API.
 *
 * Non-interactive. Workflow:
 *   1. Load SUPABASE_ACCESS_TOKEN (PAT, sbp_*) from .env.local.
 *   2. POST the 012_reader_window_fetch.sql as a single query.
 *   3. POST-VERIFY: both functions registered.
 *   4. BENCHMARK: EXPLAIN ANALYZE on get_article_bilingual_window.
 *
 * Usage:  npx tsx scripts/dashboard-recon/apply-migration-012.ts
 */

import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const MIGRATION_PATH = 'supabase/migrations/012_reader_window_fetch.sql';
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

  console.log('=== Applying Migration 012 ===\n');
  const sql = await readFile(MIGRATION_PATH, 'utf8');
  console.log(`Loaded ${sql.length} bytes from ${MIGRATION_PATH}. POSTing...\n`);
  const { status, body } = await runQuery(token, sql);
  console.log(`HTTP ${status}`);
  if (!ok(status)) {
    console.error(JSON.stringify(body, null, 2));
    console.error('FAILED applying migration 012.');
    process.exit(3);
  }
  console.log(JSON.stringify(body, null, 2), '\n');

  // Post-verify: functions registered
  console.log('=== Post-verify: functions registered ===\n');
  const verify = await runQuery(token, `
    SELECT
      to_regprocedure('public.get_article_bilingual_window(uuid,text,int,int,int)') IS NOT NULL AS fn_window,
      to_regprocedure('public.get_article_page_info(uuid,text,text)') IS NOT NULL AS fn_page_info;`);
  console.log(`[${verify.status}]`, JSON.stringify(verify.body, null, 2), '\n');

  // ===========================================================================
  // BENCHMARK: EXPLAIN ANALYZE
  // ===========================================================================
  console.log('=== BENCHMARK: EXPLAIN ANALYZE ===\n');

  // Find a real article with segments — use the known test doc
  const articleId = '86adf815-b0ca-46eb-bab7-b6fb040b845c';

  const benchmarks = [
    {
      label: 'get_article_bilingual_window (OFFSET/LIMIT, page 1, 50 rows)',
      sql: `EXPLAIN ANALYZE SELECT * FROM get_article_bilingual_window('${articleId}'::uuid, 'en', 0, 50);`
    },
    {
      label: 'get_article_bilingual_window (OFFSET/LIMIT, page 10, 50 rows)',
      sql: `EXPLAIN ANALYZE SELECT * FROM get_article_bilingual_window('${articleId}'::uuid, 'en', 450, 50);`
    },
    {
      label: 'get_article_page_info',
      sql: `EXPLAIN ANALYZE SELECT * FROM get_article_page_info('${articleId}'::uuid, 'en', 'any_translated');`
    },
  ];

  for (const b of benchmarks) {
    console.log(`--- ${b.label} ---`);
    const { status: s, body: bd } = await runQuery(token, b.sql);
    console.log(`HTTP ${s}`);
    if (ok(s) && Array.isArray(bd)) {
      for (const row of bd) {
        const plan = typeof row === 'object' && row !== null ? (row as Record<string,unknown>)['QUERY PLAN'] : row;
        if (plan) console.log(`  ${plan}`);
      }
    } else {
      console.log(JSON.stringify(bd, null, 2));
    }
    console.log();
  }

  // Smoke: data shape
  console.log('=== Smoke: data shape ===\n');
  const smoke = await runQuery(token,
    `SELECT count(*) AS cnt FROM get_article_bilingual_window('${articleId}'::uuid, 'en', 0, 3);`);
  console.log(`[${smoke.status}]`, JSON.stringify(smoke.body, null, 2), '\n');

  console.log('=== Migration 012 applied and benchmarked ===');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
