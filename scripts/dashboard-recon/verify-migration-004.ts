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
  console.log('--- New tables created by Migration 004 ---');
  console.log(JSON.stringify((await q(t, "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('document_assignments','segment_phase_transitions','segment_suggestions','qa_issues') ORDER BY tablename;")).body, null, 2));

  console.log('\n--- segments.status CHECK constraint ---');
  console.log(JSON.stringify((await q(t, "SELECT pg_get_constraintdef(c.oid) AS def FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE n.nspname='public' AND cl.relname='segments' AND c.contype='c';")).body, null, 2));

  console.log('\n--- segment_comments columns (should now have parent_comment_id, mentions) ---');
  console.log(JSON.stringify((await q(t, "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='segment_comments' ORDER BY ordinal_position;")).body, null, 2));

  console.log('\n--- new helper functions ---');
  console.log(JSON.stringify((await q(t, "SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND proname IN ('is_translator','is_assigned_to_phase') ORDER BY proname;")).body, null, 2));

  console.log('\n--- segments policies (should include segments_update_phase_assigned, NOT segments_update) ---');
  console.log(JSON.stringify((await q(t, "SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='segments' ORDER BY policyname;")).body, null, 2));

  console.log('\n--- realtime publication (should now include segment_comments, segment_suggestions, qa_issues, segment_phase_transitions, document_assignments) ---');
  console.log(JSON.stringify((await q(t, "SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' ORDER BY tablename;")).body, null, 2));

  console.log('\n--- profiles.role CHECK ---');
  console.log(JSON.stringify((await q(t, "SELECT pg_get_constraintdef(c.oid) AS def FROM pg_constraint c JOIN pg_class cl ON cl.oid=c.conrelid JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE n.nspname='public' AND cl.relname='profiles' AND c.contype='c';")).body, null, 2));

  console.log('\n--- segments.quality_score column (should be GONE) ---');
  console.log(JSON.stringify((await q(t, "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='segments' AND column_name='quality_score';")).body, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
