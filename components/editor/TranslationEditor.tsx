'use client'

import { useEffect, useState } from 'react'
import type { Segment, UserPresence } from '@/types/database'
import { useDocument } from '@/hooks/useDocument'
import { useSegmentEditor } from '@/hooks/useSegmentEditor'
import { usePresence } from '@/hooks/usePresence'
import SegmentRow from './SegmentRow'
import ProgressBar from './ProgressBar'
import PresenceIndicator from './PresenceIndicator'

interface TranslationEditorProps {
    articleId: string
    userId: string
    username: string
    userRole: 'admin' | 'translator' | 'reader'
}

export default function TranslationEditor({
    articleId,
    userId,
    username,
    userRole,
}: TranslationEditorProps) {
    const { document: doc, segments, settings, loading, error, updateSegmentLocally } = useDocument(articleId)
    const { presences, trackSegment } = usePresence(articleId, userId, username)

    const segmentEditor = useSegmentEditor({
        onSave: (savedSegment) => {
            updateSegmentLocally(savedSegment.id, savedSegment)
            trackSegment(null)
        },
        onLockAcquired: (segmentId) => {
            trackSegment(segmentId)
        },
        onLockReleased: () => {
            trackSegment(null)
        },
    })

    // Keyboard navigation: Tab/Shift+Tab to move between segments
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab' && segmentEditor.activeSegmentId) {
                e.preventDefault()
                const currentIdx = segments.findIndex(s => s.id === segmentEditor.activeSegmentId)
                if (currentIdx === -1) return

                const nextIdx = e.shiftKey
                    ? Math.max(0, currentIdx - 1)
                    : Math.min(segments.length - 1, currentIdx + 1)

                if (nextIdx !== currentIdx) {
                    // Save current segment first if there are changes
                    if (segmentEditor.editingText !== (segments[currentIdx]?.target_text || '')) {
                        segmentEditor.save()
                    } else {
                        segmentEditor.releaseLock()
                    }
                    // Activate next segment after a small delay
                    setTimeout(() => {
                        segmentEditor.acquireLock(segments[nextIdx])
                    }, 100)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [segmentEditor, segments])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-[var(--color-text-muted)] animate-pulse">Loading document...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-red-500">Error: {error}</div>
            </div>
        )
    }

    if (!doc) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-[var(--color-text-muted)]">Document not found</div>
            </div>
        )
    }

    const translated = segments.filter(s => s.status !== 'draft').length

    return (
        <div className="max-w-7xl mx-auto">
            {/* Toolbar */}
            <div className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-semibold text-[var(--color-text)] truncate max-w-md">
                            {doc.title}
                        </h1>
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                            Translator
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <PresenceIndicator presences={presences} />
                        {segmentEditor.saving && (
                            <span className="text-xs text-blue-500 animate-pulse">Saving...</span>
                        )}
                        {segmentEditor.error && (
                            <span className="text-xs text-red-500">{segmentEditor.error}</span>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2">
                    <ProgressBar
                        total={segments.length}
                        translated={translated}
                        reviewed={settings?.reviewed_count || 0}
                        approved={settings?.approved_count || 0}
                    />
                </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[40px_1fr_1fr] gap-0 border-b border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                <div className="p-2 text-center border-r border-[var(--color-border)]">#</div>
                <div className="p-2 border-r border-[var(--color-border)]">
                    Source ({settings?.source_lang || 'ja'})
                </div>
                <div className="p-2">
                    Target ({settings?.target_lang || 'en'})
                </div>
            </div>

            {/* Segment rows */}
            <div className="divide-y divide-[var(--color-border)]">
                {segments.length === 0 ? (
                    <div className="text-center py-12 text-[var(--color-text-muted)]">
                        No segments yet. This document needs to be segmentized first.
                    </div>
                ) : (
                    segments.map((segment) => (
                        <SegmentRow
                            key={segment.id}
                            segment={segment}
                            isActive={segmentEditor.activeSegmentId === segment.id}
                            editingText={segmentEditor.activeSegmentId === segment.id ? segmentEditor.editingText : ''}
                            saving={segmentEditor.saving && segmentEditor.activeSegmentId === segment.id}
                            presences={presences}
                            currentUserId={userId}
                            onActivate={(seg) => segmentEditor.acquireLock(seg)}
                            onEditingTextChange={segmentEditor.setEditingText}
                            onSave={segmentEditor.save}
                            onCancel={segmentEditor.releaseLock}
                        />
                    ))
                )}
            </div>

            {/* Status bar */}
            <div className="sticky bottom-0 bg-[var(--color-bg)] border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)] flex items-center justify-between">
                <div className="flex gap-4">
                    <span>Segments: {segments.length}</span>
                    <span>Translated: {translated}/{segments.length}</span>
                    {segmentEditor.activeSegmentId && (
                        <span>
                            Editing: Segment {(segments.findIndex(s => s.id === segmentEditor.activeSegmentId) + 1)}
                        </span>
                    )}
                </div>
                <div className="flex gap-4">
                    <span>Tab: next segment</span>
                    <span>Shift+Tab: previous</span>
                    <span>Cmd+S: save</span>
                    <span>Esc: cancel</span>
                </div>
            </div>
        </div>
    )
}
