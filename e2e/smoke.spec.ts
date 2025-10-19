import { test, expect } from '@playwright/test';

test.describe('Smoke', () => {
  test('home loads and shows title', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h2.page-title');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Quản lý đội hình');
  });
});
