# Page images

This folder holds the script that converts book page PDFs into page images. A page image (one WebP file per book page) lets the reader show the scanned page next to the text.

## Files

- `convert_pages.py`: the conversion script. It uses Python 3 and the standard library only.
- `color-pages.txt`: the list of pages to convert in color. It has no page IDs now.
- Output folder: `data/page-images/`. Git ignores it (`data/*` in `.gitignore`).

## Owner decisions

- Round 63 (2026-10-29): WebP, 150 dpi, quality 70, one file per page, path `<slug>/p<NNN>.webp`.
- Round 65 answer 3 (2026-10-29): "Actually, convert all to black and white for now. In the future, I will add color pages later when needed". The script reads "black and white" as 8-bit gray, not 1-bit. The owner has not yet confirmed this reading.
- Round 65 answer 4 (2026-10-29): the image folder is on the internal disk of this Mac.
- Round 65 answer 5 (2026-10-29): the script lives in the repo, in `data/scripts/page-images/`.
- Round 64 answer 5: the images go to the Oracle server disk on deploy day. The owner uploads them by hand.

## Page ID rule

The page ID is `<slug>/p<NNN>`. The page ID has 4 digits (`p<NNNN>`) when the book has more than 999 pages. The script takes page numbers from the PDF file names (`page_<number>.pdf`). It does not assume numbers without gaps.

## Commands

Run all commands from this folder. Use `python3 -B`. The `<slugs>` file is `book-slugs.json` from the Translator worktree (`data/pilot-sample/book-slugs.json`).

Show the plan and counts. The command writes nothing:

```
python3 -B convert_pages.py --slugs <slugs> --dry-run
```

Convert all pages (6 workers):

```
python3 -B convert_pages.py --slugs <slugs> --workers 6
```

Convert one book, or a range of pages:

```
python3 -B convert_pages.py --slugs <slugs> --book left_foot_full --pages 1-10
```

Run the self checks:

```
python3 -B convert_pages.py --slugs <slugs> --selftest
```

Options:

| Option | Meaning |
|---|---|
| `--slugs <path>` | Required. Path to `book-slugs.json`. |
| `--out <dir>` | Output folder. Default is `data/page-images`. |
| `--books-dir <dir>` | PDF folder. Default is `books_dir` in the slug file. |
| `--book <slug>` | Convert only this book. Repeat the option for more books. |
| `--pages A-B` | Convert only page numbers A to B. |
| `--workers N` | Parallel workers. Default 4. Maximum 6. |
| `--color-list <file>` | Color list. Default is `color-pages.txt` next to the script. |
| `--only-color-list` | Convert only the listed pages, in color. It overwrites their files. |
| `--force` | Overwrite output files that exist. |
| `--dry-run` | Print the plan and counts. Write nothing. |
| `--limit N` | Stop after N pages. |
| `--selftest` | Run the self checks. |

## How the script works

For each page, the script runs these steps:

1. `gs -q -dNOPAUSE -dBATCH -dSAFER -r150 -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -sDEVICE=pnggray` renders the PDF to a temporary PNG.
2. `cwebp -quiet -q 70` encodes the PNG to a temporary WebP. For a page with the CamScanner mark, `-crop` cuts the bottom first (see the last section).
3. The script renames the temporary WebP to `<out>/<slug>/p<NNN>.webp`.
4. The script deletes the PNG.

Temporary files live in `<out>/.tmp/`. The script removes that folder at the end. The script opens the PDF files read only.

If an output file exists and has more than 0 bytes, the script skips the page. So you can run the script again after a stop. If one page fails, the script writes the failure to the log and continues. The exit code is 1 if any page failed.

Do not run two copies of the script on the same output folder at the same time.

## Logs and manifest

- Log: `<out>/_log/convert-<YYYYMMDD-HHMMSS>.tsv`. Columns: page_id, mode, status (ok, skip, fail), src_MB, out_MB, seconds, error.
- Manifest: `<out>/manifest.tsv`. Columns: page_id, bytes, sha256, mode. The script writes one line for each output file at the end of every run.
- Mode in the manifest comes from the color list. If you add a page to the list, run with `--only-color-list` so that the file and the manifest agree.
- Use the manifest to make sure that the upload on the server is complete.

## Measured on 2026-10-29

Measured on this Mac (8 cores) with local tools only.

- Pilot (before unit PC4): 29 pages that unit PC2 converted before. All 29 files have the same bytes and the same sha256 as the PC2 gray files.
  - Command: one `convert_pages.py --book <slug> --pages N-N` run for each page, then a byte and sha256 compare.
- Worker test: 60 pages of `kendojidai_2014` (pages 100 to 159). Command: `convert_pages.py --book kendojidai_2014 --pages 100-159 --workers N`.

| Workers | Seconds for 60 pages | Seconds per page |
|---|---|---|
| 1 | 26.8 | 0.45 |
| 2 | 16.0 | 0.27 |
| 4 | 7.6 | 0.13 |
| 6 | 5.4 | 0.09 |

- Full run (unit PC3, before unit PC4): `convert_pages.py --slugs <slugs> --workers 6`. Result: 13,278 pages ok, 0 skip, 0 fail. Time: 1,415.4 s (23 min 35 s), 0.107 s per page.
- Size after unit PC4: 1,895.9 MB of WebP files (sum of file sizes), 0.143 MB per page. Before PC4 the sum was 1,903.1 MB. `du -sm` of the output folder shows 1,925 MB (was 1,932 MB) because of disk block rounding and the log files.
- Second run without `--force`: 13,278 skip, 0 ok, 5.8 s. The manifest stayed the same (`cmp` showed no difference).
- Self checks: all passed.

## Add a color page later

