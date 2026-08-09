#!/usr/bin/env node

/**
 * split_book_segments.js — Segment-Level Book Splitter
 *
 * Splits the 25 bulk book-blob articles into per-issue/per-chapter child
 * articles, completing the Book → Article → Page hierarchy migration.
 *
 * Two modes:
 *   1. --backup PATH [--analyze-only]
 *      Stream-parses the pg_dump backup, detects boundaries, reports splits.
 *      No PocketBase or database writes — pure analysis.
 *
 *   2. --pb-url URL --pb-email EMAIL --pb-password PASS [--apply]
 *      Connects to a running PocketBase instance (with imported data),
 *      reads segments via SDK, creates child articles + reassigns segments.
 *
 * Groups:
 *   Group A (9 kendojidai year-compilation books): split by issue month
 *     Marker: YYYY.MM KENDOJIDAI (first occurrence of each month = boundary)
 *     Fallback: residual segments → "Misc YYYY" child article
 *
 *   Group B (16 topic-compilation books): split by chapter boundaries
 *     Per-book pattern detection. Falls back to single-article if
 *     detection produces garbage splits.
 *
 * Usage:
 *   node scripts/split_book_segments.js --backup ../../../db_cluster-03-08-2026@16-47-28.backup --analyze-only
 *   node scripts/split_book_segments.js --pb-url http://127.0.0.1:8090 --pb-email ... --pb-password ... --apply
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const crypto = require("crypto");

// ── CLI args ──────────────────────────────────────────────────────
function parseArgs() {
    const args = {
        backupPath: null,
        analyzeOnly: false,
        pbUrl: null,
        pbEmail: null,
        pbPassword: null,
        apply: false,
        group: "all",
        bookId: null,
        reportFile: null,
        dryRun: false,
    };
    for (let i = 2; i < process.argv.length; i++) {
        switch (process.argv[i]) {
            case "--backup":       args.backupPath = process.argv[++i]; break;
            case "--analyze-only": args.analyzeOnly = true; break;
            case "--pb-url":       args.pbUrl = process.argv[++i]; break;
            case "--pb-email":     args.pbEmail = process.argv[++i]; break;
            case "--pb-password":  args.pbPassword = process.argv[++i]; break;
            case "--apply":        args.apply = true; args.analyzeOnly = false; break;
            case "--group":        args.group = process.argv[++i]; break;
            case "--book-id":      args.bookId = process.argv[++i]; break;
            case "--report-file":  args.reportFile = process.argv[++i]; break;
            case "--dry-run":      args.dryRun = true; break;
            case "--help":
                console.log(`
Usage: node split_book_segments.js [options]

Modes:
  Analyze-only (parse backup, detect boundaries, report):
    --backup PATH --analyze-only [--group A|B|all]

  Apply to PocketBase (requires imported data):
    --pb-url URL --pb-email EMAIL --pb-password PASS --apply [--group A|B|all]

Options:
  --backup PATH       Path to pg_dump backup file
  --analyze-only      Parse and report only (default)
  --apply             Write to PocketBase (requires --pb-url)
  --pb-url URL        PocketBase instance URL
  --pb-email EMAIL    PocketBase admin email
  --pb-password PASS  PocketBase admin password
  --group A|B|all     Which group to process (default: all)
  --book-id ID        Process a single book by article UUID
  --report-file PATH  Write JSON report to file
  --dry-run           Don't write, just show what would happen
  --help              Show this message
`);
                process.exit(0);
        }
    }
    return args;
}

// ── pg_dump COPY parser (shared with import_data.js) ──────────────
const SENTINEL_TAB = "\x00TAB\x00";
const SENTINEL_BS = "\x00BS\x00";

function parseCopyLine(line, fieldNames) {
    let p = line;
    p = p.replace(/\\\\/g, SENTINEL_BS);
    p = p.replace(/\\t/g, SENTINEL_TAB);
    p = p.replace(/\\n/g, "\n");
    const parts = p.split("\t");
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

// ── Book catalog ───────────────────────────────────────────────────

/** @type {Record<string, {id: string, title: string, year: number|null, group: 'A'|'B'}>} */
const TARGET_BOOKS = {
    // Group A — Kendojidai year-compilation books (split by issue month)
    "Kendojidai 2010": { id: "38221898-d3e4-4012-8a23-4a71c6f3a4ee", year: 2010, group: "A" },
    "Kendojidai 2011": { id: "84f5be1e-6cbf-4753-9fe3-f3146769c1eb", year: 2011, group: "A" },
    "Kendojidai 2012": { id: "4143b5fb-74df-414f-8ea3-fccc1a2b3b1b", year: 2012, group: "A" },
    "Kendojidai 2013": { id: "563b88bb-ed67-4f68-abfe-22068c1cf08c", year: 2013, group: "A" },
    "Kendojidai 2014": { id: "f8eb8778-b83b-4556-86f7-aaa4092d16d6", year: 2014, group: "A" },
    "Kendojidai 2015": { id: "4541dd08-3773-4b5d-9f8c-81efc75831ea", year: 2015, group: "A" },
    "Kendojidai 2016": { id: "057c1970-5c75-47f0-85e7-b3a949766148", year: 2016, group: "A" },
    "Kendojidai 2017": { id: "c602f1e2-95df-4da9-a3cf-3a389efdce92", year: 2017, group: "A" },
    "Kendojidai 2018": { id: "e9cfbf9f-5be9-4a1f-b5c9-5a52270a6d8c", year: 2018, group: "A" },

    // Group B — Topic-compilation books (split by chapter boundaries)
    "Kendo Friendly Conversations":        { id: "11bf7ade-a84c-493e-9964-b2f09286c6c3", year: null, group: "B" },
    "Men Kendo":                            { id: "db9e53c2-941c-471c-9a62-abcb7bb91d42", year: null, group: "B" },
    "Fudochi Shinmyoroku":                  { id: "f877550e-9a53-45ca-ac36-f440bb5e4c32", year: null, group: "B" },
    "Kendo Mental Strengthening Methods":   { id: "abe50f79-c04f-41c1-9409-faee5a389c62", year: null, group: "B" },
    "Kendo Mental Strengthening (Alt Ed)":  { id: "b6b281bc-384e-4f7e-9698-e5ff811ad639", year: null, group: "B" },
    "Sword and the Way":                    { id: "05410dcf-74ba-4655-a7c2-53879c0b8880", year: null, group: "B" },
    "Kendo Reiho and Saho":                 { id: "aea3e1a6-fe6a-408b-b57d-4942900670f4", year: null, group: "B" },
    "My Kendo Life":                        { id: "33ca2416-50c1-4b93-a4ff-5318da576c35", year: null, group: "B" },
    "Kendo Lecture — New Edition":          { id: "086772e8-9bf4-4881-849e-3597f90aa884", year: null, group: "B" },
    "Sankaku-ku and Tanden Datotsu":        { id: "084983bb-8f91-42b1-b5b3-4add46bfc5a1", year: null, group: "B" },
    "A Record of 100 Training Sessions":    { id: "eb180692-f702-400c-9d8f-1ee09309b6c2", year: null, group: "B" },
    "Kokyu: Ki Cultivation":                { id: "7a593e30-cb52-4695-9a7e-a80ba3cf2f19", year: null, group: "B" },
    "Kendo is Basics!":                     { id: "119888a3-96e5-420a-ba8e-9b1f25acd44e", year: null, group: "B" },
    "Detailed Explanation of Sword Princ.": { id: "8dda4689-a92b-4a4c-94ad-93cce4c9b1df", year: null, group: "B" },
    "Ki Breathing Method":                  { id: "3785cd55-421e-4daf-b1ba-546e3a09fdbe", year: null, group: "B" },
    "Kendo Practice Menu 200":              { id: "9fb879ce-9247-45fb-9db7-d4fdedff7496", year: null, group: "B" },
};

