import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = pb.authStore.record.id;

  let segment: Record<string, unknown>;
  try {
    segment = await pb.collection('segments').getOne(id);
  } catch {
    return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
  }

  if (segment.locked_by && segment.locked_by !== userId) {
    const lockAge = segment.locked_at
      ? (Date.now() - new Date(segment.locked_at as string).getTime()) / 1000 / 60
      : 999;
    if (lockAge < 5) {
      return NextResponse.json({ error: 'Segment is locked by another user', lockedBy: segment.locked_by }, { status: 409 });
    }
  }

  try {
    const data = await pb.collection('segments').update(id, {
      locked_by: userId,
      locked_at: new Date().toISOString(),
    });
    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = pb.authStore.record.id;

  // Only unlock if locked_by matches the current user
  let segment: Record<string, unknown>;
  try {
    segment = await pb.collection('segments').getOne(id);
  } catch {
    return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
  }

  if (segment.locked_by !== userId) {
    return NextResponse.json({ error: 'Segment is not locked by you' }, { status: 403 });
  }

  try {
    const data = await pb.collection('segments').update(id, {
      locked_by: null,
      locked_at: null,
    });
    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
