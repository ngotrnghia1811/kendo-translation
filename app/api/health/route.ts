/**
 * GET /api/health
 *
 * Lightweight health-check endpoint for uptime monitoring (UptimeRobot,
 * Vercel, external probes). Does NOT require authentication.
 *
 * Response 200 — all systems healthy:
 *   { ok: true, db: "ok", timestamp: "<ISO string>", version: "<git sha>" }
 *
 * Response 503 — database unreachable:
 *   { ok: false, db: "error", error: "<message>", timestamp: "<ISO string>" }
 *
 * The DB check pings PocketBase's own /api/health endpoint (no auth required).
 */

import { NextResponse } from 'next/server'

// Build-time git SHA injected by Vercel (VERCEL_GIT_COMMIT_SHA env var).
// Falls back to 'dev' if not available.
const VERSION =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.GIT_SHA?.slice(0, 7) ??
    'dev'

export async function GET() {
    const timestamp = new Date().toISOString()

    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL

    if (!pbUrl) {
        return NextResponse.json(
            {
                ok: false,
                db: 'misconfigured',
                error: 'NEXT_PUBLIC_POCKETBASE_URL is not set',
                timestamp,
                version: VERSION,
            },
            { status: 503 }
        )
    }

    try {
        const res = await fetch(`${pbUrl}/api/health`, {
            signal: AbortSignal.timeout(5000),
            cache: 'no-store',
        })

        if (!res.ok) {
            return NextResponse.json(
                {
                    ok: false,
                    db: 'error',
                    error: `PocketBase returned HTTP ${res.status}`,
                    timestamp,
                    version: VERSION,
                },
                { status: 503 }
            )
        }

        const body = (await res.json()) as { code?: number; message?: string }

        if (body.code === 200) {
            return NextResponse.json(
                {
                    ok: true,
                    db: 'ok',
                    timestamp,
                    version: VERSION,
                },
                {
                    status: 200,
                    headers: {
                        // Prevent CDN caching of health checks.
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                    },
                }
            )
        }

        return NextResponse.json(
            {
                ok: false,
                db: 'error',
                error: body.message ?? `PocketBase returned code ${body.code}`,
                timestamp,
                version: VERSION,
            },
            { status: 503 }
        )
    } catch (err) {
        return NextResponse.json(
            {
                ok: false,
                db: 'unreachable',
                error: err instanceof Error ? err.message : String(err),
                timestamp,
                version: VERSION,
            },
            { status: 503 }
        )
    }
}
