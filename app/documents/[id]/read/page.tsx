import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { createServerClient, createCacheSafeClient } from '@/lib/pocketbase/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import ReaderView from '@/components/reader/ReaderView';
import type { Segment, DocumentSettings } from '@/types/database';
import { isHeadingParagraph, type Paragraph } from '@/types/reader';
import ReaderLoading from './loading';

/**
 * Phase 4.1 / 4.2: Article data cache via unstable_cache (Data Cache).
 * PocketBase edition — uses createCacheSafeClient() instead of
 * createCacheSafeAdminClient(); collection-level list/view rules ("" for
 * articles/segments/document_settings) allow unauthenticated reads.
 *
 * Cache tag strategy unchanged: per-article tag + coarse "articles" tag.
 */

interface FetchedArticleData {
  readableSegments: Segment[];
  zhSegments: Segment[];
  totalSegmentsHint: number | undefined;
  pageMetadataHint: number[] | null | undefined;
  zhCountHint: number | undefined;
}

const FALLBACK_CHUNK_SIZE = 50; // must match hooks/useReaderView.ts
const PB_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

const cacheFactoryMap = new Map<
  string,
  ReturnType<typeof unstable_cache<typeof fetchArticleDataImpl>>
>();

function fetchArticleDataImpl(
  articleId: string,
  publishFilter: string,
): Promise<FetchedArticleData> {
  return getCachedFetcher(articleId)(articleId, publishFilter);
}

function getCachedFetcher(articleId: string) {
  const existing = cacheFactoryMap.get(articleId);
  if (existing) return existing;

  const fetcher = unstable_cache(
    async (id: string, publishFilter: string): Promise<FetchedArticleData> => {
      // ── Page info hints (for lazy-pager human view) ────────────
      let totalSegmentsHint: number | undefined;
      let pageMetadataHint: number[] | null | undefined;

      const infoUrl = new URL(`${PB_URL}/api/custom/article-page-info`);
      infoUrl.searchParams.set('article_id', id);
      infoUrl.searchParams.set('target_lang', 'en');
      infoUrl.searchParams.set('publish_filter', publishFilter);

      const infoRes = await fetch(infoUrl.toString());
      if (infoRes.ok) {
        const info = await infoRes.json();
        totalSegmentsHint = info.total_count
          ? Number(info.total_count)
          : undefined;
        pageMetadataHint = info.has_page_metadata && info.distinct_pages?.length
          ? (info.distinct_pages as number[])
          : null;
      }

      // ── Fetch EN segments (page 1) ─────────────────────────────
      const page0PageNum: number | undefined = pageMetadataHint
        ? pageMetadataHint[0]
        : undefined;

      const enUrl = new URL(`${PB_URL}/api/custom/article-bilingual-window`);
      enUrl.searchParams.set('article_id', id);
      enUrl.searchParams.set('target_lang', 'en');
      if (page0PageNum !== undefined) {
        enUrl.searchParams.set('page', String(page0PageNum));
      } else {
        enUrl.searchParams.set('offset', '0');
        enUrl.searchParams.set('limit', String(FALLBACK_CHUNK_SIZE));
      }

      const enRes = await fetch(enUrl.toString());
      if (!enRes.ok) {
        throw new Error(`Failed to fetch EN segments: ${enRes.status}`);
      }
      const enData = await enRes.json();
      const enSegmentsRaw = (enData.items ?? []) as Segment[];

      const readableSegments = enSegmentsRaw.filter((s) =>
        publishFilter === 'qa_approved'
          ? s.status === 'qa_approved'
          : s.status === 'qa_approved' || s.target_text,
      );

      // ── ZH segments (conditional) ───────────────────────────────
      let zhSegments: Segment[] = [];
      let zhCountHint: number | undefined;

      // Count ZH segments via PocketBase getList with count
      const pb = createCacheSafeClient();
      const zhCountResult = await pb
        .collection('segments')
        .getList(1, 1, {
          filter: `article = "${id}" && target_lang = "zh"`,
          fields: 'id',
        });
      const zhCount = zhCountResult.totalItems;
      const needsZh = zhCount > 0;

      if (needsZh) {
        zhCountHint = zhCount;
        const zhUrl = new URL(
          `${PB_URL}/api/custom/article-bilingual-window`,
        );
        zhUrl.searchParams.set('article_id', id);
        zhUrl.searchParams.set('target_lang', 'zh');
        if (page0PageNum !== undefined) {
          zhUrl.searchParams.set('page', String(page0PageNum));
        } else {
          zhUrl.searchParams.set('offset', '0');
          zhUrl.searchParams.set('limit', String(FALLBACK_CHUNK_SIZE));
        }

        const zhRes = await fetch(zhUrl.toString());
        if (zhRes.ok) {
          const zhData = await zhRes.json();
          zhSegments = ((zhData.items ?? []) as Segment[]).filter(
            (s) => s.target_text,
          );
        }
      }

      return {
        readableSegments,
        zhSegments,
        totalSegmentsHint,
        pageMetadataHint,
        zhCountHint,
      };
    },
    ['article-segment-data', articleId],
    {
      revalidate: false,
      tags: ['articles', `article-${articleId}`],
    },
  );

  cacheFactoryMap.set(articleId, fetcher);
  return fetcher;
}

