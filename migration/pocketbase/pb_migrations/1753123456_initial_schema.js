/// <reference path="../pb_data/types.d.ts" />

/**
 * Kendo Translation — Initial PocketBase Schema
 *
 * Maps all ~23 collections from the Supabase pg_dump backup
 * (db_cluster-03-08-2026@16-47-28.backup) to PocketBase collections.
 *
 * Type mappings (Postgres → PocketBase):
 *   uuid          → text (passed as record id on create)
 *   varchar/text  → text
 *   integer       → number
 *   double/real   → number
 *   boolean       → bool
 *   timestamptz   → date (RFC3339 string)
 *   jsonb         → json
 *   text[]/uuid[] → json
 *
 * Collections excluded from migration:
 *   - translation_memory (198,512 rows) → archived separately
 *   - public.users (legacy table, 0 rows) → skipped
 *   - prompt_edits (empty per inspection) → skipped
 *
 * Auth: profiles table merged into users auth collection
 *       (role select field + username/display_name on users)
 *
 * IMPORTANT: PocketBase v0.39.10 pre-creates a "users" auth collection
 * on fresh start. This migration MODIFIES the existing users collection,
 * adding custom fields and setting API rules. All other collections
 * are created fresh.
 *
 * Verified against live PocketBase v0.39.10 — 2026-08-08.
 */

