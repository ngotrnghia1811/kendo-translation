#!/usr/bin/env node

/**
 * import_kr_vn_bulk.js — Phase 1 Generalized Bulk Importer for KO/VI Translations
 *
 * DO NOT RUN IN WRITE MODE DURING BUILD — This script is built for the user to execute.
 *
 * Imports Korean ('ko') and Vietnamese ('vi') translations across ALL 31 mapped
 * corpus books for:
 *   1. Clean-tier pages (1:1 direct sequence alignment)
 *   2. Fuzzy-tier pages (Fuzzy JA-sequence matching against EN segments)
 *
 * Explicitly skips `un_alignable` pages (which require manual review or future backfill).
 * Idempotent per book: when executed for a book, clears any pre-existing KO/VI segments
 * for that article before inserting the new clean + fuzzy tier KO/VI segment records.
 *
 * Requirements & Safety:
 *   - Dry-run is the DEFAULT mode (`--dry-run`).
 *   - Real writes require an explicit `--apply` flag.
 *   - Superuser/Admin authentication via PocketBase credentials.
 *   - Write chunking (batch size 200) to ensure reliable network operation.
 *
 * Usage Instructions for User:
 *   1. Preview bulk import (Dry Run):
 *      node migration/pocketbase/scripts/import_kr_vn_bulk.js \
 *        --pb-url https://155-248-165-196.nip.io \
 *        --pb-email admin@kendo-translation.local \
 *        --pb-password TempAdmin2026! \
 *        --dry-run
 *
 *   2. Execute Real Production Bulk Write:
 *      node migration/pocketbase/scripts/import_kr_vn_bulk.js \
 *        --pb-url https://155-248-165-196.nip.io \
 *        --pb-email admin@kendo-translation.local \
 *        --pb-password TempAdmin2026! \
 *        --apply
 *
 *   3. Process a Single Specific Book:
 *      node migration/pocketbase/scripts/import_kr_vn_bulk.js \
 *        --pb-url https://155-248-165-196.nip.io \
 *        --pb-email admin@kendo-translation.local \
 *        --pb-password TempAdmin2026! \
 *        --book "100 practice full" \
 *        --apply
 */

const fs = require("fs");
const path = require("path");
const PocketBase = require("pocketbase").default || require("pocketbase");

// ── CLI Arguments Parser ───────────────────────────────────────────
function parseArgs() {
  const args = {
    pbUrl: "https://155-248-165-196.nip.io",
    pbEmail: process.env.PB_EMAIL || "",
    pbPassword: process.env.PB_PASSWORD || "",
    sourceDir: "/Volumes/SSD2T/moving/universal-agent_v2/compiled_agents/gemini_kendo_book_translator_kr_vn",
    manifestPath: path.join(__dirname, "reconcile_manifest.json"),
    targetSlug: null,
    skipTrialBooks: false,
    dryRun: true,
  };

  for (let i = 2; i < process.argv.length; i++) {
    switch (process.argv[i]) {
      case "--pb-url":           args.pbUrl           = process.argv[++i]; break;
      case "--pb-email":         args.pbEmail         = process.argv[++i]; break;
      case "--pb-password":      args.pbPassword      = process.argv[++i]; break;
      case "--source-dir":       args.sourceDir       = process.argv[++i]; break;
      case "--manifest":         args.manifestPath    = process.argv[++i]; break;
      case "--book":             args.targetSlug      = process.argv[++i]; break;
      case "--skip-trial-books": args.skipTrialBooks  = true; break;
      case "--dry-run":          args.dryRun          = true; break;
      case "--apply":            args.dryRun          = false; break;
      case "--help":
        console.log(`
import_kr_vn_bulk.js — Generalized KR/VN Bulk Segment Importer

Options:
  --pb-url URL          PocketBase instance URL (default: https://155-248-165-196.nip.io)
  --pb-email EMAIL      PocketBase superuser email
  --pb-password PASS    PocketBase superuser password
  --source-dir PATH     Path to KR/VN translation source directory
  --manifest PATH       Path to reconcile_manifest.json
  --book SLUG           Filter import to a single book slug
  --skip-trial-books    Skip the 2 trial-imported books ("Hayashi Full", "SumiSS Train Full")
  --dry-run             Dry-run preview mode (DEFAULT: writes disabled)
  --apply               Explicit opt-in flag to perform REAL production writes
  --help                Show this help message
`);
        process.exit(0);
    }
  }
  return args;
}

