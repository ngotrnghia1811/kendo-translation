'use client'

/**
 * Admin per-document assignments page.
 *
 * Thin shell that hosts the already-tested AssignmentTable for a
 * single document. The actual write protection is server-side
 * (`/api/documents/[id]/assignments` enforces `profiles.role==='admin'`
 * + RLS). The client-side admin check here is purely cosmetic — a
 * non-admin landing on this URL will see the 403 placeholder, and
 * any write attempt would be rejected by the API regardless.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AssignmentTable from '@/components/admin/AssignmentTable'

interface DocSummary {
    id: string
    title: string
}

interface WhoAmI {
    role: string
    username: string | null
}

export default function AdminAssignmentsPage() {
    const params = useParams<{ id: string }>()
    const documentId = params.id

    const [doc, setDoc] = useState<DocSummary | null>(null)
    const [me, setMe] = useState<WhoAmI | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                // Load self via /api/admin/users — non-admins receive 403,
                // which we use as the gate signal.
                const usersRes = await fetch('/api/admin/users')
                if (usersRes.status === 403) {
                    setMe({ role: 'non-admin', username: null })
                } else if (usersRes.ok) {
                    setMe({ role: 'admin', username: null })
                } else {
                    setError(`Auth check failed: HTTP ${usersRes.status}`)
                }

                // Document title.
                const docRes = await fetch('/api/documents')
                if (docRes.ok) {
                    const data = (await docRes.json()) as {
                        documents?: DocSummary[]
                    }
                    const found = (data.documents ?? []).find(
                        d => d.id === documentId
                    )
                    if (found) setDoc(found)
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
            } finally {
                setLoading(false)
            }
        }
        void load()
    }, [documentId])

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 text-gray-500">
                Loading…
            </div>
        )
    }

    if (me?.role !== 'admin') {
        return (
            <div
                className="container mx-auto px-4 py-8"
                data-testid="admin-assignments-forbidden"
            >
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Forbidden
                </h1>
                <p className="text-sm text-gray-500">
                    You must be an admin to manage document assignments.
                </p>
                <Link
                    href="/admin"
                    className="inline-block mt-4 text-sm text-blue-600 hover:underline"
                >
                    ← Back to admin
                </Link>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6 flex items-center gap-2 text-sm">
                <Link
                    href="/admin"
                    className="text-gray-500 hover:text-gray-700"
                >
                    ← Admin
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-gray-900 dark:text-white font-medium">
                    Assignments
                </span>
                <span className="text-gray-300">/</span>
                <span
                    className="text-gray-600 truncate"
                    data-testid="admin-assignments-doc-title"
                >
                    {doc?.title ?? documentId}
                </span>
            </div>

            {error && (
                <div className="mb-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded px-3 py-2">
                    {error}
                </div>
            )}

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Manage assignments
            </h1>
            <p className="text-sm text-gray-500 mb-6">
                Grant per-document phase capabilities (translate, edit,
                proofread, qa) to specific users.
            </p>

            <AssignmentTable documentId={documentId} />
        </div>
    )
}
