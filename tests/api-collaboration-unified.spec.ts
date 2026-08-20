/**
 * tests/api-collaboration-unified.spec.ts
 *
 * Unified API test suite for:
 * - Comments
 * - Suggestions
 * - Suggestion Actions
 * - QA Issues
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

type ApiResult<T> = { status: number; body: T }

async function apiCall<T = unknown>(
    page: import('@playwright/test').Page,
    path: string,
    init?: { method?: string; body?: unknown }
): Promise<ApiResult<T>> {
    return page.evaluate(
        async ({ base, path, init }) => {
            const res = await fetch(`${base}${path}`, {
                method: init?.method ?? 'GET',
                headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
                body: init?.body ? JSON.stringify(init.body) : undefined,
            })
            const text = await res.text()
            let parsed: unknown = text
            try {
                parsed = text ? JSON.parse(text) : null
            } catch {
                /* leave as text */
            }
            return { status: res.status, body: parsed as unknown }
        },
        { base: BASE, path, init: init ?? {} }
    ) as Promise<ApiResult<T>>
}

// Helper: Discover segment
async function discoverSegment(
    page: import('@playwright/test').Page
): Promise<{ docId: string; segmentId: string }> {
    const docsRes = await apiCall<
        { documents?: Array<{ id: string }> } | Array<{ id: string }>
    >(page, '/api/documents')
    expect(docsRes.status).toBe(200)
    const docs = Array.isArray(docsRes.body)
        ? docsRes.body
        : (docsRes.body?.documents ?? [])
    expect(docs.length, 'expected at least one document in live DB').toBeGreaterThan(0)
    const docId = docs[0].id

    const segRes = await apiCall<
        { segments?: Array<{ id: string }> } | Array<{ id: string }>
    >(page, `/api/documents/${docId}/segments`)
    expect(segRes.status).toBe(200)
    const segments = Array.isArray(segRes.body)
        ? segRes.body
        : (segRes.body?.segments ?? [])
    expect(segments.length, 'expected at least one segment').toBeGreaterThan(0)
    return { docId, segmentId: segments[0].id }
}

