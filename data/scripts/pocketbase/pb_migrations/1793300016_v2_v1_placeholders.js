/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 v1 placeholder (unit VW104, Q-A 3:44.4, 3:45.2, 3:45.3, VISION-viewer 15.26.9).
 *
 * Owner pick Q-A 3:44.4 (2026-11-14): "Show the placeholder on v2". The public v2 site shows the v1 (Gemini) translation of a page as a placeholder.
 * Owner pick Q-A 3:45.2 (2026-11-14): "A. PocketBase collection". The md files of v1 live on one Mac only, so sync command S2 uploads them into this collection.
 * Owner pick Q-A 3:45.3 (2026-11-14): "Rules stay, defaults OK". The rules of VISION-viewer 15.26.9 stay:
 *   - the placeholder counts in no number and is not searched (the text goes into no search column and no count),
 *   - the page line says "v1 Gemini translation placeholder.",
 *   - a page with an agent text shows the placeholder as a separate part, off at first.
 * The app splits the md text into the JA, EN, and ZH lines with the block rule of app/lib/reader-v1.ts (parseV1Md). The collection holds the file text only.
 *
 * Collection v1_placeholders: one record for each md file of v1 (about 13,100 pages in 32 works).
 *   slug      text    the work, for example mental_full (the folder name in data/v1-md)
 *   n         number  page number, from 1 (page_051.md is 51, page_1000.md is 1000)
 *   page_id   text    the page ID of the Reader for that page, for example mental_full/p051 (p0794 for a work with more than 999 pages)
 *   md        text    the whole md file, up to 200,000 characters (the largest file of v1 has 90,572 characters)
 *   sha256    text    SHA-256 of the file bytes (hex), so that S2 can see a changed page without reading the text from the server
 *   created, updated   autodate
 * A work and a page number name one record (unique index on slug and n).
 *
 * Rules: the same read rule as reader_pages (migration 1793300007): a signed-in user whose account is approved, a translator, or an admin reads.
 * A reader who waits for approval reads none of it. Only the superuser (sync command S2) writes.
 *
 * Rules for this file (like migrations 1793300001 to 1793300015):
 *   - Create the collection only if it does not exist. If it exists, print a line and change nothing.
 *   - Set `created` and `updated` as explicit autodate fields. Set an explicit max size on each text field.
 *   - Safe to run twice.
 *
 * Down function (soft, like 1793300013): delete the collection only if it holds 0 records. A collection with records stays, and the function prints a line.
 */

const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };
const updated = { name: "updated", type: "autodate", onCreate: true, onUpdate: true };

// The same text as READ_OK in migration 1793300007 (line 33).
const READ_OK = '@request.auth.id != "" && (@request.auth.approved = true || @request.auth.role = "translator" || @request.auth.role = "admin")';

const MD_MAX_CHARS = 200000;

function collectionExists(app, name) {
    try {
        app.findCollectionByNameOrId(name);
        return true;
    } catch (_) {
        return false;
    }
}

migrate((app) => {
    if (collectionExists(app, "v1_placeholders")) {
        console.log("v2 migration: collection v1_placeholders exists, left as it is");
        return;
    }
    app.save(new Collection({
        type: "base",
        name: "v1_placeholders",
        listRule: READ_OK,
        viewRule: READ_OK,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
            { name: "slug", type: "text", required: true, max: 200 },
            { name: "n", type: "number", required: true, onlyInt: true, min: 1 },
            { name: "page_id", type: "text", required: true, max: 200 },
            { name: "md", type: "text", max: MD_MAX_CHARS },
            { name: "sha256", type: "text", max: 64 },
            created,
            updated,
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_v1_placeholders_slug_n ON v1_placeholders (slug, n)",
            "CREATE INDEX idx_v1_placeholders_slug ON v1_placeholders (slug)",
        ],
    }));
}, (app) => {
    if (!collectionExists(app, "v1_placeholders")) {
        return;
    }
    if (app.countRecords("v1_placeholders") > 0) {
        console.log("v2 migration down: collection v1_placeholders has records, kept");
        return;
    }
    app.delete(app.findCollectionByNameOrId("v1_placeholders"));
});
