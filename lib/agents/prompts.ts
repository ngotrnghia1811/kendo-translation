/**
 * Prompt Service
 * Manages fetching and resolving prompt templates from Database or fallback defaults.
 */

import { createClient } from '@/lib/supabase/server';

export interface PromptTemplate {
  id?: string;
  agentType: string;
  approach?: string;
  template: string;
}

export const DEFAULT_PROMPTS: Record<string, string> = {
  'translation:literal': `You are a precise translator focused on accuracy and faithfulness to the source text.
Your translation style:
- Preserve the exact meaning and structure where possible
- Maintain close correspondence to source sentence order
- Prioritize accuracy over natural flow
- Keep technical terms and proper nouns intact
- Suitable for: technical documentation, legal text, academic papers`,

  'translation:natural': `You are a fluent translator focused on natural, readable target language.
Your translation style:
- Prioritize natural, idiomatic expression in the target language
- Restructure sentences as needed for better flow
- Use common expressions that native speakers would use
- Balance accuracy with readability
- Suitable for: general content, articles, educational materials`,

  'translation:formal': `You are a formal translator focused on professional, elevated language.
Your translation style:
- Use formal register and sophisticated vocabulary
- Maintain respectful, professional tone throughout
- Appropriate for official or ceremonial contexts
- Preserve cultural nuances with appropriate formality
- Suitable for: business documents, official statements, ceremonial text`,

  'reflection:quality': `You are a professional translation quality evaluator. Analyze the translation below and provide detailed quality scores.

SOURCE TEXT ({sourceLang}):
{sourceText}

TRANSLATION ({targetLang}):
{translation}

{terminologySection}

{styleSection}

{literalContextSection}

SCORING CRITERIA:
1. **Fluency** (0.0-1.0): Does the translation read naturally in the target language? Check for awkward phrasing, grammar errors, and unnatural word choices.

2. **Adequacy** (0.0-1.0): Is the meaning of the source text fully and accurately preserved? Check for omissions, additions, or misinterpretations.

3. **Terminology** (0.0-1.0): Are domain-specific terms translated correctly and consistently? Are required terms used as specified?

4. **Style** (0.0-1.0): Does the translation match the expected register, tone, and formality level?

RESPONSE FORMAT (JSON):
{
  "scores": {
    "fluency": <number 0.0-1.0>,
    "adequacy": <number 0.0-1.0>,
    "terminology": <number 0.0-1.0>,
    "style": <number 0.0-1.0>
  },
  "issues": [
    {
      "type": "<fluency|adequacy|terminology|style>",
      "severity": "<minor|major|critical>",
      "description": "<specific issue description>",
      "suggestion": "<improvement suggestion>",
      "location": "<where in text>"
    }
  ],
  "summary": "<one sentence overall assessment>"
}

Respond ONLY with valid JSON.`,
};

let promptCache: Record<string, { template: string; timestamp: number }> = {};
const CACHE_TTL = 60 * 1000;

export async function getPromptTemplate(agentType: string, approach?: string): Promise<string> {
  const cacheKey = approach ? `${agentType}:${approach}` : agentType;
  const now = Date.now();

  if (promptCache[cacheKey] && now - promptCache[cacheKey].timestamp < CACHE_TTL) {
    return promptCache[cacheKey].template;
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      let query = supabase
        .from('agent_prompts')
        .select('template')
        .eq('user_id', user.id)
        .eq('agent_type', agentType);

      if (approach) {
        query = query.eq('approach', approach);
      } else {
        query = query.is('approach', null);
      }

      const { data } = await query.single();
      if (data?.template) {
        promptCache[cacheKey] = { template: data.template, timestamp: now };
        return data.template;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch prompt from DB for ${cacheKey}, using fallback.`, err);
  }

  return DEFAULT_PROMPTS[cacheKey] || '';
}

export function invalidatePromptCache(agentType: string, approach?: string): void {
  const cacheKey = approach ? `${agentType}:${approach}` : agentType;
  delete promptCache[cacheKey];
}
