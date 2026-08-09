# PocketBase Migration for kendo-translation

Migration tooling to move the kendo-translation project from Supabase (Postgres) to PocketBase (self-hosted on Oracle Cloud Free Tier).

**Status:** Data migration scripts + schema definitions complete. Oracle provisioning pending (user task). SSR auth refactor pending (follow-up work unit).

---

## Directory Structure

```
migration/pocketbase/
├── README.md                          ← This file
├── pb_migrations/
│   ├── 1753123456_initial_schema.js   ← All 23 collection definitions + API Rules
│   └── 1753123457_seed_users.js       ← Admin user seed (others imported from backup)
├── pb_hooks/
│   └── documents_feed.pb.js           ← Custom route: GET /api/custom/documents-feed
├── scripts/
│   └── import_data.js                 ← pg_dump → PocketBase data import
├── API_RULES.md                       ← Full RLS → API Rules translation table
└── (generated) tm_archive.json.gz     ← Translation memory cold-storage archive
```

---

## Prerequisites

### For schema deployment
1. **PocketBase binary** (v0.39.10+) — `brew install pocketbase` or download from https://github.com/pocketbase/pocketbase/releases
2. **Node.js 18+** (for data import scripts)
3. **pocketbase npm package** — `npm install pocketbase`

### For the target server (Oracle Cloud Free Tier)
- ARM Ampere instance (2 OCPU/12GB RAM, 200GB block storage) running Linux (Ubuntu 22.04+ or Oracle Linux 8+)
- PocketBase binary for `linux/arm64`
- The `pb_migrations/` and `pb_hooks/` directories from this repo

---

## Quick Start (local testing)

### 1. Start a local PocketBase instance

```bash
# Install PocketBase
brew install pocketbase   # macOS
# OR download from: https://github.com/pocketbase/pocketbase/releases

# Create a scratch directory
mkdir -p /tmp/pb-test
cp -r migration/pocketbase/pb_migrations /tmp/pb-test/
cp -r migration/pocketbase/pb_hooks /tmp/pb-test/

# Start PocketBase (creates pb_data/ automatically, runs migrations on boot)
cd /tmp/pb-test
pocketbase serve --http 127.0.0.1:8090 --dir ./pb_data --migrationsDir ./pb_migrations
```

Visit `http://127.0.0.1:8090/_/` to create the first superuser account.

**IMPORTANT (verified against v0.39.10):** PocketBase does **NOT** auto-detect `pb_migrations/` from the current working directory — you must pass `--migrationsDir ./pb_migrations` explicitly, or custom JS migrations are **silently skipped** (only the built-in Go migrations run). Always confirm your custom migrations applied by checking the `_migrations` system table after boot.

### 2. Import data from the pg_dump backup

```bash
cd migration/pocketbase/scripts

node import_data.js \
  --pb-url http://127.0.0.1:8090 \
  --pb-email admin@kendo-translation.local \
  --pb-password TempAdmin2026! \
  --backup ../../../db_cluster-03-08-2026@16-47-28.backup \
  --batch-size 500
```

Expected output:
- `translation_memory` → archived to `tm_archive.json.gz` (NOT imported to PocketBase)
- 3 orphaned `reading_progress` rows → filtered out (referencing deleted article `91ed41bf-90d4-4ef3-88af-5f68d5ff41b1`)
- `articles` (672), `segments` (446,418), `terminology` (1,556), and ~15 smaller tables imported

### 3. Verify

```bash
# Check row counts via PocketBase API
curl -s http://127.0.0.1:8090/api/collections/articles/records?perPage=1 | jq '.totalItems'
# Expected: 672

curl -s http://127.0.0.1:8090/api/collections/segments/records?perPage=1 | jq '.totalItems'
# Expected: 446418

curl -s http://127.0.0.1:8090/api/collections/terminology/records?perPage=1 | jq '.totalItems'
# Expected: 1556

curl -s http://127.0.0.1:8090/api/collections/reading_progress/records?perPage=1 | jq '.totalItems'
# Expected: 36 (39 original - 3 orphaned)

# Test the custom documents-feed endpoint
curl -s "http://127.0.0.1:8090/api/custom/documents-feed?limit=5" | jq '.items | length'
# Expected: 5

# Test cursor pagination
curl -s "http://127.0.0.1:8090/api/custom/documents-feed?sort_by=title&sort_dir=asc&limit=5" | jq '{hasMore, next_cursor_sort_val, next_cursor_id}'
```

