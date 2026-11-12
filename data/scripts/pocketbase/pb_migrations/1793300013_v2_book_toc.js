/// <reference path="../pb_data/types.d.ts" />

/**
 * v2 table of contents (ToC) of the books (unit VW77e part 1, Q-A 3:10.3 to 3:10.5, round 72 answer 1 of 2026-10-30).
 * The Reader dashboard /read shows each book as a fold with its chapter rows. The hosted Reader reads PocketBase only,
 * so sync command S2 loads <Translator data>/item-metadata/book-toc.jsonl (made by data/scripts/book_toc.py, 23 books, 1,181 rows) into this collection.
 *
 * Collection book_toc: one record for each ToC row of one book.
 *   book           text    slug of the book, for example ogawa_lecture_part1 (Lectures on Kendo has 3 books)
 *   order          number  position in the book, from 1. Unique together with book.
 *   level          number  1 = chapter row, 2 = sub-row (Q-A 3:10.5 R1)
 *   title_ja       text    Japanese title (always set)
 *   title_en       text    English title (empty on 77 rows of the file: the row shows the Japanese title)
 *   page_ref       text    the page number as printed in the book, for example "15". Empty on 23 rows (Q-A 3:10.5 R2).
 *   page_ref_num   number  the same as a number. 0 = none.
 *   offset         number  PDF page minus book page. 0 = none or 0.
 *   pdf_page       number  the PDF page that the row opens. 0 = none (1 row of the file has none).
 *   page_id        text    page ID of that PDF page, for example ogawa_lecture_part1/p008. Empty when none.
 *   created, updated   autodate
 * The research keys of the file (status, evidence, notes, match_*, source_*, offset_basis, title_en_source) are NOT copied.
 *
 * Rules: every signed-in user reads (like magazine_chapters). Only the superuser (sync command S2) writes.
 *
 * Rules for this file (like migrations 1793300001 to 1793300012):
 *   - Create the collection only if it does not exist. If it exists, print a line and change nothing.
 *   - Set `created` and `updated` as explicit autodate fields.
 *   - Safe to run twice.
 *
 * Down function (soft): delete the collection only if it holds 0 records. A collection with records stays.
 */

const created = { name: "created", type: "autodate", onCreate: true, onUpdate: false };
const updated = { name: "updated", type: "autodate", onCreate: true, onUpdate: true };
const SIGNED_IN = '@request.auth.id != ""';

function collectionExists(app, name) {
    try {
        app.findCollectionByNameOrId(name);
        return true;
    } catch (_) {
        return false;
    }
}

migrate((app) => {
    if (collectionExists(app, "book_toc")) {
        console.log("v2 migration: collection book_toc exists, left as it is");
        return;
    }
    app.save(new Collection({
        type: "base",
        name: "book_toc",
        listRule: SIGNED_IN,
        viewRule: SIGNED_IN,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
            { name: "book", type: "text", required: true },
            { name: "order", type: "number", onlyInt: true },
            { name: "level", type: "number", onlyInt: true },
            { name: "title_ja", type: "text", required: true, max: 1000 },
            { name: "title_en", type: "text", max: 1000 },
            { name: "page_ref", type: "text" },
            { name: "page_ref_num", type: "number", onlyInt: true },
            { name: "offset", type: "number", onlyInt: true },
            { name: "pdf_page", type: "number", onlyInt: true },
            { name: "page_id", type: "text" },
            created,
            updated,
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_book_toc_book_order ON book_toc (book, `order`)",
            "CREATE INDEX idx_book_toc_book ON book_toc (book)",
        ],
    }));
}, (app) => {
    if (!collectionExists(app, "book_toc")) {
        return;
    }
    if (app.countRecords("book_toc") > 0) {
        console.log("v2 migration down: collection book_toc has records, kept");
        return;
    }
    app.delete(app.findCollectionByNameOrId("book_toc"));
});
