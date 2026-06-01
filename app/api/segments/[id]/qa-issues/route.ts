/**
 * /api/segments/[id]/qa-issues
 *
 *   GET  — list all qa_issues for a segment (open and resolved).
 *   POST — create a new qa_issue (human triage only; agents may not INSERT
 *          directly; they propose via /api/agents/qa and the human triages).
 *
 * Cooperation invariant: agents PROPOSE; humans CREATE.  The agent QA
 * endpoint (/api/agents/qa) returns a JSON array of candidate issues for
 * the translator to review; only a human POST to this endpoint writes to
 * the qa_issues table.  The author_kind field on every human-created row is
 * 'human'; if a caller explicitly sets author_kind='agent', we reject it.
 *
 * RLS policies (from 004_phase_workflow.sql):
 *   SELECT — public (any authenticated or anon reader can see qa_issues)
 *   INSERT — any authenticated user
 *   UPDATE — any authenticated user (PATCH /qa-issues/[issueId])
 *   DELETE — admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { QAIssueCategory, QAIssueSeverity } from '@/types/database';

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

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: segmentId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('qa_issues')
        .select('*')
        .eq('segment_id', segmentId)
        .order('created_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: segmentId } = await params;
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

    const {
        category,
        severity,
        body: issueBody,
        char_start,
        char_end,
        author_kind,
    } = (body ?? {}) as {
        category?: unknown;
        severity?: unknown;
        body?: unknown;
        char_start?: unknown;
        char_end?: unknown;
        author_kind?: unknown;
    };

    // Cooperation invariant: humans only.  Reject any attempt to impersonate
    // an agent write via this surface.
    if (author_kind !== undefined && author_kind !== 'human') {
        return NextResponse.json(
            {
                error:
                    "author_kind must be 'human' or omitted.  " +
                    'Agent QA findings are proposed via /api/agents/qa and triaged by a human.',
            },
            { status: 400 }
        );
    }

    if (typeof category !== 'string' || !VALID_CATEGORIES.has(category as QAIssueCategory)) {
        return NextResponse.json(
            {
                error: `\`category\` is required and must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
            },
            { status: 400 }
        );
    }

    if (typeof severity !== 'string' || !VALID_SEVERITIES.has(severity as QAIssueSeverity)) {
        return NextResponse.json(
            {
                error: "`severity` is required and must be 'minor', 'major', or 'critical'",
            },
            { status: 400 }
        );
    }

    // Verify the segment exists (gives a clean 404 rather than a FK violation).
    const { error: segErr } = await supabase
        .from('segments')
        .select('id')
        .eq('id', segmentId)
        .maybeSingle();
    if (segErr) {
        return NextResponse.json({ error: segErr.message }, { status: 500 });
    }

    const { data: inserted, error: insertErr } = await supabase
        .from('qa_issues')
        .insert({
            segment_id: segmentId,
            category: category as QAIssueCategory,
            severity: severity as QAIssueSeverity,
            body: typeof issueBody === 'string' ? issueBody : null,
            char_start: typeof char_start === 'number' ? char_start : null,
            char_end: typeof char_end === 'number' ? char_end : null,
            author_id: user.id,
            author_kind: 'human',
        })
        .select()
        .single();

    if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json(inserted, { status: 201 });
}