// ── Boundary detectors ─────────────────────────────────────────────

/**
 * Group A detector: find unique YYYY.MM issue boundaries.
 * Returns array of {pos, year, month, label}.
 * Segments are already sorted by position.
 * First occurrence of each new YYYY.MM KENDOJIDAI marker = boundary.
 * Segments BEFORE the first marker → "Prelim" fallback.
 */
function detectKendojidaiIssues(segments, year) {
    const boundaries = [];
    const seenMonths = new Set();

    for (const seg of segments) {
        const text = seg.source_text || "";
        const m = text.match(/(\d{4})\.(\d{1,2})[\s\u3000]+KENDOJIDAI/i);
        if (m && parseInt(m[1], 10) === year) {
            const monthKey = m[2].padStart(2, "0");
            if (!seenMonths.has(monthKey)) {
                seenMonths.add(monthKey);
                boundaries.push({
                    pos: seg.position,
                    segId: seg.id,
                    year,
                    month: monthKey,
                    label: `Kendojidai ${year}-${monthKey}`,
                });
            }
        }
    }

    return boundaries.sort((a, b) => a.pos - b.pos);
}

/**
 * Build child article splits from boundaries.
 * Returns array of {title, segments: [...]}.
 * Segments before first boundary → fallback "Prelim" child.
 */
function buildKendojidaiSplits(allSegments, boundaries, bookName, year) {
    // Sort segments by position
    const sorted = [...allSegments].sort((a, b) => a.position - b.position);

    if (boundaries.length === 0) {
        return [{ title: bookName, segments: sorted, fallback: "no_boundaries" }];
    }

    const splits = [];
    let segIdx = 0;

    // Segments before first boundary → "Prelim" or first issue
    if (boundaries[0].pos > sorted[0]?.position) {
        const preSegs = [];
        while (segIdx < sorted.length && sorted[segIdx].position < boundaries[0].pos) {
            preSegs.push(sorted[segIdx++]);
        }
        if (preSegs.length > 0) {
            splits.push({
                title: `${bookName} — Front Matter`,
                segments: preSegs,
                boundary: null,
                fallback: "pre_boundary",
            });
        }
    }

    // Split by boundaries
    for (let b = 0; b < boundaries.length; b++) {
        const boundary = boundaries[b];
        const nextPos = b + 1 < boundaries.length ? boundaries[b + 1].pos : Infinity;
        const childSegs = [];

        while (segIdx < sorted.length && sorted[segIdx].position < nextPos) {
            childSegs.push(sorted[segIdx++]);
        }

        if (childSegs.length > 0) {
            splits.push({
                title: `Kendojidai ${year}-${boundary.month}`,
                segments: childSegs,
                boundary: boundary,
                fallback: null,
            });
        }
    }

    // Remaining segments after last boundary
    if (segIdx < sorted.length) {
        const remaining = sorted.slice(segIdx);
        splits.push({
            title: `${bookName} — Misc ${year}`,
            segments: remaining,
            boundary: null,
            fallback: "post_boundary",
        });
    }

    // Merge tiny splits (< 20 segments) into neighbors or flag as quality issue
    // But first, compute actual quality
    return splits;
}

