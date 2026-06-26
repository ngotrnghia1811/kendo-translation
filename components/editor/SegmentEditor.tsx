'use client'

import { useCallback, useEffect, useRef } from 'react'

interface SegmentEditorProps {
    value: string
    onChange: (value: string) => void
    onBlur?: () => void
    onKeyDown?: (e: React.KeyboardEvent) => void
    placeholder?: string
    disabled?: boolean
    autoFocus?: boolean
}

export default function SegmentEditor({
    value,
    onChange,
    onBlur,
    onKeyDown,
    placeholder = 'Click to translate...',
    disabled = false,
    autoFocus = false,
}: SegmentEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea to content
    const adjustHeight = useCallback(() => {
        const el = textareaRef.current
        if (el) {
            el.style.height = 'auto'
            el.style.height = `${Math.max(el.scrollHeight, 40)}px`
        }
    }, [])

    useEffect(() => {
        adjustHeight()
    }, [value, adjustHeight])

    useEffect(() => {
        if (autoFocus && textareaRef.current) {
            textareaRef.current.focus()
            // Place cursor at end
            const len = textareaRef.current.value.length
            textareaRef.current.setSelectionRange(len, len)
        }
    }, [autoFocus])

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`
                w-full resize-none rounded border p-2 text-sm leading-relaxed
                transition-colors duration-150
                ${disabled
                    ? 'bg-[var(--color-bg)] text-[var(--color-text-muted)] cursor-not-allowed'
                    : 'bg-[var(--color-surface)] text-[var(--color-text)] border-blue-400 dark:border-blue-600 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 focus:outline-none'
                }
            `}
            rows={1}
        />
    )
}
