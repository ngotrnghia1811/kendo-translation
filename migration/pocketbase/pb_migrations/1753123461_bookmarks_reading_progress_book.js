/// <reference path="../pb_data/types.d.ts" />

/**
 * Book → Article → Page hierarchy — schema extension for bookmarks & reading_progress.
 *
 * Adds `book` (relation → books, nullable) and `page_number` (number, nullable) to
 * both collections. Existing rows keep working via their `article` fields unchanged;
 * no backfill required.
 *
 * Phase 1 of docs/BOOK_HIERARCHY_UI_PLAN.md.
 */

migrate((app) => {
    // ── BOOKMARKS ──────────────────────────────────────────────────
    const bookmarks = app.findCollectionByNameOrId("bookmarks");
    bookmarks.fields.add(
        new RelationField({
            name: "book",
            required: false,
            collectionId: app.findCollectionByNameOrId("books").id,
            cascadeDelete: false,
            maxSelect: 1,
        })
    );
    bookmarks.fields.add(
        new NumberField({
            name: "page_number",
            required: false,
        })
    );
    bookmarks.indexes.push(
        "CREATE INDEX idx_bookmarks_book ON bookmarks (book)"
    );
    app.save(bookmarks);

    // ── READING PROGRESS ──────────────────────────────────────────
    const readingProgress = app.findCollectionByNameOrId("reading_progress");
    readingProgress.fields.add(
        new RelationField({
            name: "book",
            required: false,
            collectionId: app.findCollectionByNameOrId("books").id,
            cascadeDelete: false,
            maxSelect: 1,
        })
    );
    readingProgress.fields.add(
        new NumberField({
            name: "page_number",
            required: false,
        })
    );
    readingProgress.indexes.push(
        "CREATE INDEX idx_reading_progress_book ON reading_progress (book)"
    );
    app.save(readingProgress);

}, (app) => {
    // ── DOWN ───────────────────────────────────────────────────────
    for (const collName of ["bookmarks", "reading_progress"]) {
        try {
            const coll = app.findCollectionByNameOrId(collName);
            for (const fn of ["book", "page_number"]) {
                coll.fields.removeByName(fn);
            }
            coll.indexes = coll.indexes.filter(
                (i) => !i.includes(`idx_${collName}_book`)
            );
            app.save(coll);
        } catch (_) {}
    }
});