// ── Group B detectors — per-book patterns ──────────────────────────

/**
 * Pattern: 第N章/Chapter N/n章 — numbered chapters.
 * Handles Arabic numerals, kanji numerals, and mixed forms.
 * Requires the match to be at/near the START of the segment (heading, not mid-text).
 * EXCLUDES 回 (competition/occurrence counters, not chapters).
 */
const CHAPTER_PATTERN_STRICT = /^[\s※■□◆◇●○△▲▽▼☆★\u3000]*第[\d一二三四五六七八九十百千]+[章節話課編部篇][\s　]/;
const CHAPTER_PATTERN_LOOSE = /^[\s※■□◆◇●○△▲▽▼☆★\u3000]*[第\d][\d一二三四五六七八九十百千]*[章節話課編部篇]/;
const CHAPTER_MID_TEXT = /第[\d一二三四五六七八九十百千]+[章節話課編部篇]/;

/**
 * Pattern: numbered headings (e.g., "1. Introduction", "一、はじめに")
 */
const NUMBERED_HEADING = /^\s*[\d一二三四五六七八九十]{1,3}[.、．)\s]+/;

/**
 * Pattern: menu/section numbers like "メニューN", "Menu N"
 */
const MENU_PATTERN = /メニュー\s*\d+/i;

/**
 * Pattern: session/lecture dates (e.g. "十一月五日(日) 妙義道場にて")
 */
const DATE_SESSION_PATTERN = /[一二三四五六七八九十\d]+月[一二三四五六七八九十\d]+日/;

/**
 * Detect chapter boundaries for a topic book.
 * Returns array of {pos, title, pattern}.
 * Multiple detectors are tried; the one producing the most reasonable
 * number of splits (3-50) wins. If no detector produces reasonable
 * splits, returns empty array (→ single-article fallback).
 */
/**
 * Per-book detector override — for books where we KNOW the correct pattern.
 * Key = book name, value = forced detector name. null = force single-article.
 *
 * HONEST ASSESSMENT (post-analysis):
 * Only a few topic books have reliable segment-level chapter boundaries.
 * Most books have chapter markers that appear as running page headers
 * in every few segments, creating garbage splits when used as boundaries.
 * We force single-article for everything except the verified few.
 */
const BOOK_DETECTOR_OVERRIDES = {
    // ONLY these books have verified reliable chapter boundaries:
    "Ki Breathing Method":                  "chapter_numbered",  // 第5章, 第6章, etc. — verified clean
    "Kendo Reiho and Saho":                 "chapter_numbered",  // 第三章, etc. — verified clean

    // Everything else: force single-article.
    // (chapter markers appear as page headers / mid-text mentions,
    //  making segment-level auto-detection unreliable for these books)
    "Kendo Friendly Conversations":         null,
    "Men Kendo":                            null,
    "Fudochi Shinmyoroku":                  null,
    "Kendo Mental Strengthening Methods":   null,
    "Kendo Mental Strengthening (Alt Ed)":  null,
    "Sword and the Way":                    null,
    "My Kendo Life":                        null,
    "Kendo Lecture — New Edition":          null,
    "Sankaku-ku and Tanden Datotsu":        null,
    "A Record of 100 Training Sessions":    null,
    "Kokyu: Ki Cultivation":                null,
    "Kendo is Basics!":                     null,
    "Detailed Explanation of Sword Princ.": null,
    "Kendo Practice Menu 200":              null,
};

function detectTopicBookChapters(segments, bookName) {
    // Check per-book override first
    const override = BOOK_DETECTOR_OVERRIDES[bookName];
    if (override !== undefined) {
        if (override === null) return null; // Force single-article

        const detectorMap = {
            "chapter_numbered": detectChapterNumbered,
            "menu_numbered": detectMenuNumbered,
            "numbered_heading": detectNumberedHeading,
            "date_session": detectDateSessions,
        };
        const detectorFn = detectorMap[override];
        if (!detectorFn) return null;

        const sorted = [...segments].sort((a, b) => a.position - b.position);
        const boundaries = detectorFn(sorted, bookName);
        if (!boundaries || boundaries.length === 0) return null;
        return { boundaries, detector: override + " (forced)", score: 100 };
    }

    // Sort by position
    const sorted = [...segments].sort((a, b) => a.position - b.position);

    // Try detectors in order of reliability (most reliable first).
    // We do NOT use the heading_keywords detector — it produces too many
    // false positives from normal text usage of words like まとめ/はじめに.
    const detectors = [
        { name: "chapter_numbered", detect: detectChapterNumbered },
        { name: "menu_numbered",    detect: detectMenuNumbered },
        { name: "numbered_heading", detect: detectNumberedHeading },
        { name: "date_session",     detect: detectDateSessions },
    ];

    let bestResult = null;
    let bestScore = -1;

    for (const det of detectors) {
        const boundaries = det.detect(sorted, bookName);
        if (!boundaries || boundaries.length === 0) continue;

        // Score: prefer 3–50 splits; penalize extremes
        const count = boundaries.length;
        let score;
        if (count < 3) score = count * 0.5;
        else if (count <= 30) score = 100 - Math.abs(15 - count) * 2;
        else if (count <= 50) score = 70 - (count - 30) * 1.5;
        else score = Math.max(0, 40 - (count - 50) * 3);

        // Penalty for boundary density (avg segments per child too small = bad)
        const maxPos = sorted[sorted.length - 1]?.position || 0;
        const coverage = maxPos > 0 ? (boundaries[boundaries.length - 1].pos - boundaries[0].pos) / maxPos : 0;
        if (coverage < 0.2) score *= 0.5;

        if (score > bestScore) {
            bestScore = score;
            bestResult = { boundaries, detector: det.name, score };
        }
    }

    return bestResult;
}

