# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-smoke.spec.ts >> auth smoke: login page shows sign in or connect wallet
- Location: tests/e2e/auth-smoke.spec.ts:3:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('auth smoke: login page shows sign in or connect wallet', async ({ page, baseURL }) => {
> 4  |   await page.goto('/login');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  5  | 
  6  |   // Look for common text/buttons used by the app's login flow
  7  |   const connectButton = page.locator('text=Connect Wallet');
  8  |   const signInText = page.locator('text=Sign in');
  9  | 
  10 |   await expect(page).toHaveURL(/\/login$/);
  11 | 
  12 |   // At least one of these should be visible on the login page
  13 |   await expect(await Promise.race([connectButton.isVisible(), signInText.isVisible()])).toBeTruthy();
  14 | });
  15 | 
```