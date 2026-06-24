import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import ReaderView from '@/components/reader/ReaderView';
import type { Segment, DocumentSettings } from '@/types/database';
import { isHeadingParagraph, type Paragraph } from '@/types/reader';
import ReaderLoading from './loading';

/**
 * Phase 4.1 / 4.2: Article data cache via unstable_cache (Data Cache).
 * We use unstable_cache instead of "use cache" because "use cache" requires
 * global `cacheComponents: true` in next.config.ts, which has a large blast
 * radius across all API routes and auth-gated pages. unstable_cache achieves
 * the same result — cacheable article segment queries with tag-based
 * invalidation — without the global flag.
 *
 * Cache key = (articleId, publishFilter). publishFilter varies by viewer class
 * (public sees qa_approved, admins see any_translated), so different scopes
 * get separate cache entries. Admins/public don't poison each other's cache.
 */

interface FetchedArticleData {
  readableSegments: Segment[];
  zhSegments: Segment[];
  totalSegmentsHint: number | undefined;
  pageMetadataHint: number[] | null | undefined;
  zhCountHint: number | undefined;
}

const FALLBACK_CHUNK_SIZE = 50; // must match hooks/useReaderView.ts

const fetchArticleSegmentData = unstable_cache(
  async (
    articleId: string,
    publishFilter: string,
  ): Promise<FetchedArticleData> => {
    const supabase = await createAdminClient();

    // ── Page info hints (for lazy-pager human view) ──────────────────────
    let totalSegmentsHint: number | undefined;
    let pageMetadataHint: number[] | null | undefined;
    const { data: pageInfo } = await supabase.rpc('get_article_page_info', {
      p_article_id: articleId,
      p_target_lang: 'en',
      p_publish_filter: publishFilter,
    });
    const info = (pageInfo as any)?.[0];
    totalSegmentsHint = info?.total_count ? Number(info.total_count) : undefined;
    pageMetadataHint = info?.has_page_metadata && info?.distinct_pages
      ? (info.distinct_pages as number[])
      : null;

    // ── Fetch EN segments (page 1 for human, full for bot) ──────────────
    const page0PageNum: number | undefined = pageMetadataHint
      ? pageMetadataHint[0]
      : undefined;
    const { data: enData, error: enErr } = await supabase.rpc(
      'get_article_bilingual_window',
      {
        p_article_id: articleId,
        p_target_lang: 'en',
        p_offset: page0PageNum !== undefined ? 0 : 0,
        p_limit: page0PageNum !== undefined ? 0 : FALLBACK_CHUNK_SIZE,
        p_page: page0PageNum ?? undefined,
      },
    );
    if (enErr) throw new Error(`Failed to fetch EN page 1: ${enErr.message}`);
    const enSegmentsRaw = (enData ?? []) as Segment[];

    const readableSegments = enSegmentsRaw.filter((s) =>
      publishFilter === 'qa_approved'
        ? s.status === 'qa_approved'
        : s.status === 'qa_approved' || s.target_text,
    );

    // ── ZH segments (conditional) ────────────────────────────────────────
    let zhSegments: Segment[] = [];
    let zhCountHint: number | undefined;
    const { count: zhCount } = await supabase
      .from('segments')
      .select('id', { count: 'exact', head: true })
      .eq('article_id', articleId)
      .eq('target_lang', 'zh')
      .limit(1);
    const needsZh = (zhCount ?? 0) > 0;

    if (needsZh) {
      zhCountHint = zhCount ?? 0;
      const { data: zhData } = await supabase.rpc('get_article_bilingual_window', {
        p_article_id: articleId,
        p_target_lang: 'zh',
        p_offset: page0PageNum !== undefined ? 0 : 0,
        p_limit: page0PageNum !== undefined ? 0 : FALLBACK_CHUNK_SIZE,
        p_page: page0PageNum ?? undefined,
      });
      zhSegments = ((zhData ?? []) as Segment[]).filter((s) => s.target_text);
    }

    return { readableSegments, zhSegments, totalSegmentsHint, pageMetadataHint, zhCountHint };
  },
  ['article-segment-data'],
  {
    // Cache indefinitely; invalidated explicitly via revalidateTag('articles')
    // when segments are edited, translated, or QA-approved (Phase 4.4).
    revalidate: false,
    tags: ['articles'],
  },
);

// ── Bot: full static HTML render ────────────────────────────────────────

