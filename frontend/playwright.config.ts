import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.E2E_PORT || '3001'
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm exec next dev -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          NEXT_PUBLIC_E2E: '1',
        },
      },
  testIgnore: process.env.CI
    ? ['**/wallet-connect-mock.spec.ts', '**/wallet-connect.spec.ts']
    : undefined,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  outputDir: 'test-results',
})
