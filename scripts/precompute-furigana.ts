/**
 * scripts/precompute-furigana.ts — Precompute furigana annotations.
 *
 * Reads all Japanese segments from the live DB, runs the furigana annotation
 * pipeline (lib/furigana/annotate.ts → kuroshiro + kuromoji), and writes
 * the ruby_data JSONB column back.
 *
 * The pipeline loads a ~15MB IPADIC dictionary into memory (kuroshiro init).
 * This script runs on Node.js; the dictionary is NEVER shipped to the browser.
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

    console.log(`Fetched ${segments.length} segment(s).`)

    // ── Annotate ────────────────────────────────────────────────────────
    console.log('Loading kuroshiro + IPADIC dictionary (~15MB, one-time)…')
    const startTime = Date.now()

    const texts = segments.map(s => s.source_text)
    const annotations = await annotateTexts(texts)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`Annotation complete in ${elapsed}s (${segments.length} segments).`)

    // ── Write ───────────────────────────────────────────────────────────
    if (DRY_RUN) {
        console.log('\n── DRY RUN — would write the following ruby_data: ──')
        for (let i = 0; i < Math.min(segments.length, 5); i++) {
            const seg = segments[i]
            const ann = annotations[i]
            const hasKanji = ann.spans.some(s => s.type === 'kanji')
            const kanjiCount = ann.spans.filter(s => s.type === 'kanji').length
            console.log(`  [${seg.article_id.slice(0, 8)}…] "${seg.source_text.slice(0, 40)}${seg.source_text.length > 40 ? '…' : ''}" → ${kanjiCount} kanji span(s)${hasKanji ? '' : ' (no kanji)'}`)
        }
        if (segments.length > 5) {
            console.log(`  … and ${segments.length - 5} more segments`)
        }
        console.log('\n── DRY RUN complete (no writes performed). ──')
        console.log('   Remove --dry-run and re-run to apply.')
        return
    }

    // ── Update per segment (upsert requires all NOT NULL columns) ──────
    console.log(`\nWriting ruby_data to ${segments.length} segments…`)
    let written = 0
    let errors = 0

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const { error: updateError } = await supabase
            .from('segments')
            .update({
                ruby_data: annotations[i] as unknown as Record<string, unknown> | null,
            })
            .eq('id', seg.id)

        if (updateError) {
            console.error(`  Segment ${seg.id.slice(0, 8)}… failed:`, updateError.message)
            errors++
            if (errors > 5) {
                console.error('Too many errors, aborting.')
                process.exit(1)
            }
            continue
        }

        written++
        if (written % 20 === 0 || written === segments.length) {
            console.log(`  Wrote ${written}/${segments.length} segments…`)
        }
    }

    console.log(`\nDone. ${written} segments annotated.`)
}

main().catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
})
