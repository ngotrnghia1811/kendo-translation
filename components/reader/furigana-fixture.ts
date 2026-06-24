/**
 * components/reader/furigana-fixture.ts — Sample furigana data for UI dev/testing.
 *
 * These fixtures let you visually verify RubyText rendering, toggle, and JLPT
 * filter behaviour BEFORE the live precompute pipeline is authorized and run.
 *
 * The spans reproduce what lib/furigana/annotate.ts would produce for the
 * given source_text strings.
 */

import type { RubySpan, RubyAnnotation } from '@/lib/furigana/types'

/** A single segment with kendo-related vocabulary at various JLPT levels. */
export const FIXTURE_ANNOTATION: RubyAnnotation = {
    source_text: '剣道の稽古では、面打ちや小手打ち、胴打ちを繰り返し練習します。',
    spans: [
        { type: 'kanji', base: '剣', reading: 'けん', romaji: 'ken', jlptLevel: 'N1' },
        { type: 'kanji', base: '道', reading: 'どう', romaji: 'dou', jlptLevel: 'N5' },
        { type: 'text', text: 'の' },
        { type: 'kanji', base: '稽', reading: 'けい', romaji: 'kei', jlptLevel: 'N1' },
        { type: 'kanji', base: '古', reading: 'こ', romaji: 'ko', jlptLevel: 'N5' },
        { type: 'text', text: 'では、' },
        { type: 'kanji', base: '面', reading: 'めん', romaji: 'men', jlptLevel: 'N4' },
        { type: 'kanji', base: '打', reading: 'う', romaji: 'u', jlptLevel: 'N3' },
        { type: 'text', text: 'ちや' },
        { type: 'kanji', base: '小', reading: 'こ', romaji: 'ko', jlptLevel: 'N5' },
        { type: 'kanji', base: '手', reading: 'て', romaji: 'te', jlptLevel: 'N4' },
        { type: 'kanji', base: '打', reading: 'う', romaji: 'u', jlptLevel: 'N3' },
        { type: 'text', text: 'ち、' },
        { type: 'kanji', base: '胴', reading: 'どう', romaji: 'dou', jlptLevel: 'N1' },
        { type: 'kanji', base: '打', reading: 'う', romaji: 'u', jlptLevel: 'N3' },
        { type: 'text', text: 'ちを' },
        { type: 'kanji', base: '繰', reading: 'く', romaji: 'ku', jlptLevel: 'N2' },
        { type: 'text', text: 'り' },
        { type: 'kanji', base: '返', reading: 'かえ', romaji: 'kae', jlptLevel: 'N4' },
        { type: 'text', text: 'し' },
        { type: 'kanji', base: '練習', reading: 'れんしゅう', romaji: 'renshuu', jlptLevel: 'N4' },
        { type: 'text', text: 'します。' },
    ],
}

/** A segment with mixed kanji and kana, including N5-level kanji. */
export const FIXTURE_SIMPLE: RubyAnnotation = {
    source_text: '私は毎日日本語を勉強しています。',
    spans: [
        { type: 'kanji', base: '私', reading: 'わたし', romaji: 'watashi', jlptLevel: 'N5' },
        { type: 'text', text: 'は' },
        { type: 'kanji', base: '毎', reading: 'まい', romaji: 'mai', jlptLevel: 'N5' },
        { type: 'kanji', base: '日', reading: 'にち', romaji: 'nichi', jlptLevel: 'N5' },
        { type: 'kanji', base: '日本', reading: 'にほん', romaji: 'nihon', jlptLevel: 'N5' },
        { type: 'kanji', base: '語', reading: 'ご', romaji: 'go', jlptLevel: 'N5' },
        { type: 'text', text: 'を' },
        { type: 'kanji', base: '勉強', reading: 'べんきょう', romaji: 'benkyou', jlptLevel: 'N4' },
        { type: 'text', text: 'しています。' },
    ],
}

/** A segment with a mix of JLPT levels for filter testing. */
export const FIXTURE_MIXED_LEVELS: RubyAnnotation = {
    source_text: '気剣体一致で打突する。',
    spans: [
        { type: 'kanji', base: '気', reading: 'き', romaji: 'ki', jlptLevel: 'N5' },
        { type: 'kanji', base: '剣', reading: 'けん', romaji: 'ken', jlptLevel: 'N1' },
        { type: 'kanji', base: '体', reading: 'たい', romaji: 'tai', jlptLevel: 'N4' },
        { type: 'kanji', base: '一', reading: 'いっ', romaji: 'i', jlptLevel: 'N5' },
        { type: 'kanji', base: '致', reading: 'ち', romaji: 'chi', jlptLevel: 'N2' },
        { type: 'text', text: 'で' },
        { type: 'kanji', base: '打', reading: 'だ', romaji: 'da', jlptLevel: 'N3' },
        { type: 'kanji', base: '突', reading: 'とつ', romaji: 'totsu', jlptLevel: 'N3' },
        { type: 'text', text: 'する。' },
    ],
}

/** A segment with NO kanji — should render as plain text. */
export const FIXTURE_NO_KANJI: RubyAnnotation = {
    source_text: 'こんにちは、ありがとうございます。',
    spans: [
        { type: 'text', text: 'こんにちは、ありがとうございます。' },
    ],
}

/**
 * Fixture with romaji BUT NO hiragana reading — simulates old v1 spans
 * that were precomputed before the romaji field was added.
 * In romaji mode, these should render plain text (graceful).
 */
export const FIXTURE_NO_ROMAJI: RubyAnnotation = {
    source_text: '剣道と居合',
    spans: [
        { type: 'kanji', base: '剣', reading: 'けん', jlptLevel: 'N1' },
        { type: 'kanji', base: '道', reading: 'どう', jlptLevel: 'N5' },
        { type: 'text', text: 'と' },
        { type: 'kanji', base: '居', reading: 'い', jlptLevel: 'N2' },
        { type: 'kanji', base: '合', reading: 'あい', jlptLevel: 'N4' },
    ],
}

/** Complete segment data fixtures (used in Playwright tests). */
export const FIXTURE_SEGMENTS = [
    { ...FIXTURE_ANNOTATION },
    { ...FIXTURE_SIMPLE },
    { ...FIXTURE_MIXED_LEVELS },
    { ...FIXTURE_NO_KANJI },
    { ...FIXTURE_NO_ROMAJI },
]

/**
 * Returns the fixture annotation for a given 0-based index.
 * Wraps around for easy stress-testing.
 */
export function getFixtureAnnotation(index: number): RubyAnnotation {
    return FIXTURE_SEGMENTS[index % FIXTURE_SEGMENTS.length]
}
