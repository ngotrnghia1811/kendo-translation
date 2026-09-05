#!/usr/bin/env node

/**
 * repair_kr_vn_corruption.js — Surgical repair of language-corrupted KO/VI segment rows
 *
 * WHY: a parser bug ("column shift") wrote wrong-language text into KO and VI
 * segment rows. The importers guarded `if (lines.length >= 3)` but then indexed
 * FIXED slots `{ ja: lines[0], vn: lines[1], ko: lines[2] }`. On any source block
 * with 4+ lines (for example a JA sentence PLUS a JA photo caption, then VN, then
 * KO) every field shifted one slot: the JA caption landed in `vn`, the Vietnamese
 * landed in `ko`, and the real Korean at lines[3] was silently discarded.
 *
 * The parser bug is already fixed (commit 8f71d04) via the tail-anchored
 * `parseTrilingualBlock` helper, which this script reuses VERBATIM. This script
 * repairs the rows that the OLD parser already wrote to production.
 *
 * INPUT: the read-only corruption scan report (scan_kr_vn_corruption.js output).
 * Only high-confidence `corrupt` rows in `by_article` are touched. The
 * lower-confidence `suspect` rows in `languages[lang].suspect_rows` are IGNORED.
 *
 * ALGORITHM (per affected article):
 *   1. Fetch the article's EN segments to rebuild the position -> page mapping.
 *      EN rows carry `metadata.page`. KO/VI rows do not. This is why `position`
 *      is the join key.
 *   2. Locate and parse the matching source MD file with the FIXED parser,
 *      grouping blocks by page exactly as import_kr_vn_kendojidai.js does
 *      (clean 1:1 pages first, then fuzzy JA-sequence-matched pages).
 *   3. For each corrupt row at a given position, resolve the correct replacement
 *      text (`ko` or `vn`, per the row's target_lang) from the re-parsed source.
 *   4. If a valid replacement exists -> UPDATE the row's target_text.
 *   5. If NO valid replacement exists -> DELETE the row. The fixed parser now
 *      rejects blocks whose ko line lacks Hangul, so some rows legitimately have
 *      no correct source. Explicit user policy: a row holding the wrong language
 *      is worse than no row, because the reader falls back cleanly. Every
 *      deletion is recorded in the report so the missing translations can be
 *      re-generated later.
 *
 * Safety:
 *   - --dry-run is the DEFAULT (no writes).
 *   - Real writes require explicit --apply.
 *   - Only row ids listed as `corrupt` in the scan report are ever touched.
 *   - Every failed update/delete is logged with [target_lang pos=N] context,
 *     accumulated into summary.errors, and drives a non-zero exit code, so a
 *     failed run can never be mistaken for a clean one.
 *
 * Credentials: supply via PB_URL / PB_EMAIL / PB_PASSWORD environment variables.
 * Never hardcode superuser credentials or the production URL in this file. The
 * --pb-url / --pb-email / --pb-password flags exist as an override but should be
 * avoided in shells that persist history.
 *
 * Usage:
 *   export PB_URL='https://<your-pocketbase-host>'
 *   export PB_EMAIL='...' PB_PASSWORD='...'
 *
 *   # Preview only (default)
 *   node migration/pocketbase/scripts/repair_kr_vn_corruption.js \
 *     --scan-file /tmp/scan_full.json
 *
 *   # Real production write (explicit opt-in)
 *   node migration/pocketbase/scripts/repair_kr_vn_corruption.js \
 *     --scan-file /tmp/scan_full.json --apply
 */

const fs = require("fs");
const path = require("path");
const PocketBase = require("pocketbase").default || require("pocketbase");

