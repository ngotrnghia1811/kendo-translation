/**
 * apply-translations.ts
 *
 * Reads translations JSON and applies simple per-row UPDATEs to the articles table.
 * Keeps DB footprint minimal — no DELETE+INSERT.
 *
 * Usage:
 *   1. Generate /tmp/translations.json first
 *   2. npx tsx scripts/apply-translations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const data = JSON.parse(fs.readFileSync('/tmp/translations.json', 'utf-8'));
  const catA = data.cat_a as Record<string, string>; // id → EN title
  const catB = data.cat_b as Record<string, string>; // id → JP title_ja

  console.log(`Cat A (JP→EN): ${Object.keys(catA).length}`);
  console.log(`Cat B (EN→JP): ${Object.keys(catB).length}`);

  // ── Cat A: need EN title + set title_ja to original JP ────────────────
  // Read current titles to get the JP text for title_ja
  const catAIds = Object.keys(catA);
  if (catAIds.length > 0) {
    const { data: catARows, error: readErr } = await supabase
      .from('articles')
      .select('id, title')
      .in('id', catAIds);

    if (readErr) throw new Error(`Read Cat A failed: ${readErr.message}`);

    const jpTitleMap = new Map<string, string>();
    for (const row of catARows || []) {
      jpTitleMap.set(row.id, row.title);
    }

    let catAOk = 0;
    let catAFail = 0;
    for (const [id, enTitle] of Object.entries(catA)) {
      const jpTitle = jpTitleMap.get(id);
      if (!jpTitle) {
        console.warn(`  ⚠ Cat A: no row for ${id}`);
        catAFail++;
        continue;
      }

      const { error } = await supabase
        .from('articles')
        .update({ title: enTitle, title_ja: jpTitle })
        .eq('id', id);

      if (error) {
        console.error(`  ✗ Cat A UPDATE failed for ${id}: ${error.message}`);
        catAFail++;
      } else {
        catAOk++;
      }

      if ((catAOk + catAFail) % 20 === 0) {
        console.log(`  Cat A progress: ${catAOk + catAFail}/${catAIds.length}`);
      }
    }
    console.log(`  Cat A done: ${catAOk} ok, ${catAFail} failed`);
  }

  // ── Cat B: set title_ja to JP translation ─────────────────────────────
  const catBIds = Object.keys(catB);
  if (catBIds.length > 0) {
    let catBOk = 0;
    let catBFail = 0;

    // Process in batches to avoid overwhelming the DB
    const BATCH = 50;
    for (let i = 0; i < catBIds.length; i += BATCH) {
      const batch = catBIds.slice(i, i + BATCH);
      for (const id of batch) {
        const jaTitle = catB[id];
        const { error } = await supabase
          .from('articles')
          .update({ title_ja: jaTitle })
          .eq('id', id);

        if (error) {
          console.error(`  ✗ Cat B UPDATE failed for ${id}: ${error.message}`);
          catBFail++;
        } else {
          catBOk++;
        }
      }
      console.log(`  Cat B progress: ${Math.min(i + BATCH, catBIds.length)}/${catBIds.length}`);
    }
    console.log(`  Cat B done: ${catBOk} ok, ${catBFail} failed`);
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
