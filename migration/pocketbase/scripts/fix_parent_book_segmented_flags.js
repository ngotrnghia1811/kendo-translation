#!/usr/bin/env node

/**
 * fix_parent_book_segmented_flags.js — One-time fix for stale parent-book metadata
 *
 * After split_book_segments.js moved segments from 11 parent books to 126 child
 * articles, the parent articles' `segmented` / `segment_count` fields were never
 * updated. The parents still show segmented=true with large segment_count values,
 * but have 0 (or near-0) segments actually pointing at them → reader page shows
 * "No translations available yet".
 *
 * This script sets segmented=false, segment_count=0 for each of the 11
 * successfully-split parents (fallback:false in split_report.json).
 * The 14 fallback books (fallback:true) are intentionally left untouched.
 *
 * Usage:
 *   node scripts/fix_parent_book_segmented_flags.js \
 *     --pb-url https://155-248-165-196.nip.io \
 *     --pb-email admin@kendo-translation.local \
 *     --pb-password TempAdmin2026!
 *
 *   node scripts/fix_parent_book_segmented_flags.js \
 *     --pb-url https://155-248-165-196.nip.io \
 *     --pb-email admin@kendo-translation.local \
 *     --pb-password TempAdmin2026! \
 *     --dry-run
 */

const PocketBase = require("pocketbase").default || require("pocketbase");

// ── The 11 parent books that were successfully split (fallback:false) ──
// IDs sourced from split_book_segments.js TARGET_BOOKS catalog, cross-
// referenced with split_report.json fallback status.
const PARENTS_TO_FIX = [
  { title: "Kendojidai 2010",             id: "38221898-d3e4-4012-8a23-4a71c6f3a4ee" },
  { title: "Kendojidai 2011",             id: "84f5be1e-6cbf-4753-9fe3-f3146769c1eb" },
  { title: "Kendojidai 2012",             id: "4143b5fb-74df-414f-8ea3-fccc1a2b3b1b" },
  { title: "Kendojidai 2013",             id: "563b88bb-ed67-4f68-abfe-22068c1cf08c" },
  { title: "Kendojidai 2014",             id: "f8eb8778-b83b-4556-86f7-aaa4092d16d6" },
  { title: "Kendojidai 2015",             id: "4541dd08-3773-4b5d-9f8c-81efc75831ea" },
  { title: "Kendojidai 2016",             id: "057c1970-5c75-47f0-85e7-b3a949766148" },
  { title: "Kendojidai 2017",             id: "c602f1e2-95df-4da9-a3cf-3a389efdce92" },
  { title: "Kendojidai 2018",             id: "e9cfbf9f-5be9-4a1f-b5c9-5a52270a6d8c" },
  { title: "Kendo Reiho and Saho",        id: "aea3e1a6-fe6a-408b-b57d-4942900670f4" },
  { title: "Ki Breathing Method",         id: "3785cd55-421e-4daf-b1ba-546e3a09fdbe" },
];

