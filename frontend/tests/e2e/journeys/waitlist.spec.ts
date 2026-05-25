import { test, expect } from '@playwright/test'
import {
  installWaitlistMocks,
  WAITLIST_EMAIL_ONLY_QUEST_STATE,
  WAITLIST_SUBMIT_QUEST_STATE,
} from '../helpers/mockWaitlist'

test.describe('marketing waitlist submit step', () => {
  test.beforeEach(async ({ page }) => {
    await installWaitlistMocks(page)
    await page.addInitScript((state) => {
      sessionStorage.setItem('airdrop_quest_state', JSON.stringify(state))
    }, WAITLIST_SUBMIT_QUEST_STATE)
  })

  test('submit step shows success with rank and auth links', async ({ page }) => {
    await page.goto('/#waitlist')
    await page.locator('#waitlist').scrollIntoViewIfNeeded()

    await expect(page.getByRole('button', { name: /Claim Your Score/i })).toBeVisible()
    await expect(page.getByText(/e2e-waitlist@example\.com/i)).toBeVisible()

    await page.getByRole('button', { name: /Claim Your Score/i }).click()

    await expect(page.getByText(/Quest Complete/i)).toBeVisible()
    await expect(page.getByText(/Waitlist Rank/i)).toBeVisible()
    await expect(page.getByText(/#42/)).toBeVisible()
    const waitlist = page.locator('#waitlist')
    await expect(waitlist.getByRole('link', { name: /Approved\? Enter app/i })).toHaveAttribute(
      'href',
      '/signup',
    )
    await expect(waitlist.getByRole('link', { name: /Log in/i })).toHaveAttribute('href', '/login')
  })

  test('email-only submit shows wallet-later messaging', async ({ page }) => {
    await page.addInitScript((state) => {
      sessionStorage.setItem('airdrop_quest_state', JSON.stringify(state))
    }, WAITLIST_EMAIL_ONLY_QUEST_STATE)

    await page.goto('/#waitlist')
    await page.locator('#waitlist').scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: /Claim Your Score/i }).click()

    await expect(page.getByText(/Quest Complete/i)).toBeVisible()
    await expect(page.getByText(/Link your wallet later/i)).toBeVisible()
    await expect(page.getByText(/Wallet linked/i)).not.toBeVisible()
  })
})

test.describe('marketing waitlist landing CTA', () => {
  test.beforeEach(async ({ page }) => {
    await installWaitlistMocks(page)
  })

  test('landing waitlist CTA scrolls to form', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Join the Waitlist/i }).click()
    await page.locator('#waitlist').scrollIntoViewIfNeeded()
    await expect(page.locator('#waitlist')).toBeInViewport()
    await expect(page.getByText(/Verify Your Sigil/i)).toBeVisible()
  })
})
