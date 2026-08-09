/// <reference path="../pb_data/types.d.ts" />

/**
 * Fix text field max lengths for large content fields.
 * PocketBase defaults text fields to max 5000 characters.
 * Several fields in the backup exceed this:
 *   articles.content_en: up to 29,375 chars
 *   articles.content_ja: up to 11,316 chars
 *   segments.target_text: up to 12,091 chars
 *   segments.source_text: up to 1,664 chars (under 5000 but set anyway)
 */
migrate((app) => {
    // Fix articles content fields
    const articles = app.findCollectionByNameOrId("articles");
    for (const fn of ["content_en", "content_ja"]) {
        const field = articles.fields.find(f => f.name === fn);
        if (field) {
            field.max = 100000;
        }
    }
    app.save(articles);

    // Fix segments text fields
    const segments = app.findCollectionByNameOrId("segments");
    for (const fn of ["source_text", "target_text"]) {
        const field = segments.fields.find(f => f.name === fn);
        if (field) {
            field.max = 50000;
        }
    }
    app.save(segments);

}, (app) => {
    const articles = app.findCollectionByNameOrId("articles");
    for (const fn of ["content_en", "content_ja"]) {
        const field = articles.fields.find(f => f.name === fn);
        if (field) field.max = 0;
    }
    app.save(articles);

    const segments = app.findCollectionByNameOrId("segments");
    for (const fn of ["source_text", "target_text"]) {
        const field = segments.fields.find(f => f.name === fn);
        if (field) field.max = 0;
    }
    app.save(segments);
});
