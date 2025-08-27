/**
 * MAC-RAG JA→EN Agent
 * Layer 4: Japanese-specific handling for translation
 * - Subject inference from verb forms
 * - Honorific (keigo) transformation
 * - Sentence structure transformation (SOV→SVO)
 */

export interface SubjectInference {
  inferredSubject: string;
  confidence: number;
  source: 'verb_form' | 'context' | 'honorific' | 'default';
  originalVerb?: string;
  explanation: string;
}

export interface HonorificAnalysis {
  level: 'sonkeigo' | 'kenjogo' | 'teineigo' | 'casual' | 'mixed';
  targetRegister: 'formal' | 'polite' | 'neutral' | 'casual';
  transformations: Array<{ original: string; transformed: string; type: string }>;
}

export interface StructureAnalysis {
  sentenceType: 'simple' | 'compound' | 'complex' | 'fragment';
  clauses: number;
  needsRestructuring: boolean;
  suggestions: string[];
}

export interface JaEnAnalysis {
  subjects: SubjectInference[];
  honorifics: HonorificAnalysis;
  structure: StructureAnalysis;
  specialHandling: Array<{
    type: 'onomatopoeia' | 'idiom' | 'culture_specific' | 'wordplay';
    text: string;
    suggestion: string;
  }>;
}

const VERB_SUBJECT_PATTERNS: Array<{
  pattern: RegExp;
  subject: string;
  confidence: number;
  source: SubjectInference['source'];
}> = [
  { pattern: /くれ[るたて]/, subject: 'someone (to me/us)', confidence: 0.85, source: 'verb_form' },
  { pattern: /もらっ?[たてう]/, subject: 'I/we (receiving)', confidence: 0.85, source: 'verb_form' },
  { pattern: /あげ[るたて]/, subject: 'I/we (giving)', confidence: 0.80, source: 'verb_form' },
  { pattern: /いただ[きくい]/, subject: 'I/we (humble receiving)', confidence: 0.90, source: 'honorific' },
  { pattern: /くださ[いるっ]/, subject: 'you/they (respectful giving)', confidence: 0.90, source: 'honorific' },
  { pattern: /と思[いう]/, subject: 'I', confidence: 0.85, source: 'verb_form' },
  { pattern: /したい/, subject: 'I', confidence: 0.80, source: 'verb_form' },
  { pattern: /つもり/, subject: 'I', confidence: 0.75, source: 'verb_form' },
  { pattern: /てください/, subject: 'you (please do)', confidence: 0.90, source: 'verb_form' },
  { pattern: /なさい/, subject: 'you (command)', confidence: 0.85, source: 'verb_form' },
  { pattern: /れる$/, subject: 'subject (passive/potential)', confidence: 0.60, source: 'verb_form' },
  { pattern: /られる$/, subject: 'subject (passive/potential)', confidence: 0.60, source: 'verb_form' },
];

const KEIGO_PATTERNS = {
  sonkeigo: [
    { pattern: /いらっしゃ[いるれ]/, description: 'respectful いる/行く/来る' },
    { pattern: /おっしゃ[いるれ]/, description: 'respectful 言う' },
    { pattern: /ご覧にな[るれり]/, description: 'respectful 見る' },
    { pattern: /召し上が[るれり]/, description: 'respectful 食べる/飲む' },
    { pattern: /お\S+にな[るれり]/, description: 'respectful お〜になる form' },
  ],
  kenjogo: [
    { pattern: /いたし[ます]/, description: 'humble する' },
    { pattern: /申し[ますあげ上]/, description: 'humble 言う' },
    { pattern: /参り[ます]/, description: 'humble 行く/来る' },
    { pattern: /おり[ます]/, description: 'humble いる' },
    { pattern: /させていただ[きく]/, description: 'humble させてもらう' },
    { pattern: /拝[見読聴]/, description: 'humble 見る/読む/聞く' },
  ],
  teineigo: [
    { pattern: /です$/, description: 'polite copula' },
    { pattern: /ます$/, description: 'polite verb ending' },
    { pattern: /ました$/, description: 'polite past' },
    { pattern: /でしょう$/, description: 'polite presumptive' },
    { pattern: /ございます/, description: 'very polite あります' },
  ],
};

const KENDO_ONOMATOPOEIA: Record<string, string> = {
  'ドン': 'with a thud',
  'バシッ': 'with a sharp crack',
  'シュッ': 'with a swift motion',
  'ビシッ': 'with a crisp snap',
  'ザッ': 'with a sliding sound',
  'パン': 'with a pop',
  'スッ': 'smoothly',
  'サッ': 'quickly/swiftly',
  'グッ': 'firmly',
  'キリッ': 'sharply/crisply',
};

