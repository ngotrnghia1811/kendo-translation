/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 view-only links (unit VW120, plan item P58, Q-A 3:105.8, 3:106.5, 3:107.4, 3:107.5).
 *
 * Owner words (Q-A 3:105.8, 2026-11-20): "Can we create a view-only link: people with link can be a reader without sign-up, but all operation is only strictly view-only?"
 * Accepted design (Q-A 3:106.5 "Link is an exception, rows 1-7"; Q-A 3:107.4 "Route A: key check"; Q-A 3:107.5 "Accept all rows").
 *
 * Route A: the app holds no superuser account. Each page reads PocketBase with the token of the signed-in person, so the PocketBase rules decide what a person may read.
 * A visitor of a view-only link has no account. The app sends the key of the link in the request header "X-Kendo-View-Key". A read rule accepts that key
 * when a record of the list view_links has the same key, is not turned off ("off" is false), and has no end date or an end date in the future.
 *
 * Collection view_links: one record for each link that an admin makes on /admin/links.
 *   name        text, required, at most 120 characters. Who gets the link, for example "Kendo club Berlin".
 *   key         text, required, exactly 43 characters of A-Z a-z 0-9 - _ (base64url of 32 random bytes). Unique.
 *   ends        date, optional. The end of the last day in PST. An empty value means no end.
 *   off         bool. True after the admin pressed "Turn off".
 *   created_by  relation to users, optional. The admin who made the link.
 *   created, updated   autodate
 *   Every rule is admin only (@request.auth.role = "admin"). A key holder and a reader can neither list, view, create, nor change a link. The key is never readable through the API.
 *
 * Collection view_link_opens: one record for each open of a link address /v/<key>. The count of opens and the last open time on /admin/links come from it.
 *   key         text, required, exactly 43 characters. The key of the link that was opened.
 *   created     autodate. The time of the open. No IP address and no browser data are stored.
 *   Create rule: the key in the body must equal the key in the header AND the body must not set "created" AND the link must be on and not ended.
 *   List and view: admin only. Update and delete: nobody (superuser only).
 *   Why a create-only list and not an update rule on view_links: a key holder cannot view view_links, so it cannot learn a record ID. An update rule that allows "opens + 1"
 *   would let a key holder set any number or change other fields. A create-only list lets a key holder add one row per open and never change a link.
 *
 * Read rules that change (list rule and view rule only, write rules stay as they are). New rule = (old rule) || (LINK_OK):
 *   reader_pages, reader_versions, v1_placeholders   old: READ_OK (a signed-in approved reader, a translator, or an admin)
 *   catalog_items, magazine_chapters, book_toc, page_checks   old: SIGNED_IN (any signed-in user)
 * The lists page_runs, run_marks, reader_opens, reader_progress, reader_bookmarks, user_settings, own_translations, comments, users, visual_issues do not change.
 * The reader gate stays: only the agent translations that an admin opens reach reader_pages (the sync writes only opened runs), so a link visitor sees what an approved reader sees.
 *
 * Rules for this file (like migrations 1793300001 to 1793300017):
 *   - Create a collection only if it does not exist. If it exists, print a line and change nothing.
 *   - Change a rule only if it holds the expected old text. Any other text stays, and the function prints a line.
 *   - Set `created` and `updated` as explicit autodate fields. Set an explicit max on each text field.
 *   - Safe to run twice.
 *
 * Down function: put the old rule text back exactly (only where the rule holds the new text), then delete the two collections only if they hold 0 records.
 */

const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };
const updated = { name: "updated", type: "autodate", onCreate: true, onUpdate: true };

const NAME_MAX = 120;
const KEY_PATTERN = "^[A-Za-z0-9_-]{43}$";
const ADMIN = '@request.auth.role = "admin"';

const READ_OK = '@request.auth.id != "" && (@request.auth.approved = true || @request.auth.role = "translator" || @request.auth.role = "admin")';
const SIGNED_IN = '@request.auth.id != ""';