test.describe('Comments API', () => {
    test.describe('Authenticated as translator', () => {
        test.use({ storageState: 'tests/.auth/translator.json' })

        test('POST root + reply, GET shows parent linkage, PATCH resolves', async ({
            page,
            snap,
        }) => {
            await page.goto(`${BASE}/`)
            const { segmentId } = await discoverSegment(page)
            await snap('comments_api_segment_discovered')

            const rootText = `wave-2 root comment @ ${new Date().toISOString()}`
            const rootRes = await apiCall<{
                id: string
                segment: string
                content: string
                parent_comment_id: string | null
                mentions: string[]
                resolved: boolean
            }>(page, `/api/segments/${segmentId}/comments`, {
                method: 'POST',
                body: { content: rootText },
            })
            expect(rootRes.status).toBe(201)
            expect(rootRes.body.segment).toBe(segmentId)
            expect(rootRes.body.content).toBe(rootText)
            expect(rootRes.body.parent_comment_id).toBeNull()
            expect(Array.isArray(rootRes.body.mentions)).toBe(true)
            expect(rootRes.body.mentions).toEqual([])
            expect(rootRes.body.resolved).toBe(false)
            const rootId = rootRes.body.id

            const replyText = `wave-2 reply comment @ ${new Date().toISOString()}`
            const replyRes = await apiCall<{
                id: string
                parent_comment_id: string | null
            }>(page, `/api/segments/${segmentId}/comments`, {
                method: 'POST',
                body: { content: replyText, parent_comment_id: rootId, mentions: [] },
            })
            expect(replyRes.status).toBe(201)
            expect(replyRes.body.parent_comment_id).toBe(rootId)
            const replyId = replyRes.body.id

            const listRes = await apiCall<{
                comments: Array<{ id: string; parent_comment_id: string | null }>
            }>(page, `/api/segments/${segmentId}/comments`)
            expect(listRes.status).toBe(200)
            const root = listRes.body.comments.find((c) => c.id === rootId)
            const reply = listRes.body.comments.find((c) => c.id === replyId)
            expect(root, 'root comment should appear').toBeTruthy()
            expect(reply, 'reply comment should appear').toBeTruthy()
            expect(root!.parent_comment_id).toBeNull()
            expect(reply!.parent_comment_id).toBe(rootId)
            await snap('comments_api_thread_listed')

            const patchRes = await apiCall<{ id: string; resolved: boolean }>(
                page,
                `/api/segments/${segmentId}/comments/${rootId}`,
                { method: 'PATCH', body: { resolved: true } }
            )
            expect(patchRes.status).toBe(200)
            expect(patchRes.body.id).toBe(rootId)
            expect(patchRes.body.resolved).toBe(true)
        })

        test('POST rejects empty content with 400', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const { segmentId } = await discoverSegment(page)
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${segmentId}/comments`,
                { method: 'POST', body: { content: '   ' } }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/content/)
        })

        test('POST with parent from a different segment returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)

            const docsRes = await apiCall<
                { documents?: Array<{ id: string }> } | Array<{ id: string }>
            >(page, '/api/documents')
            const docs = Array.isArray(docsRes.body)
                ? docsRes.body
                : (docsRes.body?.documents ?? [])

            const segmentIds: string[] = []
            for (const doc of docs) {
                const segRes = await apiCall<
                    { segments?: Array<{ id: string }> } | Array<{ id: string }>
                >(page, `/api/documents/${doc.id}/segments`)
                const segs = Array.isArray(segRes.body)
                    ? segRes.body
                    : (segRes.body?.segments ?? [])
                for (const s of segs) {
                    segmentIds.push(s.id)
                    if (segmentIds.length >= 2) break
                }
                if (segmentIds.length >= 2) break
            }
            test.skip(
                segmentIds.length < 2,
                'need at least two segments in the live DB to exercise cross-segment parent rejection'
            )
            const [segmentA, segmentB] = segmentIds

            const parentRes = await apiCall<{ id: string }>(
                page,
                `/api/segments/${segmentA}/comments`,
                { method: 'POST', body: { content: 'wave-2 cross-segment probe' } }
            )
            expect(parentRes.status).toBe(201)
            const parentId = parentRes.body.id

            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${segmentB}/comments`,
                {
                    method: 'POST',
                    body: {
                        content: 'wave-2 cross-segment reply',
                        parent_comment_id: parentId,
                    },
                }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/different segment/i)
        })

        test('PATCH with empty body returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const fakeSegmentId = '00000000-0000-0000-0000-000000000000'
            const fakeCommentId = '00000000-0000-0000-0000-000000000001'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeSegmentId}/comments/${fakeCommentId}`,
                { method: 'PATCH', body: {} }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/required/i)
        })
    })

    test.describe('Unauthenticated', () => {
        test('POST without auth returns 401', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const fakeSegmentId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeSegmentId}/comments`,
                { method: 'POST', body: { content: 'hello' } }
            )
            expect(res.status).toBe(401)
            expect(res.body.error).toMatch(/Unauthorized/i)
        })

        test('PATCH without auth returns 401', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const fakeSegmentId = '00000000-0000-0000-0000-000000000000'
            const fakeCommentId = '00000000-0000-0000-0000-000000000001'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeSegmentId}/comments/${fakeCommentId}`,
                { method: 'PATCH', body: { resolved: true } }
            )
            expect(res.status).toBe(401)
            expect(res.body.error).toMatch(/Unauthorized/i)
        })
    })
})

test.describe('Suggestions API', () => {
    test.describe('Authenticated as translator', () => {
        test.use({ storageState: 'tests/.auth/translator.json' })

        test('POST creates a pending suggestion, PATCH transitions to rejected', async ({
            page,
            snap,
        }) => {
            await page.goto(`${BASE}/`)

            const docsRes = await apiCall<{ documents?: Array<{ id: string }> } | Array<{ id: string }>>(
                page,
                '/api/documents'
            )
            expect(docsRes.status).toBe(200)
            const docs = Array.isArray(docsRes.body)
                ? docsRes.body
                : (docsRes.body?.documents ?? [])
            expect(docs.length, 'expected at least one document in live DB').toBeGreaterThan(0)
            const docId = docs[0].id
            expect(typeof docId).toBe('string')

            const segRes = await apiCall<{ segments?: Array<{ id: string }> } | Array<{ id: string }>>(
                page,
                `/api/documents/${docId}/segments`
            )
            expect(segRes.status).toBe(200)
            const segments = Array.isArray(segRes.body)
                ? segRes.body
                : (segRes.body?.segments ?? [])
            expect(segments.length, 'expected at least one segment for the discovered document').toBeGreaterThan(0)
            const segmentId = segments[0].id
            expect(typeof segmentId).toBe('string')
            await snap('suggestions_api_segment_discovered')

            const proposedText = `wave-2 suggestion probe @ ${new Date().toISOString()}`
            const createRes = await apiCall<{
                id: string
                segment: string
                proposed_text: string
                status: string
                suggester_kind: string
            }>(page, `/api/segments/${segmentId}/suggestions`, {
                method: 'POST',
                body: { proposed_text: proposedText },
            })
            expect(createRes.status).toBe(201)
            expect(createRes.body.segment).toBe(segmentId)
            expect(createRes.body.proposed_text).toBe(proposedText)
            expect(createRes.body.status).toBe('pending')
            expect(createRes.body.suggester_kind).toBe('human')
            const suggestionId = createRes.body.id
            await snap('suggestions_api_created')

            const listRes = await apiCall<{ suggestions: Array<{ id: string; status: string }> }>(
                page,
                `/api/segments/${segmentId}/suggestions`
            )
            expect(listRes.status).toBe(200)
            const found = listRes.body.suggestions.find((s) => s.id === suggestionId)
            expect(found, 'newly created suggestion should appear in list').toBeTruthy()
            expect(found!.status).toBe('pending')

            const patchRes = await apiCall<{ id: string; status: string; accepter_id: string | null }>(
                page,
                `/api/segments/${segmentId}/suggestions/${suggestionId}`,
                { method: 'PATCH', body: { status: 'rejected' } }
            )
            expect(patchRes.status).toBe(200)
            expect(patchRes.body.id).toBe(suggestionId)
            expect(patchRes.body.status).toBe('rejected')
            expect(patchRes.body.accepter_id).toBeNull()
            await snap('suggestions_api_rejected')

            const listAfter = await apiCall<{ suggestions: Array<{ id: string; status: string }> }>(
                page,
                `/api/segments/${segmentId}/suggestions`
            )
            expect(listAfter.status).toBe(200)
            const foundAfter = listAfter.body.suggestions.find((s) => s.id === suggestionId)
            expect(foundAfter).toBeTruthy()
            expect(foundAfter!.status).toBe('rejected')
        })

        test('POST rejects empty proposed_text with 400', async ({ page }) => {
            await page.goto(`${BASE}/`)

            const docsRes = await apiCall<{ documents?: Array<{ id: string }> } | Array<{ id: string }>>(
                page,
                '/api/documents'
            )
            const docs = Array.isArray(docsRes.body)
                ? docsRes.body
                : (docsRes.body?.documents ?? [])
            expect(docs.length).toBeGreaterThan(0)
            const segRes = await apiCall<{ segments?: Array<{ id: string }> } | Array<{ id: string }>>(
                page,
                `/api/documents/${docs[0].id}/segments`
            )
            const segments = Array.isArray(segRes.body)
                ? segRes.body
                : (segRes.body?.segments ?? [])
            expect(segments.length).toBeGreaterThan(0)
            const segmentId = segments[0].id

            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${segmentId}/suggestions`,
                { method: 'POST', body: { proposed_text: '   ' } }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/proposed_text/)
        })

        test('PATCH with invalid status returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)

            const fakeSegmentId = '00000000-0000-0000-0000-000000000000'
            const fakeSuggestionId = '00000000-0000-0000-0000-000000000001'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeSegmentId}/suggestions/${fakeSuggestionId}`,
                { method: 'PATCH', body: { status: 'bogus' } }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/status/)
        })
    })

    test.describe('Unauthenticated', () => {
        test('POST without auth returns 401', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const fakeSegmentId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeSegmentId}/suggestions`,
                { method: 'POST', body: { proposed_text: 'hello' } }
            )
            expect(res.status).toBe(401)
            expect(res.body.error).toMatch(/Unauthorized/i)
        })
    })
})

