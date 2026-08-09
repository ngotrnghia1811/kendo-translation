import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pb = await createServerClient();

  try {
    const data = await pb.collection('segments').getOne(id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = pb.authStore.record.id;

  const body = await req.json();
  const { target_text, status } = body;

  // Pre-fetch for lock check
  let segment: Record<string, unknown>;
  try {
    segment = await pb.collection('segments').getOne(id);
  } catch {
    return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
  }

  if (segment?.locked_by && segment.locked_by !== userId) {
    return NextResponse.json({ error: 'Segment is locked by another user' }, { status: 409 });
  }

  const previousTargetText = segment.target_text as string | undefined;

  const updateData: Record<string, unknown> = {};
  if (target_text !== undefined) {
    updateData.target_text = target_text;
    updateData.translated_by = userId;
  }
  if (status !== undefined) updateData.status = status;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(segment);
  }

  try {
    const data = await pb.collection('segments').update(id, updateData);

    // Create revision if target_text changed
    if (previousTargetText && target_text !== undefined && target_text !== previousTargetText) {
      try {
        await pb.collection('segment_revisions').create({
          segment_id: id,
          target_text: previousTargetText,
          edited_by: userId,
        });
      } catch {
        // Best-effort revision log; don't fail the update
      }
    }

    // Phase 4.4: invalidate cached article data
    const articleId = (data as Record<string, unknown>).article as string | undefined;
    if (articleId) {
      revalidateTag(`article-${articleId}`, 'max');
      revalidatePath(`/documents/${articleId}/read`);
    }
    revalidateTag('articles', 'max');

    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
