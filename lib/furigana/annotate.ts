/**
 * lib/furigana/annotate.ts — Main furigana annotation pipeline.
 *
 * Converts Japanese source_text into an ordered array of RubySpan entries
 * (kanji runs with hiragana readings + JLPT levels; non-kanji passthrough).
 *
 * ENGINE (v2): Sudachi WASM Mode C + wanakana romaji.
 *   SudachiStateless (from sudachi-wasm333, Apache 2.0) with bundled
 *   SudachiDict Small (~117 MB) provides compound-preserving tokenization
 *   with katakana readingForm. Romaji derived from hiragana via
 *   wanakana.toRomaji() (MIT, doubled-vowel Hepburn).
 *
 * The Sudachi WASM + dictionary are loaded via dynamic import and NEVER
 * included in the Next.js client bundle — this module is only imported by
 * the Node.js precompute script (scripts/precompute-furigana.ts).
 *
 * License notices:
 *   - Sudachi/SudachiDict — Apache 2.0 (WorksApplications)
 *   - wanakana — MIT (WaniKani/Tofugu)
 */

import type { RubySpan, RubyAnnotation, KanjiRubySpan, TextSpan } from './types'
import { getMaxJlptLevel } from './jlpt'

// ---------------------------------------------------------------------------
// Dynamic imports (kept out of client bundle)
// ---------------------------------------------------------------------------

type SudachiInstance = import('sudachi-wasm333').SudachiStateless
type TokenizeMode = typeof import('sudachi-wasm333').TokenizeMode

async function loadSudachi(): Promise<{
    SudachiStateless: new () => SudachiInstance
    TokenizeMode: TokenizeMode
}> {
    const mod = await import('sudachi-wasm333')
    return {
        SudachiStateless: mod.SudachiStateless,
        TokenizeMode: mod.TokenizeMode,
    }
}

async function loadWanakana(): Promise<{ toRomaji: (s: string) => string }> {
    const mod = await import('wanakana')
    return { toRomaji: mod.toRomaji }
}

// ---------------------------------------------------------------------------
// Character-range helpers
// ---------------------------------------------------------------------------

/** CJK Unified Ideographs block + Extension A (U+4E00–U+9FFF, U+3400–U+4DBF) */
function isKanji(ch: string): boolean {
    const cp = ch.codePointAt(0)
    if (cp === undefined) return false
    return (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF)
}

/** Hiragana (U+3040–U+309F) */
function isHiragana(ch: string): boolean {
    const cp = ch.codePointAt(0) ?? 0
    return cp >= 0x3040 && cp <= 0x309F
}

/** Convert a katakana string to hiragana (simple offset mapping). */
export function katakanaToHiragana(s: string): string {
    let result = ''
    for (const ch of s) {
        const cp = ch.codePointAt(0) ?? 0
        if (cp >= 0x30A1 && cp <= 0x30F6) {
            // Katakana → hiragana: subtract 0x60
            result += String.fromCodePoint(cp - 0x60)
        } else {
            result += ch
        }
    }
    return result
}

// ---------------------------------------------------------------------------
// Text segmentation — split into kanji / non-kanji runs
// ---------------------------------------------------------------------------

interface TextRun {
    text: string
    isKanji: boolean
}

function segmentRuns(text: string): TextRun[] {
    const runs: TextRun[] = []
    let i = 0
    while (i < text.length) {
        const ch = text[i]
        if (isKanji(ch)) {
            let j = i + 1
            while (j < text.length && isKanji(text[j])) j++
            runs.push({ text: text.slice(i, j), isKanji: true })
            i = j
        } else {
            let j = i + 1
            while (j < text.length && !isKanji(text[j])) j++
            runs.push({ text: text.slice(i, j), isKanji: false })
            i = j
        }
    }
    return runs
}

// ---------------------------------------------------------------------------
// Sudachi integration
// ---------------------------------------------------------------------------

interface TokenReading {
    surface: string     // surface form from tokenizer
    reading: string     // hiragana reading (converted from katakana readingForm)
    start: number       // character start position in original text
}

/**
 * Build a token→reading map for a text using Sudachi WASM Mode C.
 * Returns an array of {surface, reading, start} entries.
 *
 * The readings come from Sudachi's `readingForm` (katakana), converted
 * to hiragana via `katakanaToHiragana()`.
 */
