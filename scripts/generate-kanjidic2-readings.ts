/**
 * scripts/generate-kanjidic2-readings.ts
 *
 * One-off generator: parses KANJIDIC2 XML and produces a compact JSON map
 * of kanji → { on: string[], kun: string[] }.
 *
 * KANJIDIC2: CC-BY-SA 4.0 (Electronic Dictionary Research and Development Group)
 * Source: http://www.edrdg.org/kanjidic/kanjidic2.xml
 *
 * Usage:
 *   npx tsx scripts/generate-kanjidic2-readings.ts [path-to-kanjidic2.xml]
 *
 * Output: lib/furigana/kanjidic2-readings.json (~1.5MB, gzipped ~200KB)
 *
 * Only the readings columns are retained; meanings, stroke counts, etc.
 * are discarded to keep the runtime map small. This JSON is loaded lazily
 * by the kanjidic2Fallback in annotate.ts — never bundled in the client.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEFAULT_XML_PATH = resolve(
    process.env.HOME ?? '/tmp',
    'kanjidic2.xml',
)

const xmlPath = process.argv[2] ?? DEFAULT_XML_PATH

interface KanjiEntry {
    literal: string
    on: string[]
    kun: string[]
}

function parseKanjidic2(xml: string): KanjiEntry[] {
    const entries: KanjiEntry[] = []

    // Match each <character> block
    const charRegex = /<character>([\s\S]*?)<\/character>/g
    let charMatch: RegExpExecArray | null

    while ((charMatch = charRegex.exec(xml)) !== null) {
        const block = charMatch[1]

        // Extract literal
        const litMatch = block.match(/<literal>(.+)<\/literal>/)
        if (!litMatch) continue
        const literal = litMatch[1]

        // Extract ON readings: <reading r_type="ja_on">X</reading>
        const onReadings: string[] = []
        const onRegex = /<reading r_type="ja_on">(.+?)<\/reading>/g
        let onMatch: RegExpExecArray | null
        while ((onMatch = onRegex.exec(block)) !== null) {
            // KANJIDIC2 stores ON readings in katakana
            onReadings.push(onMatch[1])
        }

        // Extract KUN readings: <reading r_type="ja_kun">X</reading>
        const kunReadings: string[] = []
        const kunRegex = /<reading r_type="ja_kun">(.+?)<\/reading>/g
        let kunMatch: RegExpExecArray | null
        while ((kunMatch = kunRegex.exec(block)) !== null) {
            // KUN readings have okurigana separated by '.' (e.g. "うご.く")
            kunReadings.push(kunMatch[1])
        }

        if (onReadings.length > 0 || kunReadings.length > 0) {
            entries.push({ literal, on: onReadings, kun: kunReadings })
        }
    }

    return entries
}

// ── Main ────────────────────────────────────────────────────────────────────

console.error(`Parsing ${xmlPath}…`)
const xml = readFileSync(xmlPath, 'utf-8')
const entries = parseKanjidic2(xml)

// Build a compact Map: literal → { on, kun }
const map: Record<string, { on: string[]; kun: string[] }> = {}
for (const e of entries) {
    map[e.literal] = { on: e.on, kun: e.kun }
}

const outPath = resolve(process.cwd(), 'lib/furigana/kanjidic2-readings.json')
writeFileSync(outPath, JSON.stringify(map), 'utf-8')

const count = Object.keys(map).length
const sizeKB = (Buffer.byteLength(JSON.stringify(map), 'utf-8') / 1024).toFixed(1)
console.error(`Wrote ${count} kanji entries to ${outPath} (${sizeKB} KB)`)
