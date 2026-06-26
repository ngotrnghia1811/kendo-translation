#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# ──────────────────────────────────────────────────────────────────
# furigana-drain.sh — Resume the furigana ruby_data precompute
#
# What this does:
#   1. Reads DB creds from .env.local
#   2. Shows current remaining-NULL count
#   3. Runs scripts/precompute-furigana.ts (idempotent / resumable)
#   4. Shows final remaining-NULL count
#
# Prerequisites (already done — once only, per session):
#   - Migration 013: segments.ruby_data JSONB column
#   - Migration 015: bulk_update_ruby_data RPC (set-based unnest)
#   - Partial index: idx_seg_ruby_null ON segments(id) WHERE ruby_data IS NULL
#   - SudachiDict Small (~117 MB) cached in temp by annotate.ts
#
# Usage:
#   chmod +x scripts/run-furigana-drain.sh
#   ./scripts/run-furigana-drain.sh                # default batch-size 50
#   ./scripts/run-furigana-drain.sh 20             # gentler (slower)
#   ./scripts/run-furigana-drain.sh 100            # larger (risk: statement_timeout)
#
# Stopping: Ctrl+C is safe — cooldowns between batches mean the kill
# lands between writes.  Progress is idempotent (WHERE ruby_data IS NULL)
# so just re-run the script to resume.
# ──────────────────────────────────────────────────────────────────

BATCH_SIZE="${1:-50}"
LOG_DIR="/var/folders/sz/2hvwvpb16c77mfzqnvkb5gbc0000gn/T/opencode"
mkdir -p "$LOG_DIR"

# --- load env -------------------------------------------------------
TOKEN=$(grep -E '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2- | tr -d '"')
URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')

if [ -z "$TOKEN" ] || [ -z "$URL" ]; then
    echo "ERROR: Missing SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_URL in .env.local"
    exit 1
fi

PROJECT_REF=$(echo "$URL" | grep -oE 'https://([^.]+)' | sed 's|https://||')
MGMT_ENDPOINT="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"

# --- count remaining NULLs -----------------------------------------
echo "=== Counting NULL rows ==="
NULLS=$(curl -s -X POST "$MGMT_ENDPOINT" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"SELECT count(*) FILTER (WHERE ruby_data IS NULL) AS nulls FROM segments WHERE source_lang='ja'\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['nulls'])" 2>/dev/null || echo "unknown")

echo "Remaining NULL (source_lang='ja'): $NULLS"
echo "Batch size: $BATCH_SIZE"
echo ""

# --- run precompute ------------------------------------------------
TIMESTAMP=$(date +%s)
LOG="$LOG_DIR/drain-${TIMESTAMP}.log"

echo "=== Starting drain (log: $LOG) ==="
echo "  To monitor:  tail -f $LOG"
echo "  To stop:     kill \$(pgrep -f precompute-furigana)"
echo "  Ctrl+C here will also stop it."
echo ""

# Run in foreground so user can Ctrl+C.
# If you want background instead, add `&` at the end and remove the wait.
npx tsx scripts/precompute-furigana.ts --batch-size "$BATCH_SIZE" 2>&1 | tee "$LOG"

EXIT_CODE=${PIPESTATUS[0]}

# --- final count ---------------------------------------------------
echo ""
echo "=== Final count ==="
FINAL=$(curl -s -X POST "$MGMT_ENDPOINT" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"SELECT count(*) FILTER (WHERE ruby_data IS NULL) AS nulls FROM segments WHERE source_lang='ja'\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['nulls'])" 2>/dev/null || echo "unknown")

echo "Remaining NULL: $FINAL"
echo "Exit code: $EXIT_CODE"
