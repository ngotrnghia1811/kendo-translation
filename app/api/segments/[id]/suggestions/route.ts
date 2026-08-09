/**
 * /api/segments/[id]/suggestions
 *
 * Cooperation-first overlay on the existing soft-lock editor.
 * PocketBase edition.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

type SuggesterKind = 'human' | 'agent';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: segmentId } = await params;
    const pb = await createServerClient();

    try {
        const records = await pb.collection('segment_suggestions').getFullList({
            filter: `segment = "${segmentId}"`,
            sort: '+id',
        });
        return NextResponse.json({ suggestions: records ?? [] });
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

    const { proposed_text, suggester_kind } = (body ?? {}) as {
        proposed_text?: unknown;
        suggester_kind?: unknown;
    };

    if (typeof proposed_text !== 'string' || proposed_text.trim().length === 0) {
        return NextResponse.json(
            { error: '`proposed_text` is required and must be a non-empty string' },
            { status: 400 }
        );
    }

    let kind: SuggesterKind = 'human';
    if (suggester_kind !== undefined) {
        if (suggester_kind !== 'human' && suggester_kind !== 'agent') {
            return NextResponse.json(
                { error: "`suggester_kind` must be 'human' or 'agent'" },
                { status: 400 }
            );
        }
        kind = suggester_kind;
    }

    // Verify the segment exists
    try {
        await pb.collection('segments').getOne(segmentId);
    } catch {
        return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    try {
        const data = await pb.collection('segment_suggestions').create({
            segment: segmentId,
            suggester: userId,
            suggester_kind: kind,
            proposed_text,
            status: 'pending',
        });
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
