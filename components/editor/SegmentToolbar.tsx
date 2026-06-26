'use client'

interface SegmentToolbarProps {
    segmentId: string
    onSave: () => void
    onCancel: () => void
    onMacRag?: () => void
    onSuggest?: () => void
    saving: boolean
    hasChanges: boolean
}

export default function SegmentToolbar({
    segmentId,
    onSave,
    onCancel,
    onMacRag,
    onSuggest,
    saving,
    hasChanges,
}: SegmentToolbarProps) {
    return (
        <div className="flex items-center gap-2 mt-1">
            <button
                onClick={onSave}
                disabled={saving || !hasChanges}
                className="px-2 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-[var(--color-text-muted)] disabled:cursor-not-allowed transition-colors"
            >
                {saving ? 'Saving...' : 'Save'}
            </button>
            <button
                onClick={onCancel}
                disabled={saving}
                className="px-2 py-1 text-xs font-medium rounded bg-[var(--color-border)] text-[var(--color-text)] hover:opacity-70 transition-colors"
            >
                Cancel
            </button>
            {onSuggest && (
                <button
                    onClick={onSuggest}
                    disabled={saving}
                    className="px-2 py-1 text-xs font-medium rounded border border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                >
                    AI Suggest
                </button>
            )}
            {onMacRag && (
                <button
                    onClick={onMacRag}
                    disabled={saving}
                    className="px-2 py-1 text-xs font-medium rounded border border-purple-400 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                >
                    MAC-RAG
                </button>
            )}
            <span className="text-xs text-[var(--color-text-muted)] ml-auto">Cmd+S to save, Esc to cancel</span>
        </div>
    )
}
