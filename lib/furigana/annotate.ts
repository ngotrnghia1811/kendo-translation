/**
 * lib/furigana/annotate.ts — Main furigana annotation pipeline.
 *
 * Converts Japanese source_text into an ordered array of RubySpan entries
 * (kanji runs with hiragana readings + JLPT levels; non-kanji passthrough).
 *
 * The pipeline uses kuroshiro + kuromoji for morphological analysis. Both
 * are loaded via dynamic import and NEVER included in the Next.js client
 * bundle — this module is only imported by the Node.js precompute script
 * (scripts/precompute-furigana.ts).
 */

import type { RubySpan, RubyAnnotation, KanjiRubySpan, TextSpan } from './types'
import { getMaxJlptLevel } from './jlpt'

// ---------------------------------------------------------------------------
// CJS→ESM interop helpers for kuroshiro / kuromoji
// ---------------------------------------------------------------------------

/**
 * Dynamic import for kuroshiro (CJS package).
 * In ESM context, `import('kuroshiro')` returns { default: { default: <class> } }
 * because the CJS `module.exports` gets wrapped in an extra ESM `default` layer.
 * We unwrap both to reach the constructor.
 */
async function loadKuroshiro(): Promise<new () => import('kuroshiro')> {
    const mod = await import('kuroshiro')
    const inner = (mod as unknown as Record<string, unknown>).default as Record<string, unknown>
    return (inner.default ?? inner) as new () => import('kuroshiro')
}

async function loadKuromojiAnalyzer(): Promise<new (options?: Record<string, unknown>) => unknown> {
    const mod = await import('kuroshiro-analyzer-kuromoji')
    const inner = (mod as unknown as Record<string, unknown>).default as Record<string, unknown>
    return (inner.default ?? inner) as new (options?: Record<string, unknown>) => unknown
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

/** Katakana (U+30A0–U+30FF) */
function isKatakana(ch: string): boolean {
    const cp = ch.codePointAt(0) ?? 0
    return cp >= 0x30A0 && cp <= 0x30FF
}

/** Convert a katakana string to hiragana (simple offset mapping). */
function katakanaToHiragana(s: string): string {
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
            // Accumulate consecutive kanji.
            let j = i + 1
            while (j < text.length && isKanji(text[j])) j++
            runs.push({ text: text.slice(i, j), isKanji: true })
            i = j
        } else {
            // Accumulate consecutive non-kanji.
            let j = i + 1
            while (j < text.length && !isKanji(text[j])) j++
            runs.push({ text: text.slice(i, j), isKanji: false })
            i = j
        }
    }
    return runs
}

// ---------------------------------------------------------------------------
// Kuroshiro integration
// ---------------------------------------------------------------------------

/**
 * Get the reading for a kanji run using kuroshiro.
 *
 * Kuroshiro's `convert()` with mode="furigana" produces HTML, but we need
 * structured data. Instead, we use kuroshiro's internal tokenizer to get
 * readings for each token, then match them to our runs.
 *
 * Strategy: tokenize the full text, build a position→reading map, then
 * for each kanji run, look up the reading from the token(s) that overlap
 * its character range.
 */
interface TokenReading {
    surface: string    // surface form from tokenizer
    reading: string    // hiragana reading (kuroshiro converts katakana→hiragana)
    start: number      // character start position in original text
}

/**
 * Build a token→reading map for a text using kuroshiro.
 * Returns an array of {surface, reading, start} entries.
 */
export async function tokenizeWithKuroshiro(
    text: string,
): Promise<TokenReading[]> {
    const Kuroshiro = await loadKuroshiro()
    const KuromojiAnalyzer = await loadKuromojiAnalyzer()

    const kuroshiro = new Kuroshiro()
    await kuroshiro.init(new KuromojiAnalyzer())

    // Primary path: use kuroshiro._analyzer (kuromoji tokenizer).
    const analyzer = (kuroshiro as unknown as Record<string, unknown>)._analyzer as {
        parse: (text: string) => Promise<Array<{
            surface_form: string
            reading?: string
            word_position: number
        }>>
    } | null

    if (analyzer && typeof analyzer.parse === 'function') {
        const rawTokens = await analyzer.parse(text)
        const tokens: TokenReading[] = []
        let pos = 0
        for (const tok of rawTokens) {
            const readingRaw = tok.reading ?? tok.surface_form
            const reading = katakanaToHiragana(readingRaw)
            tokens.push({
                surface: tok.surface_form,
                reading,
                start: pos,
            })
            pos += tok.surface_form.length
        }
        return tokens
    }

    // Fallback: use kuroshiro.convert() with furigana mode, then parse HTML.
    return fallbackTokenize(kuroshiro, text)
}

