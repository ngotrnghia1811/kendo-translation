/**
 * /api/profiles
 *
 * Admin-only directory search for the AssignmentTable user picker.
 *
 * GET /api/profiles?search=&limit=
 *   - `search` optional case-insensitive substring on `username`.
 *   - `limit`  optional integer 1..50, default 20.
 *
 * Returns `{ profiles: [{ id, username, role }] }`.
 *
 * Auth: requires an authenticated user whose `profiles.role === 'admin'`.
 * Uses the RLS-aware `createClient()` (NOT service-role); relies on the
 * existing `profiles` SELECT policy to enumerate rows for admins.
 *
 * Status codes:
 *   200 ok | 400 bad limit | 401 unauth | 403 non-admin | 500 db error
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const gate = await requireAdmin(supabase);
    if ('error' in gate) return gate.error;

    const url = new URL(req.url);
    const searchRaw = url.searchParams.get('search') ?? '';
    const search = searchRaw.trim();
    const limitRaw = url.searchParams.get('limit');

    let limit = 20;
    if (limitRaw !== null) {
        const n = Number.parseInt(limitRaw, 10);
        if (!Number.isFinite(n) || n < 1 || n > 50) {
            return NextResponse.json(
                { error: '`limit` must be an integer between 1 and 50' },
                { status: 400 }
            );
        }
        limit = n;
    }

    let query = supabase
        .from('profiles')
        .select('id, username, role')
        .order('username', { ascending: true })
        .limit(limit);

    if (search.length > 0) {
        // Escape PostgREST ilike wildcards in user input.
        const esc = search.replace(/[\\%_]/g, (m) => `\\${m}`);
        query = query.ilike('username', `%${esc}%`);
    }

    const { data, error } = await query;
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profiles: data ?? [] });
}
