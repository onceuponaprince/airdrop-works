import { test, expect } from '@playwright/test'
import { installApiV1Mocks, setAuthToken } from '../helpers/mockApi'

test('judge: score text shows a ScoreCard', async ({ page }) => {
  await setAuthToken(page, 'e2e-token')
  await installApiV1Mocks(page, {
    judgeScore: {
      teaching_value: 82,
      originality: 74,
      community_impact: 66,
      composite_score: 74,
      farming_flag: 'genuine',
      farming_explanation: 'Looks like a genuine technical contribution.',
      dimension_explanations: {
        teaching_value: 'Explains the why, not just the what.',
        originality: 'Contains original synthesis.',
        community_impact: 'Actionable for builders.',
      },
    },
  })

  await page.goto('/judge')
  await expect(page.getByRole('link', { name: /100/ })).toBeVisible()

  await page
    .getByPlaceholder('Paste a tweet or write contribution text to score...')
    .fill(
      "Just deployed a full Uniswap V3 fork on Avalanche with custom fee tiers. Here's my technical breakdown."
    )

  const scoreButton = page.getByRole('button', { name: /Score \(1 credit\)/i })
  await expect(scoreButton).toBeEnabled()

  const judgeResponse = page.waitForResponse(
    (res) =>
      res.request().method() === 'POST' &&
      /^\/api\/v1\/judge\/score\/?$/.test(new URL(res.url()).pathname)
  )
  await scoreButton.click()
  await judgeResponse

  await expect(page.getByText('AI Judge Score')).toBeVisible({ timeout: 20_000 })
})
