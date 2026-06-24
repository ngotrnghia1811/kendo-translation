import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.from('segments').select('*').eq('id', id).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { target_text, status } = body;

  const { data: segment } = await supabase
    .from('segments')
    .select('locked_by')
    .eq('id', id)
    .single();

  if (segment?.locked_by && segment.locked_by !== user.id) {
    return NextResponse.json({ error: 'Segment is locked by another user' }, { status: 409 });
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (target_text !== undefined) {
    updateData.target_text = target_text;
    updateData.translated_by = user.id;
  }
  if (status !== undefined) updateData.status = status;

  const { data: previous } = await supabase
    .from('segments')
    .select('target_text')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('segments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (previous?.target_text && target_text !== undefined && target_text !== previous.target_text) {
    await supabase.from('segment_revisions').insert({
      segment_id: id,
      target_text: previous.target_text,
      edited_by: user.id,
    });
  }

  // Phase 4.4: invalidate cached article data so readers see the update
  revalidateTag('articles', 'max');

  return NextResponse.json(data);
}
