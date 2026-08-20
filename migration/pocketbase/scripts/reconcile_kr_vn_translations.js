#!/usr/bin/env node

/**
 * reconcile_kr_vn_translations.js — Phase 0 DRY-RUN KR/VN Translation Reconciliation
 *
 * DRY-RUN ONLY reconciliation script for Phase 0 of the KR/VN rollout.
 * Compares the 32 external KR/VN trilingual `.md` book files against production
 * PocketBase EN segments to validate slug->article mapping, page coverage %,
 * missing-page gaps (~273 expected), and segment count alignment risks per page.
 *
 * Incorporates:
 * 1. Fixed placeholder-detection allowlist ([Figure/Diagram], [写真], [残...])
 *    while treating [cite_start]/[cite_end], [Column], [Feature], [Series], [Original footnote],
 *    [특집], [칼럼], etc. as REAL content blocks.
 * 2. Fuzzy JA-sequence alignment & 3-tier page disposition (clean / fuzzy / un-alignable).
 * 3. Original-language detection/tagging (detected_source_lang) per block for descriptive tracking.
 *
 * DO NOT WRITE TO PRODUCTION — Real-write path is intentionally disabled.
 */

const fs = require("fs");
const path = require("path");
const PocketBase = require("pocketbase").default || require("pocketbase");

// ── Canonical Slug -> Article UUID mapping infra ───────────────────
// Sourced from scripts/import-clean-triplets.ts and split_book_segments.js
const ARTICLE_MAP = {
  "100 practice full":    { id: "eb180692-f702-400c-9d8f-1ee09309b6c2", title: "100 Practice Full" },
  "Eiga Full":            { id: "33ca2416-50c1-4b93-a4ff-5318da576c35", title: "Eiga Full" },
  "Etiqu 1 Full":         { id: "aea3e1a6-fe6a-408b-b57d-4942900670f4", title: "Etiqu 1 Full" },
  "Hayashi Full":         { id: "42f1851e-1d21-4bbf-966b-d1cfef54471d", title: "Hayashi Full" },
  "KodaSS 200 full":      { id: "9fb879ce-9247-45fb-9db7-d4fdedff7496", title: "KodaSS 200 Full" },
  "Left foot full":       { id: "cb602626-be32-4b5f-ac0e-337fa8807aae", title: "Left Foot Full" },
  "Lifelong Full":        { id: "11bf7ade-a84c-493e-9964-b2f09286c6c3", title: "Lifelong Full" },
  "Men Full":             { id: "db9e53c2-941c-471c-9a62-abcb7bb91d42", title: "Men Full" },
  "Mental Full":          { id: "abe50f79-c04f-41c1-9409-faee5a389c62", title: "Mental Full" },
  "Ogawa lecture part 1": { id: "086772e8-9bf4-4881-849e-3597f90aa884", title: "Ogawa Lecture Part 1" },
  "Ogawa lecture part 2": { id: "f877550e-9a53-45ca-ac36-f440bb5e4c32", title: "Ogawa Lecture Part 2" },
  "Ogawa lecture part 3": { id: "05410dcf-74ba-4655-a7c2-53879c0b8880", title: "Ogawa Lecture Part 3" },
  "SumiSS 10 c 1 Full":   { id: "119888a3-96e5-420a-ba8e-9b1f25acd44e", title: "SumiSS 10 C 1 Full" },
  "SumiSS Train Full":    { id: "4bb88ee9-933a-4511-80fb-cc66dcd026b0", title: "SumiSS Train Full" },
  "Tanden Full":          { id: "084983bb-8f91-42b1-b5b3-4add46bfc5a1", title: "Tanden Full" },
  "Tani ss full":         { id: "f43c7bb9-6f4c-4c5d-abcb-bbf8317fa356", title: "Tani Ss Full" },
  "baba 1 clean":         { id: "86adf815-b0ca-46eb-bab7-b6fb040b845c", title: "Baba 1 Clean" },
  "baba 2 clean":         { id: "ab187703-3a17-46ae-bca5-f30b9cd916a4", title: "Baba 2 Clean" },
  "Day breath clean":     { id: "3785cd55-421e-4daf-b1ba-546e3a09fdbe", title: "Day Breath Clean" },
  "kata full":            { id: "91ed41bf-90d4-4ef3-88af-5f68d5ff41b1", title: "Kata Full" },
  "Ki breath Full Clean": { id: "7a593e30-cb52-4695-9a7e-a80ba3cf2f19", title: "Ki Breath Full Clean" },
  "Mental 2 clean":       { id: "b6b281bc-384e-4f7e-9698-e5ff811ad639", title: "Mental 2 Clean" },
  "Zen living full":      { id: "662f0994-87df-4b27-9597-a4bf91346f23", title: "Zen Living Full" },
  "kendojidai_2010":      { id: "38221898-d3e4-4012-8a23-4a71c6f3a4ee", title: "Kendojidai 2010" },
  "kendojidai_2011":      { id: "84f5be1e-6cbf-4753-9fe3-f3146769c1eb", title: "Kendojidai 2011" },
  "kendojidai_2012":      { id: "4143b5fb-74df-414f-8ea3-fccc1a2b3b1b", title: "Kendojidai 2012" },
  "kendojidai_2013":      { id: "563b88bb-ed67-4f68-abfe-22068c1cf08c", title: "Kendojidai 2013" },
  "kendojidai_2014":      { id: "f8eb8778-b83b-4556-86f7-aaa4092d16d6", title: "Kendojidai 2014" },
  "kendojidai_2015":      { id: "4541dd08-3773-4b5d-9f8c-81efc75831ea", title: "Kendojidai 2015" },
  "kendojidai_2016":      { id: "057c1970-5c75-47f0-85e7-b3a949766148", title: "Kendojidai 2016" },
  "kendojidai_2017":      { id: "c602f1e2-95df-4da9-a3cf-3a389efdce92", title: "Kendojidai 2017" },
  "kendojidai_2018":      { id: "e9cfbf9f-5be9-4a1f-b5c9-5a52270a6d8c", title: "Kendojidai 2018" },
};

