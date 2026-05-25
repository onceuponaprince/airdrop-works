import { expect, test, type Page } from '@playwright/test'

import {
  installApiV1Mocks,
  setAuthToken,
  type SocialAccountMockRow,
} from '../helpers/mockApi'

/** Root of `SocialAccountsPanel` (distinct footer copy). */
function socialAccountsSection(page: Page) {
  return page
    .getByText('Twitter & Discord use real OAuth.')
    .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
}

function stubTelegramDeepLinkOpens(page: Page) {
  return page.addInitScript(() => {
    const w = window as Window & { __e2eOpenedUrls?: string[] }
    w.__e2eOpenedUrls = []
    window.open = (url?: string | URL) => {
      w.__e2eOpenedUrls?.push(String(url ?? ''))
      return null
    }
  })
}

test.describe('Dashboard social connections (mocked)', () => {
  test('Discord linked shows freshness line for recent sync', async ({ page }) => {
    const syncedAt = new Date(Date.now() - 25 * 60 * 1000).toISOString()
    const socialAccounts: SocialAccountMockRow[] = [
      {
        platform: 'discord',
        username: 'collector',
        display_name: 'Collector',
        connected_at: new Date().toISOString(),
        last_synced_at: syncedAt,
      },
    ]

    await setAuthToken(page, 'e2e-token')
    await installApiV1Mocks(page, { token: 'e2e-token', socialAccounts })

    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: 'Connected Accounts' })).toBeVisible()
    await expect(page.getByText('@collector')).toBeVisible()
    await expect(page.getByText(/Last synced \d+m ago/)).toBeVisible()
  })

  test('Discord channel IDs Save posts cleaned list to API', async ({ page }) => {
    const socialAccounts: SocialAccountMockRow[] = [
      {
        platform: 'discord',
        username: 'channel_user',
        display_name: 'Channel User',
        connected_at: new Date().toISOString(),
      },
    ]

    await setAuthToken(page, 'e2e-token')
    await installApiV1Mocks(page, { token: 'e2e-token', socialAccounts })

    await page.goto('/dashboard')

    const input = page.getByPlaceholder('channel IDs (comma separated)')
    await input.fill(' 111 , 222 , 222 ')
    await expect(input).toBeVisible()

    const postDone = page.waitForRequest((r) =>
      r.url().includes('/api/v1/auth/discord/channels/')
      && r.method() === 'POST',
    )

    await page.getByRole('button', { name: 'Save' }).click()

    const req = await postDone
    const body = req.postDataJSON() as { channel_ids?: unknown }
    expect(body.channel_ids).toEqual(['111', '222'])
  })

  test('Telegram opens deep link URL from /auth/telegram/start/ when stubbed', async ({
    page,
  }) => {
    await stubTelegramDeepLinkOpens(page)
    await setAuthToken(page, 'e2e-token')
    await installApiV1Mocks(page, { token: 'e2e-token', socialAccounts: [] })

    await page.goto('/dashboard')

    const panel = socialAccountsSection(page)
    await panel.locator('select').selectOption({ value: 'telegram' })

    await expect(panel.getByRole('button', { name: 'Open Telegram Bot' })).toBeEnabled()

    const startDone = page.waitForResponse((res) =>
      res.url().includes('/api/v1/auth/telegram/start/')
      && res.request().method() === 'GET'
      && res.status() === 200,
    )
    await panel.getByRole('button', { name: 'Open Telegram Bot' }).click()
    await startDone

    const opened = await page.evaluate(() => {
      const w = window as Window & { __e2eOpenedUrls?: string[] }
      return [...(w.__e2eOpenedUrls ?? [])]
    })
    expect(opened[0]).toContain('tg://resolve')
    expect(opened[0]).toContain('domain=E2EAirdropWorksBot')
  })
})
