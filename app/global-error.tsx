'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Something went wrong
          </h1>
          <p className="text-[var(--color-text)] mb-6">
            The error has been reported. Please try again.
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 text-sm rounded-lg bg-[var(--color-text)] text-[var(--color-surface)] hover:opacity-80 transition-opacity font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
