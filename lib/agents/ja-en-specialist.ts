/**
 * JA-EN Specialist Agent
 *
 * Ported from MAC-RAG/src/agents/ja_en_specialist.py
 * Handles JA→EN specific linguistic challenges:
 * 1. Subject Resolution - Infer omitted subjects from context
 * 2. Honorific Transformation - Map Japanese keigo to English register
 * 3. Onomatopoeia Rendering - Convert giongo/gitaigo to English
 * 4. Character Voice - Preserve personality markers
 */

import { agentChat } from '@/lib/llm/provider'
import onomatopoeiaData from '@/lib/data/onomatopoeia.json'

// Types
export interface SubjectResolution {
    sentence: string
    inferredSubject: string
    confidence: number
    reasoning: string
}

export interface HonorificMapping {
    japanese: string
    name: string
    suffix: string
    englishRendering: string
    strategy: string
}

export interface OnomatopoeiaRendering {
    japanese: string
    category: string
    englishOptions: string[]
    recommended: string
}

export interface CharacterVoice {
    firstPersonPronouns: Array<{
        pronoun: string
        gender: string
        register: string
        tone: string
    }>
    endingParticles: Array<{
        particle: string
        meaning: string
        tone: string
    }>
    voiceGuidance: string
}

export interface JAENAnalysis {
    subjectResolutions: SubjectResolution[]
    honorificMappings: HonorificMapping[]
    onomatopoeiaRenderings: OnomatopoeiaRendering[]
    structureSuggestions: Array<{ sentenceIndex: number; suggestion: string }>
    characterVoice: CharacterVoice
    keigoLevel: 'formal_respectful' | 'formal_humble' | 'polite' | 'casual'
    enhancedPrompt: string
}

// Honorific mapping dictionary
const HONORIFIC_MAPPINGS: Record<string, { formal: string; informal: string; retain: string }> = {
    'さん': { formal: 'Mr./Ms.', informal: '', retain: '-san' },
    '様': { formal: 'Mr./Ms.', informal: '', retain: '-sama' },
    '先生': { formal: 'Dr./Professor', informal: 'Teacher', retain: '-sensei' },
    '君': { formal: '', informal: '', retain: '-kun' },
    'ちゃん': { formal: '', informal: '', retain: '-chan' },
    '殿': { formal: 'Lord/Lady', informal: '', retain: '-dono' },
}

// Keigo patterns
const KEIGO_PATTERNS = {
    sonkeigo: ['いらっしゃる', 'おっしゃる', 'ご覧になる', 'なさる', '召し上がる'],
    kenjougo: ['参る', '申す', '存じる', 'いたす', '拝見する'],
    teineigo: ['です', 'ます', 'ございます'],
}

// First-person pronouns
const FIRST_PERSON_PRONOUNS: Record<string, { gender: string; register: string; tone: string }> = {
    '俺': { gender: 'male', register: 'rough/masculine', tone: 'assertive' },
    '僕': { gender: 'male', register: 'boyish/modest', tone: 'humble' },
    '私': { gender: 'neutral', register: 'standard/polite', tone: 'neutral' },
    'あたし': { gender: 'female', register: 'casual/feminine', tone: 'casual' },
    'わたくし': { gender: 'neutral', register: 'very formal', tone: 'refined' },
    '拙者': { gender: 'male', register: 'archaic/samurai', tone: 'theatrical' },
    'わし': { gender: 'male', register: 'elderly/regional', tone: 'old-fashioned' },
}

// Ending particles
const ENDING_PARTICLES: Record<string, { meaning: string; tone: string }> = {
    'ね': { meaning: 'seeking agreement', tone: 'friendly/confirmatory' },
    'よ': { meaning: 'assertive/informative', tone: 'emphatic' },
    'わ': { meaning: 'feminine/soft', tone: 'gentle' },
    'ぞ': { meaning: 'masculine/emphatic', tone: 'strong' },
    'さ': { meaning: 'casual assertion', tone: 'offhand' },
    'かな': { meaning: 'wondering', tone: 'thoughtful' },
}

/**
 * Analyze Japanese text for translation-relevant features
 */
