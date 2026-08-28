import { defineConfig } from '@playwright/test';

/**
 * Config for the Gateway API docs Playwright suite.
 *
 * The page under test is chosen per spec file (or overridden with the DOCS_URL
 * env var). Headless by default; set HEADLESS=false to watch a real Chrome
 * window drive the tests (useful for demos/debugging):
 *
 *     HEADLESS=false npx playwright test
 *
 * Traceability: docs-page-workers.spec.ts records a Playwright trace
 * (screenshots + DOM snapshots + sources) per test to playwright/traces/<test-name>.zip.
 * Open one with:
 *
 *     npx playwright show-trace playwright/traces/request_language_tabs_switch_content_curl.zip
 */
const HEADLESS = !['false', '0', 'no'].includes(
  (process.env.HEADLESS ?? 'true').toLowerCase(),
);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: HEADLESS,
    launchOptions: { args: ['--window-size=1400,1600'] },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1400, height: 1600 },
      },
    },
  ],
});
