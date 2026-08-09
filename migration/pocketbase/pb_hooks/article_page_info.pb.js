/**
 * Custom route: GET /api/custom/article-page-info
 *
 * Reimplements the Supabase RPC function get_article_page_info
 * (migration 012) for PocketBase.
 *
 * Returns lightweight pager metadata: total readable count,
 * whether source-book page metadata exists, and distinct page numbers.
 *
 * Query params:
 *   article_id     — article UUID (required)
 *   target_lang    — language code (default "en")
 *   publish_filter — "qa_approved" | "any_translated" (default "any_translated")
 */

routerAdd("GET", "/api/custom/article-page-info", (e) => {
    const articleId = e.request.url.query().get("article_id") || "";
    const targetLang = e.request.url.query().get("target_lang") || "en";
    const publishFilter = e.request.url.query().get("publish_filter") || "any_translated";

    if (!articleId) {
        throw new BadRequestError("article_id is required");
    }

    // Sanitize inputs
    const safeArticleId = articleId.replace(/'/g, "''");
    const safeTargetLang = targetLang.replace(/'/g, "''");

    // Build publish filter (same logic as original Supabase function)
    let publishCondition;
    if (publishFilter === "qa_approved") {
        publishCondition = "s.status = 'qa_approved'";
    } else {
        publishCondition = "(s.status = 'qa_approved' OR s.target_text IS NOT NULL AND s.target_text != '')";
    }

    const db = $app.db();

    // ── Total count ──────────────────────────────────────────────
    const countSql = `
        SELECT COUNT(*) AS total_count
        FROM segments s
        WHERE s.article_id = '${safeArticleId}'
          AND s.target_lang = '${safeTargetLang}'
          AND ${publishCondition}
    `;

    let totalCount = 0;
    const countResult = new DynamicModel({ total_count: 0 });
    db.newQuery(countSql).one(countResult);
    totalCount = countResult.getInt("total_count") || 0;

    // ── Has page metadata check ──────────────────────────────────
    const pageCheckSql = `
        SELECT EXISTS (
            SELECT 1 FROM segments s
            WHERE s.article_id = '${safeArticleId}'
              AND s.target_lang = '${safeTargetLang}'
              AND ${publishCondition}
              AND json_extract(s.metadata, '$.page') IS NOT NULL
            LIMIT 1
        ) AS has_pages
    `;

    let hasPageMetadata = false;
    const pageCheckResult = new DynamicModel({ has_pages: false });
    db.newQuery(pageCheckSql).one(pageCheckResult);
    hasPageMetadata = pageCheckResult.getBool("has_pages") || false;

    // ── Distinct pages ────────────────────────────────────────────
    let distinctPages = [];
    if (hasPageMetadata) {
        const pagesSql = `
            SELECT DISTINCT CAST(json_extract(s.metadata, '$.page') AS INTEGER) AS pn
            FROM segments s
            WHERE s.article_id = '${safeArticleId}'
              AND s.target_lang = '${safeTargetLang}'
              AND ${publishCondition}
              AND json_extract(s.metadata, '$.page') IS NOT NULL
            ORDER BY pn ASC
        `;

        const pagesResult = arrayOf(new DynamicModel({ pn: 0 }));
        db.newQuery(pagesSql).all(pagesResult);

        distinctPages = [];
        for (let i = 0; i < pagesResult.length; i++) {
            distinctPages.push(pagesResult[i].getInt("pn"));
        }
    }

    return e.json(200, {
        total_count: totalCount,
        has_page_metadata: hasPageMetadata,
        distinct_pages: distinctPages,
    });
},
    $apis.gzip()
);