// ── Bot: full static HTML render ────────────────────────────────────────

function BotArticleHtml({
  article,
  readableSegments,
  settings,
}: {
  article: { id: string; title: string; title_ja?: string | null };
  readableSegments: Segment[];
  settings: DocumentSettings | null;
}) {
  const boundaries = new Set(settings?.paragraph_boundaries || [0]);
  const ordered = [...readableSegments].sort(
    (a, b) => a.position - b.position,
  );
  const paragraphs: Paragraph[] = [];
  let currentPara: Segment[] = [];
  let paraStart = ordered.length ? ordered[0].position : 0;
  for (const seg of ordered) {
    if (boundaries.has(seg.position) && currentPara.length > 0) {
      paragraphs.push({ segments: currentPara, position: paraStart });
      currentPara = [];
      paraStart = seg.position;
    }
    currentPara.push(seg);
  }
  if (currentPara.length > 0) {
    paragraphs.push({ segments: currentPara, position: paraStart });
  }

  const sourceLang = settings?.source_lang || 'ja';
  const targetLang = settings?.target_lang || 'en';

  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {article.title}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              {paragraphs.length} paragraph
              {paragraphs.length === 1 ? '' : 's'} —{' '}
              {sourceLang.toUpperCase()} → {targetLang.toUpperCase()}
            </p>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <article>
          {paragraphs.map((p) => {
            const srcText = p.segments
              .map((s) => s.source_text)
              .filter(Boolean)
              .join(/^(ja|zh|ko)/.test(sourceLang) ? '' : ' ');
            const tgtText = p.segments
              .map((s) => s.target_text || '')
              .filter(Boolean)
              .join(/^(ja|zh|ko)/.test(targetLang) ? '' : ' ');

            if (!srcText.trim() && !tgtText.trim()) return null;

            if (isHeadingParagraph(p)) {
              return (
                <div key={p.position} className="mt-10 mb-4">
                  {srcText.trim() && (
                    <h2 lang={sourceLang} className="text-xl font-semibold">
                      {srcText}
                    </h2>
                  )}
                  {tgtText.trim() && (
                    <h2
                      lang={targetLang}
                      className="text-lg font-semibold text-gray-600 mt-1"
                    >
                      {tgtText}
                    </h2>
                  )}
                </div>
              );
            }

            return (
              <div key={p.position} className="mb-6">
                {srcText.trim() && (
                  <div className="border-l-4 border-red-400 pl-4 py-2 mb-2">
                    <p lang={sourceLang} className="text-base leading-relaxed">
                      {srcText}
                    </p>
                  </div>
                )}
                {tgtText.trim() && (
                  <div className="border-l-4 border-blue-400 pl-4 py-2">
                    <p lang={targetLang} className="text-base leading-relaxed">
                      {tgtText}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </article>
      </main>
    </>
  );
}

// ── Cached article content ──────────────────────────────────────────────

async function CachedArticleContent({
  articleId,
  publishFilter,
  isBot,
  article,
  canEdit,
  settings,
}: {
  articleId: string;
  publishFilter: string;
  isBot: boolean;
  article: {
    id: string;
    title: string;
    title_ja?: string | null;
    paired_pdf_path?: string | null;
    doc_type?: string | null;
    author?: string | null;
    summary?: string | null;
  };
  canEdit: boolean;
  settings: DocumentSettings | null;
}) {
  const {
    readableSegments,
    zhSegments,
    totalSegmentsHint,
    pageMetadataHint,
    zhCountHint,
  } = await fetchArticleDataImpl(articleId, publishFilter);

  // Bot: render static SEO HTML
  if (isBot) {
    return (
      <BotArticleHtml
        article={article}
        readableSegments={readableSegments}
        settings={settings}
      />
    );
  }

  // Human: empty state or ReaderView
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--rt-bg, #ffffff)' }}
    >
      {readableSegments.length === 0 ? (
        <>
          <header className="border-b border-[var(--color-border)]">
            <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link
                  href="/documents"
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm"
                >
                  ← Documents
                </Link>
                <span className="text-[var(--color-text-muted)]/40">/</span>
                <h1 className="text-sm font-medium text-[var(--color-text)]">
                  {article.title}
                </h1>
              </div>
              {canEdit && (
                <Link
                  href={`/documents/${articleId}/edit`}
                  className="text-xs px-3 py-1.5 bg-[var(--color-text)] text-[var(--color-surface)] rounded-lg hover:opacity-80 transition-opacity"
                >
                  Edit
                </Link>
              )}
            </div>
          </header>
          <main className="max-w-4xl mx-auto px-6 py-10">
            <div className="text-center py-20 text-[var(--color-text-muted)]">
              <p className="text-4xl mb-4">📝</p>
              {canEdit ? (
                <>
                  <p className="font-medium text-gray-600 dark:text-gray-300">
                    No approved translations yet
                  </p>
                  <p className="text-sm mt-2">
                    Approve segments in the editor to see them here.
                  </p>
                  <Link
                    href={`/documents/${articleId}/edit`}
                    className="inline-block mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Open Editor →
                  </Link>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-600 dark:text-gray-300">
                    No translations available yet
                  </p>
                  <p className="text-sm mt-2">
                    This document hasn&apos;t been published for reading yet.
                    Check back later.
                  </p>
                </>
              )}
            </div>
          </main>
        </>
      ) : (
        <ReaderView
          segments={readableSegments}
          zhSegments={zhSegments.length > 0 ? zhSegments : undefined}
          settings={settings ?? null}
          title={article.title}
          titleJa={article.title_ja ?? null}
          docType={article.doc_type ?? null}
          author={article.author ?? null}
          summary={article.summary ?? null}
          articleId={articleId}
          canEdit={canEdit}
          pairedPdfPath={article.paired_pdf_path ?? null}
          totalSegmentsHint={totalSegmentsHint}
          pageMetadataHint={pageMetadataHint}
          zhCountHint={zhCountHint}
          publishFilter={publishFilter}
        />
      )}
    </div>
  );
}

// ── Page entry point ────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pb = createCacheSafeClient();
  try {
    const record = await pb.collection('articles').getOne(id, {
      fields: 'title',
    });
    const data = JSON.parse(JSON.stringify(record)) as Record<
      string,
      unknown
    >;
    const title = data.title as string | undefined;
    return {
      title: title ?? 'Read Article',
      description: title
        ? `Read "${title}" on Kendo Translation`
        : 'Read article on Kendo Translation',
    };
  } catch {
    return { title: 'Read Article' };
  }
}

export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pb = await createServerClient();

  // Runtime data — NOT cached (cookies, headers, auth are per-request)
  let articleData: Record<string, unknown> | null = null;
  try {
    const record = await pb.collection('articles').getOne(id);
    // PocketBase Record → plain object for safe property access
    articleData = JSON.parse(JSON.stringify(record));
  } catch {
    notFound();
  }

  if (!articleData) notFound();

  // ── Book hierarchy redirect (Phase 1, docs/BOOK_HIERARCHY_UI_PLAN.md) ──
  const articleBook = (articleData.book as string) ?? '';
  const isSegmented = (articleData.segmented as boolean) ?? false;
  const segCount = (articleData.segment_count as number) ?? 0;

  if (articleBook) {
    // Article has a book relation → redirect to the new book hierarchy URL
    // Use 308 (Permanent Redirect) since this is the new canonical URL scheme
    redirect(`/books/${articleBook}/${id}/1`);
  }

  // Husk detection: segmented=false + segment_count=0 → no real content
  // These are the 11 parent-book husk rows (docs/HUSK_ARTICLES_REVIEW.md)
  // Show graceful fallback instead of a blank/broken page
  const isHusk = !isSegmented && segCount === 0;

  // Role check from PocketBase auth record — role is a first-class field
  const user = pb.authStore.record as Record<string, unknown> | null;
  let canEdit = false;
  if (user) {
    const role = user.role as string | undefined;
    canEdit = role === 'translator' || role === 'admin';
  }

  // Bot detection (Phase 2.3)
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') ?? '';
  const isBot =
    /bot|crawler|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex/i.test(
      userAgent,
    );

  // Document settings (for publish_filter)
  let settings: Record<string, unknown> | null = null;
  try {
    const settingsList = await pb
      .collection('document_settings')
      .getList(1, 1, {
        filter: `article = "${id}"`,
      });
    settings = settingsList.items[0] as Record<string, unknown> | null;
  } catch {
    // No settings — use defaults
  }

  const publishFilter =
    (settings?.publish_filter as string) ?? 'any_translated';

  // ── Husk fallback: graceful "content moved" state ───────────────
  if (isHusk) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--rt-bg, #ffffff)' }}
      >
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

  return (
    <Suspense fallback={<ReaderLoading />}>
      <CachedArticleContent
        articleId={id}
        publishFilter={publishFilter}
        isBot={isBot}
        article={{
          id: articleData.id as string,
          title: (articleData.title as string) ?? '',
          title_ja: (articleData.title_ja as string) ?? null,
          paired_pdf_path: (articleData.paired_pdf_path as string) ?? null,
          doc_type: (articleData.doc_type as string) ?? null,
          author: (articleData.author as string) ?? null,
          summary: (articleData.summary as string) ?? null,
        }}
        canEdit={canEdit}
        settings={settings as DocumentSettings | null}
      />
    </Suspense>
  );
}