export function detectKeigoLevel(text: string): HonorificAnalysis {
  const transformations: HonorificAnalysis['transformations'] = [];
  let sonkeigoCount = 0;
  let kenjogoCount = 0;
  let teineigoCount = 0;

  for (const { pattern, description } of KEIGO_PATTERNS.sonkeigo) {
    const matches = text.match(pattern);
    if (matches) {
      sonkeigoCount++;
      transformations.push({ original: matches[0], transformed: `[respectful: ${description}]`, type: 'sonkeigo' });
    }
  }

  for (const { pattern, description } of KEIGO_PATTERNS.kenjogo) {
    const matches = text.match(pattern);
    if (matches) {
      kenjogoCount++;
      transformations.push({ original: matches[0], transformed: `[humble: ${description}]`, type: 'kenjogo' });
    }
  }

  for (const { pattern } of KEIGO_PATTERNS.teineigo) {
    if (pattern.test(text)) teineigoCount++;
  }

  let level: HonorificAnalysis['level'];
  let targetRegister: HonorificAnalysis['targetRegister'];

  if (sonkeigoCount > 0 || kenjogoCount > 0) {
    level = sonkeigoCount > kenjogoCount ? 'sonkeigo' : kenjogoCount > sonkeigoCount ? 'kenjogo' : 'mixed';
    targetRegister = 'formal';
  } else if (teineigoCount > 0) {
    level = 'teineigo';
    targetRegister = 'polite';
  } else {
    level = 'casual';
    targetRegister = 'neutral';
  }

  return { level, targetRegister, transformations };
}

export function inferSubjects(text: string): SubjectInference[] {
  const inferences: SubjectInference[] = [];
  const segments = text.split(/[。、]/);

  for (const segment of segments) {
    if (!segment.trim()) continue;

    for (const { pattern, subject, confidence, source } of VERB_SUBJECT_PATTERNS) {
      const match = segment.match(pattern);
      if (match) {
        inferences.push({
          inferredSubject: subject,
          confidence,
          source,
          originalVerb: match[0],
          explanation: `Inferred from verb form "${match[0]}"`,
        });
        break;
      }
    }
  }

  return inferences;
}

export function analyzeStructure(text: string): StructureAnalysis {
  const clauses = (text.match(/[。、！？]/g) || []).length + 1;
  const hasNestedClauses = /が.*が|を.*を|に.*に/.test(text);
  const hasRelativeClauses = /（.*）|「.*」/.test(text);
  const isLongSentence = text.length > 100;

  let sentenceType: StructureAnalysis['sentenceType'] = 'simple';
  if (clauses > 3 || hasNestedClauses) sentenceType = 'complex';
  else if (clauses > 1) sentenceType = 'compound';

  const needsRestructuring = sentenceType === 'complex' || isLongSentence;
  const suggestions: string[] = [];
  if (isLongSentence) suggestions.push('Consider splitting into multiple sentences');
  if (hasNestedClauses) suggestions.push('Multiple particles detected - clarify relationships');
  if (hasRelativeClauses) suggestions.push('Contains embedded clauses - may need reordering');

  return { sentenceType, clauses, needsRestructuring, suggestions };
}

export function detectOnomatopoeia(text: string): JaEnAnalysis['specialHandling'] {
  const handling: JaEnAnalysis['specialHandling'] = [];

  for (const [ono, translation] of Object.entries(KENDO_ONOMATOPOEIA)) {
    if (text.includes(ono)) {
      handling.push({ type: 'onomatopoeia', text: ono, suggestion: translation });
    }
  }

  return handling;
}

export function analyzeJaForTranslation(text: string): JaEnAnalysis {
  return {
    subjects: inferSubjects(text),
    honorifics: detectKeigoLevel(text),
    structure: analyzeStructure(text),
    specialHandling: detectOnomatopoeia(text),
  };
}

export function generateTranslationGuidance(analysis: JaEnAnalysis): string {
  const lines: string[] = [];

  if (analysis.subjects.length > 0) {
    lines.push('## Subject Inference');
    for (const subj of analysis.subjects) {
      lines.push(`- "${subj.originalVerb}" → inferred subject: "${subj.inferredSubject}" (${Math.round(subj.confidence * 100)}%)`);
    }
    lines.push('');
  }

  lines.push('## Register Guidance');
  lines.push(`- Source keigo level: ${analysis.honorifics.level}`);
  lines.push(`- Target English register: ${analysis.honorifics.targetRegister}`);
  if (analysis.honorifics.transformations.length > 0) {
    lines.push('- Detected honorific forms:');
    for (const t of analysis.honorifics.transformations) {
      lines.push(`  - ${t.original} ${t.transformed}`);
    }
  }
  lines.push('');

  if (analysis.structure.needsRestructuring) {
    lines.push('## Structure Notes');
    lines.push(`- Sentence type: ${analysis.structure.sentenceType} (${analysis.structure.clauses} clauses)`);
    for (const sug of analysis.structure.suggestions) {
      lines.push(`- ${sug}`);
    }
    lines.push('');
  }

  if (analysis.specialHandling.length > 0) {
    lines.push('## Special Handling');
    for (const item of analysis.specialHandling) {
      lines.push(`- ${item.type}: "${item.text}" → "${item.suggestion}"`);
    }
  }

  return lines.join('\n');
}
