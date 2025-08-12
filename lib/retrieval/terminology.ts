/**
 * MAC-RAG Terminology Module
 * Layer 3: Terminology database integration with enforcement rules
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface TermEntry {
  id: string;
  japaneseTerm: string;
  englishTerm: string;
  domain: string;
  type: 'required' | 'preferred' | 'do_not_translate' | 'forbidden';
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase';
  notes?: string;
  examples?: string[];
  alternatives?: string[];
  confidence: number;
}

export interface TerminologyConstraints {
  requiredTerms: TermEntry[];
  preferredTerms: TermEntry[];
  doNotTranslate: TermEntry[];
  forbiddenTerms: TermEntry[];
}

export interface TermSearchOptions {
  text: string;
  sourceLang: 'ja' | 'en';
  domain?: string;
  includeAlternatives?: boolean;
}

export interface TermSearchResult {
  foundTerms: TermEntry[];
  constraints: TerminologyConstraints;
  coverage: number;
  missingTerms: string[];
}

const KENDO_TERMINOLOGY: Omit<TermEntry, 'id'>[] = [
  { japaneseTerm: '剣道', englishTerm: 'kendo', domain: 'kendo', type: 'do_not_translate', partOfSpeech: 'noun', confidence: 1.0 },
  { japaneseTerm: '竹刀', englishTerm: 'shinai', domain: 'kendo', type: 'required', partOfSpeech: 'noun', confidence: 1.0 },
  { japaneseTerm: '面', englishTerm: 'men', domain: 'kendo', type: 'required', partOfSpeech: 'noun', confidence: 1.0 },
  { japaneseTerm: '小手', englishTerm: 'kote', domain: 'kendo', type: 'required', partOfSpeech: 'noun', confidence: 1.0 },
  { japaneseTerm: '胴', englishTerm: 'do', domain: 'kendo', type: 'required', partOfSpeech: 'noun', confidence: 1.0 },
  { japaneseTerm: '垂れ', englishTerm: 'tare', domain: 'kendo', type: 'required', partOfSpeech: 'noun', confidence: 1.0 },
  { japaneseTerm: '防具', englishTerm: 'bogu', domain: 'kendo', type: 'required', partOfSpeech: 'noun', confidence: 1.0 },
  { japaneseTerm: '木刀', englishTerm: 'bokuto', domain: 'kendo', type: 'required', partOfSpeech: 'noun', alternatives: ['bokken'], confidence: 1.0 },
  { japaneseTerm: '構え', englishTerm: 'kamae', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'stance/posture', confidence: 1.0 },
  { japaneseTerm: '中段', englishTerm: 'chudan', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'middle stance', confidence: 1.0 },
  { japaneseTerm: '上段', englishTerm: 'jodan', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'high stance', confidence: 1.0 },
  { japaneseTerm: '素振り', englishTerm: 'suburi', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'practice swing', confidence: 1.0 },
  { japaneseTerm: '稽古', englishTerm: 'keiko', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'practice/training', confidence: 1.0 },
  { japaneseTerm: '地稽古', englishTerm: 'ji-geiko', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'free practice', confidence: 1.0 },
  { japaneseTerm: '切り返し', englishTerm: 'kiri-kaeshi', domain: 'kendo', type: 'required', partOfSpeech: 'noun', confidence: 1.0 },
  { japaneseTerm: '打ち込み', englishTerm: 'uchikomi', domain: 'kendo', type: 'required', partOfSpeech: 'noun', confidence: 1.0 },
  { japaneseTerm: '残心', englishTerm: 'zanshin', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'remaining spirit', confidence: 1.0 },
  { japaneseTerm: '気剣体', englishTerm: 'ki-ken-tai', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'spirit-sword-body unity', confidence: 1.0 },
  { japaneseTerm: '気合い', englishTerm: 'kiai', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'fighting spirit/shout', confidence: 1.0 },
  { japaneseTerm: '間合い', englishTerm: 'maai', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'distance/interval', confidence: 1.0 },
  { japaneseTerm: '礼', englishTerm: 'rei', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'bow/respect', confidence: 1.0 },
  { japaneseTerm: '礼法', englishTerm: 'reiho', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'etiquette', confidence: 1.0 },
  { japaneseTerm: '足さばき', englishTerm: 'ashi-sabaki', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'footwork', confidence: 1.0 },
  { japaneseTerm: '踏み込み', englishTerm: 'fumikomi', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'stamping step', confidence: 1.0 },
  { japaneseTerm: '送り足', englishTerm: 'okuri-ashi', domain: 'kendo', type: 'required', partOfSpeech: 'noun', notes: 'sliding step', confidence: 1.0 },
  { japaneseTerm: '先生', englishTerm: 'sensei', domain: 'kendo', type: 'do_not_translate', partOfSpeech: 'noun', confidence: 1.0 },
  { japaneseTerm: '師範', englishTerm: 'shihan', domain: 'kendo', type: 'do_not_translate', partOfSpeech: 'noun', confidence: 1.0 },
];

export async function searchTerminology(
  supabase: SupabaseClient,
  options: TermSearchOptions
): Promise<TermSearchResult> {
  const { text, sourceLang, domain } = options;

  let dbTerms: TermEntry[] = [];
  try {
    let query = supabase.from('terminology').select('*');
    if (domain) query = query.eq('domain', domain);

    const { data, error } = await query.limit(500);

    if (!error && data) {
      dbTerms = data.map((row: {
        id: string; japanese_term: string; english_term: string;
        domain?: string; type?: string; part_of_speech?: string;
        notes?: string; alternatives?: string[]; confidence?: number;
      }) => ({
        id: row.id,
        japaneseTerm: row.japanese_term,
        englishTerm: row.english_term,
        domain: row.domain || 'general',
        type: (row.type as TermEntry['type']) || 'preferred',
        partOfSpeech: row.part_of_speech as TermEntry['partOfSpeech'],
        notes: row.notes,
        alternatives: row.alternatives,
        confidence: row.confidence || 0.8,
      }));
    }
  } catch (err) {
    console.error('Terminology DB error:', err);
  }

  const allTerms: TermEntry[] = [
    ...dbTerms,
    ...KENDO_TERMINOLOGY.map((t, i) => ({ ...t, id: `builtin-${i}` })),
  ];

  const termMap = new Map<string, TermEntry>();
  for (const term of allTerms) {
    const key = sourceLang === 'ja' ? term.japaneseTerm : term.englishTerm;
    if (!termMap.has(key)) termMap.set(key, term);
  }

  const foundTerms: TermEntry[] = [];
  const searchText = text.toLowerCase();

  for (const term of termMap.values()) {
    const searchTerm = sourceLang === 'ja' ? term.japaneseTerm : term.englishTerm;
    if (!searchTerm) continue;
    if (text.includes(searchTerm) || searchText.includes(searchTerm.toLowerCase())) {
      foundTerms.push(term);
    }
  }

  const constraints: TerminologyConstraints = {
    requiredTerms: foundTerms.filter(t => t.type === 'required'),
    preferredTerms: foundTerms.filter(t => t.type === 'preferred'),
    doNotTranslate: foundTerms.filter(t => t.type === 'do_not_translate'),
    forbiddenTerms: foundTerms.filter(t => t.type === 'forbidden'),
  };

  return {
    foundTerms,
    constraints,
    coverage: foundTerms.length / Math.max(termMap.size, 1),
    missingTerms: [],
  };
}

export function formatTerminologyForPrompt(constraints: TerminologyConstraints): string {
  const lines: string[] = [];

  if (constraints.requiredTerms.length > 0) {
    lines.push('REQUIRED TRANSLATIONS (use these exact translations):');
    for (const term of constraints.requiredTerms) {
      lines.push(`  ${term.japaneseTerm} → ${term.englishTerm}${term.notes ? ` (${term.notes})` : ''}`);
    }
    lines.push('');
  }

  if (constraints.doNotTranslate.length > 0) {
    lines.push('DO NOT TRANSLATE (keep as romanized Japanese):');
    for (const term of constraints.doNotTranslate) {
      lines.push(`  ${term.japaneseTerm} → ${term.englishTerm}`);
    }
    lines.push('');
  }

  if (constraints.preferredTerms.length > 0) {
    lines.push('PREFERRED TRANSLATIONS (use when applicable):');
    for (const term of constraints.preferredTerms) {
      lines.push(`  ${term.japaneseTerm} → ${term.englishTerm}`);
    }
    lines.push('');
  }

  if (constraints.forbiddenTerms.length > 0) {
    lines.push('FORBIDDEN (do not use these translations):');
    for (const term of constraints.forbiddenTerms) {
      lines.push(`  ${term.japaneseTerm} ≠ ${term.englishTerm}`);
    }
  }

  return lines.join('\n');
}

export function validateTerminologyCompliance(
  translation: string,
  constraints: TerminologyConstraints
): { compliant: boolean; violations: string[]; score: number } {
  const violations: string[] = [];
  const translationLower = translation.toLowerCase();

  let requiredFound = 0;
  for (const term of constraints.requiredTerms) {
    if (translationLower.includes(term.englishTerm.toLowerCase())) {
      requiredFound++;
    } else {
      violations.push(`Missing required term: "${term.englishTerm}" for "${term.japaneseTerm}"`);
    }
  }

  for (const term of constraints.doNotTranslate) {
    if (!translationLower.includes(term.englishTerm.toLowerCase())) {
      violations.push(`Should preserve: "${term.englishTerm}" for "${term.japaneseTerm}"`);
    }
  }

  for (const term of constraints.forbiddenTerms) {
    if (translationLower.includes(term.englishTerm.toLowerCase())) {
      violations.push(`Forbidden term used: "${term.englishTerm}"`);
    }
  }

  const totalRequired = constraints.requiredTerms.length + constraints.doNotTranslate.length;
  const score = totalRequired > 0 ? requiredFound / totalRequired : 1.0;

  return { compliant: violations.length === 0, violations, score };
}
