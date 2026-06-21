/**
 * Fetch the 28 needs_manual_review articles (list + first 8 full content)
 * for manual semantic alignment.
 *
 * Usage: npx tsx scripts/manual-align-fetch.ts
 * Output: writes data/ tag list + individual article JSON files
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const ENV_PATH = ".env.local";

async function loadEnv(): Promise<Record<string, string>> {
  const raw = await readFile(ENV_PATH, "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

async function main() {
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("FATAL: missing env vars");
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch all 28 tagged articles (id, title, segment_count, tags)
  const { data: allArts, error } = await sb
    .from("articles")
    .select("id, title, content_en, content_ja, segment_count, tags")
    .contains("tags", ["needs_manual_review"])
    .order("segment_count", { ascending: true });

  if (error) {
    console.error("FATAL:", error.message);
    process.exit(1);
  }

  console.log(`Total tagged articles: ${allArts.length}\n`);

  // Print full list
  for (let i = 0; i < allArts.length; i++) {
    const a = allArts[i];
    const batch = i < 8 ? "← BATCH 1" : "";
    console.log(`${i + 1}. ${a.id} | segs=${a.segment_count} | ${a.title?.slice(0, 70) ?? "(no title)"} ${batch}`);
  }

  // Save list
  await mkdir("data/manual-align", { recursive: true });
  await writeFile(
    "data/manual-align/tagged-list.json",
    JSON.stringify(allArts.map(a => ({ id: a.id, title: a.title, segment_count: a.segment_count })), null, 2),
  );

  // Save first 8 with full content for inspection
  const batch = allArts.slice(0, 8);
  for (const a of batch) {
    const safeTitle = (a.title ?? "untitled").replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "_").slice(0, 40);
    await writeFile(
      `data/manual-align/article-${safeTitle}-${a.id.slice(0, 8)}.json`,
      JSON.stringify({
        id: a.id,
        title: a.title,
        segment_count: a.segment_count,
        content_ja: a.content_ja,
        content_en: a.content_en,
      }, null, 2),
    );
    console.log(`  Saved: ${safeTitle}`);
  }

  console.log(`\nDone. ${batch.length} articles saved to data/manual-align/`);
}

main().catch((err) => {
  console.error("Unhandled:", err);
  process.exit(1);
});
