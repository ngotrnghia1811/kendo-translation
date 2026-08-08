#!/usr/bin/env node

/**
 * Data import script: pg_dump backup → PocketBase
 *
 * Parses the 760MB pg_dump cluster backup (plain-text format,
 * db_cluster-03-08-2026@16-47-28.backup) and imports all
 * relevant tables into a running PocketBase instance.
 *
 * Usage:
 *   node scripts/import_data.js \
 *     --pb-url http://127.0.0.1:8090 \
 *     --pb-email admin@kendo-translation.local \
 *     --pb-password TempAdmin2026! \
 *     --backup ../db_cluster-03-08-2026@16-47-28.backup \
 *     [--dry-run] [--batch-size 500] [--start-table articles] [--skip-to segments]
 *
 * Strategy:
 *   - Stream-parse the pg_dump COPY blocks using a line-based parser
 *   - Map Postgres types → PocketBase field types
 *   - Import small tables (< 5000 rows) via PocketBase JS SDK batch create
 *   - Import large table (segments, 446k rows) with configurable batch size
 *   - Archive translation_memory to a flat JSON file (NOT imported)
 *   - Filter out 3 orphaned reading_progress rows (content_id=91ed41bf...)
 *
 * Dependencies:
 *   npm install pocketbase progress (optional, for progress bars)
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { createGzip } = require("zlib");
const { pipeline } = require("stream/promises");

// ── CLI argument parsing ──────────────────────────────────────────
function parseArgs() {
    const args = {
        pbUrl: "",
        pbEmail: "",
        pbPassword: "",
        backupPath: "",
        dryRun: false,
        batchSize: 500,
        startTable: null,
        skipTo: null,
        archiveTmPath: "",
    };

    for (let i = 2; i < process.argv.length; i++) {
        const arg = process.argv[i];
        switch (arg) {
            case "--pb-url":       args.pbUrl = process.argv[++i]; break;
            case "--pb-email":     args.pbEmail = process.argv[++i]; break;
            case "--pb-password":  args.pbPassword = process.argv[++i]; break;
            case "--backup":       args.backupPath = process.argv[++i]; break;
            case "--dry-run":      args.dryRun = true; break;
            case "--batch-size":   args.batchSize = parseInt(process.argv[++i], 10) || 500; break;
            case "--start-table":  args.startTable = process.argv[++i]; break;
            case "--skip-to":      args.skipTo = process.argv[++i]; break;
            case "--archive-tm":   args.archiveTmPath = process.argv[++i]; break;
            case "--help":
                console.log(`
Usage: node import_data.js [options]

Required:
  --pb-url URL         PocketBase instance URL (e.g. http://127.0.0.1:8090)
  --pb-email EMAIL     PocketBase admin email
  --pb-password PASS   PocketBase admin password
  --backup PATH        Path to pg_dump backup file

Optional:
  --dry-run            Parse and validate, but don't write to PocketBase
  --batch-size N       Records per batch create (default: 500)
  --start-table NAME   Only process tables starting from NAME (for resume)
  --skip-to NAME       Skip to specific table only
  --archive-tm PATH    Output path for translation_memory archive (default: ./tm_archive.json.gz)
  --help               Show this message
`);
                process.exit(0);
        }
    }

    if (!args.pbUrl || !args.pbEmail || !args.pbPassword || !args.backupPath) {
        console.error("ERROR: --pb-url, --pb-email, --pb-password, and --backup are required.");
        console.error("Run with --help for usage.");
        process.exit(1);
    }

    if (!args.archiveTmPath) {
        args.archiveTmPath = path.join(__dirname, "tm_archive.json.gz");
    }

    return args;
}

// ── PocketBase client setup ───────────────────────────────────────
let PocketBase;
try {
    PocketBase = require("pocketbase");
} catch {
    console.error("ERROR: 'pocketbase' npm package not found. Run: npm install pocketbase");
    process.exit(1);
}

async function createPbClient(args) {
    const pb = new PocketBase(args.pbUrl);
    if (!args.dryRun) {
        console.log(`Authenticating to PocketBase at ${args.pbUrl}...`);
        await pb.collection("users").authWithPassword(args.email, args.password);
        console.log(`Authenticated as ${pb.authStore.record.email} (role: ${pb.authStore.record.role})`);
    }
    return pb;
}

// ── Table registry ────────────────────────────────────────────────
// Maps Postgres table names to PocketBase collection names + field mappings.
// "exclude" = skip entirely (translation_memory, public.users, auth.*, etc.)
const TABLE_REGISTRY = {
    "public.articles": {
        collection: "articles",
        fields: [
            "id", "title", "created_at", "content_ja", "content_en",
            "source_url", "tags", "translation_status", "quality_score",
            "updated_at", "source_url_en", "source_url_ja", "match_score",
            "title_ja", "translator_id", "segmented", "segment_count",
            "policy", "paired_pdf_path", "doc_type", "author", "summary",
        ],
        fieldMap: {
            "id":                  { key: "id",                  type: "text" },
            "title":               { key: "title",               type: "text" },
            "created_at":          { key: "created",             type: "date" },
            "content_ja":          { key: "content_ja",          type: "text" },
            "content_en":          { key: "content_en",          type: "text" },
            "source_url":          { key: "source_url",          type: "text" },
            "tags":                { key: "tags",                type: "json" },
            "translation_status":  { key: "translation_status",  type: "text" },
            "quality_score":       { key: "quality_score",       type: "number" },
            "updated_at":          { key: "updated",             type: "date" },
            "source_url_en":       { key: "source_url_en",       type: "text" },
            "source_url_ja":       { key: "source_url_ja",       type: "text" },
            "match_score":         { key: "match_score",         type: "number" },
            "title_ja":            { key: "title_ja",            type: "text" },
            "translator_id":       { key: "translator",          type: "text" },
            "segmented":           { key: "segmented",           type: "bool" },
            "segment_count":       { key: "segment_count",       type: "number" },
            "policy":              { key: "policy",              type: "json" },
            "paired_pdf_path":     { key: "paired_pdf_path",     type: "text" },
            "doc_type":            { key: "doc_type",            type: "text" },
            "author":              { key: "author",              type: "text" },
            "summary":             { key: "summary",             type: "text" },
        },
    },
    "public.segments": {
        collection: "segments",
        fields: [
            "id", "article_id", "position", "source_text", "target_text",
            "source_lang", "target_lang", "status", "locked_by", "locked_at",
            "translated_by", "reviewed_by", "quality_detail", "metadata",
            "created_at", "updated_at", "auto_accept_eligible", "ruby_data",
        ],
        fieldMap: {
            "id":                   { key: "id",                    type: "text" },
            "article_id":           { key: "article",               type: "text" },
            "position":             { key: "position",              type: "number" },
            "source_text":          { key: "source_text",           type: "text" },
            "target_text":          { key: "target_text",           type: "text" },
            "source_lang":          { key: "source_lang",           type: "text" },
            "target_lang":          { key: "target_lang",           type: "text" },
            "status":               { key: "status",                type: "text" },
            "locked_by":            { key: "locked_by",             type: "text" },
            "locked_at":            { key: "locked_at",             type: "date" },
            "translated_by":        { key: "translated_by",         type: "text" },
            "reviewed_by":          { key: "reviewed_by",           type: "text" },
            "quality_detail":       { key: "quality_detail",        type: "json" },
            "metadata":             { key: "metadata",              type: "json" },
            "created_at":           { key: "created",               type: "date" },
            "updated_at":           { key: "updated",               type: "date" },
            "auto_accept_eligible": { key: "auto_accept_eligible",  type: "bool" },
            "ruby_data":            { key: "ruby_data",             type: "json" },
        },
    },
    "public.terminology": {
        collection: "terminology",
        fields: [
            "id", "source_term", "target_term", "reading", "domain",
            "term_type", "notes", "created_at", "promotion_count",
            "promotion_threshold", "promoted_at", "promoted_by",
            "casing", "source_suggestion_id", "first_occurrence_per", "zh_notes",
        ],
        fieldMap: {
            "id":                   { key: "id",                    type: "text" },
            "source_term":          { key: "source_term",           type: "text" },
            "target_term":          { key: "target_term",           type: "text" },
            "reading":              { key: "reading",               type: "text" },
            "domain":               { key: "domain",                type: "text" },
            "term_type":            { key: "term_type",             type: "text" },
            "notes":                { key: "notes",                 type: "text" },
            "created_at":           { key: "created",               type: "date" },
            "promotion_count":      { key: "promotion_count",       type: "number" },
            "promotion_threshold":  { key: "promotion_threshold",   type: "number" },
            "promoted_at":          { key: "promoted_at",           type: "date" },
            "promoted_by":          { key: "promoted_by",           type: "text" },
            "casing":               { key: "casing",                type: "text" },
            "source_suggestion_id": { key: "source_suggestion_id",  type: "text" },
            "first_occurrence_per": { key: "first_occurrence_per",  type: "text" },
            "zh_notes":             { key: "zh_notes",              type: "text" },
        },
    },
    "public.profiles": {
        collection: "users",  // Merged into users auth collection
        fields: ["id", "username", "role", "created_at", "updated_at"],
        fieldMap: {
            "id":         { key: "id",       type: "text" },
            "username":   { key: "username", type: "text" },
            "role":       { key: "role",     type: "text" },
            "created_at": { key: "created",  type: "date" },
            "updated_at": { key: "updated",  type: "date" },
        },
        /**
         * Custom transformer: profiles rows need special handling.
         * The auth.users table has the real emails and passwords.
         * Profiles only carry username + role. We merge them during import
         * by matching profile.id with the corresponding auth user.
         * For now, we just update the existing users collection records.
         */
    },
    "public.reading_progress": {
        collection: "reading_progress",
        fields: [
            "id", "user_id", "content_type", "content_id",
            "progress_pct", "last_position", "updated_at",
        ],
        fieldMap: {
            "id":            { key: "id",            type: "text" },
            "user_id":       { key: "user",          type: "text" },
            "content_type":  { key: "content_type",  type: "text" },
            "content_id":    { key: "content_id",    type: "text" },
            "progress_pct":  { key: "progress_pct",  type: "number" },
            "last_position": { key: "last_position", type: "number" },
            "updated_at":    { key: "updated",       type: "date" },
        },
        // Filter: orphaned rows referencing deleted article
        // 91ed41bf-90d4-4ef3-88af-5f68d5ff41b1 are excluded
        rowFilter: (row) => {
            if (row.content_type === "article" &&
                row.content_id === "91ed41bf-90d4-4ef3-88af-5f68d5ff41b1") {
                return false;
            }
            return true;
        },
    },
    "public.bookmarks": {
        collection: "bookmarks",
        fields: ["id", "user_id", "content_type", "content_id", "title", "created_at"],
        fieldMap: {
            "id":           { key: "id",           type: "text" },
            "user_id":      { key: "user",         type: "text" },
            "content_type": { key: "content_type", type: "text" },
            "content_id":   { key: "content_id",   type: "text" },
            "title":        { key: "title",        type: "text" },
            "created_at":   { key: "created",      type: "date" },
        },
    },
    "public.document_assignments": {
        collection: "document_assignments",
        fields: [
            "id", "user_id", "document_id", "allowed_phases",
            "assigned_by", "created_at", "updated_at",
        ],
        fieldMap: {
            "id":             { key: "id",             type: "text" },
            "user_id":        { key: "user",           type: "text" },
            "document_id":    { key: "document",       type: "text" },
            "allowed_phases": { key: "allowed_phases", type: "json" },
            "assigned_by":    { key: "assigned_by",    type: "text" },
            "created_at":     { key: "created",        type: "date" },
            "updated_at":     { key: "updated",        type: "date" },
        },
    },
    "public.document_decisions": {
        collection: "document_decisions",
        fields: [
            "id", "article_id", "section_id", "decision_kind",
            "body", "set_by", "created_at",
        ],
        fieldMap: {
            "id":            { key: "id",            type: "text" },
            "article_id":    { key: "article",       type: "text" },
            "section_id":    { key: "section_id",    type: "text" },
            "decision_kind": { key: "decision_kind", type: "text" },
            "body":          { key: "body",          type: "text" },
            "set_by":        { key: "set_by",        type: "text" },
            "created_at":    { key: "created",       type: "date" },
        },
    },
    "public.document_sections": {
        collection: "document_sections",
        fields: [
            "id", "article_id", "position", "title",
            "start_segment", "end_segment", "summary", "created_at",
        ],
        fieldMap: {
            "id":            { key: "id",            type: "text" },
            "article_id":    { key: "article",       type: "text" },
            "position":      { key: "position",      type: "number" },
            "title":         { key: "title",         type: "text" },
            "start_segment": { key: "start_segment", type: "text" },
            "end_segment":   { key: "end_segment",   type: "text" },
            "summary":       { key: "summary",       type: "text" },
            "created_at":    { key: "created",       type: "date" },
        },
    },
    "public.document_settings": {
        collection: "document_settings",
        fields: [
            "id", "article_id", "source_lang", "target_lang",
            "paragraph_boundaries", "total_segments", "translated_count",
            "reviewed_count", "approved_count", "assigned_translators",
            "created_at", "updated_at", "publish_filter",
        ],
        fieldMap: {
            "id":                    { key: "id",                    type: "text" },
            "article_id":            { key: "article",               type: "text" },
            "source_lang":           { key: "source_lang",           type: "text" },
            "target_lang":           { key: "target_lang",           type: "text" },
            "paragraph_boundaries":  { key: "paragraph_boundaries",  type: "json" },
            "total_segments":        { key: "total_segments",        type: "number" },
            "translated_count":      { key: "translated_count",      type: "number" },
            "reviewed_count":        { key: "reviewed_count",        type: "number" },
            "approved_count":        { key: "approved_count",        type: "number" },
            "assigned_translators":  { key: "assigned_translators",  type: "json" },
            "created_at":            { key: "created",               type: "date" },
            "updated_at":            { key: "updated",               type: "date" },
            "publish_filter":        { key: "publish_filter",        type: "text" },
        },
    },
    "public.edit_patterns": {
        collection: "edit_patterns",
        fields: [
            "id", "before_phrase", "after_phrase", "rationale", "approach",
            "confirmation_count", "domain", "source_suggestion_id",
            "created_by", "created_at", "updated_at",
        ],
        fieldMap: {
            "id":                   { key: "id",                    type: "text" },
            "before_phrase":        { key: "before_phrase",         type: "text" },
            "after_phrase":         { key: "after_phrase",          type: "text" },
            "rationale":            { key: "rationale",             type: "text" },
            "approach":             { key: "approach",              type: "text" },
            "confirmation_count":   { key: "confirmation_count",    type: "number" },
            "domain":               { key: "domain",                type: "text" },
            "source_suggestion_id": { key: "source_suggestion_id",  type: "text" },
            "created_by":           { key: "created_by",            type: "text" },
            "created_at":           { key: "created",               type: "date" },
            "updated_at":           { key: "updated",               type: "date" },
        },
    },
    "public.qa_issue_pattern_events": {
        collection: "qa_issue_pattern_events",
        fields: [
            "id", "pattern_id", "qa_issue_id", "outcome",
            "triaged_by", "triaged_at", "dismissal_reason", "agent_confidence",
        ],
        fieldMap: {
            "id":                { key: "id",                type: "text" },
            "pattern_id":        { key: "pattern",           type: "text" },
            "qa_issue_id":       { key: "qa_issue",          type: "text" },
            "outcome":           { key: "outcome",           type: "text" },
            "triaged_by":        { key: "triaged_by",        type: "text" },
            "triaged_at":        { key: "triaged_at",        type: "date" },
            "dismissal_reason":  { key: "dismissal_reason",  type: "text" },
            "agent_confidence":  { key: "agent_confidence",  type: "number" },
        },
    },
    "public.qa_issue_patterns": {
        collection: "qa_issue_patterns",
        fields: [
            "id", "pattern_name", "category", "description",
            "detection_hint", "confirmation_count", "dismissal_count",
            "needs_chapter_scan", "severity_default", "created_at", "updated_at",
        ],
        fieldMap: {
            "id":                 { key: "id",                  type: "text" },
            "pattern_name":       { key: "pattern_name",        type: "text" },
            "category":           { key: "category",            type: "text" },
            "description":        { key: "description",         type: "text" },
            "detection_hint":     { key: "detection_hint",      type: "text" },
            "confirmation_count": { key: "confirmation_count",  type: "number" },
            "dismissal_count":    { key: "dismissal_count",     type: "number" },
            "needs_chapter_scan": { key: "needs_chapter_scan",  type: "bool" },
            "severity_default":   { key: "severity_default",    type: "text" },
            "created_at":         { key: "created",             type: "date" },
            "updated_at":         { key: "updated",             type: "date" },
        },
    },
    "public.qa_issues": {
        collection: "qa_issues",
        fields: [
            "id", "segment_id", "category", "severity",
            "char_start", "char_end", "body", "author_id",
            "author_kind", "resolved", "resolved_by", "resolved_at", "created_at",
        ],
        fieldMap: {
            "id":          { key: "id",          type: "text" },
            "segment_id":  { key: "segment",     type: "text" },
            "category":    { key: "category",    type: "text" },
            "severity":    { key: "severity",    type: "text" },
            "char_start":  { key: "char_start",  type: "number" },
            "char_end":    { key: "char_end",    type: "number" },
            "body":        { key: "body",        type: "text" },
            "author_id":   { key: "author",      type: "text" },
            "author_kind": { key: "author_kind", type: "text" },
            "resolved":    { key: "resolved",    type: "bool" },
            "resolved_by": { key: "resolved_by", type: "text" },
            "resolved_at": { key: "resolved_at", type: "date" },
            "created_at":  { key: "created",     type: "date" },
        },
    },
    "public.segment_comments": {
        collection: "segment_comments",
        fields: [
            "id", "segment_id", "user_id", "content", "resolved",
            "created_at", "parent_comment_id", "mentions",
        ],
        fieldMap: {
            "id":                { key: "id",                 type: "text" },
            "segment_id":        { key: "segment",            type: "text" },
            "user_id":           { key: "user",               type: "text" },
            "content":           { key: "content",            type: "text" },
            "resolved":          { key: "resolved",           type: "bool" },
            "created_at":        { key: "created",            type: "date" },
            "parent_comment_id": { key: "parent_comment_id",  type: "text" },
            "mentions":          { key: "mentions",           type: "json" },
        },
    },
    "public.segment_phase_transitions": {
        collection: "segment_phase_transitions",
        fields: [
            "id", "segment_id", "from_status", "to_status",
            "actor_id", "acknowledged_minor", "note", "created_at",
        ],
        fieldMap: {
            "id":                 { key: "id",                  type: "text" },
            "segment_id":         { key: "segment",             type: "text" },
            "from_status":        { key: "from_status",         type: "text" },
            "to_status":          { key: "to_status",           type: "text" },
            "actor_id":           { key: "actor",               type: "text" },
            "acknowledged_minor": { key: "acknowledged_minor",  type: "bool" },
            "note":               { key: "note",                type: "text" },
            "created_at":         { key: "created",             type: "date" },
        },
    },
    "public.segment_revisions": {
        collection: "segment_revisions",
        fields: [
            "id", "segment_id", "target_text", "edited_by",
            "quality_score", "created_at",
        ],
        fieldMap: {
            "id":            { key: "id",            type: "text" },
            "segment_id":    { key: "segment",       type: "text" },
            "target_text":   { key: "target_text",   type: "text" },
            "edited_by":     { key: "edited_by",     type: "text" },
            "quality_score": { key: "quality_score", type: "number" },
            "created_at":    { key: "created",       type: "date" },
        },
    },
    "public.segment_suggestions": {
        collection: "segment_suggestions",
        fields: [
            "id", "segment_id", "suggester_id", "suggester_kind",
            "proposed_text", "status", "accepter_id", "accepted_at",
            "created_at", "auto_accepted",
        ],
        fieldMap: {
            "id":             { key: "id",              type: "text" },
            "segment_id":     { key: "segment",         type: "text" },
            "suggester_id":   { key: "suggester",       type: "text" },
            "suggester_kind": { key: "suggester_kind",  type: "text" },
            "proposed_text":  { key: "proposed_text",   type: "text" },
            "status":         { key: "status",          type: "text" },
            "accepter_id":    { key: "accepter",        type: "text" },
            "accepted_at":    { key: "accepted_at",     type: "date" },
            "created_at":     { key: "created",         type: "date" },
            "auto_accepted":  { key: "auto_accepted",   type: "bool" },
        },
    },
    "public.style_guide": {
        collection: "style_guide",
        fields: [
            "id", "scope", "scope_ref", "rule_category", "pattern",
            "policy", "rationale", "confirmation_count", "status",
            "source_suggestion_id", "created_by", "created_at", "updated_at",
        ],
        fieldMap: {
            "id":                   { key: "id",                    type: "text" },
            "scope":                { key: "scope",                 type: "text" },
            "scope_ref":            { key: "scope_ref",             type: "text" },
            "rule_category":        { key: "rule_category",         type: "text" },
            "pattern":              { key: "pattern",               type: "text" },
            "policy":               { key: "policy",                type: "text" },
            "rationale":            { key: "rationale",             type: "text" },
            "confirmation_count":   { key: "confirmation_count",    type: "number" },
            "status":               { key: "status",                type: "text" },
            "source_suggestion_id": { key: "source_suggestion_id",  type: "text" },
            "created_by":           { key: "created_by",            type: "text" },
            "created_at":           { key: "created",               type: "date" },
            "updated_at":           { key: "updated",               type: "date" },
        },
    },
    "public.user_history": {
        collection: "user_history",
        fields: [
            "id", "user_id", "item_type", "item_id",
            "item_title", "last_position", "visited_at",
        ],
        fieldMap: {
            "id":            { key: "id",            type: "text" },
            "user_id":       { key: "user",          type: "text" },
            "item_type":     { key: "item_type",     type: "text" },
            "item_id":       { key: "item_id",       type: "text" },
            "item_title":    { key: "item_title",    type: "text" },
            "last_position": { key: "last_position", type: "number" },
            "visited_at":    { key: "visited_at",    type: "date" },
        },
    },
    "public.video_notes": {
        collection: "video_notes",
        fields: [
            "id", "video_id", "user_id", "start_time", "end_time",
            "text", "created_at", "note_text",
        ],
        fieldMap: {
            "id":         { key: "id",         type: "text" },
            "video_id":   { key: "video",      type: "text" },
            "user_id":    { key: "user",       type: "text" },
            "start_time": { key: "start_time", type: "number" },
            "end_time":   { key: "end_time",   type: "number" },
            "text":       { key: "text",       type: "text" },
            "created_at": { key: "created",    type: "date" },
            "note_text":  { key: "note_text",  type: "text" },
        },
    },
    "public.videos": {
        collection: "videos",
        fields: [
            "id", "youtube_id", "title", "description",
            "thumbnail_url", "duration_seconds", "created_at", "user_id",
        ],
        fieldMap: {
            "id":               { key: "id",               type: "text" },
            "youtube_id":       { key: "youtube_id",       type: "text" },
            "title":            { key: "title",            type: "text" },
            "description":      { key: "description",      type: "text" },
            "thumbnail_url":    { key: "thumbnail_url",    type: "text" },
            "duration_seconds": { key: "duration_seconds", type: "number" },
            "created_at":       { key: "created",          type: "date" },
            "user_id":          { key: "user",             type: "text" },
        },
    },
    "public.agent_logs": {
        collection: "agent_logs",
        fields: [
            "id", "user_id", "article_id", "video_id", "agent_type",
            "model", "system_prompt", "user_prompt", "response",
            "prompt_tokens", "completion_tokens", "duration_ms", "error", "created_at",
        ],
        fieldMap: {
            "id":               { key: "id",                type: "text" },
            "user_id":          { key: "user",              type: "text" },
            "article_id":       { key: "article",           type: "text" },
            "video_id":         { key: "video",             type: "text" },
            "agent_type":       { key: "agent_type",        type: "text" },
            "model":            { key: "model",             type: "text" },
            "system_prompt":    { key: "system_prompt",     type: "text" },
            "user_prompt":      { key: "user_prompt",       type: "text" },
            "response":         { key: "response",          type: "text" },
            "prompt_tokens":    { key: "prompt_tokens",     type: "number" },
            "completion_tokens":{ key: "completion_tokens", type: "number" },
            "duration_ms":      { key: "duration_ms",       type: "number" },
            "error":            { key: "error",             type: "text" },
            "created_at":       { key: "created",           type: "date" },
        },
    },
    "public.agent_prompts": {
        collection: "agent_prompts",
        fields: [
            "id", "user_id", "agent_type", "approach", "template",
            "created_at", "updated_at", "active", "version", "edited_by",
        ],
        fieldMap: {
            "id":         { key: "id",        type: "text" },
            "user_id":    { key: "user",      type: "text" },
            "agent_type": { key: "agent_type", type: "text" },
            "approach":   { key: "approach",  type: "text" },
            "template":   { key: "template",  type: "text" },
            "created_at": { key: "created",   type: "date" },
            "updated_at": { key: "updated",   type: "date" },
            "active":     { key: "active",    type: "bool" },
            "version":    { key: "version",   type: "number" },
            "edited_by":  { key: "edited_by", type: "text" },
        },
    },
};

