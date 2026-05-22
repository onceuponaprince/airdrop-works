import { test, expect } from '@playwright/test'
import { installApiV1Mocks } from '../helpers/mockApi'

const WALLET = '0x' + 'a'.repeat(40)

test.describe('Portable reputation API (mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await installApiV1Mocks(page)
  })

  test('integrity wallet bundle matches contract keys', async ({ page }) => {
    await page.goto('/')
    const { status, data } = await page.evaluate(async (wallet) => {
      const res = await fetch(`/api/v1/integrity/${wallet}/`)
      return { status: res.status, data: await res.json() }
    }, WALLET)

    expect(status).toBe(200)
    expect(data.walletAddress).toBe(WALLET)
    expect(data).toMatchObject({
      compositeScore: expect.any(Number),
      teachingValue: expect.any(Number),
      originality: expect.any(Number),
      communityImpact: expect.any(Number),
      farmingFlag: expect.stringMatching(/^(genuine|farming|ambiguous)$/),
      contributionCount: expect.any(Number),
    })
  })

  test('reputation history returns paginated results', async ({ page }) => {
    await page.goto('/')
    const { status, data } = await page.evaluate(async (wallet) => {
      const res = await fetch(`/api/v1/profiles/${wallet}/reputation/history/?limit=10`)
      return { status: res.status, data: await res.json() }
    }, WALLET)

    expect(status).toBe(200)
    expect(data.walletAddress).toBe(WALLET)
    expect(data.results).toHaveLength(1)
    expect(data.results[0]).toMatchObject({
      platform: 'twitter',
      compositeScore: expect.any(Number),
      farmingFlag: 'genuine',
    })
  })

  test('portable export returns PortableReputationExport bundle', async ({ page }) => {
    await page.goto('/')
    const { status, data } = await page.evaluate(async (wallet) => {
      const res = await fetch(`/api/v1/profiles/${wallet}/reputation/export/`)
      return { status: res.status, data: await res.json() }
    }, WALLET)

    expect(status).toBe(200)
    expect(data.type).toBe('PortableReputationExport')
    expect(data['@context']).toBe('https://airdrop.works/schemas/reputation/v1')
    expect(data.specVersion).toBe('1.0.0')
    expect(data.summary.walletAddress).toBe(WALLET)
    expect(data.history.length).toBeGreaterThanOrEqual(1)
    expect(data.meta.historyCount).toBeGreaterThanOrEqual(1)
  })

  test('authenticated appeals list is reachable', async ({ page }) => {
    await page.goto('/')
    const { status, data } = await page.evaluate(async () => {
      const res = await fetch('/api/v1/integrity/appeals/me/')
      return { status: res.status, data: await res.json() }
    })

    expect(status).toBe(200)
    expect(Array.isArray(data.results)).toBe(true)
  })

  test('staff can retrieve appeal detail', async ({ page }) => {
    await page.goto('/')
    const appealId = '00000000-0000-0000-0000-000000000001'
    const { status, data } = await page.evaluate(async (id) => {
      const res = await fetch(`/api/v1/integrity/appeals/${id}/`)
      return { status: res.status, data: await res.json() }
    }, appealId)

    expect(status).toBe(200)
    expect(data).toMatchObject({
      id: expect.any(String),
      status: expect.stringMatching(/^(pending|upheld|rejected)$/),
      walletAddress: expect.any(String),
    })
  })

  test('unauthenticated console access returns 401', async ({ page }) => {
    await page.goto('/')
    const { status } = await page.evaluate(async () => {
      const res = await fetch('/api/v1/integrity/console/overview/')
      return { status: res.status }
    })

    expect(status).toBe(401)
  })
})
