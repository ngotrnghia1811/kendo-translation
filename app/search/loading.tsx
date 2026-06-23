/**
 * app/search/loading.tsx
 *
 * Route-level loading skeleton for /search. Shown during client-side
 * navigation to the search page (Next.js file-convention loading UI).
 * The Suspense boundary in page.tsx handles the initial SSR stream;
 * this file catches navigations after the page is already mounted.
 */

export default function SearchLoading() {
    return (
        <div className="min-h-screen">
            {/* Header skeleton */}
            <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-[var(--color-border)] animate-pulse shrink-0" />
                    <div className="flex-1 h-10 rounded-lg bg-[var(--color-border)] animate-pulse" />
                    <div className="hidden sm:flex gap-1 shrink-0">
                        {[80, 65, 72].map((w, i) => (
                            <div
                                key={i}
                                className="h-8 rounded-md bg-[var(--color-border)] animate-pulse"
                                style={{ width: w }}
                            />
                        ))}
                    </div>
                </div>
            </header>

            {/* Results skeleton */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Category header skeleton */}
                <div className="space-y-3">
                    <div className="h-4 w-20 rounded bg-[var(--color-border)] animate-pulse" />
                    {/* Article card skeletons */}
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-20 rounded-lg bg-[var(--color-border)] animate-pulse"
                        />
                    ))}
                </div>
                {/* Segment results skeleton */}
                <div className="space-y-3">
                    <div className="h-4 w-24 rounded bg-[var(--color-border)] animate-pulse" />
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-28 rounded-lg bg-[var(--color-border)] animate-pulse"
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
