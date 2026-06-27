/**
 * bench-candidates.ts — Benchmark candidate fixes for search_segments 'kote' performance.
 *
 * Each candidate is tested inside a transaction that gets ROLLBACKed.
 * Nothing is left applied to the live DB.
 *
 * Usage:  npx tsx scripts/dashboard-recon/bench-candidates.ts
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

function extractTime(rows: unknown[]): string {
  for (const row of rows) {
    const plan = typeof row === 'object' && row !== null
      ? String((row as Record<string, unknown>)['QUERY PLAN'] ?? '')
      : String(row);
    const m = plan.match(/Execution Time:\s*([\d.]+)\s*ms/);
    if (m) return m[1] + 'ms';
    const m2 = plan.match(/actual time=.*?\.\.(\d+\.\d+)/);
    if (m2) return m2[1] + 'ms';
  }
  return '?';
}

async function main() {
  const env = await loadEnv();
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (!token || !token.startsWith('sbp_')) {
    console.error('FATAL: SUPABASE_ACCESS_TOKEN missing or not a PAT (sbp_*) in .env.local');
    process.exit(1);
  }

  const pLimit = 20;

  // =========================================================================
  // BASELINE: current RPC
  // =========================================================================
  console.log('=== BASELINE (current search_segments RPC) ===\n');
  for (const term of ['kote', 'men', '剣道']) {
    const { body } = await runQuery(token,
      `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM search_segments('${term}', ${pLimit});`);
    const rows = Array.isArray(body) ? body : [];
    const time = extractTime(rows);
    console.log(`  ${term}: ${time}`);
  }
  console.log();

  // =========================================================================
  // CANDIDATE A: Rewrite — CTE to collect IDs first, then order+limit
  // This avoids the expensive ORDER BY early-stop through the btree.
  // =========================================================================
  console.log('=== CANDIDATE A: CTE collect IDs → join → order → limit ===\n');
  for (const term of ['kote', 'men', '剣道']) {
    const { body } = await runQuery(token, `
      EXPLAIN (ANALYZE, BUFFERS)
      WITH matching AS (
        SELECT s.id, s.article_id
        FROM segments s
        WHERE s.source_text ILIKE '%${term}%'
           OR (s.target_text IS NOT NULL AND s.target_text ILIKE '%${term}%')
      )
      SELECT s.id, s.article_id, a.title AS article_title, s.position,
             left(s.source_text, 200), left(s.target_text, 200), s.status, 0.0::real
      FROM segments s
      JOIN articles a ON a.id = s.article_id
      WHERE s.id IN (SELECT id FROM matching)
      ORDER BY s.article_id, s.position
      LIMIT ${pLimit};
    `);
    const rows = Array.isArray(body) ? body : [];
    const time = extractTime(rows);
    console.log(`  ${term}: ${time}`);
  }
  console.log();

  // =========================================================================
  // CANDIDATE B: UNION ALL — split source/target into separate branches
  // Each branch can use its own GIN trigram index independently.
  // Then deduplicate + final ORDER BY + LIMIT.
  // =========================================================================
  console.log('=== CANDIDATE B: UNION ALL (source branch + target branch) ===\n');
  for (const term of ['kote', 'men', '剣道']) {
    const { body } = await runQuery(token, `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT * FROM (
        (SELECT s.id, s.article_id, a.title AS article_title, s.position,
               left(s.source_text, 200) AS source_snippet,
               left(s.target_text, 200) AS target_snippet,
               s.status, 0.0::real AS rank
         FROM segments s JOIN articles a ON a.id = s.article_id
         WHERE s.source_text ILIKE '%${term}%'
         ORDER BY s.article_id, s.position
         LIMIT ${pLimit})
        UNION ALL
        (SELECT s.id, s.article_id, a.title AS article_title, s.position,
               left(s.source_text, 200) AS source_snippet,
               left(s.target_text, 200) AS target_snippet,
               s.status, 0.0::real AS rank
         FROM segments s JOIN articles a ON a.id = s.article_id
         WHERE s.target_text IS NOT NULL AND s.target_text ILIKE '%${term}%'
         ORDER BY s.article_id, s.position
         LIMIT ${pLimit})
      ) sub
      ORDER BY article_id, position
      LIMIT ${pLimit};
    `);
    const rows = Array.isArray(body) ? body : [];
    const time = extractTime(rows);
    console.log(`  ${term}: ${time}`);
  }
  console.log();

  // =========================================================================
  // CANDIDATE C: UNION (not ALL) — de-duplicate between source and target
  // Same as B but uses UNION (de-dupes rows that match both source and target).
  // =========================================================================
  console.log('=== CANDIDATE C: UNION (deduped) ===\n');
  for (const term of ['kote', 'men', '剣道']) {
    const { body } = await runQuery(token, `
      EXPLAIN (ANALYZE, BUFFERS)
      (SELECT s.id, s.article_id, a.title AS article_title, s.position,
             left(s.source_text, 200) AS source_snippet,
             left(s.target_text, 200) AS target_snippet,
             s.status, 0.0::real AS rank
       FROM segments s JOIN articles a ON a.id = s.article_id
       WHERE s.source_text ILIKE '%${term}%'
       ORDER BY s.article_id, s.position
       LIMIT ${pLimit})
      UNION
      (SELECT s.id, s.article_id, a.title AS article_title, s.position,
             left(s.source_text, 200) AS source_snippet,
             left(s.target_text, 200) AS target_snippet,
             s.status, 0.0::real AS rank
       FROM segments s JOIN articles a ON a.id = s.article_id
       WHERE s.target_text IS NOT NULL AND s.target_text ILIKE '%${term}%'
       ORDER BY s.article_id, s.position
       LIMIT ${pLimit})
      ORDER BY article_id, position
      LIMIT ${pLimit};
    `);
    const rows = Array.isArray(body) ? body : [];
    const time = extractTime(rows);
    console.log(`  ${term}: ${time}`);
  }
  console.log();

  // =========================================================================
  // CANDIDATE D: UNION ALL — source-first (no LIMIT in source branch, then dedup)
  // Capture all source matches first, only go to target if needed.
  // =========================================================================
  console.log('=== CANDIDATE D: Hybrid — source-first, fall back to target ===\n');
  for (const term of ['kote', 'men', '剣道']) {
    const { body } = await runQuery(token, `
      EXPLAIN (ANALYZE, BUFFERS)
      WITH srckeys AS (
        SELECT s.id, s.article_id
        FROM segments s
        WHERE s.source_text ILIKE '%${term}%'
        ORDER BY s.article_id, s.position
        LIMIT ${pLimit}
      ),
      tgtkeys AS (
        SELECT s.id, s.article_id
        FROM segments s
        WHERE s.target_text IS NOT NULL AND s.target_text ILIKE '%${term}%'
        ORDER BY s.article_id, s.position
        LIMIT ${pLimit}
      ),
      allkeys AS (
        SELECT id, article_id FROM srckeys
        UNION
        SELECT id, article_id FROM tgtkeys
        LIMIT ${pLimit}
      )
      SELECT s.id, s.article_id, a.title AS article_title, s.position,
             left(s.source_text, 200), left(s.target_text, 200), s.status, 0.0::real
      FROM segments s
      JOIN articles a ON a.id = s.article_id
      WHERE s.id IN (SELECT id FROM allkeys)
      ORDER BY s.article_id, s.position
      LIMIT ${pLimit};
    `);
    const rows = Array.isArray(body) ? body : [];
    const time = extractTime(rows);
    console.log(`  ${term}: ${time}`);
  }
  console.log();

  // =========================================================================
  // CANDIDATE E: LIMIT inside segments scan before JOIN
  // Force the planner to limit the segments scan early.
  // =========================================================================
  console.log('=== CANDIDATE E: Subquery with LIMIT before JOIN ===\n');
  for (const term of ['kote', 'men', '剣道']) {
    const { body } = await runQuery(token, `
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT s.id, s.article_id, a.title AS article_title, s.position,
             left(s.source_text, 200), left(s.target_text, 200), s.status, 0.0::real
      FROM (
        SELECT id, article_id, position, source_text, target_text, status
        FROM segments
        WHERE source_text ILIKE '%${term}%'
           OR (target_text IS NOT NULL AND target_text ILIKE '%${term}%')
        ORDER BY article_id, position
        LIMIT ${pLimit * 10}
      ) s
      JOIN articles a ON a.id = s.article_id
      ORDER BY s.article_id, s.position
      LIMIT ${pLimit};
    `);
    const rows = Array.isArray(body) ? body : [];
    const time = extractTime(rows);
    console.log(`  ${term}: ${time}`);
  }
  console.log();

  console.log('=== bench-candidates complete ===');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
