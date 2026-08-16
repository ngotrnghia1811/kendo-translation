import { Page, expect } from '@playwright/test';

/**
 * Ensures the reader sidebar is open.
 * Checks for collapsed state and expands if necessary, with retries.
 */
export async function ensureSidebarOpen(page: Page) {
  // Check if sidebar is already expanded by looking for the "Collapse sidebar" button (desktop) or "Close sidebar" (mobile)
  const isExpanded = (await page.locator('button[aria-label="Collapse sidebar"]').count() > 0) ||
                     (await page.locator('button[aria-label="Close sidebar"]').count() > 0);

  if (!isExpanded) {
    // Try to click expand button.
    const expandButtons = [
      'button[aria-label="Expand sidebar"]',
      'button[aria-label="Open sidebar"]',
      'button[aria-label="Open document sidebar (contents and search)"]',
      'button[aria-label="Open document contents, search, and filter"]',
    ];

    // Use a locator that matches any of them and wait for it
    const expandLocator = page.locator(expandButtons.join(', '));
    
    try {
        await expandLocator.first().waitFor({ state: 'visible', timeout: 5000 });
        await expandLocator.first().click();
    } catch (e) {
        // Maybe it's already expanded but something else is wrong?
        if ((await page.locator('span', { hasText: 'Sidebar' }).isVisible())) {
            return; // Already open
        }
        throw new Error('Could not find sidebar expand button or sidebar header');
    }

    // Wait for the sidebar to be fully open/visible (check for "Collapse sidebar" or "Close sidebar" to appear)
    await expect(page.locator('[data-testid="reader-sidebar-panel"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('button[aria-label="Collapse sidebar"], button[aria-label="Close sidebar"]')).toBeVisible({ timeout: 10000 });
  }
}
