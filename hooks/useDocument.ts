'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
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

    const supabase = createClient()

    // Fetch document, segments, and settings
    const fetchDocument = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }))

        try {
            // Fetch document
            const { data: docData, error: docError } = await supabase
                .from('articles')
                .select('*')
                .eq('id', articleId)
                .single()

            if (docError) throw new Error(docError.message)

            // Fetch segments
            const { data: segmentsData, error: segError } = await supabase
                .from('segments')
                .select('*')
                .eq('article_id', articleId)
                .order('position', { ascending: true })

            if (segError) throw new Error(segError.message)

            // Fetch settings
            const { data: settingsData } = await supabase
                .from('document_settings')
                .select('*')
                .eq('article_id', articleId)
                .single()

            setState({
                document: docData,
                segments: segmentsData || [],
                settings: settingsData || null,
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
    }, [articleId, supabase])

    // Subscribe to real-time segment changes
    useEffect(() => {
        fetchDocument()

        const channel = supabase
            .channel(`doc:${articleId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'segments',
                    filter: `article_id=eq.${articleId}`,
                },
                (payload) => {
                    setState(prev => {
                        const segments = [...prev.segments]

                        if (payload.eventType === 'INSERT') {
                            const newSegment = payload.new as Segment
                            const idx = segments.findIndex(s => s.position > newSegment.position)
                            if (idx === -1) {
                                segments.push(newSegment)
                            } else {
                                segments.splice(idx, 0, newSegment)
                            }
                        } else if (payload.eventType === 'UPDATE') {
                            const updated = payload.new as Segment
                            const idx = segments.findIndex(s => s.id === updated.id)
                            if (idx !== -1) {
                                segments[idx] = updated
                            }
                        } else if (payload.eventType === 'DELETE') {
                            const deleted = payload.old as { id: string }
                            const idx = segments.findIndex(s => s.id === deleted.id)
                            if (idx !== -1) {
                                segments.splice(idx, 1)
                            }
                        }

                        return { ...prev, segments }
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [articleId, fetchDocument, supabase])

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
