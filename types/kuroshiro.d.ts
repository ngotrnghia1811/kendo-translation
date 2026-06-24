/**
 * Minimal type declarations for kuroshiro and kuroshiro-analyzer-kuromoji.
 * These packages are only used in Node.js precompute scripts and are never
 * imported in client/server bundles. The declarations satisfy TypeScript
 * strict mode without adding @types packages.
 */

declare module 'kuroshiro' {
    interface KuroshiroConvertOptions {
        mode?: 'normal' | 'spaced' | 'okurigana' | 'furigana'
        to?: 'hiragana' | 'katakana' | 'romaji'
        romajiSystem?: 'nippon' | 'passport' | 'hepburn'
        delimiter_start?: string
        delimiter_end?: string
    }

    interface KuroshiroAnalyzer {
        parse(text: string): Promise<unknown[]>
    }

    class Kuroshiro {
        init(analyzer: unknown): Promise<void>
        convert(text: string, options?: KuroshiroConvertOptions): Promise<string>
        _analyzer: KuroshiroAnalyzer | null
    }

    namespace Kuroshiro {
        namespace Util {
            function isHiragana(ch: string): boolean
            function isKatakana(ch: string): boolean
            function isKana(ch: string): boolean
            function isKanji(ch: string): boolean
            function isJapanese(ch: string): boolean
            function hasHiragana(str: string): boolean
            function hasKatakana(str: string): boolean
            function hasKana(str: string): boolean
            function hasKanji(str: string): boolean
            function hasJapanese(str: string): boolean
            function kanaToHiragna(str: string): string
            function kanaToKatakana(str: string): string
            function romajiToHiragana(str: string): string
            function romajiToKatakana(str: string): string
        }
    }

    export = Kuroshiro
}

declare module 'kuroshiro-analyzer-kuromoji' {
    interface KuromojiAnalyzerOptions {
        dicPath?: string
    }

    class KuromojiAnalyzer {
        constructor(options?: KuromojiAnalyzerOptions)
    }

    export = KuromojiAnalyzer
}
