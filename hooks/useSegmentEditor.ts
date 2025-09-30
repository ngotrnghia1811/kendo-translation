'use client'

import { useState, useCallback, useRef } from 'react'
import type { Segment } from '@/types/database'

interface UseSegmentEditorOptions {
    onSave?: (segment: Segment) => void
    onLockAcquired?: (segmentId: string) => void
    onLockReleased?: (segmentId: string) => void
}

interface UseSegmentEditorState {
    activeSegmentId: string | null
    editingText: string
    saving: boolean
    locking: boolean
    error: string | null
}

export function useSegmentEditor(options: UseSegmentEditorOptions = {}) {
    const [state, setState] = useState<UseSegmentEditorState>({
        activeSegmentId: null,
        editingText: '',
        saving: false,
        locking: false,
        error: null,
    })

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Acquire lock on a segment
    const acquireLock = useCallback(async (segment: Segment) => {
        if (state.activeSegmentId === segment.id) return true

        setState(prev => ({ ...prev, locking: true, error: null }))

        try {
            // Release previous lock
            if (state.activeSegmentId) {
                await fetch(`/api/segments/${state.activeSegmentId}/lock`, {
                    method: 'DELETE',
                })
                options.onLockReleased?.(state.activeSegmentId)
            }

            // Acquire new lock
            const res = await fetch(`/api/segments/${segment.id}/lock`, {
                method: 'POST',
            })

            if (!res.ok) {
                const data = await res.json()
                setState(prev => ({
                    ...prev,
                    locking: false,
                    error: data.error || 'Failed to acquire lock',
                }))
                return false
            }

            setState({
                activeSegmentId: segment.id,
                editingText: segment.target_text || '',
                saving: false,
                locking: false,
                error: null,
            })

            options.onLockAcquired?.(segment.id)
            return true
        } catch {
            setState(prev => ({
                ...prev,
                locking: false,
                error: 'Failed to acquire lock',
            }))
            return false
        }
    }, [state.activeSegmentId, options])

    // Update editing text (local state only)
    const setEditingText = useCallback((text: string) => {
        setState(prev => ({ ...prev, editingText: text }))
    }, [])

    // Save segment translation
    const save = useCallback(async () => {
        if (!state.activeSegmentId) return

        setState(prev => ({ ...prev, saving: true, error: null }))

        try {
            const res = await fetch(`/api/segments/${state.activeSegmentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_text: state.editingText,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to save')
            }

            const data = await res.json()
            options.onSave?.(data.segment)

            setState(prev => ({
                ...prev,
                saving: false,
                activeSegmentId: null,
                editingText: '',
            }))
        } catch (error) {
            setState(prev => ({
                ...prev,
                saving: false,
                error: error instanceof Error ? error.message : 'Failed to save',
            }))
        }
    }, [state.activeSegmentId, state.editingText, options])

    // Release lock without saving
    const releaseLock = useCallback(async () => {
        if (!state.activeSegmentId) return

        try {
            await fetch(`/api/segments/${state.activeSegmentId}/lock`, {
                method: 'DELETE',
            })
            options.onLockReleased?.(state.activeSegmentId)
        } catch {
            // Best effort
        }

        setState({
            activeSegmentId: null,
            editingText: '',
            saving: false,
            locking: false,
            error: null,
        })
    }, [state.activeSegmentId, options])

    // Auto-save with debounce (2s delay)
    const autoSave = useCallback((text: string) => {
        setState(prev => ({ ...prev, editingText: text }))

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        saveTimeoutRef.current = setTimeout(() => {
            save()
        }, 2000)
    }, [save])

    return {
        ...state,
        acquireLock,
        setEditingText,
        save,
        releaseLock,
        autoSave,
    }
}