function parseArgs() {
  const args = {
    pbUrl: process.env.PB_URL || "",
    pbEmail: process.env.PB_EMAIL || "",
    pbPassword: process.env.PB_PASSWORD || "",
    sourceDir: "/Volumes/SSD2T/moving/universal-agent_v2/compiled_agents/gemini_kendo_book_translator_kr_vn",
    scanFile: "/tmp/scan_full.json",
    manifestFile: path.join(__dirname, "reconcile_manifest.json"),
    reportFile: path.join(__dirname, "repair_kr_vn_report.json"),
    dryRun: true,
  };
  for (let i = 2; i < process.argv.length; i++) {
    switch (process.argv[i]) {
      case "--pb-url":       args.pbUrl        = process.argv[++i]; break;
      case "--pb-email":     args.pbEmail      = process.argv[++i]; break;
      case "--pb-password":  args.pbPassword   = process.argv[++i]; break;
      case "--source-dir":   args.sourceDir    = process.argv[++i]; break;
      case "--scan-file":    args.scanFile     = process.argv[++i]; break;
      case "--manifest-file":args.manifestFile = process.argv[++i]; break;
      case "--report-file":  args.reportFile   = process.argv[++i]; break;
      case "--dry-run":      args.dryRun       = true; break;
      case "--apply":        args.dryRun       = false; break;
      case "--help":
        console.log(`
repair_kr_vn_corruption.js — Surgical repair of language-corrupted KO/VI rows

Options:
  --pb-url URL          PocketBase instance URL (or set PB_URL env var)
  --pb-email EMAIL      PocketBase superuser email (or set PB_EMAIL env var)
  --pb-password PASS    PocketBase superuser password (or set PB_PASSWORD env var)
  --source-dir PATH     Path to KR/VN translation source directory
  --scan-file PATH      Corruption scan report JSON (default: /tmp/scan_full.json)
  --manifest-file PATH  Reconcile manifest for book_id -> slug (default: reconcile_manifest.json)
  --report-file PATH    Output JSON audit report path
  --dry-run             Dry-run preview mode (DEFAULT, no writes)
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

/**
 * Tail-anchored trilingual block parser — reused VERBATIM from
 * import_kr_vn_kendojidai.js (commit 8f71d04). Do not re-derive.
 *
 * Anchors to the END of the block, because the trailing two lines are reliably
 * [Vietnamese, Korean] regardless of how many JA lines precede them:
 *   ko = lines.at(-1), vn = lines.at(-2), ja = everything before those.
 * Plus a Hangul assertion: a block whose ko field contains no Hangul is rejected
 * rather than written, so a malformed block can never silently poison a ko row.
 */
const HANGUL_RE = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;

function parseTrilingualBlock(lines, raw) {
  if (!Array.isArray(lines) || lines.length < 3) return null;
  const ko = lines[lines.length - 1];
  const vn = lines[lines.length - 2];
  const ja = lines.slice(0, lines.length - 2).join(" ");
  if (!ko || !vn || !ja) return null;
  // Hangul assertion: reject rather than write a ko field that isn't Korean.
  if (!HANGUL_RE.test(ko)) return null;
  return { ja, vn, ko, raw };
}

// Kana never appears in Vietnamese text. Used to reject a `vn` candidate that is
// really Japanese, so a repair can never re-introduce the corruption it fixes.
const KANA_RE = /[\u3040-\u309F\u30A0-\u30FF]/;

/**
 * Validate a replacement BEFORE writing it. A replacement that fails validation
 * is treated as "no valid replacement", which routes the row to deletion.
 */
function isValidReplacement(targetLang, text) {
  if (!text || !String(text).trim()) return false;
  if (targetLang === "ko") return HANGUL_RE.test(text);
  if (targetLang === "vi") return !HANGUL_RE.test(text) && !KANA_RE.test(text);
  return false;
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
      const parsed = parseTrilingualBlock(lines, b);
      if (parsed) pageBlocks.push(parsed);
    }
    mdPageBlocks[pageNum] = pageBlocks;
  }
  return { mdPageBlocks };
}

/**
 * Rebuild the position -> corrected-block mapping for one article, using the same
 * two-tier alignment as import_kr_vn_kendojidai.js: clean 1:1 pages first, then
 * fuzzy JA-sequence matching on the remaining pages.
 */
function buildPositionMap(enSegments, mdPageBlocks) {
  const pbPageSegs = {};
  for (const s of enSegments) {
    const pg = s.metadata && s.metadata.page ? parseInt(s.metadata.page, 10) : null;
    if (pg !== null && !isNaN(pg)) {
      if (!pbPageSegs[pg]) pbPageSegs[pg] = [];
      pbPageSegs[pg].push(s);
    }
  }

  const positionMap = new Map();
  let cleanPages = 0;
  let fuzzyPages = 0;

  // Tier 1: clean 1:1 pages
  for (const [pageStr, pbSegs] of Object.entries(pbPageSegs)) {
    const pageNum = parseInt(pageStr, 10);
    const mdBlocks = mdPageBlocks[pageNum] || [];
    if (mdBlocks.length !== pbSegs.length) continue;
    cleanPages++;
    for (let i = 0; i < mdBlocks.length; i++) {
      positionMap.set(pbSegs[i].position, { block: mdBlocks[i], tier: "clean", page: pageNum });
    }
  }

  // Tier 2: fuzzy JA-sequence pages
  for (const [pageStr, pbSegs] of Object.entries(pbPageSegs)) {
    const pageNum = parseInt(pageStr, 10);
    const mdBlocks = mdPageBlocks[pageNum] || [];
    if (pbSegs.length === 0 || mdBlocks.length === 0) continue;
    if (mdBlocks.length === pbSegs.length) continue; // handled in clean tier
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
        positionMap.set(matchedEnSeg.position, { block, tier: "fuzzy", page: pageNum });
      }
    }
    if (matchedOnPage) fuzzyPages++;
  }

  return { positionMap, cleanPages, fuzzyPages, pbPageCount: Object.keys(pbPageSegs).length };
}

async function main() {
  const args = parseArgs();
  const timestamp = new Date().toISOString();
  console.log("===============================================================================");
  console.log("  KR/VN LANGUAGE-CORRUPTION SURGICAL REPAIR");
  console.log("===============================================================================");
  console.log(`Target PocketBase: ${args.pbUrl || "(not set)"}`);
  console.log(`Execution Mode:    ${args.dryRun ? "DRY-RUN PREVIEW (no writes)" : ">>> REAL PRODUCTION WRITE <<<"}`);
  console.log(`Scan report:       ${args.scanFile}`);
  console.log("-------------------------------------------------------------------------------\n");

  if (!args.pbUrl) {
    console.error("ERROR: no PocketBase URL. Set PB_URL or pass --pb-url. Never hardcode it.");
    process.exit(1);
  }
  if (!fs.existsSync(args.scanFile)) {
    console.error(`ERROR: scan file not found: ${args.scanFile}`);
    process.exit(1);
  }

  const scan = JSON.parse(fs.readFileSync(args.scanFile, "utf8"));
  const byArticle = scan.by_article || {};
  const affectedIds = Object.keys(byArticle);

  let scanKo = 0;
  let scanVi = 0;
  for (const v of Object.values(byArticle)) {
    scanKo += (v.ko || []).length;
    scanVi += (v.vi || []).length;
  }
  console.log(`Scan reports ${affectedIds.length} affected articles, ${scanKo} KO + ${scanVi} VI = ${scanKo + scanVi} corrupt rows.`);
  console.log(`(Lower-confidence 'suspect' rows are intentionally NOT touched.)\n`);

  // book_id -> slug, from the reconcile manifest
  const bookIdToSlug = {};
  if (fs.existsSync(args.manifestFile)) {
    const manifest = JSON.parse(fs.readFileSync(args.manifestFile, "utf8"));
    for (const b of manifest.books || []) {
      if (b.book_id && b.slug) bookIdToSlug[b.book_id] = b.slug;
    }
  } else {
    console.warn(`! Manifest not found: ${args.manifestFile}. Falling back to Kendojidai title matching only.`);
  }

  const pb = new PocketBase(args.pbUrl);
  pb.autoCancellation(false);

  if (args.pbEmail && args.pbPassword) {
    try {
      await pb.collection("_superusers").authWithPassword(args.pbEmail, args.pbPassword);
      console.log(`✓ Superuser authenticated as ${args.pbEmail}\n`);
    } catch (e1) {
      try {
        await pb.admins.authWithPassword(args.pbEmail, args.pbPassword);
        console.log(`✓ Admin authenticated as ${args.pbEmail}\n`);
      } catch (e2) {
        console.warn("! Auth warning: could not authenticate with provided credentials.");
        if (!args.dryRun) {
          console.error("ERROR: authentication required for real writes. Exiting.");
          process.exit(1);
        }
      }
    }
  } else if (!args.dryRun) {
    console.error("ERROR: credentials required for real writes. Set PB_EMAIL / PB_PASSWORD.");
    process.exit(1);
  }

  const articles = await pb.collection("articles").getFullList({
    fields: "id,title,book,doc_type", batch: 5000, requestKey: null,
  });
  const books = await pb.collection("books").getFullList({
    fields: "id,title", batch: 5000, requestKey: null,
  });
  const articleById = Object.fromEntries(articles.map(a => [a.id, a]));
  const bookById = Object.fromEntries(books.map(b => [b.id, b]));

  const translatedDir = fs.existsSync(path.join(args.sourceDir, "translated"))
    ? path.join(args.sourceDir, "translated")
    : args.sourceDir;

  const mdCache = new Map();
  function loadMd(slug) {
    if (mdCache.has(slug)) return mdCache.get(slug);
    const sourceFile = `${slug}_trilingual_vn_kr.md`;
    const parsed = parseSourceMd(path.join(translatedDir, sourceFile));
    const entry = { ...parsed, sourceFile };
    mdCache.set(slug, entry);
    return entry;
  }

  const summary = {
    mode: args.dryRun ? "dry_run" : "real_write",
    timestamp,
    pbUrl: args.pbUrl,
    scanFile: args.scanFile,
    scanTotals: { articles: affectedIds.length, ko: scanKo, vi: scanVi, total: scanKo + scanVi },
    writesExecuted: 0,
    articlesProcessed: 0,
    articlesSkipped: 0,
    totalRepaired: 0,
    totalDeleted: 0,
    totalFailed: 0,
    repairedByReason: {},
    deletedByReason: {},
    deletedByCause: {},
    perArticle: [],
    // Full auditable list of every DELETED row, so the missing translations can
    // be re-generated later.
    deletions: [],
    unresolvedArticles: [],
    // Every failed update/delete is recorded here instead of being silently
    // dropped, and drives a non-zero exit code at the end.
    errors: [],
  };

  function bump(obj, key) { obj[key] = (obj[key] || 0) + 1; }

  for (const articleId of affectedIds) {
    const entry = byArticle[articleId] || {};
    const corruptRows = [
      ...(entry.ko || []).map(r => ({ ...r, targetLang: "ko" })),
      ...(entry.vi || []).map(r => ({ ...r, targetLang: "vi" })),
    ];
    if (corruptRows.length === 0) continue;

    const article = articleById[articleId];
    if (!article) {
      console.error(`! Article ${articleId} not found in PocketBase. Skipping ${corruptRows.length} row(s).`);
      summary.unresolvedArticles.push({ articleId, reason: "article_not_found", rowCount: corruptRows.length });
      summary.articlesSkipped++;
      continue;
    }
    const articleTitle = article.title || "(untitled)";
    const bookTitle = article.book && bookById[article.book] ? bookById[article.book].title : null;

    // Resolve the source slug: manifest book_id map first, Kendojidai year fallback.
    let slug = article.book ? bookIdToSlug[article.book] : null;
    if (!slug && bookTitle) {
      const ym = bookTitle.match(/^Kendojidai\s+(20\d\d)$/);
      if (ym) slug = `kendojidai_${ym[1]}`;
    }
    if (!slug) {
      console.error(`! No source slug for "${articleTitle}" (book="${bookTitle}"). Skipping ${corruptRows.length} row(s).`);
      summary.unresolvedArticles.push({ articleId, articleTitle, bookTitle, reason: "no_slug_for_book", rowCount: corruptRows.length });
      summary.articlesSkipped++;
      continue;
    }

    const md = loadMd(slug);
    if (md.error) {
      console.error(`! ${md.error} (slug ${slug}, "${articleTitle}"). Skipping ${corruptRows.length} row(s).`);
      summary.unresolvedArticles.push({ articleId, articleTitle, slug, reason: "md_file_not_found", detail: md.error, rowCount: corruptRows.length });
      summary.articlesSkipped++;
      continue;
    }

    // 1. EN segments rebuild the position -> page mapping.
    let enSegments = [];
    try {
      enSegments = await pb.collection("segments").getFullList({
        filter: `article = "${articleId}" && target_lang = "en"`,
        sort: "position",
        fields: "id,position,source_text,metadata",
        batch: 5000,
        requestKey: null,
      });
    } catch (err) {
      console.error(`! Failed to fetch EN segments for "${articleTitle}": ${err.message}`);
      summary.unresolvedArticles.push({ articleId, articleTitle, slug, reason: "en_fetch_failed", detail: err.message, rowCount: corruptRows.length });
      summary.articlesSkipped++;
      continue;
    }

    // Current KO/VI text, needed for the deletion audit trail.
    let existingRows = [];
    try {
      existingRows = await pb.collection("segments").getFullList({
        filter: `article = "${articleId}" && (target_lang = "ko" || target_lang = "vi")`,
        fields: "id,position,target_lang,target_text",
        batch: 5000,
        requestKey: null,
      });
    } catch (err) {
      console.error(`! Failed to fetch KO/VI segments for "${articleTitle}": ${err.message}`);
      summary.unresolvedArticles.push({ articleId, articleTitle, slug, reason: "kovi_fetch_failed", detail: err.message, rowCount: corruptRows.length });
      summary.articlesSkipped++;
      continue;
    }
    const rowById = Object.fromEntries(existingRows.map(r => [r.id, r]));

    const { positionMap, cleanPages, fuzzyPages, pbPageCount } = buildPositionMap(enSegments, md.mdPageBlocks);

    if (pbPageCount === 0) {
      console.error(`! No EN page metadata for "${articleTitle}" (slug ${slug}). Page mapping failed. Skipping ${corruptRows.length} row(s).`);
      summary.unresolvedArticles.push({ articleId, articleTitle, slug, reason: "page_mapping_failed", rowCount: corruptRows.length });
      summary.articlesSkipped++;
      continue;
    }

    // 2. Classify every corrupt row into repair or delete.
    const toRepair = [];
    const toDelete = [];
    for (const row of corruptRows) {
      const hit = positionMap.get(row.position);
      const candidate = hit ? (row.targetLang === "ko" ? hit.block.ko : hit.block.vn) : null;
      const oldText = rowById[row.id] ? rowById[row.id].target_text : null;

      if (hit && isValidReplacement(row.targetLang, candidate)) {
        toRepair.push({ ...row, newText: candidate, tier: hit.tier, page: hit.page });
      } else {
        const cause = !hit
          ? "no_source_block_at_position"
          : (candidate ? "replacement_failed_language_check" : "source_block_missing_field");
        toDelete.push({ ...row, oldText, cause });
      }
    }

    // 3. Execute (or preview).
    let repaired = 0;
    let deleted = 0;
    let failed = 0;

    if (!args.dryRun) {
      for (let b = 0; b < toRepair.length; b += 300) {
        const chunk = toRepair.slice(b, b + 300);
        const results = await Promise.allSettled(
          chunk.map(r => pb.collection("segments").update(r.id, { target_text: r.newText }))
        );
        // Iterate by index so every rejection keeps its row context. Counting
        // only fulfilled results would hide failures.
        for (let ri = 0; ri < results.length; ri++) {
          const r = results[ri];
          const row = chunk[ri];
          if (r.status === "fulfilled") {
            repaired++;
            summary.writesExecuted++;
            bump(summary.repairedByReason, row.reason || "unknown");
          } else {
            failed++;
            const msg = r.reason && r.reason.message ? r.reason.message : String(r.reason);
            if (failed <= 10) {
              console.error(`   ! update failed [${row.targetLang} pos=${row.position}]: ${msg}`);
            }
            summary.errors.push({ articleId, articleTitle, stage: "update", rowId: row.id, targetLang: row.targetLang, position: row.position, error: msg });
          }
        }
      }

      for (let b = 0; b < toDelete.length; b += 300) {
        const chunk = toDelete.slice(b, b + 300);
        const results = await Promise.allSettled(
          chunk.map(r => pb.collection("segments").delete(r.id))
        );
        for (let ri = 0; ri < results.length; ri++) {
          const r = results[ri];
          const row = chunk[ri];
          if (r.status === "fulfilled") {
            deleted++;
            summary.writesExecuted++;
            bump(summary.deletedByReason, row.reason || "unknown");
            bump(summary.deletedByCause, row.cause);
            summary.deletions.push({
              articleId, articleTitle, targetLang: row.targetLang,
              position: row.position, oldText: row.oldText,
              reason: row.reason, cause: row.cause,
            });
          } else {
            failed++;
            const msg = r.reason && r.reason.message ? r.reason.message : String(r.reason);
            if (failed <= 10) {
              console.error(`   ! delete failed [${row.targetLang} pos=${row.position}]: ${msg}`);
            }
            summary.errors.push({ articleId, articleTitle, stage: "delete", rowId: row.id, targetLang: row.targetLang, position: row.position, error: msg });
          }
        }
      }
    } else {
      repaired = toRepair.length;
      deleted = toDelete.length;
      for (const row of toRepair) bump(summary.repairedByReason, row.reason || "unknown");
      for (const row of toDelete) {
        bump(summary.deletedByReason, row.reason || "unknown");
        bump(summary.deletedByCause, row.cause);
        summary.deletions.push({
          articleId, articleTitle, targetLang: row.targetLang,
          position: row.position, oldText: row.oldText,
          reason: row.reason, cause: row.cause,
        });
      }
    }

    summary.articlesProcessed++;
    summary.totalRepaired += repaired;
    summary.totalDeleted += deleted;
    summary.totalFailed += failed;
    summary.perArticle.push({
      articleId, articleTitle, bookTitle, slug,
      sourceFile: md.sourceFile,
      corruptRows: corruptRows.length,
      cleanPages, fuzzyPages, pbPageCount,
      repaired, deleted, failed,
      status: args.dryRun ? "dry_run" : (failed > 0 ? "partial_failure" : "ok"),
    });

    console.log(`  ${articleTitle} (${slug}): ${corruptRows.length} corrupt → repair=${repaired} delete=${deleted} fail=${failed} [pages clean=${cleanPages} fuzzy=${fuzzyPages}]`);
  }

  // ── Report ──
  fs.writeFileSync(args.reportFile, JSON.stringify(summary, null, 2), "utf8");

  console.log("\n===============================================================================");
  console.log(`  FINAL SUMMARY (${args.dryRun ? "DRY-RUN PREVIEW" : "REAL PRODUCTION WRITE"})`);
  console.log("===============================================================================");
  console.log(`Corrupt rows in scan:          ${summary.scanTotals.total} (ko ${summary.scanTotals.ko} / vi ${summary.scanTotals.vi})`);
  console.log(`Articles processed:            ${summary.articlesProcessed}`);
  console.log(`Articles skipped:              ${summary.articlesSkipped}`);
  console.log(`Rows REPAIRED:                 ${summary.totalRepaired}`);
  console.log(`Rows DELETED:                  ${summary.totalDeleted}`);
  console.log(`Rows FAILED:                   ${summary.totalFailed}`);
  console.log(`Production writes executed:    ${summary.writesExecuted}`);
  console.log(`Accounted:                     ${summary.totalRepaired + summary.totalDeleted + summary.totalFailed + summary.unresolvedArticles.reduce((n, u) => n + (u.rowCount || 0), 0)} / ${summary.scanTotals.total}`);
  console.log("\nDeletions by scan reason:");
  for (const [k, v] of Object.entries(summary.deletedByReason).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(34)} ${v}`);
  }
  console.log("\nDeletions by cause:");
  for (const [k, v] of Object.entries(summary.deletedByCause).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(34)} ${v}`);
  }
  console.log("\nRepairs by scan reason:");
  for (const [k, v] of Object.entries(summary.repairedByReason).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(34)} ${v}`);
  }
  if (summary.unresolvedArticles.length > 0) {
    console.log(`\nUNRESOLVED ARTICLES: ${summary.unresolvedArticles.length}`);
    for (const u of summary.unresolvedArticles) {
      console.log(`  ${u.articleTitle || u.articleId} — ${u.reason} (${u.rowCount} rows)`);
    }
  }
  console.log(`\nReport written: ${args.reportFile}`);
  if (summary.errors.length > 0) {
    console.error(`FAILURES:                      ${summary.errors.length} (details in report .errors)`);
    console.log("===============================================================================");
    // Non-zero exit so a failed run can never be mistaken for a clean one.
    process.exitCode = 1;
    return;
  }
  console.log(`Failures:                      0`);
  console.log("===============================================================================");
}

main().catch(err => {
  console.error("Repair execution failed:", err);
  process.exit(1);
});
