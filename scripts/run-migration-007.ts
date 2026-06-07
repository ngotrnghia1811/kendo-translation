/**
 * One-shot runner for supabase/migrations/007_zh_terminology.sql.
 *
 * Executes the raw SQL via the Supabase Management API (requires
 * SUPABASE_ACCESS_TOKEN in .env.local).
 *
 * Usage:
 *   npx tsx scripts/run-migration-007.ts
 */

import { readFile } from 'node:fs/promises';

const ENV_PATH = '.env.local';
const MIGRATION_PATH = 'supabase/migrations/007_zh_terminology.sql';
const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';

async function loadEnv(): Promise<Record<string, string>> {
  const raw = await readFile(ENV_PATH, 'utf8');
  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

async function main() {
  const env = await loadEnv();
  const accessToken = env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('FATAL: SUPABASE_ACCESS_TOKEN missing from .env.local');
    process.exit(1);
  }

  const sql = await readFile(MIGRATION_PATH, 'utf8');
  console.log(`[info] Read migration file: ${sql.length} bytes`);

  // Split into individual statements — skip empty/comment-only blocks.
  const statements = sql
    .split(';')
    .map(s => {
      // Keep only non-comment lines within the statement
      const clean = s.split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
      return clean;
    })
    .filter(s => s.length > 0);

  console.log(`[info] ${statements.length} SQL statement(s) to execute.\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.length > 100 ? stmt.slice(0, 100) + '...' : stmt;
    console.log(`[${i + 1}/${statements.length}] ${preview}`);

    const res = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query: stmt }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[error] Migration statement ${i + 1} failed (HTTP ${res.status}):`);
      console.error(`        ${body.slice(0, 500)}`);
      process.exit(1);
    }

    console.log(`[ok] Statement ${i + 1} executed successfully.\n`);
  }

  console.log(`\n[ok] Migration 007 applied successfully.`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(99);
});
