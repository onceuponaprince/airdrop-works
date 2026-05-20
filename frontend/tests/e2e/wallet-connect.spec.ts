import { test, expect } from '@playwright/test'

test.describe('Wallet connect skeleton', () => {
  test('opens homepage and shows connect button', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Connect').first()).toBeVisible()
  })

  test('opens connect modal (modal presence heuristic)', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Connect')
    // heuristic: ConnectKit shows recommended wallets list containing MetaMask
    await expect(page.locator('text=MetaMask').first()).toBeVisible()
  })
})
