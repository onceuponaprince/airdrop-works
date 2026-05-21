import { test, expect } from '@playwright/test'
import { installApiV1Mocks, setAuthToken } from '../helpers/mockApi'

test('dashboard loads with mocked API data', async ({ page }) => {
  await setAuthToken(page, 'e2e-token')
  await installApiV1Mocks(page, { token: 'e2e-token' })

  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Account Details')).toBeVisible()
  await expect(page.getByText('Scoring History')).toBeVisible()
})
