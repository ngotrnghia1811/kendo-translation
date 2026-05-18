/**
 * /api/admin/users
 *
 * Admin-only directory of all profiles (id, username, role, created_at).
 *
 * Auth: requires an authenticated user whose `profiles.role === 'admin'`.
 * The role check uses an RLS-aware client so we never trust the caller.
 * Once the gate passes, the data SELECT uses the service-role client so
 * the response includes ALL profiles regardless of any future RLS
 * tightening on the profiles table.
 *
 * Statuses:
 *   200 ok | 401 unauth | 403 non-admin | 500 db error
 */

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

export async function GET() {
    try {
        const authClient = await createClient();
        const gate = await requireAdmin(authClient);
        if ('error' in gate) return gate.error;

        const supabase = await createAdminClient();
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, username, role, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ users: users || [] });
    } catch (error) {
        console.error('Error in admin/users GET:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