export async function analyzeJAEN(
    sourceText: string,
    options: { honorificStrategy?: 'retain' | 'map' | 'contextual' } = {}
): Promise<JAENAnalysis> {
    const { honorificStrategy = 'contextual' } = options

    const [subjectResolutions, honorificMappings, onomatopoeiaRenderings] = await Promise.all([
        resolveSubjects(sourceText),
        Promise.resolve(analyzeHonorifics(sourceText, honorificStrategy)),
        Promise.resolve(renderOnomatopoeia(sourceText)),
    ])

    const structureSuggestions = analyzeSentenceStructure(sourceText)
    const characterVoice = detectCharacterVoice(sourceText)
    const keigoLevel = detectKeigoLevel(sourceText)

    const enhancedPrompt = buildEnhancedPrompt(
        subjectResolutions,
        honorificMappings,
        onomatopoeiaRenderings,
        characterVoice
    )

    return {
        subjectResolutions,
        honorificMappings,
        onomatopoeiaRenderings,
        structureSuggestions,
        characterVoice,
        keigoLevel,
        enhancedPrompt,
    }
}

/**
 * Resolve omitted subjects using LLM
 */
async function resolveSubjects(text: string): Promise<SubjectResolution[]> {
    const systemPrompt = `You are a Japanese language expert. Analyze the following Japanese text and identify:
1. Any sentences with omitted subjects
2. The likely subject based on:
   - Verb forms (くれる/あげる/もらう patterns)
   - Honorific markers (respectful forms = addressee, humble forms = speaker)
   - Context from surrounding sentences

Return JSON array of resolutions:
[{
  "sentence": "the Japanese sentence",
  "inferredSubject": "who/what is doing the action",
  "confidence": 0.0-1.0,
  "reasoning": "why this subject was inferred"
}]

If all subjects are explicit, return empty array [].`

    const userPrompt = `Analyze this Japanese text for omitted subjects:\n\n${text}\n\nReturn JSON array of subject resolutions.`

    try {
        const response = await agentChat('ja_en_specialist', [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ], { temperature: 0.2, responseFormat: 'json' })

        return JSON.parse(response.content)
    } catch {
        return []
    }
}

/**
 * Detect honorific suffixes and determine English rendering
 */
function analyzeHonorifics(text: string, strategy: string): HonorificMapping[] {
    const honorificsFound: HonorificMapping[] = []

    const patterns: Array<[RegExp, string]> = [
        [/(\w+)(さん)/g, 'さん'],
        [/(\w+)(様)/g, '様'],
        [/(\w+)(先生)/g, '先生'],
        [/(\w+)(君)/g, '君'],
        [/(\w+)(ちゃん)/g, 'ちゃん'],
        [/(\w+)(殿)/g, '殿'],
    ]

    for (const [pattern, suffix] of patterns) {
        const matches = text.matchAll(pattern)
        for (const match of matches) {
            const name = match[1]
            const mapping = HONORIFIC_MAPPINGS[suffix] || { formal: '', informal: '', retain: '' }

            let englishRendering: string
            if (strategy === 'retain') {
                englishRendering = `${name}${mapping.retain}`
            } else if (strategy === 'map') {
                englishRendering = `${mapping.formal} ${name}`.trim()
            } else {
                // Contextual: prefer retain for Kendo content
                englishRendering = `${name}${mapping.retain}`
            }

            honorificsFound.push({
                japanese: `${name}${suffix}`,
                name,
                suffix,
                englishRendering,
                strategy,
            })
        }
    }

    return honorificsFound
}

/**
 * Detect and render onomatopoeia
 */
function renderOnomatopoeia(text: string): OnomatopoeiaRendering[] {
    const renderings: OnomatopoeiaRendering[] = []

    for (const [category, data] of Object.entries(onomatopoeiaData)) {
        const categoryData = data as { description?: string; entries?: Record<string, string | string[]> }
        if (!categoryData.entries) continue

        for (const [japanese, englishOptions] of Object.entries(categoryData.entries)) {
            if (text.includes(japanese)) {
                const options = Array.isArray(englishOptions) ? englishOptions : [englishOptions]
                renderings.push({
                    japanese,
                    category,
                    englishOptions: options,
                    recommended: options[0],
                })
            }
        }
    }

    return renderings
}

/**
 * Analyze sentence structure for SOV→SVO transformation
 */
