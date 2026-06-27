/**
 * bench-no-orderby-rpc.ts — Test replacing search_segments with a ORDER BY-free version.
 *
 * Creates temp replacement function, benchmarks, ROLLBACKs.
 *
 * Usage:  npx tsx scripts/dashboard-recon/bench-no-orderby-rpc.ts
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

async function main() {
  const env = await loadEnv();
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (!token || !token.startsWith('sbp_')) {
    console.error('FATAL: SUPABASE_ACCESS_TOKEN missing');
    process.exit(1);
  }

  // BEGIN transaction
  console.log('=== BEGIN transaction ===');
  let r = await runQuery(token, 'BEGIN;');
  console.log('BEGIN:', r.status);

  // Replace function with no-ORDER-BY version
  console.log('\n=== CREATE OR REPLACE FUNCTION (no ORDER BY) ===');
  const newFn = `
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
  r = await runQuery(token, newFn);
  console.log('CREATE OR REPLACE:', r.status);

  // Verify function
  r = await runQuery(token,
    "SELECT to_regprocedure('public.search_segments(text,int)') IS NOT NULL AS fn_exists;");
  console.log('verify:', JSON.stringify(r.body));

  // Run ANALYZE to give planner fresh stats
  r = await runQuery(token, 'ANALYZE segments;');
  console.log('ANALYZE:', r.status);

  // Warm up: run once to get data in cache
  r = await runQuery(token, "SELECT * FROM search_segments('kote', 20);");
  console.log('warmup kote:', r.status, 'rows:', Array.isArray(r.body) ? (r.body as unknown[]).length : '?');

  // ===== BENCHMARK =====
  const terms = ['kote', 'men', '剣道'];
  console.log('\n=== EXPLAIN (ANALYZE, BUFFERS) x3 each ===\n');

  for (const term of terms) {
    console.log(`--- ${term} ---`);
    for (let i = 0; i < 3; i++) {
      r = await runQuery(token,
        `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM search_segments('${term}', 20);`);
      if (Array.isArray(r.body)) {
        for (const row of r.body) {
          const plan = (row as Record<string, unknown>)['QUERY PLAN'];
          if (plan && (String(plan).includes('Execution Time') || String(plan).includes('actual time'))) {
            console.log(`  run${i+1}: ${plan}`);
          }
        }
      }
    }
    console.log();
  }

  // Verify data shape matches old RPC
  console.log('=== Data shape verification (kote, 3 rows) ===');
  r = await runQuery(token, "SELECT * FROM search_segments('kote', 3);");
  if (Array.isArray(r.body)) {
    const rows = r.body as Record<string, unknown>[];
    console.log(`  rows: ${rows.length}`);
    if (rows.length > 0) {
      const keys = Object.keys(rows[0]).join(', ');
      console.log(`  keys: ${keys}`);
      for (let i = 0; i < rows.length; i++) {
        console.log(`  [${i}] id=${rows[i]['id']} art=${String(rows[i]['article_title']).slice(0,25)} pos=${rows[i]['position']} status=${rows[i]['status']} rank=${rows[i]['rank']}`);
      }
    }
  }

  // ROLLBACK
  console.log('\n=== ROLLBACK — restore original function ===');
  r = await runQuery(token, 'ROLLBACK;');
  console.log('ROLLBACK:', r.status);

  // Verify original function is back
  r = await runQuery(token,
    `SELECT prosrc FROM pg_proc
     WHERE proname = 'search_segments'
       AND pronamespace = 'public'::regnamespace;`);
  if (Array.isArray(r.body)) {
    const src = String((r.body[0] as Record<string, unknown>)['prosrc'] ?? '');
    const hasOrderBy = src.includes('ORDER BY');
    console.log(`Original function restored: ORDER BY present = ${hasOrderBy}`);
  }

  console.log('\n=== Done — nothing left on DB ===');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
