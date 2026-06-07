/**
 * System prompt builders for per-phase agent suggestions.
 *
 * Each builder returns a system message instructing the model to output
 * ONLY the revised English target text — no preamble, no JSON wrapper, no
 * commentary. The route then inserts that text verbatim (trimmed) as a
 * pending `segment_suggestions` row with `suggester_kind='agent'`.
 *
 * The prompts are deliberately conservative: kendo-specific romanizations
 * (men, kote, do, tsuki, kiai, kamae, etc.) are preserved as-is; only
 * common Japanese-script terms are translated.
 */

const COMMON_RULES = [
  'You are a translation assistant for a Japanese kendo literature co-translation platform.',
  'Output ONLY the revised English target text. Do not include any preamble, explanation, JSON, markdown, or quotation marks around the result.',
  'Preserve standard kendo romanizations (men, kote, dō, tsuki, kiai, kamae, seme, zanshin, etc.) without translating them.',
  'Maintain a formal, literary register appropriate for kendo instructional and historical texts.',
];

function joinRules(extra: string[]): string {
  return [...COMMON_RULES, ...extra].join('\n');
}

function langLabel(lang: 'en' | 'zh'): string {
  return lang === 'zh' ? 'Chinese' : 'English';
}

export function translatePrompt(sourceText: string, targetLang?: 'en' | 'zh'): { system: string; user: string } {
  const label = langLabel(targetLang ?? 'en');
  const system = joinRules([
    `Task: produce an initial ${label} translation of the Japanese source segment below.`,
  ]);
  const user = `Japanese source:\n${sourceText}`;
  return { system, user };
}

export function editPrompt(sourceText: string, currentTarget: string, targetLang?: 'en' | 'zh'): { system: string; user: string } {
  const label = langLabel(targetLang ?? 'en');
  const system = joinRules([
    `Task: edit the existing ${label} translation for accuracy and fluency against the Japanese source.`,
    'Make corrections where meaning, terminology, or grammar are off; leave well-translated portions intact.',
  ]);
  const user = `Japanese source:\n${sourceText}\n\nCurrent ${label} translation:\n${currentTarget}`;
  return { system, user };
}

export function proofreadPrompt(sourceText: string, currentTarget: string, targetLang?: 'en' | 'zh'): { system: string; user: string } {
  const label = langLabel(targetLang ?? 'en');
  const system = joinRules([
    `Task: proofread the ${label} translation for surface polish — punctuation, typography, capitalization, consistency, and minor stylistic issues.`,
    'Preserve all meaning and word choices; do not retranslate. Only adjust surface form.',
  ]);
  const user = `Japanese source:\n${sourceText}\n\n${label} translation to proofread:\n${currentTarget}`;
  return { system, user };
}

export type AgentPhase = 'translate' | 'edit' | 'proofread';

export function isAgentPhase(v: unknown): v is AgentPhase {
  return v === 'translate' || v === 'edit' || v === 'proofread';
}

/**
 * QA advisory prompt.
 *
 * Returns a JSON array of candidate qa_issue objects for the translator to
 * review.  The agent never writes to qa_issues directly (cooperation
 * invariant); these are proposals that the human triages via
 * POST /api/segments/[id]/qa-issues.
 *
 * Output schema (strict JSON array, no prose):
 *   [
 *     {
 *       "category": "<one of the 7 QAIssueCategory values>",
 *       "severity": "minor" | "major" | "critical",
 *       "body": "<1–2 sentence explanation>",
 *       "char_start": <0-based char offset in target, or null>,
 *       "char_end": <exclusive end offset, or null>
 *     }
 *   ]
 * Return an empty array [] if no issues are found.
 */
export function qaPrompt(sourceText: string, targetText: string, targetLang?: 'en' | 'zh'): { system: string; user: string } {
  const label = langLabel(targetLang ?? 'en');
  const CATEGORIES = [
    'Mistranslation',
    'Terminology',
    'Register/Keigo',
    'Fluency',
    'Cultural-adaptation',
    'Omission/Addition',
    'Style',
  ].join(' | ');

  const system = [
    'You are a QA reviewer for a Japanese kendo literature co-translation platform.',
    'I propose; I never commit.  Your findings are advisory — a human translator decides which to accept.',
    '',
    `Review the ${label} translation against the Japanese source and return a JSON array of qa_issue candidates.`,
    `Each item must have: category (${CATEGORIES}), severity (minor|major|critical), body (1-2 sentence explanation), char_start (0-based index into target text or null), char_end (exclusive end index or null).`,
    'Return ONLY valid JSON — no preamble, no markdown, no backticks. If no issues are found, return an empty array [].',
    '',
    'Guidelines:',
    '- Mistranslation: meaning in target differs significantly from source.',
    '- Terminology: kendo or martial-arts term is mistranslated or inconsistent (e.g. men/kote/dō/tsuki should stay romanised).',
    '- Register/Keigo: register (formal/informal/honorific) does not match the source.',
    '- Fluency: text is grammatically awkward or unnatural.',
    '- Cultural-adaptation: cultural nuance is lost or misrepresented.',
    '- Omission/Addition: content is missing from or added to the translation without justification.',
    '- Style: punctuation, capitalisation, or typographic inconsistency.',
    '',
    'Be concise and precise. Do not invent issues. Major = changes meaning; critical = fundamentally wrong.',
  ].join('\n');

  const user = `Japanese source:\n${sourceText}\n\n${label} translation:\n${targetText}`;
  return { system, user };
}

