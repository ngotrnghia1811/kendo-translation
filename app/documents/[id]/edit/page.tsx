'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMacRag } from '@/lib/hooks/useMacRag';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import type { Segment, SegmentStatus, WorkflowPhase } from '@/types/database';
import SegmentFilterBar, { ALL_STATUSES } from '@/components/editor/SegmentFilterBar';
import PhaseBadge from '@/components/shared/PhaseBadge';
import PhaseAdvanceButton from '@/components/editor/PhaseAdvanceButton';
import PhaseTransitionHistory from '@/components/editor/PhaseTransitionHistory';
import SuggestionPanel from '@/components/editor/SuggestionPanel';
import QAIssuesList from '@/components/editor/QAIssuesList';
import {
    AgentSuggestionPanel,
    type AgentPhase,
} from '@/components/editor/AgentSuggestionPanel';
import {
    ContextBuilderPanel,
    type ContextBuilderPhase,
} from '@/components/editor/ContextBuilderPanel';
import CommentThread from '@/components/editor/CommentThread';

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

/**
 * Map a segment's current status to the LLM agent phase that should
 * run *next*: draft → translate, translated → edit, everything else
 * → proofread. qa_approved short-circuits in the UI.
 */
/** Maps document_assignments.allowed_phases → segment statuses the user works on. */
const PHASE_STATUS_MAP: Record<WorkflowPhase, SegmentStatus[]> = {
    translate: ['draft'],
    edit:      ['translated'],
    proofread: ['edited'],
    qa:        ['proofread'],
};

function agentPhaseFor(status: SegmentStatus): AgentPhase | null {
    if (status === 'qa_approved') return null;
    if (status === 'draft') return 'translate';
    if (status === 'translated') return 'edit';
    return 'proofread';
}

