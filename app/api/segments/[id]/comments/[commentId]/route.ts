/**
 * /api/segments/[id]/comments/[commentId]
 *
 *   PATCH — update a comment's `content` and/or `resolved` flag.
 *   PocketBase edition.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; commentId: string }> }
) {
    const { id: segmentId, commentId } = await params;
    const pb = await createServerClient();

    if (!pb.authStore.isValid || !pb.authStore.record) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { content, resolved } = (body ?? {}) as {
        content?: unknown;
        resolved?: unknown;
    };

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) {
        if (typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json(
                { error: '`content`, if provided, must be a non-empty string' },
                { status: 400 }
            );
        }
        updateData.content = content;
    }
    if (resolved !== undefined) {
        if (typeof resolved !== 'boolean') {
            return NextResponse.json(
                { error: '`resolved`, if provided, must be a boolean' },
                { status: 400 }
            );
        }
        updateData.resolved = resolved;
    }

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
            { error: 'At least one of `content` or `resolved` is required' },
            { status: 400 }
        );
    }

    // Verify comment exists and belongs to this segment
    try {
        const existing = await pb.collection('segment_comments').getOne(commentId);
        const existingSegId = (existing as Record<string, unknown>).segment_id as string;
        if (existingSegId !== segmentId) {
            return NextResponse.json(
                { error: 'Comment not found or not permitted' },
                { status: 404 }
            );
        }
    } catch {
        return NextResponse.json(
            { error: 'Comment not found or not permitted' },
            { status: 404 }
        );
    }

    try {
        const data = await pb.collection('segment_comments').update(commentId, updateData);
        return NextResponse.json(data);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
