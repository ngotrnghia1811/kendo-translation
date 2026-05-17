# Legacy unapplied migrations

These three files (`001_schema.sql`, `002_rls_policies.sql`, `003_realtime.sql`)
describe a **hypothetical baseline** for the Supabase database that was **never
actually applied** to the live project (`mbgmyvmsvenvtecvrjia`). The live DB was
inherited from the `_references/kendo-translation-v2` codebase plus some ad-hoc
patches, and diverges from these files in several places:

- `comments` table → live uses `segment_comments`
- `documents`-style references → live uses `articles` (with extra columns:
  `segmented`, `segment_count`, `title_ja`, `translator_id`, `source_url_{en,ja}`,
  `match_score`, `quality_score`)
- `segment_quality` table → never created live (and now intentionally absent
  in v1.2 contract)
- `is_translator()` helper → not present in live DB
- `profiles.role` default → live default is `'reader'`, files say `'viewer'`
- Live DB also has: `agent_logs`, `agent_prompts`, `bookmarks`,
  `reading_progress`, `terminology`, `translation_memory`, `user_history`,
  `users`, `video_notes`, `videos` (none of these are defined in these files)

These files are retained here for historical reference only. The current
authoritative baseline is `../000_baseline_snapshot.sql`, which was generated
from the live DB on 2026-05-16 (see `.opencode/aki-q/schema-audit-1778975112.md`
for the full audit trail).

**Do not run these files.** Any DDL changes should be authored as a new
numbered migration on top of `000_baseline_snapshot.sql`.
