/**
 * /api/documents/[id]/settings
 *
 * PATCH — Update document_settings fields.
 * PocketBase edition.
 */

import { createServerClient } from '@/lib/pocketbase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import type { PublishFilter } from '@/types/database'

const VALID_PUBLISH_FILTERS: PublishFilter[] = ['any_translated', 'qa_approved']

async function requireAdmin(pb: Awaited<ReturnType<typeof createServerClient>>) {
    if (!pb.authStore.isValid || !pb.authStore.record) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }
    const role = (pb.authStore.record as Record<string, unknown>).role as string | undefined
    if (role !== 'admin') {
        return { error: NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 }) }
    }
    return { user: pb.authStore.record }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: articleId } = await params

    try {
        const pb = await createServerClient()
        const gate = await requireAdmin(pb)
        if ('error' in gate) return gate.error

        const body = await request.json()

        if ('publish_filter' in body) {
            if (!VALID_PUBLISH_FILTERS.includes(body.publish_filter)) {
                return NextResponse.json(
                    { error: `publish_filter must be one of: ${VALID_PUBLISH_FILTERS.join(', ')}` },
                    { status: 400 }
                )
            }
        } else {
            return NextResponse.json(
                { error: 'No recognised fields to update. Supported: publish_filter' },
                { status: 400 }
            )
        }

        // Verify article exists
        try {
            await pb.collection('articles').getOne(articleId)
        } catch {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 })
        }

        // Upsert document_settings
        const existingList = await pb.collection('document_settings').getFullList({
            filter: `article = "${articleId}"`,
        });

        let data: Record<string, unknown>
        if (existingList.length > 0) {
            data = await pb.collection('document_settings').update(existingList[0].id, {
                publish_filter: body.publish_filter,
            })
        } else {
            data = await pb.collection('document_settings').create({
                article: articleId,
                publish_filter: body.publish_filter,
            })
        }

        revalidateTag(`article-${articleId}`, 'max');
        revalidatePath(`/documents/${articleId}/read`);
        revalidateTag('articles', 'max');

        return NextResponse.json({ settings: data })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
