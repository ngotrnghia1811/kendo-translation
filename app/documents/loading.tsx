/**
 * app/documents/loading.tsx
 *
 * Phase 4.5: Documents list skeleton — shown during client-side navigation to
 * /documents. Matches the card-based layout of DocumentsList.
 */

export default function DocumentsLoading() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <header className="border-b bg-[var(--rt-surface,#fff)] border-[var(--rt-border,#e5e7eb)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-6 w-6 rounded bg-[var(--rt-border,#e5e7eb)] animate-pulse" />
            <div className="h-6 w-40 rounded bg-[var(--rt-border,#e5e7eb)] animate-pulse" />
          </div>
          <div className="h-8 w-8 rounded-full bg-[var(--rt-border,#e5e7eb)] animate-pulse" />
        </div>
      </header>

      {/* Content skeleton */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-36 rounded bg-[var(--color-border,#e5e7eb)] animate-pulse" />
          <div className="flex items-center gap-2">
            {[80, 65, 90].map((w, i) => (
              <div
                key={i}
                className="h-8 rounded-full bg-[var(--rt-border,#e5e7eb)] animate-pulse"
                style={{ width: w }}
              />
            ))}
            <div className="h-9 w-28 rounded-lg bg-[var(--color-border,#e5e7eb)] animate-pulse" />
          </div>
        </div>

        {/* Card skeletons */}
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 6 }).map((_, i) => {
            // Deterministic widths based on index (no Math.random() in Server Components)
            const widths = [85, 70, 60, 90, 75, 55];
            const w = widths[i] ?? 70;
            return (
            <div
              key={i}
              className="rounded-xl border p-4 sm:p-5 bg-[var(--rt-surface,#fff)] border-[var(--rt-border,#e5e7eb)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <div
                    className="h-5 rounded bg-[var(--rt-border,#e5e7eb)] animate-pulse"
                    style={{ width: `${w}%` }}
                  />
                  <div className="flex gap-2">
                    <div className="h-5 w-20 rounded-full bg-[var(--rt-border,#e5e7eb)] animate-pulse" />
                    <div className="h-5 w-24 rounded-full bg-[var(--rt-border,#e5e7eb)] animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-16 rounded-lg bg-[var(--rt-border,#e5e7eb)] animate-pulse" />
                  <div className="h-8 w-16 rounded-lg bg-[var(--rt-border,#e5e7eb)] animate-pulse" />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
