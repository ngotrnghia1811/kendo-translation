'use client'

import { useState } from 'react'
import type { Segment, UserPresence } from '@/types/database'
import SegmentEditor from './SegmentEditor'
import SegmentToolbar from './SegmentToolbar'
import { SegmentPresenceTag } from './PresenceIndicator'
import { ContextBuilderPanel, type ContextBuilderPhase } from './ContextBuilderPanel'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map segment status → MAC-RAG phase for ContextBuilderPanel. */
function toContextPhase(status: string): ContextBuilderPhase {
    switch (status) {
        case 'edited':    return 'edit'
        case 'proofread': return 'proofread'
        case 'qa_approved': return 'qa'
        default:          return 'translate'
    }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SegmentRowProps {
    segment: Segment
    isActive: boolean
    editingText: string
    saving: boolean
    presences: UserPresence[]
    currentUserId: string | null
    onActivate: (segment: Segment) => void
    onEditingTextChange: (text: string) => void
    onSave: () => void
    onCancel: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SegmentRow({
    segment,
    isActive,
    editingText,
    saving,
    presences,
    currentUserId,
    onActivate,
    onEditingTextChange,
    onSave,
    onCancel,
}: SegmentRowProps) {
    const isLockedByOther = segment.locked_by && segment.locked_by !== currentUserId
    const otherUsersOnSegment = presences.filter(
        p => p.active_segment === segment.id && p.user_id !== currentUserId
    )
    const presenceColor = otherUsersOnSegment.length > 0 ? otherUsersOnSegment[0].color : null

    // Context Builder panel (MAC-RAG) open state — toggled per-row
    const [contextBuilderOpen, setContextBuilderOpen] = useState(false)

    const statusBadge = () => {
        switch (segment.status) {
            case 'qa_approved':
                return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">QA Approved</span>
            case 'proofread':
                return <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">Proofread</span>
            case 'edited':
                return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Edited</span>
            case 'translated':
                return <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Translated</span>
            default:
                return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Draft</span>
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault()
            onSave()
        }
        if (e.key === 'Escape') {
            onCancel()
        }
    }

    return (
        <div
            className={`
                grid grid-cols-[40px_1fr_1fr] gap-0 border-b border-gray-200 dark:border-gray-700
                ${isActive ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                ${presenceColor ? `border-l-4` : 'border-l-4 border-l-transparent'}
            `}
            style={presenceColor ? { borderLeftColor: presenceColor } : undefined}
        >
            {/* Row number */}
            <div className="flex flex-col items-center justify-start pt-3 text-xs text-gray-400 border-r border-gray-200 dark:border-gray-700">
                <span>{segment.position + 1}</span>
            </div>

            {/* Source text (read-only) */}
            <div className="p-3 border-r border-gray-200 dark:border-gray-700">
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {segment.source_text}
                </div>
            </div>

            {/* Target text (editable) + Context Builder panel */}
            <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        {statusBadge()}
                        <SegmentPresenceTag presences={presences} segmentId={segment.id} />
                    </div>
                    {isLockedByOther && (
                        <span className="text-xs text-orange-500">Locked by another user</span>
                    )}
                </div>

                {isActive ? (
                    <div>
                        <SegmentEditor
                            value={editingText}
                            onChange={onEditingTextChange}
                            onKeyDown={handleKeyDown}
                            disabled={saving}
                            autoFocus
                        />
                        <SegmentToolbar
                            segmentId={segment.id}
                            onSave={onSave}
                            onCancel={onCancel}
                            saving={saving}
                            hasChanges={editingText !== (segment.target_text || '')}
                            onMacRag={() => setContextBuilderOpen(o => !o)}
                        />

                        {/* ── Context Builder (MAC-RAG) panel — inline, below toolbar ── */}
                        {contextBuilderOpen && (
                            <div
                                className="mt-3 border border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/30 dark:bg-indigo-900/10 p-4"
                                data-testid="context-builder-panel-wrapper"
                            >
                                {/* Panel header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                                            MAC-RAG Context Builder
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-medium">
                                            {toContextPhase(segment.status)} mode
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setContextBuilderOpen(false)}
                                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        aria-label="Close context builder"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <ContextBuilderPanel
                                    segmentId={segment.id}
                                    phase={toContextPhase(segment.status)}
                                    onSuggestionCreated={() => {
                                        // Optionally close panel after suggestion created
                                        setContextBuilderOpen(false)
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        onClick={() => !isLockedByOther && onActivate(segment)}
                        className={`
                            text-sm leading-relaxed whitespace-pre-wrap min-h-[2rem] rounded p-2 cursor-pointer
                            transition-colors duration-150
                            ${segment.target_text
                                ? 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                                : 'text-gray-400 italic hover:bg-gray-100 dark:hover:bg-gray-800'
                            }
                            ${isLockedByOther ? 'cursor-not-allowed opacity-60' : ''}
                        `}
                    >
                        {segment.target_text || 'Click to translate...'}
                    </div>
                )}
            </div>
        </div>
    )
}
