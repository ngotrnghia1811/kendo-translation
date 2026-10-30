/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 Reader dashboard fields (unit RC4, round 70; VISION-viewer 15.23).
 *
 * catalog_items (round 69 answers 7 and 9: "S2 writes counts into catalog_items"):
 *   translated json   {"en": [46, 47, 48, 49, 50, 75]}: the English pages that readers can read. S2 writes it. Every signed-in user can read it,
 *                     so a reader who waits for approval sees the progress with one request (VISION-viewer l94).
 *   placement  json   {"web_year": 2025, "web_month": 4, "print_year": 2011, "print_month": 8}: where the folds put a web article.
 *                     The print values come from the print stamp (web-magazine-candidates.jsonl). They are null when the article has no stamp.
 * reader_pages (round 69 answer 10: "Folded text columns in PocketBase"):
 *   search_ja  text   the Japanese text of the page, folded (lowercase, no macron, no hyphen). The search uses the filter ~ on it.
 *   search_en  text   the English agent text of the page and the romaji of its term marks, folded the same way.
 *
 * Rules: none changes. catalog_items stays readable for every signed-in user. reader_pages stays closed to a reader who waits for approval (READ_OK),
 * so that reader gets no page hit from the search (round 68 answer 3).
 *
 * Rules for this file (like migrations 1793300001 to 1793300009):
 *   - Add a field only if it does not exist. If it exists, print a line and change nothing.
 *   - Explicit max sizes on the new fields. A text field without max takes 5,000 characters only (test_local.py check 14b).
 *   - Safe to run twice.
 *
 * Down function (soft): the four fields stay. They hold values that S2 derives again, and a field with data must not drop by a rollback.
 */

const JSON_BYTES = 1048576;
const TEXT_MAX = 100000;

const NEW_FIELDS = {
    catalog_items: [
        () => new JSONField({ name: "translated", maxSize: JSON_BYTES }),
        () => new JSONField({ name: "placement", maxSize: JSON_BYTES }),
    ],
    reader_pages: [
        () => new TextField({ name: "search_ja", max: TEXT_MAX }),
        () => new TextField({ name: "search_en", max: TEXT_MAX }),
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
    console.log("v2 migration down: the fields catalog_items.translated, catalog_items.placement, reader_pages.search_ja, and reader_pages.search_en stay (soft down)");
});
