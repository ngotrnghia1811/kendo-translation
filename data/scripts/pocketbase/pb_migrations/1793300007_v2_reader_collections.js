/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 reader pages: collections reader_pages, reader_versions, and page_checks (unit RC1, round 63 answers 3 and 6, Q-A 2026-10-28 l309-310).
 *
 * reader_pages: one record for each page that has an agent translation to show. The sync command S2 writes it.
 *   It holds reader data only: the rows (key, part, JA text, agent EN text, term marks), the term entries that the marks cite,
 *   the captions and other items without a row (extras), and the group keys that a translator ticked "agree" (agree, without names).
 *   It holds no verdict, no score, no TL_3 panel, and no reasoning.
 * reader_versions: the admin choice of one human version for a page (one record for each page). Only an admin writes.
 * page_checks: the record that a person checked a page (one record for each page). Only an admin writes.
 *
 * Rules:
 *   - READ_OK = a signed-in user whose account is approved, or a translator, or an admin. A reader who waits for approval reads none of the reader data.
 *   - reader_pages: list and view READ_OK. Create, update, delete: null (only a superuser, the sync command S2).
 *   - reader_versions: list and view READ_OK. Create, update, delete: admin.
 *   - page_checks: list and view for every signed-in user. Create, update, delete: admin.
 *
 * Rules for this file (like migrations 1793300001 to 1793300005):
 *   - Create a collection only if it does not exist. If it exists, print a line and change nothing.
 *   - Explicit created and updated fields. Explicit max sizes on long fields.
 *   - Safe to run twice.
 *
 * Down function: delete a collection only if it holds 0 records. A collection with records stays, and the down function prints a line.
 */

const JSON_BYTES = 5242880;
const NOTE = 500;

const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };
const updated = { name: "updated", type: "autodate", onCreate: true, onUpdate: true };

const READ_OK = '@request.auth.id != "" && (@request.auth.approved = true || @request.auth.role = "translator" || @request.auth.role = "admin")';
const SIGNED_IN = '@request.auth.id != ""';
const ADMIN = '@request.auth.role = "admin"';

function collectionExists(app, name) {
    try {
        app.findCollectionByNameOrId(name);
        return true;
    } catch (_) {
        return false;
    }
}

function definitions(usersId) {
    const userRel = (name) => ({ name, type: "relation", collectionId: usersId, maxSelect: 1, cascadeDelete: false });
    return [
        {
            name: "reader_pages",
            listRule: READ_OK,
            viewRule: READ_OK,
            createRule: null,
            updateRule: null,
            deleteRule: null,
            fields: [
                { name: "page_id", type: "text", required: true },
                { name: "item_id", type: "text" },
                { name: "n", type: "number" },
                { name: "run_id", type: "text", required: true },
                { name: "rows", type: "json", maxSize: JSON_BYTES },
                { name: "terms", type: "json", maxSize: JSON_BYTES },
                { name: "extras", type: "json", maxSize: JSON_BYTES },
                { name: "agree", type: "json", maxSize: JSON_BYTES },
                created,
                updated,
            ],
            indexes: [
                "CREATE UNIQUE INDEX idx_reader_pages_page ON reader_pages (page_id)",
                "CREATE INDEX idx_reader_pages_item ON reader_pages (item_id)",
            ],
        },
        {
            name: "reader_versions",
            listRule: READ_OK,
            viewRule: READ_OK,
            createRule: ADMIN,
            updateRule: ADMIN,
            deleteRule: ADMIN,
            fields: [
                { name: "page_id", type: "text", required: true },
                userRel("user"),
                { name: "version", type: "number", onlyInt: true, min: 1 },
                { name: "run_id", type: "text" },
                { name: "rows", type: "json", maxSize: JSON_BYTES },
                userRel("chosen_by"),
                created,
                updated,
            ],
            indexes: ["CREATE UNIQUE INDEX idx_reader_versions_page ON reader_versions (page_id)"],
        },
        {
            name: "page_checks",
            listRule: SIGNED_IN,
            viewRule: SIGNED_IN,
            createRule: ADMIN,
            updateRule: ADMIN,
            deleteRule: ADMIN,
            fields: [
                { name: "page_id", type: "text", required: true },
                userRel("checked_by"),
                { name: "note", type: "text", max: NOTE },
                created,
                updated,
            ],
            indexes: ["CREATE UNIQUE INDEX idx_page_checks_page ON page_checks (page_id)"],
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
    for (const name of ["page_checks", "reader_versions", "reader_pages"]) {
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
