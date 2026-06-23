'use client'

import { forwardRef, useCallback } from 'react'
import type { ReactNode, UIEvent as ReactUIEvent } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'

export interface VirtualizedReaderProps {
    /** Total number of virtual items to render. */
    totalCount: number
    /** Render callback for item at `index`. */
    itemContent: (index: number) => ReactNode
    /** Optional stable key function (defaults to `p-${index}`). */
    computeItemKey?: (index: number) => string
    /** If provided, Virtuoso uses this element as its scroll container
     *  instead of creating its own. Essential for nesting inside the
     *  reader's existing layout. */
    customScrollParent?: HTMLElement | null
    /** Fires on every scroll event — used for scroll-to-top button tracking. */
    onScrolled?: (scrolled: boolean) => void
    /** Height in px above/below the viewport to pre-render (default 800). */
    increaseViewportBy?: number
}

/**
 * VirtualizedReader — a thin 'use client' wrapper around react-virtuoso's
 * <Virtuoso> component.
 *
 * Renders only the items that fit in the viewport (+ overscan), eliminating
 * the linear DOM growth problem on large documents. All theming, font
 * sizing, and layout-width CSS are applied by the parent <ReaderView> —
 * this component is purely a list-windowing primitive.
 */
const VirtualizedReader = forwardRef<VirtuosoHandle, VirtualizedReaderProps>(
    function VirtualizedReader(
        {
            totalCount,
            itemContent,
            computeItemKey,
            customScrollParent,
            onScrolled,
            increaseViewportBy = 800,
        },
        ref,
    ) {
        const handleScroll = useCallback(
            (e: ReactUIEvent<HTMLDivElement>) => {
                if (onScrolled) {
                    const st = e.currentTarget.scrollTop
                    onScrolled(st > 300)
                }
            },
            [onScrolled],
        )

        // Early return for empty lists — avoids Virtuoso rendering its
        // built-in "no items" placeholder which clashes with our own
        // empty-state UI.
        if (totalCount === 0) {
            return null
        }

        return (
            <Virtuoso
                ref={ref}
                totalCount={totalCount}
                itemContent={itemContent}
                computeItemKey={computeItemKey ?? ((i: number) => `p-${i}`)}
                increaseViewportBy={increaseViewportBy}
                customScrollParent={customScrollParent ?? undefined}
                onScroll={handleScroll}
                // Virtuoso defaults to 100vh height; when using a
                // customScrollParent we want it to fill the parent.
                style={{ height: '100%' }}
            />
        )
    },
)

VirtualizedReader.displayName = 'VirtualizedReader'

export default VirtualizedReader
