/**
 * CommentThread — recursive renderer of the per-segment comment tree.
 *
 * Loads flat rows via useCommentsThread, assembles a nested tree from
 * `parent_comment_id`, and renders each node with author + timestamp
 * + content + `resolved` badge. Each node carries a "Reply" toggle
 * that mounts a child CommentComposer inline.
 */

'use client'

import { useMemo, useState } from 'react'
import {
    useCommentsThread,
    type CommentRow,
} from '@/lib/hooks/useCommentsThread'
import { CommentComposer } from './CommentComposer'

interface CommentThreadProps {
    segmentId: string
}

interface TreeNode extends CommentRow {
    children: TreeNode[]
}

function buildTree(rows: CommentRow[]): TreeNode[] {
    const byId = new Map<string, TreeNode>()
    const roots: TreeNode[] = []
    for (const row of rows) {
        byId.set(row.id, { ...row, children: [] })
    }
    for (const row of rows) {
        const node = byId.get(row.id)!
        if (row.parent_comment_id && byId.has(row.parent_comment_id)) {
            byId.get(row.parent_comment_id)!.children.push(node)
        } else {
            roots.push(node)
        }
    }
    // Children are already chronological because input is ordered asc.
    return roots
}

function authorName(node: TreeNode): string {
    const a = Array.isArray(node.author) ? node.author[0] : node.author
    return a?.username ?? 'unknown'
}

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString()
    } catch {
        return iso
    }
}

function CommentNode({
    node,
    segmentId,
    onReplied,
    depth,
}: {
    node: TreeNode
    segmentId: string
    onReplied: () => void
    depth: number
}) {
    const [replying, setReplying] = useState(false)
    return (
        <li
            data-testid="comment-node"
            data-comment-id={node.id}
            className="space-y-2"
        >
            <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                        {authorName(node)}
                    </span>
                    <span>· {formatTime(node.created_at)}</span>
                    {node.resolved && (
                        <span
                            data-testid="comment-resolved"
                            className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                        >
                            resolved
                        </span>
                    )}
                </div>
                <div className="mt-1 whitespace-pre-wrap text-slate-800">
                    {node.content}
                </div>
                <div className="mt-1">
                    <button
                        type="button"
                        onClick={() => setReplying((v) => !v)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                        data-testid="comment-reply-toggle"
                    >
                        {replying ? 'Cancel' : 'Reply'}
                    </button>
                </div>
                {replying && (
                    <div className="mt-2">
                        <CommentComposer
                            segmentId={segmentId}
                            parentCommentId={node.id}
                            onPosted={() => {
                                setReplying(false)
                                onReplied()
                            }}
                            placeholder={`Reply to ${authorName(node)}…`}
                        />
                    </div>
                )}
            </div>
            {node.children.length > 0 && (
                <ul
                    className="space-y-2 border-l border-slate-200 pl-3"
                    style={{ marginLeft: depth === 0 ? 0 : 0 }}
                >
                    {node.children.map((child) => (
                        <CommentNode
                            key={child.id}
                            node={child}
                            segmentId={segmentId}
                            onReplied={onReplied}
                            depth={depth + 1}
                        />
                    ))}
                </ul>
            )}
        </li>
    )
}

export function CommentThread({ segmentId }: CommentThreadProps) {
    const { comments, loading, error, refresh } = useCommentsThread(segmentId)
    const tree = useMemo(() => buildTree(comments), [comments])

    if (error) {
        return (
            <div
                data-testid="comment-thread-error"
                className="text-sm text-red-600"
            >
                Failed to load comments: {error}
            </div>
        )
    }
    if (loading && comments.length === 0) {
        return (
            <div
                data-testid="comment-thread-loading"
                className="text-sm text-slate-500"
            >
                Loading comments…
            </div>
        )
    }

    return (
        <div data-testid="comment-thread" className="space-y-3">
            {tree.length === 0 ? (
                <div
                    data-testid="comment-thread-empty"
                    className="text-sm text-slate-500"
                >
                    No comments yet.
                </div>
            ) : (
                <ul className="space-y-2">
                    {tree.map((node) => (
                        <CommentNode
                            key={node.id}
                            node={node}
                            segmentId={segmentId}
                            onReplied={refresh}
                            depth={0}
                        />
                    ))}
                </ul>
            )}
            <div>
                <CommentComposer
                    segmentId={segmentId}
                    onPosted={refresh}
                    placeholder="Start a new comment…"
                />
            </div>
        </div>
    )
}

export default CommentThread
