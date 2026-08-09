/**
 * /api/segments
 *
 * Filtered cross-document segment discovery. Used primarily by tests to
 * locate segments in specific states (e.g. draft+content, draft+empty)
 * without paginating through ~958 documents.
 *
 * PocketBase edition.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

const VALID_STATUSES = new Set([
    'draft',
    'translated',
    'edited',
    'proofread',
    'qa_approved',
]);

export async function GET(req: NextRequest) {
    const pb = await createServerClient();

    if (!pb.authStore.isValid || !pb.authStore.record) {
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

    // Build filter string
    const filters: string[] = [];
    if (statusParam) {
        filters.push(`status = "${statusParam}"`);
    }
    if (hasTargetParam === 'true') {
        filters.push('target_text != null && target_text != ""');
    } else if (hasTargetParam === 'false') {
        filters.push('(target_text = null || target_text = "")');
    } else if (hasTargetParam !== null) {
        return NextResponse.json(
            { error: '`has_target_text` must be "true" or "false"' },
            { status: 400 }
        );
    }

    try {
        const records = await pb.collection('segments').getList(1, limit, {
            filter: filters.join(' && ') || undefined,
            sort: '-id',
        });
        return NextResponse.json({ segments: records.items ?? [] });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
