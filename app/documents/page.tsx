import type { Article } from '@/types/database';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DocumentsList from '@/components/documents/DocumentsList';

export default async function DocumentsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/documents');

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, translation_status, segment_count')
    .eq('segmented', true)
    .order('created_at', { ascending: false });

  // Narrow column select for perf; cast satisfies Article[] type at compile time
  return (
    <DocumentsList
      articles={(articles as Article[]) ?? []}
      userEmail={user.email ?? ''}
    />
  );
}