migrate((app) => {
    // ================================================================
    // 0. GRAB THE PRE-EXISTING USERS COLLECTION ID
    //    (PocketBase auto-creates "users" auth collection on first boot)
    // ================================================================
    const users = app.findCollectionByNameOrId("users");

    // ================================================================
    // 1. USERS (auth collection) — MODIFY EXISTING, not create new
    // ================================================================
    users.fields.add(
        new SelectField({
            name: "role",
            required: true,
            values: ["admin", "translator", "reader", "qa"],
            maxSelect: 1,
        })
    );
    users.fields.add(
        new TextField({ name: "username", required: false })
    );
    users.fields.add(
        new TextField({ name: "display_name", required: false })
    );

    users.listRule = "";
    users.viewRule = "";
    users.createRule = "";
    users.updateRule = "@request.auth.id != ''";
    users.deleteRule = "@request.auth.role = 'admin'";

    // Add index on role
    users.indexes.push("CREATE INDEX idx_users_role ON users (role)");

    app.save(users);

    const USERS_ID = users.id; // "_pb_users_auth_" — used for all relation fields below

    // ================================================================
    // 2. ARTICLES — FK: translator → users
    // ================================================================
    const articles = new Collection({
        type: "base",
        name: "articles",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "title",              type: "text",   required: true },
            { name: "title_ja",           type: "text",   required: false },
            { name: "content_ja",         type: "text",   required: false },
            { name: "content_en",         type: "text",   required: false },
            { name: "source_url",         type: "url",    required: false },
            { name: "source_url_en",      type: "url",    required: false },
            { name: "source_url_ja",      type: "url",    required: false },
            { name: "tags",               type: "json",   required: false },
            { name: "translation_status", type: "select", required: true,
              values: ["pending", "draft", "in_progress", "review", "translated",
                       "complete", "qa_approved", "approved", "published"],
              maxSelect: 1 },
            { name: "quality_score",      type: "number", required: false },
            { name: "match_score",        type: "number", required: false },
            { name: "segmented",          type: "bool",   required: false },
            { name: "segment_count",      type: "number", required: false },
            { name: "policy",             type: "json",   required: false },
            { name: "paired_pdf_path",    type: "text",   required: false },
            { name: "doc_type",           type: "select", required: true,
              values: ["article", "book"], maxSelect: 1 },
            { name: "author",             type: "text",   required: false },
            { name: "summary",            type: "text",   required: false },
            { name: "translator",         type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_articles_status ON articles (translation_status)",
            "CREATE INDEX idx_articles_doc_type ON articles (doc_type)",
            "CREATE INDEX idx_articles_translator ON articles (translator)",
            "CREATE INDEX idx_articles_segmented ON articles (segmented)",
        ],
    });
    app.save(articles);
    const ARTICLES_ID = articles.id;

    // ================================================================
    // 3. VIDEOS — FK: user_id → users
    // ================================================================
    const videos = new Collection({
        type: "base",
        name: "videos",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "youtube_id",         type: "text",   required: true },
            { name: "title",              type: "text",   required: true },
            { name: "description",        type: "text",   required: false },
            { name: "thumbnail_url",      type: "url",    required: false },
            { name: "duration_seconds",   type: "number", required: false },
            { name: "user",               type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_videos_youtube_id ON videos (youtube_id)",
        ],
    });
    app.save(videos);
    const VIDEOS_ID = videos.id;

    // ================================================================
    // 4. TERMINOLOGY — no FKs (promoted_by → users added inline)
    // ================================================================
    const terminology = new Collection({
        type: "base",
        name: "terminology",
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "source_term",        type: "text",   required: true },
            { name: "target_term",        type: "text",   required: true },
            { name: "reading",            type: "text",   required: false },
            { name: "domain",             type: "text",   required: false },
            { name: "term_type",          type: "text",   required: false },
            { name: "notes",              type: "text",   required: false },
            { name: "promotion_count",    type: "number", required: false },
            { name: "promotion_threshold",type: "number", required: false },
            { name: "promoted_at",        type: "date",   required: false },
            { name: "casing",             type: "text",   required: false },
            { name: "source_suggestion_id", type: "text", required: false },
            { name: "first_occurrence_per", type: "text", required: false },
            { name: "zh_notes",           type: "text",   required: false },
            { name: "promoted_by",        type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_terminology_source ON terminology (source_term)",
            "CREATE INDEX idx_terminology_target ON terminology (target_term)",
            "CREATE INDEX idx_terminology_reading ON terminology (reading)",
            "CREATE INDEX idx_terminology_domain ON terminology (domain)",
        ],
    });
    app.save(terminology);

    // ================================================================
    // 5. SEGMENTS — FK: article_id → articles, locked_by/translated_by/reviewed_by → users
    // ================================================================
    const segments = new Collection({
        type: "base",
        name: "segments",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'translator' || @request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'translator' || @request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "position",           type: "number", required: true },
            { name: "source_text",        type: "text",   required: true },
            { name: "target_text",        type: "text",   required: false },
            { name: "source_lang",        type: "text",   required: false },
            { name: "target_lang",        type: "text",   required: false },
            { name: "status",             type: "select", required: true,
              values: ["draft", "translated", "edited", "proofread", "qa_approved"],
              maxSelect: 1 },
            { name: "quality_detail",     type: "json",   required: false },
            { name: "metadata",           type: "json",   required: false },
            { name: "auto_accept_eligible", type: "bool", required: false },
            { name: "ruby_data",          type: "json",   required: false },
            { name: "article",            type: "relation", required: true,
              collectionId: ARTICLES_ID, cascadeDelete: false, maxSelect: 1 },
            { name: "locked_by",          type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
            { name: "locked_at",          type: "date",   required: false },
            { name: "translated_by",      type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
            { name: "reviewed_by",        type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_segments_article ON segments (article)",
            "CREATE INDEX idx_segments_article_pos ON segments (article, position)",
            "CREATE INDEX idx_segments_status ON segments (status)",
        ],
    });
    app.save(segments);
    const SEGMENTS_ID = segments.id;

    // ================================================================
    // 6-24: REMAINING COLLECTIONS — created in dependency order
    // ================================================================
    // (Each collection is defined with its fields and API rules per
    //  the API_RULES.md translation table. Relation fields use the
    //  actual collection IDs captured above.)

    // ── 6. Bookmarks ─────────────────────────────────────────────
    const bookmarks = new Collection({
        type: "base", name: "bookmarks",
        listRule: "@request.auth.id = user",
        viewRule: "@request.auth.id = user",
        createRule: "@request.auth.id = user",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
        fields: [
            { name: "content_type", type: "text", required: true },
            { name: "content_id",   type: "text", required: true },
            { name: "title",        type: "text", required: false },
            { name: "user",         type: "relation", required: true,
              collectionId: USERS_ID, cascadeDelete: true, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_bookmarks_user ON bookmarks (user)",
            "CREATE UNIQUE INDEX idx_bookmarks_user_content ON bookmarks (user, content_type, content_id)",
        ],
    });
    app.save(bookmarks);

    // ── 7. Reading Progress ──────────────────────────────────────
    const readingProgress = new Collection({
        type: "base", name: "reading_progress",
        listRule: "@request.auth.id = user",
        viewRule: "@request.auth.id = user",
        createRule: "@request.auth.id = user",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
        fields: [
            { name: "content_type",  type: "text",   required: true },
            { name: "content_id",    type: "text",   required: true },
            { name: "progress_pct",  type: "number", required: false },
            { name: "last_position", type: "number", required: false },
            { name: "user",          type: "relation", required: true,
              collectionId: USERS_ID, cascadeDelete: true, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_reading_progress_user ON reading_progress (user)",
            "CREATE UNIQUE INDEX idx_reading_progress_user_content ON reading_progress (user, content_type, content_id)",
        ],
    });
    app.save(readingProgress);

    // ── 8. Document Assignments ──────────────────────────────────
    const documentAssignments = new Collection({
        type: "base", name: "document_assignments",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "allowed_phases", type: "json", required: false },
            { name: "user",           type: "relation", required: true,
              collectionId: USERS_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "document",       type: "relation", required: true,
              collectionId: ARTICLES_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "assigned_by",    type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_doc_assignments_user ON document_assignments (user)",
            "CREATE INDEX idx_doc_assignments_document ON document_assignments (document)",
        ],
    });
    app.save(documentAssignments);

    // ── 9. Document Decisions ────────────────────────────────────
    const documentDecisions = new Collection({
        type: "base", name: "document_decisions",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'admin' || @request.auth.role = 'translator'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "decision_kind", type: "text", required: true },
            { name: "body",          type: "text", required: true },
            { name: "section_id",    type: "text", required: false },
            { name: "article",       type: "relation", required: true,
              collectionId: ARTICLES_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "set_by",        type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_doc_decisions_article ON document_decisions (article)",
        ],
    });
    app.save(documentDecisions);

    // ── 10. Document Sections ────────────────────────────────────
    const documentSections = new Collection({
        type: "base", name: "document_sections",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "position",      type: "number", required: true },
            { name: "title",         type: "text",   required: false },
            { name: "start_segment", type: "text",   required: false },
            { name: "end_segment",   type: "text",   required: false },
            { name: "summary",       type: "text",   required: false },
            { name: "article",       type: "relation", required: true,
              collectionId: ARTICLES_ID, cascadeDelete: true, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_doc_sections_article ON document_sections (article)",
        ],
    });
    app.save(documentSections);

    // ── 11. Document Settings ────────────────────────────────────
    const documentSettings = new Collection({
        type: "base", name: "document_settings",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "source_lang",          type: "text",   required: false },
            { name: "target_lang",          type: "text",   required: false },
            { name: "paragraph_boundaries", type: "json",   required: false },
            { name: "total_segments",       type: "number", required: false },
            { name: "translated_count",     type: "number", required: false },
            { name: "reviewed_count",       type: "number", required: false },
            { name: "approved_count",       type: "number", required: false },
            { name: "assigned_translators", type: "json",   required: false },
            { name: "publish_filter",       type: "text",   required: false },
            { name: "article",              type: "relation", required: true,
              collectionId: ARTICLES_ID, cascadeDelete: true, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_doc_settings_article ON document_settings (article)",
        ],
    });
    app.save(documentSettings);

    // ── 12. Edit Patterns ────────────────────────────────────────
    const editPatterns = new Collection({
        type: "base", name: "edit_patterns",
        listRule: "@request.auth.role = 'admin' || @request.auth.role = 'translator'",
        viewRule: "@request.auth.role = 'admin' || @request.auth.role = 'translator'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "before_phrase",       type: "text",   required: true },
            { name: "after_phrase",        type: "text",   required: true },
            { name: "rationale",           type: "text",   required: false },
            { name: "approach",            type: "text",   required: false },
            { name: "confirmation_count",  type: "number", required: false },
            { name: "domain",              type: "text",   required: false },
            { name: "source_suggestion_id",type: "text",   required: false },
            { name: "created_by",          type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_edit_patterns_domain ON edit_patterns (domain)",
        ],
    });
    app.save(editPatterns);

    // ── 13. QA Issue Patterns ────────────────────────────────────
    const qaIssuePatterns = new Collection({
        type: "base", name: "qa_issue_patterns",
        listRule: "@request.auth.role = 'admin' || @request.auth.role = 'translator'",
        viewRule: "@request.auth.role = 'admin' || @request.auth.role = 'translator'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "pattern_name",       type: "text",   required: true },
            { name: "category",           type: "text",   required: true },
            { name: "description",        type: "text",   required: true },
            { name: "detection_hint",     type: "text",   required: false },
            { name: "confirmation_count", type: "number", required: false },
            { name: "dismissal_count",    type: "number", required: false },
            { name: "needs_chapter_scan", type: "bool",   required: false },
            { name: "severity_default",   type: "text",   required: false },
        ],
    });
    app.save(qaIssuePatterns);
    const QA_ISSUE_PATTERNS_ID = qaIssuePatterns.id;

    // ── 14. QA Issues ────────────────────────────────────────────
    const qaIssues = new Collection({
        type: "base", name: "qa_issues",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "category",    type: "select", required: true,
              values: ["Mistranslation", "Terminology", "Register/Keigo",
                       "Fluency", "Cultural-adaptation", "Omission/Addition", "Style"],
              maxSelect: 1 },
            { name: "severity",    type: "select", required: true,
              values: ["minor", "major", "critical"], maxSelect: 1 },
            { name: "char_start",  type: "number", required: false },
            { name: "char_end",    type: "number", required: false },
            { name: "body",        type: "text",   required: false },
            { name: "author_kind", type: "select", required: true,
              values: ["human", "agent"], maxSelect: 1 },
            { name: "resolved",    type: "bool",   required: false },
            { name: "resolved_at", type: "date",   required: false },
            { name: "segment",     type: "relation", required: true,
              collectionId: SEGMENTS_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "author",      type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
            { name: "resolved_by", type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_qa_issues_segment ON qa_issues (segment)",
        ],
    });
    app.save(qaIssues);
    const QA_ISSUES_ID = qaIssues.id;

    // ── 15. QA Issue Pattern Events ──────────────────────────────
    const qaIssuePatternEvents = new Collection({
        type: "base", name: "qa_issue_pattern_events",
        listRule: "@request.auth.role = 'admin' || @request.auth.role = 'translator'",
        viewRule: "@request.auth.role = 'admin' || @request.auth.role = 'translator'",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "outcome",          type: "text",   required: true },
            { name: "dismissal_reason", type: "text",   required: false },
            { name: "agent_confidence", type: "number", required: false },
            { name: "pattern",          type: "relation", required: true,
              collectionId: QA_ISSUE_PATTERNS_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "qa_issue",         type: "relation", required: true,
              collectionId: QA_ISSUES_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "triaged_by",       type: "relation", required: true,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
    });
    app.save(qaIssuePatternEvents);

    // ── 16. Segment Comments ─────────────────────────────────────
    const segmentComments = new Collection({
        type: "base", name: "segment_comments",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id = user",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user || @request.auth.role = 'admin'",
        fields: [
            { name: "content",          type: "text", required: true },
            { name: "resolved",         type: "bool", required: false },
            { name: "parent_comment_id",type: "text", required: false },
            { name: "mentions",         type: "json", required: false },
            { name: "segment",          type: "relation", required: true,
              collectionId: SEGMENTS_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "user",             type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_segment_comments_segment ON segment_comments (segment)",
        ],
    });
    app.save(segmentComments);

    // ── 17. Segment Phase Transitions ────────────────────────────
    const segmentPhaseTransitions = new Collection({
        type: "base", name: "segment_phase_transitions",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "from_status",       type: "text", required: true },
            { name: "to_status",         type: "text", required: true },
            { name: "acknowledged_minor",type: "bool", required: false },
            { name: "note",              type: "text", required: false },
            { name: "segment",           type: "relation", required: true,
              collectionId: SEGMENTS_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "actor",             type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_phase_transitions_segment ON segment_phase_transitions (segment)",
        ],
    });
    app.save(segmentPhaseTransitions);

    // ── 18. Segment Revisions ────────────────────────────────────
    const segmentRevisions = new Collection({
        type: "base", name: "segment_revisions",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'translator' || @request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "target_text",   type: "text",   required: true },
            { name: "quality_score", type: "number", required: false },
            { name: "segment",       type: "relation", required: true,
              collectionId: SEGMENTS_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "edited_by",     type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_segment_revisions_segment ON segment_revisions (segment)",
        ],
    });
    app.save(segmentRevisions);

    // ── 19. Segment Suggestions ──────────────────────────────────
    const segmentSuggestions = new Collection({
        type: "base", name: "segment_suggestions",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != ''",
        updateRule: "suggester = @request.auth.id || accepter = @request.auth.id || @request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "proposed_text", type: "text",   required: true },
            { name: "suggester_kind",type: "select", required: true,
              values: ["human", "agent"], maxSelect: 1 },
            { name: "status",        type: "select", required: true,
              values: ["pending", "accepted", "rejected", "superseded"], maxSelect: 1 },
            { name: "accepted_at",   type: "date",   required: false },
            { name: "auto_accepted", type: "bool",   required: false },
            { name: "segment",       type: "relation", required: true,
              collectionId: SEGMENTS_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "suggester",     type: "relation", required: true,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
            { name: "accepter",      type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_segment_suggestions_segment ON segment_suggestions (segment)",
            "CREATE INDEX idx_segment_suggestions_suggester ON segment_suggestions (suggester)",
        ],
    });
    app.save(segmentSuggestions);

    // ── 20. Style Guide ──────────────────────────────────────────
    const styleGuide = new Collection({
        type: "base", name: "style_guide",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "scope",               type: "text", required: true },
            { name: "scope_ref",           type: "text", required: false },
            { name: "rule_category",       type: "text", required: true },
            { name: "pattern",             type: "text", required: true },
            { name: "policy",              type: "text", required: true },
            { name: "rationale",           type: "text", required: false },
            { name: "confirmation_count",  type: "number", required: false },
            { name: "status",              type: "text", required: false },
            { name: "source_suggestion_id",type: "text", required: false },
            { name: "created_by",          type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
    });
    app.save(styleGuide);

    // ── 21. User History ─────────────────────────────────────────
    const userHistory = new Collection({
        type: "base", name: "user_history",
        listRule: "@request.auth.id = user",
        viewRule: "@request.auth.id = user",
        createRule: "@request.auth.id = user",
        updateRule: "@request.auth.id = user",
        deleteRule: "@request.auth.id = user",
        fields: [
            { name: "item_type",     type: "select", required: true,
              values: ["article", "video"], maxSelect: 1 },
            { name: "item_id",       type: "text",   required: true },
            { name: "item_title",    type: "text",   required: true },
            { name: "last_position", type: "number", required: false },
            { name: "user",          type: "relation", required: true,
              collectionId: USERS_ID, cascadeDelete: true, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_user_history_user ON user_history (user)",
        ],
    });
    app.save(userHistory);

    // ── 22. Video Notes ──────────────────────────────────────────
    const videoNotes = new Collection({
        type: "base", name: "video_notes",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id = user || user = ''",
        deleteRule: "@request.auth.id = user || user = ''",
        fields: [
            { name: "start_time", type: "number", required: true },
            { name: "end_time",   type: "number", required: false },
            { name: "text",       type: "text",   required: true },
            { name: "note_text",  type: "text",   required: false },
            { name: "video",      type: "relation", required: false,
              collectionId: VIDEOS_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "user",       type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_video_notes_video ON video_notes (video)",
        ],
    });
    app.save(videoNotes);

    // ── 23. Agent Logs ───────────────────────────────────────────
    const agentLogs = new Collection({
        type: "base", name: "agent_logs",
        listRule: "@request.auth.id = user",
        viewRule: "@request.auth.id = user || @request.auth.role = 'admin'",
        createRule: "@request.auth.id = user",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "agent_type",        type: "text",   required: true },
            { name: "model",             type: "text",   required: true },
            { name: "system_prompt",     type: "text",   required: false },
            { name: "user_prompt",       type: "text",   required: true },
            { name: "response",          type: "text",   required: false },
            { name: "prompt_tokens",     type: "number", required: false },
            { name: "completion_tokens", type: "number", required: false },
            { name: "duration_ms",       type: "number", required: false },
            { name: "error",             type: "text",   required: false },
            { name: "user",              type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "article",           type: "relation", required: false,
              collectionId: ARTICLES_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "video",             type: "relation", required: false,
              collectionId: VIDEOS_ID, cascadeDelete: true, maxSelect: 1 },
        ],
        indexes: [
            "CREATE INDEX idx_agent_logs_user ON agent_logs (user)",
            // NOTE: PocketBase manages `created` as a system autodate field.
            // Do not create indexes on system fields — they use internal column names.
        ],
    });
    app.save(agentLogs);

    // ── 24. Agent Prompts ────────────────────────────────────────
    const agentPrompts = new Collection({
        type: "base", name: "agent_prompts",
        listRule: "@request.auth.id = user",
        viewRule: "@request.auth.id = user || @request.auth.role = 'admin'",
        createRule: "@request.auth.id = user",
        updateRule: "@request.auth.id = user || @request.auth.role = 'admin'",
        deleteRule: "@request.auth.id = user || @request.auth.role = 'admin'",
        fields: [
            { name: "agent_type", type: "text",   required: true },
            { name: "approach",   type: "text",   required: false },
            { name: "template",   type: "text",   required: true },
            { name: "active",     type: "bool",   required: false },
            { name: "version",    type: "number", required: false },
            { name: "user",       type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: true, maxSelect: 1 },
            { name: "edited_by",  type: "relation", required: false,
              collectionId: USERS_ID, cascadeDelete: false, maxSelect: 1 },
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_agent_prompts_user_type ON agent_prompts (user, agent_type, approach)",
        ],
    });
    app.save(agentPrompts);
}, (app) => {
    // Down migration: drop all created collections in reverse order,
    // then remove custom fields from the pre-existing users collection.

    const createdNames = [
        "agent_prompts", "agent_logs",
        "video_notes", "user_history", "style_guide",
        "segment_suggestions", "segment_revisions", "segment_phase_transitions",
        "segment_comments", "qa_issue_pattern_events", "qa_issues",
        "qa_issue_patterns", "edit_patterns",
        "document_settings", "document_sections", "document_decisions",
        "document_assignments",
        "reading_progress", "bookmarks",
        "segments",
        "terminology",
        "videos",
        "articles",
    ];
    for (const name of createdNames) {
        try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
    }

    // Remove custom fields from users (the pre-existing collection)
    try {
        const users = app.findCollectionByNameOrId("users");
        ["role", "username", "display_name"].forEach(fn => {
            try { users.fields.removeByName(fn); } catch (_) {}
        });
        // Remove our custom index
        users.indexes = users.indexes.filter(i => !i.includes("idx_users_role"));
        // Reset rules to defaults
        users.listRule = null;
        users.viewRule = null;
        users.createRule = null;
        users.updateRule = null;
        users.deleteRule = null;
        app.save(users);
    } catch (_) {}
});