export default function EditPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const macRag = useMacRag();

  const [article, setArticle] = useState<{ id: string; title: string } | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'history' | 'suggestions' | 'context' | 'comments'>('history');
  const [suggestionRefreshKey, setSuggestionRefreshKey] = useState(0);
  const [activity, setActivity] = useState<Map<string, ActivityRow>>(new Map());
  const [targetLang, setTargetLang] = useState<'en' | 'zh'>('en');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchAdvancing, setBatchAdvancing] = useState(false);
  const [batchResult, setBatchResult] = useState<{ succeeded: number; skipped: number; failed: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
    const [{ data: art }, { data: segs }] = await Promise.all([
      supabase.from('articles').select('id,title').eq('id', params.id).single(),
      supabase.from('segments').select('*').eq('article_id', params.id).eq('target_lang', targetLang).order('position'),
    ]);
    if (art) setArticle(art as { id: string; title: string });
    if (segs) setSegments(segs as Segment[]);
    setLoading(false);
    void refreshActivity();
  }, [params.id, refreshActivity, targetLang]);

  useEffect(() => { loadData(); }, [loadData]);

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
    setDetailsOpen(false);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <span>Loading editor…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      <main className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          {filteredSegments.map(seg => {
            const act = activity.get(seg.id);
            const isSelected = selectedIds.has(seg.id);
            return (
            <div
              key={seg.id}
              className={`flex items-start gap-2 ${batchMode ? '' : ''}`}
            >
              {batchMode && (
                <button
                  type="button"
                  onClick={() => toggleSelectSegment(seg.id)}
                  className={`mt-4 ml-2 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 hover:border-blue-400'
                  }`}
                  aria-label={isSelected ? 'Deselect segment' : 'Select segment'}
                >
                  {isSelected && (
                    <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )}
              <button
                onClick={() => { if (!batchMode) selectSegment(seg); else toggleSelectSegment(seg.id); }}
                className={`flex-1 text-left p-4 rounded-xl border transition-all ${
                  batchMode && isSelected
                    ? 'border-blue-400 bg-blue-50'
                    : activeSegment === seg.id
                    ? 'border-blue-400 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">{seg.source_text}</p>
                  {seg.target_text && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{seg.target_text}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {act && (act.pending_suggestions > 0 || act.unresolved_comments > 0 || act.recent_transitions_24h > 0) && (
                    <span
                      data-testid="segment-activity-badges"
                      className="flex items-center gap-1"
                    >
                      {act.pending_suggestions > 0 && (
                        <span
                          data-testid="segment-activity-suggestions"
                          data-count={act.pending_suggestions}
                          title={`${act.pending_suggestions} pending suggestion${act.pending_suggestions === 1 ? '' : 's'}`}
                          className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800"
                        >
                          {act.pending_suggestions}·✎
                        </span>
                      )}
                      {act.unresolved_comments > 0 && (
                        <span
                          data-testid="segment-activity-comments"
                          data-count={act.unresolved_comments}
                          title={`${act.unresolved_comments} unresolved comment${act.unresolved_comments === 1 ? '' : 's'}`}
                          className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800"
                        >
                          {act.unresolved_comments}·💬
                        </span>
                      )}
                      {act.recent_transitions_24h > 0 && (
                        <span
                          data-testid="segment-activity-transitions"
                          data-count={act.recent_transitions_24h}
                          title={`${act.recent_transitions_24h} transition${act.recent_transitions_24h === 1 ? '' : 's'} in the last 24h`}
                          className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-800"
                        >
                          {act.recent_transitions_24h}·⇺
                        </span>
                      )}
                    </span>
                  )}
                  <PhaseBadge status={seg.status as SegmentStatus} size="sm" />
                </div>
              </div>
            </button>
            </div>
            );
          })}

          {/* Batch advance toolbar — floats at bottom when selections exist */}
          {batchMode && selectedIds.size > 0 && (
            <div className="sticky bottom-4 bg-white rounded-xl border border-blue-300 shadow-lg p-3 flex items-center gap-3 flex-wrap mt-2">
              <span className="text-sm font-medium text-gray-700">{selectedIds.size} segment{selectedIds.size === 1 ? '' : 's'} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                {(['translated', 'edited', 'proofread', 'qa_approved'] as SegmentStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={batchAdvancing}
                    onClick={() => handleBatchAdvance(status)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 bg-gray-900 text-white hover:bg-gray-700"
                  >
                    → {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
              {batchAdvancing && <span className="text-xs text-gray-500 w-full text-center">Advancing…</span>}
            </div>
          )}
        </div>

        {/* Editor panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          {activeSegment ? (() => {
            const seg = segments.find(s => s.id === activeSegment);
            return seg ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Source</label>
                  <p className="text-gray-900 text-sm leading-relaxed bg-gray-50 rounded-lg p-3">{seg.source_text}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Translation</label>
                  <textarea
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Enter translation…"
                  />
                </div>
                {/* MAC-RAG candidates */}
                {macRag.candidates.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Suggestions</p>
                    {macRag.candidates.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => setEditingText(c.text)}
                        className={`w-full text-left text-xs p-3 rounded-lg border transition-all ${
                          i === macRag.recommendedIndex
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-medium capitalize text-gray-600">{c.approach}</span>
                        <span className="ml-2 text-gray-400">{Math.round(c.confidence * 100)}%</span>
                        <p className="mt-1 text-gray-700">{c.text}</p>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleAITranslate(seg)}
                    disabled={macRag.isLoading}
                    className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {macRag.isLoading ? 'Translating…' : '✨ AI Translate'}
                  </button>
                  <button
                    onClick={() => saveSegment(seg.id, editingText, 'translated')}
                    disabled={saving || !editingText.trim()}
                    className="text-xs px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => saveSegment(seg.id, editingText, 'qa_approved')}
                    disabled={saving || !editingText.trim()}
                    className="text-xs px-4 py-2 border border-green-400 text-green-700 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setDetailsOpen(o => !o)}
                    className="text-xs px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors ml-auto"
                    data-testid="segment-details-toggle"
                    data-open={detailsOpen}
                  >
                    {detailsOpen ? 'Hide details ▴' : 'Details ▾'}
                  </button>
                </div>
                {/* Cooperation drawer — tabbed: History / Suggestions / Context Builder / Comments */}
                {detailsOpen && (
                  <div
                    data-testid="segment-details-drawer"
                    className="border-t border-gray-200 pt-4 mt-2"
                  >
                    {/* Always-visible: phase badge + advance button */}
                    <div className="flex items-center gap-2 mb-3">
                      <PhaseBadge status={seg.status as SegmentStatus} />
                      <PhaseAdvanceButton
                        segmentId={seg.id}
                        currentStatus={seg.status as SegmentStatus}
                        onAdvanced={(next) => {
                          setSegments(prev =>
                            prev.map(s => s.id === seg.id ? { ...s, status: next } : s)
                          );
                          void refreshActivity();
                        }}
                        onStaleStatus={(actual) => {
                          setSegments(prev =>
                            prev.map(s => s.id === seg.id ? { ...s, status: actual } : s)
                          );
                          void refreshActivity();
                        }}
                      />
                    </div>

                    {/* Tab strip */}
                    <div className="flex border-b border-gray-200 mb-4 gap-0" role="tablist">
                      {(
                        [
                          { key: 'history',     label: 'History' },
                          { key: 'suggestions', label: 'Suggestions' },
                          { key: 'context',     label: 'Context Builder' },
                          { key: 'comments',    label: 'Comments' },
                        ] as const
                      ).map(({ key, label }) => (
                        <button
                          key={key}
                          role="tab"
                          aria-selected={drawerTab === key}
                          onClick={() => setDrawerTab(key)}
                          className={`text-xs px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
                            drawerTab === key
                              ? 'border-indigo-500 text-indigo-700 font-semibold'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Tab panels */}
                    {drawerTab === 'history' && (
                      <div role="tabpanel">
                        <PhaseTransitionHistory segmentId={seg.id} />
                      </div>
                    )}

                    {drawerTab === 'suggestions' && (
                      <div role="tabpanel" className="space-y-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Suggestions</p>
                          <SuggestionPanel
                            key={`suggestions-${seg.id}-${suggestionRefreshKey}`}
                            segmentId={seg.id}
                            segmentPhase={seg.status}
                            articleId={params.id}
                            segmentCurrentText={seg.target_text ?? ''}
                            onAccepted={(text) => {
                              setEditingText(text);
                              void saveSegment(seg.id, text, seg.status as SegmentStatus === 'draft' ? 'translated' : seg.status as SegmentStatus);
                              void refreshActivity();
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">QA Issues</p>
                          <QAIssuesList segmentId={seg.id} articleId={params.id} />
                        </div>
                      </div>
                    )}

                    {drawerTab === 'context' && (
                      <div role="tabpanel" className="space-y-4">
                        {agentPhaseFor(seg.status as SegmentStatus) ? (
                          <>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">MAC-RAG Context Builder</p>
                              <ContextBuilderPanel
                                segmentId={seg.id}
                                phase={agentPhaseFor(seg.status as SegmentStatus)! as ContextBuilderPhase}
                                targetLang={targetLang}
                                onSuggestionCreated={() => {
                                  setSuggestionRefreshKey(k => k + 1);
                                  void refreshActivity();
                                }}
                              />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Agent</p>
                              <AgentSuggestionPanel
                                segmentId={seg.id}
                                phase={agentPhaseFor(seg.status as SegmentStatus)!}
                                onCreated={() => {
                                  setSuggestionRefreshKey(k => k + 1);
                                  void refreshActivity();
                                }}
                              />
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Context Builder is not available for QA-approved segments.</p>
                        )}
                      </div>
                    )}

                    {drawerTab === 'comments' && (
                      <div role="tabpanel">
                        <CommentThread segmentId={seg.id} />
                      </div>
                    )}
                  </div>
                )}
              </div>
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
