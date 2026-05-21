import { test, expect } from '@playwright/test'
import { installApiV1Mocks, setAuthToken } from '../helpers/mockApi'

test.describe('Twitter watch panel', () => {
  test('sources page shows link X when disconnected', async ({ page }) => {
    await setAuthToken(page, 'e2e-token')
    await installApiV1Mocks(page, { token: 'e2e-token' })

    await page.goto('/sources')

    await expect(page.getByRole('heading', { name: 'Watch your X account' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Link X account' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Login with X' })).toBeVisible()
  })

  test('sources page shows connected state and live feed section', async ({ page }) => {
    await setAuthToken(page, 'e2e-token')
    await installApiV1Mocks(page, { token: 'e2e-token' })

    await page.route('**/api/v1/auth/twitter/me/', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          connected: true,
          twitterUsername: 'demo_user',
          displayName: 'Demo User',
          watchEnabled: true,
          useSeleniumFallback: false,
          lastSyncedAt: new Date().toISOString(),
          lastError: '',
        }),
      })
    })

    await page.goto('/sources')

    await expect(page.getByText('@demo_user')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sync now' })).toBeVisible()
    await expect(page.getByText(/WebSocket:/)).toBeVisible()
    await expect(page.getByText('Waiting for new tweets…')).toBeVisible()
  })
})
