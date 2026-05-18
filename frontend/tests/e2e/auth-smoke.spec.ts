import { test, expect } from '@playwright/test';

test('auth smoke: login page shows sign in or connect wallet', async ({ page, baseURL }) => {
  await page.goto('/login');

  // Look for common text/buttons used by the app's login flow
  const connectButton = page.locator('text=Connect Wallet');
  const signInText = page.locator('text=Sign in');

  await expect(page).toHaveURL(/\/login$/);

  // At least one of these should be visible on the login page
  await expect(await Promise.race([connectButton.isVisible(), signInText.isVisible()])).toBeTruthy();
});