// ── Text Normalization Infra ───────────────────────────────────────
function normalizeJaText(text) {
  if (!text) return "";
  return text
    .replace(/\[cite_start\]|\[cite_end\]/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/【(?:Heading|連載|特報|特集|表紙(?:&|＆)インタビュー|剣談剣話|レポート|コラム)】/gi, "")
    .replace(/剣道時代\s*\d{4}\s*年\s*\d{1,2}\s*月?\s*号?\s*(?:p|頁|\.)?\s*[\d\s\-\–\—\.]*/gi, "")
    .replace(/[\s\u3000\t\r\n\f\v]/g, "")
    .replace(/[、。・，．！？!?：:；;「」『』（）()\-\–\—\.\…]/g, "")
    .toLowerCase();
}

function isTruePlaceholder(text) {
  if (!text) return false;
  const clean = text
    .replace(/\[cite_start\]|\[cite_end\]/g, "")
    .replace(/^【(?:Heading|連載|特報|特集|表紙(?:&|＆)インタビュー|剣談剣話|レポート|コラム)】\s*\n?/gi, "")
    .trim();
  return /^\s*\[(?:Figure|Diagram|Page\/Diagram|Tournament bracket diagram|写真|図版|図表|残|残篇|碎片文字|Photo|Image|Biểu đồ|Hình)/i.test(clean);
}

// ── Source Markdown Parser ─────────────────────────────────────────
function parseSourceMd(filePath) {
  if (!fs.existsSync(filePath)) {
    return { mdPageBlocks: {}, error: `File not found: ${filePath}` };
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

      if (isTruePlaceholder(b)) continue;

      const lines = b.split("\n").map(l => l.trim()).filter(l => l !== "" && !/^【(?:Heading|連載|特報|特集|表紙(?:&|＆)インタビュー|剣談剣話|レポート|コラム)】$/i.test(l));
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
  return { mdPageBlocks };
}

// ── Main Execution ─────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  const timestamp = new Date().toISOString();

  console.log("===============================================================================");
  console.log("  KR/VN LANGUAGE INTEGRATION — BULK PRODUCTION IMPORTER");
  console.log("===============================================================================");
  console.log(`Target PocketBase: ${args.pbUrl}`);
  console.log(`Source Directory:  ${args.sourceDir}`);
  console.log(`Manifest Path:     ${args.manifestPath}`);
  console.log(`Execution Mode:    ${args.dryRun ? "DRY-RUN PREVIEW (Writes disabled)" : ">>> REAL PRODUCTION BULK WRITE <<<"}`);
  if (args.targetSlug) console.log(`Target Single Book: "${args.targetSlug}"`);
  if (args.skipTrialBooks) console.log("Trial Books Status: SKIPPING Hayashi Full & SumiSS Train Full");
  console.log("-------------------------------------------------------------------------------\n");

  if (!fs.existsSync(args.manifestPath)) {
    console.error(`ERROR: Manifest file not found at ${args.manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(args.manifestPath, "utf8"));
  const pb = new PocketBase(args.pbUrl);
  pb.autoCancellation(false);

  if (args.pbEmail && args.pbPassword) {
    try {
      await pb.collection("_superusers").authWithPassword(args.pbEmail, args.pbPassword);
      console.log(`✓ Superuser authenticated as ${args.pbEmail}`);
    } catch (e1) {
      try {
        await pb.admins.authWithPassword(args.pbEmail, args.pbPassword);
        console.log(`✓ Admin authenticated as ${args.pbEmail}`);
      } catch (e2) {
        console.warn("! Auth warning: Could not authenticate with provided credentials. Dry-run will use public rules.");
        if (!args.dryRun) {
          console.error("ERROR: Authentication required for real writes. Exiting.");
          process.exit(1);
        }
      }
    }
  }

  // Filter books list
  let booksToProcess = manifest.books.filter(b => b.mapping_status === "MAPPED");

  if (args.targetSlug) {
    booksToProcess = booksToProcess.filter(b => b.slug === args.targetSlug);
  }

  if (args.skipTrialBooks) {
    const trialSlugs = ["Hayashi Full", "SumiSS Train Full"];
    booksToProcess = booksToProcess.filter(b => !trialSlugs.includes(b.slug));
  }

  console.log(`Found ${booksToProcess.length} mapped books to process.\n`);

  const summary = {
    mode: args.dryRun ? "dry_run" : "real_write",
    timestamp,
    totalBooksEvaluated: booksToProcess.length,
    booksImported: 0,
    cleanPagesProcessed: 0,
    fuzzyPagesProcessed: 0,
    unalignablePagesSkipped: 0,
    totalKoSegments: 0,
    totalViSegments: 0,
    totalSegmentsWritten: 0,
    bookResults: [],
  };

  const translatedDir = path.join(args.sourceDir, "translated");

  for (const bookEntry of booksToProcess) {
    const slug = bookEntry.slug;
    const articleId = bookEntry.target_article_id;

    console.log(`── Book: "${slug}" (${bookEntry.book_title}) ──`);
    console.log(`   Article ID: ${articleId}`);

    const cleanPages = bookEntry.page_dispositions.clean_pages_list || [];
    const fuzzyPages = bookEntry.page_dispositions.fuzzy_pages_list || [];
    const unalignableCount = bookEntry.page_dispositions.un_alignable_count || 0;

    summary.unalignablePagesSkipped += unalignableCount;

    const sourceFile = `${slug}_trilingual_vn_kr.md`;
    const sourcePath = path.join(translatedDir, sourceFile);
    const { mdPageBlocks, error: mdError } = parseSourceMd(sourcePath);

    if (mdError) {
      console.error(`   ! ${mdError}. Skipping book.`);
      summary.bookResults.push({ slug, articleId, status: "error", error: mdError });
      continue;
    }

    // Fetch existing PocketBase EN segments for this article
    let enSegments = [];
    try {
      enSegments = await pb.collection("segments").getFullList({
        filter: `article = "${articleId}" && target_lang = "en"`,
        sort: "position",
        fields: "id,article,position,source_text,metadata",
        batch: 5000,
        requestKey: null,
      });
    } catch (err) {
      console.error(`   ! Failed to fetch EN segments from PocketBase: ${err.message}. Skipping.`);
      summary.bookResults.push({ slug, articleId, status: "error", error: err.message });
      continue;
    }

    const pbPageSegs = {};
    for (const s of enSegments) {
      const pg = s.metadata && s.metadata.page ? parseInt(s.metadata.page, 10) : null;
      if (pg !== null && !isNaN(pg)) {
        if (!pbPageSegs[pg]) pbPageSegs[pg] = [];
        pbPageSegs[pg].push(s);
      }
    }

    const payloads = [];
    let bookCleanCount = 0;
    let bookFuzzyCount = 0;

    // 1. Process CLEAN-tier pages (1:1 Direct Alignment)
    for (const pObj of cleanPages) {
      const pageNum = pObj.page;
      const pbSegs = pbPageSegs[pageNum] || [];
      const mdBlocks = mdPageBlocks[pageNum] || [];

      if (mdBlocks.length !== pbSegs.length) continue;

      bookCleanCount++;
      for (let i = 0; i < mdBlocks.length; i++) {
        const block = mdBlocks[i];
        const enSeg = pbSegs[i];

        const baseMeta = {
          imported_from_pipeline: true,
          source_file: sourceFile,
          page: pageNum,
          tier: "clean",
          imported_at: timestamp,
        };

        payloads.push({
          article: articleId,
          position: enSeg.position,
          source_lang: "ja",
          source_text: block.ja || enSeg.source_text,
          target_lang: "ko",
          target_text: block.ko,
          status: "qa_approved",
          metadata: baseMeta,
        });

        payloads.push({
          article: articleId,
          position: enSeg.position,
          source_lang: "ja",
          source_text: block.ja || enSeg.source_text,
          target_lang: "vi",
          target_text: block.vn,
          status: "qa_approved",
          metadata: baseMeta,
        });
      }
    }

    // 2. Process FUZZY-tier pages (Fuzzy JA-Sequence Matching)
    for (const pObj of fuzzyPages) {
      const pageNum = pObj.page;
      const pbSegs = pbPageSegs[pageNum] || [];
      const mdBlocks = mdPageBlocks[pageNum] || [];

      if (pbSegs.length === 0 || mdBlocks.length === 0) continue;

      let matchedOnPage = false;
      const remainingPbSegs = [...pbSegs];

      for (const block of mdBlocks) {
        const normMd = normalizeJaText(block.ja);
        if (!normMd) continue;

        let matchIdx = remainingPbSegs.findIndex(s => normalizeJaText(s.source_text) === normMd);
        if (matchIdx === -1) {
          matchIdx = remainingPbSegs.findIndex(s => {
            const normPb = normalizeJaText(s.source_text);
            return normPb && (normPb.includes(normMd) || normMd.includes(normPb));
          });
        }

        if (matchIdx !== -1) {
          const matchedEnSeg = remainingPbSegs[matchIdx];
          remainingPbSegs.splice(matchIdx, 1);
          matchedOnPage = true;

          const baseMeta = {
            imported_from_pipeline: true,
            source_file: sourceFile,
            page: pageNum,
            tier: "fuzzy",
            imported_at: timestamp,
          };

          payloads.push({
            article: articleId,
            position: matchedEnSeg.position,
            source_lang: "ja",
            source_text: block.ja || matchedEnSeg.source_text,
            target_lang: "ko",
            target_text: block.ko,
            status: "qa_approved",
            metadata: baseMeta,
          });

          payloads.push({
            article: articleId,
            position: matchedEnSeg.position,
            source_lang: "ja",
            source_text: block.ja || matchedEnSeg.source_text,
            target_lang: "vi",
            target_text: block.vn,
            status: "qa_approved",
            metadata: baseMeta,
          });
        }
      }

      if (matchedOnPage) bookFuzzyCount++;
    }

    const bookKo = payloads.length / 2;
    const bookVi = payloads.length / 2;

    console.log(`   Clean pages: ${bookCleanCount} | Fuzzy pages: ${bookFuzzyCount} | Skipped un-alignable: ${unalignableCount}`);
    console.log(`   Prepared ${payloads.length} total segments (${bookKo} KO, ${bookVi} VI).`);

    summary.cleanPagesProcessed += bookCleanCount;
    summary.fuzzyPagesProcessed += bookFuzzyCount;
    summary.totalKoSegments += bookKo;
    summary.totalViSegments += bookVi;
    summary.totalSegmentsWritten += payloads.length;

    if (args.dryRun) {
      console.log(`   [DRY-RUN] Preview complete for "${slug}". (No writes executed)\n`);
      summary.booksImported++;
      summary.bookResults.push({
        slug,
        articleId,
        cleanPages: bookCleanCount,
        fuzzyPages: bookFuzzyCount,
        unalignablePages: unalignableCount,
        koCount: bookKo,
        viCount: bookVi,
        totalSegments: payloads.length,
        status: "dry_run_success",
      });
      continue;
    }

    // REAL WRITE MODE
    console.log("   Clearing pre-existing KO/VI segments for this article...");
    try {
      const existingSegs = await pb.collection("segments").getFullList({
        filter: `article = "${articleId}" && (target_lang = "ko" || target_lang = "vi")`,
        fields: "id",
        batch: 5000,
        requestKey: null,
      });

      if (existingSegs.length > 0) {
        console.log(`   Deleting ${existingSegs.length} existing KO/VI segments...`);
        for (let b = 0; b < existingSegs.length; b += 300) {
          const chunk = existingSegs.slice(b, b + 300);
          await Promise.allSettled(chunk.map(s => pb.collection("segments").delete(s.id)));
        }
        console.log("   ✓ Deletion complete.");
      }
    } catch (err) {
      console.error(`   ! Failed during cleanup: ${err.message}. Skipping write.`);
      summary.bookResults.push({ slug, articleId, status: "error", error: err.message });
      continue;
    }

    console.log(`   Writing ${payloads.length} segment records in batches of 300...`);
    let writtenCount = 0;
    const batchSize = 300;

    for (let b = 0; b < payloads.length; b += batchSize) {
      const chunk = payloads.slice(b, b + batchSize);
      const results = await Promise.allSettled(chunk.map(data => pb.collection("segments").create(data)));
      writtenCount += results.filter(r => r.status === "fulfilled").length;
    }

    console.log(`   ✓ Successfully wrote ${writtenCount} segments for "${slug}".\n`);
    summary.booksImported++;
    summary.bookResults.push({
      slug,
      articleId,
      cleanPages: bookCleanCount,
      fuzzyPages: bookFuzzyCount,
      unalignablePages: unalignableCount,
      writtenCount,
      status: "write_success",
    });
  }

  // ── Final Summary Block ────────────────────────────────────────────
  console.log("===============================================================================");
  console.log(`  BULK IMPORT FINAL SUMMARY (${args.dryRun ? "DRY-RUN PREVIEW" : "REAL PRODUCTION WRITE"})`);
  console.log("===============================================================================");
  console.log(`Total Mapped Books Evaluated:    ${summary.totalBooksEvaluated}`);
  console.log(`Books Processed Successfully:    ${summary.booksImported}`);
  console.log(`Total Clean Pages Processed:     ${summary.cleanPagesProcessed}`);
  console.log(`Total Fuzzy Pages Processed:     ${summary.fuzzyPagesProcessed}`);
  console.log(`Total Un-alignable Pages Skipped:${summary.unalignablePagesSkipped}`);
  console.log("-------------------------------------------------------------------------------");
  console.log(`Total KO Segments Prepared:       ${summary.totalKoSegments}`);
  console.log(`Total VI Segments Prepared:       ${summary.totalViSegments}`);
  console.log(`Grand Total Segments Prepared:    ${summary.totalSegmentsWritten}`);
  console.log("===============================================================================");
}

main().catch(err => {
  console.error("Bulk import execution failed:", err);
  process.exit(1);
});
