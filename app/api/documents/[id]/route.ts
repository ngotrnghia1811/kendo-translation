import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const { data: article, error } = await supabase
            .from('articles')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Document not found' }, { status: 404 })
            }
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const { data: settings } = await supabase
            .from('document_settings')
            .select('*')
            .eq('article_id', id)
            .single()

        return NextResponse.json({
            document: article,
            settings: settings || null,
        })
    } catch (error) {
        console.error('Error in document GET:', error)
        return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
    }
}

export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const body = await request.json()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { title, content_ja, content_en } = body

        const { data: article, error } = await supabase
            .from('articles')
            .update({
                title,
                content_ja,
                content_en,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Phase 4.4: invalidate cached article data after document update
        revalidateTag('articles', 'max');

        return NextResponse.json({ document: article })
    } catch (error) {
        console.error('Error in document PUT:', error)
        return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }
}
