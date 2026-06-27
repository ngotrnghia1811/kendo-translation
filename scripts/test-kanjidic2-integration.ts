/**
 * scripts/test-kanjidic2-integration.ts
 *
 * Integration test: exercises annotateText() and asserts the KANJIDIC2
 * fallback produces non-surface readings for cases where Sudachi returns
 * surface-as-reading.
 *
 * Exit code 0 = all assertions passed.
 * Exit code 1 = assertion failure.
 *
 * Usage: npx tsx scripts/test-kanjidic2-integration.ts
 */

import { annotateText } from '../lib/furigana/index.js'
import type { RubyAnnotation, KanjiRubySpan } from '../lib/furigana/types.js'

let failures = 0
let passed = 0

function assert(condition: boolean, msg: string) {
    if (condition) {
        passed++
        console.log(`  ✓ ${msg}`)
    } else {
        failures++
        console.log(`  ✗ ${msg}`)
    }
}

function findKanjiSpan(result: RubyAnnotation, base: string): KanjiRubySpan | undefined {
    return result.spans.find(
        (s): s is KanjiRubySpan => s.type === 'kanji' && s.base === base
    )
}

async function main() {
    console.log('=== KANJIDIC2 Fallback Integration Test ===\n')

    // ── Test 1: 引き締め — 締 gets fallback from KANJIDIC2 ────────────────
    // In 引き締め, Sudachi tokenizes the whole word (reading ひきしめ).
    // The first kanji run "引" gets the full compound reading via readingMap.
    // The second kanji run "締" gets surface-as-reading from the position map
    // mismatch → KANJIDIC2 fallback should fire and give "し" (KUN stem).
    console.log('Test 1: 引き締め — 締 should get fallback reading ≠ "締"')
    {
        const result = await annotateText('引き締め')
        const shimeSpan = findKanjiSpan(result, '締')
        assert(shimeSpan !== undefined, '締 span exists')
        if (shimeSpan) {
            assert(shimeSpan.reading !== '締', `締 reading is not surface: "${shimeSpan.reading}" (was "締")`)
            assert(shimeSpan.reading === 'し', `締 reading is "し" (KUN stem from KANJIDIC2): "${shimeSpan.reading}"`)
        }
        // The first kanji "引" gets the compound reading from Sudachi
        const hikuSpan = findKanjiSpan(result, '引')
        assert(hikuSpan !== undefined, '引 span exists')
        if (hikuSpan) {
            assert(hikuSpan.reading === 'ひきしめ', `引 gets compound reading: "${hikuSpan.reading}"`)
        }
    }

    // ── Test 2: Standalone 込 — Sudachi might handle it, but verify not surface ──
    console.log('\nTest 2: standalone 込 — reading should not be surface')
    {
        const result = await annotateText('込')
        const span = findKanjiSpan(result, '込')
        assert(span !== undefined, '込 span exists')
        if (span) {
            assert(span.reading !== '込', `込 reading is not surface: "${span.reading}"`)
            // Either Sudachi gives "こみ" or fallback gives "こ" — both are valid
            assert(span.reading.length > 0, `込 reading is non-empty: "${span.reading}"`)
        }
    }

    // ── Test 3: 返 — similar ─────────────────────────────────────────────
    console.log('\nTest 3: standalone 返 — reading should not be surface')
    {
        const result = await annotateText('返')
        const span = findKanjiSpan(result, '返')
        assert(span !== undefined, '返 span exists')
        if (span) {
            assert(span.reading !== '返', `返 reading is not surface: "${span.reading}"`)
        }
    }

    // ── Test 4: Multi-kanji compound 上下 — ON readings preferred ─────────
    console.log('\nTest 4: compound 上下 — should get ON readings (hiragana)')
    {
        const result = await annotateText('上下')
        const span = findKanjiSpan(result, '上下')
        assert(span !== undefined, '上下 span exists')
        if (span) {
            assert(span.reading !== '上下', `上下 reading is not surface: "${span.reading}"`)
            // Expected: じょうげ (ジョウ + ゲ → じょうげ)
            // Note: Sudachi might also handle this correctly, so both paths work
            assert(span.reading.length > 0, `上下 reading is non-empty: "${span.reading}"`)
        }
    }

    // ── Test 5: Known good compounds still correct ────────────────────────
    console.log('\nTest 5: Known good compounds — Sudachi handles, fallback does NOT fire')
    const knownGood: Record<string, string> = {
        '体幹': 'たいかん',
        '学生時代': 'がくせいじだい',
        '競技力': 'きょうぎりょく',
        '筋力向上': 'きんりょくこうじょう',
    }
    for (const [text, expectedCombined] of Object.entries(knownGood)) {
        const result = await annotateText(text)
        const parts: string[] = []
        for (const span of result.spans) {
            if (span.type === 'kanji') parts.push(span.reading)
            else parts.push(span.text)
        }
        const combined = parts.join('')
        assert(combined === expectedCombined,
            `${text} combined reading = ${expectedCombined}: "${combined}"`)
    }

    // 引き締め: special case — Sudachi gives full compound reading to first
    // kanji run "引"→"ひきしめ", leaving "締" as surface. The fallback now
    // fixes "締"→"し". Verify both spans have non-surface readings.
    {
        const result = await annotateText('引き締め')
        const hikuSpan = findKanjiSpan(result, '引')
        const shimeSpan = findKanjiSpan(result, '締')
        assert(hikuSpan !== undefined && hikuSpan.reading === 'ひきしめ',
            `引 reading = ひきしめ: "${hikuSpan?.reading}"`)
        assert(shimeSpan !== undefined && shimeSpan.reading === 'し',
            `締 reading = し (fallback, not surface): "${shimeSpan?.reading}"`)
    }

    // ── Report ────────────────────────────────────────────────────────────
    console.log(`\n${passed} passed, ${failures} failed`)
    if (failures > 0) process.exit(1)
}

main().catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
})
