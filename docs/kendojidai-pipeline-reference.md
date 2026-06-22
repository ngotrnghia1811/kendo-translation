# Kendojidai Data Pipeline — Reference (2026-06-21)

Covers the complete pipeline for processing kendojidai.com bilingual and
monolingual articles into the kendo-translation app.  Written after the
session that resolved 317 bilingual → 0 needs_manual_review + 319
monolingual articles segmented.

---

## 1. Source data

| Path | Content | Count |
|------|---------|-------|
| `/Volumes/SSD2T/project_archive/mARTr/data_crawler/kendo_jidai/kendojidai_data.json` | EN articles (list of objects) | 550 |
| `/Volumes/SSD2T/project_archive/mARTr/data_crawler/kendo_jidai_jp/kendojidai_jp_data.json` | JP articles (list of objects) | 399 |
| `/Volumes/SSD2T/project_archive/mARTr/data_crawler/kendo_jidai/matched_posts.json` | Match dict with `matches` (315 bilingual), `unmatched_en` (235), `unmatched_jp` (84) | — |

Each article object: `url, title, author, published_date, categories, tags, content, excerpt, scraped_at, metadata`.

---

## 2. Import

**Script:** `scripts/import-kendojidai-bilingual.ts` (767 lines)

Three modes:
- `--only bilingual` (default) — imports `matched_posts.json` matches → `content_en` + `content_ja`, `translation_status='draft'`
- `--only en` — imports unmatched EN → `content_en` only, `translation_status='pending'`
- `--only jp` — imports unmatched JP → `content_ja` only, `translation_status='pending'`

Supports `--dry-run`, `--limit N`, `--force`, `--backfill`. BATCH_SIZE=50.
Deduplication: skips articles whose `source_url_en` / `source_url_ja` already exist in DB.

**Final DB state after import:**
- 317 bilingual (draft → later upgraded to qa_approved by segmentation)
- 235 EN-only (pending)
- 85 JP-only (pending)

---

## 3. Bilingual segmentation & alignment

This is the hard part.  The original paragraph-level alignment (simple 1:1 zip
after `\n\n` split) misaligns ~77% of articles because Japanese magazine
formatting doesn't match English translation paragraph structure.

### 3.1 Canonical script

**`scripts/resegment-hierarchical.ts`** (~930 lines) — the one script to rule them all.

```
npx tsx scripts/resegment-hierarchical.ts
  --dry-run          preview only
  --article-id UUID  single article
  --limit N          first N articles
  --only-tagged      only articles with needs_manual_review tag
  --skip-already-done  skip articles with metadata.classified=true
  --max-diff N       diff threshold for Pattern D (default 10)
  --max-null-rate R  null EN rate threshold (default 0.30)
```

### 3.2 Alignment algorithm (order of operations)

1. **Junk stripping** — EN and JP junk regex patterns (see §5)
2. **JP preprocessing** — A1 (name→bio merge), E1 (event-metadata merge), E2 (split-quote merge)
3. **Paragraph alignment** — `mergeShortForward()` at JP threshold 40, EN threshold 80
4. **Second-pass merge** (H5) — if jp > en+2 after first pass, re-merge at threshold 120
5. **Per-paragraph sentence splitting** — JP on `。`, EN on `. ` with abbreviation guard (Mr/Mrs/Ms/Dr/Prof/St/etc)
6. **Proportional zip** (H1) — within each paragraph pair, merge larger side into smaller side's count, zip 1:1. No null padding from count mismatch.
7. **Classification:**
   - `para_diff > 10` → keep paragraph-level, tag `needs_manual_review` (Pattern D)
   - `null_en_rate > 0.30` → keep paragraph-level, tag `needs_manual_review` (H6 / borderlines)
   - Otherwise → use hierarchical sentence segments, clear tag

### 3.3 What the 3 algorithmic rounds resolved

