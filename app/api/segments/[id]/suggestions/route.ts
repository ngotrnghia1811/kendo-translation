/**
 * /api/segments/[id]/suggestions
 *
 * Cooperation-first overlay on the existing soft-lock editor. Any
 * authenticated user can propose an alternative `target_text` for a
 * segment without taking the lock or mutating the segment itself.
 *
 *   GET  — list all suggestions for the segment, oldest first.
 *   POST — create a new pending suggestion.
 *
 * Acceptance (status transition to 'accepted'/'rejected'/'superseded')
 * lives at /api/segments/[id]/suggestions/[suggestionId] (PATCH).
 * Applying an accepted suggestion to segments.target_text remains the
 * caller's responsibility via the existing PATCH /api/segments/[id],
 * preserving the soft-lock contract.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type SuggesterKind = 'human' | 'agent';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: segmentId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('segment_suggestions')
        .select('*')
        .eq('segment_id', segmentId)
        .order('created_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ suggestions: data ?? [] });
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

    // Verify the segment exists up front so we return a clean 404 instead
    // of relying on the FK error path.
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
        .from('segment_suggestions')
        .insert({
            segment_id: segmentId,
            suggester_id: user.id,
            suggester_kind: kind,
            proposed_text,
            // status defaults to 'pending' in SQL
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
