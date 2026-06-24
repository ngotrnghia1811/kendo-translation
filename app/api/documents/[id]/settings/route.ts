/**
 * /api/documents/[id]/settings
 *
 * PATCH — Update document_settings fields for a given article.
 *
 * Currently supported fields:
 *   publish_filter: 'any_translated' | 'qa_approved'
 *
 * Auth: requires admin role.
 * If document_settings row does not exist for this article, it is created
 * (upsert by article_id).
 *
 * Statuses: 200 ok | 400 bad body | 401 unauth | 403 non-admin | 404 article not found | 500 db error
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'
import type { PublishFilter } from '@/types/database'

const VALID_PUBLISH_FILTERS: PublishFilter[] = ['any_translated', 'qa_approved']

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
    if (profile?.role !== 'admin') {
        return { error: NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 }) }
    }
    return { user }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: articleId } = await params

    try {
        const authClient = await createClient()
        const gate = await requireAdmin(authClient)
        if ('error' in gate) return gate.error

        const body = await request.json()

        // Validate fields
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

        const supabase = await createAdminClient()

        // Verify article exists
        const { data: article } = await supabase
            .from('articles')
            .select('id')
            .eq('id', articleId)
            .maybeSingle()
        if (!article) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 })
        }

        // Upsert document_settings — create if missing, update if present
        const { data, error } = await supabase
            .from('document_settings')
            .upsert(
                { article_id: articleId, ...('publish_filter' in body ? { publish_filter: body.publish_filter } : {}) },
                { onConflict: 'article_id', ignoreDuplicates: false }
            )
            .select()
            .single()

        if (error) throw new Error(error.message)

        // Phase 4.4: changing publish_filter affects what readers see —
        // invalidate the cached article data.
        revalidateTag(`article-${articleId}`, 'max');
        revalidatePath(`/documents/${articleId}/read`);
        revalidateTag('articles', 'max');

        return NextResponse.json({ settings: data })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
