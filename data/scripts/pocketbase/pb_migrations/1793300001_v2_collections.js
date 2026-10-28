/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 collections: own translations, comments, run marks, catalog items,
 * magazine chapters and page runs.
 *
 * Rules for this file:
 *   - Create a collection only if it does not exist.
 *   - If a collection exists, print a line and change nothing. No data drops.
 *   - Set `created` and `updated` as explicit autodate fields.
 *     A migration does not add them by itself.
 *   - Set an explicit `max` on the long text fields. The PocketBase default
 *     for a text field is low (5000 characters, see test check 14).
 *
 * Down function: delete a collection only if it holds 0 records.
 * A collection with records stays, and the down function prints a line.
 */

const BIG_TEXT = 100000;
const SNAPSHOT_BYTES = 5242880;

const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };
const updated = { name: "updated", type: "autodate", onCreate: true, onUpdate: true };

const SIGNED_IN = '@request.auth.id != ""';
const WRITER_OR_ADMIN = '(@request.auth.role = "translator" || @request.auth.role = "admin")';
const OWN_OR_ADMIN = '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")';
const COMMENT_LIST =
    '@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin" || (shared = true && @request.auth.role = "translator"))';
const CREATE_AS_SELF = '@request.auth.id != "" && @request.body.user = @request.auth.id && ' + WRITER_OR_ADMIN;

function definitions(usersId) {
    const userRel = { name: "user", type: "relation", required: true, collectionId: usersId, maxSelect: 1, cascadeDelete: false };
    return [
        {
            name: "own_translations",
            listRule: OWN_OR_ADMIN,
            viewRule: OWN_OR_ADMIN,
            createRule: CREATE_AS_SELF,
            updateRule: null,
            deleteRule: null,
            fields: [
                userRel,
                { name: "item_id", type: "text" },
                { name: "page_id", type: "text", required: true },
                { name: "group_key", type: "text", required: true },
                { name: "ts_ids", type: "json" },
                { name: "part", type: "text" },
                { name: "ja_text", type: "text", max: BIG_TEXT },
                { name: "run_id", type: "text" },
                { name: "ed3_text", type: "text", max: BIG_TEXT },
                { name: "text", type: "text", max: BIG_TEXT },
                { name: "version", type: "number", required: true, onlyInt: true, min: 1 },
                created,
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_own_translations_version ON own_translations (user, page_id, group_key, version)",
                "CREATE INDEX idx_own_translations_group ON own_translations (page_id, group_key)",
            ],
        },
        {
            name: "comments",
            listRule: COMMENT_LIST,
            viewRule: COMMENT_LIST,
            createRule: CREATE_AS_SELF,
            updateRule:
                'user = @request.auth.id && @request.body.user:changed = false && @request.body.page_id:changed = false && @request.body.group_key:changed = false',
            deleteRule: 'user = @request.auth.id || @request.auth.role = "admin"',
            fields: [
                userRel,
                { name: "page_id", type: "text", required: true },
                { name: "group_key", type: "text", required: true },
                { name: "run_id", type: "text" },
                { name: "text", type: "text", max: BIG_TEXT },
                { name: "shared", type: "bool" },
                created,
                updated,
            ],
            indexes: [
                "CREATE INDEX idx_comments_group ON comments (page_id, group_key)",
                "CREATE INDEX idx_comments_user ON comments (user)",
            ],
        },
        {
            name: "run_marks",
            listRule: SIGNED_IN,
            viewRule: SIGNED_IN,
            createRule: '@request.auth.role = "admin"',
            updateRule: '@request.auth.role = "admin"',
            deleteRule: '@request.auth.role = "admin"',
            fields: [
                { name: "page_id", type: "text", required: true },
                { name: "run_id", type: "text", required: true },
                { name: "marked_by", type: "relation", collectionId: usersId, maxSelect: 1, cascadeDelete: false },
                { name: "note", type: "text", max: BIG_TEXT },
                created,
                updated,
            ],
            indexes: ["CREATE UNIQUE INDEX idx_run_marks_page ON run_marks (page_id)"],
        },
        {
            name: "catalog_items",
            listRule: SIGNED_IN,
            viewRule: SIGNED_IN,
            createRule: null,
            updateRule: null,
            deleteRule: null,
            fields: [
                { name: "item_id", type: "text", required: true },
                { name: "kind", type: "text" },
                { name: "folder", type: "text" },
                { name: "pages", type: "number" },
                { name: "title_ja", type: "text" },
                { name: "title_en", type: "text" },
                { name: "author_ja", type: "text" },
                { name: "author_en", type: "text" },
                { name: "publisher", type: "text" },
                { name: "publish_year", type: "text" },
                { name: "row", type: "json" },
            ],
            indexes: ["CREATE UNIQUE INDEX idx_catalog_items_item ON catalog_items (item_id)"],
        },
        {
            name: "magazine_chapters",
            listRule: SIGNED_IN,
            viewRule: SIGNED_IN,
            createRule: null,
            updateRule: null,
            deleteRule: null,
            fields: [
                { name: "chapter", type: "text", required: true },
                { name: "book", type: "text" },
                { name: "year", type: "number" },
                { name: "month", type: "number" },
                { name: "chapter_title_ja", type: "text" },
                { name: "chapter_title_en", type: "text" },
                { name: "page_start", type: "number" },
                { name: "page_end", type: "number" },
                { name: "first_page_id", type: "text" },
                { name: "last_page_id", type: "text" },
                { name: "article_count", type: "number" },
                { name: "articles", type: "json" },
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_magazine_chapters_chapter ON magazine_chapters (chapter)",
                "CREATE INDEX idx_magazine_chapters_book ON magazine_chapters (book)",
            ],
        },
        {
            name: "page_runs",
            listRule: '@request.auth.role = "translator" || @request.auth.role = "admin"',
            viewRule: '@request.auth.role = "translator" || @request.auth.role = "admin"',
            createRule: null,
            updateRule: null,
            deleteRule: null,
            fields: [
                { name: "page_id", type: "text", required: true },
                { name: "item_id", type: "text" },
                { name: "run_id", type: "text", required: true },
                { name: "verdict", type: "text" },
                { name: "qa3_page_score", type: "number" },
                { name: "finished", type: "date" },
                { name: "snapshot", type: "json", maxSize: SNAPSHOT_BYTES },
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_page_runs_run ON page_runs (page_id, run_id)",
                "CREATE INDEX idx_page_runs_page ON page_runs (page_id)",
            ],
        },
    ];
}

function collectionExists(app, name) {
    try {
        app.findCollectionByNameOrId(name);
        return true;
    } catch (_) {
        return false;
    }
}

migrate((app) => {
    const usersId = app.findCollectionByNameOrId("users").id;
    for (const def of definitions(usersId)) {
        if (collectionExists(app, def.name)) {
            console.log("v2 migration: collection " + def.name + " exists, left as it is");
            continue;
        }
        app.save(new Collection(Object.assign({ type: "base" }, def)));
    }
}, (app) => {
    const names = ["page_runs", "magazine_chapters", "catalog_items", "run_marks", "comments", "own_translations"];
    for (const name of names) {
        if (!collectionExists(app, name)) {
            continue;
        }
        if (app.countRecords(name) > 0) {
            console.log("v2 migration down: collection " + name + " has records, kept");
            continue;
        }
        app.delete(app.findCollectionByNameOrId(name));
    }
});
