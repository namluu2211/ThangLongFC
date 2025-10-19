import { test, expect } from '@playwright/test';

// Assumes app served at http://localhost:4200 and players component accessible via /players route or root if players is default.
// Adjust selector texts based on actual template (placeholders used).

test.describe('Players AI Analysis Non-blocking', () => {
  test('UI remains interactive during AI analysis', async ({ page }) => {
    await page.goto('http://localhost:4200');

    // Navigate to players view if needed (attempt clicking nav link)
    const playersNav = page.locator('a:has-text("Cầu thủ")');
    if (await playersNav.count()) {
      await playersNav.click();
    }

    // Ensure players list rendered
    await expect(page.locator('text=Chế độ')).toBeVisible();

    // Trigger team shuffle to start analysis
    const shuffleBtn = page.locator('button:has-text("Chia đội")');
    if (await shuffleBtn.count()) {
      await shuffleBtn.click();
    }

    // Start AI analysis implicitly via team change
    // While analysis is running (we detect spinner or analyzing flag) try interacting with pagination
    const analyzingLocator = page.locator('text=Đang phân tích');

    // If analysis indicator appears, attempt interaction
    if (await analyzingLocator.count()) {
      const nextPageBtn = page.locator('button:has-text("Tiếp")');
      if (await nextPageBtn.count()) {
        await nextPageBtn.click();
        // Confirm page changed by checking some dynamic element or state text
        // Placeholder: expect player list to still be visible and not blocked
        await expect(page.locator('text=Cầu thủ')).toBeVisible();
      }
    }

    // Wait for analysis results (probability text placeholder)
    const resultProb = page.locator('text=%');
    await expect(resultProb.first()).toBeVisible({ timeout: 10000 });
  });
});
