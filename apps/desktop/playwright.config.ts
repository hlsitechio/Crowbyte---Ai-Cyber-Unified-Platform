import { defineConfig, devices } from '@playwright/test';

// E2E_BASE_URL=https://crowbyte.io for CI against prod
// Default: local dev server
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8081';
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: CI ? 2 : 0,
  reporter: CI
    ? [['github'], ['json', { outputFile: 'e2e-results.json' }]]
    : [['list']],

  use: {
    baseURL: BASE_URL,
    headless: true,
    channel: 'chrome',
    launchOptions: {
      executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Only spin up dev server when testing locally (not in CI against prod)
  webServer: CI ? undefined : {
    command: 'npx vite --mode test',
    port: 8081,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
