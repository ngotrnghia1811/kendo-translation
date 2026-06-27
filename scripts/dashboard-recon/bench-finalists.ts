/**
 * bench-finalists.ts — Clean benchmark of top candidate fixes.
 * Measures actual wall-clock time (fetch latency) and EXPLAIN ANALYZE.
 *
 * Usage:  npx tsx scripts/dashboard-recon/bench-finalists.ts
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

async function runQuery(token: string, sql: string): Promise<{ status: number; body: unknown; latencyMs: number }> {
  const t0 = performance.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  const t1 = performance.now();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, latencyMs: t1 - t0 };
}

function extractExecTime(rows: unknown[]): string {
  // Find the top-level Execution Time from EXPLAIN ANALYZE output
  let lastExecTime = '';
  for (const row of rows) {
    const plan = typeof row === 'object' && row !== null
      ? String((row as Record<string, unknown>)['QUERY PLAN'] ?? '')
      : String(row);
    const m = plan.match(/^Execution Time:\s*([\d.]+)\s*ms/);
    if (m) lastExecTime = m[1] + 'ms';
  }
  return lastExecTime || '?';
}

async function main() {
  const env = await loadEnv();
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (!token || !token.startsWith('sbp_')) {
    console.error('FATAL: SUPABASE_ACCESS_TOKEN missing');
    process.exit(1);
  }

  const candidates: Record<string, string> = {
    'BASELINE (current RPC)': 
      "SELECT * FROM search_segments('TERM', 20)",
    'FIX-A: No ORDER BY (seq scan early-stop)':
      "SELECT s.id, s.article_id, a.title AS article_title, s.position, left(s.source_text,200) AS source_snippet, left(s.target_text,200) AS target_snippet, s.status, 0.0::real AS rank FROM segments s JOIN articles a ON a.id = s.article_id WHERE s.source_text ILIKE '%TERM%' OR (s.target_text IS NOT NULL AND s.target_text ILIKE '%TERM%') LIMIT 20",
    'FIX-B: UNION (dedup, each branch LIMIT 20)':
      "(SELECT s.id, s.article_id, a.title AS article_title, s.position, left(s.source_text,200) AS source_snippet, left(s.target_text,200) AS target_snippet, s.status, 0.0::real AS rank FROM segments s JOIN articles a ON a.id = s.article_id WHERE s.source_text ILIKE '%TERM%' ORDER BY s.article_id, s.position LIMIT 20) UNION (SELECT s.id, s.article_id, a.title AS article_title, s.position, left(s.source_text,200) AS source_snippet, left(s.target_text,200) AS target_snippet, s.status, 0.0::real AS rank FROM segments s JOIN articles a ON a.id = s.article_id WHERE s.target_text IS NOT NULL AND s.target_text ILIKE '%TERM%' ORDER BY s.article_id, s.position LIMIT 20) ORDER BY article_title, position LIMIT 20",
  };

  const terms = ['kote', 'men', '剣道'];

  for (const [label, tmpl] of Object.entries(candidates)) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`=== ${label} ===`);
    console.log('='.repeat(70));

    for (const term of terms) {
      const sql = tmpl.replace(/TERM/g, term);
      
      // Wall-clock: run plain SELECT 3 times, report median
      const latencies: number[] = [];
      for (let i = 0; i < 3; i++) {
        const { latencyMs } = await runQuery(token, sql);
        latencies.push(latencyMs);
      }
      latencies.sort((a, b) => a - b);
      const medianLat = latencies[1];

      // EXPLAIN ANALYZE
      const { body: explainBody } = await runQuery(token, 
        `EXPLAIN (ANALYZE, BUFFERS) ${sql}`);
      const rows = Array.isArray(explainBody) ? explainBody : [];
      const execTime = extractExecTime(rows);

      console.log(`  ${term.padEnd(6)} | wall(median3): ${medianLat.toFixed(1)}ms | EXPLAIN exec: ${execTime}`);
    }

    // Verify data shape for kote
    console.log(`  --- data shape (kote, first 2 rows) ---`);
    const { body } = await runQuery(token, tmpl.replace(/TERM/g, 'kote'));
    if (Array.isArray(body) && body.length > 0) {
      const r0 = body[0] as Record<string, unknown>;
      const keys = Object.keys(r0).join(', ');
      console.log(`  keys: ${keys}`);
      for (let i = 0; i < Math.min(2, body.length); i++) {
        const r = body[i] as Record<string, unknown>;
        console.log(`  [${i}] id=${r['id']} article_title=${String(r['article_title']).slice(0,30)} pos=${r['position']} status=${r['status']}`);
      }
      console.log(`  total rows: ${body.length}`);
    }
  }

  console.log('\n=== Done ===');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
