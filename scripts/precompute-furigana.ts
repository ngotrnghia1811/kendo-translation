/**
 * scripts/precompute-furigana.ts — Precompute furigana annotations.
 *
 * Reads all Japanese segments from the live DB, runs the furigana annotation
 * pipeline (lib/furigana/annotate.ts → Sudachi WASM Mode C + wanakana romaji),
 * and writes the ruby_data JSONB column back via the bulk_update_ruby_data RPC
 * (migration 014), called through the Supabase Management API for reliable
 * timeout-free execution on free-tier.
 *
 * ENGINE (v2): Sudachi WASM Mode C (sudachi-wasm333, Apache 2.0) with
 * bundled SudachiDict Small (~117 MB). Romaji derived via wanakana.toRomaji()
 * (MIT).
 *
 * WRITER (v4): Calls the plpgsql bulk_update_ruby_data RPC through the
 * Supabase Management API (HTTP POST to /database/query), which bypasses
 * PostgREST's 10s db-pool-timeout. One round-trip per batch.
 *
 * PAGINATION: Cursor-based on `id` (primary key) so a single invocation can
 * process all ~439k JP segments. Resumable by default (WHERE ruby_data IS NULL).
 *
 * Usage:
 *   npx tsx scripts/precompute-furigana.ts --dry-run
 *   npx tsx scripts/precompute-furigana.ts --article-id UUID
 *   npx tsx scripts/precompute-furigana.ts                         # run all
 *   npx tsx scripts/precompute-furigana.ts --force                 # re-annotate
 */

import { readFile } from 'node:fs/promises'
import { annotateTexts } from '../lib/furigana/index.js'

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')

function getArg(name: string): string | undefined {
    const idx = args.indexOf(name)
    if (idx === -1) return undefined
    return args[idx + 1]
}

const ARTICLE_ID = getArg('--article-id') ?? null
const LIMIT = getArg('--limit') ? parseInt(getArg('--limit')!, 10) : null
const BATCH_SIZE = getArg('--batch-size') ? parseInt(getArg('--batch-size')!, 10) : 50

// Cooldown: pause every N batches to let free-tier DB vacuum/checkpoint
// (Tightened for free-tier I/O budget — frequent short pauses)
const COOLDOWN_INTERVAL = 20
const COOLDOWN_MS = 15000
const LONG_REST_INTERVAL = 100
const LONG_REST_MS = 60000

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

interface Env {
    supabaseUrl: string
    serviceRoleKey: string
    mgmtToken: string
    projectRef: string
}

let _env: Env | null = null

async function getEnv(): Promise<Env> {
    if (_env) return _env
    const raw = await readFile('.env.local', 'utf-8')
    const url = raw.match(/NEXT_PUBLIC_SUPABASE_URL="?(.+?)"?\n/)?.[1]
    const key = raw.match(/SUPABASE_SERVICE_ROLE_KEY="?(.+?)"?\n/)?.[1]
    const token = raw.match(/SUPABASE_ACCESS_TOKEN="?(sbp_[^"\n]+)"?/)?.[1]
    if (!url || !key || !token) throw new Error('Missing env vars in .env.local')
    const projectRef = url.match(/https:\/\/([^.]+)/)?.[1]
    if (!projectRef) throw new Error('Cannot parse project ref from URL')
    _env = { supabaseUrl: url, serviceRoleKey: key, mgmtToken: token, projectRef }
    return _env
}

// ---------------------------------------------------------------------------
// SQL literal helpers
// ---------------------------------------------------------------------------

let _dollarTagSeq = 0

/** Build a dollar-quoted jsonb literal safe for any content. */
function jsonbLiteral(obj: unknown): string {
    const json = JSON.stringify(obj)
    // Dollar-quote tag: $_0$, $_1$, etc. Only fails if content contains this exact sequence.
    const tag = `_${_dollarTagSeq++}`
    const dq = `$${tag}$`
    if (json.includes(dq)) {
        // Extremely unlikely, but handle gracefully
        const fallback = `_f${Date.now().toString(36)}`
        return `$${fallback}$${json}$${fallback}$::jsonb`
    }
    return `${dq}${json}${dq}::jsonb`
}

// ---------------------------------------------------------------------------
// Management API query (bypasses PostgREST timeout)
// ---------------------------------------------------------------------------

