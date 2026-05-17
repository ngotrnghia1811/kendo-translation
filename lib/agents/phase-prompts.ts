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

export function translatePrompt(sourceText: string): { system: string; user: string } {
  const system = joinRules([
    'Task: produce an initial English translation of the Japanese source segment below.',
  ]);
  const user = `Japanese source:\n${sourceText}`;
  return { system, user };
}

export function editPrompt(sourceText: string, currentTarget: string): { system: string; user: string } {
  const system = joinRules([
    'Task: edit the existing English translation for accuracy and fluency against the Japanese source.',
    'Make corrections where meaning, terminology, or grammar are off; leave well-translated portions intact.',
  ]);
  const user = `Japanese source:\n${sourceText}\n\nCurrent English translation:\n${currentTarget}`;
  return { system, user };
}

export function proofreadPrompt(sourceText: string, currentTarget: string): { system: string; user: string } {
  const system = joinRules([
    'Task: proofread the English translation for surface polish — punctuation, typography, capitalization, consistency, and minor stylistic issues.',
    'Preserve all meaning and word choices; do not retranslate. Only adjust surface form.',
  ]);
  const user = `Japanese source:\n${sourceText}\n\nEnglish translation to proofread:\n${currentTarget}`;
  return { system, user };
}

export type AgentPhase = 'translate' | 'edit' | 'proofread';

export function isAgentPhase(v: unknown): v is AgentPhase {
  return v === 'translate' || v === 'edit' || v === 'proofread';
}
