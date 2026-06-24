/**
 * lib/furigana/index.ts — Public API for the furigana annotation pipeline.
 *
 * Usage (Node.js precompute script only — never imported in the browser):
 *
 *   import { annotateText, annotateTexts } from '@/lib/furigana'
 *   const result = await annotateText('日本語のテスト')
 *   // result.spans: [{type:'kanji', base:'日本', reading:'にほん', jlptLevel:'N5'}, …]
 */

export { annotateText, annotateTexts } from './annotate'
export { getJlptLevel, getMaxJlptLevel, passesJlptFilter } from './jlpt'
export type {
    JlptLevel,
    KanjiRubySpan,
    TextSpan,
    RubySpan,
    RubyAnnotation,
    RubyData,
} from './types'
