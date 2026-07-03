import type { Article } from '@/types/database';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DocumentsList from '@/components/documents/DocumentsList';
import { sanitizeSortBy, sanitizeSortDir, buildCursor, parseCursor } from '@/lib/supabase/feed-cursor';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; sort_by?: string; sort_dir?: string; q?: string }>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/documents');

  const params = await searchParams;
  const sortBy = sanitizeSortBy(params.sort_by ?? null);
  const sortDir = sanitizeSortDir(params.sort_dir ?? null);
  const cursor = parseCursor(params.cursor ?? null);
  const searchTerm = (params.q ?? '').trim() || null;

  // Phase 1.2g: keyset-paginated documents feed via get_documents_feed_v1 RPC.
  // Replaces the unbounded .select() that was loading all ~900 articles.
  // Migration 018 added p_search_term for server-side title search.
  const { data, error } = await supabase.rpc('get_documents_feed_v1', {
    p_cursor_sort_val: cursor?.sortVal ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: 30,
    p_sort_by: sortBy,
    p_sort_dir: sortDir,
    p_search_term: searchTerm,
  });

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  const articles = (data ?? []) as Article[];

  // Compute next_cursor from the last row for "Load more" link.
  const nextCursor =
    articles.length > 0
      ? buildCursor(articles[articles.length - 1] as unknown as Record<string, unknown>, sortBy)
      : null;

  return (
    <DocumentsList
      articles={articles}
      userEmail={user.email ?? ''}
      nextCursor={nextCursor}
      currentSortBy={sortBy}
      currentSortDir={sortDir}
      searchTerm={searchTerm}
    />
  );
}
