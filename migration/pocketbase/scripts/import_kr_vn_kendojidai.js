#!/usr/bin/env node

/**
 * import_kr_vn_kendojidai.js — KO/VI Backfill for Kendojidai CHILD articles
 *
 * WHY: the Phase-1 bulk import (import_kr_vn_bulk.js) mapped each
 * kendojidai_YYYY slug to the year's PARENT HUSK article (doc_type='book',
 * ~1 segment), so KO/VI segments were never written for the ~7 CHILD
 * articles per year (e.g. "Kendojidai 2010-07"). Those children therefore
 * fall back to English in the reader. This script backfills KO/VI for the
 * child articles by slicing the year's trilingual MD file by page number
 * (EN segments carry metadata.page) and mirroring EN positions (D1).
 *
 * Aligns to the same philosophy as the bulk importer: clean 1:1 pages and
 * fuzzy JA-sequence-matched pages, skipping un-alignable pages.
 *
 * Safety:
 *   - --dry-run is the DEFAULT (no writes).
 *   - Real writes require explicit --apply.
 *   - Idempotent per article: clears pre-existing KO/VI for that article
 *     before inserting (only touches child articles, never husk rows).
 *
 * Usage:
 *   # Preview only (default)
 *   node migration/pocketbase/scripts/import_kr_vn_kendojidai.js \
 *     --pb-url https://155-248-165-196.nip.io \
 *     --pb-email admin@kendo-translation.local \
 *     --pb-password TempAdmin2026!
 *
 *   # Real production write (explicit opt-in)
 *   node migration/pocketbase/scripts/import_kr_vn_kendojidai.js \
 *     --pb-url https://155-248-165-196.nip.io \
 *     --pb-email admin@kendo-translation.local \
 *     --pb-password TempAdmin2026! \
 *     --apply
 *
 *   # Limit to one year (optional)
 *   ... --year 2013 --dry-run
 */

const fs = require("fs");
const path = require("path");
const PocketBase = require("pocketbase").default || require("pocketbase");

const YEARS = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018];

function parseArgs() {
  const args = {
    pbUrl: "https://155-248-165-196.nip.io",
    pbEmail: process.env.PB_EMAIL || "",
    pbPassword: process.env.PB_PASSWORD || "",
    sourceDir: "/Volumes/SSD2T/moving/universal-agent_v2/compiled_agents/gemini_kendo_book_translator_kr_vn",
    year: null,
    dryRun: true,
  };
  for (let i = 2; i < process.argv.length; i++) {
    switch (process.argv[i]) {
      case "--pb-url":      args.pbUrl      = process.argv[++i]; break;
      case "--pb-email":    args.pbEmail    = process.argv[++i]; break;
      case "--pb-password": args.pbPassword = process.argv[++i]; break;
      case "--source-dir":  args.sourceDir  = process.argv[++i]; break;
      case "--year":        args.year       = parseInt(process.argv[++i], 10); break;
      case "--dry-run":     args.dryRun     = true; break;
      case "--apply":       args.dryRun     = false; break;
      case "--help":
        console.log(`
import_kr_vn_kendojidai.js — KO/VI backfill for Kendojidai child articles

Options:
  --pb-url URL          PocketBase instance URL (default: https://155-248-165-196.nip.io)
  --pb-email EMAIL      PocketBase superuser email
  --pb-password PASS    PocketBase superuser password
  --source-dir PATH     Path to KR/VN translation source directory
  --year YYYY           Limit to a single year (2010..2018)
  --dry-run             Dry-run preview mode (DEFAULT)
  --apply               Explicit opt-in to perform REAL production writes
  --help                Show this help
`);
        process.exit(0);
    }
  }
  return args;
}

// ── Text normalization + placeholder detection (mirrors bulk importer) ──
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
  return /^\s*[\[【](?:Figure|Diagram|Page\/Diagram|Tournament bracket diagram|写真|図版|図表|残|残篇|碎片文字|Photo|Image|Biểu đồ|Hình)/i.test(clean);
}

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
        pageBlocks.push({ ja: lines[0], vn: lines[1], ko: lines[2], raw: b });
      }
    }
    mdPageBlocks[pageNum] = pageBlocks;
  }
  return { mdPageBlocks };
}

