/**
 * Verify furigana quality: query ruby_data for 15 annotated segments
 * and print kanji→reading pairs for human eyeballing.
 *
 * Usage: npx tsx scripts/dashboard-recon/verify-furigana-quality.ts
 */

import { readFile } from 'node:fs/promises';

const PROJECT_REF = 'mbgmyvmsvenvtecvrjia';
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function main() {
  const raw = await readFile('.env.local', 'utf8');
  const token = raw.match(/SUPABASE_ACCESS_TOKEN=(sbp_\w+)/)?.[1];
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN not found');

  async function q(sql: string): Promise<any> {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    });
    return r.json();
  }

  // Get 15 segments with ruby_data, preferring ones with kanji spans
  const rows = await q(`
    SELECT id, source_text, ruby_data
    FROM segments
    WHERE ruby_data IS NOT NULL
      AND ruby_data->'spans' IS NOT NULL
      AND jsonb_array_length(ruby_data->'spans') > 0
    LIMIT 15
  `);

  let shown = 0;
  for (const row of rows) {
    const rd = row.ruby_data;
    const kanjiOnly = (rd.spans || []).filter((s: any) => s.type === 'kanji');
    if (kanjiOnly.length === 0) continue;
    shown++;
    console.log(`[${shown}] ${rd.source_text.slice(0, 100)}`);
    for (const s of kanjiOnly) {
      console.log(`    ${s.base} → ${s.reading}  [${s.jlptLevel || 'N/A'}]`);
    }
    console.log();
    if (shown >= 10) break;
  }

  console.log(`\nTotal kanji-containing segments shown: ${shown}`);

  // Also show total annotated count
  const [{ count }] = await q(`SELECT count(*) AS count FROM segments WHERE ruby_data IS NOT NULL`);
  console.log(`Total segments with ruby_data: ${count}`);
}

main().catch(console.error);