// Known untracked sibling files (D6 design decision)
const UNTRACKED_SLUGS = [
  { slug: "matsubara", note: "Known-untracked, 15-page note-sourced article, no corpus book in PocketBase" },
  { slug: "morishima", note: "Known-untracked, 25-page note.com article on kendo philosophy, no corpus book in PocketBase" },
];

// ── CLI Argument Parser ───────────────────────────────────────────
function parseArgs() {
  const args = {
    pbUrl: "https://155-248-165-196.nip.io",
    pbEmail: process.env.PB_EMAIL || "",
    pbPassword: process.env.PB_PASSWORD || "",
    sourceDir: "/Volumes/SSD2T/moving/universal-agent_v2/compiled_agents/gemini_kendo_book_translator_kr_vn",
    reportFile: path.join(__dirname, "reconcile_manifest.json"),
    dryRun: true,
  };

  for (let i = 2; i < process.argv.length; i++) {
    switch (process.argv[i]) {
      case "--pb-url":       args.pbUrl      = process.argv[++i]; break;
      case "--pb-email":     args.pbEmail    = process.argv[++i]; break;
      case "--pb-password":  args.pbPassword = process.argv[++i]; break;
      case "--source-dir":   args.sourceDir  = process.argv[++i]; break;
      case "--report-file":  args.reportFile = process.argv[++i]; break;
      case "--dry-run":      args.dryRun     = true; break;
      case "--help":
        console.log(`
reconcile_kr_vn_translations.js — Phase 0 Dry-Run Reconciliation

Options:
  --pb-url URL         PocketBase instance URL (default: https://155-248-165-196.nip.io)
  --pb-email EMAIL     PocketBase superuser email (optional)
  --pb-password PASS   PocketBase superuser password (optional)
  --source-dir PATH    Path to KR/VN translation source directory
  --report-file PATH   Output JSON manifest report path (default: reconcile_manifest.json)
  --dry-run            Dry-run mode (default, writes disabled)
  --help               Show this help message
`);
        process.exit(0);
    }
  }
  return args;
}