// ── CLI args ──────────────────────────────────────────────────────
function parseArgs() {
  const args = { pbUrl: "", pbEmail: "", pbPassword: "", dryRun: false };
  for (let i = 2; i < process.argv.length; i++) {
    switch (process.argv[i]) {
      case "--pb-url":      args.pbUrl     = process.argv[++i]; break;
      case "--pb-email":    args.pbEmail   = process.argv[++i]; break;
      case "--pb-password": args.pbPassword = process.argv[++i]; break;
      case "--dry-run":     args.dryRun    = true; break;
      case "--help":
        console.log(`
Usage: node fix_parent_book_segmented_flags.js [options]

Options:
  --pb-url URL         PocketBase instance URL
  --pb-email EMAIL     PocketBase admin email
  --pb-password PASS   PocketBase admin password
  --dry-run            Preview only — don't write
  --help               Show this message
`);
        process.exit(0);
    }
  }
  return args;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  if (!args.pbUrl || !args.pbEmail || !args.pbPassword) {
    console.error("ERROR: --pb-url, --pb-email, and --pb-password are required.");
    process.exit(1);
  }

  const pb = new PocketBase(args.pbUrl);

  // Authenticate as superuser
  console.log(`Authenticating as ${args.pbEmail}...`);
  await pb.admins.authWithPassword(args.pbEmail, args.pbPassword);
  console.log("✓ Authenticated\n");

  const results = [];

  for (const parent of PARENTS_TO_FIX) {
    console.log(`── ${parent.title} (${parent.id}) ──`);

    // Sanity check: confirm segments pointing to this parent are near-zero
    let segCount;
    try {
      const segResult = await pb.collection("segments").getList(1, 1, {
        filter: `article = "${parent.id}"`,
        fields: "id",
      });
      segCount = segResult.totalItems;
    } catch (err) {
      console.error(`  ✗ Failed to query segments: ${err.message}`);
      results.push({ ...parent, status: "error", reason: err.message });
      continue;
    }

    console.log(`  Live segments pointing to parent: ${segCount}`);

    // Fetch current article state
    let article;
    try {
      article = await pb.collection("articles").getOne(parent.id, {
        fields: "segmented,segment_count",
      });
    } catch (err) {
      console.error(`  ✗ Failed to fetch article: ${err.message}`);
      results.push({ ...parent, status: "error", reason: err.message });
      continue;
    }

    console.log(`  Current: segmented=${article.segmented}, segment_count=${article.segment_count}`);

    if (!article.segmented && article.segment_count === 0) {
      console.log(`  ✓ Already correct — skipping.`);
      results.push({ ...parent, status: "already_ok", segCount });
      continue;
    }

    if (segCount > 10) {
      console.log(`  ⚠ WARNING: ${segCount} segments still point to this parent (> 10 threshold).`);
      console.log(`    Skipping — this parent may still legitimately own segments.`);
      console.log(`    Manual investigation needed.`);
      results.push({ ...parent, status: "skipped_nonzero", segCount });
      continue;
    }

    if (args.dryRun) {
      console.log(`  [DRY RUN] Would update: segmented=false, segment_count=0`);
      results.push({ ...parent, status: "dry_run", segCount, oldSegCount: article.segment_count });
    } else {
      try {
        await pb.collection("articles").update(parent.id, {
          segmented: false,
          segment_count: 0,
        });
        console.log(`  ✓ Updated: segmented=false, segment_count=0`);
        results.push({ ...parent, status: "fixed", segCount, oldSegCount: article.segment_count });
      } catch (err) {
        console.error(`  ✗ Failed to update: ${err.message}`);
        results.push({ ...parent, status: "error", reason: err.message });
      }
    }
    console.log();
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log("=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  const fixed = results.filter(r => r.status === "fixed" || r.status === "already_ok");
  const skipped = results.filter(r => r.status === "skipped_nonzero");
  const errors = results.filter(r => r.status === "error");
  const dry = results.filter(r => r.status === "dry_run");

  console.log(`  Fixed / already-ok: ${fixed.length}`);
  console.log(`  Skipped (>10 segs): ${skipped.length}`);
  console.log(`  Errors:             ${errors.length}`);
  console.log(`  Dry-run previews:   ${dry.length}`);
  console.log();

  if (fixed.length > 0) {
    console.log("Fixed/already-ok:");
    for (const r of fixed) {
      console.log(`  ✓ ${r.title} (${r.id}) — segs=${r.segCount}, old_sc=${r.oldSegCount ?? "N/A"}`);
    }
  }
  if (skipped.length > 0) {
    console.log("\nSkipped (>10 remaining segments — needs investigation):");
    for (const r of skipped) {
      console.log(`  ! ${r.title} (${r.id}) — ${r.segCount} live segments`);
    }
  }
  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const r of errors) {
      console.log(`  ✗ ${r.title} (${r.id}) — ${r.reason}`);
    }
  }

  return results;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
