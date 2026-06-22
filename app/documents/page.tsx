import type { Article } from '@/types/database';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DocumentsList from '@/components/documents/DocumentsList';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/documents');

  const { cursor } = await searchParams;

  // Phase 1.2g: keyset-paginated documents feed via get_documents_feed_v1 RPC.
  // Replaces the unbounded .select() that was loading all ~900 articles.
  const { data, error } = await supabase.rpc('get_documents_feed_v1', {
    p_cursor: cursor ? new Date(cursor).toISOString() : null,
    p_limit: 30,
  });

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  const articles = (data ?? []) as Article[];

  // Compute next_cursor from the last item's created_at for "Load more" link.
  const nextCursor =
    articles.length > 0
      ? (articles[articles.length - 1] as Article & { created_at: string }).created_at
      : null;

  return (
    <DocumentsList
      articles={articles}
      userEmail={user.email ?? ''}
      nextCursor={nextCursor}
    />
  );
}