test.describe('Suggestion-actions API', () => {
    test.describe('Authenticated as admin', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        type Segment = { id: string; status: string; article_id: string }

        async function findSegment(
            page: import('@playwright/test').Page
        ): Promise<Segment | null> {
            const res = await apiCall<{ segments: Segment[] }>(
                page,
                `/api/segments?limit=5`
            )
            if (res.status !== 200) return null
            return res.body.segments?.[0] ?? null
        }

        async function createPendingSuggestion(
            page: import('@playwright/test').Page,
            segmentId: string
        ): Promise<string> {
            const proposed = `[suggestions-actions probe @ ${new Date().toISOString()}]`
            const res = await apiCall<{ id: string }>(
                page,
                `/api/segments/${segmentId}/suggestions`,
                {
                    method: 'POST',
                    body: { proposed_text: proposed, suggester_kind: 'human' },
                }
            )
            expect(res.status, 'create suggestion setup').toBe(201)
            return res.body.id
        }

        test('PATCH status=accepted stamps accepter_id + accepted_at', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)
            const segment = await findSegment(page)
            test.skip(!segment, 'no segment available')
            if (!segment) return

            const suggestionId = await createPendingSuggestion(
                page,
                segment.id
            )

            const res = await apiCall<{
                id: string
                status: string
                accepter_id: string | null
                accepted_at: string | null
            }>(
                page,
                `/api/segments/${segment.id}/suggestions/${suggestionId}`,
                { method: 'PATCH', body: { status: 'accepted' } }
            )
            expect(res.status).toBe(200)
            expect(res.body.status).toBe('accepted')
            expect(res.body.accepter_id).not.toBeNull()
            expect(res.body.accepted_at).not.toBeNull()
        })

        test('PATCH status=rejected leaves accepter_id null', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)
            const segment = await findSegment(page)
            test.skip(!segment, 'no segment available')
            if (!segment) return

            const suggestionId = await createPendingSuggestion(
                page,
                segment.id
            )

            const res = await apiCall<{
                id: string
                status: string
                accepter_id: string | null
                accepted_at: string | null
            }>(
                page,
                `/api/segments/${segment.id}/suggestions/${suggestionId}`,
                { method: 'PATCH', body: { status: 'rejected' } }
            )
            expect(res.status).toBe(200)
            expect(res.body.status).toBe('rejected')
            expect(res.body.accepter_id).toBeNull()
            expect(res.body.accepted_at).toBeNull()
        })
    })
})