export async function tokenizeWithSudachi(text: string): Promise<TokenReading[]> {
    const { SudachiStateless, TokenizeMode } = await loadSudachi()
    const sudachi = new SudachiStateless()

    // Use the bundled SudachiDict Small (117 MB, Apache 2.0).
    // Initialization loads the dict into WASM memory (~1.5s cold, cached thereafter).
    const fs = await import('node:fs')
    const path = await import('node:path')
    const { readFileSync } = fs

    // Resolve the bundled dict path using project root
    const sudachiPkgDir = path.join(process.cwd(), 'node_modules', 'sudachi-wasm333')
    const dictPath = path.join(sudachiPkgDir, 'resources', 'system.dic')

    await sudachi.initialize_node(readFileSync, dictPath)

    // Tokenize in Mode C (Named Entity — preserves compounds)
    const raw = sudachi.tokenize_stringified(text, TokenizeMode.C)
    const morphemes: Array<{
        surface: string
        reading_form: string
        begin: number
    }> = JSON.parse(raw)

    const tokens: TokenReading[] = []
    for (const m of morphemes) {
        const readingRaw = m.reading_form || m.surface
        const reading = katakanaToHiragana(readingRaw)
        tokens.push({
            surface: m.surface,
            reading,
            start: m.begin,
        })
    }

    // Free WASM memory
    sudachi.free()
    return tokens
}

// ---------------------------------------------------------------------------
// Reading-assignment safety: multi-token concatenation (§3.2)
// ---------------------------------------------------------------------------

/**
 * Convert a byte offset into a character offset for a UTF-8 string.
 * Japanese kanji are typically 3 bytes each in UTF-8.
 *
 * Example: "学生時代" → byte offsets 0,3,6,9 (3 bytes/char)
 *          → char offsets 0,1,2,3
 */
function byteToCharOffset(text: string, byteOffset: number): number {
    const buf = Buffer.from(text, 'utf-8')
    const slice = buf.subarray(0, byteOffset)
    return slice.toString('utf-8').length
}

/**
 * For a kanji run spanning character positions [runStart, runEnd) in the
 * original text, collect ALL token readings that overlap the run and
 * concatenate them.
 *
 * Sudachi's `begin` return field is a BYTE offset; tokens also carry a
 * `surface` string. We convert byte offsets to character offsets and match
 * tokens against kanji runs.
 *
 * This handles cases where Sudachi Mode C still splits a compound across
 * multiple tokens (e.g. 学生時代 → 学生 + 時代 → がくせい + じだい → がくせいじだい).
 */
function getCompoundReading(
    runStart: number,
    runEnd: number,
    tokens: TokenReading[],
    fullText: string,
): string | null {
    const parts: string[] = []
    for (const tok of tokens) {
        const tokCharStart = byteToCharOffset(fullText, tok.start)
        const tokCharEnd = tokCharStart + tok.surface.length
        // Token overlaps the kanji run
        if (tokCharStart >= runStart && tokCharEnd <= runEnd) {
            parts.push(tok.reading)
        }
    }
    if (parts.length === 0) return null
    return parts.join('')
}

// ---------------------------------------------------------------------------
// KANJIDIC2 per-character fallback (§3.2, §5)
// ---------------------------------------------------------------------------

/**
 * Per-character ON/KUN reading lookup for kanji that could not be mapped
 * by the tokenizer (token.reading === token.surface).
 *
 * TODO (Phase 5.4.3): Parse KANJIDIC2 XML → JSON kanji→reading map.
 *   - KANJIDIC2: CC-BY-SA 4.0, 13,108 kanji with ON/KUN readings
 *   - Parse to `Map<string, string[]>` mapping kanji → readings
 *   - When token reading equals surface (unrecognized), decompose to
 *     per-kanji lookups and pick the most likely ON reading
 *
 * For now, returns null (no fallback) — unmapped kanji keep their surface
 * form as the reading.
 */
function kanjidic2Fallback(_kanjiRun: string): string | null {
    return null
}

// ---------------------------------------------------------------------------
// Romaji generation
// ---------------------------------------------------------------------------

let cachedWanakana: { toRomaji: (s: string) => string } | null = null

async function getWanakana(): Promise<{ toRomaji: (s: string) => string }> {
    if (cachedWanakana) return cachedWanakana
    cachedWanakana = await loadWanakana()
    return cachedWanakana
}

/**
 * Convert hiragana to doubled-vowel Hepburn romaji.
 * Uses wanakana.toRomaji() with custom mapping to produce
 * doubled vowels (kendou, not kendō) for font portability.
 */
function hiraganaToRomaji(hiragana: string, wanakana: { toRomaji: (s: string) => string }): string {
    // wanakana.toRomaji produces macron-based output by default (kendō).
    // We use customRomajiMapping for doubled-vowel style (kendou).
    // However wanakana's API doesn't directly support custom mapping in toRomaji().
    // We post-process: replace macron vowels with doubled vowels.
    const romaji = wanakana.toRomaji(hiragana)
    return doubledVowelHepburn(romaji)
}

/**
 * Post-process wanakana output to convert macron-style long vowels
 * to doubled-vowel style for font portability.
 *
 * ō → ou, ū → uu, ā → aa, ē → ei (Hepburn convention), ī → ii
 */
function doubledVowelHepburn(romaji: string): string {
    return romaji
        .replace(/ō/g, 'ou')
        .replace(/ū/g, 'uu')
        .replace(/ā/g, 'aa')
        .replace(/ē/g, 'ei')
        .replace(/ī/g, 'ii')
}

