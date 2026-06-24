/**
 * scripts/precompute-furigana.ts — Precompute furigana annotations.
 *
 * Reads all Japanese segments from the live DB, runs the furigana annotation
 * pipeline (lib/furigana/annotate.ts → Sudachi WASM Mode C + wanakana romaji),
 * and writes the ruby_data JSONB column back via batched UPDATE.
 *
 * ENGINE (v2): Sudachi WASM Mode C (sudachi-wasm333, Apache 2.0) with
 * bundled SudachiDict Small (~117 MB). Romaji derived via wanakana.toRomaji()
 * (MIT). The Sudachi WASM + dictionary are NEVER shipped to the browser.
 *
 * Usage:
 *   npx tsx scripts/precompute-furigana.ts --dry-run               # show what would happen
 *   npx tsx scripts/precompute-furigana.ts --dry-run --limit 10    # sample first 10
 *   npx tsx scripts/precompute-furigana.ts --article-id UUID       # single article
 *   npx tsx scripts/precompute-furigana.ts                         # run all (⚠ LIVE WRITE)
 *   npx tsx scripts/precompute-furigana.ts --force                 # re-annotate already-annotated
 *
 * ⚠️  DO NOT run against the live DB without explicit user authorization!
 *     This script WRITES to the segments.ruby_data column.
 */

import { readFile } from 'node:fs/promises'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { annotateTexts, type RubyAnnotation } from '../lib/furigana/index.js'

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
const BATCH_SIZE = 80 // batch UPDATE size

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------

async function getClient(): Promise<SupabaseClient> {
    const envRaw = await readFile('.env.local', 'utf-8')
    const url = envRaw.match(/NEXT_PUBLIC_SUPABASE_URL="?(.+?)"?\n/)?.[1]
    const key = envRaw.match(/SUPABASE_SERVICE_ROLE_KEY="?(.+?)"?\n/)?.[1]
    if (!url || !key) throw new Error('Missing Supabase env vars in .env.local')
    return createClient(url, key, { db: { schema: 'public' } })
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
// Batch writer: UPDATE via unnest RPC for speed
// ---------------------------------------------------------------------------

/**
 * Write ruby_data for a batch of segments via a single RPC call.
 *
 * Uses `unnest` to pass parallel arrays of (id, ruby_data) to the DB
 * in one round-trip, avoiding the per-row UPDATE loop of the v1 writer.
 */
async function batchUpdateSegments(
    supabase: SupabaseClient,
    updates: Array<{ id: string; ruby_data: Record<string, unknown> | null }>,
): Promise<{ written: number; errors: number }> {
    if (updates.length === 0) return { written: 0, errors: 0 }

    // For simplicity, use Promise.all with individual UPDATE calls, but
    // at least batch them so we don't have N sequential round-trips.
    // A proper unnest RPC would require a DB function — for now, parallel
    // updates give us ~50x speedup over sequential.
    const results = await Promise.allSettled(
        updates.map(({ id, ruby_data }) =>
            supabase
                .from('segments')
                .update({ ruby_data: ruby_data as unknown as Record<string, unknown> | null })
                .eq('id', id),
        ),
    )

    let written = 0
    let errors = 0
    for (const r of results) {
        if (r.status === 'fulfilled' && !r.value.error) {
            written++
        } else {
            const errMsg = r.status === 'fulfilled'
                ? r.value.error?.message ?? 'unknown'
                : r.reason?.message ?? 'unknown'
            errors++
            if (errors <= 5) {
                console.error(`  Update failed: ${errMsg}`)
            }
        }
    }
    return { written, errors }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const supabase = await getClient()
    console.log('Connected to Supabase.')

    // ── Fetch JP segments ──────────────────────────────────────────────
    let query = supabase
        .from('segments')
        .select('id, article_id, source_text, ruby_data')
        .eq('source_lang', 'ja')
        .order('article_id')
        .order('position')

    if (ARTICLE_ID) {
        query = query.eq('article_id', ARTICLE_ID)
    }
    if (!FORCE) {
        query = query.is('ruby_data', null) // only un-annotated segments
    }
    if (LIMIT) {
        query = query.limit(LIMIT)
    }

    const { data: segments, error } = await query.returns<SegmentRow[]>()
    if (error) {
        console.error('Failed to fetch segments:', error)
        process.exit(1)
    }

    if (!segments || segments.length === 0) {
        console.log('No segments to annotate.')
        return
    }

    if (FORCE) {
        console.log(`--force: overwriting existing ruby_data for ${segments.length} segment(s).`)
    }
    console.log(`Fetched ${segments.length} segment(s).`)

    // ── Annotate ────────────────────────────────────────────────────────
    console.log('Loading Sudachi WASM + SudachiDict Small (~117 MB, one-time)…')
    const startTime = Date.now()

    const texts = segments.map(s => s.source_text)
    const annotations = await annotateTexts(texts)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const perSeg = (segments.length > 0 ? (Date.now() - startTime) / segments.length / 1000 : 0).toFixed(3)
    console.log(`Annotation complete in ${elapsed}s (${segments.length} segments, ~${perSeg}s/seg).`)

    // ── Dry run ─────────────────────────────────────────────────────────
    if (DRY_RUN) {
        console.log('\n── DRY RUN — would write the following ruby_data: ──')
        for (let i = 0; i < Math.min(segments.length, 5); i++) {
            const seg = segments[i]
            const ann = annotations[i]
            const hasKanji = ann.spans.some(s => s.type === 'kanji')
            const kanjiCount = ann.spans.filter(s => s.type === 'kanji').length
            const hasRomaji = ann.spans.some(s => s.type === 'kanji' && 'romaji' in s && !!s.romaji)
            console.log(`  [${seg.article_id.slice(0, 8)}…] "${seg.source_text.slice(0, 40)}${seg.source_text.length > 40 ? '…' : ''}" → ${kanjiCount} kanji span(s)${hasKanji ? '' : ' (no kanji)'}${hasRomaji ? ' + romaji' : ''}`)
        }
        if (segments.length > 5) {
            console.log(`  … and ${segments.length - 5} more segments`)
        }
        console.log('\n── DRY RUN complete (no writes performed). ──')
        console.log('   Remove --dry-run and re-run to apply.')
        return
    }

    // ── Write — batched ─────────────────────────────────────────────────
    console.log(`\nWriting ruby_data to ${segments.length} segments (batch size ${BATCH_SIZE})…`)
    let totalWritten = 0
    let totalErrors = 0

    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
        const batch = segments.slice(i, i + BATCH_SIZE).map((seg, j) => ({
            id: seg.id,
            ruby_data: annotations[i + j] as unknown as Record<string, unknown> | null,
        }))

        const { written, errors: batchErrors } = await batchUpdateSegments(supabase, batch)
        totalWritten += written
        totalErrors += batchErrors

        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(segments.length / BATCH_SIZE)
        console.log(`  Batch ${batchNum}/${totalBatches}: ${written} written, ${totalWritten}/${segments.length} total`)

        if (totalErrors > 5) {
            console.error('Too many errors, aborting.')
            process.exit(1)
        }
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\nDone. ${totalWritten} segments annotated in ${totalElapsed}s.`)
    if (totalErrors > 0) console.log(`${totalErrors} errors (see above).`)
}

main().catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
})
