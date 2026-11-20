/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 visual issues (unit VW118, plan item P53, Q-A 3:98.5, 3:99.5).
 *
 * Owner words (Q-A 3:98.5, 2026-11-19): "Add a visual-issue tool: + a small floating icon + If user click it, they will take screenshot of a specific part
 * of the current page (esc to go back) + then write a comment and draw on the screenshot, then click send issue. + We will store these issue and gradually resolve them".
 * Accepted design rows (Q-A 3:99.5, "Accept all rows", 2026-11-19 19:26 PST): row 5 (what an issue stores) and row 6 (the store and who sees it).
 *
 * Collection visual_issues: one record for each issue that a translator or an admin sends from a screen.
 *   user          relation to users, required. The person who sent the issue.
 *   picture       file, one PNG, at most 5 MB (5242880 bytes), protected. The part of the screen with the drawing of the person.
 *                 Protected means that a file address needs a short-lived file token of a user who may view the record (the rule viewRule applies).
 *   comment       text, required, at most 5000 characters.
 *   page_url      text, at most 2000 characters. The path and the query of the page, without the host (the app cuts the host before it stores).
 *   screen_width  number, a whole number from 1 to 20000. The width of the window in pixels.
 *   theme         text, at most 40 characters. The theme of the page, for example "dark".
 *   state         select, required: "open" or "resolved". A new issue is "open".
 *   resolve_note  text, at most 2000 characters. The admin writes it at "Mark resolved", for example "unit VW1xx, commit abc1234".
 *   created, updated   autodate
 * Index on state and created, so that the page /admin/issues lists open issues first.
 *
 * Rules (the owner rows 1 and 6 hold in PocketBase even if the app has a fault):
 *   - Create: a signed-in translator or admin, AND the record user is the signed-in user, AND the state is "open", AND no resolve note.
 *     @request.auth.id != "" && (@request.auth.role = "translator" || @request.auth.role = "admin") && @request.body.user = @request.auth.id
 *       && @request.body.state = "open" && @request.body.resolve_note:isset = false
 *   - List and view: an admin sees all issues. A translator sees the own issues only. A reader sees none.
 *     @request.auth.id != "" && (@request.auth.role = "admin" || (@request.auth.role = "translator" && user = @request.auth.id))
 *   - Update and delete: admin only (@request.auth.role = "admin").
 *   Readers can do nothing. A request without a sign-in is refused (the auth id is empty).
 *
 * Rules for this file (like migrations 1793300001 to 1793300016):
 *   - Create the collection only if it does not exist. If it exists, print a line and change nothing.
 *   - Set `created` and `updated` as explicit autodate fields. Set an explicit max size on each text field.
 *   - Safe to run twice.
 *
 * Down function (soft, like 1793300013 and 1793300016): delete the collection only if it holds 0 records. A collection with records stays, and the function prints a line.
 */

const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };
const updated = { name: "updated", type: "autodate", onCreate: true, onUpdate: true };

const PICTURE_BYTES = 5242880;
const COMMENT_MAX = 5000;
const PAGE_URL_MAX = 2000;
const THEME_MAX = 40;
const NOTE_MAX = 2000;

const CREATE_RULE =
    '@request.auth.id != "" && (@request.auth.role = "translator" || @request.auth.role = "admin") && @request.body.user = @request.auth.id' +
    ' && @request.body.state = "open" && @request.body.resolve_note:isset = false';
const READ_RULE = '@request.auth.id != "" && (@request.auth.role = "admin" || (@request.auth.role = "translator" && user = @request.auth.id))';
const ADMIN = '@request.auth.role = "admin"';

function collectionExists(app, name) {
    try {
        app.findCollectionByNameOrId(name);
        return true;
    } catch (_) {
        return false;
    }
}

migrate((app) => {
    if (collectionExists(app, "visual_issues")) {
        console.log("v2 migration: collection visual_issues exists, left as it is");
        return;
    }
    const usersId = app.findCollectionByNameOrId("users").id;
    app.save(new Collection({
        type: "base",
        name: "visual_issues",
        listRule: READ_RULE,
        viewRule: READ_RULE,
        createRule: CREATE_RULE,
        updateRule: ADMIN,
        deleteRule: ADMIN,
        fields: [
            { name: "user", type: "relation", collectionId: usersId, maxSelect: 1, required: true, cascadeDelete: false },
            { name: "picture", type: "file", maxSelect: 1, maxSize: PICTURE_BYTES, mimeTypes: ["image/png"], protected: true, required: true },
            { name: "comment", type: "text", required: true, max: COMMENT_MAX },
            { name: "page_url", type: "text", max: PAGE_URL_MAX },
            { name: "screen_width", type: "number", onlyInt: true, min: 1, max: 20000 },
            { name: "theme", type: "text", max: THEME_MAX },
            { name: "state", type: "select", required: true, maxSelect: 1, values: ["open", "resolved"] },
            { name: "resolve_note", type: "text", max: NOTE_MAX },
            created,
            updated,
        ],
        indexes: ["CREATE INDEX idx_visual_issues_state_created ON visual_issues (state, created)"],
    }));
}, (app) => {
    if (!collectionExists(app, "visual_issues")) {
        return;
    }
    if (app.countRecords("visual_issues") > 0) {
        console.log("v2 migration down: collection visual_issues has records, kept");
        return;
    }
    app.delete(app.findCollectionByNameOrId("visual_issues"));
});