function detectChapterNumbered(segments) {
    const boundaries = [];
    const seenChapters = new Set(); // Dedup by chapter NUMBER, not text

    function extractChapterNum(text) {
        const m = text.match(/第([\d一二三四五六七八九十百千]+)[章節話課編部篇]/);
        return m ? m[1] : null;
    }

    for (const seg of segments) {
        const text = (seg.source_text || "").trim();
        // Only accept chapter patterns at the START of the segment
        const mStrict = text.match(CHAPTER_PATTERN_STRICT);
        const mLoose = text.match(CHAPTER_PATTERN_LOOSE);

        if (mStrict || mLoose) {
            // Skip if this looks like a mid-text reference (long text)
            if (text.length > 60) continue;

            const chapterNum = extractChapterNum(text);
            if (chapterNum && !seenChapters.has(chapterNum)) {
                seenChapters.add(chapterNum);
                boundaries.push({
                    pos: seg.position,
                    title: text.substring(0, 80),
                    pattern: "chapter_numbered",
                    segId: seg.id
                });
            }
        }
    }
    return boundaries;
}

function detectNumberedHeading(segments) {
    const boundaries = [];
    const seen = new Set();
    for (const seg of segments) {
        const text = (seg.source_text || "").trim();
        // Only trigger if the segment is short (likely a heading, not body text)
        if (text.length > 3 && text.length < 40 && NUMBERED_HEADING.test(text)) {
            const key = text.substring(0, 20);
            if (!seen.has(key)) {
                seen.add(key);
                boundaries.push({ pos: seg.position, title: text.substring(0, 80), pattern: "numbered_heading", segId: seg.id });
            }
        }
    }
    return boundaries;
}

function detectDateSessions(segments) {
    const boundaries = [];
    for (const seg of segments) {
        const text = (seg.source_text || "").trim();
        if (text.length > 10 && text.length < 80 && DATE_SESSION_PATTERN.test(text)) {
            boundaries.push({ pos: seg.position, title: text.substring(0, 80), pattern: "date_session", segId: seg.id });
        }
    }
    return boundaries;
}

function detectMenuNumbered(segments) {
    const boundaries = [];
    for (const seg of segments) {
        const text = (seg.source_text || "").trim();
        if (MENU_PATTERN.test(text)) {
            boundaries.push({ pos: seg.position, title: text.substring(0, 80), pattern: "menu_numbered", segId: seg.id });
        }
    }
    return boundaries;
}

// NOTE: heading_keywords detector REMOVED — words like まとめ/はじめに/結論
// appear far too frequently in normal body text, producing garbage splits.
// Books that need keyword-based splitting should use per-book overrides
// in BOOK_DETECTOR_OVERRIDES above.

/**
 * Build child article splits from topic book boundaries.
 */
function buildTopicSplits(allSegments, boundaries, bookName) {
    const sorted = [...allSegments].sort((a, b) => a.position - b.position);

    if (!boundaries || boundaries.length === 0) {
        return [{ title: bookName, segments: sorted, fallback: "no_boundaries" }];
    }

    const splits = [];
    let segIdx = 0;
    let chapterNum = 0;

    // Pre-boundary segments
    if (boundaries[0].pos > sorted[0]?.position) {
        const preSegs = [];
        while (segIdx < sorted.length && sorted[segIdx].position < boundaries[0].pos) {
            preSegs.push(sorted[segIdx++]);
        }
        if (preSegs.length > 0) {
            chapterNum++;
            splits.push({
                title: `${bookName} — Front Matter`,
                segments: preSegs,
                boundary: null,
                fallback: "pre_boundary",
            });
        }
    }

    // Per-boundary splits
    for (let b = 0; b < boundaries.length; b++) {
        const boundary = boundaries[b];
        const nextPos = b + 1 < boundaries.length ? boundaries[b + 1].pos : Infinity;
        const childSegs = [];

        while (segIdx < sorted.length && sorted[segIdx].position < nextPos) {
            childSegs.push(sorted[segIdx++]);
        }

        if (childSegs.length > 0) {
            chapterNum++;
            // Use detected title or fallback
            const titleText = boundary.title || `Chapter ${chapterNum}`;
            splits.push({
                title: `${bookName} — ${titleText}`.substring(0, 200),
                segments: childSegs,
                boundary: boundary,
                fallback: null,
            });
        }
    }

    // Post-boundary
    if (segIdx < sorted.length) {
        const remaining = sorted.slice(segIdx);
        splits.push({
            title: `${bookName} — Remaining`,
            segments: remaining,
            boundary: null,
            fallback: "post_boundary",
        });
    }

    return splits;
}

// ── Quality checks ─────────────────────────────────────────────────

/**
 * Determine if a set of splits is acceptable quality.
 * Returns {acceptable, reason, metrics}.
 */