---

## Execution Order (when deploying to production)

1. **Provision Oracle Cloud Free Tier** ARM instance (user task — outside scope of this work unit)
2. **Install PocketBase** on the Oracle instance (`linux/arm64` binary)
3. **Copy migration files** to the instance:
   ```bash
   scp -r pb_migrations/ pb_hooks/ user@oracle-instance:/opt/pocketbase/
   ```
4. **Start PocketBase**:
   ```bash
   cd /opt/pocketbase
   ./pocketbase serve yourdomain.com --migrationsDir ./pb_migrations
   ```
   The `--migrationsDir` flag is **required** — without it, custom JS migrations are silently skipped (see note above).
5. **Create admin superuser** via Admin UI at `https://yourdomain.com/_/`
6. **Run data import** against the production PocketBase URL:
   ```bash
   node scripts/import_data.js \
     --pb-url https://yourdomain.com \
     --pb-email <admin-email> \
     --pb-password <admin-password> \
     --backup /path/to/db_cluster-03-08-2026@16-47-28.backup \
     --batch-size 500
   ```
7. **Seed remaining users** — the import script creates user records from `profiles` + `auth.users` backup data. Users will have temporary passwords and must reset via email on first login.
8. **Enable TLS** — if using a real domain, PocketBase auto-provisions Let's Encrypt certificates. For IP-only, use a reverse proxy (Caddy/nginx) or run without TLS initially.
9. **Point the Next.js app** at the new PocketBase URL (SSR auth refactor — follow-up work unit).

---

## Expected Runtime

| Phase | Rows | Estimated Time |
|---|---|---|
| Schema creation (auto-migrate) | — | < 5 seconds |
| Classify translations memory archive | 198,512 | ~30 seconds |
| articles import | 672 | < 30 seconds |
| segments import (446k rows) | 446,418 | ~40-60 minutes |
| terminology import | 1,556 | < 1 minute |
| All other tables (~2k rows) | ~2,000 | < 2 minutes |
| **Total** | **~650,000** | **~45-65 minutes** |

Throughput for the segments table at 500/batch is ~120-180 records/second over localhost REST API. Over a WAN connection to Oracle Cloud, throughput may be lower (~50-80/sec) due to network latency. For a faster initial import, run the import script from a machine co-located with the PocketBase instance (i.e., run it ON the Oracle instance).

---

## Dry-Run and Rollback

### Dry run
```bash
node scripts/import_data.js --dry-run --backup /path/to/backup ...
```
Parses the backup and reports row counts without writing to PocketBase.

### Rollback
Since this is a greenfield deployment (no existing PocketBase data to preserve):
- **Before import:** just delete and recreate `pb_data/` directory
- **After import:** stop PocketBase, delete `pb_data/data.db`, restart PocketBase (migrations will re-apply, leaving empty collections)

---

## Judgment Calls & Schema Ambiguities

### 1. `profiles` → merged into `users` auth collection
The original `profiles` table (7 rows) carried `username` + `role`. These are now custom fields on the PocketBase `users` auth collection. The `handle_new_user()` trigger's logic (auto-create profile on signup, default role = reader) is replaced by PocketBase's built-in record creation where default values are set on the collection field definitions.

### 2. `translator_id` → `translator` (relation field)
The Postgres column `translator_id` referencing `auth.users(id)` becomes a PocketBase `relation` field named `translator` (single-select, pointing to `users`). Same pattern for `user_id` → `user`, `article_id` → `article`, etc. PocketBase convention uses singular field names for single relations.

### 3. `public.users` table (0 rows) — skipped
The legacy `public.users` table was empty (all real auth was in `auth.users`). Not migrated.

### 4. `prompt_edits` table — skipped (empty)
No data in this audit table. Can be recreated from the schema definition if needed later.

### 5. `tags` (text[]) and `assigned_translators` (uuid[]) → `json`
PocketBase has no native array type. Stored as JSON. The frontend will need to JSON.parse() these fields.

