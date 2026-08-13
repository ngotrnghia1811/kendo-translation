/**
 * Display helpers for PocketBase cooperation records.
 *
 * The `segment_comments`, `segment_suggestions`, and `qa_issues` collections
 * expose their authoring user via BARE relation fields (`user`, `suggester`,
 * `author`) that are returned as raw ID strings unless the query passes
 * `expand`. They also (historically) lacked the standard `created` system
 * field — restored by migration `1753123462_add_created_timestamps.js`.
 *
 * These helpers normalize both concerns into a shape the UI can render
 * directly, without the UI needing to know PocketBase's `expand` internals.
 */

/** Raw PocketBase record (loosely typed — records are dynamic by collection). */
type PbRecord = Record<string, unknown> & {
    expand?: Record<string, unknown>;
    created?: unknown;
};

/**
 * Extract a display username from an expanded relation field.
 *
 * PocketBase returns `expand[key]` as either a single object or an array
 * (for multi-select relations). `maxSelect: 1` here means a single object,
 * but we tolerate both shapes defensively.
 */
export function relationUsername(record: PbRecord, key: string): string | null {
    const exp = record?.expand?.[key] as
        | { username?: string | null }
        | Array<{ username?: string | null }>
        | undefined;
    const u = Array.isArray(exp) ? exp[0] : exp;
    return typeof u?.username === 'string' && u.username !== '' ? u.username : null;
}

/**
 * Normalize a PocketBase `created` timestamp into an ISO-8601 string,
 * or `null` when absent/empty.
 *
 * PocketBase stores dates as `"YYYY-MM-DD HH:MM:SS.mmmZ"` (SQLite layout),
 * which `new Date()` handles unreliably because of the space separator.
 * We rewrite the space to `T` to produce a strictly parseable ISO string.
 */
export function pbTimestamp(record: PbRecord): string | null {
    const t = record?.created;
    if (typeof t !== 'string' || t.trim() === '') return null;
    const normalized = t.includes('T') ? t : t.replace(' ', 'T');
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : normalized;
}
