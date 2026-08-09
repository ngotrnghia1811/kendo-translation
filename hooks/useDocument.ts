'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/pocketbase/client'
import type { Segment, DocumentSettings, Article } from '@/types/database'

interface UseDocumentState {
    document: Article | null
    segments: Segment[]
    settings: DocumentSettings | null
    loading: boolean
    error: string | null
}

export function useDocument(articleId: string) {
    const [state, setState] = useState<UseDocumentState>({
        document: null,
        segments: [],
        settings: null,
        loading: true,
        error: null,
    })

    const pb = createClient()

    // Fetch document, segments, and settings
    const fetchDocument = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }))

        try {
            // Fetch document
            const docData = await pb.collection('articles').getOne<Article>(articleId)

            // Fetch segments — PocketBase getFullList handles pagination automatically
            const segmentsData = await pb.collection('segments').getFullList<Segment>({
                filter: `article_id = "${articleId}"`,
                sort: '+position',
            })

            // Fetch settings
            let settingsData: DocumentSettings | null = null
            try {
                const settingsList = await pb.collection('document_settings').getFullList<DocumentSettings>({
                    filter: `article_id = "${articleId}"`,
                })
                settingsData = settingsList.length > 0 ? settingsList[0] : null
            } catch {
                // settings not found — not an error
            }

            setState({
                document: docData,
                segments: segmentsData || [],
                settings: settingsData,
                loading: false,
                error: null,
            })
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to load document',
            }))
        }
    }, [articleId, pb])

    // Subscribe to real-time segment changes
    useEffect(() => {
        fetchDocument()

        let unsub = false
        pb.collection('segments').subscribe('*', (data) => {
            if (unsub) return
            setState(prev => {
                const segments = [...prev.segments]
                const payload = data.record as unknown as Segment

                if (data.action === 'create') {
                    const idx = segments.findIndex(s => s.position > payload.position)
                    if (idx === -1) {
                        segments.push(payload)
                    } else {
                        segments.splice(idx, 0, payload)
                    }
                } else if (data.action === 'update') {
                    const idx = segments.findIndex(s => s.id === payload.id)
                    if (idx !== -1) {
                        segments[idx] = payload
                    }
                } else if (data.action === 'delete') {
                    const idx = segments.findIndex(s => s.id === payload.id)
                    if (idx !== -1) {
                        segments.splice(idx, 1)
                    }
                }

                return { ...prev, segments }
            })
        }, { filter: `article_id = "${articleId}"` })

        return () => {
            unsub = true
            void pb.collection('segments').unsubscribe()
        }
    }, [articleId, fetchDocument, pb])

    // Update a segment locally (optimistic update)
    const updateSegmentLocally = useCallback((segmentId: string, updates: Partial<Segment>) => {
        setState(prev => ({
            ...prev,
            segments: prev.segments.map(s =>
                s.id === segmentId ? { ...s, ...updates } : s
            ),
        }))
    }, [])

    return {
        ...state,
        refetch: fetchDocument,
        updateSegmentLocally,
    }
}