| Round | Commit | Fixed | Remaining | Key addition |
|-------|--------|-------|-----------|--------------|
| 1 | `dc812dd` | 244→120 | 120 | A1/E1/E2 preprocessor (`isJpNameLine`, `isJpEventMeta`, `isOpenQuote`) |
| 2 | `6da7b8a` | 120→31 | 31 | `proportionalZip()` + EN abbreviation guard (H1) |
| 3 | `d65e401` | 31→28 | 28 | H4 (extended junk lists) + H5 (second-pass merge at 120) |

### 3.4 Manual alignment (the final 28)

Not all structural differences can be solved algorithmically.  The 28
hard cases (23 Pattern D + 5 EN-omission) were manually aligned by
reading full `content_ja` + `content_en` and producing explicit
semantic merge-maps.

**Pattern D** (structural reorder): JP puts bio/prologue in different
order than EN.  Solution: use JP reading order as canonical `position`,
attach correct EN paragraph to each JP unit regardless of EN position.

**EN-omission**: JP content (photo captions, summary boxes) has no EN
counterpart.  Solution: pair JP with `target_text = null`.

Manual alignment was done in 4 batches (commits `c4af799`, `03fcdd1`,
`6ad92c3`, `910ed44`).  Protocol per article:
1. Read both `content_ja` and `content_en` from DB
2. Construct explicit `[{jp, en}, ...]` merge-map by semantic matching
3. DELETE old segments → INSERT new → UPDATE `articles` → UPSERT `document_settings`
4. Clear `needs_manual_review` tag
5. Set `metadata.manual_alignment = true`

---

## 4. Monolingual segmentation

**Script:** `scripts/segment-monolingual-kendojidai.ts` (540 lines, commit `5173f65`)

For EN-only and JP-only articles (no translation counterpart).  Algorithm:
1. Read single-language content (`content_en` or `content_ja`)
2. Apply same junk patterns as bilingual pipeline (§5)
3. Split by `\n\n+` into paragraphs
4. Drop paragraphs < 10 chars (residual junk fragments)
5. Create segments: `source_text = paragraph`, `target_text = null`, `status = 'qa_approved'`
6. `metadata: { monolingual: true, lang: 'en'|'ja', source: 'kendojidai_monolingual' }`

Result: 319 articles → 11,614 segments.

---

## 5. Junk pattern taxonomy

Keep these in sync across all scripts.  Source of truth: `resegment-hierarchical.ts`.

### EN junk (strip from content_en)
```
/^(?:.)*KENDOJIDAI\s+\d{4}\.\d{1,2}/i     date headers
/^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/i        alt date format
/^(?:.)*Translation\s*[：=:]/i             translator credit
/^(?:.)*Photography\s*[：=:]/i             photographer
/^Interview\s+(Taken\s+)?[Bb]y/i           interview credit
/^Moderator\s*:/i                          moderator credit
/^https?:\/\//i                            standalone URLs
/^\*This article/i                         COVID editorial notes
/^(?:.)*Tweet\b/i                          Tweet link
/^(?:.)*Pocket\b/i                         Pocket link
/^(?:.)*FREE ARTICLE\b/i                   free article banner
```

### JP junk (strip from content_ja)
```
/剣道時代.*号.*掲載/                     "Published in Kendo Jidai #N"
/[『「]剣道時代.*号[』」]/               citation header
/^\d{4}\.\d{1,2}[　\s]*KENDOJIDAI/       date header
/^※この?(?:記事|インタビュー|連載)は/   "※ This article/interview/serial is..."
/^(?:.*)?撮影[＝=：:\s]/                  photography credit
/^(?:.*)?翻訳[＝=：:\s]/                  translation credit
/^(?:.*)?取材[＝=：:\s]/                  interview credit
/^(?:.*)?文[＝=：:\s]/                    text/author credit
/^(?:.*)?司会[＝=：:\s]/                  moderator credit
/^(?:.*)?協力[＝=：:\s]/                  cooperation credit
/^関連$/                                  "Related" tag
/^第\d+回[はへ]こちら/                    series-nav: "Nth installment here"
/^第\d+回[にへ]続く/                      series-nav: "continues to Nth"
/^\*この記事は/                            COVID note
/^無料記事/                                "Free article"
/^(?:.*)?Tweet\b/i                         Tweet link
/^(?:.*)?Pocket\b/i                        Pocket link
/^https?:\/\//i                            standalone URLs
```

