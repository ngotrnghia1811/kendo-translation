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

  console.log('--- tables in public schema ---');
  console.log(JSON.stringify(
    (await q(t, "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;")).body,
    null, 2));

  console.log('\n--- functions in public schema ---');
  console.log(JSON.stringify(
    (await q(t, "SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' ORDER BY proname;")).body,
    null, 2));

  console.log('\n--- segments columns ---');
  console.log(JSON.stringify(
    (await q(t, "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='segments' ORDER BY ordinal_position;")).body,
    null, 2));

  console.log('\n--- supabase_realtime publication tables ---');
  console.log(JSON.stringify(
    (await q(t, "SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' ORDER BY tablename;")).body,
    null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
