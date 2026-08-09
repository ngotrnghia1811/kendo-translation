import { createServerClient } from '@/lib/pocketbase/server';
import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const pb = await createServerClient();

    let article: Record<string, unknown>;
    try {
      const record = await pb.collection('articles').getOne(id);
      article = JSON.parse(JSON.stringify(record));
    } catch {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    let settings: Record<string, unknown> | null = null;
    try {
      const settingsList = await pb
        .collection('document_settings')
        .getList(1, 1, {
          filter: `article = "${id}"`,
        });
      if (settingsList.items.length > 0) {
        settings = JSON.parse(
          JSON.stringify(settingsList.items[0]),
        );
      }
    } catch {
      // No settings — return null
    }

    return NextResponse.json({
      document: article,
      settings: settings || null,
    });
  } catch (error) {
    console.error('Error in document GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const pb = await createServerClient();
    const body = await request.json();

    if (!pb.authStore.isValid || !pb.authStore.record) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, content_ja, content_en } = body;

    const updated = await pb.collection('articles').update(id, {
      title,
      content_ja,
      content_en,
      updated: new Date().toISOString(),
    });
    const article = JSON.parse(JSON.stringify(updated));

    // Phase 4.4: invalidate cached article data after document update
    revalidateTag(`article-${id}`, 'max');
    revalidatePath(`/documents/${id}/read`);
    revalidateTag('articles', 'max');

    return NextResponse.json({ document: article });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in document PUT:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
