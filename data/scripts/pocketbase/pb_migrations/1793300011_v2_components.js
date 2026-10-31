/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 text-only works and the Human version of web articles (unit RT73a, round 73; VISION-viewer 15.26.13).
 *
 * own_translations (round 73 answer 5: the kendojidai.com English text is the chosen Human version of the 311 web articles):
 *   facts  json   the fact marks of the row: a list of {start, end, ja, type, kind}. kind is "changed" or "dropped" (VISION-viewer 15.26.8).
 *                 S2 writes the copy of the kendojidai.com text under the disabled system account "kendojidai.com", version 1 (design D26).
 *                 A row of a translator has no facts. The field stays empty there.
 *
 * What this file does not add (owner answer 8 of round 73d: "This Mac, copy in data folder"):
 *   - no collection reader_v1. The Viewer reads the v1 md files from a folder on this Mac when a page opens.
 *   - no field that says which components a page has. The run_id "web-ja" of a reader_pages record says "Original text only, no Agent text".
 *   - no rule change. reader_versions.chosen_by stays an optional relation: an empty value means "chosen by default".
 *
 * Rules for this file (like migrations 1793300001 to 1793300010):
 *   - Add a field only if it does not exist. If it exists, print a line and change nothing.
 *   - Explicit max size on the new field. A JSON field without maxSize takes 1 MB only.
 *   - Safe to run twice. Older data stays as it is.
 *
 * Down function (soft): the field stays. It holds values that S2 derives again, and a field with data must not drop by a rollback.
 */

const JSON_BYTES = 1048576;

const NEW_FIELDS = {
    own_translations: [
        () => new JSONField({ name: "facts", maxSize: JSON_BYTES }),
    ],
};

migrate((app) => {
    for (const name of Object.keys(NEW_FIELDS)) {
        let collection;
        try {
            collection = app.findCollectionByNameOrId(name);
        } catch (_) {
            console.log("v2 migration: collection " + name + " is missing, left as it is");
            continue;
        }
        let changed = false;
        for (const make of NEW_FIELDS[name]) {
            const field = make();
            if (collection.fields.getByName(field.name)) {
                console.log("v2 migration: field " + name + "." + field.name + " exists, left as it is");
                continue;
            }
            collection.fields.add(field);
            changed = true;
        }
        if (changed) {
            app.save(collection);
        }
    }
}, (app) => {
    console.log("v2 migration down: the field own_translations.facts stays (soft down)");
});