async function main() {
  const args = parseArgs();
  const timestamp = new Date().toISOString();
  console.log("===============================================================================");
  console.log("  KR/VN KENDOJIDAI CHILD-ARTICLE BACKFILL IMPORTER");
  console.log("===============================================================================");
  console.log(`Target PocketBase: ${args.pbUrl}`);
  console.log(`Execution Mode:    ${args.dryRun ? "DRY-RUN PREVIEW (no writes)" : ">>> REAL PRODUCTION WRITE <<<"}`);
  if (args.year) console.log(`Year filter:       ${args.year}`);
  console.log("-------------------------------------------------------------------------------\n");

  if (args.year && !YEARS.includes(args.year)) {
    console.error(`ERROR: Invalid year ${args.year}. Valid years: ${YEARS.join(", ")}`);
    process.exit(1);
  }

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
        console.warn("! Auth warning: could not authenticate with provided credentials.");
        if (!args.dryRun) {
          console.error("ERROR: authentication required for real writes. Exiting.");
          process.exit(1);
        }
      }
    }
  }

  // 1. Find Kendojidai year books
  const books = await pb.collection("books").getFullList({ requestKey: null });
  const yearBooks = books.filter(b => /^Kendojidai\s+20\d\d$/.test((b.title || "").trim()));
  if (args.year) yearBooks.filter(b => (b.title || "").includes(String(args.year)));
  console.log(`Found ${yearBooks.length} Kendojidai year books.\n`);

  const summary = {
    mode: args.dryRun ? "dry_run" : "real_write",
    timestamp,
    yearsProcessed: 0,
    childArticlesFound: 0,
    childArticlesWithData: 0,
    cleanPages: 0,
    fuzzyPages: 0,
    mismatchPagesSkipped: 0,
    totalKoSegments: 0,
    totalViSegments: 0,
    totalSegmentsWritten: 0,
    perArticle: [],
  };

  for (const book of yearBooks) {
    const year = (book.title.match(/(\d{4})/) || [])[1];
    const slug = `kendojidai_${year}`;
    console.log(`── Year book: "${book.title}" (${book.id}, slug ${slug}) ──`);

    // 2. Child articles (exclude husk parent rows doc_type='book')
    let childArticles = [];
    try {
      childArticles = await pb.collection("articles").getFullList({
        filter: `book = "${book.id}" && doc_type != "book"`,
        fields: "id,title,doc_type,segmented",
        requestKey: null,
      });
    } catch (err) {
      console.error(`   ! Failed to list child articles: ${err.message}. Skipping year.`);
      continue;
    }
    console.log(`   Child articles: ${childArticles.length}`);
    if (childArticles.length === 0) continue;

    // 3. Parse year MD file once
    const translatedDir = path.join(args.sourceDir, "translated");
    const sourceFile = `${slug}_trilingual_vn_kr.md`;
    const sourcePath = path.join(translatedDir, sourceFile);
    const { mdPageBlocks, error: mdError } = parseSourceMd(sourcePath);
    if (mdError) {
      console.error(`   ! ${mdError}. Skipping year.`);
      continue;
    }

    summary.yearsProcessed++;
    summary.childArticlesFound += childArticles.length;

    for (const child of childArticles) {
      // 4. Fetch EN segments with metadata.page for this child article
      let enSegments = [];
      try {
        enSegments = await pb.collection("segments").getFullList({
          filter: `article = "${child.id}" && target_lang = "en"`,
          sort: "position",
          fields: "id,article,position,source_text,metadata",
          batch: 5000,
          requestKey: null,
        });
      } catch (err) {
        console.error(`   ! Failed to fetch EN segments for ${child.title}: ${err.message}`);
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
      let cleanCount = 0;
      let fuzzyCount = 0;
      let mismatchCount = 0;

      // 5a. Clean 1:1 pages
      for (const [pageStr, pbSegs] of Object.entries(pbPageSegs)) {
        const pageNum = parseInt(pageStr, 10);
        const mdBlocks = mdPageBlocks[pageNum] || [];
        if (mdBlocks.length !== pbSegs.length) continue;
        cleanCount++;
        for (let i = 0; i < mdBlocks.length; i++) {
          const block = mdBlocks[i];
          const enSeg = pbSegs[i];
          const baseMeta = { imported_from_pipeline: true, source_file: sourceFile, page: pageNum, tier: "clean", backfill: true, imported_at: timestamp };
          payloads.push({ article: child.id, position: enSeg.position, source_lang: "ja", source_text: block.ja || enSeg.source_text, target_lang: "ko", target_text: block.ko, status: "qa_approved", metadata: baseMeta });
          payloads.push({ article: child.id, position: enSeg.position, source_lang: "ja", source_text: block.ja || enSeg.source_text, target_lang: "vi", target_text: block.vn, status: "qa_approved", metadata: baseMeta });
        }
      }

      // 5b. Fuzzy JA-sequence pages
      for (const [pageStr, pbSegs] of Object.entries(pbPageSegs)) {
        const pageNum = parseInt(pageStr, 10);
        const mdBlocks = mdPageBlocks[pageNum] || [];
        if (pbSegs.length === 0 || mdBlocks.length === 0) continue;
        if (mdBlocks.length === pbSegs.length) continue; // handled in clean
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
            const baseMeta = { imported_from_pipeline: true, source_file: sourceFile, page: pageNum, tier: "fuzzy", backfill: true, imported_at: timestamp };
            payloads.push({ article: child.id, position: matchedEnSeg.position, source_lang: "ja", source_text: block.ja || matchedEnSeg.source_text, target_lang: "ko", target_text: block.ko, status: "qa_approved", metadata: baseMeta });
            payloads.push({ article: child.id, position: matchedEnSeg.position, source_lang: "ja", source_text: block.ja || matchedEnSeg.source_text, target_lang: "vi", target_text: block.vn, status: "qa_approved", metadata: baseMeta });
          }
        }
        if (matchedOnPage) fuzzyCount++;
      }

      // Pages with EN segments but no usable MD alignment → mismatch/skip count
      mismatchCount = Object.keys(pbPageSegs).length - cleanCount - fuzzyCount;

      const koCount = payloads.length / 2;
      const viCount = payloads.length / 2;

      console.log(`   ${child.title} (${child.id}): clean=${cleanCount} fuzzy=${fuzzyCount} skipped=${mismatchCount} → ${koCount} KO + ${viCount} VI`);
      summary.childArticlesWithData += payloads.length > 0 ? 1 : 0;
      summary.cleanPages += cleanCount;
      summary.fuzzyPages += fuzzyCount;
      summary.mismatchPagesSkipped += mismatchCount;
      summary.totalKoSegments += koCount;
      summary.totalViSegments += viCount;
      summary.totalSegmentsWritten += payloads.length;

      if (args.dryRun || payloads.length === 0) {
        summary.perArticle.push({ articleId: child.id, title: child.title, cleanPages: cleanCount, fuzzyPages: fuzzyCount, skippedPages: mismatchCount, koCount, viCount, status: args.dryRun ? "dry_run" : "empty" });
        continue;
      }

      // REAL WRITE: clear existing KO/VI for this child article, then insert
      try {
        const existing = await pb.collection("segments").getFullList({
          filter: `article = "${child.id}" && (target_lang = "ko" || target_lang = "vi")`,
          fields: "id",
          batch: 5000,
          requestKey: null,
        });
        if (existing.length > 0) {
          console.log(`      Clearing ${existing.length} existing KO/VI segments...`);
          for (let b = 0; b < existing.length; b += 300) {
            await Promise.allSettled(existing.slice(b, b + 300).map(s => pb.collection("segments").delete(s.id)));
          }
        }
      } catch (err) {
        console.error(`   ! Cleanup failed for ${child.title}: ${err.message}. Skipping write.`);
        summary.perArticle.push({ articleId: child.id, title: child.title, status: "cleanup_error", error: err.message });
        continue;
      }

      let writtenCount = 0;
      for (let b = 0; b < payloads.length; b += 300) {
        const chunk = payloads.slice(b, b + 300);
        const results = await Promise.allSettled(chunk.map(d => pb.collection("segments").create(d)));
        writtenCount += results.filter(r => r.status === "fulfilled").length;
      }
      console.log(`      ✓ Wrote ${writtenCount} segments.`);
      summary.perArticle.push({ articleId: child.id, title: child.title, cleanPages: cleanCount, fuzzyPages: fuzzyCount, skippedPages: mismatchCount, koCount, viCount, writtenCount, status: "write_success" });
    }
    console.log("");
  }

  // ── Final summary ──
  console.log("===============================================================================");
  console.log(`  FINAL SUMMARY (${args.dryRun ? "DRY-RUN PREVIEW" : "REAL PRODUCTION WRITE"})`);
  console.log("===============================================================================");
  console.log(`Years processed:               ${summary.yearsProcessed}`);
  console.log(`Child articles found:          ${summary.childArticlesFound}`);
  console.log(`Child articles with data:      ${summary.childArticlesWithData}`);
  console.log(`Clean pages:                   ${summary.cleanPages}`);
  console.log(`Fuzzy pages:                   ${summary.fuzzyPages}`);
  console.log(`Mismatch/skip pages:           ${summary.mismatchPagesSkipped}`);
  console.log(`Total KO segments:             ${summary.totalKoSegments}`);
  console.log(`Total VI segments:             ${summary.totalViSegments}`);
  console.log(`Grand total segments:          ${summary.totalSegmentsWritten}`);
  console.log("===============================================================================");
}

main().catch(err => {
  console.error("Backfill import execution failed:", err);
  process.exit(1);
});
