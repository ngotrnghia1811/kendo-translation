/**
 * tests/comments-api.spec.ts
 *
 * Wave-2 BE Unit 2: live integration coverage for the Comment Thread
 * API (/api/segments/[id]/comments and .../[commentId]).
 *
 * Strategy mirrors tests/suggestions-api.spec.ts:
 *  - Authenticate as the translator role via storageState.
 *  - Discover a real document \u2192 real segment for true end-to-end RLS
 *    + route + DB coverage against the live Supabase project.
 *  - Exercise POST (root + reply), GET (presence + parent linkage),
 *    PATCH (resolved flip), and the key validation paths.
 *
 * Acknowledged side-effect: each run leaves several segment_comments
 * rows in the live DB (root + reply, plus one resolved). Consistent
 * with the Wave-2 "live integration, accept side-effects" decision.
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

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

            // 1. POST root comment.
            const rootText = `wave-2 root comment @ ${new Date().toISOString()}`
            const rootRes = await apiCall<{
                id: string
                segment_id: string
                content: string
                parent_comment_id: string | null
                mentions: string[]
                resolved: boolean
            }>(page, `/api/segments/${segmentId}/comments`, {
                method: 'POST',
                body: { content: rootText },
            })
            expect(rootRes.status).toBe(201)
            expect(rootRes.body.segment_id).toBe(segmentId)
            expect(rootRes.body.content).toBe(rootText)
            expect(rootRes.body.parent_comment_id).toBeNull()
            expect(Array.isArray(rootRes.body.mentions)).toBe(true)
            expect(rootRes.body.mentions).toEqual([])
            expect(rootRes.body.resolved).toBe(false)
            const rootId = rootRes.body.id

            // 2. POST reply comment with explicit empty mentions.
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

            // 3. GET list \u2014 both must appear with correct linkage.
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

            // 4. PATCH the root: mark resolved.
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

            // Find two distinct segments. Pull more docs/segments until we
            // have two ids.
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

            // Create a parent comment on segment A.
            const parentRes = await apiCall<{ id: string }>(
                page,
                `/api/segments/${segmentA}/comments`,
                { method: 'POST', body: { content: 'wave-2 cross-segment probe' } }
            )
            expect(parentRes.status).toBe(201)
            const parentId = parentRes.body.id

            // Attempt to use that parent as the parent of a comment on segment B.
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