/**
 * Fallback tokenizer using kuroshiro.convert() when internal API unavailable.
 * Converts to furigana HTML then parses out the readings.
 */
async function fallbackTokenize(
    kuroshiro: import('kuroshiro'),
    text: string,
): Promise<TokenReading[]> {
    const html = await kuroshiro.convert(text, {
        mode: 'furigana',
        to: 'hiragana',
    })

    // kuroshiro's furigana HTML includes <rp> fallback parenthesis:
    //   <ruby>剣道<rp>(</rp><rt>けんどう</rt><rp>)</rp></ruby>
    // Strip <rp> tags so we can parse <ruby>base<rt>reading</rt></ruby> cleanly.
    const cleaned = html.replace(/<rp>[^<]*<\/rp>/g, '')

    const tokens: TokenReading[] = []
    let sourceIdx = 0

    const rubyRe = /<ruby>([^<]*)<rt>([^<]*)<\/rt><\/ruby>/g
    let lastPlainEnd = 0

    let match: RegExpExecArray | null
    while ((match = rubyRe.exec(cleaned)) !== null) {
        // Plain text between last match and this ruby tag
        const plainChunk = cleaned.slice(lastPlainEnd, match.index)
        const plainText = plainChunk.replace(/<[^>]+>/g, '')
        for (const ch of plainText) {
            tokens.push({ surface: ch, reading: ch, start: sourceIdx })
            sourceIdx++
        }

        // Ruby-annotated kanji
        const base = match[1]
        const reading = match[2]
        tokens.push({ surface: base, reading, start: sourceIdx })
        sourceIdx += base.length

        lastPlainEnd = match.index + match[0].length
    }

    // Trailing plain text after last ruby tag
    const tailHtml = cleaned.slice(lastPlainEnd)
    const tailText = tailHtml.replace(/<[^>]+>/g, '')
    for (const ch of tailText) {
        tokens.push({ surface: ch, reading: ch, start: sourceIdx })
        sourceIdx++
    }

    return tokens
}

// ---------------------------------------------------------------------------
// Main annotation function
// ---------------------------------------------------------------------------

/**
 * Annotate a single Japanese text string with ruby readings.
 *
 * Returns a RubyAnnotation containing an ordered array of spans.
 * Non-kanji spans are passthrough; kanji spans carry hiragana readings
 * and JLPT levels.
 *
 * This function loads kuroshiro+kuromoji on first call (~200ms cold start);
 * subsequent calls on the same process reuse the cached tokenizer.
 */
let cachedKuroshiro: import('kuroshiro') | null = null

async function getKuroshiro(): Promise<import('kuroshiro')> {
    if (cachedKuroshiro) return cachedKuroshiro

    const Kuroshiro = await loadKuroshiro()
    const KuromojiAnalyzer = await loadKuromojiAnalyzer()

    const kuroshiro = new Kuroshiro()
    await kuroshiro.init(new KuromojiAnalyzer())
    cachedKuroshiro = kuroshiro
    return kuroshiro
}

export async function annotateText(text: string): Promise<RubyAnnotation> {
    if (!text || text.trim().length === 0) {
        return { source_text: text, spans: [] }
    }

    const tokens = await tokenizeWithKuroshiro(text)
    const spans: RubySpan[] = []

    // Build a position→reading map from tokens
    const readingMap = new Map<number, string>()
    for (const tok of tokens) {
        readingMap.set(tok.start, tok.reading)
    }

    // Segment into kanji/non-kanji runs and assign readings
    const runs = segmentRuns(text)

    for (const run of runs) {
        if (run.isKanji) {
            // Find the reading for this run from the token map
            const runStart = text.indexOf(run.text)
            const reading = readingMap.get(runStart) ?? run.text

            spans.push({
                type: 'kanji',
                base: run.text,
                reading: katakanaToHiragana(reading),
                jlptLevel: getMaxJlptLevel(run.text),
            } satisfies KanjiRubySpan)
        } else {
            spans.push({
                type: 'text',
                text: run.text,
            } satisfies TextSpan)
        }
    }

    return { source_text: text, spans }
}

/**
 * Batch-annotate multiple texts. Reuses the same kuroshiro instance.
 */
export async function annotateTexts(texts: string[]): Promise<RubyAnnotation[]> {
    // Warm up kuroshiro once
    await getKuroshiro()

    const results: RubyAnnotation[] = []
    for (const text of texts) {
        results.push(await annotateText(text))
    }
    return results
}