### 6. Timestamp timezone handling
Postgres `timestamp with time zone` → PocketBase `date` (RFC3339). The import script converts `"2026-03-20 09:00:27.520254+00"` → `"2026-03-20T09:00:27.520Z"`.

### 7. UUIDs as PocketBase record IDs
PocketBase auto-generates 15-character alphanumeric IDs by default, but accepts custom IDs on record creation. We supply the existing UUIDs from Supabase as the record `id` field to preserve referential integrity across relation fields.

### 8. Bookmarks RLS policy ambiguity
Two overlapping policies existed on `bookmarks` (public + owner-only). In Postgres, multiple applicable policies are OR'd, so the effective behavior was fully public. We chose the stricter owner-only interpretation. **If anonymous bookmark access is actually needed**, change the listRule/viewRule to `""`.

### 9. Reading progress RLS — tightened from fully public
Original read/insert/update policies were `USING (true)` — fully open. Tightened to owner-based for PocketBase. This is a judgment call based on the nature of reading_progress data (per-user, no legitimate anonymous access).

---

## Gaps & Follow-up Work

### ⚠️ Critical — must complete before production use
1. **Oracle Cloud provisioning** — user task. ARM Ampere instance (2 OCPU/12GB), Ubuntu 22.04, install PocketBase `linux/arm64` binary.
2. **SSR auth refactor** — Replace `@supabase/ssr` with PocketBase JS SDK auth pattern in the Next.js app. PocketBase maintainer recommends client-side SPA pattern. Server Components currently reading cookies for auth need refactoring. See implementation-study report §9.5 for details. **Estimate: 1-2 days.**

### ⚠️ Recommended — improve security before going live
3. **`segments_update_phase_assigned` custom hook** — The most complex RLS policy (phase-assignment back-relation gating) is currently relaxed to a simple translator/admin check. Implement a PocketBase record update hook (`pb_hooks/segments_update.pb.js`) that enforces the original phase-assignment logic. See `API_RULES.md` §2 for the full policy detail. **Estimate: 0.5-1 day.**
4. **Password reset flow** — All 7 users must reset passwords (Supabase bcrypt hashes cannot be reused with PocketBase's PBKDF2). Configure SMTP settings in PocketBase Admin UI and trigger password-reset emails for all users after import.

### 💡 Nice-to-have — future enhancements
5. **FTS5 for segment search** — If ILIKE search across the 446k segments table becomes needed, add SQLite FTS5 virtual tables via a PocketBase migration. See implementation-study report §9.4.
6. **Back-relation API Rule performance testing** — The `segments_update_phase_assigned` back-relation check should be load-tested at real volume (446k segments) before going live. See GitHub #7444 for documented 50s-query risks.
7. **Real-time subscriptions** — PocketBase supports SSE-based real-time subscriptions (`pb.collection('segments').subscribe(...)`). Consider using these instead of polling for the translation workflow UI.
8. **Backup cron** — Set up periodic `pb_data/` directory snapshots (simple as `cp -r pb_data/ backup-$(date +%Y%m%d)/` or rsync to Oracle Object Storage).

---

## Environment Variables (for the Next.js app)

When the SSR auth refactor is done, the app will need:

```env
NEXT_PUBLIC_POCKETBASE_URL=https://yourdomain.com
# No secrets needed client-side (PocketBase auth is JWT-based)
# For server-side operations:
POCKETBASE_ADMIN_EMAIL=admin@yourdomain.com
POCKETBASE_ADMIN_PASSWORD=...
```

---

## References

- `db_cluster-03-08-2026@16-47-28.backup` — 760MB pg_dump cluster backup (ground-truth schema/data source)
- `.opencode/aki-research/report-2026-08-08-pocketbase-implementation-study.md` — Implementation reference
- `.opencode/aki-research/report-2026-08-08-pocketbase-appwrite-deepdive.md` — Platform selection
- `.opencode/aki-research/report-2026-08-08-zero-budget-options.md` — Oracle Cloud Free Tier details
- PocketBase docs: https://pocketbase.io/docs/
- PocketBase JS SDK: https://github.com/pocketbase/js-sdk
