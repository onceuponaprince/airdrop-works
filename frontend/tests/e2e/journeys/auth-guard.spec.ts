import { test, expect } from '@playwright/test'

test('unauthenticated app route redirects to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})
