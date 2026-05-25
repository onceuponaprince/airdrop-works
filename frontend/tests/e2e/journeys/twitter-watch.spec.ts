import { expect, test } from '@playwright/test'

import { installApiV1Mocks, setAuthToken } from '../helpers/mockApi'

const connectedTwitter = {
  connected: true,
  twitterUsername: 'demo_user',
  displayName: 'Demo User',
  watchEnabled: true,
  useSeleniumFallback: false,
  lastSyncedAt: new Date().toISOString(),
  lastError: '',
}

test.describe('Twitter watch panel (/sources)', () => {
  test('shows link X when disconnected', async ({ page }) => {
    await setAuthToken(page, 'e2e-token')
    await installApiV1Mocks(page, { token: 'e2e-token' })

    await page.goto('/sources')

    await expect(page.getByRole('heading', { name: 'Watch your X account' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Link X account' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Login with X' })).toBeVisible()
  })

  test('shows connected username, websocket line, and empty feed placeholder', async ({ page }) => {
    await setAuthToken(page, 'e2e-token')
    await installApiV1Mocks(page, { token: 'e2e-token', twitterMe: connectedTwitter })

    await page.goto('/sources')

    await expect(page.getByText('@demo_user')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sync now' })).toBeVisible()
    await expect(page.getByText(/WebSocket:/)).toBeVisible()
    await expect(page.getByText('Waiting for new tweets…')).toBeVisible()
  })

  test('Sync now POSTs /auth/twitter/sync/', async ({ page }) => {
    await setAuthToken(page, 'e2e-token')
    await installApiV1Mocks(page, { token: 'e2e-token', twitterMe: connectedTwitter })

    await page.goto('/sources')
    await expect(page.getByText('@demo_user')).toBeVisible()

    const posted = page.waitForRequest((r) =>
      r.url().includes('/api/v1/auth/twitter/sync/')
      && r.method() === 'POST',
    )
    await page.getByRole('button', { name: 'Sync now' }).click()
    await posted
  })

  test('toggling watch enabled PATCHes /auth/twitter/me/', async ({ page }) => {
    await setAuthToken(page, 'e2e-token')
    await installApiV1Mocks(page, { token: 'e2e-token', twitterMe: connectedTwitter })

    await page.goto('/sources')

    const patch = page.waitForRequest((r) =>
      r.url().includes('/api/v1/auth/twitter/me/')
      && r.method() === 'PATCH',
    )
    await page.getByRole('checkbox', { name: /Watch enabled/ }).click()
    const req = await patch
    expect(req.postDataJSON()).toMatchObject({ watchEnabled: false })
  })
})
