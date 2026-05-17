/**
 * /api/segments/[id]/comments/[commentId]
 *
 *   PATCH \u2014 update a comment's `content` and/or `resolved` flag.
 *
 * RLS (comments_update) limits writes to auth.uid() = user_id, so only
 * the comment author can edit. A 404 covers both not-found and
 * RLS-hidden rows; we never leak existence.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; commentId: string }> }
) {
    const { id: segmentId, commentId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
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

    const { data, error } = await supabase
        .from('segment_comments')
        .update(updateData)
        .eq('id', commentId)
        .eq('segment_id', segmentId)
        .select()
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
        return NextResponse.json(
            { error: 'Comment not found or not permitted' },
            { status: 404 }
        );
    }

    return NextResponse.json(data);
}
