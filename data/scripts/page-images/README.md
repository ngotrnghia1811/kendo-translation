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
2. `cwebp -quiet -q 70` encodes the PNG to a temporary WebP.
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

- Pilot: 29 pages that unit PC2 converted before. All 29 files have the same bytes and the same sha256 as the PC2 gray files.
  - Command: one `convert_pages.py --book <slug> --pages N-N` run for each page, then a byte and sha256 compare.
- Worker test: 60 pages of `kendojidai_2014` (pages 100 to 159). Command: `convert_pages.py --book kendojidai_2014 --pages 100-159 --workers N`.

| Workers | Seconds for 60 pages | Seconds per page |
|---|---|---|
| 1 | 26.8 | 0.45 |
| 2 | 16.0 | 0.27 |
| 4 | 7.6 | 0.13 |
| 6 | 5.4 | 0.09 |

- Full run: `convert_pages.py --slugs <slugs> --workers 6`. Result: 13,278 pages ok, 0 skip, 0 fail. Time: 1,415.4 s (23 min 35 s), 0.107 s per page.
- Size: 1,903.1 MB of WebP files (sum of file sizes), 0.143 MB per page. `du -sm` of the output folder shows 1,931 MB because of disk block rounding and the log files.
- Second run without `--force`: 13,278 skip, 0 ok, 5.8 s. The manifest stayed the same (`cmp` showed no difference).
- Self checks: all passed.

## Add a color page later

1. Add the page ID to `color-pages.txt`, one per line, for example `left_foot_full/p001`.
2. Run `python3 -B convert_pages.py --slugs <slugs> --only-color-list`.
3. Upload the new files and the new `manifest.tsv` again.

## Upload to the server

The upload steps for the server are in `<P>/.opencode/aki-main/owner-hand-steps.md`, section 8 (unit DP3). `<P>` is the project folder `/Users/nghiango-mbp/projects/kendo-translation`.
