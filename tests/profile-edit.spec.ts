/**
 * tests/profile-edit.spec.ts
 *
 * Coverage gap: inline username edit on the /profile page.
 *
 * The profile page renders a UsernameEditor component (app/profile/page.tsx)
 * that shows an "Edit" button next to the username. Clicking it reveals an
 * input field with Save / Cancel buttons.
 *
 * Tests:
 *  1. username edit inline flow — edit, save new name, verify UI updates,
 *     then revert to original.
 *
 * Runs as the `translator` role (storageState: tests/.auth/translator.json)
 * whose profile username is mutable.
 *
 * Does NOT duplicate existing profile.spec.ts tests (heading, stats, role
 * badge, avatar, loading state, redirect).
 */

import { test, expect } from './helpers/camoufox-fixture'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3001'

test.describe('Profile — username edit', () => {
    test.use({ storageState: 'tests/.auth/translator.json' })

    test('username edit inline flow — edit, save, revert', async ({ page, snap }) => {
        await page.goto(`${BASE}/profile`)
        await page.waitForTimeout(2_000) // let profile data load
        await snap('profile_edit_initial')

        // The username should be visible with an "Edit" button next to it.
        // The Edit button has aria-label="Edit username".
        const editBtn = page.locator('button[aria-label="Edit username"]')
        await editBtn.waitFor({ state: 'visible', timeout: 10_000 })

        // Capture the current username before editing.
        const usernameSpan = page.locator('span.text-xl.font-semibold')
        const originalName = await usernameSpan.first().innerText()
        expect(originalName, 'original username should be non-empty').toBeTruthy()
        await snap('profile_edit_original_username')

        // Click Edit → the input field and Save/Cancel buttons should appear.
        await editBtn.click()
        await page.waitForTimeout(300)
        await snap('profile_edit_input_visible')

        const input = page.locator('input[placeholder="username"]')
        await input.waitFor({ state: 'visible', timeout: 5_000 })

        const saveBtn = page.locator('button', { hasText: 'Save' })
        await saveBtn.waitFor({ state: 'visible', timeout: 3_000 })

        const cancelBtn = page.locator('button', { hasText: 'Cancel' })
        await cancelBtn.waitFor({ state: 'visible', timeout: 3_000 })

        // Type a unique test username (append timestamp).
        const testName = `testuser-${Date.now()}`
        await input.fill(testName)
        await snap('profile_edit_name_typed')

        // Click Save.
        await saveBtn.click()
        await page.waitForTimeout(1_000) // wait for API round-trip
        await snap('profile_edit_saved')

        // The new username should appear in the UI (span.text-xl.font-semibold).
        // The edit button reappears after save (editing mode exits).
        await page.waitForTimeout(500)
        const savedSpan = page.locator('span.text-xl.font-semibold').first()
        await expect(savedSpan).toContainText(testName, { timeout: 5_000 })

        // ---- Revert: change back to the original name ----
        const editBtnAgain = page.locator('button[aria-label="Edit username"]')
        await editBtnAgain.waitFor({ state: 'visible', timeout: 5_000 })
        await editBtnAgain.click()
        await page.waitForTimeout(300)

        const inputAgain = page.locator('input[placeholder="username"]')
        await inputAgain.waitFor({ state: 'visible', timeout: 5_000 })
        await inputAgain.fill(originalName)

        const saveBtnAgain = page.locator('button', { hasText: 'Save' })
        await saveBtnAgain.click()
        await page.waitForTimeout(1_000)
        await snap('profile_edit_reverted')

        // Verify original name is restored.
        await expect(page.locator('span.text-xl.font-semibold').first()).toContainText(
            originalName,
            { timeout: 5_000 }
        )
    })
})
