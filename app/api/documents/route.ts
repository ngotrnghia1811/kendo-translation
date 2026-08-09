import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
import {
  sanitizeSortBy,
  sanitizeSortDir,
  buildCursor,
  parseCursor,
} from '@/lib/pocketbase/feed-cursor';

const PB_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export async function GET(req: NextRequest) {
  const pb = await createServerClient();

  // Auth check
  if (!pb.authStore.isValid || !pb.authStore.record) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const includeAll = req.nextUrl.searchParams.get('all') === '1';

  if (includeAll) {
    // Admin full-list path: fetch all articles with document_settings
    try {
      const articles = await pb.collection('articles').getFullList({
        sort: '-created',
        fields:
          'id,title,title_ja,translation_status,segment_count,created,updated,segmented,paired_pdf_path,expand',
      });

      // Fetch document_settings for all articles in one go
      // PocketBase doesn't have joins — fetch settings separately
      const allSettings = await pb
        .collection('document_settings')
        .getFullList({
          fields: 'article_id,publish_filter,total_segments,translated_count,approved_count',
        });
      const settingsMap = new Map<string, Record<string, unknown>>();
      for (const s of allSettings) {
        const data = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
        settingsMap.set(data.article_id as string, data);
      }

      const documents = articles.map((a) => {
        const data = JSON.parse(JSON.stringify(a)) as Record<string, unknown>;
        const settings = settingsMap.get(data.id as string);
        const totalSegs = (settings?.total_segments as number) ?? 0;
        const approvedSegs = (settings?.approved_count as number) ?? 0;
        const translatedSegs =
          (settings?.translated_count as number) ?? 0;
        const progressCount =
          approvedSegs > 0 ? approvedSegs : translatedSegs;
        return {
          id: data.id,
          title: data.title,
          title_ja: data.title_ja ?? null,
          translation_status: data.translation_status,
          segment_count: totalSegs,
          created_at: data.created,
          updated_at: data.updated,
          segmented: data.segmented,
          paired_pdf_path: data.paired_pdf_path ?? null,
          publish_filter:
            (settings?.publish_filter as string) ?? 'any_translated',
          progress: {
            percentage:
              totalSegs > 0
                ? Math.round((progressCount / totalSegs) * 100)
                : 0,
          },
        };
      });

      return NextResponse.json({ documents });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // Keyset-paginated feed via PocketBase custom route
  const rawCursor = req.nextUrl.searchParams.get('cursor') ?? null;
  const limit = Math.min(
    100,
    Math.max(
      1,
      parseInt(req.nextUrl.searchParams.get('limit') ?? '30', 10),
    ),
  );
  const sortBy = sanitizeSortBy(req.nextUrl.searchParams.get('sort_by'));
  const sortDir = sanitizeSortDir(req.nextUrl.searchParams.get('sort_dir'));
  const searchTerm =
    (req.nextUrl.searchParams.get('q') ?? '').trim() || null;

  const cursor = parseCursor(rawCursor);

  const queryParams = new URLSearchParams({
    sort_by: sortBy,
    sort_dir: sortDir,
    limit: String(limit),
  });
  if (cursor?.sortVal) queryParams.set('cursor_sort_val', cursor.sortVal);
  if (cursor?.id) queryParams.set('cursor_id', cursor.id);
  if (searchTerm) queryParams.set('search', searchTerm);

  const feedRes = await fetch(
    `${PB_URL}/api/custom/documents-feed?${queryParams}`,
  );
  if (!feedRes.ok) {
    return NextResponse.json(
      { error: `Feed error: ${feedRes.status}` },
      { status: 500 },
    );
  }

  const feedData = await feedRes.json();
  const articles = feedData.items ?? [];

  const nextCursor =
    feedData.next_cursor_sort_val && feedData.next_cursor_id
      ? `${feedData.next_cursor_sort_val}|${feedData.next_cursor_id}`
      : articles.length > 0
        ? buildCursor(
            articles[articles.length - 1] as Record<string, unknown>,
            sortBy,
          )
        : null;

  return NextResponse.json({ documents: articles, next_cursor: nextCursor });
}
