#!/usr/bin/env node
/**
 * scan_kr_vn_corruption.js — WU-1
 *
 * READ-ONLY diagnostic scanner. Makes ZERO writes to PocketBase.
 *
 * PURPOSE
 * -------
 * The KR/VN import scripts contain a language-column shift defect:
 *
 *     if (lines.length >= 3) {
 *       pageBlocks.push({ ja: lines[0], vn: lines[1], ko: lines[2] });
 *     }
 *
 * The guard admits blocks of 3 OR MORE lines, but the indexing is fixed at
 * [0][1][2]. Any source block with 4+ lines (e.g. a JA sentence followed by a
 * JA photo caption, then VN, then KO) shifts every field by one slot:
 *
 *     ja <- JA sentence      (correct)
 *     vn <- JA photo caption (WRONG - Japanese in a vi row)
 *     ko <- VN text          (WRONG - Vietnamese in a ko row)
 *     (real KO at lines[3] is silently discarded)
 *
 * This scanner classifies every ko/vi segment by Unicode script and reports
 * exactly which rows are corrupt, grouped by article, so a targeted re-import
 * (WU-3) can fix only the affected pages.
 *
 * USAGE
 * -----
 *   node migration/pocketbase/scripts/scan_kr_vn_corruption.js \
 *     --pb-url https://your-pocketbase.example.com \
 *     --pb-email "$PB_EMAIL" \
 *     --pb-password "$PB_PASSWORD" \
 *     --report-file migration/pocketbase/scripts/corruption_report.json
 *
 * Credentials may also come from the PB_EMAIL / PB_PASSWORD environment
 * variables instead of CLI flags (preferred - avoids shell history leakage).
 *
 * Optional flags:
 *   --lang ko|vi|both   which target_lang to scan (default: both)
 *   --limit N           stop after N rows per language (debug aid)
 *   --verbose           print every corrupt row as it is found
 */

const PocketBase = require("pocketbase").default || require("pocketbase");
const fs = require("fs");
const path = require("path");

// ── CLI parsing ────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    pbUrl: null,
    pbEmail: process.env.PB_EMAIL || null,
    pbPassword: process.env.PB_PASSWORD || null,
    reportFile: path.join(__dirname, "corruption_report.json"),
    lang: "both",
    limit: 0,
    verbose: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pb-url") args.pbUrl = argv[++i];
    else if (a === "--pb-email") args.pbEmail = argv[++i];
    else if (a === "--pb-password") args.pbPassword = argv[++i];
    else if (a === "--report-file") args.reportFile = argv[++i];
    else if (a === "--lang") args.lang = argv[++i];
    else if (a === "--limit") args.limit = parseInt(argv[++i], 10) || 0;
    else if (a === "--verbose") args.verbose = true;
    else if (a === "--help" || a === "-h") {
      console.log(fs.readFileSync(__filename, "utf8").split("*/")[0]);
      process.exit(0);
    }
  }
  return args;
}

// ── Unicode script detection ───────────────────────────────────────────────

// Hangul syllables, Jamo, and compatibility Jamo.
const RE_HANGUL = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;

// Hiragana + Katakana. (Deliberately NOT including CJK ideographs on their own:
// Korean and Vietnamese texts can legitimately quote kanji/hanja terms, but
// kana is unambiguously Japanese.)
const RE_KANA = /[\u3040-\u309F\u30A0-\u30FF]/;

// CJK ideographs - used only as a weak secondary signal.
const RE_CJK = /[\u4E00-\u9FFF]/;

// Characters that appear in Vietnamese but not in Korean or Japanese text.
// Covers the Vietnamese-specific precomposed Latin letters plus the base
// letters unique to the Vietnamese alphabet.
const RE_VIET = new RegExp(
  "[" +
    "\u0103\u0102" + // ă Ă
    "\u00E2\u00C2" + // â Â
    "\u0111\u0110" + // đ Đ
    "\u00EA\u00CA" + // ê Ê
    "\u00F4\u00D4" + // ô Ô
    "\u01A1\u01A0" + // ơ Ơ
    "\u01B0\u01AF" + // ư Ư
    "\u1EA0-\u1EF9" + // full Latin Extended Additional Vietnamese block
    "\u00E0\u00E1\u00E3\u00E8\u00E9\u00EC\u00ED\u00F2\u00F3\u00F5\u00F9\u00FA\u00FD" +
    "\u00C0\u00C1\u00C3\u00C8\u00C9\u00CC\u00CD\u00D2\u00D3\u00D5\u00D9\u00DA\u00DD" +
    "]"
);

// Combining diacritics used by decomposed Vietnamese.
const RE_COMBINING = /[\u0300\u0301\u0303\u0309\u0323]/;

/**
 * Count characters per script. Presence alone is NOT a reliable signal in this
 * corpus: translations routinely embed inline glosses such as
 *   "*ashi-sabaki* (足捌き — bộ pháp)"
 * where a Vietnamese sentence legitimately contains kana and kanji. We therefore
 * classify by PROPORTION, not presence.
 */
