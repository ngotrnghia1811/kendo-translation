'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMacRag } from '@/lib/hooks/useMacRag';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useThemeContext } from '@/components/shared/ThemeProvider';
import type { Segment, SegmentStatus, WorkflowPhase } from '@/types/database';
import SegmentFilterBar, { ALL_STATUSES } from '@/components/editor/SegmentFilterBar';
import SegmentListItem from '@/components/editor/SegmentListItem';
import SegmentEditorPanel from '@/components/editor/SegmentEditorPanel';
import BatchAdvanceToolbar from '@/components/editor/BatchAdvanceToolbar';
import { useEditorKeyboard } from '@/hooks/useEditorKeyboard';
import { useEditorProgress } from '@/hooks/useEditorProgress';
import { fetchAllSegments } from '@/lib/supabase/fetch-all-segments';

/**
 * Per-segment cooperation counts surfaced as badges on the segment list.
 * Shape mirrors GET /api/documents/[id]/segment-activity.
 */
interface ActivityRow {
    segment_id: string;
    pending_suggestions: number;
    unresolved_comments: number;
    recent_transitions_24h: number;
}

/** Maps document_assignments.allowed_phases → segment statuses the user works on. */
const PHASE_STATUS_MAP: Record<WorkflowPhase, SegmentStatus[]> = {
    translate: ['draft'],
    edit:      ['translated'],
    proofread: ['edited'],
    qa:        ['proofread'],
};

