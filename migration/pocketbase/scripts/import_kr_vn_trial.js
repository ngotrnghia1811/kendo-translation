#!/usr/bin/env node

/**
 * import_kr_vn_trial.js — Phase 1 Real Trial Import for KO/VI Translations
 *
 * Performs a real production import of Korean ('ko') and Vietnamese ('vi')
 * translations for 2 clean-tier books:
 *   1. "Hayashi Full" (slug: Hayashi Full, article: 42f1851e-1d21-4bbf-966b-d1cfef54471d)
 *   2. "SumiSS Train Full" (slug: SumiSS Train Full, article: 4bb88ee9-933a-4511-80fb-cc66dcd026b0)
 *
 * Implements Phase 1 of the KR/VN rollout:
 * - Imports ONLY clean-tier pages (skips fuzzy & un_alignable).
 * - Writes 2 new segment rows per source segment (one KO, one VI).
 * - Reuses the exact same `position` value as the corresponding EN segment (per D1).
 * - Idempotent: deletes existing KO/VI segments for the target articles before inserting.
 * - Supports dry-run mode (default) and explicit write mode (`--apply`).
 *
 * Usage:
 *   Dry-run mode (default):
 *     node migration/pocketbase/scripts/import_kr_vn_trial.js \
 *       --pb-url https://155-248-165-196.nip.io \
 *       --pb-email admin@kendo-translation.local \
 *       --pb-password TempAdmin2026! \
 *       --dry-run
 *
 *   Write mode (Production write):
 *     node migration/pocketbase/scripts/import_kr_vn_trial.js \
 *       --pb-url https://155-248-165-196.nip.io \
 *       --pb-email admin@kendo-translation.local \
 *       --pb-password TempAdmin2026! \
 *       --apply
 */

const fs = require("fs");
const path = require("path");
const PocketBase = require("pocketbase").default || require("pocketbase");

// ── Trial Target Books Catalog ─────────────────────────────────────
const TRIAL_BOOKS = [
  {
    slug: "Hayashi Full",
    title: "A Theory of Kendo Experience: From Competition to Creation",
    articleId: "42f1851e-1d21-4bbf-966b-d1cfef54471d",
  },
  {
    slug: "SumiSS Train Full",
    title: "Kendo as Self-Cultivation",
    articleId: "4bb88ee9-933a-4511-80fb-cc66dcd026b0",
  },
];

// ── CLI Arguments Parser ───────────────────────────────────────────
function parseArgs() {
  const args = {
    pbUrl: "https://155-248-165-196.nip.io",
    pbEmail: process.env.PB_EMAIL || "admin@kendo-translation.local",
    pbPassword: process.env.PB_PASSWORD || "TempAdmin2026!",
    sourceDir: "/Volumes/SSD2T/moving/universal-agent_v2/compiled_agents/gemini_kendo_book_translator_kr_vn",
    manifestPath: path.join(__dirname, "reconcile_manifest.json"),
    dryRun: true,
    targetSlug: null,
  };

  for (let i = 2; i < process.argv.length; i++) {
    switch (process.argv[i]) {
      case "--pb-url":      args.pbUrl        = process.argv[++i]; break;
      case "--pb-email":    args.pbEmail      = process.argv[++i]; break;
      case "--pb-password": args.pbPassword   = process.argv[++i]; break;
      case "--source-dir":  args.sourceDir    = process.argv[++i]; break;
      case "--manifest":    args.manifestPath = process.argv[++i]; break;
      case "--book":        args.targetSlug   = process.argv[++i]; break;
      case "--dry-run":     args.dryRun       = true; break;
      case "--apply":       args.dryRun       = false; break;
      case "--help":
        console.log(`
import_kr_vn_trial.js — KR/VN Trial Segment Importer

Options:
  --pb-url URL         PocketBase instance URL (default: https://155-248-165-196.nip.io)
  --pb-email EMAIL     PocketBase superuser email
  --pb-password PASS   PocketBase superuser password
  --source-dir PATH    Path to KR/VN translation source directory
  --manifest PATH      Path to reconcile_manifest.json
  --dry-run            Preview changes without writing (default)
  --apply              Execute real writes to PocketBase
  --help               Show this help message
`);
        process.exit(0);
    }
  }
  return args;
}

