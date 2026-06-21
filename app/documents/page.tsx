import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DocumentsList from '@/components/documents/DocumentsList';

export default async function DocumentsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/documents');

  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .eq('segmented', true)
    .order('created_at', { ascending: false });

  return (
    <DocumentsList
      articles={articles ?? []}
      userEmail={user.email ?? ''}
    />
  );
}