// ── pg_dump COPY block parser ─────────────────────────────────────
/**
 * Parses a single COPY data line into a row object.
 * Format: tab-separated columns, \N = NULL, \t = literal tab,
 * \n = literal newline, \\ = literal backslash.
 *
 * This is a simplified parser that handles 99.9% of real data.
 * For edge cases (embedded multi-line text), see the fallback notes
 * in the README.
 */
function parseCopyLine(line, fieldNames) {
    // Split by tab, but handle the edge case where \t appears
    // as an escape sequence within a field.
    // Strategy: temporarily replace escaped tabs, split, restore.

    // Replace \\t (escaped tab) with a sentinel, split by real tab, restore
    const SENTINEL_TAB = "\x00TAB\x00";
    const SENTINEL_BS = "\x00BS\x00";

    let processed = line;
    // First replace \\ with sentinel (to not confuse with \t, \n)
    processed = processed.replace(/\\\\/g, SENTINEL_BS);
    // Now replace \t with tab sentinel, \n with newline sentinel
    processed = processed.replace(/\\t/g, SENTINEL_TAB);
    processed = processed.replace(/\\n/g, "\n");

    const parts = processed.split("\t");

    const row = {};
    for (let i = 0; i < fieldNames.length && i < parts.length; i++) {
        let val = parts[i];
        // Restore escaped backslashes
        val = val.replace(new RegExp(SENTINEL_BS, "g"), "\\");
        // Restore escaped tabs
        val = val.replace(new RegExp(SENTINEL_TAB, "g"), "\t");

        if (val === "\\N") {
            row[fieldNames[i]] = null;
        } else {
            row[fieldNames[i]] = val;
        }
    }

    // Fill missing fields with null
    for (let i = parts.length; i < fieldNames.length; i++) {
        row[fieldNames[i]] = null;
    }

    return row;
}

