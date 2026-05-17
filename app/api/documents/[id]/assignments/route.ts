/**
 * /api/documents/[id]/assignments
 *
 * Admin-managed per-document, per-phase capability grants. Drives the
 * is_assigned_to_phase() RLS helper that gates phase-restricted edits
 * on segments.
 *
 *   GET  \u2014 list all assignments for the document (public-read via RLS).
 *   POST \u2014 admin-only upsert. Body: { user_id, allowed_phases }.
 *          If an assignment already exists for (user_id, document_id)
 *          its allowed_phases is overwritten (explicit replace, not
 *          merge). Returns 201 on insert, 200 on update.
 *
 * Per-user mutation (PATCH / DELETE) lives at .../assignments/[userId].
 *
 * Note: "document" in the URL maps to the `articles` table; the FK
 * points at articles(id) per the migration 004 schema.
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

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: documentId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('document_assignments')
        .select('*, user:profiles!user_id(username)')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ assignments: data ?? [] });
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: documentId } = await params;
    const supabase = await createClient();

    const guard = await requireAdmin(supabase);
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

    // Verify the document (article) exists for a clean 404.
    const { data: doc, error: docErr } = await supabase
        .from('articles')
        .select('id')
        .eq('id', documentId)
        .maybeSingle();
    if (docErr) {
        return NextResponse.json({ error: docErr.message }, { status: 500 });
    }
    if (!doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check for existing assignment so we can report 201 vs 200.
    const { data: existing, error: existingErr } = await supabase
        .from('document_assignments')
        .select('id')
        .eq('user_id', user_id)
        .eq('document_id', documentId)
        .maybeSingle();
    if (existingErr) {
        return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    const payload = {
        user_id,
        document_id: documentId,
        allowed_phases: phases,
        assigned_by: adminUser.id,
    };

    const { data, error } = await supabase
        .from('document_assignments')
        .upsert(payload, { onConflict: 'user_id,document_id' })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: existing ? 200 : 201 });
}
