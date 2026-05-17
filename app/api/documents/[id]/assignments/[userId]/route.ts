/**
 * /api/documents/[id]/assignments/[userId]
 *
 *   PATCH  \u2014 admin-only. Replace allowed_phases for an existing
 *            (user_id, document_id) assignment.
 *   DELETE \u2014 admin-only. Remove an assignment outright.
 *
 * RLS doc_assignments_admin_write already enforces admin via is_admin();
 * we add an explicit pre-check so the response code is a clean 403
 * instead of an opaque RLS-empty-result 404.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_PHASES = ['translate', 'edit', 'proofread', 'qa'] as const;
type Phase = (typeof VALID_PHASES)[number];

function validatePhases(value: unknown): string | string[] {
    if (!Array.isArray(value) || value.length === 0) {
        return '`allowed_phases` must be a non-empty array';
    }
    if (!value.every((p) => typeof p === 'string' && VALID_PHASES.includes(p as Phase))) {
        return `\`allowed_phases\` must contain only: ${VALID_PHASES.join(', ')}`;
    }
    return value as string[];
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
    if (profile?.role !== 'admin') {
        return { error: NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 }) };
    }
    return { user };
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const { id: documentId, userId } = await params;
    const supabase = await createClient();

    const guard = await requireAdmin(supabase);
    if (guard.error) return guard.error;

    if (!UUID_RE.test(userId)) {
        return NextResponse.json({ error: '`userId` must be a UUID' }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { allowed_phases } = (body ?? {}) as { allowed_phases?: unknown };
    const phasesOrErr = validatePhases(allowed_phases);
    if (typeof phasesOrErr === 'string') {
        return NextResponse.json({ error: phasesOrErr }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('document_assignments')
        .update({ allowed_phases: phasesOrErr })
        .eq('user_id', userId)
        .eq('document_id', documentId)
        .select()
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json(data);
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const { id: documentId, userId } = await params;
    const supabase = await createClient();

    const guard = await requireAdmin(supabase);
    if (guard.error) return guard.error;

    if (!UUID_RE.test(userId)) {
        return NextResponse.json({ error: '`userId` must be a UUID' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('document_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('document_id', documentId)
        .select('id')
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
}
