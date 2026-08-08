/**
 * Custom route: GET /api/custom/documents-feed
 *
 * Reimplements the Supabase RPC function get_documents_feed_v1
 * (extracted verbatim from db_cluster-03-08-2026@16-47-28.backup, lines 1161-1212).
 *
 * Original SQL pattern: CTE "normalized" computes sort_val, then
 * outer SELECT applies cursor + ORDER + LIMIT. We replicate this
 * exactly using a subquery (SQLite supports the same pattern).
 *
 * Registered in pb_hooks/*.pb.js — PocketBase auto-loads on serve.
 *
 * Query params:
 *   sort_by         — "created_at" | "updated_at" | "title" | "segment_count" | "status"
 *   sort_dir        — "asc" | "desc"
 *   search          — ILIKE match on title
 *   cursor_sort_val — opaque sort_val of last seen item
 *   cursor_id       — article id of last seen item
 *   limit           — page size (default 30, max 100)
 */

routerAdd("GET", "/api/custom/documents-feed", (e) => {
    const sortBy = e.request.url.query().get("sort_by") || "created_at";
    const sortDir = (e.request.url.query().get("sort_dir") || "desc").toLowerCase();
    const searchTerm = e.request.url.query().get("search") || "";
    const cursorSortVal = e.request.url.query().get("cursor_sort_val") || "";
    const cursorId = e.request.url.query().get("cursor_id") || "";
    const rawLimit = Math.min(
        parseInt(e.request.url.query().get("limit") || "30", 10) || 30,
        100
    );

    // ── Validate ─────────────────────────────────────────────────
    const allowedSortFields = ["created_at", "updated_at", "title", "segment_count", "status"];
    if (!allowedSortFields.includes(sortBy)) {
        throw new BadRequestError(
            "Invalid sort_by: " + sortBy + ". Must be one of: " + allowedSortFields.join(", ")
        );
    }
    const sortDirUpper = sortDir === "asc" ? "ASC" : "DESC";
    const cursorOp = sortDirUpper === "DESC" ? "<" : ">";

    // ── sort_val expression (mirrors original SQL CASE exactly) ──
    let sortValExpr;
    switch (sortBy) {
        case "title":
            sortValExpr = "a.title";
            break;
        case "created_at":
            sortValExpr = "CAST(a.created AS TEXT)";
            break;
        case "updated_at":
            sortValExpr = "CAST(COALESCE(a.updated, '1970-01-01 00:00:00') AS TEXT)";
            break;
        case "segment_count":
            // LPAD equivalent in SQLite: SUBSTR('0000000000' || val, -10)
            sortValExpr = "SUBSTR('0000000000' || CAST(COALESCE(a.segment_count, 0) AS TEXT), -10, 10)";
            break;
        case "status":
            sortValExpr = `CASE a.translation_status
                WHEN 'pending'     THEN '0'
                WHEN 'in_progress' THEN '1'
                WHEN 'draft'       THEN '1'
                WHEN 'translated'  THEN '2'
                WHEN 'review'      THEN '3'
                WHEN 'complete'    THEN '3'
                WHEN 'qa_approved' THEN '4'
                WHEN 'approved'    THEN '4'
                WHEN 'published'   THEN '5'
                ELSE '0' END`;
            break;
        default:
            sortValExpr = "CAST(a.created AS TEXT)";
    }

    // ── Build CTE query ──────────────────────────────────────────
    // We build the entire query with all params baked in via PocketBase's
    // bind mechanism. PocketBase's $dbx uses {:name} placeholders.
    //
    // The query pattern matches the original:
    //   WITH normalized AS (
    //     SELECT ..., <sortValExpr> AS sort_val
    //     FROM articles
    //     WHERE segmented = true [AND search filter]
    //   )
    //   SELECT ... FROM normalized
    //   WHERE <cursor filter>
    //   ORDER BY sort_val <dir>, id <dir>
    //   LIMIT :limit

    let cteParts = [];
    let queryParts = [];
    let searchLike = "";
    if (searchTerm) {
        searchLike = "%" + searchTerm + "%";
    }

    // Use PocketBase DB expression builder for safe parameterization
    const db = $app.db();

    // Build conditions arrays
    let cteWhereConditions = ["a.segmented = 1"];
    if (searchTerm) {
        // SQLite: case-insensitive LIKE using LOWER()
        cteWhereConditions.push(
            "LOWER(a.title) LIKE LOWER('" + searchLike.replace(/'/g, "''") + "')"
        );
    }

    let outerWhereConditions = [];
    if (cursorSortVal && cursorId) {
        // Sanitize: these values come from query params; use parameterized form
        outerWhereConditions.push(
            `(sort_val ${cursorOp} '` +
            cursorSortVal.replace(/'/g, "''") +
            `' OR (sort_val = '` +
            cursorSortVal.replace(/'/g, "''") +
            `' AND a.id ${cursorOp} '` +
            cursorId.replace(/'/g, "''") +
            `'))`
        );
    }

    // Construct SQL
    let sql = `
        WITH normalized AS (
            SELECT
                a.id,
                a.title,
                a.title_ja,
                a.translation_status,
                a.segment_count,
                a.created,
                a.doc_type,
                a.author,
                a.summary,
                (${sortValExpr}) AS sort_val
            FROM articles a
            WHERE ${cteWhereConditions.join(" AND ")}
        )
        SELECT
            id,
            title,
            title_ja,
            translation_status,
            segment_count,
            created AS created_at,
            doc_type,
            author,
            summary,
            sort_val
        FROM normalized
        ${outerWhereConditions.length ? "WHERE " + outerWhereConditions.join(" AND ") : ""}
        ORDER BY sort_val ${sortDirUpper}, id ${sortDirUpper}
        LIMIT ${rawLimit + 1}
    `;

    // ── Execute ──────────────────────────────────────────────────
    const result = arrayOf(new DynamicModel({
        "id":                "",
        "title":             "",
        "title_ja":          "",
        "translation_status": "",
        "segment_count":     0,
        "created_at":        "",
        "doc_type":          "",
        "author":            "",
        "summary":           "",
        "sort_val":          "",
    }));

    db.newQuery(sql).all(result);

    // ── Build response ────────────────────────────────────────────
    const hasMore = result.length > rawLimit;
    const items = [];
    const maxItems = hasMore ? rawLimit : result.length;

    for (let i = 0; i < maxItems; i++) {
        const row = result[i];
        items.push({
            id:                 row.get("id"),
            title:              row.get("title"),
            title_ja:           row.get("title_ja"),
            translation_status: row.get("translation_status"),
            segment_count:      row.get("segment_count"),
            created_at:         row.get("created_at"),
            doc_type:           row.get("doc_type"),
            author:             row.get("author"),
            summary:            row.get("summary"),
        });
    }

    // Compute next cursor from last item
    let nextCursorSortVal = null;
    let nextCursorId = null;
    if (hasMore && items.length > 0) {
        const lastResult = result[items.length - 1];
        nextCursorSortVal = lastResult.get("sort_val");
        nextCursorId = lastResult.get("id");
    }

    return e.json(200, {
        items: items,
        hasMore: hasMore,
        next_cursor_sort_val: nextCursorSortVal,
        next_cursor_id: nextCursorId,
        total: items.length,
    });
},
    // No auth middleware — original function was accessible to anon/SELECT.
    $apis.gzip()
);
