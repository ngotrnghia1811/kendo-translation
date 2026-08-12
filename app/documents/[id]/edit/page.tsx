import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/pocketbase/server';
import Link from 'next/link';
import { isHuskArticle } from '@/lib/husk-filter';
import EditorClient from '@/components/editor/EditorClient';

/**
 * /documents/[id]/edit — legacy editor route.
 *
 * Phase 0 + Phase 1 (editor-workflow redesign):
 *   - Server-side role gate: only translator/admin may edit (security fix).
 *   - Redirect parity with the reader: articles with a `book` relation are
 *     redirected to the new canonical `/books/[bookId]/[articleId]/edit`.
 *   - Husk-article fallback parity: the 11 husk articles show a graceful
 *     "content has moved" state instead of a blank editor.
 */

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pb = await createServerClient();

  // ── Auth: editor requires an authenticated session ──────────────
  if (!pb.authStore.isValid || !pb.authStore.record) {
    redirect(`/login?next=/documents/${id}/edit`);
  }

  // ── Role gate (mirrors app/documents/[id]/read/page.tsx canEdit) ──
  const user = pb.authStore.record as Record<string, unknown> | null;
  let canEdit = false;
  if (user) {
    const role = user.role as string | undefined;
    canEdit = role === 'translator' || role === 'admin';
  }
  if (!canEdit) {
    // Reader (or any non-editor role) → bounce to the read view.
    redirect(`/documents/${id}/read`);
  }

  // ── Article record ───────────────────────────────────────────────
  let articleData: Record<string, unknown> | null = null;
  try {
    const record = await pb.collection('articles').getOne(id);
    articleData = JSON.parse(JSON.stringify(record));
  } catch {
    notFound();
  }
  if (!articleData) notFound();

  // ── Book hierarchy redirect (Phase 1) ────────────────────────────
  const articleBook = (articleData.book as string) ?? '';
  if (articleBook) {
    redirect(`/books/${articleBook}/${id}/edit`);
  }

  // ── Husk fallback: graceful "content moved" state ────────────────
  if (isHuskArticle(id)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-6 py-20 max-w-md mx-auto">
          <p className="text-4xl mb-4">📦</p>
          <h1 className="text-xl font-semibold text-[var(--color-text)] mb-2">
            This content has moved
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            &ldquo;{(articleData.title as string) ?? 'This article'}&rdquo; was a parent container whose
            content has been split into child articles. Those articles are
            now available through the book browse.
          </p>
          <Link
            href="/books"
            className="inline-block px-4 py-2 bg-[var(--color-text)] text-[var(--color-surface)] rounded-lg hover:opacity-80 transition-opacity text-sm"
          >
            Browse Books →
          </Link>
        </div>
      </div>
    );
  }

  return <EditorClient articleId={id} bookContext={null} />;
}
