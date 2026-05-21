import { test, expect } from '@playwright/test'
import { installApiV1Mocks, setAuthToken } from '../helpers/mockApi'
import { mockTwitterAnalyzeStream } from '../helpers/mockStreams'

test('judge: account analysis completes and renders result', async ({ page }) => {
  await setAuthToken(page, 'e2e-token')

  await installApiV1Mocks(page, {
    subscription: {
      plan: 'pro',
      status: 'active',
      monthly_credits: 100,
      credits_remaining: 100,
      credits_reset_at: null,
      current_period_end: null,
      cancel_at_period_end: false,
      portal_available: false,
    },
  })

  await mockTwitterAnalyzeStream(page, {
    username: 'demo_user',
    aggregate: {
      overallScore: 72,
      teachingValue: 70,
      originality: 68,
      communityImpact: 75,
      farmingPercentage: 10,
      genuinePercentage: 80,
      strengths: 'Consistent educational threads.',
      weaknesses: 'Could add more primary sources.',
      verdict: 'genuine',
    },
  })

  await page.goto('/judge')
  await page.getByRole('button', { name: /Analyze Account/i }).click()

  const input = page.getByPlaceholder('twitter_handle')
  await input.fill('demo_user')

  const analyzeResponse = page.waitForResponse('**/api/twitter-analyze')
  await page.getByRole('button', { name: /Analyze \(5 credits\)/i }).click({ force: true })
  await analyzeResponse

  await expect(page.getByText('Account Analysis')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('@demo_user')).toBeVisible()
  await expect(page.getByText('AI Judge Score')).toBeVisible()
})
