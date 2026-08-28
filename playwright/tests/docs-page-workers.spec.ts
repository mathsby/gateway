/**
 * Playwright tests for workers.html (the Gateway API "Workers" reference page).
 *
 * Runs against the live Render static site by default; override with the
 * DOCS_URL env var to test a local file instead, e.g.:
 *
 *     DOCS_URL="file:///C:/GITHUB/gateway/docs/workers.html" npx playwright test
 *
 * Runs headless by default. Set HEADLESS=false to watch it drive a real,
 * visible Chrome window instead (useful for demos/debugging).
 *
 * Traceability: every test records a Playwright trace (screenshots + DOM
 * snapshots + sources) to playwright/traces/<test-name>.zip. Open one with:
 *
 *     npx playwright show-trace playwright/traces/request_language_tabs_switch_content_curl.zip
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { activePanels, docsUrl, safeName } from './helpers';

const DOCS_URL = docsUrl('https://gateway-api-docs.onrender.com/workers.html');
const TRACE_DIR = path.resolve(__dirname, '..', 'traces');

test.beforeEach(async ({ page, context }) => {
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  await page.goto(DOCS_URL);
});

test.afterEach(async ({ context }, testInfo) => {
  fs.mkdirSync(TRACE_DIR, { recursive: true });
  const tracePath = path.join(TRACE_DIR, `${safeName(testInfo.title)}.zip`);
  await context.tracing.stop({ path: tracePath });
});

test('page title', async ({ page }) => {
  await expect(page).toHaveTitle('Workers · Gateway API Reference');
});

test('endpoint header shows method and path', async ({ page }) => {
  await expect(page.locator('.method-badge')).toHaveText('GET');

  const pathText = (await page.locator('.endpoint-path').textContent()) ?? '';
  expect(pathText).toContain('/sites/');
  expect(pathText).toContain('/workers');
});

test('sidebar lists workers as the active resource', async ({ page }) => {
  await expect(page.locator('.nav-link.active')).toContainText('Workers');

  await expect(page.locator('.nav-link', { hasText: 'Assignments' })).toHaveAttribute(
    'href',
    './index.html',
  );

  const disabledLabels = await page.locator('.nav-link.disabled').allTextContents();
  expect(disabledLabels.some((label) => label.includes('Sites'))).toBe(true);
});

test('path parameters table documents siteId', async ({ page }) => {
  const tableText = await page.locator('.param-table').innerText();
  expect(tableText).toContain('siteId');
  expect(tableText).toContain('uuid');
  expect(tableText.toUpperCase()).toContain('REQUIRED');
});

const LANGUAGE_CASES = [
  { lang: 'curl', expectedSnippet: 'curl https://client-gateway-api.onrender.com' },
  { lang: 'js', expectedSnippet: 'fetch(' },
  { lang: 'python', expectedSnippet: 'requests.get(' },
];

for (const { lang, expectedSnippet } of LANGUAGE_CASES) {
  test(`request language tabs switch content (${lang})`, async ({ page }) => {
    await page.locator(`.lang-tab[data-lang="${lang}"]`).click();

    const panels = activePanels(page, '.lang-panel');
    await expect(panels, 'exactly one language panel should be visible at a time').toHaveCount(1);
    await expect(panels).toHaveAttribute('data-lang', lang);

    const text = await panels.innerText();
    expect(text).toContain(expectedSnippet);
    expect(text).toContain('/workers');
  });
}

const STATUS_CASES = [
  { status: '200', contentType: 'application/json' },
  { status: '404', contentType: 'application/problem+json' },
  { status: '429', contentType: 'application/problem+json' },
];

for (const { status, contentType } of STATUS_CASES) {
  test(`response status tabs switch content (${status})`, async ({ page }) => {
    await page.locator(`.status-tab[data-status="${status}"]`).click();

    const panels = activePanels(page, '.response-panel');
    await expect(panels, 'exactly one response panel should be visible at a time').toHaveCount(1);
    await expect(panels).toHaveAttribute('data-status', status);
    expect(await panels.innerText()).toContain(contentType);
  });
}

test('200 response lists the actual response fields', async ({ page }) => {
  await page.locator('.status-tab[data-status="200"]').click();

  const fieldsText = await page.locator('.field-list').innerText();
  for (const field of ['id', 'siteId', 'name', 'role', 'status']) {
    expect(fieldsText).toContain(field);
  }
});

test('404 response documents site not found', async ({ page }) => {
  await page.locator('.status-tab[data-status="404"]').click();
  await expect(activePanels(page, '.response-panel').first()).toContainText('Site not found');
});

test('429 response documents retry-after', async ({ page }) => {
  await page.locator('.status-tab[data-status="429"]').click();
  await expect(activePanels(page, '.response-panel').first()).toContainText('Retry-After');
});

test('rate limit section documents the actual limit', async ({ page }) => {
  const sectionText = await page.locator('#rate-limits').innerText();
  expect(sectionText).toContain('100');
  expect(sectionText).toContain('429');
  expect(sectionText).toContain('Retry-After');
});

test('copy button copies the visible code to the clipboard', async ({ page, context }) => {
  const { origin } = new URL(page.url());
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });

  await page.locator('.lang-tab[data-lang="curl"]').click();
  const panel = activePanels(page, '.lang-panel').first();
  const codeText = await panel.locator('pre').innerText();
  const copyBtn = panel.locator('.copy-btn');

  await copyBtn.click();
  await expect(copyBtn).toHaveText('Copied', { timeout: 2000 });

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText.trim()).toBe(codeText.trim());
});

test('sidebar anchor links resolve to real targets', async ({ page }) => {
  const anchors = page.locator('.nav-link[href^="#"]');
  const hrefs = await anchors.evaluateAll((els) =>
    els.map((el) => el.getAttribute('href') ?? ''),
  );
  expect(hrefs.length, 'expected at least one in-page anchor link in the sidebar').toBeGreaterThan(0);

  for (const href of hrefs) {
    await expect(
      page.locator(href),
      `sidebar link ${href} has no matching element on the page`,
    ).toHaveCount(1);
  }
});

test('errors nav link points at an errors section', async ({ page }) => {
  test.fail(
    true,
    "Bug: the sidebar 'Errors' link points at #errors, but the element with id='errors' " +
      "is the Response section (its heading reads 'Response'). There is no dedicated Errors " +
      'section on the page.',
  );

  const errorsLink = page.locator('.nav-link', { hasText: 'Errors' });
  await expect(errorsLink).toHaveAttribute('href', '#errors');

  const heading = page.locator('#errors').locator('h1, h2, h3').first();
  expect((await heading.innerText()).toLowerCase()).toContain('error');
});