function evaluateSplitQuality(splits, totalSegments) {
    if (splits.length === 0) {
        return { acceptable: false, reason: "No splits generated", metrics: {} };
    }

    // Single-article fallback is acceptable (not an error, just no split)
    if (splits.length === 1 && splits[0].fallback === "no_boundaries") {
        return { acceptable: true, reason: "No boundaries detected — single article", metrics: { childCount: 1 } };
    }

    const segCounts = splits.map(s => s.segments.length);
    const minSegs = Math.min(...segCounts);
    const maxSegs = Math.max(...segCounts);
    const avgSegs = totalSegments / splits.length;
    const tinyCount = segCounts.filter(c => c < 5).length;
    const hugeCount = segCounts.filter(c => c > avgSegs * 5).length;

    // Reject if more than 20% of children have < 5 segments
    if (tinyCount > splits.length * 0.2) {
        return {
            acceptable: false,
            reason: `Too many tiny children (${tinyCount}/${splits.length} have <5 segments) — garbage split`,
            metrics: { childCount: splits.length, minSegs, maxSegs, avgSegs: avgSegs.toFixed(0), tinyCount, hugeCount },
        };
    }

    // Warn if > 50 children (might be too granular)
    if (splits.length > 50 && avgSegs < 50) {
        return {
            acceptable: false,
            reason: `Too many children (${splits.length}) with low avg segments (${avgSegs.toFixed(0)}) — likely garbage`,
            metrics: { childCount: splits.length, minSegs, maxSegs, avgSegs: avgSegs.toFixed(0), tinyCount, hugeCount },
        };
    }

    return {
        acceptable: true,
        reason: null,
        metrics: { childCount: splits.length, minSegs, maxSegs, avgSegs: avgSegs.toFixed(0), tinyCount, hugeCount },
    };
}

// ── Main processing pipeline ───────────────────────────────────────

/**
 * Stream-parse the backup to collect segments for target books.
 * Returns: Map<articleId, {name, year, group, segments[]}>
 */
async function collectSegmentsFromBackup(backupPath, targetIds) {
    const targetSet = new Set(targetIds);
    const result = new Map();

    const rl = readline.createInterface({
        input: fs.createReadStream(backupPath, { encoding: "utf-8" }),
        crlfDelay: Infinity,
    });

    const COPY_PATTERN = /^COPY\s+public\.segments\s+\((.+)\)\s+FROM\s+stdin;$/;
    let inCopy = false;
    let fields = [];
    let totalSegments = 0;

    for await (const line of rl) {
        if (!inCopy) {
            const m = line.match(COPY_PATTERN);
            if (m) {
                inCopy = true;
                fields = m[1].split(",").map(s => s.trim().replace(/^"/, "").replace(/"$/, ""));
                continue;
            }
            // Also check for articles COPY block to skip faster
            if (line.startsWith("COPY public.") && !line.includes("segments")) continue;
            continue;
        }
        if (line === "\\.") break;

        totalSegments++;
        const row = parseCopyLine(line, fields);
        const articleId = row.article_id;
        if (!targetSet.has(articleId)) continue;

        if (!result.has(articleId)) {
            result.set(articleId, []);
        }
        result.get(articleId).push({
            id: row.id,
            position: parseInt(row.position, 10) || 0,
            source_text: row.source_text || "",
            target_text: row.target_text || "",
            source_lang: row.source_lang || "",
            target_lang: row.target_lang || "",
            status: row.status || "draft",
            quality_detail: row.quality_detail,
            metadata: row.metadata,
            ruby_data: row.ruby_data,
            auto_accept_eligible: row.auto_accept_eligible,
            // Keep original article_id for re-keying later
            _original_article_id: articleId,
        });
    }
    rl.close();

    return { result, totalSegments };
}

/**
 * Generate UUID v4 for child articles (deterministic from bookId + index).
 */