function analyzeSentenceStructure(text: string): Array<{ sentenceIndex: number; suggestion: string }> {
    const suggestions: Array<{ sentenceIndex: number; suggestion: string }> = []
    const sentences = text.split('。').filter(s => s.trim())

    sentences.forEach((sentence, i) => {
        if (sentence.length > 50) {
            suggestions.push({
                sentenceIndex: i,
                suggestion: 'Consider breaking into multiple English sentences (long Japanese sentence with possible nested clauses)',
            })
        }
    })

    return suggestions
}

/**
 * Detect character voice markers
 */
function detectCharacterVoice(text: string): CharacterVoice {
    const detectedPronouns: CharacterVoice['firstPersonPronouns'] = []
    const endingParticles: CharacterVoice['endingParticles'] = []

    for (const [pronoun, traits] of Object.entries(FIRST_PERSON_PRONOUNS)) {
        if (text.includes(pronoun)) {
            detectedPronouns.push({ pronoun, ...traits })
        }
    }

    for (const [particle, info] of Object.entries(ENDING_PARTICLES)) {
        if (text.includes(particle)) {
            endingParticles.push({ particle, ...info })
        }
    }

    return {
        firstPersonPronouns: detectedPronouns,
        endingParticles,
        voiceGuidance: generateVoiceGuidance(detectedPronouns, endingParticles),
    }
}

/**
 * Generate English voice rendering guidance
 */
function generateVoiceGuidance(
    pronouns: CharacterVoice['firstPersonPronouns'],
    particles: CharacterVoice['endingParticles']
): string {
    if (!pronouns.length && !particles.length) {
        return 'Standard neutral voice'
    }

    const guidance: string[] = []

    if (pronouns.length) {
        const pronoun = pronouns[0]
        if (pronoun.register === 'rough/masculine') {
            guidance.push('Use direct, confident language')
        } else if (pronoun.register === 'boyish/modest') {
            guidance.push('Use modest, slightly humble phrasing')
        } else if (pronoun.register === 'casual/feminine') {
            guidance.push('Use casual, warm language')
        } else if (pronoun.register === 'very formal') {
            guidance.push('Use formal, refined vocabulary')
        }
    }

    for (const p of particles) {
        if (p.particle === 'ね') {
            guidance.push('Add conversational tags (right?, you know?)')
        } else if (p.particle === 'よ') {
            guidance.push('Use emphatic phrasing')
        }
    }

    return guidance.length ? guidance.join('; ') : 'Standard neutral voice'
}

/**
 * Detect keigo (politeness) level
 */
function detectKeigoLevel(text: string): JAENAnalysis['keigoLevel'] {
    const scores = { sonkeigo: 0, kenjougo: 0, teineigo: 0 }

    for (const [level, patterns] of Object.entries(KEIGO_PATTERNS)) {
        for (const pattern of patterns) {
            if (text.includes(pattern)) {
                scores[level as keyof typeof scores]++
            }
        }
    }

    if (scores.sonkeigo > 0) return 'formal_respectful'
    if (scores.kenjougo > 0) return 'formal_humble'
    if (scores.teineigo > 0) return 'polite'
    return 'casual'
}

/**
 * Build enhanced prompt for translation
 */
function buildEnhancedPrompt(
    subjects: SubjectResolution[],
    honorifics: HonorificMapping[],
    onomatopoeia: OnomatopoeiaRendering[],
    voice: CharacterVoice
): string {
    const sections: string[] = []

    if (subjects.length) {
        const subjectText = ['## Subject Resolution']
        for (const s of subjects) {
            subjectText.push(`- "${s.sentence}" → Subject: ${s.inferredSubject}`)
        }
        sections.push(subjectText.join('\n'))
    }

    if (honorifics.length) {
        const honorificText = ['## Honorific Handling']
        for (const h of honorifics) {
            honorificText.push(`- ${h.japanese} → ${h.englishRendering}`)
        }
        sections.push(honorificText.join('\n'))
    }

    if (onomatopoeia.length) {
        const onoText = ['## Onomatopoeia Rendering']
        for (const o of onomatopoeia) {
            onoText.push(`- ${o.japanese} → ${o.recommended}`)
        }
        sections.push(onoText.join('\n'))
    }

    if (voice.voiceGuidance && voice.voiceGuidance !== 'Standard neutral voice') {
        sections.push(`## Voice Guidance\n${voice.voiceGuidance}`)
    }

    return sections.join('\n\n')
}
