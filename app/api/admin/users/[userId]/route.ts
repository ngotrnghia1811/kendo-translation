/**
 * /api/admin/users/[userId]
 *
 * Admin-only per-user mutation endpoint.
 *
 *   PATCH — update the user's role. Body: { role: 'reader' | 'translator' | 'admin' }
 *           Returns the updated profile row.
 *
 * Statuses:
 *   200 ok | 400 bad role | 401 unauth | 403 non-admin | 404 user not found | 500 db error
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const VALID_ROLES = ['reader', 'translator', 'admin'] as const;
type UserRole = (typeof VALID_ROLES)[number];

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = await params;
    const authClient = await createClient();
    const gate = await requireAdmin(authClient);
    if (gate instanceof NextResponse) return gate;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { role } = (body ?? {}) as { role?: unknown };

    if (typeof role !== 'string' || !VALID_ROLES.includes(role as UserRole)) {
        return NextResponse.json(
            { error: `\`role\` must be one of: ${VALID_ROLES.join(', ')}` },
            { status: 400 }
        );
    }

    const supabase = await createAdminClient();

    // Verify the user exists first for a clean 404.
    const { data: existing, error: findErr } = await supabase
        .from('profiles')
        .select('id, username, role')
        .eq('id', userId)
        .maybeSingle();

    if (findErr) {
        return NextResponse.json({ error: findErr.message }, { status: 500 });
    }
    if (!existing) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
        .select('id, username, role, created_at, updated_at')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
