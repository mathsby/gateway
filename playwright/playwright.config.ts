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
// Compute a boolean: run browsers headless unless HEADLESS is explicitly "false"/"0"/"no".
const HEADLESS = !['false', '0', 'no'].includes(
  // Read the HEADLESS env var; if it is not set at all, default to the string 'true'.
  // .toLowerCase() so "FALSE", "False", "no" etc. all match the list above.
  (process.env.HEADLESS ?? 'true').toLowerCase(),
);
// If the (lowercased) value IS in the list, includes() is true, and the leading "!" flips it
// to false => not headless (visible browser). Any other value => headless stays true.

// `export default` makes this object the config Playwright loads for the whole suite.
// defineConfig() is just an identity helper that gives you type-checking/autocomplete.
export default defineConfig({
  testDir: './tests',            // Only look for test files in the ./tests folder (relative to this file).
  fullyParallel: true,           // Run tests within a file in parallel too, not just across files.
  forbidOnly: !!process.env.CI,  // On CI, fail the run if someone left a test.only() in the code. !! coerces the env var to a real boolean.
  retries: process.env.CI ? 1 : 0, // On CI, retry a failing test once (hides flakiness); locally, never retry.
  reporter: [['list'], ['html', { open: 'never' }]], // Two reporters: 'list' prints progress to the terminal; 'html' writes a report but doesn't auto-open a browser.
  use: {                         // Default options applied to every test (can be overridden per-project or per-test).
    headless: HEADLESS,          // Use the boolean computed above to decide headless vs. visible.
    launchOptions: { args: ['--window-size=1400,1600'] }, // Extra Chrome command-line flags: set the actual OS window size.
  },
  projects: [                    // A "project" is one named run configuration; the array lets you run the same tests many ways.
    {
      name: 'chromium',          // Label shown in reports and usable with `--project=chromium`.
      use: {                     // Options for THIS project, merged on top of the top-level `use` above.
        browserName: 'chromium', // Which browser engine to launch (other options: 'firefox', 'webkit').
        viewport: { width: 1400, height: 1600 }, // The page's rendering size in CSS pixels (separate from the OS window size above).
      },
    },
  ],
});
