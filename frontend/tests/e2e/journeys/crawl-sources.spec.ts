import { expect, test, type Page } from '@playwright/test'

import { installApiV1Mocks, setAuthToken } from '../helpers/mockApi'

function connectSourceForm(page: Page) {
  return page.locator('form').filter({
    has: page.getByRole('button', { name: /Connect \+ crawl/ }),
  })
}

test.describe('/sources crawl ingest form', () => {
  test('shows empty crawl list before first source', async ({ page }) => {
    await setAuthToken(page, 'e2e-token')
    await installApiV1Mocks(page, { token: 'e2e-token' })

    await page.goto('/sources')

    await expect(page.getByRole('heading', { level: 1, name: 'Sources' })).toBeVisible()
    await expect(
      page.getByText('No connected sources yet', { exact: false }),
    ).toBeVisible()
  })

  test('queues Reddit crawl, shows source card, PATCH pause, POST run-now crawl', async ({
    page,
  }) => {
    await setAuthToken(page, 'e2e-token')
    await installApiV1Mocks(page, { token: 'e2e-token' })

    await page.goto('/sources')

    const form = connectSourceForm(page)
    await form.locator('select').selectOption({ value: 'reddit' })

    await expect(form.locator('input')).toHaveAttribute('placeholder', 'python')

    const connectPromise = page.waitForRequest((r) =>
      r.url().includes('/api/v1/contributions/crawl/reddit/')
      && r.method() === 'POST',
    )
    await form.locator('input').fill('r/python/')
    await form.getByRole('button', { name: /Connect \+ crawl/ }).click()
    expect((await connectPromise).postDataJSON()).toMatchObject({ subreddit: 'python' })

    const sourceCard = page.locator('article').filter({
      has: page.getByRole('heading', { name: 'python', exact: true }),
    })

    await expect(sourceCard).toBeVisible()

    /** DOM text is “Reddit”; Tailwind `uppercase` is visual styling only for Playwright. */
    await expect(sourceCard.locator('.uppercase')).toContainText(/reddit/i)

    const patchPromise = page.waitForRequest((r) =>
      r.url().includes('/api/v1/contributions/sources/')
      && r.method() === 'PATCH',
    )

    await sourceCard.getByRole('button', { name: 'Pause' }).click()
    expect((await patchPromise).postDataJSON()).toMatchObject({ is_active: false })
    await expect(sourceCard.getByText('Paused', { exact: true })).toBeVisible()

    const runNowPromise = page.waitForRequest((r) => {
      if (r.method() !== 'POST') return false
      const pathname = new URL(r.url()).pathname.replace(/\/+$/, '')
      return /^\/api\/v1\/contributions\/sources\/[^/]+\/crawl$/.test(pathname)
    })

    await sourceCard.getByRole('button', { name: 'Run now' }).click()
    await runNowPromise
  })

  test('queues Discord crawl with channel_id payload', async ({ page }) => {
    await setAuthToken(page, 'e2e-token')
    await installApiV1Mocks(page, { token: 'e2e-token' })

    await page.goto('/sources')

    const form = connectSourceForm(page)
    await form.locator('select').selectOption({ value: 'discord' })

    const postPromise = page.waitForRequest((r) =>
      r.url().includes('/api/v1/contributions/crawl/discord/')
      && r.method() === 'POST',
    )
    await form.locator('input').fill('123456789012345678')
    await form.getByRole('button', { name: /Connect \+ crawl/ }).click()

    expect((await postPromise).postDataJSON()).toMatchObject({
      channel_id: '123456789012345678',
    })

    await expect(page.getByRole('heading', { name: '123456789012345678', exact: true })).toBeVisible()
  })
})
