/**
 * /api/documents/[id]/assignments
 *
 * Admin-managed per-document, per-phase capability grants.
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

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: documentId } = await params;
    const pb = await createServerClient();

    try {
        const records = await pb.collection('document_assignments').getFullList({
            filter: `document_id = "${documentId}"`,
            sort: '+created_at',
        });
        return NextResponse.json({ assignments: records ?? [] });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: documentId } = await params;
    const pb = await createServerClient();

    const guard = await requireAdmin(pb);
    if (guard.error) return guard.error;
    const adminUser = guard.user!;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { user_id, allowed_phases } = (body ?? {}) as {
        user_id?: unknown;
        allowed_phases?: unknown;
    };

    if (typeof user_id !== 'string' || !UUID_RE.test(user_id)) {
        return NextResponse.json(
            { error: '`user_id` is required and must be a UUID' },
            { status: 400 }
        );
    }
    const phasesOrErr = validatePhases(allowed_phases);
    if (typeof phasesOrErr === 'string') {
        return NextResponse.json({ error: phasesOrErr }, { status: 400 });
    }
    const phases = phasesOrErr;

    // Verify document exists
    try {
        await pb.collection('articles').getOne(documentId);
    } catch {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check for existing assignment
    let existing: Record<string, unknown> | null = null;
    try {
        const existingList = await pb.collection('document_assignments').getFullList({
            filter: `user_id = "${user_id}" && document_id = "${documentId}"`,
        });
        existing = existingList.length > 0 ? existingList[0] : null;
    } catch { /* ignore */ }

    const payload = {
        user_id,
        document_id: documentId,
        allowed_phases: phases,
        assigned_by: adminUser.id,
    };

    try {
        let data: Record<string, unknown>;
        if (existing?.id) {
            data = await pb.collection('document_assignments').update(existing.id as string, payload);
        } else {
            data = await pb.collection('document_assignments').create(payload);
        }
        return NextResponse.json(data, { status: existing ? 200 : 201 });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
