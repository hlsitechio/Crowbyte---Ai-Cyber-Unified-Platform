/**
 * Smoke test — loads every route and verifies no crash.
 * This catches the #1 class of bugs: undefined property access on page load.
 */

import { test, expect } from '@playwright/test';

// All protected routes that need auth bypass
const ROUTES = [
  '/dashboard',
  '/analytics',
  '/chat',
  '/ai-agent',
  '/agent-builder',
  '/redteam',
  '/missions',
  '/mission-planner',
  '/cyber-ops',
  '/network-scanner',
  '/security-monitor',
  '/fleet',
  '/detection-lab',
  '/cloud-security',
  '/cve',
  '/threat-intelligence',
  '/findings',
  '/reports',
  '/knowledge',
  '/bookmarks',
  '/memory',
  '/terminal',
  '/logs',
  '/support',
  '/connectors',
  '/alert-center',
  '/tools',
  '/downloads',
  '/settings/profile',
  '/settings/general',
  '/settings/mcp',
  '/settings/tools',
  '/settings/memory',
  '/settings/testing',
  '/settings/security',
  '/settings/integrations',
  '/settings/advanced',
];

// Public routes (no auth needed)
const PUBLIC_ROUTES = [
  '/landing',
  '/auth',
  '/privacy',
  '/terms',
  '/refund',
  '/contact',
  '/documentation',
];

test.describe('Smoke Tests — Public Routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} loads without crash`, async ({ page }) => {
      // Listen for uncaught errors
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(route, { waitUntil: 'networkidle' });

      // Page should not show a blank white screen
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(0);

      // No uncaught JS errors
      expect(errors).toHaveLength(0);
    });
  }
});

test.describe('Smoke Tests — Protected Routes', () => {
  // These will redirect to /auth since we're not logged in.
  // The test verifies: redirect works, no crash on the redirect itself.
  for (const route of ROUTES) {
    test(`${route} redirects or loads without crash`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => {
        // Ignore Supabase auth errors (expected when not logged in)
        if (err.message.includes('AuthSession') || err.message.includes('refresh_token')) return;
        errors.push(err.message);
      });

      await page.goto(route, { waitUntil: 'networkidle' });

      // Should either show the page or redirect to auth
      const url = page.url();
      const isOnPage = url.includes(route) || url.includes('/auth') || url.includes('/landing');
      expect(isOnPage).toBeTruthy();

      // No uncaught JS errors (besides auth-related)
      expect(errors).toHaveLength(0);
    });
  }
});