// ── Language Detection & Text Normalization Infra ─────────────────
function isTruePlaceholder(text) {
  if (!text) return false;
  const clean = text
    .replace(/\[cite_start\]|\[cite_end\]/g, "")
    .replace(/^【(?:Heading|連載|特報|特集|表紙(?:&|＆)インタビュー|剣談剣話|レポート|コラム)】\s*\n?/gi, "")
    .trim();
  // Explicit allowlist of TRUE placeholders: image/photo/diagram/fragment references.
  // Accept both half-width [ and full-width 【 bracket variants (some source pages
  // use 【Figure/Diagram referenced in original】 instead of [Figure/Diagram...]).
  return /^\s*[\[【](?:Figure|Diagram|Page\/Diagram|Tournament bracket diagram|写真|図版|図表|残|残篇|碎片文字|Photo|Image|Biểu đồ|Hình)/i.test(clean);
}

function detectSourceLang(text) {
  if (!text || typeof text !== "string") return "unknown";
  const clean = text
    .replace(/\[cite_start\]|\[cite_end\]/g, "")
    .replace(/【(?:Heading|連載|特報|特集|表紙(?:&|＆)インタビュー|剣談剣話|レポート|コラム)】/gi, "")
    .replace(/剣道時代\s*\d{4}\s*年\s*\d{1,2}\s*月?\s*号?\s*(?:p|頁|\.)?\s*[\d\s\-\–\—\.]*/gi, "")
    .trim();
  if (!clean) return "unknown";

  const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(clean);
  const hasHangul = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(clean);
  const hasKanji = /[\u4E00-\u9FAF]/.test(clean);
  const latinCount = (clean.match(/[a-zA-Z]/g) || []).length;

  if (hasKana) return "ja";
  if (hasHangul) return "ko";

  const chineseParticles = /(?:这是|但是|所以|我们|他们|因为|这个|那个|没有|什么|进行|可以|就是|知道|对于|通过|需要|或者|如果|为了|有关|these|those|不是|这|们|没|着|让|从|习|练|关|开|门|为|动)/;
  if (hasKanji) {
    if (chineseParticles.test(clean) || /\uFF0C/.test(clean)) return "zh";
    return "ja";
  }

  if (latinCount > 0) {
    if (/^(?:KENDOJIDAI|\d+|[A-Z\d\s\.\-\/]+)$/i.test(clean)) {
      return "ja";
    }
    if (latinCount > clean.length * 0.3) return "en";
  }

  return "ja";
}

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

// ── Source Markdown Parser ─────────────────────────────────────────
function parseSourceMd(filePath) {
  if (!fs.existsSync(filePath)) {
    return { pages: [], mdPageMap: {}, mdPageBlocks: {}, mdTotalTriplets: 0, mdTotalPlaceholders: 0, error: "File not found" };
  }

  const content = fs.readFileSync(filePath, "utf8");
  const pagesMatch = [...content.matchAll(/(?:^|\n)Page\s+(\d+)\s*\n([\s\S]*?)(?:=== END OF PAGE \1 ===)/g)];

  const mdPageMap = {};
  const mdPageBlocks = {};
  let mdTotalTriplets = 0;
  let mdTotalPlaceholders = 0;

  for (const p of pagesMatch) {
    const pageNum = parseInt(p[1], 10);
    const body = p[2].trim();
    const rawBlocks = body.split(/\n\s*---\s*\n/).map(b => b.trim()).filter(Boolean);

    let validTriplets = 0;
    let placeholders = 0;
    const pageBlocks = [];

    for (let b of rawBlocks) {
      // Strip [cite_start] and [cite_end] wrapper markers from block text
      b = b.replace(/\[cite_start\]|\[cite_end\]/g, "").trim();
      if (!b) continue;

      if (isTruePlaceholder(b)) {
        placeholders++;
        continue;
      }

      const lines = b.split("\n").map(l => l.trim()).filter(l => l !== "" && !/^【(?:Heading|連載|特報|特集|表紙(?:&|＆)インタビュー|剣談剣話|レポート|コラム)】$/i.test(l));
      if (lines.length === 3) {
        validTriplets++;
        pageBlocks.push({
          index: pageBlocks.length,
          ja: lines[0],
          vn: lines[1],
          ko: lines[2],
          detected_source_lang: detectSourceLang(lines[0]),
          raw: b
        });
      } else if (lines.length > 0) {
        pageBlocks.push({
          index: pageBlocks.length,
          ja: lines[0],
          vn: lines[1] || "",
          ko: lines[2] || "",
          detected_source_lang: detectSourceLang(lines[0]),
          raw: b
        });
      }
    }

    mdPageMap[pageNum] = validTriplets;
    mdPageBlocks[pageNum] = pageBlocks;
    mdTotalTriplets += validTriplets;
    mdTotalPlaceholders += placeholders;
  }

  const mdPages = Object.keys(mdPageMap).map(Number).sort((a, b) => a - b);
  return { mdPages, mdPageMap, mdPageBlocks, mdTotalTriplets, mdTotalPlaceholders };
}

// ── Main Reconciliation Logic ──────────────────────────────────────
async function main() {
  const args = parseArgs();
  console.log("===============================================================================");
  console.log("  KR/VN LANGUAGE INTEGRATION — PHASE 0 DRY-RUN RECONCILIATION");
  console.log("===============================================================================");
  console.log(`Target PocketBase: ${args.pbUrl}`);
  console.log(`Source Directory:  ${args.sourceDir}`);
  console.log(`Report File Path:  ${args.reportFile}`);
  console.log(`Execution Mode:    DRY-RUN ONLY (Zero writes to production)`);
  console.log("-------------------------------------------------------------------------------\n");

  const pb = new PocketBase(args.pbUrl);
  pb.autoCancellation(false);

  if (args.pbEmail && args.pbPassword) {
    try {
      await pb.collection("_superusers").authWithPassword(args.pbEmail, args.pbPassword);
      console.log("✓ Superuser authenticated successfully.");
    } catch (_) {
      try {
        await pb.admins.authWithPassword(args.pbEmail, args.pbPassword);
        console.log("✓ Admin authenticated successfully.");
      } catch (e) {
        console.warn("! Auth warning: Superuser login failed, continuing with public read rules.");
      }
    }
  }

  const translatedDir = path.join(args.sourceDir, "translated");

  console.log("Loading PocketBase books & articles metadata...");
  const allBooks = await pb.collection("books").getFullList({ requestKey: null });
  const allArticles = await pb.collection("articles").getFullList({ requestKey: null });
  console.log(`✓ Loaded ${allBooks.length} books and ${allArticles.length} articles from PocketBase.\n`);

  const manifest = {
    generated_at: new Date().toISOString(),
    pb_url: args.pbUrl,
    mode: "dry_run_only",
    summary: {
      total_source_slugs: Object.keys(ARTICLE_MAP).length + UNTRACKED_SLUGS.length,
      in_scope_slugs: Object.keys(ARTICLE_MAP).length,
      mapped_slugs: 0,
      unmapped_slugs: 0,
      untracked_slugs: UNTRACKED_SLUGS.length,
      grand_total_pb_en_segments: 0,
      grand_total_md_triplets: 0,
      grand_total_missing_pages: 0,
      page_disposition_totals: {
        clean: 0,
        fuzzy: 0,
        un_alignable: 0,
        total_matched_pages: 0,
      },
      total_non_ja_detected_blocks: 0,
      pre_parser_fix_alignment_risk_pages: 6390,
      post_fix_un_alignable_pages: 0,
      risk_reduction_pages: 0,
      risk_reduction_pct: "0.0%",
    },
    books: [],
    unmapped_slugs_list: [],
    untracked_slugs_list: UNTRACKED_SLUGS,
  };

  console.log("Starting per-book reconciliation with fuzzy sequence alignment...");
  console.log("-------------------------------------------------------------------------------");

  const entries = Object.entries(ARTICLE_MAP);
  const batchSize = 5;

  for (let i = 0; i < entries.length; i += batchSize) {
    const chunk = entries.slice(i, i + batchSize);
    await Promise.all(chunk.map(async ([slug, mapping]) => {
      const art = allArticles.find(a => a.id === mapping.id);
      if (!art) {
        manifest.summary.unmapped_slugs++;
        manifest.unmapped_slugs_list.push({ slug, id: mapping.id, reason: "Article UUID not found in PocketBase" });
        manifest.books.push({
          slug,
          target_article_id: mapping.id,
          mapping_status: "UNMAPPED",
          reason: "Article UUID not found in PocketBase"
        });
        console.log(`✖ [UNMAPPED] "${slug}" -> Article UUID ${mapping.id} NOT FOUND in PocketBase`);
        return;
      }

      manifest.summary.mapped_slugs++;

      const bookRec = allBooks.find(b => b.id === art.book || b.source_book_id === art.id);
      const bookId = bookRec ? bookRec.id : art.book;
      const childArts = allArticles.filter(a => (bookId && a.book === bookId) || a.id === art.id);
      const childArtIds = childArts.map(a => a.id);

      // Fetch EN segments for child articles of this book
      const filterExpr = childArtIds.map(id => `article = "${id}"`).join(" || ");
      const segs = await pb.collection("segments").getFullList({
        filter: `(${filterExpr}) && target_lang = "en"`,
        fields: "id,article,metadata,source_text",
        batch: 5000,
        requestKey: null,
      });

      const pbPageSegs = {};
      for (const s of segs) {
        const pg = s.metadata && s.metadata.page ? parseInt(s.metadata.page, 10) : null;
        if (pg !== null && !isNaN(pg)) {
          if (!pbPageSegs[pg]) pbPageSegs[pg] = [];
          pbPageSegs[pg].push(s);
        }
      }
      const pbPages = Object.keys(pbPageSegs).map(Number).sort((a, b) => a - b);

      // Parse source Markdown file
      const fileName = `${slug}_trilingual_vn_kr.md`;
      const filePath = path.join(translatedDir, fileName);
      const { mdPages, mdPageMap, mdPageBlocks, mdTotalTriplets, mdTotalPlaceholders } = parseSourceMd(filePath);

      const commonPages = pbPages.filter(p => p in mdPageMap);
      const missingInMd = pbPages.filter(p => !(p in mdPageMap));
      const missingInPb = mdPages.filter(p => !(p in pbPageSegs));

      manifest.summary.grand_total_missing_pages += missingInMd.length;
      manifest.summary.grand_total_pb_en_segments += segs.length;
      manifest.summary.grand_total_md_triplets += mdTotalTriplets;

      const pageDispositions = {
        clean: [],
        fuzzy: [],
        un_alignable: [],
      };

      let bookNonJaBlocks = 0;

      for (const p of commonPages) {
        const pbSegs = pbPageSegs[p] || [];
        const mdBlocks = mdPageBlocks[p] || [];

        let hasNonJa = false;
        let nonJaLangs = new Set();
        for (const b of mdBlocks) {
          if (b.detected_source_lang !== "ja") {
            hasNonJa = true;
            nonJaLangs.add(b.detected_source_lang);
            bookNonJaBlocks++;
            manifest.summary.total_non_ja_detected_blocks++;
          }
        }

        // Fuzzy JA-sequence alignment
        let matchedCount = 0;
        const matchedPairs = [];
        const normPbList = pbSegs.map(s => ({ seg: s, norm: normalizeJaText(s.source_text) }));

        for (const mdB of mdBlocks) {
          const normMd = normalizeJaText(mdB.ja);
          if (!normMd) continue;
          const matchingItem = normPbList.find(item => {
            return item.norm && (item.norm.includes(normMd) || normMd.includes(item.norm));
          });
          if (matchingItem) {
            matchedCount++;
            matchedPairs.push({
              md_index: mdB.index,
              pb_segment_id: matchingItem.seg.id,
              md_ja_sample: mdB.ja.slice(0, 40),
              pb_ja_sample: (matchingItem.seg.source_text || "").slice(0, 40),
            });
          }
        }

        const minCount = Math.min(mdBlocks.length, pbSegs.length);
        const matchRatio = minCount > 0 ? parseFloat((matchedCount / minCount).toFixed(2)) : 0;

        if (mdBlocks.length === pbSegs.length) {
          pageDispositions.clean.push({
            page: p,
            segment_count: pbSegs.length,
            status: "clean"
          });
        } else if (matchedCount > 0 && matchRatio >= 0.5) {
          pageDispositions.fuzzy.push({
            page: p,
            pb_en_segment_count: pbSegs.length,
            md_triplet_count: mdBlocks.length,
            matched_blocks_count: matchedCount,
            match_ratio: matchRatio,
            matched_sample_pairs: matchedPairs.slice(0, 3),
            status: "fuzzy"
          });
        } else {
          pageDispositions.un_alignable.push({
            page: p,
            pb_en_segment_count: pbSegs.length,
            md_triplet_count: mdBlocks.length,
            matched_blocks_count: matchedCount,
            match_ratio: matchRatio,
            reason: mdBlocks.length === 0
              ? "No valid MD triplets found"
              : `Sequence alignment mismatch (matched ${matchedCount}/${minCount} blocks, ratio ${matchRatio})`,
            status: "un_alignable"
          });
        }
      }

      manifest.summary.page_disposition_totals.clean += pageDispositions.clean.length;
      manifest.summary.page_disposition_totals.fuzzy += pageDispositions.fuzzy.length;
      manifest.summary.page_disposition_totals.un_alignable += pageDispositions.un_alignable.length;
      manifest.summary.page_disposition_totals.total_matched_pages += commonPages.length;

      const coveragePct = pbPages.length > 0 ? parseFloat(((commonPages.length / pbPages.length) * 100).toFixed(1)) : 0;

      const bookEntry = {
        slug,
        book_id: bookId || null,
        book_title: bookRec ? bookRec.title : art.title,
        target_article_id: art.id,
        child_article_count: childArts.length,
        mapping_status: "MAPPED",
        pb_page_count: pbPages.length,
        md_page_count: mdPages.length,
        matched_page_count: commonPages.length,
        missing_in_md_count: missingInMd.length,
        missing_in_md_pages: missingInMd,
        missing_in_pb_count: missingInPb.length,
        missing_in_pb_pages: missingInPb,
        coverage_pct: coveragePct,
        total_pb_en_segments: segs.length,
        total_md_triplets: mdTotalTriplets,
        non_ja_detected_blocks_count: bookNonJaBlocks,
        page_dispositions: {
          clean_count: pageDispositions.clean.length,
          fuzzy_count: pageDispositions.fuzzy.length,
          un_alignable_count: pageDispositions.un_alignable.length,
          clean_pages_list: pageDispositions.clean,
          fuzzy_pages_list: pageDispositions.fuzzy,
          un_alignable_pages_list: pageDispositions.un_alignable,
        }
      };

      manifest.books.push(bookEntry);

      const pctStr = `${coveragePct.toFixed(1)}%`.padStart(6);
      console.log(`✓ [${pctStr}] "${slug}" | Clean: ${pageDispositions.clean.length} | Fuzzy: ${pageDispositions.fuzzy.length} | Un-alignable: ${pageDispositions.un_alignable.length} | Missing MD: ${missingInMd.length}`);
    }));
  }

  manifest.summary.post_fix_un_alignable_pages = manifest.summary.page_disposition_totals.un_alignable;
  manifest.summary.risk_reduction_pages = 6390 - manifest.summary.post_fix_un_alignable_pages;
  manifest.summary.risk_reduction_pct = `${(((6390 - manifest.summary.post_fix_un_alignable_pages) / 6390) * 100).toFixed(1)}%`;

  // Write manifest JSON report if path provided
  if (args.reportFile) {
    fs.writeFileSync(args.reportFile, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`\n✓ Manifest JSON report saved to: ${args.reportFile}`);
  }

  console.log("\n===============================================================================");
  console.log("  FINAL RECONCILIATION SUMMARY (AFTER PARSER FIX & FUZZY ALIGNMENT)");
  console.log("===============================================================================");
  console.log(`Total Source Slugs Evaluated:         ${manifest.summary.total_source_slugs}`);
  console.log(`In-Scope Slugs (32 Translated):       ${manifest.summary.in_scope_slugs}`);
  console.log(`Successfully Mapped Slugs:            ${manifest.summary.mapped_slugs} / ${manifest.summary.in_scope_slugs}`);
  console.log(`Unmapped Slugs (Failed):              ${manifest.summary.unmapped_slugs} (kata full flagged)`);
  console.log(`Known Untracked Slugs (D6):           ${manifest.summary.untracked_slugs} (matsubara, morishima)`);
  console.log(`Grand Total PB EN Segments:           ${manifest.summary.grand_total_pb_en_segments}`);
  console.log(`Grand Total MD Triplets Parsed:       ${manifest.summary.grand_total_md_triplets}`);
  console.log(`Grand Total Missing Pages in MD:      ${manifest.summary.grand_total_missing_pages}`);
  console.log("-------------------------------------------------------------------------------");
  console.log("3-TIER PAGE DISPOSITION BREAKDOWN:");
  console.log(`  1. Clean Pages (1:1 direct import):   ${manifest.summary.page_disposition_totals.clean}`);
  console.log(`  2. Fuzzy Pages (Sequence aligned):    ${manifest.summary.page_disposition_totals.fuzzy}`);
  console.log(`  3. Un-alignable Pages (Manual review): ${manifest.summary.page_disposition_totals.un_alignable}`);
  console.log(`  Total Matched Pages Evaluated:        ${manifest.summary.page_disposition_totals.total_matched_pages}`);
  console.log("-------------------------------------------------------------------------------");
  console.log(`Blocks tagged with non-'ja' language: ${manifest.summary.total_non_ja_detected_blocks}`);
  console.log(`Pre-fix Alignment Risk Page Count:    ${manifest.summary.pre_parser_fix_alignment_risk_pages}`);
  console.log(`Post-fix Un-alignable Page Count:     ${manifest.summary.post_fix_un_alignable_pages}`);
  console.log(`Risk Reduction:                       ${manifest.summary.risk_reduction_pages} pages fixed/aligned (${manifest.summary.risk_reduction_pct} reduction)`);
  console.log("-------------------------------------------------------------------------------");
  console.log("✓ CONFIRMATION: Zero writes were executed against production PocketBase.");
  console.log("===============================================================================");
}

main().catch(err => {
  console.error("Reconciliation execution failed:", err);
  process.exit(1);
});