1. Add the page ID to `color-pages.txt`, one per line, for example `left_foot_full/p001`.
2. Run `python3 -B convert_pages.py --slugs <slugs> --only-color-list`.
3. Upload the new files and the new `manifest.tsv` again.

## Upload to the server

The upload steps for the server are in `<P>/.opencode/aki-main/owner-hand-steps.md`, section 8 (unit DP3). `<P>` is the project folder `/Users/nghiango-mbp/projects/kendo-translation`.

## CamScanner mark crop (unit PC4, round 66)

Some scans carry a "Scanned with CamScanner" box at the bottom right. The script now cuts it out of the page images.

Owner words (round 66 answer 1, 2026-10-29): "Some of the page has marker (`camscaner`) at bottom right, crop them all out (if the first page has it, the whole book will have it)". The script reads this as: cut the bottom 50 pt of every page that draws the mark. The owner has not yet confirmed this reading.

### Rule

- The mark is a small image (240 x 90 px) that the page content stream draws at `80 0 0 30 500 10 cm`. The script allows 1 pt of tolerance on each number.
- The script finds the mark in each PDF page, not in each book. The rule "the first page has it, so the whole book has it" does not hold. In `tanden_full`, pages 1 to 12 have no mark and pages 13 to 276 have it.
- A page with the mark loses the bottom 50 pt. At 150 dpi this is 104 px. The page image changes from 1240 x 1754 px to 1240 x 1650 px.
- `cwebp -crop 0 0 1240 1650` makes the cut. The page is encoded once, so the cut adds no second lossy step.
- A page without the mark keeps its old bytes.
- The scan starts at 52 pt or higher on every page that draws the mark. So the cut removes only white page background and the mark.
- Safety check: before the cut, the script decodes the bottom strip and counts the pixels below 128 outside the columns 1030 to 1230 px. If the count is not 0, the script does not cut the page. It writes the count to the crop log.
- Eight books have `/CropBox [0 50 595 842]` on all 1,650 of their pages: `baba1_clean`, `baba2_clean`, `day_breath_clean`, `ki_breath_full_clean`, `mental2_clean`, `ogawa_lecture_part1`, `ogawa_lecture_part2` and `ogawa_lecture_part3`. Ghostscript ignores the CropBox, so the old images of these books had a white band at the bottom. The new cut removes the band.
- `kata_full` has a second logo ("CS CamScanner") inside the scan, 135 to 169 px above the page bottom. The file `crop-extra.txt` holds the line `kata_full 90`. The 48 pages of this book lose 90 pt (188 px) and keep the page number. Their size is 1240 x 1566 px.
- If a deeper cut fails the safety check, the script cuts 50 pt on that page and writes the page to the crop log. This did not happen.

### Counts (run of 2026-10-29)

| Item | Pages |
|---|---|
| Pages with the mark (25 books) | 5,045 |
| Cut 50 pt (1240 x 1650 px) | 4,997 |
| Cut 90 pt (`kata_full`, 1240 x 1566 px) | 48 |
| Cut refused by the safety check | 0 |
| Pages without the mark (11 books fully, 6 books partly) | 8,233 |

- The 8,233 pages without the mark have the same sha256 in `manifest.tsv` as before. The check compared every row with the archived manifest.
- The detection found the same 5,045 pages as the survey by aki-main (`survey.tsv`, 13,278 PDF files, 0 differences).
- Run: `convert_pages.py --slugs <slugs> --only-marked --workers 6`. The script read the start and end of 13,278 PDF files in about 8 min. It converted 5,045 pages in 571.6 s and wrote 536.5 MB.
- The 5,045 marked pages went from 543.7 MB to 536.5 MB. All 13,278 files total 1,895.9 MB.
- A second run without `--force` skipped 13,278 pages in 4.9 s. The manifest stayed the same.

### Commands

Show how many pages have the mark in each book. The command writes nothing:

```
python3 -B convert_pages.py --slugs <slugs> --only-marked --dry-run
```

Convert the marked pages again and overwrite them. Use this on an output folder that holds old files:

```
python3 -B convert_pages.py --slugs <slugs> --only-marked --workers 6
```

A normal run (`--workers 6`) cuts the marked pages too. It skips files that exist. So use `--only-marked` after you change `crop-extra.txt`.

| Option | Meaning |
|---|---|
| `--only-marked` | Convert only the pages with the CamScanner mark. It overwrites their files. It prints the counts for each book. |
| `--crop-extra <file>` | List of deeper cuts. Default is `crop-extra.txt` next to the script. |

### Crop list

`crop-extra.txt` has one line for each book: `<slug> <pt>`. The value is from 50 to 200. Lines that start with `#` are comments. The deeper cut applies only to pages with the mark.

### Logs

- `<out>/_log/crop-<YYYYMMDD-HHMMSS>.tsv` has one line for each marked page of that run. Columns: page_id, cut_px, cut_pt, reason, refused, width, height_in, height_out.
- Reason is `mark` (50 pt), `mark+extra` (deeper cut), `mark (extra refused)` (50 pt after a refused deeper cut) or `refused` (no cut).
- Column refused lists the refused tries as `<pt>pt:<dark pixel count>`.
- The full list of this run is `crop-20261029-190417.tsv`. A later run that converts no marked page writes a crop log with the header only.
- The upload skips the `_log/` folder.

### Old files

The old files (before PC4) need no copy. The script of commit `faefb03` makes them again with identical bytes, because the render is deterministic. Get that script with `git show faefb03:data/scripts/page-images/convert_pages.py`. If you uploaded the folder to the server before PC4, upload the 5,045 changed files and `manifest.tsv` again.

### Self checks

`--selftest` now has cases for the mark detection (small synthetic PDF), the cut height, the refused cut, the deeper cut with its fallback, and the crop list. The command passes.
