import { test, expect } from '@playwright/test'

test('auth smoke: login page shows wallet connect affordances', async ({ page }) => {
  await page.goto('/login')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()

  const connect = page.getByRole('button', { name: /^Connect$/ })
  const signMessage = page.getByRole('button', { name: /Sign message to continue/i })
  const walletUnavailable = page.getByRole('button', { name: /Wallet Unavailable/i })

  await expect(
    connect.or(signMessage).or(walletUnavailable).first()
  ).toBeVisible()
})
