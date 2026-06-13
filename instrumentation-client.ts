import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Replay session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Tracing
  tracesSampleRate: 1.0,
  // Filter out non-critical environments
  enabled: process.env.NODE_ENV === 'production',
  // Ignore Supabase realtime / polling errors that are transient
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured with value: undefined',
    'Network request failed',
  ],
  beforeSend(event) {
    // Drop events during development
    if (process.env.NODE_ENV !== 'production') return null;
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
