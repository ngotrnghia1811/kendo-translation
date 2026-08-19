/// <reference path="../pb_data/types.d.ts" />

/**
 * Glossary / Terminology Collection Migration — Kendo Translation
 *
 * Migration script skeleton for the dedicated `glossary` collection.
 * Stores per-term trilingual and multilingual entries (JA/EN/KO/VI/ZH)
 * derived from `kendo_dict.md` and related translation glossaries.
 *
 * Schema fields:
 *   - category: Domain / group (e.g. "Dojo Commands / 道場用語", "Shiai Terms & Commands")
 *   - term_ja: Japanese term in Kanji / Kana (e.g. "始め") — required
 *   - reading: Reading in Kana / Romaji (e.g. "はじめ / Hajime")
 *   - notes_ja: Japanese definition / contextual notes
 *   - term_en: English translation / term
 *   - notes_en: English definition / notes
 *   - term_ko: Korean translation / term (e.g. "시작")
 *   - notes_ko: Korean definition / notes
 *   - term_vi: Vietnamese translation / term (e.g. "Bắt đầu / Khởi động")
 *   - notes_vi: Vietnamese definition / notes
 *   - term_zh: Chinese translation / term
 *   - notes_zh: Chinese definition / notes
 *
 * DO NOT RUN AGAINST PRODUCTION IN PHASE 0 — Skeleton for future explicit apply.
 * Verified against PocketBase v0.39.10 JS API conventions.
 */

migrate((app) => {
    const glossary = new Collection({
        type: "base",
        name: "glossary",
        listRule: "",
        viewRule: "",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
            { name: "category",  type: "text", required: false },
            { name: "term_ja",   type: "text", required: true },
            { name: "reading",   type: "text", required: false },
            { name: "notes_ja",  type: "text", required: false },
            { name: "term_en",   type: "text", required: false },
            { name: "notes_en",  type: "text", required: false },
            { name: "term_ko",   type: "text", required: false },
            { name: "notes_ko",  type: "text", required: false },
            { name: "term_vi",   type: "text", required: false },
            { name: "notes_vi",  type: "text", required: false },
            { name: "term_zh",   type: "text", required: false },
            { name: "notes_zh",  type: "text", required: false },
        ],
        indexes: [
            "CREATE INDEX idx_glossary_category ON glossary (category)",
            "CREATE INDEX idx_glossary_term_ja ON glossary (term_ja)",
            "CREATE INDEX idx_glossary_term_en ON glossary (term_en)",
            "CREATE INDEX idx_glossary_term_ko ON glossary (term_ko)",
            "CREATE INDEX idx_glossary_term_vi ON glossary (term_vi)",
        ],
    });
    app.save(glossary);
}, (app) => {
    try {
        app.delete(app.findCollectionByNameOrId("glossary"));
    } catch (_) {
        // Collection may not exist
    }
});