### JP preprocessing patterns (applied before paragraph merge)
- **A1** — `isJpNameLine()`: line < 30 chars, mostly kanji, no `。`, looks like a person name heading. Merge forward into next paragraph (the bio).
- **E1** — `isJpEventMeta()`: contains date markers (`㈰`, `㈯`, etc.) or `第N回` event numbering. Merge backward/forward with adjacent metadata lines.
- **E2** — `isOpenQuote()`: contains `「` but no `」`. Merge forward to close the quote.

---

## 6. Script inventory

| Script | Purpose | Lines |
|--------|---------|-------|
| `scripts/import-kendojidai-bilingual.ts` | Import articles from JSON → DB | 767 |
| `scripts/segment-kendojidai-bilingual.ts` | Original paragraph-level segmentation | 529 |
| `scripts/resegment-hierarchical.ts` | **Canonical** hierarchical aligner + classifier | ~930 |
| `scripts/realign-mismatch-articles.ts` | Fix 76/103 mismatch articles (mergeShortForward) | 549 |
| `scripts/fix-5-large-mismatch-articles.ts` | Fix 5 worst-case articles with enhanced patterns | 537 |
| `scripts/manual-align-batch3.ts` | Manual merge-map for final 12 hard cases | 1172 |
| `scripts/segment-monolingual-kendojidai.ts` | Monolingual paragraph segmentation | 540 |

---

## 7. Commit history (2026-06-21 session)

```
910ed44  fix: re-align Iwatate Saburo c6a1c342 with precise merge-map
5173f65  feat: monolingual kendojidai segmentation — 319 articles, 11,614 segments
6ad92c3  feat: manual semantic alignment batch 3 — final 12 needs_manual_review articles,
          1225 segments, 2.4% null EN. Stuart Gibson reorder resolved.
03fcdd1  feat: manual semantic alignment batch 2 — articles 9-16, 506 segments
c4af799  feat: manual semantic alignment batch 1 — 8 smallest needs_manual_review articles
d65e401  fix: H4 extended junk + H5 second-pass merge — 31→28 tagged
6da7b8a  feat: proportional sentence zip eliminates null EN from count mismatch; EN abbrev guard
dc812dd  feat: JP paragraph preprocessor for A1/E1/E2 name-bio/meta/quote patterns
d611a0f  feat: flat sentence-level resegmentation script (reference only)
1860dce  feat: smart classifier for hierarchical resegmentation
63c5615  fix: 5 large-mismatch bilingual articles with enhanced junk patterns
```

---

## 8. How to add future kendojidai data

1. **New scraped JSONs** go in `/Volumes/SSD2T/project_archive/mARTr/data_crawler/kendo_jidai/` and `kendo_jidai_jp/`.
2. **Run matching** (external) to produce `matched_posts.json`.
3. **Import**: `npx tsx scripts/import-kendojidai-bilingual.ts --only bilingual` (and `--only en` / `--only jp` for monolingual).
4. **Segment bilingual**: `npx tsx scripts/resegment-hierarchical.ts` — this auto-classifies and tags hard cases.
5. **Tagged articles** (if any) need manual semantic alignment (read content, construct merge-map, write segments via the protocol in §3.4).
6. **Segment monolingual**: `npx tsx scripts/segment-monolingual-kendojidai.ts`.
7. **Verify**: query DB for `needs_manual_review` tags, spot-check segments in reader.

---

## 9. Final DB state (2026-06-21)

| Category | Articles | Segments | qa_approved |
|----------|----------|----------|-------------|
| Books (Sword Theory, Kendojidai years, etc.) | 29 | ~96k | all |
| Kendojidai bilingual | 317 | ~17k | all |
| Kendojidai EN-only | 235 | 11,614 | all |
| Kendojidai JP-only | 85 | | all |
| Other (uncategorized) | ~327 | ~10k? | varies |
| **Total** | **~993** | **~134k** | |
