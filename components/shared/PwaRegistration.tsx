'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker at /sw.js on mount.
 * No-op when window is undefined (SSR) or serviceWorker API is absent.
 *
 * SW registration is deferred to production builds only. In development,
 * the SW interferes with Turbopack HMR, RSC streaming, and causes
 * `networkidle` timeouts in Playwright tests.
 *
 * For PWA testing in dev, the Playwright test explicitly calls
 * `navigator.serviceWorker.register('/sw.js')` via page.evaluate.
 */
export function PwaRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    // Only auto-register in production; tests handle registration manually
    if (process.env.NODE_ENV !== 'production') return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[PWA] SW registered — scope:', reg.scope)
      })
      .catch((err) => {
        console.warn('[PWA] SW registration failed:', err.message)
      })
  }, [])

  return null
}