// ── Source Markdown Parser ─────────────────────────────────────────
function parseSourceMd(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Source Markdown file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const pagesMatch = [...content.matchAll(/(?:^|\n)Page\s+(\d+)\s*\n([\s\S]*?)(?:=== END OF PAGE \1 ===)/g)];

  const mdPageBlocks = {};
  for (const p of pagesMatch) {
    const pageNum = parseInt(p[1], 10);
    const body = p[2].trim();
    const rawBlocks = body.split(/\n\s*---\s*\n/).map(b => b.trim()).filter(Boolean);

    const pageBlocks = [];
    for (let b of rawBlocks) {
      b = b.replace(/\[cite_start\]|\[cite_end\]/g, "").trim();
      if (!b) continue;

      // Skip true placeholders
      if (/^\s*\[(?:Figure|Diagram|Page\/Diagram|Tournament bracket diagram|写真|図版|図表|残|残篇|碎片文字|Photo|Image|Biểu đồ|Hình)/i.test(b)) {
        continue;
      }

      const lines = b.split("\n").map(l => l.trim()).filter(l => l !== "" && l !== "【Heading】");
      if (lines.length >= 3) {
        pageBlocks.push({
          ja: lines[0],
          vn: lines[1],
          ko: lines[2],
          raw: b,
        });
      }
    }
    mdPageBlocks[pageNum] = pageBlocks;
  }
  return mdPageBlocks;
}

// ── Main Execution ─────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  const timestamp = new Date().toISOString();

  console.log("===============================================================================");
  console.log("  KR/VN LANGUAGE INTEGRATION — TRIAL PRODUCTION IMPORT");
  console.log("===============================================================================");
  console.log(`Target PocketBase: ${args.pbUrl}`);
  console.log(`Source Directory:  ${args.sourceDir}`);
  console.log(`Manifest Path:     ${args.manifestPath}`);
  console.log(`Execution Mode:    ${args.dryRun ? "DRY-RUN PREVIEW (No writes)" : ">>> REAL PRODUCTION WRITE <<<"}`);
  console.log("-------------------------------------------------------------------------------\n");

  if (!fs.existsSync(args.manifestPath)) {
    console.error(`ERROR: Manifest file not found at ${args.manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(args.manifestPath, "utf8"));
  const pb = new PocketBase(args.pbUrl);
  pb.autoCancellation(false);

  // Authenticate as superuser
  if (args.pbEmail && args.pbPassword) {
    try {
      await pb.collection("_superusers").authWithPassword(args.pbEmail, args.pbPassword);
      console.log(`✓ Superuser authenticated as ${args.pbEmail}`);
    } catch (e1) {
      try {
        await pb.admins.authWithPassword(args.pbEmail, args.pbPassword);
        console.log(`✓ Admin authenticated as ${args.pbEmail}`);
      } catch (e2) {
        console.error("! Auth failed:", e2.message);
        process.exit(1);
      }
    }
  }

  const summary = {
    mode: args.dryRun ? "dry_run" : "real_write",
    timestamp,
    booksProcessed: 0,
    cleanPagesProcessed: 0,
    koSegmentsWritten: 0,
    viSegmentsWritten: 0,
    totalSegmentsWritten: 0,
    writtenRecordIds: [],
    detailsPerBook: [],
  };

  const translatedDir = path.join(args.sourceDir, "translated");

  const booksToProcess = args.targetSlug
    ? TRIAL_BOOKS.filter(b => b.slug === args.targetSlug)
    : TRIAL_BOOKS;

  for (const targetBook of booksToProcess) {
    console.log(`\n── Processing Book: "${targetBook.slug}" ──`);
    console.log(`   Article UUID: ${targetBook.articleId}`);

    const bookEntry = manifest.books.find(b => b.slug === targetBook.slug);
    if (!bookEntry) {
      console.error(`   ! Book "${targetBook.slug}" not found in reconcile_manifest.json`);
      continue;
    }

    const cleanPages = bookEntry.page_dispositions.clean_pages_list || [];
    console.log(`   Clean-tier pages count: ${cleanPages.length}`);

    // Parse source Markdown file
    const sourceFile = `${targetBook.slug}_trilingual_vn_kr.md`;
    const sourcePath = path.join(translatedDir, sourceFile);
    const mdPageBlocks = parseSourceMd(sourcePath);

    // Fetch existing PocketBase EN segments for this article
    console.log("   Fetching live EN segments from PocketBase...");
    const enSegments = await pb.collection("segments").getFullList({
      filter: `article = "${targetBook.articleId}" && target_lang = "en"`,
      sort: "position",
      fields: "id,article,position,source_text,metadata",
      batch: 5000,
      requestKey: null,
    });

    const pbPageSegs = {};
    for (const s of enSegments) {
      const pg = s.metadata && s.metadata.page ? parseInt(s.metadata.page, 10) : null;
      if (pg !== null && !isNaN(pg)) {
        if (!pbPageSegs[pg]) pbPageSegs[pg] = [];
        pbPageSegs[pg].push(s);
      }
    }

    const payloads = [];
    let bookCleanPagesCount = 0;
    let bookKoCount = 0;
    let bookViCount = 0;

    for (const pObj of cleanPages) {
      const pageNum = pObj.page;
      const pbSegs = pbPageSegs[pageNum] || [];
      const mdBlocks = mdPageBlocks[pageNum] || [];

      if (mdBlocks.length !== pbSegs.length) {
        console.warn(`   ! Page ${pageNum}: Block count mismatch (${mdBlocks.length} MD vs ${pbSegs.length} PB). Skipping.`);
        continue;
      }

      bookCleanPagesCount++;

      for (let i = 0; i < mdBlocks.length; i++) {
        const block = mdBlocks[i];
        const enSeg = pbSegs[i];

        const baseMeta = {
          imported_from_pipeline: true,
          source_file: sourceFile,
          page: pageNum,
          trial_import: true,
          imported_at: timestamp,
        };

        // KO Payload
        payloads.push({
          article: targetBook.articleId,
          position: enSeg.position,
          source_lang: "ja",
          source_text: block.ja || enSeg.source_text,
          target_lang: "ko",
          target_text: block.ko,
          status: "qa_approved",
          metadata: baseMeta,
        });
        bookKoCount++;

        // VI Payload
        payloads.push({
          article: targetBook.articleId,
          position: enSeg.position,
          source_lang: "ja",
          source_text: block.ja || enSeg.source_text,
          target_lang: "vi",
          target_text: block.vn,
          status: "qa_approved",
          metadata: baseMeta,
        });
        bookViCount++;
      }
    }

    console.log(`   Prepared ${payloads.length} segment records (${bookKoCount} KO, ${bookViCount} VI) across ${bookCleanPagesCount} clean pages.`);

    if (args.dryRun) {
      console.log(`   [DRY-RUN] Would delete existing KO/VI segments and insert ${payloads.length} new segments.`);
      summary.booksProcessed++;
      summary.cleanPagesProcessed += bookCleanPagesCount;
      summary.koSegmentsWritten += bookKoCount;
      summary.viSegmentsWritten += bookViCount;
      summary.totalSegmentsWritten += payloads.length;
      summary.detailsPerBook.push({
        slug: targetBook.slug,
        articleId: targetBook.articleId,
        cleanPagesCount: bookCleanPagesCount,
        koCount: bookKoCount,
        viCount: bookViCount,
        totalCount: payloads.length,
        status: "dry_run_success",
      });
      continue;
    }

    // REAL WRITE MODE
    // 1. Idempotent cleanup of existing KO/VI segments for this article
    console.log("   Clearing any pre-existing KO/VI segments for this article...");
    const existingTrialSegs = await pb.collection("segments").getFullList({
      filter: `article = "${targetBook.articleId}" && (target_lang = "ko" || target_lang = "vi")`,
      fields: "id",
      batch: 5000,
      requestKey: null,
    });

    if (existingTrialSegs.length > 0) {
      console.log(`   Deleting ${existingTrialSegs.length} existing KO/VI segments for article ${targetBook.articleId}...`);
      for (let batchStart = 0; batchStart < existingTrialSegs.length; batchStart += 300) {
        const batch = existingTrialSegs.slice(batchStart, batchStart + 300);
        await Promise.allSettled(batch.map(s => pb.collection("segments").delete(s.id)));
      }
      console.log("   ✓ Deletion complete.");
    }

    // 2. Insert new KO/VI segments in batches of 300
    console.log(`   Writing ${payloads.length} segments to PocketBase in batches of 300...`);
    const writtenIds = [];
    const batchSize = 300;

    for (let b = 0; b < payloads.length; b += batchSize) {
      const chunk = payloads.slice(b, b + batchSize);
      const results = await Promise.allSettled(
        chunk.map(data => pb.collection("segments").create(data))
      );

      for (let idx = 0; idx < results.length; idx++) {
        const res = results[idx];
        if (res.status === "fulfilled") {
          writtenIds.push(res.value.id);
        } else {
          console.error(`   ! Failed to create segment at chunk index ${idx}:`, res.reason);
        }
      }

      if ((b + batchSize) % 500 === 0 || b + batchSize >= payloads.length) {
        console.log(`   Progress: ${Math.min(b + batchSize, payloads.length)} / ${payloads.length} segments written...`);
      }
    }

    console.log(`   ✓ Successfully wrote ${writtenIds.length} segments for "${targetBook.slug}".`);

    summary.booksProcessed++;
    summary.cleanPagesProcessed += bookCleanPagesCount;
    summary.koSegmentsWritten += bookKoCount;
    summary.viSegmentsWritten += bookViCount;
    summary.totalSegmentsWritten += writtenIds.length;
    summary.writtenRecordIds.push(...writtenIds);

    summary.detailsPerBook.push({
      slug: targetBook.slug,
      articleId: targetBook.articleId,
      cleanPagesCount: bookCleanPagesCount,
      koCount: bookKoCount,
      viCount: bookViCount,
      totalCount: writtenIds.length,
      writtenRecordIdsSample: writtenIds.slice(0, 5),
      status: "write_success",
    });
  }

  // ── Summary Block ──────────────────────────────────────────────────
  console.log("\n===============================================================================");
  console.log(`  TRIAL IMPORT SUMMARY (${args.dryRun ? "DRY RUN PREVIEW" : "REAL PRODUCTION WRITE"})`);
  console.log("===============================================================================");
  console.log(`Books Processed:          ${summary.booksProcessed}`);
  console.log(`Clean Pages Processed:    ${summary.cleanPagesProcessed}`);
  console.log(`KO Segments Written:      ${summary.koSegmentsWritten}`);
  console.log(`VI Segments Written:      ${summary.viSegmentsWritten}`);
  console.log(`Total Segments Written:   ${summary.totalSegmentsWritten}`);
  console.log("-------------------------------------------------------------------------------");
  console.log("PER-BOOK BREAKDOWN:");
  for (const b of summary.detailsPerBook) {
    console.log(`  • "${b.slug}" (${b.articleId})`);
    console.log(`    Pages: ${b.cleanPagesCount} | KO: ${b.koCount} | VI: ${b.viCount} | Total: ${b.totalCount} rows [${b.status}]`);
  }
  console.log("-------------------------------------------------------------------------------");

  if (!args.dryRun) {
    console.log("\nROLLBACK & IDENTIFICATION QUERY HINT:");
    console.log("  To identify or clean up these specific trial records in PocketBase:");
    console.log(`  Filter: (article = "42f1851e-1d21-4bbf-966b-d1cfef54471d" || article = "4bb88ee9-933a-4511-80fb-cc66dcd026b0") && (target_lang = "ko" || target_lang = "vi") && created >= "${timestamp.slice(0, 10)}"`);
    console.log("===============================================================================");
  }
}

main().catch(err => {
  console.error("Trial import failed:", err);
  process.exit(1);
});
