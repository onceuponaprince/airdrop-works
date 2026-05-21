import { test, expect } from '@playwright/test'
import { installApiV1Mocks, setAuthToken } from '../helpers/mockApi'
import { mockJudgeStream } from '../helpers/mockStreams'

test('judge: score text shows a ScoreCard', async ({ page }) => {
  await setAuthToken(page, 'e2e-token')
  await installApiV1Mocks(page)

  await mockJudgeStream(page, {
    teachingValue: 82,
    originality: 74,
    communityImpact: 66,
    compositeScore: 74,
    farmingFlag: 'genuine',
    farmingExplanation: 'Looks like a genuine technical contribution.',
    dimensionExplanations: {
      teachingValue: 'Explains the why, not just the what.',
      originality: 'Contains original synthesis.',
      communityImpact: 'Actionable for builders.',
    },
  })

  await page.goto('/judge')

  const demo = page.locator('button').filter({ hasText: 'Just deployed' }).first()
  await demo.click()

  const judgeResponse = page.waitForResponse('**/api/judge')
  await page.getByRole('button', { name: /Score \(1 credit\)/i }).click({ force: true })
  await judgeResponse

  await expect(page.getByText('AI Judge Score')).toBeVisible()
})
