/**
 * bench-covering-index.ts — Test covering index approach inside a ROLLBACKed txn.
 *
 * Creates idx_seg_article_pos_cover (article_id, position) INCLUDE (...),
 * benchmarks, then ROLLBACKs. Nothing left on DB.
 *
 * Usage:  npx tsx scripts/dashboard-recon/bench-covering-index.ts
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

  // 1. Current index sizes
  console.log('=== Current index sizes ===');
  let r = await runQuery(token,
    `SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
     FROM pg_indexes WHERE tablename = 'segments'
     ORDER BY pg_relation_size(indexname::regclass) DESC;`);
  if (Array.isArray(r.body)) {
    for (const row of r.body) {
      const rr = row as Record<string, unknown>;
      console.log(`  ${rr['indexname']}: ${rr['size']}`);
    }
  }

  // 2. Table size
  console.log('\n=== Table sizes ===');
  r = await runQuery(token,
    `SELECT pg_size_pretty(pg_total_relation_size('segments')) AS total,
            pg_size_pretty(pg_relation_size('segments')) AS table_only;`);
  console.log(JSON.stringify(r.body, null, 2));

  // 3. BEGIN, CREATE covering index, benchmark, ROLLBACK
  console.log('\n=== Creating covering index in txn (will ROLLBACK) ===');
  r = await runQuery(token, 'BEGIN;');
  console.log('BEGIN:', r.status);

  const t0 = Date.now();
  r = await runQuery(token,
    'CREATE INDEX idx_seg_article_pos_cover ON segments (article_id, position) INCLUDE (id, source_text, target_text, status);');
  console.log('CREATE INDEX:', r.status, 'took', Date.now() - t0, 'ms');

  // Benchmark kote
  console.log('\n--- Benchmark kote with covering index ---');
  r = await runQuery(token,
    "EXPLAIN (ANALYZE, BUFFERS) SELECT s.id, s.article_id, a.title AS article_title, s.position, left(s.source_text,200) AS source_snippet, left(s.target_text,200) AS target_snippet, s.status, 0.0::real AS rank FROM segments s JOIN articles a ON a.id = s.article_id WHERE s.source_text ILIKE '%kote%' OR (s.target_text IS NOT NULL AND s.target_text ILIKE '%kote%') ORDER BY s.article_id, s.position LIMIT 20;");
  if (Array.isArray(r.body)) {
    for (const row of r.body) {
      const plan = (row as Record<string, unknown>)['QUERY PLAN'];
      if (plan) console.log(`  ${plan}`);
    }
  }

  // Benchmark men
  console.log('\n--- Benchmark men with covering index ---');
  r = await runQuery(token,
    "EXPLAIN (ANALYZE, BUFFERS) SELECT s.id, s.article_id, a.title AS article_title, s.position, left(s.source_text,200) AS source_snippet, left(s.target_text,200) AS target_snippet, s.status, 0.0::real AS rank FROM segments s JOIN articles a ON a.id = s.article_id WHERE s.source_text ILIKE '%men%' OR (s.target_text IS NOT NULL AND s.target_text ILIKE '%men%') ORDER BY s.article_id, s.position LIMIT 20;");
  if (Array.isArray(r.body)) {
    for (const row of r.body) {
      const plan = (row as Record<string, unknown>)['QUERY PLAN'];
      if (plan) console.log(`  ${plan}`);
    }
  }

  // Benchmark kendo
  console.log('\n--- Benchmark 剣道 with covering index ---');
  r = await runQuery(token,
    "EXPLAIN (ANALYZE, BUFFERS) SELECT s.id, s.article_id, a.title AS article_title, s.position, left(s.source_text,200) AS source_snippet, left(s.target_text,200) AS target_snippet, s.status, 0.0::real AS rank FROM segments s JOIN articles a ON a.id = s.article_id WHERE s.source_text ILIKE '%剣道%' OR (s.target_text IS NOT NULL AND s.target_text ILIKE '%剣道%') ORDER BY s.article_id, s.position LIMIT 20;");
  if (Array.isArray(r.body)) {
    for (const row of r.body) {
      const plan = (row as Record<string, unknown>)['QUERY PLAN'];
      if (plan) console.log(`  ${plan}`);
    }
  }

  // Check index size
  console.log('\n--- Covering index size ---');
  r = await runQuery(token,
    "SELECT pg_size_pretty(pg_relation_size('idx_seg_article_pos_cover')) AS size;");
  console.log(JSON.stringify(r.body, null, 2));

  // ROLLBACK
  r = await runQuery(token, 'ROLLBACK;');
  console.log('ROLLBACK:', r.status);
  console.log('\n=== Covering index rolled back — nothing left on DB ===');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
