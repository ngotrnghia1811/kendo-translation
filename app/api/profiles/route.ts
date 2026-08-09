/**
 * /api/profiles
 *
 * Admin-only directory search for the AssignmentTable user picker.
 * PocketBase edition: queries the `users` auth collection directly
 * since `profiles` was merged into `users` during migration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

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

export async function GET(req: NextRequest) {
    const pb = await createServerClient();
    const gate = await requireAdmin(pb);
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

    try {
        let filter: string | undefined;
        if (search.length > 0) {
            // PocketBase filter ~ operator for LIKE/ILIKE
            filter = `username ~ "${search.replace(/"/g, '\\"')}"`;
        }

        const records = await pb.collection('users').getList(1, limit, {
            filter,
            sort: 'username',
            fields: 'id,username,role',
        });

        return NextResponse.json({
            profiles: records.items.map(r => ({
                id: r.id,
                username: (r as Record<string, unknown>).username,
                role: (r as Record<string, unknown>).role,
            })),
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
