/**
 * /books/[bookId]/[articleId]/[page] — Single page reader.
 *
 * Fetches page content from PocketBase (same logic as
 * GET /api/books/[bookId]/[articleId]/[page]) and renders PageReader.
 *
 * Phase 2 of docs/BOOK_HIERARCHY_UI_PLAN.md.
 * Phase 4 (feature restoration) — now fetches document_settings,
 * book metadata, ZH availability, and user permissions to restore
 * the full ReaderView feature set in the page-scoped model.
 */

import { createServerClient } from '@/lib/pocketbase/server';
import { redirect, notFound } from 'next/navigation';
import PageReader from '@/components/books/PageReader';
import type { PageContent } from '@/components/books/types';

const PB_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export default async function ReadPagePage({
  params,
}: {
  params: Promise<{ bookId: string; articleId: string; page: string }>;
}) {
  const { bookId, articleId, page: pageStr } = await params;
  const pageNumber = parseInt(pageStr, 10);
  const pb = await createServerClient();

  if (!pb.authStore.isValid || !pb.authStore.record) {
    redirect('/login?next=/books');
  }

  if (isNaN(pageNumber) || pageNumber < 1) {
    notFound();
  }

  // ── Article record ──────────────────────────────────────────
  const articleRecord = await pb.collection('articles').getOne(articleId, {
    fields: 'id,title,title_ja,book,segment_count,paired_pdf_path',
  }).catch(() => null);

  if (!articleRecord) notFound();
  const articleRaw = JSON.parse(JSON.stringify(articleRecord)) as Record<string, unknown>;
  if ((articleRaw.book as string) !== bookId) notFound();

  // ── User permissions ────────────────────────────────────────
  const user = pb.authStore.record as Record<string, unknown> | null;
  const role = user?.role as string | undefined;
  const canEdit = role === 'translator' || role === 'admin';

  // ── Document settings (paragraph boundaries, lang config) ────
  let settings: Record<string, unknown> | null = null;
  try {
    const settingsList = await pb
      .collection('document_settings')
      .getList(1, 1, {
        filter: `article = "${articleId}"`,
      });
    settings = settingsList.items[0]
      ? (JSON.parse(JSON.stringify(settingsList.items[0])) as Record<string, unknown>)
      : null;
  } catch {
    // No settings — use defaults
  }

  // ── Book metadata ───────────────────────────────────────────
  let bookMeta: Record<string, unknown> | null = null;
  try {
    const bookRecord = await pb.collection('books').getOne(bookId, {
      fields: 'id,title,title_ja,author,summary,doc_type',
    }).catch(() => null);
    if (bookRecord) {
      bookMeta = JSON.parse(JSON.stringify(bookRecord)) as Record<string, unknown>;
    }
  } catch {
    // Book metadata is optional
  }

  // ── Get page index from PocketBase custom hook ──────────────
  const pagesUrl = new URL(`${PB_URL}/api/custom/article-pages`);
  pagesUrl.searchParams.set('article_id', articleId);
  pagesUrl.searchParams.set('target_lang', 'en');
  const pagesRes = await fetch(pagesUrl.toString());

  if (!pagesRes.ok) notFound();
  const pagesData = await pagesRes.json();
  const pagesList: Array<{ page_number: number; segment_ids: string[] }> =
    pagesData.pages ?? [];

  const targetPage = pagesList.find((p) => p.page_number === pageNumber);
  if (!targetPage) notFound();

  const mode: string = pagesData.mode ?? 'synthetic_chunk';

  // ── Fetch segments for this page ────────────────────────────
  let segments: Array<Record<string, unknown>> = [];

  if (mode === 'source_page') {
    const winUrl = new URL(`${PB_URL}/api/custom/article-bilingual-window`);
    winUrl.searchParams.set('article_id', articleId);
    winUrl.searchParams.set('target_lang', 'en');
    winUrl.searchParams.set('page', String(pageNumber));

    const winRes = await fetch(winUrl.toString());
    if (!winRes.ok) {
      return (
        <div className="p-8 text-center text-[var(--color-text-muted)]">
          Failed to load page content.
        </div>
      );
    }
    const winData = await winRes.json();
    segments = winData.items ?? [];
  } else {
    if (targetPage.segment_ids.length > 0) {
      const allSegments = await pb.collection('segments').getFullList({
        filter: `article = "${articleId}" && target_lang = "en"`,
        sort: '+position',
      });
      const idSet = new Set(targetPage.segment_ids);
      segments = allSegments
        .filter((s) => idSet.has((s as Record<string, unknown>).id as string))
        .map((raw) => JSON.parse(JSON.stringify(raw)) as Record<string, unknown>);
    }
  }

  // ── ZH availability ──────────────────────────────────────────
  let hasZh = false;
  try {
    const zhCount = await pb.collection('segments').getList(1, 1, {
      filter: `article = "${articleId}" && target_lang = "zh"`,
      fields: 'id',
    });
    hasZh = zhCount.totalItems > 0;
  } catch {
    // ZH not available — hide the toggle
  }

  // ── Build PageContent ───────────────────────────────────────
  const pageContent: PageContent = {
    page_number: pageNumber,
    page_count: pagesList.length,
    segment_count: segments.length,
    mode: mode as PageContent['mode'],
    article: {
      id: articleRaw.id as string,
      title: (articleRaw.title as string) ?? '',
      title_ja: (articleRaw.title_ja as string) ?? null,
      segment_count: (articleRaw.segment_count as number) ?? 0,
    },
    segments: segments.map((s) => ({
      id: s.id as string,
      position: s.position as number,
      source_text: (s.source_text as string) ?? '',
      target_text: (s.target_text as string) ?? null,
      source_lang: (s.source_lang as string) ?? 'ja',
      target_lang: (s.target_lang as string) ?? 'en',
      status: (s.status as string) ?? 'draft',
      ruby_data: (s.ruby_data ?? null) as PageContent['segments'][0]['ruby_data'],
      metadata: (s.metadata as Record<string, unknown> | null) ?? null,
    })),
    all_pages: pagesList.map((p) => ({
      page_number: p.page_number,
      segment_count: p.segment_ids.length,
    })),
    settings: settings
      ? {
          source_lang: (settings.source_lang as string) ?? 'ja',
          target_lang: (settings.target_lang as string) ?? 'en',
          paragraph_boundaries: (settings.paragraph_boundaries as number[]) ?? [],
          publish_filter: (settings.publish_filter as string) ?? 'any_translated',
          paired_pdf_path: (articleRaw.paired_pdf_path as string) ?? null,
        }
      : null,
    book: bookMeta
      ? {
          author: (bookMeta.author as string) ?? null,
          summary: (bookMeta.summary as string) ?? null,
          doc_type: (bookMeta.doc_type as string) ?? null,
        }
      : null,
    has_zh: hasZh,
    can_edit: canEdit,
  };

  return (
    <PageReader
      pageContent={pageContent}
      bookId={bookId}
      articleId={articleId}
    />
  );
}
