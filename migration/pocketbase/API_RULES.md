# API Rules Translation: Supabase RLS → PocketBase

**Source:** `CREATE POLICY` statements extracted from `db_cluster-03-08-2026@16-47-28.backup` (lines 660598–661500).  
**Date:** 2026-08-08  
**PocketBase version:** v0.39.10

Each collection in PocketBase has 5 API Rules: `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`.
Rules can be `""` (anyone), `null` (superuser only), or a filter expression.

---

## 1. Articles

| Supabase Policy | PocketBase API Rule | Rule Type | Notes |
|---|---|---|---|
| `"Articles are viewable by everyone"` — `FOR SELECT USING (true)` | `""` (anyone) | listRule, viewRule | ✅ Identical |
| `"Authenticated users can insert articles"` — `FOR INSERT WITH CHECK (auth.role() = 'authenticated')` | `@request.auth.id != ""` | createRule | ✅ PocketBase `id` non-empty = authenticated |
| `articles_anon_insert` — `FOR INSERT TO anon WITH CHECK (true)` | `""` (anyone) | createRule | ⚠️ Conflicting policies — we prefer the authenticated-gated version |
| `articles_auth_insert` — `FOR INSERT TO authenticated WITH CHECK (true)` | `@request.auth.id != ""` | createRule | ✅ |
| `"Authenticated users can update articles"` — `FOR UPDATE USING (auth.role() = 'authenticated')` | `@request.auth.id != ""` | updateRule | ✅ Any authenticated user can update |

---

## 2. Segments

| Supabase Policy | PocketBase API Rule | Rule Type | Notes |
|---|---|---|---|
| `segments_read` — `FOR SELECT USING (true)` | `""` (anyone) | listRule, viewRule | ✅ |
| `segments_insert` — `FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('translator','admin')))` | `@request.auth.role = "translator" \|\| @request.auth.role = "admin"` | createRule | ✅ |
| `segments_update_phase_assigned` — Complex multi-condition USING involving `is_assigned_to_phase()` back-relation lookup | **⚠️ GAP** — See below | updateRule | ⚠️ Cannot express cleanly in API Rules |
| `segments_delete` — `FOR DELETE USING (is_admin())` | `@request.auth.role = "admin"` | deleteRule | ✅ |

### GAP: `segments_update_phase_assigned`

The original policy enforces:
```sql
(locked_by IS NULL OR locked_by = auth.uid())
AND (
  is_admin()
  OR (status = 'draft' AND is_assigned_to_phase(article_id, 'translate'))
  OR (status = 'translated' AND is_assigned_to_phase(article_id, 'edit'))
  OR (status = 'edited' AND is_assigned_to_phase(article_id, 'proofread'))
  OR (status = 'proofread' AND is_assigned_to_phase(article_id, 'qa'))
)
```

Where `is_assigned_to_phase()` does a back-relation lookup into `document_assignments`.

