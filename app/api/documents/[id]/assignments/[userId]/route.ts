/**
 * /api/documents/[id]/assignments/[userId]
 *
 *   PATCH  — admin-only: replace allowed_phases
 *   DELETE — admin-only: remove an assignment
 * PocketBase edition.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

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

async function requireAdmin(pb: Awaited<ReturnType<typeof createServerClient>>) {
    if (!pb.authStore.isValid || !pb.authStore.record) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    const role = (pb.authStore.record as Record<string, unknown>).role as string | undefined;
    if (role !== 'admin') {
        return { error: NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 }) };
    }
    return { user: pb.authStore.record };
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const { id: documentId, userId } = await params;
    const pb = await createServerClient();

    const guard = await requireAdmin(pb);
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

    // Find existing assignment
    const existingList = await pb.collection('document_assignments').getFullList({
        filter: `user_id = "${userId}" && document_id = "${documentId}"`,
    });
    if (existingList.length === 0) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    try {
        const data = await pb.collection('document_assignments').update(existingList[0].id, {
            allowed_phases: phasesOrErr,
        });
        return NextResponse.json(data);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const { id: documentId, userId } = await params;
    const pb = await createServerClient();

    const guard = await requireAdmin(pb);
    if (guard.error) return guard.error;

    if (!UUID_RE.test(userId)) {
        return NextResponse.json({ error: '`userId` must be a UUID' }, { status: 400 });
    }

    const existingList = await pb.collection('document_assignments').getFullList({
        filter: `user_id = "${userId}" && document_id = "${documentId}"`,
    });
    if (existingList.length === 0) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    try {
        await pb.collection('document_assignments').delete(existingList[0].id);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
