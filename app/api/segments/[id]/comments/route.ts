/**
 * /api/segments/[id]/comments
 *
 * Cooperation-first discussion thread anchored to a segment. Single
 * adjacency-list table (`segment_comments`) with optional
 * `parent_comment_id` for replies; the frontend assembles the tree.
 *
 *   GET  — list all comments for the segment, oldest first (flat).
 *   POST — create a comment (optionally a reply via `parent_comment_id`).
 *
 * Per-comment edit / resolve transitions live at
 * /api/segments/[id]/comments/[commentId] (PATCH). RLS (comments_read,
 * comments_insert, comments_update) does the heavy lifting; this route
 * only adds shape validation and the same-segment parent check.
 *
 * Mention notification dispatch is deliberately out of scope for this
 * unit \u2014 `mentions` is persisted only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: segmentId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('segment_comments')
        .select('*, author:profiles!user_id(username)')
        .eq('segment_id', segmentId)
        .order('created_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: data ?? [] });
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: segmentId } = await params;
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

    const { content, parent_comment_id, mentions } = (body ?? {}) as {
        content?: unknown;
        parent_comment_id?: unknown;
        mentions?: unknown;
    };

    if (typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json(
            { error: '`content` is required and must be a non-empty string' },
            { status: 400 }
        );
    }

    let parentId: string | null = null;
    if (parent_comment_id !== undefined && parent_comment_id !== null) {
        if (typeof parent_comment_id !== 'string' || !UUID_RE.test(parent_comment_id)) {
            return NextResponse.json(
                { error: '`parent_comment_id` must be a UUID or null' },
                { status: 400 }
            );
        }
        parentId = parent_comment_id;
    }

    let mentionsArr: string[] = [];
    if (mentions !== undefined && mentions !== null) {
        if (!Array.isArray(mentions) || !mentions.every((m) => typeof m === 'string' && UUID_RE.test(m))) {
            return NextResponse.json(
                { error: '`mentions` must be an array of UUID strings' },
                { status: 400 }
            );
        }
        mentionsArr = mentions as string[];
    }

    // If a parent is supplied, it must belong to the same segment so
    // threads can't be cross-stitched across segments.
    if (parentId !== null) {
        const { data: parent, error: parentErr } = await supabase
            .from('segment_comments')
            .select('id, segment_id')
            .eq('id', parentId)
            .maybeSingle();
        if (parentErr) {
            return NextResponse.json({ error: parentErr.message }, { status: 500 });
        }
        if (!parent) {
            return NextResponse.json({ error: 'Parent comment not found' }, { status: 400 });
        }
        if (parent.segment_id !== segmentId) {
            return NextResponse.json(
                { error: 'Parent comment belongs to a different segment' },
                { status: 400 }
            );
        }
    }

    // Verify the segment exists up front for a clean 404.
    const { data: segment, error: segmentErr } = await supabase
        .from('segments')
        .select('id')
        .eq('id', segmentId)
        .maybeSingle();
    if (segmentErr) {
        return NextResponse.json({ error: segmentErr.message }, { status: 500 });
    }
    if (!segment) {
        return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    const { data, error } = await supabase
        .from('segment_comments')
        .insert({
            segment_id: segmentId,
            user_id: user.id,
            content,
            parent_comment_id: parentId,
            mentions: mentionsArr,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
