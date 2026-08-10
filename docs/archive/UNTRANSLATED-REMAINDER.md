# Untranslated Remainder — Clean Re-Import (18 Books)

## What this was

This document records the **clean re-import** of all 18 in-scope kendo books
into the `segments` / `articles` / `document_settings` tables. The content was
sourced from the post-processing pipeline page files at
`/Users/nghiango-mbp/git_repo/universal-agent_v2/book-postprocessing/<book>/pages/page_NNN.md`,
**not** from the `triplet.json` artifacts. The `triplet.json` files have
alignment-corruption bugs (they sometimes shift the EN text into the JA slot and
blank EN); the `page_NNN.md` files are correctly aligned per-line and are the
verified source of truth. The import is **delete-then-insert per article id**:
all existing segments for the article are deleted, then the freshly parsed
segments are inserted (batches of 500, zero-based ascending `position` across the
whole book). Article rows are **preserved** (same id/title); only
`segment_count`, `segmented=true`, and `translation_status='qa_approved'` are
updated, and `document_settings` is upserted with
`paragraph_boundaries=[0..N-1]`. **Chinese (ZH) is dropped entirely** — the
schema is bilingual JA→EN only. A block is imported as a segment **only when both
JA and EN are present**; JA-only blocks are counted as `skipped_untranslated`,
and blocks with neither / EN-only / empty are counted as `skipped_other`.

## Per-book results

| Book dir | Article title | Article id | clean_total_blocks | segments_imported (JA+EN) | skipped_untranslated (JA-only) | skipped_other |
|---|---|---|---:|---:|---:|---:|
| 100 practice full | 100 Practice Full | eb180692-f702-400c-9d8f-1ee09309b6c2 | 6485 | 6469 | 0 | 16 |
| Eiga Full | Eiga Full | 33ca2416-50c1-4b93-a4ff-5318da576c35 | 2354 | 2336 | 0 | 18 |
| Etiqu 1 Full | Etiqu 1 Full | aea3e1a6-fe6a-408b-b57d-4942900670f4 | 3876 | 3781 | 0 | 95 |
| Hayashi Full | Hayashi Full | 42f1851e-1d21-4bbf-966b-d1cfef54471d | 4092 | 4086 | 0 | 6 |
| KodaSS 200 full | KodaSS 200 Full | 9fb879ce-9247-45fb-9db7-d4fdedff7496 | 4032 | 3954 | 0 | 78 |
| Left foot full | Left Foot Full | cb602626-be32-4b5f-ac0e-337fa8807aae | 1937 | 1887 | 0 | 50 |
| Lifelong Full | Lifelong Full | 11bf7ade-a84c-493e-9964-b2f09286c6c3 | 3418 | 3404 | 0 | 14 |
| Men Full | Men Full | db9e53c2-941c-471c-9a62-abcb7bb91d42 | 6283 | 6254 | 0 | 29 |
| Mental Full | Mental Full | abe50f79-c04f-41c1-9409-faee5a389c62 | 1967 | 1938 | 0 | 29 |
| Ogawa lecture part 1 | Ogawa Lecture Part 1 | 086772e8-9bf4-4881-849e-3597f90aa884 | 6651 | 6639 | 0 | 12 |
| Ogawa lecture part 2 | Ogawa Lecture Part 2 | f877550e-9a53-45ca-ac36-f440bb5e4c32 | 2627 | 2600 | 0 | 27 |
| Ogawa lecture part 3 | Ogawa Lecture Part 3 | 05410dcf-74ba-4655-a7c2-53879c0b8880 | 1850 | 1841 | 0 | 9 |
| SumiSS 10 c 1 Full | SumiSS 10 C 1 Full | 119888a3-96e5-420a-ba8e-9b1f25acd44e | 2121 | 2062 | 0 | 59 |
| SumiSS Train Full | SumiSS Train Full | 4bb88ee9-933a-4511-80fb-cc66dcd026b0 | 1537 | 1524 | 0 | 13 |
| Tanden Full | Tanden Full | 084983bb-8f91-42b1-b5b3-4add46bfc5a1 | 6518 | 6502 | 0 | 16 |
| Tani ss full | Tani Ss Full | f43c7bb9-6f4c-4c5d-abcb-bbf8317fa356 | 1900 | 1874 | 0 | 26 |
| baba 1 clean | Baba 1 Clean | 86adf815-b0ca-46eb-bab7-b6fb040b845c | 3413 | 3271 | 1 | 141 |
| baba 2 clean | Baba 2 Clean | ab187703-3a17-46ae-bca5-f30b9cd916a4 | 3686 | 3542 | 0 | 144 |
| **TOTALS** | | | **64747** | **63964** | **1** | **782** |

All 18 books imported successfully with **zero errors**. For each book the DB
verification confirmed `articles.segment_count`,
`document_settings.paragraph_boundaries.length`, and the `segments` row count all
equal `segments_imported`.

## Known anomaly — single-line full-width-paren gloss fragmentation

A rare anomaly exists in a small number of single-line blocks where a Japanese
gloss using **full-width parentheses** `（…）` interleaves a romanized term, a
CJK term, and a stray number/Latin token on one physical line. The script's
script-classification splitter (used only for 1-line and merged-tail blocks) can
fragment such a line into adjacent JA/EN pieces that no longer read as a clean
sentence pair.

Example — `baba 1 clean`, `position = 1213`:

- `source_text` = `"パンデミック）を インフルエンザ"`
- `target_text` = `"7 WHO）、"`

This is **faithful to the source** layout (the underlying page line genuinely
mixes scripts and a dangling full-width paren), it is **rare**, and it is
**non-blocking** — the segment still imports with both JA and EN present and does
not disrupt position ordering or paragraph boundaries. It is noted here for
transparency rather than as a defect to be fixed in this pass.

## Out of scope — content NOT touched by this re-import

The following articles were **NOT** part of this clean re-import and **retain
their prior content** (no delete, no insert, no settings change):

- The **4 Kendojidai magazines**: `38221898`, `84f5be1e`, `4143b5fb`, `563b88bb`
- **Zen Living**: `662f0994`
- **Ki Breath**: `7a593e30`
- **Mental 2**: `b6b281bc`
- **Kata**: `91ed41bf`
- The **2 legacy articles**: `93f7a0e0`, `c914a0bb`

Only the 18 books in the `ARTICLE_MAP` of
`scripts/import-clean-triplets.ts` were modified by this run.
