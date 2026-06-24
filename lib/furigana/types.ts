/**
 * lib/furigana/types.ts — Ruby annotation types for the furigana pipeline.
 *
 * The annotation pipeline converts Japanese source_text into an ordered array
 * of spans. Kanji runs carry a hiragana reading + optional JLPT level;
 * non-kanji runs are plain passthrough text. The RubyText component consumes
 * this array to render <ruby> elements in the reader.
 */

/** JLPT difficulty level, N5 (easiest) → N1 (hardest). */
export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'

/** A span that requires a ruby annotation (kanji run with known reading). */
export interface KanjiRubySpan {
    type: 'kanji'
    /** The kanji run as it appears in the source text. */
    base: string
    /** Hiragana reading (Sudachi readingForm katakana → hiragana via katakanaToHiragana). */
    reading: string
    /**
     * Romaji reading derived from `reading` via wanakana.toRomaji().
     * Doubled-vowel Hepburn (kendou, not kendō) for font portability.
     * Absent on spans precomputed before the romaji feature was added (v1→v2).
     */
    romaji?: string
    /** JLPT level of the kanji, or null when the kanji is unmapped. */
    jlptLevel: JlptLevel | null
}

/** Display mode for the furigana/ruby toggle in reader settings. */
export type FuriganaMode = 'off' | 'furigana' | 'romaji'

/** A span of non-kanji text (kana, punctuation, digits, Latin, spaces). */
export interface TextSpan {
    type: 'text'
    /** Raw source text for this span. */
    text: string
}

/** Union of all span types in a ruby-annotated segment. */
export type RubySpan = KanjiRubySpan | TextSpan

/**
 * Complete ruby annotation for one segment.
 *
 * `spans` is an ordered array whose concatenation reproduces the original
 * `source_text`. Stored in the `ruby_data` JSONB column.
 */
export interface RubyAnnotation {
    /** The original source text this annotation was derived from. */
    source_text: string
    /** Ordered array of ruby/non-ruby spans. */
    spans: RubySpan[]
}

/**
 * Serialised form stored in the DB `ruby_data` column.
 * An array of RubyAnnotation entries, one per segment source_text.
 */
export type RubyData = RubyAnnotation[]
