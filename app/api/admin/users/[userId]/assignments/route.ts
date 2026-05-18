/**
 * /api/admin/users/[userId]/assignments
 *
 * Admin-only inverse view of `document_assignments`: lists every
 * document the given user is assigned to, with the joined document
 * title for display. Powers the per-user assignment matrix page.
 *
 * GET — returns { assignments: [{ id, document_id, allowed_phases,
 *       assigned_by, created_at, updated_at, document: {id, title} }] }
 *
 * Mutations (PATCH/DELETE) re-use the existing per-document routes at
 * /api/documents/[id]/assignments/[userId] — no new mutation surface
 * is introduced here, since the identity of an assignment is always
 * (document_id, user_id) regardless of which page edits it.
 *
 * Auth: requires an authenticated user whose `profiles.role === 'admin'`.
 * Statuses: 200 | 400 (bad userId) | 401 | 403 | 500
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return {
            error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
    if (profile?.role !== 'admin') {
        return {
            error: NextResponse.json(
                { error: 'Forbidden: admin role required' },
                { status: 403 }
            ),
        };
    }
    return { user };
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = await params;
    if (!UUID_RE.test(userId)) {
        return NextResponse.json(
            { error: '`userId` must be a UUID' },
            { status: 400 }
        );
    }

    const supabase = await createClient();
    const guard = await requireAdmin(supabase);
    if (guard.error) return guard.error;

    const { data, error } = await supabase
        .from('document_assignments')
        .select(
            'id, user_id, document_id, allowed_phases, assigned_by, created_at, updated_at, document:articles!document_id(id, title)'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ assignments: data ?? [] });
}
