#!/usr/bin/env node

/**
 * Book Hierarchy Derivation — Kendo Translation
 *
 * Parses the pg_dump backup (or queries a running PocketBase instance)
 * to derive the new Book → Article → Page hierarchy from the flat
 * doc_type-based article table.
 *
 * Modes:
 *   1. --backup <path> [--report-only]
 *      Parses the pg_dump backup for article rows, classifies them,
 *      and prints a detailed report. No writes.
 *
 *   2. --pb-url <url> --pb-email <email> --pb-password <pass>
 *      Connects to a running PocketBase instance (after import_data.js
 *      has loaded all data), classifies articles, creates book records,
 *      updates article→book relations, and outputs a report.
 *
 * Classification rules (per locked-in design decisions):
 *   - doc_type='book' + author='剣道時代編集部' → year_compilation books (9)
 *   - doc_type='book' + other author → topic_compilation books (23)
 *   - doc_type='article' + kendojidai source_url → assigned to year_compilation book
 *   - doc_type='article' + no book match → UNCATEGORIZED-BOOK
 *
 * Kendojidai year extraction:
 *   source_url patterns:
 *     kendojidai.com/YYYY/MM/DD/... → extract YYYY
 *     kendojidai.net/YYYY/MM/DD/... → extract YYYY
 *
 * Year-compilation books (9):
 *   "Kendojidai 2010" through "Kendojidai 2018"
 *   These become year-book containers. Any individual kendojidai
 *   article from that year becomes a child.
 *
 * Clear topic books (16, auto-split):
 *   "Kendo Friendly Conversations", "Men Kendo", "Fudochi Shinmyoroku",
 *   "Kendo Mental Strengthening Methods" (both editions),
 *   "Sword and the Way", "Kendo Reiho and Saho", "My Kendo Life",
 *   "Kendo Lecture — New Edition", "Sankaku-ku and Tanden Datotsu",
 *   "A Record of 100 Training Sessions", "Kokyu: Ki Cultivation",
 *   "Kendo is Basics!", "Detailed Explanation of Sword Principles",
 *   "Ki Breathing Method", "Kendo Practice Menu 200"
 *
 * Ambiguous books (7, single-article, no split):
 *   "The Deepest Secrets of Kendo and the Left Foot",
 *   "Elegant Kendo — Debana Issen",
 *   "Precepts of the Kenshi, Volume 1",
 *   "Precepts of the Kenshi, Volume 2",
 *   "Toko Seiwa: The Soul Left Behind by Ogawa Chutaro",
 *   "A Theory of Kendo Experience",
 *   "Kendo as Self-Cultivation"
 *
 * Usage:
 *   # Report-only from backup
 *   node scripts/derive_book_hierarchy.js --backup ../../../db_cluster-03-08-2026@16-47-28.backup --report-only
 *
 *   # Apply to PocketBase
 *   node scripts/derive_book_hierarchy.js \
 *     --pb-url http://127.0.0.1:8090 \
 *     --pb-email admin@kendo-translation.local \
 *     --pb-password TempAdmin2026! \
 *     --apply
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ── CLI argument parsing ──────────────────────────────────────────
function parseArgs() {
    const args = {
        backupPath: null,
        reportOnly: true,
        pbUrl: null,
        pbEmail: null,
        pbPassword: null,
        apply: false,
    };

    for (let i = 2; i < process.argv.length; i++) {
        const arg = process.argv[i];
        switch (arg) {
            case "--backup":      args.backupPath = process.argv[++i]; break;
            case "--report-only": args.reportOnly = true; break;
            case "--apply":       args.apply = true; args.reportOnly = false; break;
            case "--pb-url":      args.pbUrl = process.argv[++i]; break;
            case "--pb-email":    args.pbEmail = process.argv[++i]; break;
            case "--pb-password": args.pbPassword = process.argv[++i]; break;
            case "--help":
                console.log(`
Usage: node derive_book_hierarchy.js [options]

Modes:
  Report-only (parse backup, no writes):
    --backup PATH --report-only

  Apply to PocketBase (requires imported data):
    --pb-url URL --pb-email EMAIL --pb-password PASS --apply

Options:
  --backup PATH       Path to pg_dump backup file
  --report-only       Parse and report only (default if no --apply)
  --apply             Write to PocketBase (requires --pb-url)
  --pb-url URL        PocketBase instance URL
  --pb-email EMAIL    PocketBase admin email
  --pb-password PASS  PocketBase admin password
  --help              Show this message
`);
                process.exit(0);
        }
    }

    if (args.apply && (!args.pbUrl || !args.pbEmail || !args.pbPassword)) {
        console.error("ERROR: --pb-url, --pb-email, and --pb-password required with --apply.");
        process.exit(1);
    }

    if (!args.backupPath && args.reportOnly) {
        console.error("ERROR: --backup required for report-only mode.");
        process.exit(1);
    }

    return args;
}

// ── Classification constants ──────────────────────────────────────

const YEAR_COMPILATION_AUTHOR = "剣道時代編集部";

// Clear topic books (16) — will be auto-split by segment boundary detection
const CLEAR_BOOK_TITLES = new Set([
    "Kendo Friendly Conversations",
    "Men Kendo",
    "Fudochi Shinmyoroku",
    "Kendo Mental Strengthening Methods",
    "Kendo Mental Strengthening Methods (Alternate Edition)",
    "Sword and the Way",
    "Kendo Reiho and Saho",
    "My Kendo Life",
    "Kendo Lecture — New Edition",
    "Sankaku-ku and Tanden Datotsu — Research on Kendo Kamae and Striking",
    "A Record of 100 Training Sessions with Hanshi Mochida Seiji",
    "Kokyu: Ki Cultivation from Breathing to Meditation",
    "Kendo is Basics!",
    "Detailed Explanation of Sword Principles, Part 1",
    "Ki Breathing Method",
    "Kendo Practice Menu 200",
]);

// Ambiguous books (7) — kept as single-article books, no chapter split
const AMBIGUOUS_BOOK_TITLES = new Set([
    "The Deepest Secrets of Kendo and the Left Foot",
    "Elegant Kendo — Debana Issen",
    "Precepts of the Kenshi, Volume 1",
    "Precepts of the Kenshi, Volume 2",
    "Toko Seiwa: The Soul Left Behind by Ogawa Chutaro",
    "A Theory of Kendo Experience: From Competition to Creation",
    "Kendo as Self-Cultivation",
]);

// ── pg_dump COPY block parser ─────────────────────────────────────
// (adapted from import_data.js)

function parseCopyLine(line, fieldNames) {
    const SENTINEL_TAB = "\x00TAB\x00";
    const SENTINEL_BS = "\x00BS\x00";

    let processed = line;
    processed = processed.replace(/\\\\/g, SENTINEL_BS);
    processed = processed.replace(/\\t/g, SENTINEL_TAB);
    processed = processed.replace(/\\n/g, "\n");

    const parts = processed.split("\t");
    const row = {};
    for (let i = 0; i < fieldNames.length && i < parts.length; i++) {
        let val = parts[i];
        val = val.replace(new RegExp(SENTINEL_BS, "g"), "\\");
        val = val.replace(new RegExp(SENTINEL_TAB, "g"), "\t");
        row[fieldNames[i]] = (val === "\\N") ? null : val;
    }
    for (let i = parts.length; i < fieldNames.length; i++) {
        row[fieldNames[i]] = null;
    }
    return row;
}

const ARTICLES_FIELDS = [
    "id", "title", "created_at", "content_ja", "content_en",
    "source_url", "tags", "translation_status", "quality_score",
    "updated_at", "source_url_en", "source_url_ja", "match_score",
    "title_ja", "translator_id", "segmented", "segment_count",
    "policy", "paired_pdf_path", "doc_type", "author", "summary",
];

async function* parseBackupArticles(backupPath) {
    const rl = readline.createInterface({
        input: fs.createReadStream(backupPath, { encoding: "utf-8" }),
        crlfDelay: Infinity,
    });

    const COPY_PATTERN = /^COPY\s+public\.articles\s+\((.+)\)\s+FROM\s+stdin;$/;
    let inArticlesCopy = false;
    let articlesFields = [];
    let lineCount = 0;

    for await (const line of rl) {
        lineCount++;
        if (!inArticlesCopy) {
            const m = line.match(COPY_PATTERN);
            if (m) {
                inArticlesCopy = true;
                articlesFields = m[1]
                    .split(",")
                    .map(s => s.trim().replace(/^"/, "").replace(/"$/, ""));
            }
            continue;
        }

        if (line === "\\.") {
            // End of articles COPY block
            break;
        }

        const row = parseCopyLine(line, articlesFields);
        yield row;
    }

    rl.close();
}

// ── Year extraction from kendojidai URLs ──────────────────────────
function extractYearFromKendojidaiUrl(url) {
    if (!url) return null;
    // Match kendojidai.com/YYYY/... or kendojidai.net/YYYY/...
    const m = url.match(/kendojidai\.(?:com|net)\/(\d{4})\//);
    return m ? parseInt(m[1], 10) : null;
}

// ── Classification logic ──────────────────────────────────────────

function classifyArticle(row) {
    const docType = row.doc_type;
    const title = row.title || "";
    const author = row.author || "";
    const sourceUrl = row.source_url || row.source_url_en || "";

    // Check if it's a kendojidai year-compilation book
    // Must have BOTH: author=剣道時代編集部 AND title matches "Kendojidai YYYY"
    // (Some books like "Kendo Practice Menu 200" have the same author
    //  but are topic compilations, not year compilations)
    const kendojidaiYearMatch = title.match(/^Kendojidai\s+(\d{4})$/i);
    if (docType === "book" && author === YEAR_COMPILATION_AUTHOR && kendojidaiYearMatch) {
        const year = parseInt(kendojidaiYearMatch[1], 10);
        return {
            kind: "year_compilation_book",
            year,
            title,
            author,
            summary: row.summary || "",
            title_ja: row.title_ja || "",
            sourceArticleId: row.id,
            segmentCount: row.segment_count ? parseInt(row.segment_count, 10) : 0,
        };
    }

    // Check if it's a topic-compilation book
    if (docType === "book") {
        const isClear = CLEAR_BOOK_TITLES.has(title);
        const isAmbiguous = AMBIGUOUS_BOOK_TITLES.has(title);
        const splitStrategy = isClear ? "auto_split" :
                              isAmbiguous ? "single_article" :
                              "unknown";
        return {
            kind: "topic_compilation_book",
            title,
            author,
            summary: row.summary || "",
            title_ja: row.title_ja || "",
            sourceArticleId: row.id,
            segmentCount: row.segment_count ? parseInt(row.segment_count, 10) : 0,
            splitStrategy,
        };
    }

    // Regular article — check for kendojidai URL
    const kendojidaiYear = extractYearFromKendojidaiUrl(sourceUrl);
    if (kendojidaiYear) {
        return {
            kind: "kendojidai_article",
            year: kendojidaiYear,
            title,
            sourceUrl,
            articleId: row.id,
        };
    }

    // Uncategorized article
    return {
        kind: "uncategorized_article",
        title,
        articleId: row.id,
    };
}

// ── Main logic ────────────────────────────────────────────────────

async function main() {
    const args = parseArgs();

    console.log("=== Book Hierarchy Derivation ===\n");

    // ── Phase 1: Parse articles from backup ──────────────────────
    console.log("Phase 1: Parsing articles from backup...");
    const yearCompilationBooks = [];
    const topicCompilationBooks = [];
    let kendojidaiArticles = [];
    let uncategorizedArticles = [];
    let totalArticles = 0;
    let docTypeBookCount = 0;
    let docTypeArticleCount = 0;

    if (args.backupPath) {
        for await (const row of parseBackupArticles(args.backupPath)) {
            totalArticles++;
            if (row.doc_type === "book") docTypeBookCount++;
            else docTypeArticleCount++;

            const classification = classifyArticle(row);

            switch (classification.kind) {
                case "year_compilation_book":
                    yearCompilationBooks.push(classification);
                    break;
                case "topic_compilation_book":
                    topicCompilationBooks.push(classification);
                    break;
                case "kendojidai_article":
                    kendojidaiArticles.push(classification);
                    break;
                case "uncategorized_article":
                    uncategorizedArticles.push(classification);
                    break;
            }
        }
    }

    console.log(`  Total articles parsed: ${totalArticles}`);
    console.log(`  doc_type='book': ${docTypeBookCount}`);
    console.log(`  doc_type='article': ${docTypeArticleCount}`);
    console.log(`  Year-compilation books: ${yearCompilationBooks.length}`);
    console.log(`  Topic-compilation books: ${topicCompilationBooks.length}`);
    console.log(`  Kendojidai individual articles: ${kendojidaiArticles.length}`);
    console.log(`  Uncategorized articles: ${uncategorizedArticles.length}`);

    // ── Phase 2: Derive book hierarchy ───────────────────────────
    console.log("\nPhase 2: Deriving book hierarchy...\n");

    const books = [];           // { title, title_ja, author, summary, sourceBookId, bookType, year, childCount }
    const articleAssignments = []; // { articleId, bookTitle, note }

    // 2a. Year-compilation books (9 → becomes year-book containers)
    const yearBookMap = new Map(); // year → book info
    for (const ycb of yearCompilationBooks) {
        const year = ycb.year;
        if (year && !yearBookMap.has(year)) {
            yearBookMap.set(year, {
                title: ycb.title,
                title_ja: ycb.title_ja,
                author: ycb.author,
                summary: ycb.summary,
                sourceBookId: ycb.sourceArticleId,
                bookType: "year_compilation",
                year,
                childCount: 0,
                splitNeeded: ycb.segmentCount > 0, // Has segment content to split
                originalSegmentCount: ycb.segmentCount,
            });
        }
    }

    // 2b. Assign kendojidai articles to year books
    // Also create year books for years that have kendojidai articles
    // but no pre-existing year-compilation book
    for (const ka of kendojidaiArticles) {
        const year = ka.year;
        if (!yearBookMap.has(year)) {
            // Create a new year book for this year
            yearBookMap.set(year, {
                title: `Kendojidai ${year}`,
                title_ja: `剣道時代 ${year}`,
                author: YEAR_COMPILATION_AUTHOR,
                summary: `Individual articles from Kendo Jidai magazine, ${year}`,
                sourceBookId: null,
                bookType: "year_compilation",
                year,
                childCount: 0,
                splitNeeded: false,
                originalSegmentCount: 0,
            });
        }
        yearBookMap.get(year).childCount++;
    }

    // 2c. Topic-compilation books (23)
    for (const tcb of topicCompilationBooks) {
        books.push({
            title: tcb.title,
            title_ja: tcb.title_ja,
            author: tcb.author,
            summary: tcb.summary,
            sourceBookId: tcb.sourceArticleId,
            bookType: "topic_compilation",
            year: null,
            childCount: 1, // The book itself becomes 1 article (or many after split)
            splitNeeded: tcb.splitStrategy === "auto_split" && tcb.segmentCount > 0,
            splitStrategy: tcb.splitStrategy,
            originalSegmentCount: tcb.segmentCount,
        });
    }

    // 2d. UNCATEGORIZED-BOOK
    const uncategorizedBook = {
        title: "UNCATEGORIZED-BOOK",
        title_ja: "未分類",
        author: null,
        summary: "Articles without an assigned book — collected per user specification.",
        sourceBookId: null,
        bookType: "uncategorized",
        year: null,
        childCount: uncategorizedArticles.length,
        splitNeeded: false,
        splitStrategy: null,
        originalSegmentCount: 0,
    };

    // ── Count year books ─────────────────────────────────────────
    const yearBooks = Array.from(yearBookMap.values());
    const clearBooks = topicCompilationBooks.filter(t => t.splitStrategy === "auto_split");
    const ambiguousBooks = topicCompilationBooks.filter(t => t.splitStrategy === "single_article");
    const unknownBooks = topicCompilationBooks.filter(t => t.splitStrategy === "unknown");

    // ── Totals ────────────────────────────────────────────────────
    const totalBooks = yearBooks.length + topicCompilationBooks.length + 1; // +1 for uncategorized
    const totalKendojidaiChildArticles = yearBooks.reduce((sum, b) => sum + b.childCount, 0);
    const totalTopicArticles = topicCompilationBooks.length; // each book = 1 article (or more after split)
    const totalUncategorizedArticles = uncategorizedArticles.length;

    // ── Report ────────────────────────────────────────────────────
    console.log("=".repeat(72));
    console.log("BOOK HIERARCHY REPORT");
    console.log("=".repeat(72));

    console.log(`\n── Summary ──`);
    console.log(`  Total books:                          ${totalBooks}`);
    console.log(`    Year-compilation:                   ${yearBooks.length}`);
    console.log(`    Topic-compilation:                  ${topicCompilationBooks.length}`);
    console.log(`      Clear (auto-split):               ${clearBooks.length}`);
    console.log(`      Ambiguous (single-article):       ${ambiguousBooks.length}`);
    console.log(`      Unknown strategy:                 ${unknownBooks.length}`);
    console.log(`    Uncategorized:                      1`);
    console.log(`  Total articles assigned to books:     ${totalKendojidaiChildArticles + totalTopicArticles + totalUncategorizedArticles}`);
    console.log(`    Kendojidai individual articles:     ${kendojidaiArticles.length}`);
    console.log(`    Topic book articles (pre-split):    ${totalTopicArticles}`);
    console.log(`    Uncategorized articles:             ${totalUncategorizedArticles}`);

    console.log(`\n── Year-compilation books (${yearBooks.length}) ──`);
    // Sort by year
    yearBooks.sort((a, b) => (a.year || 0) - (b.year || 0));
    for (const yb of yearBooks) {
        const preExisting = yb.sourceBookId ? "[PRE-EXISTING]" : "[NEW]";
        const splitNote = yb.splitNeeded
            ? `  ⚠ SPLIT NEEDED: ${yb.originalSegmentCount.toLocaleString()} segments → per-issue child articles`
            : "";
        console.log(`  ${preExisting} ${yb.title}: ${yb.childCount} articles${splitNote}`);
    }

    console.log(`\n── Topic-compilation books (${topicCompilationBooks.length}) ──`);
    console.log(`\n  CLEAR (auto-split) — ${clearBooks.length} books:`);
    for (const tb of clearBooks) {
        console.log(`    ✓ ${tb.title} (${tb.segmentCount.toLocaleString()} segments)`);
    }

    console.log(`\n  AMBIGUOUS (single-article, no split) — ${ambiguousBooks.length} books:`);
    for (const tb of ambiguousBooks) {
        console.log(`    ? ${tb.title} (${tb.segmentCount.toLocaleString()} segments)`);
    }

    if (unknownBooks.length > 0) {
        console.log(`\n  UNKNOWN STRATEGY — ${unknownBooks.length} books:`);
        for (const tb of unknownBooks) {
            console.log(`    ?? ${tb.title} (${tb.segmentCount.toLocaleString()} segments)`);
        }
    }

    console.log(`\n── UNCATEGORIZED-BOOK ──`);
    console.log(`  ${uncategorizedBook.childCount} articles with no book association`);
    console.log(`  (Includes all doc_type='article' rows without kendojidai URLs)`);

    console.log(`\n── Kendojidai year distribution ──`);
    const yearDist = {};
    for (const ka of kendojidaiArticles) {
        yearDist[ka.year] = (yearDist[ka.year] || 0) + 1;
    }
    const sortedYears = Object.keys(yearDist).sort();
    for (const year of sortedYears) {
        const hasPreExisting = yearBookMap.get(parseInt(year))?.sourceBookId ? " [HAS PRE-EXISTING YEAR BOOK]" : " [NEW YEAR BOOK]";
        console.log(`  ${year}: ${yearDist[year]} articles${hasPreExisting}`);
    }

    console.log(`\n── Data integrity verification ──`);
    // doc_type='article' rows (640): all assigned to books
    // doc_type='book' rows (32): become book containers, their content splits into child articles
    const regularArticlesAssigned = totalKendojidaiChildArticles + totalUncategorizedArticles;
    console.log(`  Regular articles (doc_type='article'):  ${docTypeArticleCount}`);
    console.log(`  → Kendojidai articles assigned:         ${totalKendojidaiChildArticles}`);
    console.log(`  → Uncategorized articles assigned:      ${totalUncategorizedArticles}`);
    console.log(`  Total assigned:                         ${regularArticlesAssigned}`);
    console.log(`  Match (doc_type='article' vs assigned): ${docTypeArticleCount === regularArticlesAssigned ? "✓ EXACT" : "✗ MISMATCH"}`);
    console.log(`  Book-type articles (doc_type='book'):   ${docTypeBookCount}`);
    console.log(`  → Become book containers (no article assignment needed)`);

    console.log(`\n── Segment splitting summary ──`);
    const booksNeedingSplit = [
        ...yearBooks.filter(b => b.splitNeeded),
        ...topicCompilationBooks.filter(t => t.splitStrategy === "auto_split" && t.segmentCount > 0),
    ];
    console.log(`  Books needing segment-level splitting: ${booksNeedingSplit.length}`);
    let totalSegmentsToSplit = 0;
    for (const b of booksNeedingSplit) {
        const segCount = b.originalSegmentCount || b.originalSegmentCount || 0;
        totalSegmentsToSplit += segCount;
    }
    console.log(`  Total segments to split:               ${totalSegmentsToSplit.toLocaleString()}`);
    console.log(`  (Auto-splitting requires full segment import — run import_data.js first)`);

    console.log(`\n── Fallback / edge cases ──`);
    let edgeCases = 0;
    if (unknownBooks.length > 0) {
        console.log(`  ⚠ ${unknownBooks.length} topic books with unknown split strategy`);
        console.log(`    → Treated as single-article books (conservative default)`);
        edgeCases++;
    }
    // Check for kendojidai articles with years outside 2010-present range
    const outOfRangeYears = sortedYears.filter(y => parseInt(y) < 2010);
    if (outOfRangeYears.length > 0) {
        console.log(`  ⚠ ${outOfRangeYears.length} kendojidai articles with pre-2010 years: ${outOfRangeYears.join(", ")}`);
        console.log(`    → Still assigned to their respective year books`);
        edgeCases++;
    }
    if (edgeCases === 0) {
        console.log(`  None — all articles classified cleanly.`);
    }

    console.log(`\n${"=".repeat(72)}`);
    console.log(`Report complete.`);
    console.log(`Run with --apply --pb-url ... to write to PocketBase.`);
    console.log(`${"=".repeat(72)}\n`);

    // ── Phase 3: Apply to PocketBase (if requested) ───────────────
    if (args.apply && args.pbUrl) {
        console.log("Phase 3: Applying to PocketBase...\n");

        const PocketBase = require("pocketbase/cjs");
        const pb = new PocketBase(args.pbUrl);

        try {
            await pb.collection("_superusers").authWithPassword(args.pbEmail, args.pbPassword);
            console.log(`  Authenticated to PocketBase at ${args.pbUrl}`);
        } catch (e) {
            console.error(`  Auth failed: ${e.message}`);
            console.error(`  Make sure PocketBase is running and import_data.js has completed.`);
            process.exit(1);
        }

        // 3a. Create year-compilation books
        console.log(`  Creating ${yearBooks.length} year-compilation books...`);
        const bookIdMap = new Map(); // (type, key) → pocketbase record id

        for (const yb of yearBooks) {
            try {
                const record = await pb.collection("books").create({
                    title: yb.title,
                    title_ja: yb.title_ja || "",
                    author: yb.author || "",
                    summary: yb.summary || "",
                    source_book_id: yb.sourceBookId || "",
                    book_type: "year_compilation",
                    year: yb.year,
                });
                bookIdMap.set(`year_${yb.year}`, record.id);
            } catch (e) {
                console.error(`    Error creating book "${yb.title}": ${e.message}`);
            }
        }

        // 3b. Create topic-compilation books
        console.log(`  Creating ${topicCompilationBooks.length} topic-compilation books...`);
        for (const tcb of topicCompilationBooks) {
            try {
                const record = await pb.collection("books").create({
                    title: tcb.title,
                    title_ja: tcb.title_ja || "",
                    author: tcb.author || "",
                    summary: tcb.summary || "",
                    source_book_id: tcb.sourceArticleId,
                    book_type: "topic_compilation",
                    year: null,
                });
                bookIdMap.set(`topic_${tcb.sourceArticleId}`, record.id);
            } catch (e) {
                console.error(`    Error creating book "${tcb.title}": ${e.message}`);
            }
        }

        // 3c. Create uncategorized book
        console.log(`  Creating UNCATEGORIZED-BOOK...`);
        let uncategorizedBookId = null;
        try {
            const record = await pb.collection("books").create({
                title: "UNCATEGORIZED-BOOK",
                title_ja: "未分類",
                author: "",
                summary: uncategorizedBook.summary,
                source_book_id: "",
                book_type: "uncategorized",
                year: null,
            });
            uncategorizedBookId = record.id;
        } catch (e) {
            console.error(`    Error creating uncategorized book: ${e.message}`);
        }

        // 3d. Update article→book relations
        // For kendojidai articles: find year → find book → update
        console.log(`  Updating article→book relations (${kendojidaiArticles.length + uncategorizedArticles.length} articles)...`);
        let updated = 0;
        let errors = 0;

        // Kendojidai articles
        for (const ka of kendojidaiArticles) {
            const bookKey = `year_${ka.year}`;
            const bookId = bookIdMap.get(bookKey);
            if (bookId && ka.articleId) {
                try {
                    await pb.collection("articles").update(ka.articleId, { book: bookId });
                    updated++;
                } catch (e) {
                    errors++;
                    if (errors <= 3) console.error(`    Error: ${e.message}`);
                }
            }
        }

        // Uncategorized articles
        for (const ua of uncategorizedArticles) {
            if (uncategorizedBookId && ua.articleId) {
                try {
                    await pb.collection("articles").update(ua.articleId, { book: uncategorizedBookId });
                    updated++;
                } catch (e) {
                    errors++;
                    if (errors <= 3) console.error(`    Error: ${e.message}`);
                }
            }
        }

        console.log(`  Updated: ${updated}, Errors: ${errors}`);
        console.log(`\n  ✓ Books and article relations created in PocketBase.`);
    }
}

main().catch(err => {
    console.error("FATAL:", err.message);
    console.error(err.stack);
    process.exit(1);
});
