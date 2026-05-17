import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function loadEnv(): Promise<Record<string, string>> {
  const raw = await readFile('.env.local', 'utf8');
  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

async function q(token: string, sql: string) {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return { status: r.status, body: await r.json() };
}

async function main() {
  const env = await loadEnv();
  const t = env.SUPABASE_ACCESS_TOKEN;
  const tables = ['profiles', 'users', 'segment_comments', 'segment_revisions', 'articles', 'document_settings', 'agent_logs', 'agent_prompts', 'terminology'];
  for (const tbl of tables) {
    console.log(`\n--- ${tbl} columns ---`);
    const r = await q(t, `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='${tbl}' ORDER BY ordinal_position;`);
    console.log(JSON.stringify(r.body, null, 2));
  }
  console.log('\n--- RLS policies (counts per table) ---');
  console.log(JSON.stringify((await q(t, "SELECT tablename, COUNT(*) AS n FROM pg_policies WHERE schemaname='public' GROUP BY tablename ORDER BY tablename;")).body, null, 2));
  console.log('\n--- All RLS policies (names) ---');
  console.log(JSON.stringify((await q(t, "SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;")).body, null, 2));
  console.log('\n--- segments row sample (5) ---');
  console.log(JSON.stringify((await q(t, "SELECT id, article_id, status, locked_by, translated_by, reviewed_by, quality_score FROM segments LIMIT 5;")).body, null, 2));
  console.log('\n--- profiles row sample (full) ---');
  console.log(JSON.stringify((await q(t, "SELECT * FROM profiles;")).body, null, 2));
  console.log('\n--- users row count ---');
  console.log(JSON.stringify((await q(t, "SELECT COUNT(*) FROM users;")).body, null, 2));
  console.log('\n--- segment_comments row count ---');
  console.log(JSON.stringify((await q(t, "SELECT COUNT(*) FROM segment_comments;")).body, null, 2));
  console.log('\n--- articles row count ---');
  console.log(JSON.stringify((await q(t, "SELECT COUNT(*) FROM articles;")).body, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
