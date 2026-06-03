#!/usr/bin/env npx tsx
/**
 * scripts/link-gdrive-pdfs.ts
 *
 * Reads `.tmp/gdrive-ids.json` (produced by `upload-pdfs-to-gdrive.ts`)
 * and updates `articles.paired_pdf_path` in Supabase with `gdrive:<fileId>`
 * values, matching articles by normalised title.
 *
 * Usage:
 *   npx tsx scripts/link-gdrive-pdfs.ts --dry-run
 *   npx tsx scripts/link-gdrive-pdfs.ts
 *   npx tsx scripts/link-gdrive-pdfs.ts --force
 *
 * Requirements:
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
 *   (or loaded from .env.local).
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Load .env.local manually (avoid dotenv dependency — match link-paired-pdfs.ts)
// ---------------------------------------------------------------------------
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
        if (m && !process.env[m[1]]) {
            process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
        }
    }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const INPUT_PATH = path.resolve(process.cwd(), '.tmp/gdrive-ids.json')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
    process.exit(1)
}

// WARNING: This script uses the SERVICE_ROLE_KEY. Do not expose it client-side.

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise a string for fuzzy matching: lowercase, collapse whitespace */
function normalise(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    // 1. Read the GDrive IDs map
    if (!fs.existsSync(INPUT_PATH)) {
        console.error(`Input file not found: ${INPUT_PATH}`)
        console.error('Run scripts/upload-pdfs-to-gdrive.ts first.')
        process.exit(1)
    }

    const raw = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8')) as Record<string, string>
    const entries = Object.entries(raw)
    console.log(`Loaded ${entries.length} entries from ${INPUT_PATH}`)

    // 2. Fetch all articles
    const { data: articles, error } = await supabase
        .from('articles')
        .select('id, title, paired_pdf_path')
    if (error) throw new Error(`Failed to fetch articles: ${error.message}`)
    if (!articles) throw new Error('No articles returned')
    console.log(`Fetched ${articles.length} articles from DB`)

    // 3. Match by normalised title
    let updated = 0
    let skipped = 0
    let unmatched: string[] = []

    for (const [relPath, fileId] of entries) {
        // Derive the directory name from the relative path
        // e.g. "Eiga Full/Eiga Full_paired.pdf" → "Eiga Full"
        const dir = path.dirname(relPath)
        const normDir = normalise(dir)

        const match = articles.find((a) => normalise(a.title) === normDir)
        if (!match) {
            console.log(`  ? ${relPath} — no article match for "${dir}"`)
            unmatched.push(dir)
            continue
        }

        const gdriveVal = `gdrive:${fileId}`

        // Check existing value
        if (match.paired_pdf_path && !FORCE) {
            console.log(`  ⏭ ${match.title} — already has paired_pdf_path (use --force to overwrite)`)
            skipped++
            continue
        }

        if (DRY_RUN) {
            console.log(`  [DRY-RUN] Would update ${match.title} → ${gdriveVal}`)
            updated++
            continue
        }

        const { error: updateError } = await supabase
            .from('articles')
            .update({ paired_pdf_path: gdriveVal })
            .eq('id', match.id)

        if (updateError) {
            console.error(`  ✗ Failed to update ${match.title}: ${updateError.message}`)
        } else {
            console.log(`  ✓ ${match.title} → ${gdriveVal}`)
            updated++
        }
    }

    console.log(`\nDone. Updated: ${updated}, Skipped (existing): ${skipped}, Unmatched: ${unmatched.length}`)
    if (unmatched.length > 0) {
        console.log(`Unmatched PDF dirs (no article title match):`)
        unmatched.forEach((d) => console.log(`  - ${d}`))
    }
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
