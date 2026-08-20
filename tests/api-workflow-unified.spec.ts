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

// Helpers needed by multiple domains
type Segment = {
    id: string
    status: string
    target_text: string | null
    article_id: string
}

async function findSegment(
    page: import('@playwright/test').Page,
    opts: { status?: string; hasTargetText?: boolean }
): Promise<Segment | null> {
    const params = new URLSearchParams()
    if (opts.status) params.set('status', opts.status)
    if (opts.hasTargetText !== undefined)
        params.set('has_target_text', String(opts.hasTargetText))
    params.set('limit', '5')
    const res = await apiCall<{ segments: Segment[] }>(
        page,
        `/api/segments?${params.toString()}`
    )
    if (res.status !== 200) return null
    return res.body.segments?.[0] ?? null
}

async function discoverDocumentId(
    page: import('@playwright/test').Page
): Promise<string> {
    const docsRes = await apiCall<
        { documents?: Array<{ id: string }> } | Array<{ id: string }>
    >(page, '/api/documents')
    expect(docsRes.status).toBe(200)
    const docs = Array.isArray(docsRes.body)
        ? docsRes.body
        : (docsRes.body?.documents ?? [])
    expect(docs.length, 'expected at least one document').toBeGreaterThan(0)
    return docs[0].id
}

async function discoverTranslatorUserId(
    page: import('@playwright/test').Page
): Promise<string> {
    const usersRes = await apiCall<{
        users: Array<{ id: string; role: string; username: string }>
    }>(page, '/api/admin/users')
    expect(usersRes.status).toBe(200)
    const translator = usersRes.body.users.find((u) => u.role === 'translator')
    expect(translator, 'expected at least one translator-role user').toBeTruthy()
    return translator!.id
}

async function discoverTranslatorUser(
    page: import('@playwright/test').Page
): Promise<{ id: string; username: string }> {
    const usersRes = await apiCall<{
        users: Array<{ id: string; role: string; username: string }>
    }>(page, '/api/admin/users')
    expect(usersRes.status).toBe(200)
    const t = usersRes.body.users.find((u) => u.role === 'translator')
    expect(t, 'expected at least one translator-role user').toBeTruthy()
    return { id: t!.id, username: t!.username }
}