async function mgmtQuery(sql: string): Promise<any[]> {
    const env = await getEnv()
    const endpoint = `https://api.supabase.com/v1/projects/${env.projectRef}/database/query`

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.mgmtToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Mgmt API returned ${res.status}: ${text.slice(0, 200)}`)
    }
    return res.json()
}

// ---------------------------------------------------------------------------
// Management API write (bypasses PostgREST timeout)
// ---------------------------------------------------------------------------

async function bulkWriteRubyDataMgmt(ids: string[], rubyData: unknown[]): Promise<number> {
    const env = await getEnv()
    const endpoint = `https://api.supabase.com/v1/projects/${env.projectRef}/database/query`

    const idList = ids.map(id => `'${id}'::uuid`).join(',')
    const jsonList = rubyData.map(r => jsonbLiteral(r)).join(',')

    const sql = `SELECT bulk_update_ruby_data(
  ARRAY[${idList}]::uuid[],
  ARRAY[${jsonList}]::jsonb[]
) AS cnt;`

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.mgmtToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Mgmt API returned ${res.status}: ${text.slice(0, 200)}`)
    }

    const body = await res.json()
    if (Array.isArray(body) && body.length > 0 && typeof body[0].cnt === 'number') {
        return body[0].cnt as number
    }
    // Fallback: try to count from result
    return Array.isArray(body) ? body.length : 0
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SegmentRow {
    id: string
    article_id: string
    source_text: string
    ruby_data: unknown | null
}

// ---------------------------------------------------------------------------
// Paginated fetch → annotate → write loop
// ---------------------------------------------------------------------------

async function main() {
    console.log('Connected to Supabase (Management API).')

    // ── Warmup: load Sudachi once ──
    console.log('Loading Sudachi WASM + SudachiDict Small (~117 MB, one-time)…')
    await annotateTexts(['ウォームアップ'])
    console.log('Sudachi ready.\n')

    // ── State ─────────────────────────────────────────────────────────────
    let cursor = ''
    let totalWritten = 0
    let batchNum = 0
    const wallStart = Date.now()

    // ── Pagination loop ───────────────────────────────────────────────────
    while (true) {
        // Build SQL for fetch via Management API (bypasses PostgREST timeout)
        let sql = `SELECT id, article_id, source_text, ruby_data FROM segments WHERE source_lang='ja'`
        if (!FORCE) sql += ` AND ruby_data IS NULL`
        if (ARTICLE_ID) sql += ` AND article_id='${ARTICLE_ID}'`
        if (cursor) sql += ` AND id > '${cursor}'`
        sql += ` ORDER BY id LIMIT ${BATCH_SIZE}`

        let rows: any[]
        try {
            rows = await mgmtQuery(sql)
        } catch (fetchErr) {
            const msg = (fetchErr as Error).message ?? String(fetchErr)
            // If fetch itself times out, DB is exhausted — pause and retry
            if (msg.includes('timeout') || msg.includes('canceling') || msg.includes('544') || msg.includes('503')) {
                console.error(`  Fetch timeout/pause — waiting 30s (${msg.slice(0,80)})`)
                await new Promise(r => setTimeout(r, 30000))
                continue
            }
            console.error('Fetch failed:', msg)
            process.exit(1)
        }
        if (!rows || rows.length === 0) {
            console.log('No more segments to process.')
            break
        }

        const segments = rows as SegmentRow[]

        // Annotate
        const annotStart = Date.now()
        const texts = segments.map(s => s.source_text)
        const annotations = await annotateTexts(texts)
        const annotMs = Date.now() - annotStart

        // Write via Management API (with retry for transient DB errors)
        let writtenThisBatch = 0
        if (!DRY_RUN) {
            const MAX_RETRIES = 3
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    writtenThisBatch = await bulkWriteRubyDataMgmt(
                        segments.map(s => s.id),
                        annotations,
                    )
                    break // success
                } catch (writeErr) {
                    const msg = (writeErr as Error).message ?? String(writeErr)
                    if (attempt < MAX_RETRIES && (
                        msg.includes('timeout') || msg.includes('canceling') ||
                        msg.includes('503') || msg.includes('502') || msg.includes('429') ||
                        msg.includes('exhausted') || msg.includes('connection')
                    )) {
                        const wait = attempt * 5000
                        console.error(`  ── Write retry ${attempt}/${MAX_RETRIES} after ${wait/1000}s (${msg.slice(0,80)})`)
                        await new Promise(r => setTimeout(r, wait))
                        continue
                    }
                    throw writeErr // non-retryable or exhausted retries
                }
            }
        } else {
            writtenThisBatch = segments.length
        }

        // Advance cursor
        if (writtenThisBatch > 0) {
            cursor = segments[writtenThisBatch - 1].id
        }
        totalWritten += writtenThisBatch
        batchNum++

        const wallS = ((Date.now() - wallStart) / 1000).toFixed(1)
        const annotS = (annotMs / 1000).toFixed(2)
        const perSeg = segments.length > 0 ? (annotMs / segments.length).toFixed(3) : '0'
        console.log(
            `  Batch ${batchNum}: ${segments.length} rows | annot ${annotS}s (~${perSeg}s/seg)` +
            ` | write ${writtenThisBatch} rows | total ${totalWritten} written | wall ${wallS}s`,
        )

        if (LIMIT && totalWritten >= LIMIT) break

        // Cooldown to let free-tier DB vacuum/checkpoint
        if (batchNum % LONG_REST_INTERVAL === 0) {
            console.log(`  ── Long rest ${LONG_REST_MS / 1000}s (vacuum/checkpoint recovery) ──`)
            await new Promise(r => setTimeout(r, LONG_REST_MS))
        } else if (batchNum % COOLDOWN_INTERVAL === 0) {
            console.log(`  ── Pausing ${COOLDOWN_MS / 1000}s (cooldown) ──`)
            await new Promise(r => setTimeout(r, COOLDOWN_MS))
        } else {
            await new Promise(r => setTimeout(r, 1000))
        }
    }

    // ── Final report ──────────────────────────────────────────────────────
    const totalS = ((Date.now() - wallStart) / 1000).toFixed(1)
    console.log(`\nDone. ${totalWritten} rows written in ${totalS}s wall time.`)

    // Quick NULL-count check via Management API
    if (!DRY_RUN) {
        try {
            const result = await mgmtQuery(
                `SELECT count(*) AS cnt FROM segments WHERE source_lang='ja' AND ruby_data IS NULL`
            )
            if (result && result.length > 0 && typeof result[0].cnt === 'number') {
                console.log(`Remaining NULL ruby_data (source_lang='ja'): ${result[0].cnt}`)
            }
        } catch {
            // count may time out under load — ignore
        }
    }
}

main().catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
})
