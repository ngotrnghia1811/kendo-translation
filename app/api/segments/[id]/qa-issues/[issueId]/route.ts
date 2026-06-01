/**
 * /api/segments/[id]/qa-issues/[issueId]
 *
 *   PATCH — update a qa_issue.  Supports two operations:
 *
 *     1. Resolve: set { resolved: true } — stamps resolved_by + resolved_at.
 *        The corresponding rpc_phase_4b_qa_save in the 005 memory extension is
 *        NOT called automatically here because it requires a qa_issue_id
 *        payload that references a pattern — that link is reserved for Phase 3
 *        (QA pattern learning) when the full QA triage UI is available.
 *
 *     2. Dismiss / reopen: set { resolved: false } — clears resolved_by +
 *        resolved_at.  Useful if a false-positive was resolved by mistake.
 *
 *     3. Edit body / severity: set { body?, severity?, category? } — allows
 *        the translator to refine the issue before resolving it.
 *
 * RLS: UPDATE policy allows any authenticated user.
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

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; issueId: string }> }
) {
    const { id: segmentId, issueId } = await params;
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

    const { resolved, body: issueBody, severity, category } = (body ?? {}) as {
        resolved?: unknown;
        body?: unknown;
        severity?: unknown;
        category?: unknown;
    };

    const update: Record<string, unknown> = {};

    if (resolved !== undefined) {
        if (typeof resolved !== 'boolean') {
            return NextResponse.json(
                { error: '`resolved` must be a boolean' },
                { status: 400 }
            );
        }
        update.resolved = resolved;
        if (resolved) {
            update.resolved_by = user.id;
            update.resolved_at = new Date().toISOString();
        } else {
            // Reopen: clear resolution metadata.
            update.resolved_by = null;
            update.resolved_at = null;
        }
    }

    if (issueBody !== undefined) {
        if (issueBody !== null && typeof issueBody !== 'string') {
            return NextResponse.json({ error: '`body` must be a string or null' }, { status: 400 });
        }
        update.body = issueBody;
    }

    if (severity !== undefined) {
        if (typeof severity !== 'string' || !VALID_SEVERITIES.has(severity as QAIssueSeverity)) {
            return NextResponse.json(
                {
                    error: "`severity` must be 'minor', 'major', or 'critical'",
                },
                { status: 400 }
            );
        }
        update.severity = severity;
    }

    if (category !== undefined) {
        if (typeof category !== 'string' || !VALID_CATEGORIES.has(category as QAIssueCategory)) {
            return NextResponse.json(
                {
                    error: `\`category\` must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
                },
                { status: 400 }
            );
        }
        update.category = category;
    }

    if (Object.keys(update).length === 0) {
        return NextResponse.json(
            { error: 'At least one of `resolved`, `body`, `severity`, `category` is required' },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from('qa_issues')
        .update(update)
        .eq('id', issueId)
        .eq('segment_id', segmentId)
        .select()
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
        return NextResponse.json(
            { error: 'QA issue not found or does not belong to this segment' },
            { status: 404 }
        );
    }

    return NextResponse.json(data);
}
