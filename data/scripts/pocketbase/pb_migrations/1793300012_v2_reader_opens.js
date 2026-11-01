/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 admin gate for agent text (unit RT74, round 75 answer 3, qa-memory-2026-10-31.md:53: "Admin opens any run").
 * Readers see the Agent text of a run only after the admin opens that run. Sync command S2 reads this collection.
 *
 * Collection reader_opens: one record for each opened run of one book.
 *   source     select  "pilot-run" (the run folders under <T2>/data/pilot-run). "book-store" is reserved for the real runs
 *                      under <T2>/data/book-store. S2 does not read that source yet.
 *   book       text    slug of the book or the article, for example left_foot_full
 *   run_id     text    the run folder name of the page runs, for example 20261029T051154Z-r41
 *   opened_by  relation to users (the admin who pressed "Open to readers")
 *   created, updated   autodate
 *   unique index on (source, book, run_id)
 *
 * Rules: only the admin (and the superuser, who ignores the rules) reads or writes. A reader never reaches this collection.
 * The run_marks collection lets every signed-in user read. This collection does not, because a reader has no use for it.
 *
 * Rules for this file (like migrations 1793300001 to 1793300011):
 *   - Create the collection only if it does not exist. If it exists, print a line and change nothing.
 *   - Set `created` and `updated` as explicit autodate fields.
 *   - Safe to run twice.
 *
 * Down function (soft): delete the collection only if it holds 0 records. A collection with records stays.
 */

const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };
const updated = { name: "updated", type: "autodate", onCreate: true, onUpdate: true };
const ADMIN_ONLY = '@request.auth.role = "admin"';

function collectionExists(app, name) {
    try {
        app.findCollectionByNameOrId(name);
        return true;
    } catch (_) {
        return false;
    }
}

migrate((app) => {
    if (collectionExists(app, "reader_opens")) {
        console.log("v2 migration: collection reader_opens exists, left as it is");
        return;
    }
    const usersId = app.findCollectionByNameOrId("users").id;
    app.save(new Collection({
        type: "base",
        name: "reader_opens",
        listRule: ADMIN_ONLY,
        viewRule: ADMIN_ONLY,
        createRule: ADMIN_ONLY,
        updateRule: ADMIN_ONLY,
        deleteRule: ADMIN_ONLY,
        fields: [
            { name: "source", type: "select", required: true, maxSelect: 1, values: ["pilot-run", "book-store"] },
            { name: "book", type: "text", required: true },
            { name: "run_id", type: "text", required: true },
            { name: "opened_by", type: "relation", collectionId: usersId, maxSelect: 1, cascadeDelete: false },
            created,
            updated,
        ],
        indexes: ["CREATE UNIQUE INDEX idx_reader_opens_run ON reader_opens (source, book, run_id)"],
    }));
}, (app) => {
    if (!collectionExists(app, "reader_opens")) {
        return;
    }
    if (app.countRecords("reader_opens") > 0) {
        console.log("v2 migration down: collection reader_opens has records, kept");
        return;
    }
    app.delete(app.findCollectionByNameOrId("reader_opens"));
});
