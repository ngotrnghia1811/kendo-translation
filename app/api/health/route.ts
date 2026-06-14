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
 * The DB check runs a minimal no-auth query (SELECT 1) against Supabase
 * using the anon key — RLS will block any data read but the round-trip
 * confirms the connection is alive.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Build-time git SHA injected by Vercel (VERCEL_GIT_COMMIT_SHA env var).
// Falls back to 'dev' if not available.
const VERSION =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.GIT_SHA?.slice(0, 7) ??
    'dev'

export async function GET() {
    const timestamp = new Date().toISOString()

    // Minimal Supabase ping using anon key — no cookie/auth required.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.json(
            {
                ok: false,
                db: 'misconfigured',
                error: 'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set',
                timestamp,
                version: VERSION,
            },
            { status: 503 }
        )
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        // Cheapest possible round-trip: count rows in a public table.
        // If Supabase is down this throws or returns a network error.
        const { error } = await supabase.from('articles').select('id', { count: 'exact', head: true })
        if (error) {
            return NextResponse.json(
                {
                    ok: false,
                    db: 'error',
                    error: error.message,
                    timestamp,
                    version: VERSION,
                },
                { status: 503 }
            )
        }
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
