import { test, expect } from '@playwright/test'

test('landing renders primary funnel CTAs', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText(/Bots Get Rewarded\./)).toBeVisible()
  await expect(page.getByRole('button', { name: /Try the Judge Demo/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Join the Waitlist/i })).toBeVisible()
})