// ---------------------------------------------------------------------------
// Cached Sudachi instance (reuse across annotateTexts batch)
// ---------------------------------------------------------------------------

let cachedSudachi: SudachiInstance | null = null
let cachedTokenizeMode: TokenizeMode | null = null

async function getSudachi(): Promise<{
    sudachi: SudachiInstance
    TokenizeMode: TokenizeMode
}> {
    if (cachedSudachi && cachedTokenizeMode) {
        return { sudachi: cachedSudachi, TokenizeMode: cachedTokenizeMode }
    }

    const { SudachiStateless, TokenizeMode } = await loadSudachi()
    const fs = await import('node:fs')
    const path = await import('node:path')

    const sudachi = new SudachiStateless()

    // Resolve the bundled dict path.
    // Use process.cwd() + node_modules path for robustness across ESM/CJS contexts.
    const pkgDir = path.join(process.cwd(), 'node_modules', 'sudachi-wasm333')
    const dictPath = path.join(pkgDir, 'resources', 'system.dic')
    await sudachi.initialize_node(fs.readFileSync, dictPath)

    cachedSudachi = sudachi
    cachedTokenizeMode = TokenizeMode
    return { sudachi, TokenizeMode }
}

/**
 * Tokenize a single text using the cached Sudachi instance.
 */
async function tokenizeWithCachedSudachi(text: string): Promise<TokenReading[]> {
    const { sudachi, TokenizeMode } = await getSudachi()
    const raw = sudachi.tokenize_stringified(text, TokenizeMode.C)
    const morphemes: Array<{
        surface: string
        reading_form: string
        begin: number
    }> = JSON.parse(raw)

    const tokens: TokenReading[] = []
    for (const m of morphemes) {
        const readingRaw = m.reading_form || m.surface
        const reading = katakanaToHiragana(readingRaw)
        tokens.push({
            surface: m.surface,
            reading,
            start: m.begin,
        })
    }
    return tokens
}

// ---------------------------------------------------------------------------
// Main annotation function
// ---------------------------------------------------------------------------

/**
 * Annotate a single Japanese text string with ruby readings and romaji.
 *
 * Returns a RubyAnnotation containing an ordered array of spans.
 * Non-kanji spans are passthrough; kanji spans carry hiragana readings,
 * romaji, and JLPT levels.
 *
 * On first call, loads Sudachi WASM + dictionary (~1.5s cold start).
 * Subsequent calls reuse the cached instance.
 */
export async function annotateText(text: string): Promise<RubyAnnotation> {
    if (!text || text.trim().length === 0) {
        return { source_text: text, spans: [] }
    }

    const tokens = await tokenizeWithCachedSudachi(text)
    const wanakana = await getWanakana()
    const spans: RubySpan[] = []

    // Build a position→reading map from tokens (character offsets, not byte)
    const readingMap = new Map<number, string>()
    for (const tok of tokens) {
        const charStart = byteToCharOffset(text, tok.start)
        readingMap.set(charStart, tok.reading)
    }

    // Segment into kanji/non-kanji runs (sequential, covering text without gaps)
    const runs = segmentRuns(text)

    // Cursor tracks character position across sequential runs.
    // Avoids text.indexOf(run.text) which returns the FIRST occurrence —
    // incorrect when the same kanji/run appears multiple times in the text.
    let cursor = 0

    for (const run of runs) {
        const runStart = cursor
        const runEnd = runStart + run.text.length

        if (run.isKanji) {
            // Find reading: try multi-token concatenation first, then position map
            let reading = getCompoundReading(runStart, runEnd, tokens, text)

            if (!reading) {
                reading = readingMap.get(runStart) ?? run.text
            }

            // Fallback: if tokenizer returned surface-as-reading, try KANJIDIC2
            if (reading === run.text || reading.length === 0) {
                const fallback = kanjidic2Fallback(run.text)
                if (fallback) reading = fallback
            }

            // Generate romaji from the hiragana reading
            const romaji = hiraganaToRomaji(reading, wanakana)

            spans.push({
                type: 'kanji',
                base: run.text,
                reading, // already hiragana (converted once in tokenizeWithCachedSudachi)
                romaji,
                jlptLevel: getMaxJlptLevel(run.text),
            } satisfies KanjiRubySpan)
        } else {
            spans.push({
                type: 'text',
                text: run.text,
            } satisfies TextSpan)
        }

        // Advance cursor past this run regardless of type
        cursor += run.text.length
    }

    return { source_text: text, spans }
}

/**
 * Batch-annotate multiple texts. Reuses the same Sudachi instance.
 */
export async function annotateTexts(texts: string[]): Promise<RubyAnnotation[]> {
    // Warm up Sudachi once
    await getSudachi()
    await getWanakana()

    const results: RubyAnnotation[] = []
    for (const text of texts) {
        results.push(await annotateText(text))
    }
    return results
}
