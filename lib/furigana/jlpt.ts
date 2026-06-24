/**
 * lib/furigana/jlpt.ts — JLPT-level lookup for kanji.
 *
 * Maps individual kanji characters to their JLPT level (N5–N1) using a
 * bundled static dataset. Unmapped kanji return null — the pipeline
 * stores the reading but leaves jlptLevel blank.
 */

import type { JlptLevel } from './types'

// ---------------------------------------------------------------------------
// Bundled dataset — see lib/furigana/jlpt-data.json
// ---------------------------------------------------------------------------

import jlptData from './jlpt-data.json'

const kanjiToLevel = new Map<string, JlptLevel>(
    Object.entries(jlptData) as [string, JlptLevel][]
)

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the JLPT level for a single kanji character, or null if unmapped.
 */
export function getJlptLevel(kanji: string): JlptLevel | null {
    if (kanji.length !== 1) return null
    return kanjiToLevel.get(kanji) ?? null
}

/**
 * Return the highest (most difficult) JLPT level among multiple kanji,
 * or null if none are mapped. Used to assign a single level to a kanji run
 * (multi-character compound).
 */
export function getMaxJlptLevel(kanjiRun: string): JlptLevel | null {
    const levels: JlptLevel[] = []
    for (const ch of kanjiRun) {
        const lvl = kanjiToLevel.get(ch)
        if (lvl) levels.push(lvl)
    }
    if (levels.length === 0) return null
    // N1 is "highest" difficulty — return the maximum level found.
    return levels.reduce((max, l) => (compareLevel(l, max) > 0 ? l : max))
}

/** Numeric comparison: N5=0 … N1=4. Returns >0 if a > b in difficulty. */
function compareLevel(a: JlptLevel, b: JlptLevel): number {
    const order: Record<JlptLevel, number> = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 }
    return order[a] - order[b]
}

/**
 * Returns true when a kanji with the given JLPT level should display
 * furigana based on the user's minimum-difficulty filter.
 *
 * Semantics: the user sets `furiganaJlptMinLevel` (e.g. N3), and furigana
 * is shown for kanji at or above that difficulty (N3, N2, N1). Kanji below
 * the threshold (N5, N4) are assumed known and rendered without ruby.
 *
 * A null `kanjiLevel` (unmapped kanji) always passes the filter.
 */
export function passesJlptFilter(
    kanjiLevel: JlptLevel | null,
    minLevel: JlptLevel | null,
): boolean {
    if (minLevel === null) return true // no filter set → show all
    if (kanjiLevel === null) return true // unmapped → show (can't judge difficulty)
    return compareLevel(kanjiLevel, minLevel) >= 0
}
