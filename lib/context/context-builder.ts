/**
 * MAC-RAG Context Builder
 * Phase 1: Build the full ContextObject from source text.
 */

import { analyzeDomain, analyzeStyle, extractEntities, extractKeyTerms, estimateComplexity } from './analyzers';

export type SourceLanguage = 'ja' | 'en';
export type TargetLanguage = 'ja' | 'en';

export type DomainType = 'kendo' | 'martial_arts' | 'technical' | 'general';
export type FormalityLevel = 'formal' | 'semi_formal' | 'casual' | 'colloquial';
export type ToneType = 'instructional' | 'narrative' | 'conversational' | 'technical';

export interface Entity {
  text: string;
  type: 'term' | 'person' | 'organization' | 'technique' | 'equipment';
  translation?: string;
  confidence: number;
}

export interface DomainClassification {
  primary: DomainType;
  secondary?: DomainType;
  confidence: number;
  indicators: string[];
}

export interface StyleProfile {
  formality: FormalityLevel;
  tone: ToneType;
  audience: 'beginner' | 'intermediate' | 'advanced' | 'general';
  keigoLevel?: 'sonkeigo' | 'teineigo' | 'kenjogo' | 'casual';
}

export interface ContextObject {
  sourceText: string;
  sourceLang: SourceLanguage;
  targetLang: TargetLanguage;
  domain: DomainClassification;
  style: StyleProfile;
  entities: Entity[];
  keyTerms: string[];
  segmentCount: number;
  estimatedComplexity: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface BuildContextOptions {
  sourceText: string;
  sourceLang?: SourceLanguage;
  targetLang?: TargetLanguage;
}

export function detectLanguage(text: string): SourceLanguage {
  const jaRanges = [
    /[\u3040-\u309F]/,  // Hiragana
    /[\u30A0-\u30FF]/,  // Katakana
    /[\u4E00-\u9FFF]/,  // CJK Unified Ideographs
    /[\u3400-\u4DBF]/,  // CJK Extension A
  ];

  for (const range of jaRanges) {
    if (range.test(text)) return 'ja';
  }
  return 'en';
}

export function countSegments(text: string, lang: SourceLanguage): number {
  if (lang === 'ja') {
    return (text.match(/[。！？]/g) || []).length + 1;
  }
  return (text.match(/[.!?]/g) || []).length + 1;
}

export async function buildContext(options: BuildContextOptions): Promise<ContextObject> {
  const { sourceText } = options;
  const sourceLang = options.sourceLang || detectLanguage(sourceText);
  const targetLang = options.targetLang || (sourceLang === 'ja' ? 'en' : 'ja');

  const domain = analyzeDomain(sourceText, sourceLang);
  const style = analyzeStyle(sourceText, sourceLang);
  const entities = extractEntities(sourceText, sourceLang);
  const keyTerms = extractKeyTerms(sourceText, sourceLang);
  const segmentCount = countSegments(sourceText, sourceLang);
  const estimatedComplexity = estimateComplexity(sourceText, sourceLang, entities.length);

  return {
    sourceText,
    sourceLang,
    targetLang,
    domain,
    style,
    entities,
    keyTerms,
    segmentCount,
    estimatedComplexity,
    createdAt: new Date(),
  };
}

export function serializeContext(context: ContextObject): string {
  return JSON.stringify({
    ...context,
    createdAt: context.createdAt.toISOString(),
  });
}

export function deserializeContext(json: string): ContextObject {
  const raw = JSON.parse(json);
  return { ...raw, createdAt: new Date(raw.createdAt) };
}