test.describe('QA Issues API', () => {
    test.describe('Authenticated as admin', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('POST creates a qa_issue, GET lists it, PATCH resolves it', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)

            const docsRes = await apiCall<Array<{ id: string }>>(page, '/api/documents')
            expect(docsRes.status).toBe(200)
            const docs = Array.isArray(docsRes.body) ? docsRes.body : []
            expect(docs.length, 'expected at least one document').toBeGreaterThan(0)

            const segRes = await apiCall<Array<{ id: string }>>(
                page,
                `/api/documents/${docs[0].id}/segments`
            )
            expect(segRes.status).toBe(200)
            const segments = Array.isArray(segRes.body) ? segRes.body : []
            expect(segments.length, 'expected at least one segment').toBeGreaterThan(0)
            const segmentId = segments[0].id

            const createRes = await apiCall<{
                id: string
                segment: string
                category: string
                severity: string
                resolved: boolean
                author_kind: string
            }>(page, `/api/segments/${segmentId}/qa-issues`, {
                method: 'POST',
                body: {
                    category: 'Terminology',
                    severity: 'minor',
                    body: 'qa-issues-api spec probe — safe to ignore',
                },
            })
            expect(createRes.status).toBe(201)
            expect(createRes.body.segment).toBe(segmentId)
            expect(createRes.body.category).toBe('Terminology')
            expect(createRes.body.severity).toBe('minor')
            expect(createRes.body.resolved).toBe(false)
            expect(createRes.body.author_kind).toBe('human')
            const issueId = createRes.body.id

            const listRes = await apiCall<Array<{ id: string; resolved: boolean }>>(
                page,
                `/api/segments/${segmentId}/qa-issues`
            )
            expect(listRes.status).toBe(200)
            const found = (Array.isArray(listRes.body) ? listRes.body : []).find(
                (i) => i.id === issueId
            )
            expect(found, 'newly created issue should appear in list').toBeTruthy()
            expect(found!.resolved).toBe(false)

            const patchRes = await apiCall<{
                id: string
                resolved: boolean
                resolved_by: string | null
                resolved_at: string | null
            }>(page, `/api/segments/${segmentId}/qa-issues/${issueId}`, {
                method: 'PATCH',
                body: { resolved: true },
            })
            expect(patchRes.status).toBe(200)
            expect(patchRes.body.id).toBe(issueId)
            expect(patchRes.body.resolved).toBe(true)
            expect(patchRes.body.resolved_by).not.toBeNull()
            expect(patchRes.body.resolved_at).not.toBeNull()

            const listAfter = await apiCall<Array<{ id: string; resolved: boolean }>>(
                page,
                `/api/segments/${segmentId}/qa-issues`
            )
            expect(listAfter.status).toBe(200)
            const foundAfter = (Array.isArray(listAfter.body) ? listAfter.body : []).find(
                (i) => i.id === issueId
            )
            expect(foundAfter).toBeTruthy()
            expect(foundAfter!.resolved).toBe(true)
        })

        test('POST with author_kind=agent is rejected (cooperation invariant)', async ({
            page,
        }) => {
            await page.goto(`${BASE}/`)

            const docsRes = await apiCall<Array<{ id: string }>>(page, '/api/documents')
            const docs = Array.isArray(docsRes.body) ? docsRes.body : []
            expect(docs.length).toBeGreaterThan(0)
            const segRes = await apiCall<Array<{ id: string }>>(
                page,
                `/api/documents/${docs[0].id}/segments`
            )
            const segments = Array.isArray(segRes.body) ? segRes.body : []
            expect(segments.length).toBeGreaterThan(0)
            const segmentId = segments[0].id

            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${segmentId}/qa-issues`,
                {
                    method: 'POST',
                    body: {
                        category: 'Fluency',
                        severity: 'minor',
                        body: 'test',
                        author_kind: 'agent',
                    },
                }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/author_kind/)
        })

        test('POST with invalid category returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)

            const fakeSegmentId = '00000000-0000-0000-0000-000000000000'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeSegmentId}/qa-issues`,
                {
                    method: 'POST',
                    body: {
                        category: 'BadCategory',
                        severity: 'minor',
                    },
                }
            )
            expect(res.status).toBe(400)
            expect(res.body.error).toMatch(/category/)
        })

        test('PATCH with empty body returns 400', async ({ page }) => {
            await page.goto(`${BASE}/`)

            const fakeSegmentId = '00000000-0000-0000-0000-000000000000'
            const fakeIssueId = '00000000-0000-0000-0000-000000000001'
            const res = await apiCall<{ error: string }>(
                page,
                `/api/segments/${fakeSegmentId}/qa-issues/${fakeIssueId}`,
                { method: 'PATCH', body: {} }
            )
            expect(res.status).toBe(400)
        })
    })
})