/**
 * Convert a parsed row value to PocketBase-compatible format.
 */
function convertValue(val, pbType) {
    if (val === null || val === undefined) {
        return null;
    }
    switch (pbType) {
        case "text":
            return String(val);
        case "number": {
            const n = parseFloat(val);
            return isNaN(n) ? null : n;
        }
        case "bool": {
            if (typeof val === "boolean") return val;
            if (val === "t" || val === "true" || val === "1") return true;
            if (val === "f" || val === "false" || val === "0") return false;
            return null;
        }
        case "date":
            // Postgres timestamptz format → RFC3339 (PocketBase format)
            // e.g. "2026-03-20 09:00:27.520254+00" → "2026-03-20T09:00:27.520Z"
            if (String(val).includes("T")) return String(val); // already ISO
            return String(val).replace(" ", "T").replace("+00", "Z");
        case "json":
            try {
                return JSON.parse(val);
            } catch {
                return val; // return as-is if not valid JSON
            }
        default:
            return String(val);
    }
}

/**
 * Apply field mapping to convert a raw row to a PocketBase record payload.
 */
function mapRow(row, tableConfig) {
    const record = {};
    for (const [pgCol, mapping] of Object.entries(tableConfig.fieldMap)) {
        const rawVal = row[pgCol];
        const converted = convertValue(rawVal, mapping.type);
        if (converted !== null && converted !== undefined) {
            record[mapping.key] = converted;
        }
    }
    return record;
}

