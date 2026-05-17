/**
 * probe-service-role-sql.ts
 *
 * Probes whether the SUPABASE_SERVICE_ROLE_KEY (a PostgREST JWT) can be used
 * to execute arbitrary SQL DDL against the live project, without resetting
 * the DB password.
 *
 * Probes (in order, harmless — no schema change):
 *   1. Supabase Management API: POST https://api.supabase.com/v1/projects/{ref}/database/query
 *      Body: { query: "SELECT 1 AS probe" }
 *      Auth: Bearer <service_role_key>
 *      Expectation: 401 (Management API requires PAT, not service-role JWT)
 *
 *   2. Project pg-meta endpoint: POST https://{ref}.supabase.co/pg/query
 *      Body: { query: "SELECT 1 AS probe" }
 *      Auth: apikey + Authorization Bearer <service_role_key>
 *      Expectation: 404 or 401 (undocumented, usually not exposed)
 *
 *   3. PostgREST RPC fallback: call a non-existent rpc to confirm the
 *      service-role key is accepted at the REST layer.
 *      POST https://{ref}.supabase.co/rest/v1/rpc/exec_sql
 *      Body: { sql: "SELECT 1" }
 *      Expectation: 404 (function doesn't exist) — proves auth works, DDL doesn't.
 *
 * Output: scripts/dashboard-recon/probe-result.json
 * Run:    npx tsx scripts/dashboard-recon/probe-service-role-sql.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ENV_PATH = path.join(HERE, '..', '..', '.env.local');
const OUT_PATH = path.join(HERE, 'probe-result.json');

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';

function readEnv(): Record<string, string> {
  const raw = fs.readFileSync(ENV_PATH, 'utf8');
  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function probe(label: string, url: string, init: RequestInit) {
  console.log(`\n[${label}]  ${init.method || 'GET'} ${url}`);
  try {
    const resp = await fetch(url, init);
    const text = await resp.text();
    const snippet = text.length > 400 ? text.slice(0, 400) + '…' : text;
    console.log(`  status: ${resp.status}`);
    console.log(`  body:   ${snippet}`);
    return { label, url, status: resp.status, body: text.slice(0, 2000) };
  } catch (e) {
    console.log(`  ERROR:  ${(e as Error).message}`);
    return { label, url, error: (e as Error).message };
  }
}

(async () => {
  const env = readEnv();
  const SR = env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!SR) {
    console.error('SUPABASE_SERVICE_ROLE_KEY missing from .env.local');
    process.exit(1);
  }
  console.log(`Service role JWT present (len=${SR.length}).`);

  const results: unknown[] = [];

  // 1. Supabase Management API (expected: 401)
  results.push(
    await probe(
      'mgmt-api',
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SR}`,
        },
        body: JSON.stringify({ query: 'SELECT 1 AS probe' }),
      },
    ),
  );

  // 2. Project pg-meta endpoint (undocumented)
  results.push(
    await probe(
      'pg-meta',
      `https://${PROJECT_REF}.supabase.co/pg/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SR,
          Authorization: `Bearer ${SR}`,
        },
        body: JSON.stringify({ query: 'SELECT 1 AS probe' }),
      },
    ),
  );

  // 3. PostgREST exec_sql RPC (likely 404 — function doesn't exist)
  results.push(
    await probe(
      'rest-rpc-exec_sql',
      `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SR,
          Authorization: `Bearer ${SR}`,
        },
        body: JSON.stringify({ sql: 'SELECT 1' }),
      },
    ),
  );

  // 4. Sanity: PostgREST GET on profiles (proves auth works at REST layer)
  results.push(
    await probe(
      'rest-get-profiles',
      `https://${PROJECT_REF}.supabase.co/rest/v1/profiles?limit=1`,
      {
        method: 'GET',
        headers: {
          apikey: SR,
          Authorization: `Bearer ${SR}`,
        },
      },
    ),
  );

  // 5. Management API: list projects (will tell us if SR key works there at all)
  results.push(
    await probe(
      'mgmt-list-projects',
      `https://api.supabase.com/v1/projects`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${SR}` },
      },
    ),
  );

  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify({ capturedAt: new Date().toISOString(), projectRef: PROJECT_REF, results }, null, 2),
  );
  console.log(`\nWrote ${OUT_PATH}`);
})();
