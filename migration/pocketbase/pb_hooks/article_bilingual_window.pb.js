/**
 * Custom route: GET /api/custom/article-bilingual-window
 *
 * Reimplements the Supabase RPC function get_article_bilingual_window
 * (migration 012/013) for PocketBase.
 *
 * Returns paginated bilingual segments, same column shape as the
 * original function. Two modes:
 *   a) page IS NULL  → OFFSET/LIMIT over position-ordered rows
 *   b) page IS SET   → filter by metadata.page (book documents)
 *
 * Query params:
 *   article_id   — article UUID (required)
 *   target_lang  — language code (default "en")
 *   offset       — skip count (default 0, ignored when page is set)
 *   limit        — max rows (default 50, max 200)
 *   page         — metadata page number (optional, overrides offset/limit)
 */

routerAdd("GET", "/api/custom/article-bilingual-window", (e) => {
    const articleId = e.request.url.query().get("article_id") || "";
    const targetLang = e.request.url.query().get("target_lang") || "en";
    const rawOffset = parseInt(e.request.url.query().get("offset") || "0", 10) || 0;
    const rawLimit = Math.min(
        parseInt(e.request.url.query().get("limit") || "50", 10) || 50,
        200
    );
    const rawPage = e.request.url.query().get("page") || "";

    if (!articleId) {
        throw new BadRequestError("article_id is required");
    }

    // Sanitize
    const safeArticleId = articleId.replace(/'/g, "''");
    const safeTargetLang = targetLang.replace(/'/g, "''");

    // Build SQL
    let whereClause = `s.article_id = '${safeArticleId}' AND s.target_lang = '${safeTargetLang}'`;

    if (rawPage !== "") {
        const pageNum = parseInt(rawPage, 10);
        if (!isNaN(pageNum)) {
            whereClause += ` AND CAST(json_extract(s.metadata, '$.page') AS INTEGER) = ${pageNum}`;
        }
    }

    let limitClause = "";
    let offsetClause = "";

    if (rawPage === "") {
        // OFFSET/LIMIT mode
        limitClause = `LIMIT ${rawLimit}`;
        if (rawOffset > 0) {
            offsetClause = `OFFSET ${rawOffset}`;
        }
    }

    const sql = `
        SELECT
            s.id,
            s.article_id,
            s.position,
            s.source_text,
            s.target_text,
            s.source_lang,
            s.target_lang,
            s.status,
            s.locked_by,
            s.locked_at,
            s.translated_by,
            s.reviewed_by,
            s.quality_detail,
            s.metadata,
            s.created,
            s.updated
        FROM segments s
        WHERE ${whereClause}
        ORDER BY s.position ASC
        ${limitClause}
        ${offsetClause}
    `;

    const db = $app.db();

    const result = arrayOf(new DynamicModel({
        "id":             "",
        "article_id":     "",
        "position":       0,
        "source_text":    "",
        "target_text":    "",
        "source_lang":    "",
        "target_lang":    "",
        "status":         "",
        "locked_by":      "",
        "locked_at":      "",
        "translated_by":  "",
        "reviewed_by":    "",
        "quality_detail": "",
        "metadata":       "",
        "created":        "",
        "updated":        "",
    }));

    db.newQuery(sql).all(result);

    // Build response array
    const items = [];
    for (let i = 0; i < result.length; i++) {
        const row = result[i];
        const parseJson = (val) => {
            if (!val) return null;
            try { return typeof val === "string" ? JSON.parse(val) : val; } catch { return val; }
        };
        items.push({
            id:             row.get("id"),
            article_id:     row.get("article_id"),
            position:       row.getInt("position"),
            source_text:    row.get("source_text") || "",
            target_text:    row.get("target_text") || "",
            source_lang:    row.get("source_lang") || "",
            target_lang:    row.get("target_lang") || "",
            status:         row.get("status") || "",
            locked_by:      row.get("locked_by") || null,
            locked_at:      row.get("locked_at") || null,
            translated_by:  row.get("translated_by") || null,
            reviewed_by:    row.get("reviewed_by") || null,
            quality_detail: parseJson(row.get("quality_detail")),
            metadata:       parseJson(row.get("metadata")),
            created_at:     row.get("created") || "",
            updated_at:     row.get("updated") || "",
        });
    }

    return e.json(200, { items, total: items.length });
},
    $apis.gzip()
);