function generateChildId(bookId, index, label) {
    const hash = crypto.createHash("md5").update(`${bookId}:${index}:${label}`).digest("hex");
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

/**
 * Generate UUID v4 for child segments (deterministic from original segId + new articleId).
 */
function generateChildSegId(originalSegId, childArticleId) {
    const hash = crypto.createHash("md5").update(`${originalSegId}:rekey:${childArticleId}`).digest("hex");
    return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

// ── Report generation ──────────────────────────────────────────────

function generateReport(perBookResults) {
    const lines = [];
    const sep = "=".repeat(72);

    lines.push(sep);
    lines.push("BOOK SEGMENT SPLIT REPORT");
    lines.push(sep);
    lines.push("");

    let totalBooks = 0;
    let totalSegmentsIn = 0;
    let totalSegmentsOut = 0;
    let totalChildren = 0;
    let booksFallback = 0;
    let booksSplit = 0;
    let groupABooks = 0, groupATotal = 0, groupAChildren = 0, groupAFallback = 0;
    let groupBBooks = 0, groupBTotal = 0, groupBChildren = 0, groupBFallback = 0;

    // Group A first
    lines.push("── Group A: Kendojidai Year-Compilation Books ──");
    lines.push("");
    for (const [name, result] of Object.entries(perBookResults)) {
        const book = TARGET_BOOKS[name];
        if (!book || book.group !== "A") continue;
        groupABooks++;
        const segCount = result.originalSegmentCount;
        groupATotal += segCount;
        totalSegmentsIn += segCount;
        totalBooks++;

        const acceptable = result.quality?.acceptable !== false;
        const childCount = result.splits?.length || 1;
        totalChildren += childCount;
        groupAChildren += childCount;

        const segsOut = result.splits ? result.splits.reduce((s, c) => s + c.segments.length, 0) : segCount;
        totalSegmentsOut += segsOut;

        if (result.fallback) groupAFallback++;
        if (!result.fallback && childCount > 1) booksSplit++;

        lines.push(`  ${acceptable ? "✓" : "✗"} ${name}`);
        lines.push(`    Segments: ${segCount.toLocaleString()} → ${childCount} children (${segsOut.toLocaleString()} out)`);
        if (result.fallback) {
            lines.push(`    ⚠ FALLBACK: ${result.fallbackReason}`);
        } else {
            lines.push(`    Issues detected: ${result.issueCount || 0}`);
        }
        if (result.quality?.metrics) {
            const m = result.quality.metrics;
            lines.push(`    Quality: min=${m.minSegs} max=${m.maxSegs} avg=${m.avgSegs} tiny=${m.tinyCount}`);
        }
        if (!acceptable) {
            lines.push(`    REJECTED: ${result.quality?.reason}`);
            booksFallback++;
        }
        lines.push("");
    }

    // Group B
    lines.push("── Group B: Topic-Compilation Books ──");
    lines.push("");
    for (const [name, result] of Object.entries(perBookResults)) {
        const book = TARGET_BOOKS[name];
        if (!book || book.group !== "B") continue;
        groupBBooks++;
        const segCount = result.originalSegmentCount;
        groupBTotal += segCount;
        totalSegmentsIn += segCount;
        totalBooks++;

        const acceptable = result.quality?.acceptable !== false;
        const childCount = result.splits?.length || 1;
        totalChildren += childCount;
        groupBChildren += childCount;

        const segsOut = result.splits ? result.splits.reduce((s, c) => s + c.segments.length, 0) : segCount;
        totalSegmentsOut += segsOut;

        if (result.fallback) groupBFallback++;
        if (!result.fallback && childCount > 1) booksSplit++;

        lines.push(`  ${acceptable ? "✓" : "✗"} ${name}`);
        lines.push(`    Segments: ${segCount.toLocaleString()} → ${childCount} children (${segsOut.toLocaleString()} out)`);
        if (result.fallback) {
            lines.push(`    ⚠ FALLBACK: ${result.fallbackReason}`);
        } else if (result.detector) {
            lines.push(`    Detector: ${result.detector}, boundaries: ${result.boundaryCount || 0}`);
        }
        if (result.quality?.metrics) {
            const m = result.quality.metrics;
            lines.push(`    Quality: min=${m.minSegs} max=${m.maxSegs} avg=${m.avgSegs} tiny=${m.tinyCount}`);
        }
        if (!acceptable) {
            lines.push(`    REJECTED: ${result.quality?.reason}`);
        }
        lines.push("");
    }

    // Summary
    lines.push("── Summary ──");
    lines.push(`  Total books processed:             ${totalBooks}`);
    lines.push(`    Group A (kendojidai):            ${groupABooks}`);
    lines.push(`    Group B (topic-compilation):     ${groupBBooks}`);
    lines.push(`  Books successfully split:          ${booksSplit}`);
    lines.push(`  Books kept as single-article:      ${booksFallback}`);
    lines.push(`  Total child articles created:      ${totalChildren}`);
    lines.push(`  Total segments in:                 ${totalSegmentsIn.toLocaleString()}`);
    lines.push(`  Total segments out:                ${totalSegmentsOut.toLocaleString()}`);
    lines.push(`  Segment reconciliation:            ${totalSegmentsIn === totalSegmentsOut ? "✓ ZERO LOSS" : "✗ MISMATCH — DIFF: " + Math.abs(totalSegmentsIn - totalSegmentsOut)}`);
    lines.push(`    Group A segments:                ${groupATotal.toLocaleString()}`);
    lines.push(`    Group B segments:                ${groupBTotal.toLocaleString()}`);
    lines.push("");
    lines.push(sep);

    return lines.join("\n");
}

// ── Main ───────────────────────────────────────────────────────────

async function runAnalyze(args) {
    console.log("=== Book Segment Split — Analysis Mode ===\n");

    const targetIds = [];
    const targetBookNames = [];

    for (const [name, book] of Object.entries(TARGET_BOOKS)) {
        if (args.bookId && book.id !== args.bookId) continue;
        if (args.group === "A" && book.group !== "A") continue;
        if (args.group === "B" && book.group !== "B") continue;
        targetIds.push(book.id);
        targetBookNames.push(name);
    }

    if (targetIds.length === 0) {
        console.error("ERROR: No books matched filter. Check --group or --book-id.");
        process.exit(1);
    }

    console.log(`Target: ${targetIds.length} books from ${args.group === "all" ? "Groups A+B" : "Group " + args.group}`);
    if (args.bookId) console.log(`Single book mode: ${targetBookNames[0]}`);
    console.log("");

    // Phase 1: Collect segments from backup
    console.log("Phase 1: Streaming segments from backup...");
    const { result: bookSegments, totalSegments } = await collectSegmentsFromBackup(args.backupPath, targetIds);
    console.log(`  Parsed ${totalSegments.toLocaleString()} total segments from backup`);
    console.log(`  Matched ${targetIds.length} books`);
    console.log("");

    // Phase 2: Detect boundaries per book
    console.log("Phase 2: Boundary detection...\n");
    const perBookResults = {};

    for (const [i, bookName] of targetBookNames.entries()) {
        const book = TARGET_BOOKS[bookName];
        const segments = bookSegments.get(book.id) || [];
        const segCount = segments.length;

        let splits, fallbackReason, detector, boundaryCount, issueCount;

        if (book.group === "A") {
            // Group A: Kendojidai issue detection
            const boundaries = detectKendojidaiIssues(segments, book.year);
            issueCount = boundaries.length;

            if (boundaries.length === 0) {
                fallbackReason = "No issue markers found — keeping as single article";
                splits = [{ title: bookName, segments, fallback: "no_boundaries" }];
            } else {
                splits = buildKendojidaiSplits(segments, boundaries, bookName, book.year);
                boundaryCount = boundaries.length;
            }

        } else {
            // Group B: Topic book chapter detection
            const detection = detectTopicBookChapters(segments, bookName);

            if (!detection || detection.boundaries.length === 0) {
                fallbackReason = "No reliable chapter boundaries detected";
                splits = [{ title: bookName, segments, fallback: "no_boundaries" }];
            } else {
                detector = detection.detector;
                boundaryCount = detection.boundaries.length;
                splits = buildTopicSplits(segments, detection.boundaries, bookName);
            }
        }

        // Quality evaluation
        const quality = evaluateSplitQuality(splits, segCount);
        if (!quality.acceptable && !fallbackReason) {
            // Quality rejected → fall back to single article
            fallbackReason = quality.reason;
            splits = [{ title: bookName, segments, fallback: "quality_rejected" }];
        }

        const segsOut = splits.reduce((s, c) => s + c.segments.length, 0);

        perBookResults[bookName] = {
            originalSegmentCount: segCount,
            segmentsOut: segsOut,
            splits,
            fallback: !!fallbackReason,
            fallbackReason,
            quality,
            detector,
            boundaryCount,
            issueCount,
            match: segCount === segsOut,
        };

        const status = fallbackReason ? "⚠ FALLBACK" : "✓ SPLIT";
        console.log(`  ${i + 1}/${targetIds.length} [${status}] ${bookName}: ${segCount.toLocaleString()} segs → ${splits.length} children`);
    }

    // Phase 3: Report
    console.log("\nPhase 3: Generating report...\n");
    const report = generateReport(perBookResults);
    console.log(report);

    // Write JSON report if requested (trimmed — don't serialize raw segments)
    if (args.reportFile) {
        const jsonReport = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalBooks: 0, totalSegmentsIn: 0, totalSegmentsOut: 0,
                totalChildren: 0, booksSplit: 0, booksFallback: 0,
            },
            books: {},
        };
        for (const [name, result] of Object.entries(perBookResults)) {
            const children = (result.splits || []).map((s, i) => ({
                index: i,
                title: s.title,
                segmentCount: s.segments.length,
                fallback: s.fallback || null,
            }));
            jsonReport.books[name] = {
                originalSegmentCount: result.originalSegmentCount,
                segmentsOut: result.segmentsOut,
                childCount: children.length,
                fallback: !!result.fallbackReason,
                fallbackReason: result.fallbackReason || null,
                detector: result.detector || null,
                boundaryCount: result.boundaryCount || 0,
                issueCount: result.issueCount || 0,
                quality: result.quality?.metrics || null,
                children,
            };
            jsonReport.summary.totalBooks++;
            jsonReport.summary.totalSegmentsIn += result.originalSegmentCount;
            jsonReport.summary.totalSegmentsOut += result.segmentsOut;
            jsonReport.summary.totalChildren += children.length;
            if (result.fallback) jsonReport.summary.booksFallback++;
            else if (children.length > 1) jsonReport.summary.booksSplit++;
        }
        fs.writeFileSync(args.reportFile, JSON.stringify(jsonReport, null, 2));
        console.log(`JSON report written to ${args.reportFile}`);
    }

    // Verification
    let totalIn = 0, totalOut = 0;
    for (const result of Object.values(perBookResults)) {
        totalIn += result.originalSegmentCount;
        totalOut += result.segmentsOut;
    }
    console.log(`\nFINAL VERIFICATION: ${totalIn.toLocaleString()} in, ${totalOut.toLocaleString()} out → ${totalIn === totalOut ? "ZERO LOSS ✓" : "MISMATCH ✗"}`);

    return perBookResults;
}

