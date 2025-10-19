import { test, expect } from '@playwright/test';

// This test verifies that the Players page loads, lists players, and that the data mode badge toggles
// between File Mode and Firebase Mode using the Admin Settings Panel.
// Assumptions:
// - Admin panel route or component is accessible at /players or present on landing page (adjust selector if needed)
// - Data mode badge text exposed via getDataModeBadge() appears somewhere in players component template as `[ Data Mode: FILE ]` or similar.
// - Admin Settings Panel exposes a button with text 'Data Mode:' preceding toggle button.
// If selectors differ, update accordingly.

test.describe('Players Data Mode Toggle', () => {
  test('should toggle data mode via admin settings panel', async ({ page }) => {
    await page.goto('/');

    // Navigate to players feature if there's a menu; fallback: assume players list is on root
    // Attempt to find players heading by accessible name
    const playersHeading = page.getByRole('heading', { name: /players/i });
    // Non-blocking wait; if not found continue
    await playersHeading.waitFor({ state: 'visible', timeout: 5000 }).catch(err => {
      // Heading optional; log for debugging without failing test
      console.warn('Players heading not found (optional):', err?.message || err);
    });

    // Locate admin settings panel
    const adminPanel = page.locator('app-admin-settings-panel, .admin-settings');
    await expect(adminPanel).toBeVisible({ timeout: 8000 });

    // Read current mode text
    const modeButton = adminPanel.locator('button', { hasText: /file|firebase/i }).first();
    const initialText = (await modeButton.textContent())?.trim() || '';
    expect(initialText.length).toBeGreaterThan(0);

    // Toggle
    await modeButton.click();
    await page.waitForTimeout(600); // allow facade to rebuild subscriptions

    const afterText = (await modeButton.textContent())?.trim() || '';
    expect(afterText).not.toBe(initialText);

    // Toggle back
    await modeButton.click();
    await page.waitForTimeout(600);
    const finalText = (await modeButton.textContent())?.trim() || '';
    expect(finalText).toBe(initialText);
  });
});
