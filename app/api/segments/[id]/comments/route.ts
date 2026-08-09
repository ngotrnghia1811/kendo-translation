/**
 * /api/segments/[id]/comments
 *
 * Cooperation-first discussion thread anchored to a segment.
 * PocketBase edition.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: segmentId } = await params;
    const pb = await createServerClient();

    try {
        const records = await pb.collection('segment_comments').getFullList({
            filter: `segment = "${segmentId}"`,
            sort: '+id',
        });
        return NextResponse.json({ comments: records ?? [] });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: segmentId } = await params;
    const pb = await createServerClient();

    if (!pb.authStore.isValid || !pb.authStore.record) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = pb.authStore.record.id;

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

    // If a parent is supplied, verify it belongs to the same segment
    if (parentId !== null) {
        try {
            const parent = await pb.collection('segment_comments').getOne(parentId);
            const parentSegId = (parent as Record<string, unknown>).segment as string;
            if (parentSegId !== segmentId) {
                return NextResponse.json(
                    { error: 'Parent comment belongs to a different segment' },
                    { status: 400 }
                );
            }
        } catch {
            return NextResponse.json({ error: 'Parent comment not found' }, { status: 400 });
        }
    }

    // Verify the segment exists
    try {
        await pb.collection('segments').getOne(segmentId);
    } catch {
        return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    try {
        const data = await pb.collection('segment_comments').create({
            segment: segmentId,
            user: userId,
            content,
            parent_comment_id: parentId,
            mentions: mentionsArr,
        });
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
