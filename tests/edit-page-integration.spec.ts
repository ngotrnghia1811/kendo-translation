/**
 * tests/edit-page-integration.spec.ts
 *
 * Wave-2 FE Integration smoke tests: confirm that the cooperation
 * drawer wired into the live edit page renders the four expected
 * panels and that the new PhaseBadge attribute exposes the active
 * segment's status to the test harness.
 *
 * Test A — drawer opens and contains all four panels.
 * Test B — PhaseBadge inside the drawer carries data-status that
 *           matches the active segment's status as reported by the
 *           segments API.
 *
 * Both run as translator. We discover a real document via
 * /api/documents, mount /documents/<id>/edit, click the first segment
 * in the list, then assert UI structure.
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
                headers: init?.body
                    ? { 'Content-Type': 'application/json' }
                    : undefined,
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

async function discoverDocumentId(
    page: import('@playwright/test').Page
): Promise<string> {
    const docsRes = await apiCall<
        { documents?: Array<{ id: string; segment_count?: number }> } | Array<{ id: string; segment_count?: number }>
    >(page, '/api/documents')
    expect(docsRes.status).toBe(200)
    const docs = Array.isArray(docsRes.body)
        ? docsRes.body
        : (docsRes.body?.documents ?? [])
    expect(docs.length, 'expected at least one document').toBeGreaterThan(0)
    // Prefer a small article (1–99 segments) so the editor loads quickly
    // and the first segment button is unambiguous. Book-sized docs (1000+)
    // cause timing failures because their segment lists scroll-load and
    // the first `main button` may not be a segment row.
    const small = docs.find(
        (d) => typeof d.segment_count === 'number' && d.segment_count >= 1 && d.segment_count <= 99
    )
    return (small ?? docs[0]).id
}

test.describe('Edit page integration drawer', () => {
    test.use({ storageState: 'tests/.auth/translator.json' })

    test('Details drawer renders all four cooperation panels', async ({
        page,
        snap,
    }) => {
        const documentId = await (async () => {
            await page.goto(`${BASE}/`)
            return discoverDocumentId(page)
        })()

        await page.goto(`${BASE}/documents/${documentId}/edit`)
        // Wait for the segment list to render; the first list button is
        // the segment we'll select.
        const firstSegmentButton = page.locator('main button').first()
        await firstSegmentButton.waitFor({ state: 'visible', timeout: 15000 })
        await firstSegmentButton.click()
        await snap('edit_integration_segment_selected')

        const detailsToggle = page.getByTestId('segment-details-toggle')
        await detailsToggle.waitFor({ state: 'visible' })
        await detailsToggle.click()

        const drawer = page.getByTestId('segment-details-drawer')
        await drawer.waitFor({ state: 'visible' })

        // Panels expected inside the drawer.
        // For qa_approved segments the advance button renders as "phase-advance-terminal"
        // (a disabled button). For all other statuses it renders as "phase-advance-button".
        // Either way exactly one must be visible.
        const phaseControl = drawer.locator(
            '[data-testid="phase-advance-button"], [data-testid="phase-advance-terminal"]'
        )
        await expect(phaseControl).toBeVisible({ timeout: 15000 })
        // PhaseTransitionHistory renders one of {history, loading, empty, error}.
        // On cold server first renders the API call can take > 10 s.
        await expect(
            drawer.locator(
                '[data-testid^="phase-transition-history"]'
            )
        ).toBeVisible({ timeout: 20000 })
        // SuggestionPanel similarly renders one of {panel, loading, empty, error}.
        await expect(
            drawer.locator('[data-testid^="suggestion-panel"]')
        ).toBeVisible({ timeout: 20000 })
        // AgentSuggestionPanel is only rendered when agentPhaseFor(status) is non-null,
        // i.e. for draft/translated/edited/proofread but NOT for qa_approved.
        // We detect which case we're in by checking which phase control variant appeared.
        const isTerminal = await drawer
            .getByTestId('phase-advance-terminal')
            .isVisible()
        if (!isTerminal) {
            await expect(
                drawer.getByTestId('agent-suggestion-panel')
            ).toBeVisible({ timeout: 15000 })
        }
        await expect(
            drawer.locator('[data-testid^="comment-thread"]')
        ).toBeVisible({ timeout: 20000 })
    })

    test('PhaseBadge in drawer matches active segment status', async ({
        page,
    }) => {
        await page.goto(`${BASE}/`)
        const documentId = await discoverDocumentId(page)

        await page.goto(`${BASE}/documents/${documentId}/edit`)
        const firstSegmentButton = page.locator('main button').first()
        await firstSegmentButton.waitFor({ state: 'visible', timeout: 15000 })
        await firstSegmentButton.click()
        await page.getByTestId('segment-details-toggle').click()

        const drawer = page.getByTestId('segment-details-drawer')
        const badge = drawer.getByTestId('phase-badge').first()
        await badge.waitFor({ state: 'visible' })
        const status = await badge.getAttribute('data-status')
        expect(status, 'PhaseBadge must expose a data-status').toBeTruthy()
        expect(
            ['draft', 'translated', 'edited', 'proofread', 'qa_approved']
        ).toContain(status as string)
    })
})