// ── Stream parser state machine ───────────────────────────────────
async function* parseBackup(backupPath) {
    const rl = readline.createInterface({
        input: fs.createReadStream(backupPath, { encoding: "utf-8" }),
        crlfDelay: Infinity,
    });

    let currentTable = null;
    let currentFields = [];
    let inCopy = false;
    let lineCount = 0;

    const COPY_PATTERN = /^COPY\s+(\S+)\s+\((.+)\)\s+FROM\s+stdin;$/;

    for await (const line of rl) {
        lineCount++;

        if (!inCopy) {
            const m = line.match(COPY_PATTERN);
            if (m) {
                currentTable = m[1];
                // Parse column names from the COPY statement
                currentFields = m[2]
                    .split(",")
                    .map(s => s.trim().replace(/^"/, "").replace(/"$/, ""));
                inCopy = true;
            }
            continue;
        }

        // Inside a COPY block
        if (line === "\\.") {
            // End of COPY block
            inCopy = false;
            continue;
        }

        // Data line
        if (inCopy && currentTable) {
            const tableConfig = TABLE_REGISTRY[currentTable];
            if (!tableConfig) {
                // Not in our registry — skip (auth tables, realtime, storage, etc.)
                continue;
            }

            if (tableConfig === "EXCLUDE") {
                // Explicitly excluded (e.g. translation_memory for archival only)
                continue;
            }

            const row = parseCopyLine(line, currentFields);

            yield {
                table: currentTable,
                config: tableConfig,
                row,
            };
        }
    }

    // Final stats
    yield {
        table: null,
        config: null,
        row: null,
        _meta: { totalLines: lineCount },
    };
}

