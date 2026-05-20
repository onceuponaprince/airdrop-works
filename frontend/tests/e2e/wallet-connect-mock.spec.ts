import { test, expect } from '@playwright/test'
import { providerScriptSuccess, providerScriptReject, providerScriptWrongNetwork } from './helpers/mockEthereum'

test.describe('Wallet connect skeleton with mocked providers', () => {
  test('connect succeeds when provider returns accounts', async ({ page }) => {
    await page.addInitScript({ content: providerScriptSuccess({ chainId: '0xA86A' }) })
    await page.goto('/')
    await expect(page.locator('text=Connect').first()).toBeVisible()
    await page.click('text=Connect')
    // Attempt to connect and expect the UI shows some address fragment
    await page.click('text=MetaMask')
    await expect(page.locator('text=0x').first()).toBeVisible()
  })

  test('user rejects connect shows warning and try again', async ({ page }) => {
    await page.addInitScript({ content: providerScriptReject() })
    await page.goto('/')
    await page.click('text=Connect')
    await page.click('text=MetaMask')
    await expect(page.locator('text=You rejected').first()).toBeVisible()
  })

  test('wrong network shows instruction to switch', async ({ page }) => {
    await page.addInitScript({ content: providerScriptWrongNetwork({ chainId: '0x5' }) })
    await page.goto('/')
    await page.click('text=Connect')
    await page.click('text=MetaMask')
    // Expect UI instructs to switch networks (heuristic)
    await expect(page.locator('text=Please switch to Avalanche').first()).toBeVisible()
  })
})
