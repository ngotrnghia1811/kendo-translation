/**
 * app/documents/[id]/read/loading.tsx
 *
 * Phase 4.5: Reader skeleton — shown during client-side navigation and as the
 * Suspense fallback for the cached article shell. Uses --rt-* tokens to match
 * the reader's own visual language.
 */

export default function ReaderLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--rt-bg, #ffffff)' }}>
      {/* Toolbar skeleton */}
      <div
        className="shrink-0 z-10 px-4 py-3"
        style={{ borderBottom: '1px solid var(--rt-border, #e5e7eb)' }}
      >
        <div className="max-w-5xl mx-auto space-y-3">
          {/* Top row: breadcrumb */}
          <div className="flex items-center gap-3">
            <div className="h-4 w-20 rounded bg-[var(--rt-border,#e5e7eb)] animate-pulse" />
            <div className="h-4 w-48 rounded bg-[var(--rt-border,#e5e7eb)] animate-pulse" />
          </div>
          {/* Bottom row: mode tabs + pager */}
          <div className="flex items-center gap-3">
            {[80, 100, 90, 60].map((w, i) => (
              <div
                key={i}
                className="h-8 rounded-lg bg-[var(--rt-border,#e5e7eb)] animate-pulse"
                style={{ width: w }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content skeleton — paragraphs */}
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        {Array.from({ length: 6 }).map((_, i) => {
          // Deterministic widths (no Math.random() in Server Components)
          const w1 = [90, 85, 95, 80, 88, 92][i] ?? 85;
          const w2 = [70, 60, 75, 65, 80, 55][i] ?? 65;
          const w3 = [50, 45, 55, 40, 48, 52][i] ?? 45;
          return (
          <div key={i} className="space-y-2">
            <div
              className="h-4 rounded bg-[var(--rt-border,#e5e7eb)] animate-pulse"
              style={{ width: `${w1}%` }}
            />
            <div
              className="h-4 rounded bg-[var(--rt-border,#e5e7eb)] animate-pulse"
              style={{ width: `${w2}%` }}
            />
            {i % 3 === 0 && (
              <div
                className="h-4 rounded bg-[var(--rt-border,#e5e7eb)] animate-pulse"
                style={{ width: `${w3}%` }}
              />
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
