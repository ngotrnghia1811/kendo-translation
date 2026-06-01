#!/usr/bin/env npx tsx
/**
 * scripts/link-paired-pdfs.ts
 *
 * Scans the book-postprocessing directory for `<dir>/<dir>_paired.pdf` files,
 * matches each one to an article in Supabase by normalised title, and updates
 * `articles.paired_pdf_path` with the relative path.
 *
 * Usage:
 *   PDF_BASE_PATH=/path/to/book-postprocessing npx tsx scripts/link-paired-pdfs.ts
 *
 * Requirements:
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
 *   (or loaded from .env.local).
 *
 * Safe to re-run — it only updates rows where a match is found.
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local manually (avoid dotenv dependency)
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

const PDF_BASE_PATH =
    process.env.PDF_BASE_PATH ??
    '/Users/nghiango-mbp/git_repo/universal-agent_v2/book-postprocessing'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/** Normalise a string for fuzzy matching: lowercase, collapse whitespace */
function normalise(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

async function main() {
    // 1. Scan PDF base directory
    const entries = fs.readdirSync(PDF_BASE_PATH, { withFileTypes: true })
    const pdfDirs: { dir: string; relPath: string }[] = []
    for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const dir = entry.name
        const candidate = path.join(PDF_BASE_PATH, dir, `${dir}_paired.pdf`)
        if (fs.existsSync(candidate)) {
            // Store relative path with forward slashes for portability
            pdfDirs.push({ dir, relPath: `${dir}/${dir}_paired.pdf` })
        }
    }
    console.log(`Found ${pdfDirs.length} paired PDFs in ${PDF_BASE_PATH}`)

    // 2. Fetch all articles
    const { data: articles, error } = await supabase
        .from('articles')
        .select('id, title')
    if (error) throw new Error(`Failed to fetch articles: ${error.message}`)
    if (!articles) throw new Error('No articles returned')
    console.log(`Fetched ${articles.length} articles from DB`)

    // 3. Match by normalised title
    let updated = 0
    let unmatched: string[] = []
    for (const { dir, relPath } of pdfDirs) {
        const normDir = normalise(dir)
        const match = articles.find((a) => normalise(a.title) === normDir)
        if (!match) {
            unmatched.push(dir)
            continue
        }
        const { error: updateError } = await supabase
            .from('articles')
            .update({ paired_pdf_path: relPath })
            .eq('id', match.id)
        if (updateError) {
            console.error(`  ✗ Failed to update ${match.title}: ${updateError.message}`)
        } else {
            console.log(`  ✓ ${match.title} → ${relPath}`)
            updated++
        }
    }

    console.log(`\nDone. Updated: ${updated}/${pdfDirs.length}`)
    if (unmatched.length > 0) {
        console.log(`Unmatched PDF dirs (no article title match):`)
        unmatched.forEach((d) => console.log(`  - ${d}`))
    }
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
