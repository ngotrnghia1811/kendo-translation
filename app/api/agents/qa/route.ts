/**
 * /api/agents/qa
 *
 * Advisory QA agent.  POST a `segment_id`; the route calls the LLM with the
 * QA review prompt and returns a JSON array of candidate qa_issue objects for
 * the translator to triage.
 *
 * Cooperation invariant: the agent PROPOSES, the human DECIDES.  This route
 * NEVER writes to the `qa_issues` table.  The caller is expected to present
 * the candidates to the translator and let them choose which to accept via
 * POST /api/segments/[id]/qa-issues.
 *
 * Request body:
 *   { segment_id: string (UUID) }
 *
 * Response 200:
 *   { candidates: QAIssueCandidate[] }
 *   where QAIssueCandidate = { category, severity, body, char_start, char_end }
 *
 * Response 422: segment has no target_text (nothing to QA yet).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { agentChatWithFallback } from '@/lib/llm/provider';
import { qaPrompt } from '@/lib/agents/phase-prompts';
import type { QAIssueCategory, QAIssueSeverity } from '@/types/database';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_CATEGORIES = new Set<QAIssueCategory>([
    'Mistranslation',
    'Terminology',
    'Register/Keigo',
    'Fluency',
    'Cultural-adaptation',
    'Omission/Addition',
    'Style',
]);

const VALID_SEVERITIES = new Set<QAIssueSeverity>(['minor', 'major', 'critical']);

interface QAIssueCandidate {
    category: QAIssueCategory;
    severity: QAIssueSeverity;
    body: string | null;
    char_start: number | null;
    char_end: number | null;
}

/** Parse and validate the raw LLM JSON output into typed candidates. */
function parseCandidates(raw: string): QAIssueCandidate[] {
    let parsed: unknown;
    try {
        // Strip optional markdown code fences the model might include despite
        // instructions.
        const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        parsed = JSON.parse(stripped);
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) return [];

    const result: QAIssueCandidate[] = [];
    for (const item of parsed) {
        if (typeof item !== 'object' || item === null) continue;
        const { category, severity, body, char_start, char_end } = item as Record<
            string,
            unknown
        >;
        if (
            typeof category !== 'string' ||
            !VALID_CATEGORIES.has(category as QAIssueCategory)
        )
            continue;
        if (
            typeof severity !== 'string' ||
            !VALID_SEVERITIES.has(severity as QAIssueSeverity)
        )
            continue;
        result.push({
            category: category as QAIssueCategory,
            severity: severity as QAIssueSeverity,
            body: typeof body === 'string' ? body : null,
            char_start:
                typeof char_start === 'number' && Number.isInteger(char_start)
                    ? char_start
                    : null,
            char_end:
                typeof char_end === 'number' && Number.isInteger(char_end) ? char_end : null,
        });
    }
    return result;
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { segment_id } = (body ?? {}) as { segment_id?: unknown };
    if (typeof segment_id !== 'string' || !UUID_RE.test(segment_id)) {
        return NextResponse.json(
            { error: '`segment_id` is required and must be a UUID' },
            { status: 400 }
        );
    }

    const { data: segment, error: segErr } = await supabase
        .from('segments')
        .select('id, source_text, target_text')
        .eq('id', segment_id)
        .maybeSingle();

    if (segErr) {
        return NextResponse.json({ error: segErr.message }, { status: 500 });
    }
    if (!segment) {
        return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    const sourceText = (segment.source_text ?? '').toString();
    const targetText = (segment.target_text ?? '').toString();

    if (targetText.trim().length === 0) {
        return NextResponse.json(
            {
                error:
                    'QA requires a non-empty target_text on the segment.  ' +
                    'Translate the segment first.',
            },
            { status: 422 }
        );
    }

    const built = qaPrompt(sourceText, targetText);

    let rawContent: string;
    try {
        const resp = await agentChatWithFallback(
            'translation',
            [
                { role: 'system', content: built.system },
                { role: 'user', content: built.user },
            ],
            { temperature: 0.2, maxTokens: 1200 }
        );
        rawContent = (resp.content ?? '').trim();
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown LLM error';
        if (msg === 'No OpenRouter API key configured') {
            return NextResponse.json({ error: msg }, { status: 503 });
        }
        return NextResponse.json({ error: `LLM upstream error: ${msg}` }, { status: 502 });
    }

    const candidates = parseCandidates(rawContent);

    // Return the raw LLM output alongside parsed candidates so callers can
    // display or log it for debugging even when parsing yields zero results.
    return NextResponse.json({
        candidates,
        segment_id,
        raw: rawContent.length <= 2000 ? rawContent : rawContent.slice(0, 2000) + '…',
    });
}
