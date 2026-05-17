/**
 * Apply Migration 004 via Supabase Management API.
 *
 * Workflow:
 *   1. Load SUPABASE_ACCESS_TOKEN (PAT) from .env.local.
 *   2. Run 4 pre-flight SELECTs and print results.
 *   3. Pause for stdin confirmation ("yes" to proceed).
 *   4. POST the entire contents of 004_phase_workflow.sql (atomic BEGIN/COMMIT)
 *      as a single query.
 *   5. Report status code + body. Exit non-zero on failure.
 *
 * Usage:  npx tsx scripts/dashboard-recon/apply-migration.ts
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const MIGRATION_PATH = 'supabase/migrations/004_phase_workflow.sql';
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
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  let body: unknown;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function main() {
  const env = await loadEnv();
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (!token || !token.startsWith('sbp_')) {
    console.error('FATAL: SUPABASE_ACCESS_TOKEN missing or not a PAT (sbp_*) in .env.local');
    process.exit(1);
  }

  console.log('=== Pre-flight probes ===\n');

  // Probe table/column existence first; only count if present (Postgres parses
  // CASE branches before evaluating the guard, so a single CASE expression
  // referencing a missing relation will still fail at parse time).
  const exist = await runQuery(
    token,
    `SELECT
       to_regclass('public.segment_quality') IS NOT NULL AS has_segment_quality,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='segments' AND column_name='quality_score'
       ) AS has_quality_score_column;`,
  );
  console.log(`[${exist.status}] existence probe:`);
  console.log(JSON.stringify(exist.body, null, 2));
  console.log('');
  if (exist.status !== 200 && exist.status !== 201) {
    console.error('Existence probe failed. Aborting.');
    process.exit(2);
  }
  const flags = (exist.body as Array<{ has_segment_quality: boolean; has_quality_score_column: boolean }>)[0];

  const probes: Array<{ label: string; sql: string }> = [
    { label: 'profiles by role', sql: 'SELECT role, COUNT(*) AS n FROM profiles GROUP BY role ORDER BY role;' },
    { label: 'segments by status', sql: 'SELECT status, COUNT(*) AS n FROM segments GROUP BY status ORDER BY status;' },
  ];
  if (flags.has_segment_quality) {
    probes.push({ label: 'segment_quality row count', sql: 'SELECT COUNT(*) AS n FROM public.segment_quality;' });
  } else {
    console.log('[skipped] segment_quality table does not exist (already dropped).\n');
  }
  if (flags.has_quality_score_column) {
    probes.push({ label: 'segments.quality_score non-null count', sql: 'SELECT COUNT(*) AS n FROM public.segments WHERE quality_score IS NOT NULL;' });
  } else {
    console.log('[skipped] segments.quality_score column does not exist (already dropped).\n');
  }

  for (const p of probes) {
    const { status, body } = await runQuery(token, p.sql);
    console.log(`[${status}] ${p.label}:`);
    console.log(JSON.stringify(body, null, 2));
    console.log('');
    if (status !== 200 && status !== 201) {
      console.error(`Probe "${p.label}" failed. Aborting.`);
      process.exit(2);
    }
  }

  console.log('=== Pre-flight complete ===\n');

  const rl = createInterface({ input, output });
  const answer = (await rl.question('Apply Migration 004 now? Type "yes" to proceed: ')).trim().toLowerCase();
  rl.close();

  if (answer !== 'yes') {
    console.log('Aborted by operator. No changes made.');
    process.exit(0);
  }

  console.log('\n=== Applying Migration 004 ===\n');
  const sql = await readFile(join(MIGRATION_PATH), 'utf8');
  console.log(`Loaded ${sql.length} bytes from ${MIGRATION_PATH}.`);
  console.log('POSTing to Management API...\n');

  const { status, body } = await runQuery(token, sql);
  console.log(`HTTP ${status}`);
  console.log(JSON.stringify(body, null, 2));

  if (status !== 200 && status !== 201) {
    console.error('\nFAILED. Migration is wrapped in BEGIN/COMMIT so partial state is unlikely, but verify manually.');
    process.exit(3);
  }

  console.log('\n=== Migration 004 applied successfully ===');
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(99);
});