function scriptCounts(text) {
  let hangul = 0,
    kana = 0,
    viet = 0,
    cjk = 0,
    latin = 0;
  for (const ch of text) {
    if (RE_HANGUL.test(ch)) hangul++;
    else if (RE_KANA.test(ch)) kana++;
    else if (RE_VIET.test(ch) || RE_COMBINING.test(ch)) viet++;
    else if (RE_CJK.test(ch)) cjk++;
    else if (/[A-Za-z]/.test(ch)) latin++;
  }
  return { hangul, kana, viet, cjk, latin, total: hangul + kana + viet + cjk + latin };
}

/**
 * Classify a piece of text into a dominant script bucket using proportions.
 * Returns one of: "hangul" | "vietnamese" | "japanese" | "cjk" | "latin" | "empty"
 */
function classifyScript(text) {
  if (!text || !text.trim()) return "empty";
  const c = scriptCounts(text);
  if (c.total === 0) return "empty";

  // Hangul present in any meaningful quantity is decisive: no other language in
  // this corpus writes in Hangul, and a gloss is at most a few characters.
  if (c.hangul > 0 && c.hangul / c.total >= 0.15) return "hangul";

  // Vietnamese-specific diacritics carry the same weight for Vietnamese.
  if (c.viet > 0 && c.viet / c.total >= 0.05) return "vietnamese";

  // Kana-dominant with no Hangul and negligible Vietnamese => Japanese.
  if (c.kana > 0 && (c.kana + c.cjk) / c.total >= 0.5) return "japanese";

  if (c.cjk / c.total >= 0.5) return "cjk";
  if (c.hangul > 0) return "hangul_trace";
  if (c.viet > 0) return "vietnamese_trace";
  return "latin";
}

/**
 * Decide whether a row is corrupt given its declared target_lang.
 * Returns { severity, reason } or null when the row looks correct.
 *
 * severity:
 *   "corrupt" - high confidence the row holds the wrong language
 *   "suspect" - ambiguous; e.g. a romanized proper name with no script markers
 */
function detectCorruption(targetLang, text) {
  const script = classifyScript(text);
  if (script === "empty") return null; // empty rows are a separate concern

  const c = scriptCounts(text);

  if (targetLang === "ko") {
    if (script === "hangul" || script === "hangul_trace") return null; // correct
    // No Hangul at all, but clear Vietnamese => the column-shift signature.
    if (script === "vietnamese" || script === "vietnamese_trace")
      return { severity: "corrupt", reason: "ko_row_contains_vietnamese" };
    if (script === "japanese")
      return { severity: "corrupt", reason: "ko_row_contains_japanese" };
    if (script === "cjk") return { severity: "corrupt", reason: "ko_row_contains_cjk_only" };
    // Pure latin, no Hangul: could be a legitimate romanized proper name
    // ("*Kyōshi Nanadan* Kubota Seiichi") rather than corruption.
    return { severity: "suspect", reason: "ko_row_missing_hangul_latin_only" };
  }

  if (targetLang === "vi") {
    // Hangul in a vi row is the inverse column-shift signature.
    if (script === "hangul") return { severity: "corrupt", reason: "vi_row_contains_korean" };
    if (script === "hangul_trace" && c.hangul >= 3)
      return { severity: "suspect", reason: "vi_row_contains_korean_fragment" };
    if (script === "japanese")
      return { severity: "corrupt", reason: "vi_row_contains_japanese" };
    if (script === "cjk") return { severity: "suspect", reason: "vi_row_contains_cjk_only" };
    // Vietnamese and plain-latin are both plausible for a vi row: short
    // sentences may legitimately carry no diacritics at all.
    return null;
  }

  return null;
}

// ── Main scan ──────────────────────────────────────────────────────────────