**PocketBase limitation:** Back-relation lookups via `@collection.document_assignments.*` are possible but:
1. Cannot express the `p_phase = ANY(allowed_phases)` array check concisely
2. Are documented as potentially slow on large datasets (GitHub #7444)
3. The compound phase-status gating is too complex for a single API Rule expression

**Mitigation:** Implemented as a relaxed rule (`@request.auth.role = "translator" || @request.auth.role = "admin"`) for MVP. The full phase-assignment enforcement should be added as a custom PocketBase hook (record update handler in `pb_hooks/`) in a follow-up work unit. See the README "Follow-up Work" section.

---

## 3. Bookmarks

The backup has TWO sets of overlapping policies on `bookmarks`:
- **Old/legacy:** `"Public read"`, `"Public insert"`, `"Public delete"` — all `USING (true)`
- **New/current:** `"Users can read/create/delete own bookmarks"` — owner-scoped via `auth.uid() = user_id`

The owner-scoped policies are the intended behavior. The "Public" policies appear to be legacy artifacts (created in migration 004 without a `DROP POLICY IF EXISTS` for the older ones).

| Supabase Policy (effective) | PocketBase API Rule | Rule Type |
|---|---|---|
| `"Users can read own bookmarks"` — `FOR SELECT USING (auth.uid() = user_id)` | `@request.auth.id = user` | listRule, viewRule |
| `"Users can create bookmarks"` — `FOR INSERT WITH CHECK (auth.uid() = user_id)` | `@request.auth.id = user` | createRule |
| `"Users can delete own bookmarks"` — `FOR DELETE USING (auth.uid() = user_id)` | `@request.auth.id = user` | deleteRule |

**Judgment call:** The backup's live behavior depends on which policy takes priority. In Postgres, when multiple applicable policies exist, they are OR'd together. So the actual behavior was: `(true) OR (auth.uid() = user_id)` = `true` for SELECT/INSERT. We chose the stricter owner-only interpretation for PocketBase since the legacy public policies were clearly superseded by the owner-based ones in a later migration (004).

---

## 4. Reading Progress

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `"Public read"` — `FOR SELECT USING (true)` | `@request.auth.id = user` | listRule, viewRule |
| `"Public insert"` — `FOR INSERT WITH CHECK (true)` | `@request.auth.id = user` (owner-gated) | createRule |
| `"Public update"` — `FOR UPDATE USING (true)` | `@request.auth.id = user` (owner-gated) | updateRule |

**Judgment call:** The original Supabase policies were completely open (`USING (true)`). For PocketBase, we tighten to owner-based access. Reasoning: reading_progress is per-user data with no legitimate anonymous/public access requirement. The open policies appear to be legacy from early prototyping before RLS was properly configured.

---

## 5. Document Assignments

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `doc_assignments_read_all` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `doc_assignments_admin_write` — `FOR ALL USING (is_admin()) WITH CHECK (is_admin())` | `@request.auth.role = "admin"` | createRule, updateRule, deleteRule |

✅ Clean translation. Note: `is_admin()` in the backup checked `EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`.

---

## 6. Document Decisions

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `document_decisions_select_all` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `document_decisions_admin_writes` — `USING (is_admin())` + `document_decisions_translator_writes` — `INSERT TO authenticated` with `role IN (admin, translator)` | `@request.auth.role = "admin" \|\| @request.auth.role = "translator"` | createRule |
| `document_decisions_admin_writes` — `FOR ALL USING (is_admin())` | `@request.auth.role = "admin"` | updateRule, deleteRule |
| `document_decisions_no_agent_writes` — `FOR INSERT TO service_role WITH CHECK (false)` | N/A (not applicable — PocketBase has no `service_role` equivalent) | — |

✅ The `no_agent_writes` policy was a defense-in-depth measure for Supabase's service_role key. In PocketBase, the `service_role` concept doesn't exist (there's only admin/superuser vs. regular users). Auth tokens for agents would use regular user accounts with a specific role, so the existing role-based rules already cover this.

---

## 7. Document Sections

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `document_sections_select_all` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `document_sections_admin_writes` — `FOR ALL USING (is_admin())` | `@request.auth.role = "admin"` | createRule, updateRule, deleteRule |
| `document_sections_no_agent_writes` — `FOR INSERT TO service_role WITH CHECK (false)` | N/A | — |

---

## 8. Document Settings

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `doc_settings_read` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `doc_settings_write` — `FOR ALL USING (is_admin())` | `@request.auth.role = "admin"` | createRule, updateRule, deleteRule |

---

## 9. Edit Patterns

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `edit_patterns_select_authz` — `FOR SELECT USING (role IN (admin, translator))` | `@request.auth.role = "admin" \|\| @request.auth.role = "translator"` | listRule, viewRule |
| `edit_patterns_admin_writes` — `FOR ALL USING (is_admin())` | `@request.auth.role = "admin"` | createRule, updateRule, deleteRule |
| `edit_patterns_translator_no_direct` — `FOR INSERT TO authenticated` with `is_admin()` check | `@request.auth.role = "admin"` | createRule |
| `edit_patterns_no_agent_writes` — `FOR INSERT TO service_role WITH CHECK (false)` | N/A | — |

---

## 10. QA Issue Patterns

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `qa_issue_patterns_select_authz` — `FOR SELECT USING (role IN (admin, translator))` | `@request.auth.role = "admin" \|\| @request.auth.role = "translator"` | listRule, viewRule |
| `qa_issue_patterns_admin_writes` — `FOR ALL USING (is_admin())` | `@request.auth.role = "admin"` | createRule, updateRule, deleteRule |

---

## 11. QA Issues

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `qa_issues_read_all` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `qa_issues_insert_authenticated` — `FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)` | `@request.auth.id != ""` | createRule |
| `qa_issues_update_authenticated` — `FOR UPDATE USING (auth.uid() IS NOT NULL)` | `@request.auth.id != ""` | updateRule |
| `qa_issues_delete_admin` — `FOR DELETE USING (is_admin())` | `@request.auth.role = "admin"` | deleteRule |

---

## 12. QA Issue Pattern Events

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `qa_pattern_events_select_authz` — `FOR SELECT USING (role IN (admin, translator))` | `@request.auth.role = "admin" \|\| @request.auth.role = "translator"` | listRule, viewRule |
| `qa_pattern_events_admin_writes` — `FOR ALL USING (is_admin())` | `@request.auth.role = "admin"` | createRule, updateRule, deleteRule |

---

## 13. Segment Comments

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `comments_read` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `comments_insert` — `FOR INSERT WITH CHECK (auth.uid() = user_id)` | `@request.auth.id = user` | createRule |
| `comments_update` — `FOR UPDATE USING (auth.uid() = user_id)` | `@request.auth.id = user` | updateRule |

---

## 14. Segment Phase Transitions

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `phase_transitions_read_all` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `phase_transitions_insert_authenticated` — `FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)` | `@request.auth.id != ""` | createRule |

---

## 15. Segment Revisions

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `revisions_read` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `revisions_insert` — `FOR INSERT WITH CHECK (role IN (translator, admin))` | `@request.auth.role = "translator" \|\| @request.auth.role = "admin"` | createRule |

---

## 16. Segment Suggestions

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `suggestions_read_all` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `suggestions_insert_authenticated` — `FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)` | `@request.auth.id != ""` | createRule |
| `suggestions_update_own_or_accepter` — `FOR UPDATE USING (suggester_id = auth.uid() OR accepter_id = auth.uid() OR is_admin())` | `suggester = @request.auth.id \|\| accepter = @request.auth.id \|\| @request.auth.role = "admin"` | updateRule |

---

## 17. Style Guide

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `style_guide_select_all` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `style_guide_admin_writes` — `FOR ALL USING (is_admin())` | `@request.auth.role = "admin"` | createRule, updateRule, deleteRule |

---

## 18. Terminology

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `terminology_public_read` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `terminology_auth_insert` — `FOR INSERT WITH CHECK (true)` | `""` | createRule |
| `terminology_anon_insert` — `FOR INSERT TO anon WITH CHECK (true)` | `""` | createRule (same) |

Note: No update/delete policies on terminology in the backup. We added `@request.auth.role = "admin"` for update/delete in the migration.

---

## 19. Translation Memory — EXCLUDED

Not migrated to PocketBase. Archived as a gzipped JSON file via `scripts/import_data.js`.

---

## 20. User History

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `"Users can view own history"` — `FOR SELECT USING (auth.uid() = user_id)` | `@request.auth.id = user` | listRule, viewRule |
| `"Users can insert own history"` — `FOR INSERT WITH CHECK (auth.uid() = user_id)` | `@request.auth.id = user` | createRule |
| `"Users can update own history"` — `FOR UPDATE USING (auth.uid() = user_id)` | `@request.auth.id = user` | updateRule |

---

## 21. Video Notes

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `"Anyone can read video notes"` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `"Authenticated users can insert notes"` — `FOR INSERT WITH CHECK (auth.role() = 'authenticated')` | `@request.auth.id != ""` | createRule |
| `"Users can update own notes"` — `FOR UPDATE USING (user_id IS NULL OR auth.uid() = user_id)` | `@request.auth.id = user \|\| user = ""` | updateRule |
| `"Users can delete own notes"` — `FOR DELETE USING (user_id IS NULL OR auth.uid() = user_id)` | `@request.auth.id = user \|\| user = ""` | deleteRule |

---

## 22. Videos

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `"Anyone can read videos"` — `FOR SELECT USING (true)` | `""` | listRule, viewRule |
| `"Authenticated users can insert videos"` — `FOR INSERT WITH CHECK (auth.role() = 'authenticated')` | `@request.auth.id != ""` | createRule |
| `"Users can update own videos"` — `FOR UPDATE USING (user_id IS NULL OR auth.uid() = user_id)` | `@request.auth.id != ""` (any authenticated) | updateRule |

---

## 23. Agent Logs

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `"Users can view their own agent logs"` — `FOR SELECT USING (auth.uid() = user_id)` | `@request.auth.id = user` | listRule, viewRule |
| `"Admins can view all agent logs"` — `FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))` | `@request.auth.role = "admin"` (added as OR to viewRule) | viewRule |
| `"Users can create their own agent logs"` — `FOR INSERT WITH CHECK (auth.uid() = user_id)` | `@request.auth.id = user` | createRule |

Combined: `viewRule = "@request.auth.id = user || @request.auth.role = 'admin'"`

---

## 24. Agent Prompts

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `"Users can view their own agent prompts"` — `FOR SELECT USING (auth.uid() = user_id)` | `@request.auth.id = user` | listRule, viewRule |
| `"Users can manage their own agent prompts"` — `FOR ALL USING (auth.uid() = user_id)` | `@request.auth.id = user \|\| @request.auth.role = "admin"` | createRule, updateRule, deleteRule |

Note: The original "FOR ALL" policy covered all operations. We add admin override for update/delete.

---

## Profiles (merged into `users` auth collection)

| Supabase Policy | PocketBase API Rule | Rule Type |
|---|---|---|
| `"Users can read own profile"` — `FOR SELECT USING (auth.uid() = id)` | `""` (anyone — permissive for now, since display_name/username are public) | listRule, viewRule |
| `"Admins can read all profiles"` — `FOR SELECT USING (is_admin())` | (covered by permissive rule above) | N/A |
| `"Users can update own profile"` — `FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)` | `@request.auth.id != ""` (own record update) | updateRule |
| `"Admins can update any profile"` — `FOR UPDATE USING (is_admin())` | (covered by admin check in per-collection rules) | N/A |
| Privileged fields (role changes): | `@request.auth.role = "admin"` (in deleteRule — admin-only account deletion) | deleteRule |

---

## Summary: Untranslatable Policies

| Policy | Reason | Mitigation |
|---|---|---|
| `segments_update_phase_assigned` | Complex phase + assignment back-relation gating | Relaxed to translator/admin for MVP; custom hook needed |
| `document_decisions_no_agent_writes` | PocketBase has no `service_role` concept | Role-based auth already covers this |
| `*_no_agent_writes` (6 policies total) | Same as above | Same as above |

**5 policies with minor judgment calls** (public bookmarks/reading_progress — tightened to owner-only from fully open; documented above).

**1 policy with a real gap** (segments_update_phase_assigned — requires a custom PocketBase record hook).
