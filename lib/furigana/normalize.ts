/**
 * Defensive normalisation for `ruby_data` returned by the PocketBase
 * `article-bilingual-window` custom hook.
 *
 * The hook SELECTs the `ruby_data` JSON column and returns it inside a
 * `DynamicModel` declared with `nullString()`. In PB v0.39 the hook's
 * JS-side `parseJson` does not actually parse the value — it comes back
 * over the wire as a **JSON string**, not an object. The app must accept
 * both forms and normalise so `<ruby>` rendering works regardless of
 * whether the hook was redeployed with a working parser.
 */

/** Loose span shape matching `PageSegment.ruby_data` (all fields optional). */
export interface RubyDataSpan {
  type: 'text' | 'kanji'
  text?: string
  base?: string
  reading?: string
  romaji?: string
  jlptLevel?: string
}

export interface NormalizedRubyData {
  spans: RubyDataSpan[]
}

export function normalizeRubyData(raw: unknown): NormalizedRubyData | null {
  if (!raw) return null

  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }

  if (typeof parsed !== 'object' || parsed === null) return null
  const spans = (parsed as { spans?: unknown }).spans
  if (!Array.isArray(spans)) return null

  return { spans: spans.filter(isSpanLike) }
}

function isSpanLike(value: unknown): value is RubyDataSpan {
  return typeof value === 'object' && value !== null && 'type' in (value as object)
}
