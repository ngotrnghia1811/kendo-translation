import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function loadToken() {
  const raw = await readFile('.env.local', 'utf8');
  return raw.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m)![1].replace(/^["']|["']$/g, '');
}
async function q(t: string, sql: string) {
  const r = await fetch(ENDPOINT, { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: sql }) });
  return { status: r.status, body: await r.json() };
}

async function main() {
  const t = await loadToken();
  console.log('-- segment counts by (status, target_text presence) --');
  console.log(JSON.stringify((await q(t, `
    SELECT status,
           SUM(CASE WHEN target_text IS NULL OR target_text = '' THEN 1 ELSE 0 END) AS empty_target,
           SUM(CASE WHEN target_text IS NOT NULL AND target_text <> '' THEN 1 ELSE 0 END) AS with_target,
           COUNT(*) AS total
    FROM public.segments
    GROUP BY status
    ORDER BY status;
  `)).body, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
