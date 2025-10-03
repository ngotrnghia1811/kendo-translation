'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function DocumentRouterPage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkRole = async () => {
            try {
                const res = await fetch('/api/auth/me')
                if (!res.ok) {
                    router.push(`/documents/${id}/read`)
                    return
                }

                const data = await res.json()
                const role = data.profile?.role

                if (role === 'translator' || role === 'admin') {
                    router.push(`/documents/${id}/edit`)
                } else {
                    router.push(`/documents/${id}/read`)
                }
            } catch {
                router.push(`/documents/${id}/read`)
            } finally {
                setLoading(false)
            }
        }
        checkRole()
    }, [id, router])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-gray-500 animate-pulse">Redirecting...</div>
            </div>
        )
    }

    return null
}
