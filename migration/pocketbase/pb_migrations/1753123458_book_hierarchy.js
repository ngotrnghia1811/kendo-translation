/// <reference path="../pb_data/types.d.ts" />

/**
 * Book Hierarchy Migration — Kendo Translation
 *
 * Adds a `books` collection and a `book` relation field on `articles`
 * to support the new content hierarchy: Book → Article → Page (segments).
 *
 * The flat `doc_type` approach is replaced with a real parent-child
 * relationship where every article belongs to exactly one book.
 *
 * Books are metadata-only containers:
 *   - title / title_ja (the book's display name)
 *   - author / summary (from the original doc_type='book' article)
 *   - book_type: year_compilation | topic_compilation | uncategorized
 *   - year: for kendojidai year-compilation books (2010-present)
 *   - source_book_id: tracks the original article UUID this book was derived from
 *
 * The `doc_type` field on articles is preserved for backward compatibility
 * during the transition period. Once all app code is updated to use the
 * book relation, doc_type can be removed in a follow-up migration.
 *
 * Verified against PocketBase v0.39.10 — 2026-08-08.
 */

migrate((app) => {
    // ================================================================
    // 1. BOOKS COLLECTION — new top-level container collection
    // ================================================================
    const books = new Collection({
        type: "base",
        name: "books",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "title",          type: "text",   required: true },
            { name: "title_ja",       type: "text",   required: false },
            { name: "author",         type: "text",   required: false },
            { name: "summary",        type: "text",   required: false },
            { name: "source_book_id", type: "text",   required: false },
            { name: "book_type",      type: "select", required: true,
              values: ["year_compilation", "topic_compilation", "uncategorized"],
              maxSelect: 1 },
            { name: "year",           type: "number", required: false },
        ],
        indexes: [
            "CREATE INDEX idx_books_type ON books (book_type)",
            "CREATE INDEX idx_books_year ON books (year)",
        ],
    });
    app.save(books);
    const BOOKS_ID = books.id;

    // ================================================================
    // 2. ARTICLES — add book relation field
    // ================================================================
    const articles = app.findCollectionByNameOrId("articles");
    articles.fields.add(
        new RelationField({
            name: "book",
            required: false,
            collectionId: BOOKS_ID,
            cascadeDelete: false,
            maxSelect: 1,
        })
    );
    articles.indexes.push("CREATE INDEX idx_articles_book ON articles (book)");
    app.save(articles);

}, (app) => {
    // ================================================================
    // DOWN MIGRATION — reverse everything
    // ================================================================

    // Remove book field from articles
    try {
        const articles = app.findCollectionByNameOrId("articles");
        articles.fields.removeByName("book");
        articles.indexes = articles.indexes.filter(i => !i.includes("idx_articles_book"));
        app.save(articles);
    } catch (_) {
        // Field may not exist if up migration partially failed
    }

    // Delete books collection
    try {
        app.delete(app.findCollectionByNameOrId("books"));
    } catch (_) {
        // Collection may not exist
    }
});
