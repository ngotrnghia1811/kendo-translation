/**
 * /api/segments
 *
 * Filtered cross-document segment discovery. Used primarily by tests to
 * locate segments in specific states (e.g. draft+content, draft+empty)
 * without paginating through ~958 documents. RLS-respecting; the read
 * policy on `segments` is permissive so any authed user can use this.
 *
 * Per-document reads still go through GET /api/documents/[id]/segments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = new Set([
    'draft',
    'translated',
    'edited',
    'proofread',
    'qa_approved',
]);

export async function GET(req: NextRequest) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const hasTargetParam = searchParams.get('has_target_text');
    const limitParam = searchParams.get('limit');

    if (statusParam !== null && !VALID_STATUSES.has(statusParam)) {
        return NextResponse.json(
            { error: `Invalid status: ${statusParam}` },
            { status: 400 }
        );
    }

    let limit = 10;
    if (limitParam !== null) {
        const parsed = Number.parseInt(limitParam, 10);
        if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
            return NextResponse.json(
                { error: '`limit` must be an integer between 1 and 100' },
                { status: 400 }
            );
        }
        limit = parsed;
    }

    let query = supabase.from('segments').select('*').limit(limit);

    if (statusParam) {
        query = query.eq('status', statusParam);
    }
    if (hasTargetParam === 'true') {
        query = query.not('target_text', 'is', null).neq('target_text', '');
    } else if (hasTargetParam === 'false') {
        // Either NULL or empty string. supabase-js .or() handles this.
        query = query.or('target_text.is.null,target_text.eq.');
    } else if (hasTargetParam !== null) {
        return NextResponse.json(
            { error: '`has_target_text` must be "true" or "false"' },
            { status: 400 }
        );
    }

    const { data, error } = await query;
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ segments: data ?? [] });
}
