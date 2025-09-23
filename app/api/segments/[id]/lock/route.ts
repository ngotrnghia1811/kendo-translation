import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: segment } = await supabase
    .from('segments')
    .select('locked_by, locked_at')
    .eq('id', id)
    .single();

  if (!segment) return NextResponse.json({ error: 'Segment not found' }, { status: 404 });

  if (segment.locked_by && segment.locked_by !== user.id) {
    const lockAge = segment.locked_at
      ? (Date.now() - new Date(segment.locked_at).getTime()) / 1000 / 60
      : 999;
    if (lockAge < 5) {
      return NextResponse.json({ error: 'Segment is locked by another user', lockedBy: segment.locked_by }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from('segments')
    .update({ locked_by: user.id, locked_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('segments')
    .update({ locked_by: null, locked_at: null })
    .eq('id', id)
    .eq('locked_by', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