export default function EditPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const macRag = useMacRag();

  // Shared theme context for layout width.
  // ('two-column' is N/A for the editor's 2-column grid → treated as 'full'.)
  const { layoutWidth } = useThemeContext();
  const editorWidthClass =
    layoutWidth === 'full' || layoutWidth === 'two-column' ? 'max-w-full' : 'max-w-6xl';

  const [article, setArticle] = useState<{ id: string; title: string } | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<Map<string, ActivityRow>>(new Map());
  const [targetLang, setTargetLang] = useState<'en' | 'zh'>('en');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchAdvancing, setBatchAdvancing] = useState(false);
  const [batchResult, setBatchResult] = useState<{ succeeded: number; skipped: number; failed: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- T5: segment progress memory ---
  const { savedSegmentId, persistSegment } = useEditorProgress(params.id);
  const progressRestoredRef = useRef(false);

  // --- Filter state (T1) ---
  // Initialise from URL params so filters survive navigation / bookmarks.
  const [filterStatuses, setFilterStatuses] = useState<SegmentStatus[]>(() => {
    const raw = searchParams.get('status') ?? '';
    return raw ? (raw.split(',').filter(s => (ALL_STATUSES as string[]).includes(s)) as SegmentStatus[]) : [];
  });
  const [filterQuery, setFilterQuery] = useState<string>(() => searchParams.get('q') ?? '');
  const [showMyPhase, setShowMyPhase] = useState<boolean>(() => searchParams.get('myPhase') === '1');
  const [userPhases, setUserPhases] = useState<WorkflowPhase[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  // Track if we've already synced URL to avoid double-push on initial mount
  const filterInitRef = useRef(true);

  // --- Sync filter state → URL params (T1) ---
  useEffect(() => {
    // Skip the very first effect call (initial mount from URL read)
    if (filterInitRef.current) {
      filterInitRef.current = false;
      return;
    }
    const urlParams = new URLSearchParams();
    if (filterStatuses.length > 0) urlParams.set('status', filterStatuses.join(','));
    if (filterQuery.trim()) urlParams.set('q', filterQuery.trim());
    if (showMyPhase) urlParams.set('myPhase', '1');
    const search = urlParams.toString();
    router.replace(search ? `?${search}` : '?', { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatuses, filterQuery, showMyPhase]);

  // --- Fetch user's phase assignments for this document (T1/T2) ---
  useEffect(() => {
    (async () => {
      try {
        // Get current user id + profile (T2 banner needs username)
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) return;
        const meData = await meRes.json() as { user?: { id: string }; profile?: { id: string; username?: string; role?: string } };
        const userId = meData.user?.id ?? meData.profile?.id;
        if (!userId) return;
        const name = meData.profile?.username ?? null;
        setUserName(name);

        const assnRes = await fetch(`/api/documents/${params.id}/assignments`);
        if (!assnRes.ok) return;
        const data = await assnRes.json() as { assignments?: Array<{ user_id: string; allowed_phases: WorkflowPhase[] }> };
        const mine = (data.assignments ?? []).find(a => a.user_id === userId);
        if (mine) setUserPhases(mine.allowed_phases);
      } catch { /* non-fatal */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // --- Computed: filteredSegments (T1) ---
  const filteredSegments = useMemo(() => {
    let list = segments;

    // My phase filter
    if (showMyPhase && userPhases.length > 0) {
      const myStatuses = userPhases.flatMap(p => PHASE_STATUS_MAP[p] ?? []);
      list = list.filter(s => myStatuses.includes(s.status as SegmentStatus));
    }

    // Status filter (additive)
    if (filterStatuses.length > 0) {
      list = list.filter(s => filterStatuses.includes(s.status as SegmentStatus));
    }

    // Text search
    const q = filterQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(s =>
        s.source_text.toLowerCase().includes(q) ||
        (s.target_text ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [segments, filterStatuses, filterQuery, showMyPhase, userPhases]);

  // --- Computed: statusCounts (T1) — counts BEFORE status filter but AFTER lang/myPhase/text filters ---
  const statusCounts = useMemo(() => {
    const base = showMyPhase && userPhases.length > 0
      ? segments.filter(s => userPhases.flatMap(p => PHASE_STATUS_MAP[p] ?? []).includes(s.status as SegmentStatus))
      : segments;
    const q = filterQuery.trim().toLowerCase();
    const searched = q ? base.filter(s => s.source_text.toLowerCase().includes(q) || (s.target_text ?? '').toLowerCase().includes(q)) : base;
    return ALL_STATUSES.reduce<Record<SegmentStatus, number>>((acc, status) => {
      acc[status] = searched.filter(s => s.status === status).length;
      return acc;
    }, {} as Record<SegmentStatus, number>);
  }, [segments, showMyPhase, userPhases, filterQuery]);

  const refreshActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${params.id}/segment-activity`);
      if (!res.ok) return;
      const json = (await res.json()) as { activity: ActivityRow[] };
      const next = new Map<string, ActivityRow>();
      for (const row of json.activity ?? []) next.set(row.segment_id, row);
      setActivity(next);
    } catch {
      /* non-fatal: badges simply stay stale */
    }
  }, [params.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: art }, segs] = await Promise.all([
      supabase.from('articles').select('id,title').eq('id', params.id).single(),
      fetchAllSegments<Segment>(supabase, params.id, targetLang),
    ]);
    if (art) setArticle(art as { id: string; title: string });
    setSegments(segs);
    setLoading(false);
    void refreshActivity();
  }, [params.id, refreshActivity, targetLang]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- T5: restore saved segment once segments are loaded ---
  useEffect(() => {
    if (progressRestoredRef.current) return;
    if (segments.length === 0) return;
    if (!savedSegmentId) return;
    const saved = segments.find(s => s.id === savedSegmentId);
    if (saved) {
      progressRestoredRef.current = true;
      // selectSegment is async but we don't await here to avoid blocking render
      void selectSegment(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  // --- T5: scroll active segment into view on restore ---
  useEffect(() => {
    if (!activeSegment) return;
    const el = document.querySelector<HTMLElement>(`[data-testid="segment-list-item"][data-segment-id="${activeSegment}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeSegment]);

  // Check if current user is admin (for batch ops)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.role === 'admin');
        }
      } catch { /* non-fatal */ }
    })();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`segments:${params.id}:${targetLang}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'segments',
        filter: `and(article_id=eq.${params.id},target_lang=eq.${targetLang})`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setSegments(prev =>
            prev.map(s => s.id === (payload.new as Segment).id ? (payload.new as Segment) : s)
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id, targetLang]);

  const selectSegment = async (seg: Segment) => {
    if (activeSegment && activeSegment !== seg.id) {
      await fetch(`/api/segments/${activeSegment}/lock`, { method: 'DELETE' });
    }

    setActiveSegment(seg.id);
    setEditingText(seg.target_text || '');
    persistSegment(seg.id);  // T5: remember last-active segment

    await fetch(`/api/segments/${seg.id}/lock`, { method: 'POST' });
  };

  const saveSegment = async (segId: string, text: string, status: SegmentStatus = 'translated') => {
    setSaving(true);
    try {
      await fetch(`/api/segments/${segId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_text: text, status }),
      });
      setSegments(prev =>
        prev.map(s => s.id === segId ? { ...s, target_text: text, status } : s)
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAITranslate = async (seg: Segment) => {
    try {
      setError(null);
      const result = await macRag.buildContext(seg.source_text, {
        sourceLang: seg.source_lang as 'ja' | 'en',
        targetLang: seg.target_lang as 'ja' | 'en',
      });
      if (result?.context) {
        await macRag.translate();
        if (macRag.selectedCandidate?.text) {
          setEditingText(macRag.selectedCandidate.text);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Translation failed');
    }
  };

  const handleBatchAdvance = async (toStatus: SegmentStatus) => {
    if (selectedIds.size === 0) return;
    setBatchAdvancing(true);
    setBatchResult(null);
    try {
      const res = await fetch(`/api/documents/${params.id}/batch-advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment_ids: Array.from(selectedIds), to_status: toStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        const { succeeded, skipped, failed } = data as { succeeded: string[]; skipped: string[]; failed: { id: string; reason: string }[] };
        // Update local state for succeeded segments
        setSegments(prev =>
          prev.map(s => succeeded.includes(s.id) ? { ...s, status: toStatus } : s)
        );
        setBatchResult({ succeeded: succeeded.length, skipped: skipped.length, failed: failed.length });
        setSelectedIds(new Set());
        void refreshActivity();
      } else {
        setError(data.error ?? 'Batch advance failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Batch advance failed');
    } finally {
      setBatchAdvancing(false);
    }
  };

  const toggleSelectSegment = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSegments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSegments.map(s => s.id)));
    }
  };

  const stats = {
    total: segments.length,
    translated: segments.filter(s => s.status !== 'draft').length,
    approved: segments.filter(s => s.status === 'qa_approved').length,
  };

  // --- T3: Editor keyboard shortcuts ---
  // activeIndex in the *filtered* list (may be -1 if segment was filtered out)
  const activeIndex = activeSegment
    ? filteredSegments.findIndex(s => s.id === activeSegment)
    : -1;

  const goToPrevSegment = useCallback(() => {
    if (activeIndex <= 0) return;
    void selectSegment(filteredSegments[activeIndex - 1]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, filteredSegments]);

  const goToNextSegment = useCallback(() => {
    if (activeIndex < 0 || activeIndex >= filteredSegments.length - 1) return;
    void selectSegment(filteredSegments[activeIndex + 1]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, filteredSegments]);

  /** Ctrl+S: save the active segment's current editing text as 'translated'. */
  const handleKeyboardSave = useCallback(() => {
    if (!activeSegment || !editingText) return;
    const seg = segments.find(s => s.id === activeSegment);
    if (!seg) return;
    void saveSegment(activeSegment, editingText, 'translated');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSegment, editingText, segments]);

  /** Ctrl+Enter: approve / advance active segment to the next phase status. */
  const handleKeyboardApprove = useCallback(() => {
    if (!activeSegment || !editingText) return;
    const seg = segments.find(s => s.id === activeSegment);
    if (!seg) return;
    // Advance to the next logical status, capped at qa_approved
    const ORDER: SegmentStatus[] = ['draft', 'translated', 'edited', 'proofread', 'qa_approved'];
    const currentIdx = ORDER.indexOf(seg.status as SegmentStatus);
    const nextStatus: SegmentStatus = currentIdx >= 0 && currentIdx < ORDER.length - 1
      ? ORDER[currentIdx + 1]
      : 'qa_approved';
    void saveSegment(activeSegment, editingText, nextStatus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSegment, editingText, segments]);

  useEditorKeyboard({
    onPrevSegment: goToPrevSegment,
    onNextSegment: goToNextSegment,
    prevDisabled: activeIndex <= 0,
    nextDisabled: activeIndex < 0 || activeIndex >= filteredSegments.length - 1,
    onSave: handleKeyboardSave,
    onApprove: handleKeyboardApprove,
    hasActiveSegment: !!activeSegment,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <span>Loading editor…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile phone-block banner — editor requires desktop (T6) */}
      <div className="md:hidden fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Editor requires a desktop</h2>
        <p className="text-sm text-gray-500 mb-6">
          The translation editor is designed for laptop and desktop use.
          On small screens, use the reader view instead.
        </p>
        <Link
          href={`/documents/${params.id}/read`}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          data-testid="mobile-editor-reader-link"
        >
          Go to Reader View →
        </Link>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/documents" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">← Docs</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-900 truncate">{article?.title}</span>
            <div className="flex items-center gap-1.5 ml-2" data-testid="lang-switcher">
              <button
                onClick={() => setTargetLang('en')}
                data-testid="lang-tab-en"
                className={`text-xs px-2 py-0.5 rounded transition-colors font-medium ${
                  targetLang === 'en'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setTargetLang('zh')}
                data-testid="lang-tab-zh"
                className={`text-xs px-2 py-0.5 rounded transition-colors font-medium ${
                  targetLang === 'zh'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                ZH
              </button>
              {targetLang === 'zh' && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                  ZH — draft segments
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 shrink-0">
            <span>{stats.translated}/{stats.total} translated</span>
            <span className="text-green-600">{stats.approved} approved</span>
          </div>
        </div>
        {stats.total > 0 && (
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${(stats.translated / stats.total) * 100}%` }}
            />
          </div>
        )}
      </header>

      {error && (
        <div className="max-w-6xl mx-auto px-6 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      <main className={`${editorWidthClass} mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6`}>
        {/* Segment list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Segments
              {filteredSegments.length !== segments.length && (
                <span className="ml-1 text-indigo-600 normal-case font-normal">
                  {filteredSegments.length} / {segments.length}
                </span>
              )}
              {batchMode && selectedIds.size > 0 && (
                <span className="ml-1 text-blue-600">({selectedIds.size} selected)</span>
              )}
            </h3>
            {isAdmin && (
              <button
                type="button"
                onClick={() => { setBatchMode(o => !o); setSelectedIds(new Set()); setBatchResult(null); }}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  batchMode
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
                data-testid="batch-mode-toggle"
              >
                {batchMode ? '✓ Batch mode' : 'Batch mode'}
              </button>
            )}
          </div>

          {/* Assignment visibility banner (T2) */}
          {userPhases.length > 0 && (
            <div
              data-testid="assignment-banner"
              className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-sm mb-2"
            >
              {/* Assignment icon */}
              <svg className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-indigo-800">
                  {userName ? `${userName} — ` : ''}Assigned phases:
                </span>{' '}
                <span className="inline-flex flex-wrap gap-1 ml-0.5">
                  {userPhases.map(phase => (
                    <span
                      key={phase}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200"
                    >
                      {phase}
                    </span>
                  ))}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMyPhase(o => !o)}
                  className={`ml-3 text-xs underline-offset-2 underline transition-colors ${
                    showMyPhase ? 'text-indigo-700 font-semibold' : 'text-indigo-500 hover:text-indigo-700'
                  }`}
                >
                  {showMyPhase ? '✓ Showing my segments' : 'Show my segments'}
                </button>
              </div>
            </div>
          )}

          {/* Segment filter bar (T1) */}
          <SegmentFilterBar
            statusCounts={statusCounts}
            activeStatuses={filterStatuses}
            query={filterQuery}
            showMyPhase={showMyPhase}
            userPhases={userPhases}
            onToggleStatus={(s) => setFilterStatuses(prev =>
              prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
            )}
            onClearStatuses={() => setFilterStatuses([])}
            onQueryChange={setFilterQuery}
            onToggleMyPhase={() => setShowMyPhase(o => !o)}
          />

          {batchMode && (
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 pb-2 border-b border-gray-200">
              <button type="button" onClick={toggleSelectAll} className="hover:text-blue-600 transition-colors">
                {selectedIds.size === filteredSegments.length ? 'Deselect all' : 'Select all'}
              </button>
              {batchResult && (
                <span className="text-green-600 font-medium">
                  ✓ {batchResult.succeeded} advanced{batchResult.skipped > 0 ? `, ${batchResult.skipped} skipped` : ''}{batchResult.failed > 0 ? `, ${batchResult.failed} failed` : ''}
                </span>
              )}
            </div>
          )}
          {filteredSegments.map(seg => (
            <SegmentListItem
              key={seg.id}
              segment={seg}
              isActive={activeSegment === seg.id}
              batchMode={batchMode}
              isSelected={selectedIds.has(seg.id)}
              activity={activity.get(seg.id)}
              onSelect={selectSegment}
              onToggleSelect={toggleSelectSegment}
            />
          ))}

          {/* Batch advance toolbar — floats at bottom when selections exist */}
          <BatchAdvanceToolbar
            selectedCount={batchMode ? selectedIds.size : 0}
            advancing={batchAdvancing}
            onAdvance={handleBatchAdvance}
          />
        </div>

        {/* Editor panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          {activeSegment ? (() => {
            const seg = segments.find(s => s.id === activeSegment);
            return seg ? (
              <SegmentEditorPanel
                segment={seg}
                articleId={params.id}
                editingText={editingText}
                saving={saving}
                macRag={{
                  candidates: macRag.candidates,
                  recommendedIndex: macRag.recommendedIndex,
                  isLoading: macRag.isLoading,
                }}
                targetLang={targetLang}
                onEditingTextChange={setEditingText}
                onSave={saveSegment}
                onAITranslate={() => handleAITranslate(seg)}
                onCandidateSelect={(text) => setEditingText(text)}
                onSegmentStatusChange={(segId, newStatus) => {
                  setSegments(prev =>
                    prev.map(s => s.id === segId ? { ...s, status: newStatus } : s)
                  );
                }}
                onActivityRefresh={refreshActivity}
                onSuggestionRefresh={() => { /* state is internal to SegmentEditorPanel */ }}
              />
            ) : null;
          })() : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">👆</p>
              <p className="text-sm">Select a segment to start editing</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