// ── IMPORT: tm archival ───────────────────────────────────────────
// We handle translation_memory specially — write to archive file.
const TM_ARCHIVE_TABLE = "public.translation_memory";
// translation_memory parser config (used for archival export only)
const TM_FIELDS = [
    "id", "source_text", "target_text", "source_lang", "target_lang",
    "domain", "quality", "human_approved", "source_url", "embedding",
    "created_at", "created_by", "article_id", "usage_count",
    "last_used_at", "updated_at", "source_suggestion_id",
    "origin", "approach", "feedback_score", "superseded_by",
];

// ── Main import function ──────────────────────────────────────────
async function main() {
    const args = parseArgs();
    const pb = await createPbClient(args);

    console.log(`\n=== STARTING IMPORT ===`);
    console.log(`Backup: ${args.backupPath}`);
    console.log(`PocketBase: ${args.pbUrl}`);
    console.log(`Mode: ${args.dryRun ? "DRY RUN (no writes)" : "LIVE"}`);
    console.log(`Batch size: ${args.batchSize}`);
    console.log(`TM archive: ${args.archiveTmPath}`);
    console.log(``);

    const stats = {};
    const tableRows = {};  // table name → array of mapped records
    let tmRows = [];
    let totalImported = 0;
    let totalSkipped = 0;
    let totalOrphaned = 0;

    // Phase 1: Parse
    console.log("Phase 1: Parsing pg_dump backup...");
    const skippedTables = new Set([
        "auth.audit_log_entries", "auth.custom_oauth_providers", "auth.flow_state",
        "auth.identities", "auth.instances", "auth.mfa_amr_claims", "auth.mfa_challenges",
        "auth.mfa_factors", "auth.oauth_authorizations", "auth.oauth_client_states",
        "auth.oauth_clients", "auth.oauth_consents", "auth.one_time_tokens",
        "auth.refresh_tokens", "auth.saml_providers", "auth.saml_relay_states",
        "auth.schema_migrations", "auth.sessions", "auth.sso_domains", "auth.sso_providers",
        "auth.users", "auth.webauthn_challenges", "auth.webauthn_credentials",
        "public.users", "public.prompt_edits",
        "realtime.messages", "realtime.schema_migrations", "realtime.subscription",
        "storage.buckets", "storage.objects", "storage.migrations",
        "supabase_migrations.schema_migrations", "vault.secrets",
    ]);

    // Also check for partitioned realtime.messages_* tables
    function isSkippedTable(tableName) {
        if (skippedTables.has(tableName)) return true;
        if (tableName.startsWith("realtime.messages_")) return true;
        if (tableName.startsWith("storage.")) return true;
        if (tableName.startsWith("auth.")) return true;
        if (tableName.startsWith("vault.")) return true;
        if (tableName.startsWith("extensions.")) return true;
        if (tableName.startsWith("supabase_migrations.")) return true;
        return false;
    }

    let currentTableForParsing = null;

    for await (const item of parseBackup(args.backupPath)) {
        if (item._meta) {
            console.log(`  Parsed ${item._meta.totalLines.toLocaleString()} lines total.`);
            continue;
        }

        const { table, config, row } = item;

        if (args.skipTo && table !== args.skipTo && currentTableForParsing !== args.skipTo) {
            continue;
        }

        if (table === TM_ARCHIVE_TABLE) {
            tmRows.push(row);
            if (tmRows.length % 50000 === 0) {
                console.log(`  TM archive: ${tmRows.length.toLocaleString()} rows buffered...`);
            }
            continue;
        }

        if (!TABLE_REGISTRY[table] || isSkippedTable(table)) {
            if (table !== currentTableForParsing) {
                currentTableForParsing = table;
                if (isSkippedTable(table) && !table.startsWith("realtime.messages_") &&
                    !table.startsWith("storage.") && !table.startsWith("auth.")) {
                    // Only log for truly unknown tables
                }
            }
            continue;
        }

        // Apply row filter (e.g., orphaned reading_progress)
        if (config.rowFilter && !config.rowFilter(row)) {
            totalOrphaned++;
            continue;
        }

        // Map and buffer
        const record = mapRow(row, config);
        if (!tableRows[table]) tableRows[table] = [];
        tableRows[table].push(record);
    }

    // Phase 1b: Export TM archive
    console.log(`\nPhase 1b: Archiving translation_memory (${tmRows.length.toLocaleString()} rows)...`);
    if (!args.dryRun) {
        const tmJson = JSON.stringify(tmRows.map(r => {
            // Map timestamps to ISO format
            const out = {};
            for (const [k, v] of Object.entries(r)) {
                if (v && (k === "created_at" || k === "updated_at" || k === "last_used_at")) {
                    out[k] = String(v).replace(" ", "T").replace("+00", "Z");
                } else if (v === "\\N" || v === null) {
                    out[k] = null;
                } else {
                    out[k] = v;
                }
            }
            return out;
        }));

        // Write as gzipped JSON
        const { createGzip } = require("zlib");
        const gzip = createGzip();
        const outStream = fs.createWriteStream(args.archiveTmPath);
        await new Promise((resolve, reject) => {
            const { Readable } = require("stream");
            const readable = Readable.from([tmJson]);
            readable.pipe(gzip).pipe(outStream);
            outStream.on("finish", resolve);
            outStream.on("error", reject);
        });
        const stat = fs.statSync(args.archiveTmPath);
        console.log(`  Archived to ${args.archiveTmPath} (${(stat.size / 1024 / 1024).toFixed(1)} MB gzipped)`);
    } else {
        console.log(`  [DRY RUN] Would archive ${tmRows.length.toLocaleString()} rows.`);
    }
    tmRows = null; // free memory

    // Phase 2: Import to PocketBase
    console.log(`\nPhase 2: Importing to PocketBase...`);
    console.log(`Orphaned rows filtered: ${totalOrphaned}`);

    // Import order: dependencies first (articles before segments, etc.)
    const importOrder = [
        "public.articles",
        "public.videos",
        "public.terminology",
        "public.segments",
        "public.bookmarks",
        "public.reading_progress",
        "public.document_assignments",
        "public.document_decisions",
        "public.document_sections",
        "public.document_settings",
        "public.edit_patterns",
        "public.qa_issue_patterns",
        "public.qa_issues",
        "public.qa_issue_pattern_events",
        "public.segment_comments",
        "public.segment_phase_transitions",
        "public.segment_revisions",
        "public.segment_suggestions",
        "public.style_guide",
        "public.user_history",
        "public.video_notes",
        "public.agent_logs",
        "public.agent_prompts",
    ];

    // Handle start-table for resume
    let started = !args.startTable;
    for (const table of importOrder) {
        if (!started) {
            if (table === args.startTable) started = true;
            else continue;
        }

        const rows = tableRows[table];
        if (!rows || rows.length === 0) {
            console.log(`  ${table}: 0 rows (empty)`);
            stats[table] = 0;
            continue;
        }

        const config = TABLE_REGISTRY[table];
        const collectionName = config.collection;

        console.log(`\n  Importing ${table} → ${collectionName} (${rows.length.toLocaleString()} rows)...`);

        if (args.dryRun) {
            console.log(`    [DRY RUN] Would import ${rows.length} rows.`);
            console.log(`    Sample row: ${JSON.stringify(rows[0]).substring(0, 200)}...`);
            stats[table] = rows.length;
            totalImported += rows.length;
            continue;
        }

        // Batch import
        let imported = 0;
        let errors = 0;
        const batchSize = args.batchSize;
        const totalBatches = Math.ceil(rows.length / batchSize);
        const startTime = Date.now();

        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;

            try {
                // Use direct create for each record (PocketBase SDK doesn't support
                // multi-record bulk create directly, but we can use Promise.all concurrency)
                const createPromises = batch.map(record =>
                    pb.collection(collectionName).create(record, { requestKey: null })
                        .catch(err => {
                            // If record already exists (409 or similar), try update
                            if (err.status === 400 && err.data && err.data.id) {
                                return pb.collection(collectionName).update(record.id, record, { requestKey: null });
                            }
                            throw err;
                        })
                );

                await Promise.all(createPromises);
                imported += batch.length;

                // Progress
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                const rate = (imported / parseFloat(elapsed)).toFixed(0);
                process.stdout.write(
                    `\r    Batch ${batchNum}/${totalBatches} | ${imported.toLocaleString()} rows | ${elapsed}s | ~${rate}/s`
                );
            } catch (err) {
                console.error(`\n    ERROR in batch ${batchNum}: ${err.message}`);
                errors += batch.length;
            }
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n    Done: ${imported.toLocaleString()} imported, ${errors} errors in ${totalTime}s`);
        stats[table] = imported;
        totalImported += imported;
        totalSkipped += errors;
    }

    // Phase 2b: Import profiles (special — merge into users auth collection)
    const profiles = tableRows["public.profiles"];
    if (profiles && profiles.length > 0) {
        console.log(`\n  Merging profiles into users collection (${profiles.length} rows)...`);
        if (!args.dryRun) {
            for (const profile of profiles) {
                try {
                    // Update the existing user record with profile fields
                    await pb.collection("users").update(profile.id, {
                        username: profile.username,
                        role: profile.role,
                    });
                } catch (err) {
                    console.error(`    Could not update user ${profile.id}: ${err.message}`);
                }
            }
        }
    }

    // ── Summary ────────────────────────────────────────────────────
    console.log(`\n\n========== IMPORT SUMMARY ==========`);
    console.log(`Total rows imported: ${totalImported.toLocaleString()}`);
    console.log(`Total errors: ${totalSkipped}`);
    console.log(`Orphaned rows filtered: ${totalOrphaned}`);
    console.log(`TM rows archived: ${tmRows ? tmRows.length.toLocaleString() : 'N/A'}`);
    console.log(`\nPer-table counts:`);
    for (const table of importOrder) {
        const count = stats[table];
        if (count !== undefined) {
            const config = TABLE_REGISTRY[table];
            console.log(`  ${table.padEnd(38)} → ${(config.collection).padEnd(28)} ${String(count).padStart(8)} rows`);
        }
    }
    console.log(`====================================\n`);
}

main().catch(err => {
    console.error("FATAL:", err.message);
    console.error(err.stack);
    process.exit(1);
});