test.describe('API Workflow Unified', () => {

    test.describe('Phase Advances', () => {
        test.describe('Authenticated as admin (happy path)', () => {
            test.use({ storageState: 'tests/.auth/admin.json' })
            test('POST advances draft → translated, writes transition row', async ({ page, snap }) => {
                await page.goto(`${BASE}/`)
                const segment = await findSegment(page, { status: 'draft', hasTargetText: false })
                test.skip(!segment, 'no draft segment available in live DB')
                if (!segment) return

                const seedText = `[wave-2 advance probe seed @ ${new Date().toISOString()}]`
                const seedRes = await apiCall<{ id: string; target_text: string | null }>(page, `/api/segments/${segment.id}`, { method: 'PATCH', body: { target_text: seedText } })
                expect(seedRes.status, 'seed PATCH should succeed').toBe(200)
                await snap('advance_phase_target_chosen')

                const noteText = `wave-2 advance probe @ ${new Date().toISOString()}`
                const advanceRes = await apiCall<{ segment: { id: string; status: string }; transition: { id: string; segment: string; from_status: string; to_status: string; actor_id: string; note: string | null } }>(page, `/api/segments/${segment.id}/advance-phase`, { method: 'POST', body: { to_status: 'translated', expected_current_status: 'draft', note: noteText } })
                expect(advanceRes.status).toBe(200)
                expect(advanceRes.body.segment.id).toBe(segment.id)
                expect(advanceRes.body.segment.status).toBe('translated')
                expect(advanceRes.body.transition.segment).toBe(segment.id)
                expect(advanceRes.body.transition.from_status).toBe('draft')
                expect(advanceRes.body.transition.to_status).toBe('translated')
                expect(advanceRes.body.transition.note).toBe(noteText)
                await snap('advance_phase_success')

                const staleRes = await apiCall<{ error: string; current_status: string }>(page, `/api/segments/${segment.id}/advance-phase`, { method: 'POST', body: { to_status: 'translated', expected_current_status: 'draft' } })
                expect(staleRes.status).toBe(409)
                expect(staleRes.body.current_status).toBe('translated')
            })
        })

        test.describe('Authenticated as translator (validation paths)', () => {
            test.use({ storageState: 'tests/.auth/translator.json' })
            test('illegal transition (draft → edited) returns 400 without DB write', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const segment = await findSegment(page, { status: 'draft' })
                test.skip(!segment, 'no draft segment available')
                if (!segment) return

                const res = await apiCall<{ error: string }>(page, `/api/segments/${segment.id}/advance-phase`, { method: 'POST', body: { to_status: 'edited', expected_current_status: 'draft' } })
                expect(res.status).toBe(400)
                expect(res.body.error).toMatch(/Illegal transition/i)
            })

            test('empty target_text + to_status=translated returns 400', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const segment = await findSegment(page, { status: 'draft', hasTargetText: false })
                test.skip(!segment, 'no draft segment with empty target_text available')
                if (!segment) return

                const res = await apiCall<{ error: string }>(page, `/api/segments/${segment.id}/advance-phase`, { method: 'POST', body: { to_status: 'translated', expected_current_status: 'draft' } })
                expect(res.status).toBe(400)
                expect(res.body.error).toMatch(/target_text/)
            })

            test('wrong expected_current_status returns 409 with actual status', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const segment = await findSegment(page, { status: 'translated' })
                test.skip(!segment, 'no translated segment available')
                if (!segment) return

                const res = await apiCall<{ error: string; current_status: string }>(page, `/api/segments/${segment.id}/advance-phase`, { method: 'POST', body: { to_status: 'proofread', expected_current_status: 'edited' } })
                expect(res.status).toBe(409)
                expect(res.body.current_status).toBe('translated')
            })

            test('invalid to_status returns 400', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const fakeId = '00000000-0000-0000-0000-000000000000'
                const res = await apiCall<{ error: string }>(page, `/api/segments/${fakeId}/advance-phase`, { method: 'POST', body: { to_status: 'bogus', expected_current_status: 'draft' } })
                expect(res.status).toBe(400)
                expect(res.body.error).toMatch(/to_status/)
            })
        })

        test.describe('Unauthenticated', () => {
            test('POST without auth returns 401', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const fakeId = '00000000-0000-0000-0000-000000000000'
                const res = await apiCall<{ error: string }>(page, `/api/segments/${fakeId}/advance-phase`, { method: 'POST', body: { to_status: 'translated', expected_current_status: 'draft' } })
                expect(res.status).toBe(401)
                expect(res.body.error).toMatch(/Unauthorized/i)
            })
        })
    })

    test.describe('Assignments', () => {
        test.describe('Authenticated as admin', () => {
            test.use({ storageState: 'tests/.auth/admin.json' })

            test('POST creates, PATCH updates phases, DELETE removes', async ({ page, snap }) => {
                await page.goto(`${BASE}/`)
                const documentId = await discoverDocumentId(page)
                const userId = await discoverTranslatorUserId(page)
                await snap('assignments_api_discovered')
                await apiCall(page, `/api/documents/${documentId}/assignments/${userId}`, { method: 'DELETE' })
                const createRes = await apiCall<{ user: string; document: string; allowed_phases: string[]; assigned_by: string | null }>(page, `/api/documents/${documentId}/assignments`, { method: 'POST', body: { user_id: userId, allowed_phases: ['translate'] } })
                expect(createRes.status).toBe(201)
                expect(createRes.body.user).toBe(userId)
                expect(createRes.body.document).toBe(documentId)
                expect(createRes.body.allowed_phases).toEqual(['translate'])
                expect(createRes.body.assigned_by).not.toBeNull()
                const listRes = await apiCall<{ assignments: Array<{ user: string; allowed_phases: string[] }> }>(page, `/api/documents/${documentId}/assignments`)
                expect(listRes.status).toBe(200)
                const found = listRes.body.assignments.find((a) => a.user === userId)
                expect(found).toBeTruthy()
                expect(found!.allowed_phases).toEqual(['translate'])
                const patchRes = await apiCall<{ allowed_phases: string[] }>(page, `/api/documents/${documentId}/assignments/${userId}`, { method: 'PATCH', body: { allowed_phases: ['translate', 'edit'] } })
                expect(patchRes.status).toBe(200)
                expect(patchRes.body.allowed_phases).toEqual(['translate', 'edit'])
                const listRes2 = await apiCall<{ assignments: Array<{ user: string; allowed_phases: string[] }> }>(page, `/api/documents/${documentId}/assignments`)
                const found2 = listRes2.body.assignments.find((a) => a.user === userId)
                expect(found2!.allowed_phases).toEqual(['translate', 'edit'])
                const delRes = await apiCall(page, `/api/documents/${documentId}/assignments/${userId}`, { method: 'DELETE' })
                expect(delRes.status).toBe(204)
                const listRes3 = await apiCall<{ assignments: Array<{ user: string }> }>(page, `/api/documents/${documentId}/assignments`)
                const found3 = listRes3.body.assignments.find((a) => a.user === userId)
                expect(found3).toBeUndefined()
            })

            test('POST returns 200 (not 201) on second call — upsert semantics', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const documentId = await discoverDocumentId(page)
                const userId = await discoverTranslatorUserId(page)
                await apiCall(page, `/api/documents/${documentId}/assignments/${userId}`, { method: 'DELETE' })
                const first = await apiCall(page, `/api/documents/${documentId}/assignments`, { method: 'POST', body: { user_id: userId, allowed_phases: ['translate'] } })
                expect(first.status).toBe(201)
                const second = await apiCall<{ allowed_phases: string[] }>(page, `/api/documents/${documentId}/assignments`, { method: 'POST', body: { user_id: userId, allowed_phases: ['edit', 'proofread'] } })
                expect(second.status).toBe(200)
                expect(second.body.allowed_phases).toEqual(['edit', 'proofread'])
                await apiCall(page, `/api/documents/${documentId}/assignments/${userId}`, { method: 'DELETE' })
            })

            test('POST with invalid phase value returns 400', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const documentId = await discoverDocumentId(page)
                const userId = await discoverTranslatorUserId(page)
                const res = await apiCall<{ error: string }>(page, `/api/documents/${documentId}/assignments`, { method: 'POST', body: { user_id: userId, allowed_phases: ['translate', 'bogus'] } })
                expect(res.status).toBe(400)
                expect(res.body.error).toMatch(/allowed_phases/)
            })

            test('POST with empty allowed_phases returns 400', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const documentId = await discoverDocumentId(page)
                const userId = await discoverTranslatorUserId(page)
                const res = await apiCall<{ error: string }>(page, `/api/documents/${documentId}/assignments`, { method: 'POST', body: { user_id: userId, allowed_phases: [] } })
                expect(res.status).toBe(400)
                expect(res.body.error).toMatch(/non-empty/)
            })
        })

        test.describe('Authenticated as translator (non-admin)', () => {
            test.use({ storageState: 'tests/.auth/translator.json' })
            test('POST returns 403', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const documentId = await discoverDocumentId(page)
                const fakeUserId = '00000000-0000-0000-0000-000000000000'
                const res = await apiCall<{ error: string }>(page, `/api/documents/${documentId}/assignments`, { method: 'POST', body: { user_id: fakeUserId, allowed_phases: ['translate'] } })
                expect(res.status).toBe(403)
                expect(res.body.error).toMatch(/admin/i)
            })
        })

        test.describe('Unauthenticated', () => {
            test('POST returns 401', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const fakeDocId = '00000000-0000-0000-0000-000000000000'
                const fakeUserId = '00000000-0000-0000-0000-000000000001'
                const res = await apiCall<{ error: string }>(page, `/api/documents/${fakeDocId}/assignments`, { method: 'POST', body: { user_id: fakeUserId, allowed_phases: ['translate'] } })
                expect(res.status).toBe(401)
                expect(res.body.error).toMatch(/Unauthorized/i)
            })
        })
    })

    test.describe('Assignment Actions', () => {
        test.use({ storageState: 'tests/.auth/admin.json' })

        test('GET embeds user.username via profile join', async ({ page, snap }) => {
            await page.goto(`${BASE}/`)
            const documentId = await discoverDocumentId(page)
            const user = await discoverTranslatorUser(page)
            await snap('assignments_actions_join_setup')
            await apiCall(page, `/api/documents/${documentId}/assignments/${user.id}`, { method: 'DELETE' })
            const createRes = await apiCall(page, `/api/documents/${documentId}/assignments`, { method: 'POST', body: { user_id: user.id, allowed_phases: ['translate'] } })
            expect(createRes.status).toBe(201)
            const listRes = await apiCall<{ assignments: Array<{ user: string; allowed_phases: string[] }> }>(page, `/api/documents/${documentId}/assignments`)
            expect(listRes.status).toBe(200)
            const row = listRes.body.assignments.find((a) => a.user === user.id)
            expect(row, 'expected newly-created assignment in list').toBeTruthy()
            expect(row!.user).toBe(user.id)
            await apiCall(page, `/api/documents/${documentId}/assignments/${user.id}`, { method: 'DELETE' })
        })

        test('PATCH on nonexistent assignment returns 404', async ({ page }) => {
            await page.goto(`${BASE}/`)
            const documentId = await discoverDocumentId(page)
            const user = await discoverTranslatorUser(page)
            await apiCall(page, `/api/documents/${documentId}/assignments/${user.id}`, { method: 'DELETE' })
            const res = await apiCall<{ error: string }>(page, `/api/documents/${documentId}/assignments/${user.id}`, { method: 'PATCH', body: { allowed_phases: ['translate'] } })
            expect(res.status).toBe(404)
            expect(res.body.error).toMatch(/not found/i)
        })
    })

    test.describe('Transitions', () => {
        test.describe('Authenticated as translator', () => {
            test.use({ storageState: 'tests/.auth/translator.json' })
            test('GET returns ordered array for an existing segment', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const segment = (await findSegment(page, { status: 'translated' })) ?? (await findSegment(page, {}))
                test.skip(!segment, 'no segment available in live DB')
                if (!segment) return

                const res = await apiCall<{ transitions: Array<{ id: string; segment: string; from_status: string; to_status: string; created_at: string }> }>(page, `/api/segments/${segment.id}/transitions`)
                expect(res.status).toBe(200)
                expect(Array.isArray(res.body.transitions)).toBe(true)
                const rows = res.body.transitions
                if (rows.length >= 2) {
                    for (let i = 0; i < rows.length - 1; i++) {
                        expect(new Date(rows[i].created_at).getTime()).toBeGreaterThanOrEqual(new Date(rows[i + 1].created_at).getTime())
                    }
                }
            })

            test('GET with malformed id returns 404', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const res = await apiCall<{ error: string }>(page, `/api/segments/not-a-uuid/transitions`)
                expect(res.status).toBe(404)
            })

            test('GET with nonexistent uuid returns 404', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const fakeId = '00000000-0000-0000-0000-000000000000'
                const res = await apiCall<{ error: string }>(page, `/api/segments/${fakeId}/transitions`)
                expect(res.status).toBe(404)
            })
        })

        test.describe('Unauthenticated', () => {
            test('GET without auth returns 401', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const fakeId = '00000000-0000-0000-0000-000000000000'
                const res = await apiCall<{ error: string }>(page, `/api/segments/${fakeId}/transitions`)
                expect(res.status).toBe(401)
            })
        })
    })

    test.describe('Segment Activity', () => {
        test.describe('Authenticated as admin', () => {
            test.use({ storageState: 'tests/.auth/admin.json' })
            type ActivityRow = { segment: string; pending_suggestions: number; unresolved_comments: number; recent_transitions_24h: number }
            test('GET returns activity array for an existing document', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const docsRes = await apiCall<{ documents: Array<{ id: string }> }>(page, `/api/documents`)
                expect(docsRes.status).toBe(200)
                const docId = docsRes.body.documents?.[0]?.id
                test.skip(!docId, 'no documents available in live DB')
                if (!docId) return

                const res = await apiCall<{ activity: ActivityRow[] }>(page, `/api/documents/${docId}/segment-activity`)
                expect(res.status).toBe(200)
                expect(Array.isArray(res.body.activity)).toBe(true)
                for (const row of res.body.activity) {
                    expect(typeof row.segment).toBe('string')
                    expect(typeof row.pending_suggestions).toBe('number')
                    expect(typeof row.unresolved_comments).toBe('number')
                    expect(typeof row.recent_transitions_24h).toBe('number')
                }
            })

            test('GET on nonexistent document returns 404', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const fakeId = '00000000-0000-0000-0000-000000000000'
                const res = await apiCall<{ error: string }>(page, `/api/documents/${fakeId}/segment-activity`)
                expect(res.status).toBe(404)
            })
        })

        test.describe('Unauthenticated', () => {
            test('GET without auth returns 401', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const fakeId = '00000000-0000-0000-0000-000000000000'
                const res = await apiCall<{ error: string }>(page, `/api/documents/${fakeId}/segment-activity`)
                expect(res.status).toBe(401)
            })
        })
    })

    test.describe('Agents', () => {
        test.describe('Authenticated as translator (validation paths)', () => {
            test.use({ storageState: 'tests/.auth/translator.json' })
            test('bogus phase returns 400', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const fakeId = '00000000-0000-0000-0000-000000000000'
                const res = await apiCall<{ error: string }>(page, `/api/agents/bogus`, { method: 'POST', body: { segment_id: fakeId } })
                expect(res.status).toBe(400)
                expect(res.body.error).toMatch(/phase/i)
            })

            test('missing/invalid segment_id returns 400', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const noBody = await apiCall<{ error: string }>(page, `/api/agents/translate`, { method: 'POST', body: {} })
                expect(noBody.status).toBe(400)
                expect(noBody.body.error).toMatch(/segment_id/)
                const badShape = await apiCall<{ error: string }>(page, `/api/agents/translate`, { method: 'POST', body: { segment_id: 'not-a-uuid' } })
                expect(badShape.status).toBe(400)
                expect(badShape.body.error).toMatch(/segment_id/)
            })

            test("phase 'edit' on segment with empty target_text returns 422", async ({ page }) => {
                await page.goto(`${BASE}/`)
                const segment = await findSegment(page, { status: 'draft', hasTargetText: false })
                test.skip(!segment, 'no draft segment with empty target_text available')
                if (!segment) return
                const res = await apiCall<{ error: string }>(page, `/api/agents/edit`, { method: 'POST', body: { segment_id: segment.id } })
                expect(res.status).toBe(422)
                expect(res.body.error).toMatch(/target_text/)
            })

            test('LIVE translate phase produces a pending agent suggestion (skip if pool empty)', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const segment = await findSegment(page, { status: 'draft', hasTargetText: false })
                test.skip(!segment, 'no draft segment available')
                if (!segment) return
                const res = await apiCall<{ id: string; segment: string; suggester_kind: string; status: string; proposed_text: string; error?: string }>(page, `/api/agents/translate`, { method: 'POST', body: { segment_id: segment.id } })
                if (res.status === 503) {
                    test.skip(true, 'OpenRouter pool empty — live test skipped')
                    return
                }
                expect(res.status, JSON.stringify(res.body)).toBe(201)
                expect(res.body.segment).toBe(segment.id)
                expect(res.body.suggester_kind).toBe('agent')
                expect(res.body.status).toBe('pending')
                expect(res.body.proposed_text.length).toBeGreaterThan(0)
            })

            test('LIVE edit phase produces a pending agent suggestion (skip if pool empty)', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const segment = await findSegment(page, { status: 'translated', hasTargetText: true })
                test.skip(!segment, 'no translated segment with target_text available')
                if (!segment) return
                const res = await apiCall<{ id: string; segment: string; suggester_kind: string; status: string; proposed_text: string; error?: string }>(page, `/api/agents/edit`, { method: 'POST', body: { segment_id: segment.id } })
                if (res.status === 503) {
                    test.skip(true, 'OpenRouter pool empty — live test skipped')
                    return
                }
                expect(res.status, JSON.stringify(res.body)).toBe(201)
                expect(res.body.segment).toBe(segment.id)
                expect(res.body.suggester_kind).toBe('agent')
                expect(res.body.status).toBe('pending')
                expect(res.body.proposed_text.length).toBeGreaterThan(0)
            })
        })

        test.describe('Unauthenticated', () => {
            test('POST without auth returns 401', async ({ page }) => {
                await page.goto(`${BASE}/`)
                const fakeId = '00000000-0000-0000-0000-000000000000'
                const res = await apiCall<{ error: string }>(page, `/api/agents/translate`, { method: 'POST', body: { segment_id: fakeId } })
                expect(res.status).toBe(401)
                expect(res.body.error).toMatch(/Unauthorized/i)
            })
        })
    })

})
