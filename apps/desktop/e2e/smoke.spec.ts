import { test, expect } from '@playwright/test';

// ─── Critical Path Smoke Tests ───────────────────────────────────────────────
// These run in CI against production (crowbyte.io) after every deploy.
// If any of these fail, the deploy is broken.

const E2E_EMAIL = process.env.E2E_TEST_EMAIL || '';
const E2E_PASS  = process.env.E2E_TEST_PASS  || '';

test.describe('Landing page', () => {
  test('loads with correct title and no JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await expect(page).toHaveTitle(/CrowByte/);

    // Key landing elements present
    await expect(page.getByText(/offensive security/i).first()).toBeVisible();

    // No critical JS errors on load
    const critical = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('extension') &&
      !e.includes('__cf_bm')
    );
    expect(critical).toHaveLength(0);
  });

  test('assets return correct MIME types (no text/html for JS/CSS)', async ({ page }) => {
    const badMime: string[] = [];
    page.on('response', res => {
      const url = res.url();
      const ct  = res.headers()['content-type'] || '';
      if ((url.endsWith('.js') || url.endsWith('.css')) && ct.startsWith('text/html')) {
        badMime.push(url);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(badMime).toHaveLength(0);
  });
});

test.describe('Auth page', () => {
  test('renders login form', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'notreal@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Error message appears — Supabase auth returns invalid_grant
    await expect(page.locator('text=/invalid|incorrect|failed/i').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Dashboard (authenticated)', () => {
  test.skip(!E2E_EMAIL, 'Set E2E_TEST_EMAIL + E2E_TEST_PASS to run auth tests');

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', E2E_EMAIL);
    await page.fill('input[type="password"]', E2E_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
  });

  test('dashboard loads widgets without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.waitForLoadState('networkidle');

    // At least one widget visible
    await expect(page.locator('[class*="widget"], [data-widget]').first()).toBeVisible({ timeout: 10_000 });

    // No JS errors
    const critical = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('extension')
    );
    expect(critical).toHaveLength(0);
  });

  test('auth/v1/user called at most twice on dashboard load', async ({ page }) => {
    const authCalls: string[] = [];
    page.on('request', req => {
      if (req.url().includes('auth/v1/user')) authCalls.push(req.url());
    });

    await page.waitForLoadState('networkidle');
    // Was 8+, should be 0-2 after getUser→getSession migration
    expect(authCalls.length).toBeLessThanOrEqual(2);
  });

  test('CVE page loads and shows table', async ({ page }) => {
    await page.goto('/cve');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 15_000 });
  });
});
