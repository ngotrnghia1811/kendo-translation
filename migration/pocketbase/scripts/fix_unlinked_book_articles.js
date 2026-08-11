#!/usr/bin/env node

/**
 * fix_unlinked_book_articles.js — Patch articles.book for unsplit topic-compilation books
 *
 * Root cause: derive_book_hierarchy.js created `books` records for all 23 topic-
 * compilation books, but only the 2 that were subsequently split by
 * split_book_segments.js (Kendo Reiho and Saho, Ki Breathing Method) had their
 * child articles linked to the book. The remaining 21 UNSPLIT articles (where
 * the original doc_type='book' article itself carries all segments) were never
 * self-linked — their `book` field stayed empty.
 *
 * Fix: for every article where segment_count > 0 AND book = "" AND doc_type = "book",
 * find the matching `books` record via books.source_book_id === article.id,
 * then PATCH the article's `book` field to that book record ID.
 *
 * Idempotency: re-running after a successful run finds 0 matching articles
 * (book != "") and exits cleanly.
 *
 * Usage:
 *   node scripts/fix_unlinked_book_articles.js \
 *     --pb-url https://155-248-165-196.nip.io \
 *     --pb-email admin@kendo-translation.local \
 *     --pb-password TempAdmin2026!
 *
 *   node scripts/fix_unlinked_book_articles.js \
 *     --pb-url https://155-248-165-196.nip.io \
 *     --pb-email admin@kendo-translation.local \
 *     --pb-password TempAdmin2026! \
 *     --dry-run
 *
 *   node scripts/fix_unlinked_book_articles.js \
 *     --pb-url https://155-248-165-196.nip.io \
 *     --pb-email admin@kendo-translation.local \
 *     --pb-password TempAdmin2026! \
 *     --dry-run --verbose
 */

const PocketBase = require("pocketbase").default || require("pocketbase");

// ── CLI args ────────────────────────────────────────────────────────
function parseArgs() {
  const args = { pbUrl: "", pbEmail: "", pbPassword: "", dryRun: false, verbose: false };
  for (let i = 2; i < process.argv.length; i++) {
    switch (process.argv[i]) {
      case "--pb-url":      args.pbUrl     = process.argv[++i]; break;
      case "--pb-email":    args.pbEmail   = process.argv[++i]; break;
      case "--pb-password": args.pbPassword = process.argv[++i]; break;
      case "--dry-run":     args.dryRun    = true; break;
      case "--verbose":     args.verbose   = true; break;
      case "--help":
        console.log(`
Usage: node fix_unlinked_book_articles.js [options]

Options:
  --pb-url URL         PocketBase instance URL
  --pb-email EMAIL     PocketBase superuser email
  --pb-password PASS   PocketBase superuser password
  --dry-run            Preview only — don't write
  --verbose            Show per-article details
  --help               Show this message
`);
        process.exit(0);
    }
  }
  return args;
}

// ── Helpers ─────────────────────────────────────────────────────────

const FILTER = 'segment_count>0&&book=""&&doc_type="book"';

async function fetchAllMatchingArticles(pb, verbose) {
  // PocketBase caps at 200 per page; we expect 21.
  const result = await pb.collection("articles").getList(1, 200, {
    filter: FILTER,
    sort: "title",
    fields: "id,title,segment_count,book,doc_type,author",
  });
  if (verbose) {
    console.log(`  Query filter: ${FILTER}`);
    console.log(`  Returned: ${result.totalItems} articles\n`);
  }
  return result.items;
}

