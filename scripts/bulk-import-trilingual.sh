#!/usr/bin/env bash
#
# Bulk-run scripts/import-trilingual-references.ts over a list of files.
#
# Per-file failure isolation: one file's non-zero exit does NOT abort the
# loop. Each file gets its own log; a TSV summary records exit code and
# wall time. The importer itself is idempotent (upsert by articles.title),
# so re-runs over the same input set are safe.
#
# Usage:
#   scripts/bulk-import-trilingual.sh <log_dir> <file1> [file2 ...]
#
# Example — import everything currently in the references pipeline:
#   scripts/bulk-import-trilingual.sh /tmp/bulk-logs \
#     "_references/gemini_kendo_book_translator/translated/"*_trilingual.md
#
# Output: <log_dir>/_summary.tsv with columns: file, exit, wall_s, log
#
# This driver was used on 2026-05-28 to import the 25 remaining
# trilingual files after the initial Baba 1 Clean import — 26 articles /
# 147,101 segments total, 0 failures. See docs/BACKEND-FOLLOWUP-FE-COORD.md
# for the corpus inventory.

set -u

if [ $# -lt 2 ]; then
  echo "usage: $0 <log_dir> <file1> [file2 ...]" >&2
  exit 2
fi

LOG_DIR="$1"; shift
mkdir -p "$LOG_DIR"
SUMMARY="$LOG_DIR/_summary.tsv"
: > "$SUMMARY"
printf 'file\texit\twall_s\tlog\n' > "$SUMMARY"

for f in "$@"; do
  base=$(basename "$f" .md)
  safe=$(echo "$base" | tr ' /' '__')
  log="$LOG_DIR/$safe.log"
  echo "==== $f ===="
  t0=$(date +%s)
  npx tsx scripts/import-trilingual-references.ts "$f" >"$log" 2>&1
  ec=$?
  t1=$(date +%s)
  wall=$((t1 - t0))
  echo "exit=$ec wall=${wall}s log=$log"
  printf '%s\t%d\t%d\t%s\n' "$f" "$ec" "$wall" "$log" >> "$SUMMARY"
done

echo "DONE. Summary: $SUMMARY"
