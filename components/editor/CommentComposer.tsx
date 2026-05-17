/**
 * CommentComposer — controlled textarea + submit for posting a new
 * comment or reply to a segment. Parses bare `@<uuid>` tokens out of
 * the body as a stop-gap mention mechanism; a richer @mention picker
 * (resolving usernames → profile IDs) will replace this in a later
 * unit when we wire profile search.
 *
 * Submission goes through useCommentsThread.post(); on success the
 * textarea is cleared and `onPosted` is invoked.
 */

'use client'

import { useState, type FormEvent } from 'react'
import { useCommentsThread } from '@/lib/hooks/useCommentsThread'

const UUID_RE =
    /@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi

function extractMentions(text: string): string[] {
    const set = new Set<string>()
    for (const m of text.matchAll(UUID_RE)) {
        set.add(m[1].toLowerCase())
    }
    return [...set]
}

interface CommentComposerProps {
    segmentId: string
    parentCommentId?: string | null
    onPosted?: () => void
    placeholder?: string
}

export function CommentComposer({
    segmentId,
    parentCommentId = null,
    onPosted,
    placeholder = 'Add a comment…',
}: CommentComposerProps) {
    const { post } = useCommentsThread(segmentId)
    const [content, setContent] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault()
        const trimmed = content.trim()
        if (!trimmed || busy) return
        setBusy(true)
        setError(null)
        try {
            await post(trimmed, {
                parentCommentId: parentCommentId ?? undefined,
                mentions: extractMentions(trimmed),
            })
            setContent('')
            onPosted?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <form
            onSubmit={onSubmit}
            data-testid="comment-composer"
            className="space-y-2"
        >
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                disabled={busy}
                rows={parentCommentId ? 2 : 3}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none disabled:opacity-60"
                data-testid="comment-composer-textarea"
            />
            <div className="flex items-center justify-between">
                {error ? (
                    <span
                        data-testid="comment-composer-error"
                        className="text-xs text-red-600"
                    >
                        {error}
                    </span>
                ) : (
                    <span className="text-xs text-slate-400">
                        @&lt;uuid&gt; to mention
                    </span>
                )}
                <button
                    type="submit"
                    disabled={!content.trim() || busy}
                    className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                    data-testid="comment-composer-submit"
                >
                    {busy ? 'Posting…' : parentCommentId ? 'Reply' : 'Post'}
                </button>
            </div>
        </form>
    )
}

export default CommentComposer