async function runApply(args) {
    console.log("=== Book Segment Split — Apply Mode ===\n");

    if (!args.pbUrl || !args.pbEmail || !args.pbPassword) {
        console.error("ERROR: --pb-url, --pb-email, --pb-password required for --apply.");
        process.exit(1);
    }

    let PocketBase;
    try { PocketBase = require("pocketbase/cjs"); } catch { PocketBase = require("pocketbase"); }

    const pb = new PocketBase(args.pbUrl);

    try {
        await pb.collection("_superusers").authWithPassword(args.pbEmail, args.pbPassword);
        console.log(`Authenticated to PocketBase at ${args.pbUrl}`);
    } catch (e) {
        console.error(`Auth failed: ${e.message}`);
        process.exit(1);
    }

    // Step 1: Fetch target book article records
    console.log("\nFetching target book records...");
    const bookRecords = {};
    for (const [name, book] of Object.entries(TARGET_BOOKS)) {
        if (args.group === "A" && book.group !== "A") continue;
        if (args.group === "B" && book.group !== "B") continue;
        if (args.bookId && book.id !== args.bookId) continue;

        try {
            const record = await pb.collection("articles").getOne(book.id);
            bookRecords[name] = { ...book, record };
        } catch (e) {
            console.error(`  Book "${name}" (${book.id}) not found in PocketBase: ${e.message}`);
        }
    }

    // Step 2: Fetch segments for each book
    console.log(`\nFetching segments for ${Object.keys(bookRecords).length} books...`);
    const bookSegmentsMap = new Map();

    for (const [name, book] of Object.entries(bookRecords)) {
        const allSegments = [];
        let page = 1;
        const perPage = 500;

        while (true) {
            const result = await pb.collection("segments").getList(page, perPage, {
                filter: `article = "${book.id}"`,
                sort: "position",
            });
            for (const item of result.items) {
                allSegments.push({
                    id: item.id,
                    position: item.position,
                    source_text: item.source_text || "",
                    target_text: item.target_text || "",
                    source_lang: item.source_lang || "",
                    target_lang: item.target_lang || "",
                    status: item.status || "draft",
                });
            }
            if (page * perPage >= result.totalItems) break;
            page++;
        }
        bookSegmentsMap.set(name, allSegments);
        console.log(`  ${name}: ${allSegments.length.toLocaleString()} segments`);
    }

    // Step 3: Detect boundaries and build splits
    console.log("\nDetecting boundaries...");
    const perBookResults = {};

    for (const [bookName, book] of Object.entries(bookRecords)) {
        const segments = bookSegmentsMap.get(bookName) || [];
        let splits;

        if (book.group === "A") {
            const boundaries = detectKendojidaiIssues(segments, book.year);
            splits = buildKendojidaiSplits(segments, boundaries, bookName, book.year);
        } else {
            const detection = detectTopicBookChapters(segments, bookName);
            if (!detection) {
                splits = [{ title: bookName, segments, fallback: "no_boundaries" }];
            } else {
                splits = buildTopicSplits(segments, detection.boundaries, bookName);
            }
        }

        const quality = evaluateSplitQuality(splits, segments.length);
        if (!quality.acceptable) {
            splits = [{ title: bookName, segments, fallback: "quality_rejected" }];
        }

        perBookResults[bookName] = { book, splits, quality };
        console.log(`  ${bookName}: ${splits.length} children`);
    }

    // Step 4: Look up existing book records (from derive_book_hierarchy.js output)
    console.log("\nLooking up book records...");
    const bookIdMap = new Map();
    try {
        const allBooks = await pb.collection("books").getFullList({});
        for (const b of allBooks) {
            bookIdMap.set(b.title, b.id);
            // Also index by source_book_id
            if (b.source_book_id) bookIdMap.set(`source:${b.source_book_id}`, b.id);
        }
        console.log(`  Found ${allBooks.length} book records`);
    } catch (e) {
        console.error(`  Error fetching books: ${e.message}`);
        console.error(`  Make sure derive_book_hierarchy.js --apply has been run first.`);
        process.exit(1);
    }

    // Step 5: Create child articles and reassign segments
    if (args.dryRun) {
        console.log("\nDRY RUN — would create the following:\n");
        for (const [bookName, result] of Object.entries(perBookResults)) {
            console.log(`  ${bookName}: ${result.splits.length} children, ${result.splits.reduce((s, c) => s + c.segments.length, 0)} segments`);
        }
        return;
    }

    console.log("\nCreating child articles and reassigning segments...");
    const stats = { created: 0, segmentsReassigned: 0, errors: 0 };

    for (const [bookName, result] of Object.entries(perBookResults)) {
        const bookRecordKey = `source:${result.book.id}`;
        let parentBookId = bookIdMap.get(bookName) || bookIdMap.get(bookRecordKey);

        if (!parentBookId) {
            console.error(`  ✗ ${bookName}: Could not find parent book record`);
            stats.errors++;
            continue;
        }

        for (let i = 0; i < result.splits.length; i++) {
            const child = result.splits[i];
            const childId = generateChildId(result.book.id, i, child.title);

            try {
                // Create child article
                await pb.collection("articles").create({
                    id: childId,
                    title: child.title,
                    title_ja: child.title,
                    doc_type: "article",
                    translation_status: "pending",
                    segmented: true,
                    segment_count: child.segments.length,
                    book: parentBookId,
                });
                stats.created++;

                // Reassign segments (update article field)
                for (const seg of child.segments) {
                    try {
                        await pb.collection("segments").update(seg.id, {
                            article: childId,
                        });
                        stats.segmentsReassigned++;
                    } catch (segErr) {
                        if (stats.errors < 5) console.error(`    Segment update error: ${segErr.message}`);
                        stats.errors++;
                    }
                }
            } catch (createErr) {
                console.error(`  ✗ ${bookName}/${child.title}: ${createErr.message}`);
                stats.errors++;
            }
        }
    }

    console.log(`\nApply complete:`);
    console.log(`  Child articles created: ${stats.created}`);
    console.log(`  Segments reassigned:    ${stats.segmentsReassigned.toLocaleString()}`);
    console.log(`  Errors:                 ${stats.errors}`);
}

// ── Entry point ────────────────────────────────────────────────────

async function main() {
    const args = parseArgs();

    if (args.apply) {
        await runApply(args);
    } else {
        if (!args.backupPath) {
            console.error("ERROR: --backup required for analyze-only mode.");
            process.exit(1);
        }
        await runAnalyze(args);
    }
}

main().catch(err => {
    console.error("FATAL:", err.message);
    console.error(err.stack);
    process.exit(1);
});
