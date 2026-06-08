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

        // Fetch profiles and last-edit timestamps in parallel.
        // segment_revisions doesn't have a direct group-by aggregation in the
        // JS client, so we fetch all edited_by + created_at rows and aggregate
        // in JS. This is acceptable at current user count (<100).
        const [{ data: profiles, error: profilesError }, { data: revisions }] =
            await Promise.all([
                supabase
                    .from('profiles')
                    .select('id, username, role, created_at')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('segment_revisions')
                    .select('edited_by, created_at')
                    .order('created_at', { ascending: false }),
            ]);

        if (profilesError) {
            console.error('Error fetching users:', profilesError);
            return NextResponse.json({ error: profilesError.message }, { status: 500 });
        }

        // Build a map: userId → most recent revision timestamp
        const lastActiveMap = new Map<string, string>();
        for (const rev of revisions ?? []) {
            if (rev.edited_by && !lastActiveMap.has(rev.edited_by)) {
                lastActiveMap.set(rev.edited_by, rev.created_at as string);
            }
        }

        const users = (profiles ?? []).map(u => ({
            ...u,
            last_active_at: lastActiveMap.get(u.id) ?? null,
        }));

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error in admin/users GET:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
