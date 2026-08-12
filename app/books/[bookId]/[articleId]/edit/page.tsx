import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/pocketbase/server';
import Link from 'next/link';
import { isHuskArticle } from '@/lib/husk-filter';
import EditorClient, { type EditorBookContext } from '@/components/editor/EditorClient';

/**
 * /books/[bookId]/[articleId]/edit — nested editor route (Phase 1).
 *
 * Renders the SAME whole-article editor as /documents/[id]/edit, but with a
 * book/article context header (breadcrumb, author, book metadata), mirroring
 * the reader's /books/[bookId]/[articleId]/[page] route structure. The editor
 * stays whole-article scope (not page-scoped) per decision.
 *
 * Also applies the Phase 0 server-side role gate.
 */

export default async function BookArticleEditPage({
  params,
}: {
  params: Promise<{ bookId: string; articleId: string }>;
}) {
  const { bookId, articleId } = await params;
  const pb = await createServerClient();

  // ── Auth: editor requires an authenticated session ──────────────
  if (!pb.authStore.isValid || !pb.authStore.record) {
    redirect(`/login?next=/books/${bookId}/${articleId}/edit`);
  }

  // ── Role gate (mirrors app/documents/[id]/read/page.tsx canEdit) ──
  const user = pb.authStore.record as Record<string, unknown> | null;
  let canEdit = false;
  if (user) {
    const role = user.role as string | undefined;
    canEdit = role === 'translator' || role === 'admin';
  }
  if (!canEdit) {
    // Reader (or any non-editor role) → bounce to the reader view.
    redirect(`/books/${bookId}/${articleId}/1`);
  }

  // ── Article record (validate book↔article relation) ─────────────
  const articleRecord = await pb
    .collection('articles')
    .getOne(articleId, { fields: 'id,title,title_ja,book,author,doc_type,segment_count' })
    .catch(() => null);
  if (!articleRecord) notFound();

  const articleRaw = JSON.parse(JSON.stringify(articleRecord)) as Record<string, unknown>;
  if ((articleRaw.book as string) !== bookId) notFound();

  // ── Husk fallback: graceful "content moved" state (parity) ──────
  if (isHuskArticle(articleId)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-6 py-20 max-w-md mx-auto">
          <p className="text-4xl mb-4">📦</p>
          <h1 className="text-xl font-semibold text-[var(--color-text)] mb-2">
            This content has moved
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            &ldquo;{(articleRaw.title as string) ?? 'This article'}&rdquo; was a parent container whose
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

  // ── Book metadata (breadcrumb + author) ─────────────────────────
  let bookMeta: { id: string; title: string; author?: string | null; doc_type?: string | null } | null = null;
  try {
    const bookRecord = await pb.collection('books').getOne(bookId, {
      fields: 'id,title,author,doc_type',
    }).catch(() => null);
    if (bookRecord) {
      const b = JSON.parse(JSON.stringify(bookRecord)) as Record<string, unknown>;
      bookMeta = {
        id: b.id as string,
        title: (b.title as string) ?? bookId,
        author: (b.author as string) ?? null,
        doc_type: (b.doc_type as string) ?? null,
      };
    }
  } catch {
    // Book metadata is optional — breadcrumb falls back gracefully.
  }

  const bookContext: EditorBookContext = {
    book: bookMeta ?? { id: bookId, title: bookId },
    article: {
      id: articleRaw.id as string,
      title: (articleRaw.title as string) ?? '',
      author: (articleRaw.author as string) ?? null,
      doc_type: (articleRaw.doc_type as string) ?? null,
    },
  };

  return <EditorClient articleId={articleId} bookContext={bookContext} />;
}
