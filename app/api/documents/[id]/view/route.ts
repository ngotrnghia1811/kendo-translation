/**
 * POST /api/documents/[id]/view
 *
 * Records a view for the authenticated user on the given article.
 * UPSERTs into reading_progress (manually: SELECT then UPDATE or INSERT,
 * since no unique constraint exists beyond the pkey).
 *
 * Auth: any authenticated user.
 * Statuses: 200 ok | 401 unauth | 500 db error
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // SELECT existing row
    const { data: existing } = await supabase
      .from('reading_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_type', 'article')
      .eq('content_id', id)
      .limit(1)
      .maybeSingle()

    if (existing) {
      // UPDATE
      const { error } = await supabase
        .from('reading_progress')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // INSERT
      const { error } = await supabase
        .from('reading_progress')
        .insert({
          user_id: user.id,
          content_type: 'article',
          content_id: id,
          progress_pct: 0,
          last_position: 0,
        })

      if (error) throw error
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