// The header X-Kendo-View-Key reaches a rule as @request.headers.x_kendo_view_key (lower case, "-" becomes "_"). The alias :l keeps all conditions on the same record of view_links.
const LINK_OK =
    '@request.headers.x_kendo_view_key != "" && @collection.view_links:l.key ?= @request.headers.x_kendo_view_key && @collection.view_links:l.off ?= false' +
    ' && (@collection.view_links:l.ends ?= "" || @collection.view_links:l.ends ?> @now)';

// [list name, old rule text]. The new rule of each list is "(old) || (LINK_OK)".
const READ_LISTS = [
    ["reader_pages", READ_OK],
    ["reader_versions", READ_OK],
    ["v1_placeholders", READ_OK],
    ["catalog_items", SIGNED_IN],
    ["magazine_chapters", SIGNED_IN],
    ["book_toc", SIGNED_IN],
    ["page_checks", SIGNED_IN],
];

const withLink = (old) => "(" + old + ") || (" + LINK_OK + ")";

// The body may hold the field "key" only. A key holder cannot set the time of an open ("created") by hand.
const OPENS_CREATE = '@request.body.key = @request.headers.x_kendo_view_key && @request.body.created:isset = false && ' + LINK_OK;

function collectionExists(app, name) {
    try {
        app.findCollectionByNameOrId(name);
        return true;
    } catch (_) {
        return false;
    }
}

// Move the list rule and the view rule of one list from `from` to `to`. A rule with any other text stays as it is.
function moveReadRules(app, name, from, to) {
    if (!collectionExists(app, name)) {
        console.log("v2 migration: collection " + name + " does not exist, its rules are left as they are");
        return;
    }
    const col = app.findCollectionByNameOrId(name);
    let changed = false;
    for (const rule of ["listRule", "viewRule"]) {
        // The JSVM gives a rule as a pointer object (typeof "object", never === to a string), so the text is read with String(). A null rule stays null.
        const now = col[rule] === null ? null : String(col[rule]);
        if (now === to) {
            continue;
        }
        if (now === from) {
            col[rule] = to;
            changed = true;
        } else {
            console.log("v2 migration: " + name + "." + rule + " has another text, left as it is");
        }
    }
    if (changed) {
        app.save(col);
    }
}

migrate((app) => {
    if (collectionExists(app, "view_links")) {
        console.log("v2 migration: collection view_links exists, left as it is");
    } else {
        const usersId = app.findCollectionByNameOrId("users").id;
        app.save(new Collection({
            type: "base",
            name: "view_links",
            listRule: ADMIN,
            viewRule: ADMIN,
            createRule: ADMIN,
            updateRule: ADMIN,
            deleteRule: ADMIN,
            fields: [
                { name: "name", type: "text", required: true, max: NAME_MAX },
                { name: "key", type: "text", required: true, min: 43, max: 43, pattern: KEY_PATTERN },
                { name: "ends", type: "date" },
                { name: "off", type: "bool" },
                { name: "created_by", type: "relation", collectionId: usersId, maxSelect: 1, cascadeDelete: false },
                created,
                updated,
            ],
            indexes: ["CREATE UNIQUE INDEX idx_view_links_key ON view_links (key)"],
        }));
    }
    if (collectionExists(app, "view_link_opens")) {
        console.log("v2 migration: collection view_link_opens exists, left as it is");
    } else {
        app.save(new Collection({
            type: "base",
            name: "view_link_opens",
            listRule: ADMIN,
            viewRule: ADMIN,
            createRule: OPENS_CREATE,
            updateRule: null,
            deleteRule: null,
            fields: [
                { name: "key", type: "text", required: true, min: 43, max: 43, pattern: KEY_PATTERN },
                created,
            ],
            indexes: ["CREATE INDEX idx_view_link_opens_key_created ON view_link_opens (key, created)"],
        }));
    }
    // The collection view_links exists now, so the new rules can point at it.
    for (const [name, old] of READ_LISTS) {
        moveReadRules(app, name, old, withLink(old));
    }
}, (app) => {
    // First put the old rules back, then the rules no longer point at view_links.
    for (const [name, old] of READ_LISTS) {
        moveReadRules(app, name, withLink(old), old);
    }
    for (const name of ["view_link_opens", "view_links"]) {
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
