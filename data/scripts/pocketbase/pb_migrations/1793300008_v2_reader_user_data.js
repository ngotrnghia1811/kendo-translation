/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 reader data of a person: collections reader_bookmarks and reader_progress (unit RC1, round 63 answer 7, Q-A 2026-10-28 l311).
 *
 * Owner words: "Two collections for resume and bookmarks (Recommended)".
 * Names: the live server holds the v1 collections bookmarks and reading_progress (v1 migration 1753123461). A v2 collection with the same
 * name would be skipped by the rule "create only if absent", and the reader pages would then write into the v1 shape. So the v2 names are
 * reader_bookmarks and reader_progress (unit default of RC1, listed in the report as a correction of the brief).
 *   - reader_progress: one record for each user and book. It holds the last page. A reader resumes there.
 *   - reader_bookmarks: one record for each user and page, with a short note.
 *
 * Rules: a user reads and writes the own records only, and only when READ_OK holds (approved reader, translator, or admin).
 *   - reader_bookmarks: list, view, create, delete. No update (a bookmark is added or removed).
 *   - reader_progress: list, view, create, update. The update cannot change the user. No delete.
 *
 * Rules for this file: create a collection only if it is missing, explicit created and updated fields, safe to run twice.
 * Down function: delete a collection only if it holds 0 records.
 */

const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };
const updated = { name: "updated", type: "autodate", onCreate: true, onUpdate: true };

const READ_OK = '@request.auth.id != "" && (@request.auth.approved = true || @request.auth.role = "translator" || @request.auth.role = "admin")';
const OWN_OK = READ_OK + ' && user = @request.auth.id';
const CREATE_OWN = READ_OK + ' && @request.body.user = @request.auth.id';

function collectionExists(app, name) {
    try {
        app.findCollectionByNameOrId(name);
        return true;
    } catch (_) {
        return false;
    }
}

function definitions(usersId) {
    const userRel = { name: "user", type: "relation", required: true, collectionId: usersId, maxSelect: 1, cascadeDelete: true };
    return [
        {
            name: "reader_bookmarks",
            listRule: OWN_OK,
            viewRule: OWN_OK,
            createRule: CREATE_OWN,
            updateRule: null,
            deleteRule: OWN_OK,
            fields: [
                userRel,
                { name: "page_id", type: "text", required: true },
                { name: "item_id", type: "text" },
                { name: "note", type: "text", max: 500 },
                created,
                updated,
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_reader_bookmarks_user_page ON reader_bookmarks (user, page_id)",
                "CREATE INDEX idx_reader_bookmarks_user_item ON reader_bookmarks (user, item_id)",
            ],
        },
        {
            name: "reader_progress",
            listRule: OWN_OK,
            viewRule: OWN_OK,
            createRule: CREATE_OWN,
            updateRule: OWN_OK + ' && @request.body.user:changed = false',
            deleteRule: null,
            fields: [
                userRel,
                { name: "item_id", type: "text", required: true },
                { name: "page_id", type: "text", required: true },
                created,
                updated,
            ],
            indexes: ["CREATE UNIQUE INDEX idx_reader_progress_user_item ON reader_progress (user, item_id)"],
        },
    ];
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
    for (const name of ["reader_progress", "reader_bookmarks"]) {
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
