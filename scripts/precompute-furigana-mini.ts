/**
 * scripts/precompute-furigana-mini.ts — Ultra-conservative drain for degraded DB.
 * Fetches via Management API, writes via Management API RPC.
 * Small batches, long pauses.
 * Usage: npx tsx scripts/precompute-furigana-mini.ts
 */

import { readFile } from 'node:fs/promises'
import { annotateTexts } from '../lib/furigana/index.js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BATCH = 10       // tiny batches for degraded free-tier DB
const PAUSE_MS = 30000 // 30s between batches
const MGMT_URL = 'https://api.supabase.com/v1/projects/mbgmyvmsvenvtecvrjia/database/query'

// ---------------------------------------------------------------------------
// Env + helpers
// ---------------------------------------------------------------------------
let _env: { token: string } | null = null
async function env() {
    if (_env) return _env
    const raw = await readFile('.env.local', 'utf-8')
    const token = raw.match(/SUPABASE_ACCESS_TOKEN="?(sbp_[^"\n]+)"?/)?.[1]
    if (!token) throw new Error('No SUPABASE_ACCESS_TOKEN')
    _env = { token }
    return _env
}

async function query(sql: string): Promise<any[]> {
    const e = await env()
    const r = await fetch(MGMT_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${e.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql }),
    })
    if (!r.ok) {
        const t = await r.text()
        throw new Error(`MGMT ${r.status}: ${t.slice(0, 300)}`)
    }
    return r.json()
}

function jsonbLiteral(obj: unknown): string {
    const json = JSON.stringify(obj)
    let tag = 'x'
    while (json.includes(`$${tag}$`)) tag += 'x'
    return `$${tag}$${json}$${tag}$::jsonb`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    const e = await env()
    console.log('Mini drain: BATCH=' + BATCH + ', pause=' + (PAUSE_MS/1000) + 's')

    // Warmup Sudachi
    console.log('Loading Sudachi…')
    await annotateTexts(['テスト'])
    console.log('Ready.\n')

    let cursor = ''
    let totalWritten = 0
    let batchNum = 0
    const wallStart = Date.now()

    while (true) {
        // Fetch next batch (id + source_text via cursor)
        let sql: string
        if (cursor) {
            sql = `SELECT id, source_text, ruby_data FROM segments WHERE source_lang='ja' AND id > '${cursor}' ORDER BY id LIMIT ${BATCH};`
        } else {
            sql = `SELECT id, source_text, ruby_data FROM segments WHERE source_lang='ja' ORDER BY id LIMIT ${BATCH};`
        }

        let rows: any[]
        try {
            rows = await query(sql)
        } catch (err) {
            console.error('Fetch error:', (err as Error).message)
            console.error('Pausing 60s before retry…')
            await new Promise(r => setTimeout(r, 60000))
            continue
        }

        if (!rows || rows.length === 0) {
            console.log('No more rows.')
            break
        }

        // Check if any need processing (ruby_data IS NULL)
        const needAnnot = rows.filter((r: any) => r.ruby_data === null)
        let written = 0

        if (needAnnot.length > 0) {
            const texts = needAnnot.map((r: any) => r.source_text as string)
            const annotations = await annotateTexts(texts)

            // Write via RPC
            const idList = needAnnot.map((r: any) => `'${r.id}'::uuid`).join(',')
            const jsonList = annotations.map(a => jsonbLiteral(a)).join(',')
            const writeSql = `SELECT bulk_update_ruby_data(ARRAY[${idList}]::uuid[], ARRAY[${jsonList}]::jsonb[]) AS cnt;`

            try {
                const result = await query(writeSql)
                written = result[0]?.cnt ?? 0
            } catch (err) {
                console.error('Write error:', (err as Error).message)
                // Don't advance cursor on write failure
                console.error('Retrying same batch after 30s…')
                await new Promise(r => setTimeout(r, 30000))
                continue
            }
        }

        // Advance cursor
        cursor = rows[rows.length - 1].id
        totalWritten += written
        batchNum++

        const wallS = ((Date.now() - wallStart) / 1000).toFixed(0)
        const status = needAnnot.length > 0
            ? `${needAnnot.length} need, ${written} written`
            : 'all done'
        console.log(`  #${batchNum}: ${rows.length} rows | ${status} | total ${totalWritten} | wall ${wallS}s | cursor ${cursor.slice(0,12)}`)

        // Long pause
        console.log(`  ── Pausing ${PAUSE_MS/1000}s ──`)
        await new Promise(r => setTimeout(r, PAUSE_MS))
    }

    const totalS = ((Date.now() - wallStart) / 1000).toFixed(0)
    console.log(`\nDone. ${totalWritten} rows written in ${totalS}s.`)
    console.log(`Cursor: ${cursor}`)
}

main().catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
})
