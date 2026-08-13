/**
 * Custom route: GET /api/custom/article-pages
 *
 * Returns page groupings for a given article, implementing the hybrid
 * pagination logic from docs/BOOK_HIERARCHY_UI_PLAN.md §0.1:
 *
 *   - If the article's segments carry `metadata.page` (int) → group by
 *     that real source-page number (mode: "source_page").
 *   - Otherwise → fall back to fixed-size chunks of 25 segments/page
 *     (mode: "synthetic_chunk").
 *
 * Output shape (same regardless of mode):
 *   { pages: [{ page_number, segment_ids: [...] }], mode: "source_page"|"synthetic_chunk" }
 *
 * Query params:
 *   article_id  — article UUID (required)
 *   target_lang — language code (default "en")
 */

// ── Route ─────────────────────────────────────────────────────────────
routerAdd("GET", "/api/custom/article-pages", function (e) {
    // NOTE: constants must live INSIDE the handler. PocketBase's Goja bridge
    // does not expose module-level `var` declarations to `routerAdd` callbacks
    // (verified against v0.39.10 — a module-level `var` here throws
    // "SYNTH_CHUNK_SIZE is not defined" when the synthetic_chunk branch runs).
    var SYNTH_CHUNK_SIZE = 25;

    var articleId = e.request.url.query().get("article_id") || "";
    var targetLang = e.request.url.query().get("target_lang") || "en";

    if (!articleId) {
        throw new BadRequestError("article_id is required");
    }

    var safeArticleId = articleId.replace(/'/g, "''");
    var safeTargetLang = targetLang.replace(/'/g, "''");
    var db = $app.db();

    // ── STEP 0: Resolve the effective target_lang ──
    // Monolingual articles (e.g. individually-scraped English Kendojidai web
    // articles, `metadata.source = 'kendojidai_monolingual'`) are ingested with
    // a single target_lang that differs from the reader's default 'en' — their
    // English text lives in `source_text` with `target_lang = 'ja'` and an empty
    // `target_text`. Querying `target_lang = 'en'` therefore returns zero rows
    // and produced the "0 pages" symptom. When the requested lang is absent but
    // the article has exactly one distinct lang, fall back to that lang so the
    // synthetic_chunk pagination still resolves the article's real segments.
    var langSQL =
        "SELECT DISTINCT s.target_lang AS tl FROM segments s" +
        " WHERE s.article = '" + safeArticleId + "'";
    var langRows = arrayOf(new DynamicModel({ tl: "" }));
    db.newQuery(langSQL).all(langRows);

    var effectiveLang = safeTargetLang;
    var hasRequested = false;
    var li;
    for (li = 0; li < langRows.length; li++) {
        if (langRows[li].tl === safeTargetLang) {
            hasRequested = true;
            break;
        }
    }
    if (!hasRequested && langRows.length === 1) {
        effectiveLang = langRows[0].tl.replace(/'/g, "''");
    }

    // ── STEP 1: Detect mode — do any segments have metadata.page? ──
    var checkSQL =
        "SELECT EXISTS (" +
        "  SELECT 1 FROM segments s" +
        "  WHERE s.article = '" + safeArticleId + "'" +
        "    AND s.target_lang = '" + effectiveLang + "'" +
        "    AND json_extract(s.metadata, '$.page') IS NOT NULL" +
        "  LIMIT 1" +
        ") AS has_pages";

    var hasPageMetadata = false;
    var checkResult = new DynamicModel({ has_pages: false });
    db.newQuery(checkSQL).one(checkResult);
    hasPageMetadata = checkResult.has_pages || false;

    // ── STEP 2: Fetch segment IDs with positions and page metadata ─
    // IMPORTANT: COALESCE is needed because CAST over a null json_extract
    // result causes a DB-level marshalling error in PocketBase's Goja bridge.
    var segSQL =
        "SELECT s.id, s.position," +
        "  CAST(COALESCE(json_extract(s.metadata, '$.page'), 0) AS INTEGER) AS page_num" +
        " FROM segments s" +
        " WHERE s.article = '" + safeArticleId + "'" +
        "   AND s.target_lang = '" + effectiveLang + "'" +
        " ORDER BY s.position ASC";

    var segRows = arrayOf(new DynamicModel({
        "id":       "",
        "position": 0,
        "page_num": 0,
    }));
    db.newQuery(segSQL).all(segRows);

    if (segRows.length === 0) {
        return e.json(200, {
            pages: [],
            mode: hasPageMetadata ? "source_page" : "synthetic_chunk",
        });
    }

    // ── STEP 3: Build pages ────────────────────────────────────────
    var pages = [];

    if (hasPageMetadata) {
        // MODE: source_page — group by real source-page number.
        // Segments without a page number (page_num === 0) go to page 0.
        var pageMap = {};
        var i, row, pn;

        for (i = 0; i < segRows.length; i++) {
            row = segRows[i];
            pn = row.page_num || 0;
            if (!pageMap[pn]) {
                pageMap[pn] = { page_number: pn, segment_ids: [] };
            }
            pageMap[pn].segment_ids.push(row.id);
        }

        var keys = Object.keys(pageMap).sort(function (a, b) {
            return parseInt(a, 10) - parseInt(b, 10);
        });
        var ki;
        for (ki = 0; ki < keys.length; ki++) {
            pages.push(pageMap[keys[ki]]);
        }

        return e.json(200, { pages: pages, mode: "source_page" });

    } else {
        // MODE: synthetic_chunk — fixed-size chunk pagination
        var currentPage = 1;
        var currentIds = [];
        var j;

        for (j = 0; j < segRows.length; j++) {
            currentIds.push(segRows[j].id);
            if (currentIds.length >= SYNTH_CHUNK_SIZE || j === segRows.length - 1) {
                pages.push({
                    page_number: currentPage,
                    segment_ids: currentIds,
                });
                currentPage = currentPage + 1;
                currentIds = [];
            }
        }

        return e.json(200, { pages: pages, mode: "synthetic_chunk" });
    }
},
    $apis.gzip()
);
