/**
 * useCommentsThread — React hook wrapping the segment comments API.
 *
 * Responsibilities:
 *  - GET /api/segments/[id]/comments on mount and on `segmentId` change.
 *  - Expose `post(content, opts?)` to create a comment or reply via
 *    POST; on success, optimistically append the row and trigger a
 *    background refresh so any RLS-side server-only fields (e.g. the
 *    embedded `author` profile join) populate correctly.
 *  - Surface `loading` / `error` / `refresh` for callers.
 *  - Subscribe to `segment_comments` postgres_changes filtered on
 *    `segment_id=eq.<segmentId>` and re-fetch on any INSERT/UPDATE/
 *    DELETE so collaborators see new replies in near-real-time.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/pocketbase/client'

export interface CommentAuthor {
    username: string | null
}

export interface CommentRow {
    id: string
    segment_id: string
    user_id: string
    content: string
    resolved: boolean
    parent_comment_id: string | null
    mentions: string[]
    created_at: string | null
    // Joined via profiles!user_id; may be object, array, or null
    // depending on PostgREST cardinality inference.
    author?: CommentAuthor | CommentAuthor[] | null
    /** Normalized display username (added by the API from the expanded
     *  `user` relation). Present when the relation resolved to a user. */
    author_name?: string | null
}

export interface PostCommentOptions {
    parentCommentId?: string | null
    mentions?: string[]
}

export interface UseCommentsThreadResult {
    comments: CommentRow[]
    loading: boolean
    error: string | null
    post: (content: string, opts?: PostCommentOptions) => Promise<CommentRow>
    refresh: () => Promise<void>
}

export function useCommentsThread(segmentId: string): UseCommentsThreadResult {
    const [comments, setComments] = useState<CommentRow[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const aliveRef = useRef(true)

    const refresh = useCallback(async () => {
        setError(null)
        try {
            const res = await fetch(`/api/segments/${segmentId}/comments`)
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`HTTP ${res.status}: ${txt}`)
            }
            const data = (await res.json()) as { comments: CommentRow[] }
            if (aliveRef.current) {
                setComments(data.comments ?? [])
            }
        } catch (e) {
            if (aliveRef.current) {
                setError(e instanceof Error ? e.message : String(e))
            }
        } finally {
            if (aliveRef.current) setLoading(false)
        }
    }, [segmentId])

    useEffect(() => {
        aliveRef.current = true
        setLoading(true)
        void refresh()
        return () => {
            aliveRef.current = false
        }
    }, [refresh])

    // Realtime fanout for the comment thread.
    const pb = useMemo(() => createClient(), [])
    useEffect(() => {
        let unsub = false
        pb.collection('segment_comments').subscribe('*', () => {
            if (!unsub) void refresh()
        }, { filter: `segment_id = "${segmentId}"` })
        return () => {
            unsub = true
            void pb.collection('segment_comments').unsubscribe()
        }
    }, [pb, segmentId, refresh])

    const post = useCallback<UseCommentsThreadResult['post']>(
        async (content, opts) => {
            const body: Record<string, unknown> = { content }
            if (opts?.parentCommentId)
                body.parent_comment_id = opts.parentCommentId
            if (opts?.mentions && opts.mentions.length > 0)
                body.mentions = opts.mentions

            const res = await fetch(`/api/segments/${segmentId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`HTTP ${res.status}: ${txt}`)
            }
            const created = (await res.json()) as CommentRow

            // Optimistic append; background refresh fills joined author.
            if (aliveRef.current) {
                setComments((prev) => [...prev, created])
            }
            void refresh()
            return created
        },
        [segmentId, refresh]
    )

    return { comments, loading, error, post, refresh }
}

export default useCommentsThread
