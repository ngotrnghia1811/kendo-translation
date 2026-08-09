/**
 * /api/segments/[id]/qa-issues
 *
 *   GET  — list all qa_issues for a segment (open and resolved).
 *   POST — create a new qa_issue (human triage only).
 * PocketBase edition.
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

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: segmentId } = await params;
    const pb = await createServerClient();

    try {
        const records = await pb.collection('qa_issues').getFullList({
            filter: `segment_id = "${segmentId}"`,
            sort: '+created_at',
        });
        return NextResponse.json(records ?? []);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: segmentId } = await params;
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

    if (author_kind !== undefined && author_kind !== 'human') {
        return NextResponse.json(
            {
                error:
                    "author_kind must be 'human' or omitted. " +
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

    // Verify segment exists
    try {
        await pb.collection('segments').getOne(segmentId);
    } catch {
        // Segment might not exist; tolerate via FK constraint
    }

    try {
        const data = await pb.collection('qa_issues').create({
            segment_id: segmentId,
            category: category as QAIssueCategory,
            severity: severity as QAIssueSeverity,
            body: typeof issueBody === 'string' ? issueBody : null,
            char_start: typeof char_start === 'number' ? char_start : null,
            char_end: typeof char_end === 'number' ? char_end : null,
            author_id: userId,
            author_kind: 'human',
        });
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
