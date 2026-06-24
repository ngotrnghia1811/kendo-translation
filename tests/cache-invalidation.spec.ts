/**
 * tests/cache-invalidation.spec.ts
 *
 * Phase 4 hardening (I-4.9-MISSING-SPEC closure):
 * Verifies that editing a segment's target_text invalidates the reader's
 * Data Cache so the updated text appears on re-navigation within 5 seconds.
 *
 * Flow:
 *   1. As admin, navigate to the EDITOR page for a small editable article
 *      to find a segment ID (the editor exposes data-segment-id attributes).
 *   2. Capture the segment's current target_text and ID.
 *   3. PATCH that segment's target_text to a unique sentinel via the API.
 *   4. Navigate to the READER page and assert the sentinel appears.
 *   5. Restore the segment's original text (idempotent cleanup).
 *
 * Article used: 86adf815-b0ca-46eb-bab7-b6fb040b845c ("Baba 1 Clean")
 *   — a small document used by reader-lcp-gap.spec.ts; confirmed readable
 *     and editable via the segments PATCH API by the admin role.
 *
 * Auth: Uses tests/.auth/admin.json (admin auth state from global-setup.ts).
 * The editor page is only accessible to translators and admins per Phase 1.2i.
 *
 * Run: npx playwright test tests/cache-invalidation.spec.ts --project=camoufox
 */

import { test, expect } from '@playwright/test'

const ARTICLE_ID = '86adf815-b0ca-46eb-bab7-b6fb040b845c'
const EDIT_URL = `/documents/${ARTICLE_ID}/edit`
const READ_URL = `/documents/${ARTICLE_ID}/read`

/** Generate a unique sentinel unlikely to appear in real content. */
function sentinelText(): string {
    const ts = Date.now()
    return `__CACHE_INVAL_TEST_${ts}__`
}

test.use({ storageState: 'tests/.auth/admin.json' })

test.describe('Phase 4 cache invalidation', () => {
    test('editing a segment invalidates reader cache and shows updated text', async ({
        page,
        request,
    }) => {
        // ── 1. Navigate to editor to discover a segment ID ──────────────
        // The editor page renders individual segments with data-segment-id
        // attributes (components/editor/SegmentListItem.tsx:60).
        await page.goto(EDIT_URL, { waitUntil: 'load', timeout: 30_000 })

        // Wait for the segment list to render
        const segmentRow = page.locator('[data-segment-id]').first()
        try {
            await segmentRow.waitFor({ state: 'visible', timeout: 10_000 })
        } catch {
            test.skip(true,
                'No segments found in editor — article may have no segments ' +
                'or the admin role lacks editor access.',
            )
            return
        }

        const segmentId = (await segmentRow.getAttribute('data-segment-id'))!
        console.log(`[CACHE-INVAL] Found segment ID from editor DOM: ${segmentId}`)

        // Capture the current target_text from the editor's textarea
        // The editor has a textarea for target_text editing.
        const targetTextarea = segmentRow.locator('textarea').first()
        const hasTextarea = (await targetTextarea.count()) > 0

        let originalText: string
        if (hasTextarea) {
            originalText = (await targetTextarea.inputValue())?.trim() ?? ''
        } else {
            // Some editor views may render target text differently.
            // Fall back to querying the segment API.
            const segResp = await request.get(`/api/segments/${segmentId}`)
            if (!segResp.ok()) {
                test.skip(true,
                    `Cannot read segment ${segmentId}: API returned ${segResp.status()}`,
                )
                return
            }
            const segData = await segResp.json()
            originalText = segData.target_text ?? ''
        }
        console.log(
            `[CACHE-INVAL] Original text: "${originalText.slice(0, 80)}${originalText.length > 80 ? '…' : ''}"`,
        )

        // ── 2. PATCH the segment with a sentinel value ──────────────────
        const sentinel = sentinelText()
        console.log(`[CACHE-INVAL] PATCHing segment ${segmentId} → "${sentinel}"`)

        const patchResp = await request.patch(`/api/segments/${segmentId}`, {
            data: { target_text: sentinel },
        })
        expect(
            patchResp.ok(),
            `PATCH segment should succeed (status ${patchResp.status()}): ${await patchResp.text()}`,
        ).toBeTruthy()

        // ── 3. Navigate to reader and assert sentinel appears within 5s ─
        const navStart = Date.now()
        await page.goto(READ_URL, { waitUntil: 'load', timeout: 30_000 })

        // Wait for the sentinel text to appear anywhere in the page content.
        // The reader may render it inside <p>, <div lang="en">, or a <td>.
        // We use a broad content search.
        const sentinelLocator = page.getByText(sentinel)
        try {
            await sentinelLocator.first().waitFor({ state: 'attached', timeout: 5000 })
            const elapsed = Date.now() - navStart
            console.log(`[CACHE-INVAL] ✓ Sentinel appeared after ${elapsed}ms`)
            expect(
                elapsed,
                `Sentinel should appear within 5s of navigation (took ${elapsed}ms)`,
            ).toBeLessThan(5000)
        } catch {
            // Sentinel didn't appear — cache invalidation may have failed.
            const pageText = await page.locator('body').textContent()
            console.log(
                `[CACHE-INVAL] ✗ Sentinel not found. ` +
                `Page body sample: "${pageText?.slice(0, 400)}"`,
            )
            throw new Error(
                `Sentinel "${sentinel}" did not appear on reader page within 5s. ` +
                    'Cache invalidation may have failed — check revalidateTag/revalidatePath calls.',
            )
        }

        // ── 4. Cleanup: restore the original text ───────────────────────
        console.log(
            `[CACHE-INVAL] Restoring original text: "${originalText.slice(0, 80)}"`,
        )
        const restoreResp = await request.patch(`/api/segments/${segmentId}`, {
            data: { target_text: originalText },
        })
        const restoreOk = restoreResp.ok()
        console.log(
            `[CACHE-INVAL] Restore ${restoreOk ? '✓ succeeded' : `✗ failed (status ${restoreResp.status()})`}`,
        )
        if (!restoreOk) {
            console.warn(
                `[CACHE-INVAL] ⚠ MANUAL CLEANUP NEEDED: segment ${segmentId} ` +
                `still has sentinel "${sentinel}". Restore to: "${originalText}"`,
            )
        }
    })
})
