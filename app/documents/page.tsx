import type { Article } from '@/types/database';
import { createServerClient } from '@/lib/pocketbase/server';
import { redirect } from 'next/navigation';
import DocumentsList from '@/components/documents/DocumentsList';
import {
  sanitizeSortBy,
  sanitizeSortDir,
  buildCursor,
  parseCursor,
} from '@/lib/supabase/feed-cursor';

const PB_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    cursor?: string;
    sort_by?: string;
    sort_dir?: string;
    q?: string;
  }>;
}) {
  const pb = await createServerClient();

  // Auth guard — replaces supabase.auth.getUser()
  if (!pb.authStore.isValid || !pb.authStore.record) {
    redirect('/login?next=/documents');
  }
  const user = pb.authStore.record as Record<string, unknown>;
  const userEmail = (user?.email as string) ?? '';

  const params = await searchParams;
  const sortBy = sanitizeSortBy(params.sort_by ?? null);
  const sortDir = sanitizeSortDir(params.sort_dir ?? null);
  const cursor = parseCursor(params.cursor ?? null);
  const searchTerm = (params.q ?? '').trim() || null;

  // ── Fetch from PocketBase custom documents-feed route ──────────
  const queryParams = new URLSearchParams({
    sort_by: sortBy,
    sort_dir: sortDir,
    limit: '30',
  });
  if (cursor?.sortVal) queryParams.set('cursor_sort_val', cursor.sortVal);
  if (cursor?.id) queryParams.set('cursor_id', cursor.id);
  if (searchTerm) queryParams.set('search', searchTerm);

  const feedRes = await fetch(
    `${PB_URL}/api/custom/documents-feed?${queryParams}`,
  );
  if (!feedRes.ok) {
    throw new Error(
      `Failed to fetch documents feed: ${feedRes.status} ${feedRes.statusText}`,
    );
  }

  const feedData = await feedRes.json();
  const articles: Article[] = (feedData.items ?? []).map(
    (item: Record<string, unknown>) => ({
      id: item.id as string,
      title: (item.title as string) ?? '',
      title_ja: (item.title_ja as string) ?? null,
      translation_status: (item.translation_status as string) ?? null,
      segment_count: (item.segment_count as number) ?? 0,
      created_at: (item.created_at as string) ?? '',
      doc_type: (item.doc_type as string) ?? null,
      author: (item.author as string) ?? null,
      summary: (item.summary as string) ?? null,
    }),
  ) as Article[];

  // Compute next_cursor from the PocketBase response's explicit cursor
  // values, encoding as "sort_val|id" for compatibility with the existing
  // client-side pagination pattern.
  const nextCursor =
    feedData.next_cursor_sort_val && feedData.next_cursor_id
      ? `${feedData.next_cursor_sort_val}|${feedData.next_cursor_id}`
      : articles.length > 0
        ? buildCursor(
            articles[articles.length - 1] as unknown as Record<string, unknown>,
            sortBy,
          )
        : null;

  return (
    <DocumentsList
      articles={articles}
      userEmail={userEmail}
      nextCursor={nextCursor}
      currentSortBy={sortBy}
      currentSortDir={sortDir}
      searchTerm={searchTerm}
    />
  );
}
