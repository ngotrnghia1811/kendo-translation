#!/usr/bin/env node

/**
 * import_glossary.js — KR/VN Glossary & Terminology Collection Importer
 *
 * Creates (if missing) the `glossary` collection in PocketBase and populates it
 * with 382+ trilingual/multilingual entries from `kendo_dict.md`.
 *
 * Schema fields on `glossary`:
 *   - category (text)
 *   - term_ja (text, required)
 *   - reading (text)
 *   - notes_ja (text)
 *   - term_en (text)
 *   - notes_en (text)
 *   - term_ko (text)
 *   - notes_ko (text)
 *   - term_vi (text)
 *   - notes_vi (text)
 *   - term_zh (text)
 *   - notes_zh (text)
 *
 * Usage:
 *   1. Preview import (Dry Run):
 *      node migration/pocketbase/scripts/import_glossary.js \
 *        --pb-url https://155-248-165-196.nip.io \
 *        --pb-email admin@kendo-translation.local \
 *        --pb-password TempAdmin2026! \
 *        --dry-run
 *
 *   2. Execute Real Production Import:
 *      node migration/pocketbase/scripts/import_glossary.js \
 *        --pb-url https://155-248-165-196.nip.io \
 *        --pb-email admin@kendo-translation.local \
 *        --pb-password TempAdmin2026! \
 *        --apply
 */

const fs = require("fs");
const path = require("path");
const PocketBase = require("pocketbase").default || require("pocketbase");

function parseArgs() {
  const args = {
    pbUrl: "https://155-248-165-196.nip.io",
    pbEmail: process.env.PB_EMAIL || "",
    pbPassword: process.env.PB_PASSWORD || "",
    dictPath: "/Volumes/SSD2T/moving/universal-agent_v2/compiled_agents/gemini_kendo_book_translator_kr_vn/kendo_dict.md",
    dryRun: true,
  };

  for (let i = 2; i < process.argv.length; i++) {
    switch (process.argv[i]) {
      case "--pb-url":       args.pbUrl       = process.argv[++i]; break;
      case "--pb-email":     args.pbEmail     = process.argv[++i]; break;
      case "--pb-password":  args.pbPassword  = process.argv[++i]; break;
      case "--dict-file":    args.dictPath    = process.argv[++i]; break;
      case "--dry-run":      args.dryRun      = true; break;
      case "--apply":        args.dryRun      = false; break;
      case "--help":
        console.log(`
import_glossary.js — KR/VN Terminology Importer

Options:
  --pb-url URL          PocketBase instance URL
  --pb-email EMAIL      Superuser email
  --pb-password PASS    Superuser password
  --dict-file PATH      Path to kendo_dict.md
  --dry-run             Dry-run preview mode (DEFAULT)
  --apply               Execute real production writes
`);
        process.exit(0);
    }
  }
  return args;
}

function parseTermJa(jaLine) {
  const colonIdx = jaLine.indexOf(":");
  if (colonIdx === -1) return { term_ja: jaLine, reading: "", notes_ja: "" };
  const left = jaLine.slice(0, colonIdx).trim();
  const notes_ja = jaLine.slice(colonIdx + 1).trim();

  const parenMatch = left.match(/^([^(]+)\(([^)]+)\)$/);
  if (parenMatch) {
    return {
      term_ja: parenMatch[1].trim(),
      reading: parenMatch[2].trim(),
      notes_ja,
    };
  }
  return { term_ja: left, reading: "", notes_ja };
}

function parsePair(line) {
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return { term: line.trim(), notes: "" };
  return {
    term: line.slice(0, colonIdx).trim(),
    notes: line.slice(colonIdx + 1).trim(),
  };
}

function parseDictFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dictionary file not found at: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  let currentCategory = "";
  const records = [];
  let blockLines = [];

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("## ")) {
      currentCategory = line.replace(/^##\s*/, "").trim();
      continue;
    }
    if (line === "---" || line === "") {
      if (blockLines.length >= 3) {
        const jaParsed = parseTermJa(blockLines[0]);
        const viParsed = parsePair(blockLines[1]);
        const koParsed = parsePair(blockLines[2]);
        records.push({
          category: currentCategory,
          term_ja: jaParsed.term_ja,
          reading: jaParsed.reading,
          notes_ja: jaParsed.notes_ja,
          term_vi: viParsed.term,
          notes_vi: viParsed.notes,
          term_ko: koParsed.term,
          notes_ko: koParsed.notes,
        });
      }
      blockLines = [];
      continue;
    }
    if (line.includes(":") && !line.startsWith("#") && !line.startsWith("**")) {
      blockLines.push(line);
    }
  }

  if (blockLines.length >= 3) {
    const jaParsed = parseTermJa(blockLines[0]);
    const viParsed = parsePair(blockLines[1]);
    const koParsed = parsePair(blockLines[2]);
    records.push({
      category: currentCategory,
      term_ja: jaParsed.term_ja,
      reading: jaParsed.reading,
      notes_ja: jaParsed.notes_ja,
      term_vi: viParsed.term,
      notes_vi: viParsed.notes,
      term_ko: koParsed.term,
      notes_ko: koParsed.notes,
    });
  }

  return records;
}