async function scanLang(pb, targetLang, args) {
  console.log(`\n=== Scanning target_lang='${targetLang}' ===`);

  const corrupt = [];
  const suspect = [];
  const scriptTally = {};
  let scanned = 0;
  let page = 1;
  const perPage = 500;

  for (;;) {
    let result;
    try {
      result = await pb.collection("segments").getList(page, perPage, {
        filter: `target_lang="${targetLang}"`,
        fields: "id,article,position,target_lang,target_text",
        sort: "id",
        $autoCancel: false,
      });
    } catch (err) {
      console.error(`  ! fetch failed on page ${page}: ${err.message}`);
      throw err;
    }

    if (!result.items.length) break;

    for (const row of result.items) {
      scanned++;
      const script = classifyScript(row.target_text);
      scriptTally[script] = (scriptTally[script] || 0) + 1;

      const finding = detectCorruption(targetLang, row.target_text);
      if (finding) {
        const entry = {
          id: row.id,
          article: row.article,
          position: row.position,
          target_lang: row.target_lang,
          severity: finding.severity,
          reason: finding.reason,
          detected_script: script,
          preview: (row.target_text || "").slice(0, 80),
        };
        if (finding.severity === "corrupt") corrupt.push(entry);
        else suspect.push(entry);
        if (args.verbose) {
          console.log(
            `  ${finding.severity.toUpperCase()} ${entry.id} art=${entry.article} pos=${entry.position} ${finding.reason}`
          );
        }
      }
    }

    if (page === 1) {
      console.log(`  total rows for '${targetLang}': ${result.totalItems}`);
    }
    if (page % 40 === 0 || page * perPage >= result.totalItems) {
      console.log(
        `  ...scanned ${scanned}/${result.totalItems} (corrupt: ${corrupt.length}, suspect: ${suspect.length})`
      );
    }

    if (args.limit && scanned >= args.limit) {
      console.log(`  (stopping early at --limit ${args.limit})`);
      break;
    }
    if (page * perPage >= result.totalItems) break;
    page++;
  }

  console.log(`  scanned=${scanned} corrupt=${corrupt.length} suspect=${suspect.length}`);
  console.log(`  script distribution:`, scriptTally);

  return { scanned, corrupt, suspect, scriptTally };
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.pbUrl) {
    console.error("ERROR: --pb-url is required.");
    process.exit(1);
  }
  if (!args.pbEmail || !args.pbPassword) {
    console.error(
      "ERROR: superuser credentials required. Provide --pb-email/--pb-password " +
        "or set PB_EMAIL/PB_PASSWORD environment variables."
    );
    process.exit(1);
  }

  console.log("=".repeat(70));
  console.log("KR/VN CORRUPTION SCANNER (WU-1) - READ-ONLY, ZERO WRITES");
  console.log("=".repeat(70));
  console.log(`PocketBase: ${args.pbUrl}`);
  console.log(`Languages : ${args.lang}`);
  console.log(`Report    : ${args.reportFile}`);

  const pb = new PocketBase(args.pbUrl);
  pb.autoCancellation(false);

  try {
    await pb.collection("_superusers").authWithPassword(args.pbEmail, args.pbPassword);
    console.log("Auth      : superuser OK");
  } catch (e1) {
    try {
      await pb.admins.authWithPassword(args.pbEmail, args.pbPassword);
      console.log("Auth      : admin OK (legacy API)");
    } catch (e2) {
      console.error(`ERROR: authentication failed: ${e2.message}`);
      process.exit(1);
    }
  }

  const langs = args.lang === "both" ? ["ko", "vi"] : [args.lang];
  const report = {
    generated_at: new Date().toISOString(),
    pb_url: args.pbUrl,
    read_only: true,
    writes_executed: 0,
    languages: {},
    by_article: {},
    summary: {},
  };

  let grandCorrupt = 0;
  let grandSuspect = 0;
  let grandScanned = 0;

  for (const lang of langs) {
    const { scanned, corrupt, suspect, scriptTally } = await scanLang(pb, lang, args);
    report.languages[lang] = {
      scanned,
      corrupt_count: corrupt.length,
      suspect_count: suspect.length,
      script_distribution: scriptTally,
      corrupt_rows: corrupt,
      suspect_rows: suspect,
    };
    grandCorrupt += corrupt.length;
    grandSuspect += suspect.length;
    grandScanned += scanned;

    // Only high-confidence corrupt rows drive the re-import target set.
    for (const row of corrupt) {
      if (!report.by_article[row.article]) {
        report.by_article[row.article] = { ko: [], vi: [] };
      }
      report.by_article[row.article][lang].push({
        id: row.id,
        position: row.position,
        reason: row.reason,
      });
    }
  }

  const affectedArticles = Object.keys(report.by_article);
  report.summary = {
    total_scanned: grandScanned,
    total_corrupt: grandCorrupt,
    total_suspect: grandSuspect,
    corrupt_pct: grandScanned ? ((grandCorrupt / grandScanned) * 100).toFixed(4) + "%" : "0%",
    affected_article_count: affectedArticles.length,
  };

  fs.writeFileSync(args.reportFile, JSON.stringify(report, null, 2), "utf8");

  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  for (const lang of langs) {
    const l = report.languages[lang];
    console.log(
      `  ${lang}: scanned=${l.scanned} corrupt=${l.corrupt_count} suspect=${l.suspect_count}`
    );
  }
  console.log(`  TOTAL scanned      : ${grandScanned}`);
  console.log(`  TOTAL corrupt      : ${grandCorrupt} (${report.summary.corrupt_pct})`);
  console.log(`  TOTAL suspect      : ${grandSuspect} (ambiguous, needs review)`);
  console.log(`  Affected articles  : ${affectedArticles.length}`);
  console.log(`  Production writes  : 0 (READ-ONLY)`);
  console.log(`  Report written to  : ${args.reportFile}`);
  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
