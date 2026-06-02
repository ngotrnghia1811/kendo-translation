/**
 * /api/segments/[id]/qa-issues/[issueId]
 *
 *   PATCH — update a qa_issue.  Supports four operations:
 *
 *     1. Resolve: set { resolved: true } — stamps resolved_by + resolved_at.
 *        When `resolved: true` and an optional `qa_save` payload is included,
 *        we also call rpc_phase_4b_qa_save to record the QA pattern outcome
 *        in the phase-4b memory tables (qa_patterns / qa_pattern_resolutions).
 *        The rpc call is best-effort: if it fails, we still return 200 for the
 *        successful resolve and include a `qa_save_warning` in the response.
 *        See the `qa_save` extension block comment below for the shape of the
 *        qa_save payload.
 *
 *     2. Dismiss / reopen: set { resolved: false } — clears resolved_by +
 *        resolved_at.  Useful if a false-positive was resolved by mistake.
 *
 *     3. Edit body / severity: set { body?, severity?, category? } — allows
 *        the translator to refine the issue before resolving it.
 *
 *     4. qa_save extension — when the resolve modal records a pattern:
 *        The caller may include a `qa_save` object in the PATCH body (only
 *        meaningful when `resolved: true`). Shape:
 *          qa_save?: {
 *            pattern_name: string       // required, non-empty
 *            category?: string         // default 'Style'
 *            description?: string
 *            outcome: 'confirmed' | 'dismissed_false_positive' | 'dismissed_out_of_scope'
 *            dismissal_reason?: string
 *            agent_confidence?: number
 *          }
 *        We validate pattern_name (non-empty) and outcome (one of the 3
 *        enumerators), then call:
 *          supabase.rpc('rpc_phase_4b_qa_save', {
 *            segment_id: segmentId,
 *            suggestion_id: null,
 *            payload: { qa_issue_id: issueId, ...qa_save }
 *          })
 *        Success → response includes `qa_save_result`.
 *        Failure → response includes `qa_save_warning` (resolve still stands).
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

    const { resolved, body: issueBody, severity, category, qa_save } = (body ?? {}) as {
        resolved?: unknown;
        body?: unknown;
        severity?: unknown;
        category?: unknown;
        qa_save?: unknown;
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

    // ── qa_save extension: record QA pattern outcome via rpc_phase_4b_qa_save ──
    // Only triggered when the issue is being resolved AND a qa_save payload is
    // present.  The resolve itself has already succeeded; rpc failures are
    // non-blocking and surfaced as a warning.
    if (resolved === true && qa_save !== undefined) {
        const qs = qa_save as Record<string, unknown>;

        // Validate required qa_save fields
        if (typeof qs.pattern_name !== 'string' || qs.pattern_name.trim().length === 0) {
            return NextResponse.json(
                { error: '`qa_save.pattern_name` is required and must be a non-empty string' },
                { status: 400 }
            );
        }

        const VALID_OUTCOMES = new Set([
            'confirmed',
            'dismissed_false_positive',
            'dismissed_out_of_scope',
        ]);
        if (typeof qs.outcome !== 'string' || !VALID_OUTCOMES.has(qs.outcome)) {
            return NextResponse.json(
                {
                    error:
                        "`qa_save.outcome` must be one of 'confirmed', 'dismissed_false_positive', or 'dismissed_out_of_scope'",
                },
                { status: 400 }
            );
        }

        const rpcPayload: Record<string, unknown> = {
            qa_issue_id: issueId,
            pattern_name: qs.pattern_name,
            category: typeof qs.category === 'string' ? qs.category : 'Style',
            outcome: qs.outcome,
        };

        if (typeof qs.description === 'string') rpcPayload.description = qs.description;
        if (typeof qs.dismissal_reason === 'string')
            rpcPayload.dismissal_reason = qs.dismissal_reason;
        if (typeof qs.agent_confidence === 'number')
            rpcPayload.agent_confidence = qs.agent_confidence;

        const { data: rpcData, error: rpcError } = await supabase.rpc(
            'rpc_phase_4b_qa_save',
            {
                segment_id: segmentId,
                suggestion_id: null,
                payload: rpcPayload,
            }
        );

        if (rpcError) {
            console.error(
                '[qa-issues PATCH] rpc_phase_4b_qa_save failed (resolve still succeeded):',
                rpcError
            );
            return NextResponse.json({ ...data, qa_save_warning: rpcError.message });
        }

        return NextResponse.json({ ...data, qa_save_result: rpcData });
    }

    return NextResponse.json(data);
}
