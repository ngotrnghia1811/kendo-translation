'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMacRag } from '@/lib/hooks/useMacRag';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Segment } from '@/types/database';

type SegmentStatus = 'draft' | 'translated' | 'edited' | 'proofread' | 'qa_approved';

const STATUS_COLORS: Record<SegmentStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  translated: 'bg-blue-100 text-blue-700',
  edited: 'bg-yellow-100 text-yellow-700',
  proofread: 'bg-purple-100 text-purple-700',
  qa_approved: 'bg-green-100 text-green-700',
};

export default function EditPage() {
  const params = useParams<{ id: string }>();
  const supabase = createClient();
  const macRag = useMacRag();

  const [article, setArticle] = useState<{ id: string; title: string } | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: art }, { data: segs }] = await Promise.all([
      supabase.from('articles').select('id,title').eq('id', params.id).single(),
      supabase.from('segments').select('*').eq('article_id', params.id).order('position'),
    ]);
    if (art) setArticle(art as { id: string; title: string });
    if (segs) setSegments(segs as Segment[]);
    setLoading(false);
  }, [params.id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel(`segments:${params.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'segments',
        filter: `article_id=eq.${params.id}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setSegments(prev =>
            prev.map(s => s.id === (payload.new as Segment).id ? (payload.new as Segment) : s)
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id]);

  const selectSegment = async (seg: Segment) => {
    if (activeSegment && activeSegment !== seg.id) {
      await fetch(`/api/segments/${activeSegment}/lock`, { method: 'DELETE' });
    }

    setActiveSegment(seg.id);
    setEditingText(seg.target_text || '');

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
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Segments</h3>
          {segments.map(seg => (
            <button
              key={seg.id}
              onClick={() => selectSegment(seg)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                activeSegment === seg.id
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
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[seg.status as SegmentStatus] || STATUS_COLORS.draft}`}>
                  {seg.status}
                </span>
              </div>
            </button>
          ))}
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
                </div>
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