async function findBookBySourceArticleId(pb, articleId) {
  const result = await pb.collection("books").getList(1, 1, {
    filter: `source_book_id="${articleId}"`,
    fields: "id,title,source_book_id",
  });
  if (result.items.length === 0) return null;
  return result.items[0];
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  if (!args.pbUrl || !args.pbEmail || !args.pbPassword) {
    console.error("ERROR: --pb-url, --pb-email, and --pb-password are required.");
    process.exit(1);
  }

  // ── Auth ──────────────────────────────────────────────────────────
  const pb = new PocketBase(args.pbUrl);
  console.log(`Authenticating as ${args.pbEmail}...`);
  await pb.admins.authWithPassword(args.pbEmail, args.pbPassword);
  console.log("✓ Authenticated\n");

  // ── Fetch unlinked articles ───────────────────────────────────────
  console.log("Fetching unlinked book articles...");
  const articles = await fetchAllMatchingArticles(pb, args.verbose);

  if (articles.length === 0) {
    console.log("✓ No unlinked book articles found — nothing to fix.\n");
    return [];
  }

  console.log(`Found ${articles.length} unlinked book article(s).\n`);
  if (args.verbose) {
    console.log("─".repeat(70));
    for (const a of articles) {
      console.log(`  ${a.title}  (${a.id})  segments=${a.segment_count}`);
    }
    console.log("─".repeat(70) + "\n");
  }

  // ── Process each article ──────────────────────────────────────────
  const results = [];

  for (const article of articles) {
    const prefix = args.dryRun ? "[DRY RUN]" : "";
    console.log(`── ${article.title}`);
    console.log(`    Article ID:   ${article.id}`);
    console.log(`    Segments:     ${article.segment_count}`);
    console.log(`    Current book: "${article.book}"`);

    // Find matching book record
    let book;
    try {
      book = await findBookBySourceArticleId(pb, article.id);
    } catch (err) {
      console.error(`    ✗ Failed to query books: ${err.message}`);
      results.push({
        articleId: article.id,
        title: article.title,
        status: "error",
        reason: `books query failed: ${err.message}`,
      });
      continue;
    }

    if (!book) {
      console.error(`    ✗ No books record found with source_book_id=${article.id}`);
      results.push({
        articleId: article.id,
        title: article.title,
        status: "error",
        reason: "no matching book record",
      });
      continue;
    }

    console.log(`    Matching book: ${book.title} (${book.id})`);

    if (args.dryRun) {
      console.log(`    ${prefix} Would PATCH: book="${book.id}"\n`);
      results.push({
        articleId: article.id,
        title: article.title,
        bookId: book.id,
        bookTitle: book.title,
        status: "dry_run",
      });
    } else {
      try {
        await pb.collection("articles").update(article.id, { book: book.id });
        console.log(`    ✓ PATCHED: book="${book.id}"\n`);
        results.push({
          articleId: article.id,
          title: article.title,
          bookId: book.id,
          bookTitle: book.title,
          status: "fixed",
        });
      } catch (err) {
        console.error(`    ✗ Failed to update: ${err.message}\n`);
        results.push({
          articleId: article.id,
          title: article.title,
          status: "error",
          reason: `update failed: ${err.message}`,
        });
      }
    }
  }

  // ── Summary ────────────────────────────────────────────────────────
  console.log("=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));

  const fixed = results.filter(r => r.status === "fixed");
  const dry = results.filter(r => r.status === "dry_run");
  const errors = results.filter(r => r.status === "error");

  console.log(`  Total articles found:          ${articles.length}`);
  console.log(`  Fixed:                         ${fixed.length}`);
  console.log(`  Dry-run preview:               ${dry.length}`);
  console.log(`  Errors:                        ${errors.length}`);
  console.log();

  if (fixed.length > 0) {
    console.log("Articles fixed:");
    for (const r of fixed) {
      console.log(`  ✓ ${r.title} → book="${r.bookId}" (${r.bookTitle})`);
    }
    console.log();
  }

  if (dry.length > 0) {
    console.log("Dry-run previews:");
    for (const r of dry) {
      console.log(`  → ${r.title} → book="${r.bookId}" (${r.bookTitle})`);
    }
    console.log();
  }

  if (errors.length > 0) {
    console.log("Errors:");
    for (const r of errors) {
      console.log(`  ✗ ${r.title}: ${r.reason}`);
    }
    console.log();
  }

  // ── Re-check ───────────────────────────────────────────────────────
  if (fixed.length > 0) {
    console.log("Re-checking filter after fixes...");
    const remaining = await fetchAllMatchingArticles(pb, false);
    if (remaining.length === 0) {
      console.log("✓ Filter now returns 0 articles — all books linked.\n");
    } else {
      console.log(`⚠ Filter still returns ${remaining.length} article(s):`);
      for (const r of remaining) {
        console.log(`    ${r.title} (${r.id})`);
      }
      console.log();
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
