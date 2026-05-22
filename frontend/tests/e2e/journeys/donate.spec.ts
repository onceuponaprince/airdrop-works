import { test, expect } from '@playwright/test';

test.describe('Donate flows regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/donate');
  });

  test('Base (ETH) donation UI renders and allows preset selection', async ({ page }) => {
    // Default chain should be Base
    await expect(page.getByRole('button', { name: /Base \(ETH\)/i })).toBeVisible();

    // Presets visible
    await expect(page.getByRole('button', { name: '0.01 ETH' })).toBeVisible();
    await expect(page.getByRole('button', { name: '0.05 ETH' })).toBeVisible();

    // Select preset does not throw
    await page.getByRole('button', { name: '0.1 ETH' }).click();
  });

  test('Solana donation toggle works and shows SOL presets', async ({ page }) => {
    await page.getByRole('button', { name: /Solana \(SOL\)/i }).click();

    await expect(page.getByRole('button', { name: '0.5 SOL', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '1 SOL', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '5 SOL', exact: true })).toBeVisible();
  });

  test('Donate button disabled when no amount selected', async ({ page }) => {
    const donateBtn = page.getByRole('button', { name: /Donate|Support|Send/i });
    // If donate button exists and is disabled when amount empty
    if (await donateBtn.count() > 0) {
      await expect(donateBtn).toBeDisabled();
    }
  });
});