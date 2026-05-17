/**
 * Dump live Supabase public schema as a single declarative
 * 000_baseline_snapshot.sql file. The output describes the schema as it
 * currently exists; it is NOT meant to be re-applied to the live DB (which
 * would conflict). It serves as the anchor point for future migrations.
 *
 * Strategy: query information_schema + pg catalogs, emit CREATE TABLE per
 * table (with NOT NULL, defaults), CREATE INDEX per index, ALTER TABLE ENABLE
 * RLS + CREATE POLICY per policy (via pg_get_policydef-style reconstruction),
 * CREATE OR REPLACE FUNCTION per user-defined function (via pg_get_functiondef),
 * CREATE TRIGGER per trigger (via pg_get_triggerdef).
 *
 * Usage:  npx tsx scripts/dashboard-recon/dump-baseline.ts > supabase/migrations/000_baseline_snapshot.sql
 */
import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

// Skip pgvector/pgcrypto/etc system functions; only emit functions in public schema
// that aren't part of an extension.
async function loadToken(): Promise<string> {
  const raw = await readFile('.env.local', 'utf8');
  const m = raw.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m);
  if (!m) throw new Error('SUPABASE_ACCESS_TOKEN missing');
  return m[1].replace(/^["']|["']$/g, '');
}

async function q<T = unknown>(token: string, sql: string): Promise<T> {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const body = await r.json();
  if (r.status >= 300) throw new Error(`SQL error ${r.status}: ${JSON.stringify(body)}`);
  return body as T;
}

function out(s: string) { process.stdout.write(s); }
function nl() { process.stdout.write('\n'); }

async function main() {
  const token = await loadToken();
  const SCHEMA = 'public';

  out(`-- =============================================================================\n`);
  out(`-- 000 — Baseline schema snapshot\n--\n`);
  out(`-- This file describes the CURRENT live state of the Supabase 'public' schema\n`);
  out(`-- on project ${PROJECT_REF} as of ${new Date().toISOString()}.\n--\n`);
  out(`-- It is reconstructed from information_schema + pg_catalog and is NOT meant\n`);
  out(`-- to be re-applied to the same DB. It serves as the authoritative baseline\n`);
  out(`-- against which migration 004+ are authored, and as the bootstrap script for\n`);
  out(`-- fresh-environment installs (CI, local dev databases).\n--\n`);
  out(`-- See .opencode/aki-q/schema-audit-1778975112.md for the audit that led to\n`);
  out(`-- this re-baselining.\n`);
  out(`-- =============================================================================\n\n`);

  // 1. Tables
  const tables = await q<Array<{ table_name: string }>>(token,
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='${SCHEMA}' AND table_type='BASE TABLE'
     ORDER BY table_name;`);

  for (const { table_name } of tables) {
    const cols = await q<Array<{ column_name: string; data_type: string; udt_name: string; is_nullable: string; column_default: string | null; character_maximum_length: number | null }>>(token,
      `SELECT column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length
       FROM information_schema.columns
       WHERE table_schema='${SCHEMA}' AND table_name='${table_name}'
       ORDER BY ordinal_position;`);

    out(`-- ---- Table: ${table_name} ----\n`);
    out(`CREATE TABLE IF NOT EXISTS ${SCHEMA}.${table_name} (\n`);
    const colLines: string[] = [];
    for (const c of cols) {
      let type = c.data_type;
      // Map information_schema generic names to concrete SQL where needed
      if (type === 'USER-DEFINED' || type === 'ARRAY') type = c.udt_name === 'vector' ? 'vector' : c.udt_name;
      if (type === '_int4') type = 'integer[]';
      if (type === '_uuid') type = 'uuid[]';
      if (type === '_text') type = 'text[]';
      if (type === 'character varying' && c.character_maximum_length) type = `varchar(${c.character_maximum_length})`;
      let line = `  ${c.column_name} ${type}`;
      if (c.is_nullable === 'NO') line += ' NOT NULL';
      if (c.column_default) line += ` DEFAULT ${c.column_default}`;
      colLines.push(line);
    }

    // Constraints (PK, UNIQUE, CHECK, FK)
    const constraints = await q<Array<{ conname: string; contype: string; def: string }>>(token,
      `SELECT con.conname, con.contype::text,
              pg_get_constraintdef(con.oid) AS def
       FROM pg_constraint con
       JOIN pg_class cl ON cl.oid = con.conrelid
       JOIN pg_namespace ns ON ns.oid = cl.relnamespace
       WHERE ns.nspname='${SCHEMA}' AND cl.relname='${table_name}'
       ORDER BY con.contype, con.conname;`);

    for (const con of constraints) {
      colLines.push(`  CONSTRAINT ${con.conname} ${con.def}`);
    }
    out(colLines.join(',\n'));
    out('\n);\n\n');
  }

  // 2. Indexes (non-PK, non-unique-from-constraint)
  out(`-- =============================================================================\n-- Indexes\n-- =============================================================================\n\n`);
  const indexes = await q<Array<{ indexname: string; indexdef: string }>>(token,
    `SELECT indexname, indexdef FROM pg_indexes
     WHERE schemaname='${SCHEMA}'
       AND indexname NOT IN (
         SELECT conname FROM pg_constraint con
         JOIN pg_class cl ON cl.oid = con.conrelid
         JOIN pg_namespace ns ON ns.oid = cl.relnamespace
         WHERE ns.nspname='${SCHEMA}' AND con.contype IN ('p','u')
       )
     ORDER BY indexname;`);
  for (const i of indexes) {
    out(`${i.indexdef.replace(/^CREATE /, 'CREATE ').replace(/^CREATE (UNIQUE )?INDEX /, 'CREATE $1INDEX IF NOT EXISTS ')};\n`);
  }
  nl();

  // 3. RLS enablement
  out(`-- =============================================================================\n-- Row Level Security\n-- =============================================================================\n\n`);
  const rlsTables = await q<Array<{ tablename: string }>>(token,
    `SELECT tablename FROM pg_tables WHERE schemaname='${SCHEMA}'
       AND rowsecurity = true
     ORDER BY tablename;`);
  for (const t of rlsTables) {
    out(`ALTER TABLE ${SCHEMA}.${t.tablename} ENABLE ROW LEVEL SECURITY;\n`);
  }
  nl();

  // 4. RLS policies
  const policies = await q<Array<{ tablename: string; policyname: string; permissive: string; roles: string; cmd: string; qual: string | null; with_check: string | null }>>(token,
    `SELECT tablename, policyname, permissive, roles::text AS roles, cmd, qual, with_check
     FROM pg_policies WHERE schemaname='${SCHEMA}'
     ORDER BY tablename, policyname;`);
  for (const p of policies) {
    out(`DO $$ BEGIN\n  CREATE POLICY "${p.policyname}" ON ${SCHEMA}.${p.tablename}\n`);
    out(`    AS ${p.permissive}\n    FOR ${p.cmd}\n    TO ${p.roles.replace(/^\{|\}$/g, '').replace(/,/g, ', ')}\n`);
    if (p.qual) out(`    USING (${p.qual})\n`);
    if (p.with_check) out(`    WITH CHECK (${p.with_check})\n`);
    out(`  ;\nEXCEPTION WHEN duplicate_object THEN NULL; END $$;\n\n`);
  }

  // 5. User-defined functions in public (exclude extension-owned)
  out(`-- =============================================================================\n-- Functions (user-defined, excluding extension-owned)\n-- =============================================================================\n\n`);
  const funcs = await q<Array<{ proname: string; def: string }>>(token,
    `SELECT p.proname,
            pg_get_functiondef(p.oid) AS def
     FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
     WHERE n.nspname='${SCHEMA}'
       AND d.objid IS NULL
     ORDER BY p.proname;`);
  for (const f of funcs) {
    out(`-- Function: ${f.proname}\n${f.def}\n\n`);
  }

  // 6. Triggers
  out(`-- =============================================================================\n-- Triggers\n-- =============================================================================\n\n`);
  const triggers = await q<Array<{ tgname: string; def: string }>>(token,
    `SELECT t.tgname, pg_get_triggerdef(t.oid) AS def
     FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='${SCHEMA}' AND NOT t.tgisinternal
     ORDER BY t.tgname;`);
  for (const t of triggers) {
    out(`DROP TRIGGER IF EXISTS ${t.tgname} ON ${t.def.match(/ON ([^\s]+)/)?.[1] ?? '(unknown)'};\n${t.def};\n\n`);
  }

  // 7. Realtime publication
  out(`-- =============================================================================\n-- Realtime publication\n-- =============================================================================\n\n`);
  const pubs = await q<Array<{ tablename: string }>>(token,
    `SELECT tablename FROM pg_publication_tables
     WHERE pubname='supabase_realtime' AND schemaname='${SCHEMA}' ORDER BY tablename;`);
  for (const p of pubs) {
    out(`ALTER PUBLICATION supabase_realtime ADD TABLE ${SCHEMA}.${p.tablename};\n`);
  }
  nl();

  out(`-- =============================================================================\n-- End of 000_baseline_snapshot.sql\n-- =============================================================================\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
