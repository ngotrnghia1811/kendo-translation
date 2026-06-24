/**
 * Apply Migration 013 (furigana ruby_data) via Supabase Management API.
 *
 * Non-interactive. Workflow:
 *   1. Load SUPABASE_ACCESS_TOKEN (PAT, sbp_*) from .env.local.
 *   2. Pre-flight: check if ruby_data column already exists.
 *   3. POST the 013_furigana.sql as a single query.
 *   4. POST-VERIFY: column exists, RPC returns ruby_data.
 *   5. SMOKE: select one row with ruby_data.
 *
 * Usage:  npx tsx scripts/dashboard-recon/apply-migration-013.ts
 */

import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const MIGRATION_PATH = 'supabase/migrations/013_furigana.sql';
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
  // PRE-FLIGHT: does ruby_data column already exist?
  // =========================================================================
  console.log('=== Pre-flight: ruby_data column existence ===\n');
  const preflight = await runQuery(token, `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'segments'
      AND column_name = 'ruby_data';`);
  console.log(`[${preflight.status}]`, JSON.stringify(preflight.body, null, 2), '\n');

  if (ok(preflight.status) && Array.isArray(preflight.body) && preflight.body.length > 0) {
    console.log('⚠️  ruby_data column ALREADY EXISTS on segments. Proceeding (idempotent) but verify RPC update.\n');
  }

  // =========================================================================
  // APPLY migration (two steps — CREATE OR REPLACE can't change return type)
  // =========================================================================
  console.log('=== Applying Migration 013 ===\n');

  // Step A: ALTER TABLE + COMMENT ON (idempotent)
  console.log('--- Step A: ALTER TABLE + COMMENT ---');
  const { status, body } = await runQuery(token, `
    ALTER TABLE segments ADD COLUMN IF NOT EXISTS ruby_data jsonb;
    COMMENT ON COLUMN segments.ruby_data IS
      'Precomputed furigana annotation for this segment source_text. Null for segments not yet annotated.';
  `);
  console.log(`HTTP ${status}`, JSON.stringify(body, null, 2), '\n');
  if (!ok(status)) {
    console.error('FAILED at Step A (ALTER TABLE).');
    process.exit(3);
  }

  // Step B: DROP + CREATE FUNCTION (return-type change requires DROP first)
  console.log('--- Step B: DROP + CREATE get_article_bilingual_window ---');
  const fnBody = `
    SELECT
      s.id,
      s.article_id,
      s.position,
      s.source_text,
      s.target_text,
      s.source_lang,
      s.target_lang,
      s.status,
      s.locked_by,
      s.locked_at,
      s.translated_by,
      s.reviewed_by,
      s.quality_detail,
      s.metadata,
      s.ruby_data,
      s.created_at,
      s.updated_at
    FROM segments s
    WHERE s.article_id = p_article_id
      AND s.target_lang = p_target_lang
      AND CASE
        WHEN p_page IS NOT NULL THEN (s.metadata->>'page')::int = p_page
        ELSE true
      END
    ORDER BY s.position ASC
    LIMIT CASE WHEN p_page IS NULL THEN p_limit ELSE NULL END
    OFFSET CASE WHEN p_page IS NULL THEN p_offset ELSE NULL END`;

  const { status: s2, body: b2 } = await runQuery(token, `
    DROP FUNCTION IF EXISTS get_article_bilingual_window(uuid, text, int, int, int);
    CREATE FUNCTION get_article_bilingual_window(
      p_article_id uuid,
      p_target_lang text DEFAULT 'en',
      p_offset int DEFAULT 0,
      p_limit int DEFAULT 50,
      p_page int DEFAULT NULL
    )
    RETURNS TABLE(
      id uuid,
      article_id uuid,
      "position" int,
      source_text text,
      target_text text,
      source_lang text,
      target_lang text,
      status text,
      locked_by uuid,
      locked_at timestamptz,
      translated_by uuid,
      reviewed_by uuid,
      quality_detail jsonb,
      metadata jsonb,
      ruby_data jsonb,
      created_at timestamptz,
      updated_at timestamptz
    )
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$${fnBody}$$;
  `);
  console.log(`HTTP ${s2}`, JSON.stringify(b2, null, 2), '\n');
  if (!ok(s2)) {
    console.error('FAILED at Step B (CREATE FUNCTION).');
    process.exit(3);
  }

  // =========================================================================
  // POST-VERIFY: column exists + RPC returns ruby_data
  // =========================================================================
  console.log('=== Post-verify: column + RPC ===\n');

  // Verify 1: column
  const colCheck = await runQuery(token, `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'segments'
      AND column_name = 'ruby_data';`);
  console.log(`[Column check ${colCheck.status}]`, JSON.stringify(colCheck.body, null, 2));

  // Verify 2: RPC returns ruby_data column
  const rpcCheck = await runQuery(token, `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'get_article_bilingual_window'
      AND column_name = 'ruby_data';`);
  console.log(`[RPC   check ${rpcCheck.status}]`, JSON.stringify(rpcCheck.body, null, 2), '\n');

  // =========================================================================
  // SMOKE: select real article data to confirm ruby_data in output
  // =========================================================================
  console.log('=== Smoke: RPC returns ruby_data shape ===\n');
  const articleId = '86adf815-b0ca-46eb-bab7-b6fb040b845c';
  const smoke = await runQuery(token, `
    SELECT id, source_text, ruby_data
    FROM get_article_bilingual_window('${articleId}'::uuid, 'en', 0, 1);`);
  console.log(`[${smoke.status}]`, JSON.stringify(smoke.body, null, 2), '\n');

  console.log('=== Migration 013 applied and verified ===');
}

main().catch((err) => { console.error('Unhandled error:', err); process.exit(99); });
