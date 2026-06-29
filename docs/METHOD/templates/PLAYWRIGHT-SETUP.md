# Playwright E2E Setup Guide

**Owner:** Sage  
**Version:** 307.a  
**Purpose:** Step-by-step setup for Playwright E2E testing in METHOD apps

---

## Quick Start (5 minutes)

### 1. Install Playwright

```bash
npm init playwright@latest
```

When prompted:
- TypeScript: **Yes**
- Test directory: **tests/e2e**
- GitHub Actions: **No** (use `CI-TEMPLATE.yml` instead)
- Install browsers: **Yes** (Chromium only is fine for start)

### 2. Configure Playwright

Replace the generated `playwright.config.ts` with:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,          // Prevent .only in CI
  retries: process.env.CI ? 2 : 0,       // Retry in CI only
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',             // Capture traces for debugging
    screenshot: 'only-on-failure',
  },

  // Start dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add more browsers later:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
```

### 3. Add npm scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

## Writing Your First Spec

### Spec per CUJ Rule

Each CUJ in `docs/journeys/` gets exactly one spec file:

```
docs/journeys/auth-cuj.md        →  tests/e2e/01-auth-flow.spec.ts
docs/journeys/quote-cuj.md       →  tests/e2e/02-quote-creation.spec.ts
docs/journeys/settings-cuj.md    →  tests/e2e/03-settings.spec.ts
```

### Anatomy of a Spec

```typescript
// tests/e2e/01-auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('CUJ: Authentication', () => {
  
  test('can sign in with email/password', async ({ page }) => {
    await page.goto('/');
    
    // Fill login form
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test1234!');
    await page.click('button:has-text("Sign in")');
    
    // Verify: redirected to dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrong');
    await page.click('button:has-text("Sign in")');
    
    // Verify: error message shown
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('can sign out', async ({ page }) => {
    // Login first (use helper — see below)
    await loginAs(page, 'test@example.com', 'Test1234!');
    
    // Sign out
    await page.click('button:has-text("Sign out")');
    
    // Verify: redirected to login
    await expect(page).toHaveURL(/login|sign-in|\//);
  });
});
```

### Auth Helper (reusable)

```typescript
// tests/e2e/helpers/auth.ts
import { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/dashboard/);
}
```

---

## Firebase Auth in E2E Tests

### Option A: Firebase Auth Emulator (recommended)

```typescript
// playwright.config.ts — add to use:
use: {
  baseURL: 'http://localhost:3000',
  // Set env for Firebase emulator
},

// Start emulators alongside dev server
webServer: [
  {
    command: 'firebase emulators:start --only auth,firestore',
    url: 'http://localhost:9099',
    reuseExistingServer: !process.env.CI,
  },
  {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
],
```

### Option B: Test Account (simpler start)

Create a dedicated test user in Firebase Auth:
- Email: `e2e-test@yourapp.dev`
- Password: stored in `.env.test` (git-ignored)

```typescript
// tests/e2e/helpers/auth.ts
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test@yourapp.dev';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';
```

---

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode — great for debugging)
npm run test:e2e:ui

# Run specific spec
npx playwright test tests/e2e/01-auth-flow.spec.ts

# Run in debug mode (step through)
npm run test:e2e:debug

# Show HTML report after run
npx playwright show-report
```

---

## CI Integration

E2E tests are included in the CI Gate. See `CI-TEMPLATE.yml` — uncomment the `e2e` job when you have your first spec.

**Important:** E2E tests run AFTER the quality gate (lint + typecheck + tests + build). If quality fails, E2E is skipped.

---

## Spec Lifecycle

| Phase | Action |
|---|---|
| **CUJ defined** | Create empty spec file with `test.skip` placeholders |
| **CUJ implemented** | Write real assertions, remove `.skip` |
| **Sprint close** | All specs must pass in CI (Kill Gate) |
| **Feature changed** | Update spec to match new behavior |
| **Feature removed** | Delete spec |

---

## Gotchas

**Auth-gated pages:** Use the auth helper or Firebase emulator. Never hardcode real user credentials.

**Flaky tests:** Use `retries: 2` in CI. If a test is flaky more than 3 times, it has a real problem — fix the app, not the test.

**Slow tests:** Each spec should run in <30s. If slower, you're testing too much in one spec — split it.

**Screenshot on failure:** Configured by default (`screenshot: 'only-on-failure'`). Screenshots are saved in `test-results/`.

---

**Owner:** Sage  
**Last Updated:** 2026-05-13
