/**
 * /api/segments/[id]/qa-issues/[issueId]
 *
 *   PATCH — update a qa_issue (resolve, edit body/severity/category).
 *
 * PocketBase edition. Phase-4b qa_save (rpc_phase_4b_qa_save) is removed
 * — the translation_memory / qa_patterns tables were NOT migrated to
 * PocketBase. The resolve still works; qa_save payloads are silently ignored.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/pocketbase/server';
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
    const pb = await createServerClient();

    if (!pb.authStore.isValid || !pb.authStore.record) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = pb.authStore.record.id;

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
            update.resolved_by = userId;
            update.resolved_at = new Date().toISOString();
        } else {
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
                { error: "`severity` must be 'minor', 'major', or 'critical'" },
                { status: 400 }
            );
        }
        update.severity = severity;
    }

    if (category !== undefined) {
        if (typeof category !== 'string' || !VALID_CATEGORIES.has(category as QAIssueCategory)) {
            return NextResponse.json(
                { error: `\`category\` must be one of: ${[...VALID_CATEGORIES].join(', ')}` },
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

    // Verify issue exists and belongs to this segment
    try {
        const existing = await pb.collection('qa_issues').getOne(issueId);
        const existingSegId = (existing as Record<string, unknown>).segment_id as string;
        if (existingSegId !== segmentId) {
            return NextResponse.json(
                { error: 'QA issue not found or does not belong to this segment' },
                { status: 404 }
            );
        }
    } catch {
        return NextResponse.json(
            { error: 'QA issue not found or does not belong to this segment' },
            { status: 404 }
        );
    }

    try {
        const data = await pb.collection('qa_issues').update(issueId, update);

        // qa_save: Phase-4b qa_save RPC was backed by qa_patterns/
        // qa_pattern_resolutions which were NOT migrated to PocketBase.
        // We surface a non-blocking warning if the caller included qa_save.
        if (resolved === true && qa_save !== undefined) {
            return NextResponse.json({
                ...data,
                qa_save_warning: 'Phase-4b qa_save not supported (qa_patterns not migrated to PocketBase)'
            });
        }

        return NextResponse.json(data);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