async function ensureGlossaryCollection(pb, dryRun) {
  try {
    const col = await pb.collections.getOne("glossary");
    console.log(`✓ Collection 'glossary' already exists (id: ${col.id})`);
    return col;
  } catch (err) {
    if (err.status === 404 || err.status === 401) {
      if (dryRun) {
        console.log(`+ [DRY RUN] Will ensure/create collection 'glossary'`);
        return null;
      }
      console.log(`+ Creating new collection 'glossary' in PocketBase...`);
      const newCol = await pb.collections.create({
        name: "glossary",
        type: "base",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: "category",  type: "text", required: false },
          { name: "term_ja",   type: "text", required: true },
          { name: "reading",   type: "text", required: false },
          { name: "notes_ja",  type: "text", required: false },
          { name: "term_en",   type: "text", required: false },
          { name: "notes_en",  type: "text", required: false },
          { name: "term_ko",   type: "text", required: false },
          { name: "notes_ko",  type: "text", required: false },
          { name: "term_vi",   type: "text", required: false },
          { name: "notes_vi",  type: "text", required: false },
          { name: "term_zh",   type: "text", required: false },
          { name: "notes_zh",  type: "text", required: false },
        ],
      });
      console.log(`✓ Created collection 'glossary' (id: ${newCol.id})`);
      return newCol;
    }
    throw err;
  }
}

async function main() {
  const args = parseArgs();
  console.log(`=======================================================`);
  console.log(`  KR/VN Glossary Importer — Kendo Translation`);
  console.log(`  Target PB: ${args.pbUrl}`);
  console.log(`  Mode:      ${args.dryRun ? "DRY RUN (Preview Only)" : "REAL WRITE (--apply)"}`);
  console.log(`  Dict File: ${args.dictPath}`);
  console.log(`=======================================================\n`);

  const records = parseDictFile(args.dictPath);
  console.log(`✓ Parsed ${records.length} terminology records from kendo_dict.md\n`);

  const pb = new PocketBase(args.pbUrl);

  if (!args.dryRun || (args.pbEmail && args.pbPassword)) {
    if (!args.dryRun && (!args.pbEmail || !args.pbPassword)) {
      console.error(`ERROR: Superuser credentials required for write mode (--pb-email & --pb-password).`);
      process.exit(1);
    }
    if (args.pbEmail && args.pbPassword) {
      await pb.collection("_superusers").authWithPassword(args.pbEmail, args.pbPassword);
      console.log(`✓ Authenticated as superuser ${args.pbEmail}\n`);
    }
  }

  await ensureGlossaryCollection(pb, args.dryRun);

  if (args.dryRun) {
    console.log(`\n[DRY RUN] Would write ${records.length} terminology entries to 'glossary' collection.`);
    console.log(`Sample Entry [0]:`, JSON.stringify(records[0], null, 2));
    console.log(`Sample Entry [100]:`, JSON.stringify(records[100], null, 2));
    console.log(`\nTo execute real write: rerun with --apply and superuser credentials.`);
    return;
  }

  // Clear existing glossary records if any (idempotent overwrite)
  try {
    const existing = await pb.collection("glossary").getFullList({ requestKey: null });
    if (existing.length > 0) {
      console.log(`- Clearing ${existing.length} existing glossary records for clean import...`);
      for (const item of existing) {
        await pb.collection("glossary").delete(item.id);
      }
    }
  } catch (err) {
    console.warn(`Warning during existing record check:`, err.message);
  }

  console.log(`+ Inserting ${records.length} glossary records...`);
  let successCount = 0;
  const chunkSize = 50;

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map((rec) => pb.collection("glossary").create(rec, { requestKey: null }))
    );

    for (const res of results) {
      if (res.status === "fulfilled") {
        successCount++;
      } else {
        console.error(`  Failed to insert record:`, res.reason);
      }
    }
    process.stdout.write(`  Progress: ${Math.min(i + chunkSize, records.length)} / ${records.length} written\r`);
  }

  console.log(`\n\n=======================================================`);
  console.log(`  IMPORT COMPLETE`);
  console.log(`  Successfully written: ${successCount} / ${records.length} entries`);
  console.log(`=======================================================`);
}

main().catch((err) => {
  console.error(`Fatal error:`, err);
  process.exit(1);
});