function BotArticleHtml({
  article,
  readableSegments,
  settings,
}: {
  article: { id: string; title: string };
  readableSegments: Segment[];
  settings: DocumentSettings | null;
}) {
  const boundaries = new Set(settings?.paragraph_boundaries || [0]);
  const ordered = [...readableSegments].sort((a, b) => a.position - b.position);
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
            <h1 className="text-xl font-semibold text-gray-900">{article.title}</h1>
            <p className="text-xs text-gray-500 mt-1">
              {paragraphs.length} paragraph{paragraphs.length === 1 ? '' : 's'} — {sourceLang.toUpperCase()} → {targetLang.toUpperCase()}
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
                      <h2 lang={sourceLang} className="text-xl font-semibold">{srcText}</h2>
                    )}
                    {tgtText.trim() && (
                      <h2 lang={targetLang} className="text-lg font-semibold text-gray-600 mt-1">{tgtText}</h2>
                    )}
                  </div>
                );
              }

              return (
                <div key={p.position} className="mb-6">
                  {srcText.trim() && (
                    <div lang={sourceLang} className="border-l-4 border-red-400 pl-4 py-2 mb-2">
                      <p className="text-base leading-relaxed">{srcText}</p>
                    </div>
                  )}
                  {tgtText.trim() && (
                    <div lang={targetLang} className="border-l-4 border-blue-400 pl-4 py-2">
                      <p className="text-base leading-relaxed">{tgtText}</p>
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

// ── Cached article content (wrapped in Suspense for streaming) ──────────

async function CachedArticleContent({
  articleId, publishFilter, isBot, article, canEdit, settings,
}: {
  articleId: string;
  publishFilter: string;
  isBot: boolean;
  article: { id: string; title: string; paired_pdf_path?: string | null };
  canEdit: boolean;
  settings: DocumentSettings | null;
}) {
  const {
    readableSegments,
    zhSegments,
    totalSegmentsHint,
    pageMetadataHint,
    zhCountHint,
  } = await fetchArticleSegmentData(articleId, publishFilter);

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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--rt-bg, #ffffff)' }}>
      {readableSegments.length === 0 ? (
        <>
          <header className="border-b border-[var(--color-border)]">
            <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href="/documents" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm">← Documents</Link>
                <span className="text-[var(--color-text-muted)]/40">/</span>
                <h1 className="text-sm font-medium text-[var(--color-text)]">{article.title}</h1>
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
                  <p className="font-medium text-gray-600 dark:text-gray-300">No approved translations yet</p>
                  <p className="text-sm mt-2">Approve segments in the editor to see them here.</p>
                  <Link href={`/documents/${articleId}/edit`} className="inline-block mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Open Editor →
                  </Link>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-600 dark:text-gray-300">No translations available yet</p>
                  <p className="text-sm mt-2">This document hasn&apos;t been published for reading yet. Check back later.</p>
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
          articleId={articleId}
          canEdit={canEdit}
          pairedPdfPath={article.paired_pdf_path ?? null}
          totalSegmentsHint={totalSegmentsHint}
          pageMetadataHint={pageMetadataHint}
          zhCountHint={zhCountHint}
        />
      )}
    </div>
  );
}

// ── Page entry point (NON-cached parent) ────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: article } = await supabase
    .from('articles')
    .select('title')
    .eq('id', id)
    .single();

  return {
    title: article?.title ?? 'Read Article',
    description: article?.title ? `Read "${article.title}" on Kendo Translation` : 'Read article on Kendo Translation',
  };
}

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Runtime data — NOT cached (cookies, headers, auth are per-request)
  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (!article) notFound();

  // Role check from JWT app_metadata (Phase 1.2i)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let canEdit = false;
  if (user) {
    const role = (user.app_metadata as Record<string, unknown> | undefined)
      ?.role as string | undefined;
    canEdit = role === 'translator' || role === 'admin';
  }

  // Bot detection (Phase 2.3)
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') ?? '';
  const isBot = /bot|crawler|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex/i.test(userAgent);

  // Document settings (for publish_filter)
  const { data: settings } = await supabase
    .from('document_settings')
    .select('*')
    .eq('article_id', id)
    .maybeSingle();

  const publishFilter = settings?.publish_filter ?? 'any_translated';

  // Phase 4.2 / 4.3: the cached data fetch is wrapped in <Suspense> so the
  // static shell (header/breadcrumb) streams immediately while the data
  // fetch resolves from Data Cache (or server on first hit).
  return (
    <Suspense fallback={<ReaderLoading />}>
      <CachedArticleContent
        articleId={id}
        publishFilter={publishFilter}
        isBot={isBot}
        article={article}
        canEdit={canEdit}
        settings={settings ?? null}
      />
    </Suspense>
  );
}
