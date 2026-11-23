/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 dictionary (unit VW126, plan item P65, Q-A 3:116.8, 3:117.6 rows 1 to 4).
 *
 * Owner words (Q-A 3:116.8): "We will have a kendo dict web page (for all roles) with a agent-proposal tab (not for reader)".
 * Owner pick (Q-A 3:117.6): "Live site and this Mac". The live site has no access to the Translator files, so the 1,030 entries of
 * data/termbase/termbase.draft.jsonl (in the Translator folder) live in this list. The sync command app/scripts/sync-dictionary.mjs copies them (dry run by default).
 *
 * Collection dictionary_entries: one record for each entry of the termbase.
 *   entry_id    text, required, at most 64 characters. The termbase entry ID, for example c-00a61202322b. Unique. The entry IDs never change.
 *   headword    text, required, at most 300 characters. The Japanese headword.
 *   variants    json, an array of other writings of the headword.
 *   reading     text, at most 300 characters. The first reading in kana.
 *   romaji      text, at most 300 characters. The preferred romaji.
 *   concise_en  text, at most 600 characters. The EN form: the preferred English term.
 *   short_en    text, at most 400 characters. The short English explanation: the first sentence of the first English definition.
 *   common      text, at most 40 characters. "common" or "not common".
 *   view        json, at most 5 MB. The full entry that the page shows (all languages, terms, definitions, other writings, sources).
 *   search_ja   text, at most 30000 characters. The folded Japanese text for the search (headword, other writings, readings, Japanese definitions).
 *   search_en   text, at most 30000 characters. The folded romaji and English text for the search.
 *   sort_key    text, at most 300 characters. The folded reading. The list of the page sorts by it.
 *   created, updated   autodate
 *
 * Rules (the same people as the reader pages, reader_pages):
 *   List and view: READ_OK (a signed-in approved reader, a translator, or an admin) OR LINK_OK (a visitor of a view-only link, unit VW120).
 *   Create, update, delete: null. Only the superuser (the sync command) writes. No signed-in person and no link key can write.
 *   A reader who waits for approval and a signed-out person read nothing.
 *
 * Rules for this file (like migrations 1793300001 to 1793300018):
 *   - Create the collection only if it does not exist. If it exists, print a line and change nothing.
 *   - Set `created` and `updated` as explicit autodate fields. Set an explicit max on each text field.
 *   - Safe to run twice. This file changes no other collection.
 *
 * Down function: delete the collection only if it holds 0 records. A list with records stays, and the function prints a line.
 */

const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };
const updated = { name: "updated", type: "autodate", onCreate: true, onUpdate: true };

const JSON_BYTES = 5242880; // 5 MB, the limit of each JSON field (the same as migration 1793300007)
const NAME = "dictionary_entries";

const READ_OK = '@request.auth.id != "" && (@request.auth.approved = true || @request.auth.role = "translator" || @request.auth.role = "admin")';

// The header X-Kendo-View-Key reaches a rule as @request.headers.x_kendo_view_key (lower case, "-" becomes "_"). The same text as migration 1793300018.
const LINK_OK =
    '@request.headers.x_kendo_view_key != "" && @collection.view_links:l.key ?= @request.headers.x_kendo_view_key && @collection.view_links:l.off ?= false' +
    ' && (@collection.view_links:l.ends ?= "" || @collection.view_links:l.ends ?> @now)';

const READ_RULE = "(" + READ_OK + ") || (" + LINK_OK + ")";

function collectionExists(app, name) {
    try {
        app.findCollectionByNameOrId(name);
        return true;
    } catch (_) {
        return false;
    }
}

migrate((app) => {
    if (collectionExists(app, NAME)) {
        console.log("v2 migration: collection " + NAME + " exists, left as it is");
        return;
    }
    // The rule LINK_OK points at view_links (migration 1793300018). Without that list the rule does not compile, so stop with a plain line.
    if (!collectionExists(app, "view_links")) {
        throw new Error("v2 migration 1793300019: the collection view_links does not exist. Run migration 1793300018 first.");
    }
    app.save(new Collection({
        type: "base",
        name: NAME,
        listRule: READ_RULE,
        viewRule: READ_RULE,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
            { name: "entry_id", type: "text", required: true, min: 1, max: 64 },
            { name: "headword", type: "text", required: true, max: 300 },
            { name: "variants", type: "json", maxSize: 100000 },
            { name: "reading", type: "text", max: 300 },
            { name: "romaji", type: "text", max: 300 },
            { name: "concise_en", type: "text", max: 600 },
            { name: "short_en", type: "text", max: 400 },
            { name: "common", type: "text", max: 40 },
            { name: "view", type: "json", maxSize: JSON_BYTES },
            { name: "search_ja", type: "text", max: 30000 },
            { name: "search_en", type: "text", max: 30000 },
            { name: "sort_key", type: "text", max: 300 },
            created,
            updated,
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_dictionary_entries_entry_id ON dictionary_entries (entry_id)",
            "CREATE INDEX idx_dictionary_entries_sort_key ON dictionary_entries (sort_key)",
        ],
    }));
}, (app) => {
    if (!collectionExists(app, NAME)) {
        return;
    }
    if (app.countRecords(NAME) > 0) {
        console.log("v2 migration down: collection " + NAME + " has records, kept");
        return;
    }
    app.delete(app.findCollectionByNameOrId(NAME));
});
