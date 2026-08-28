import { type Locator, type Page } from '@playwright/test';

/** Page under test: the DOCS_URL env var if set, otherwise the given live URL. */
export function docsUrl(fallback: string): string {
  return process.env.DOCS_URL || fallback;
}

/**
 * Elements matching `selector` that are currently "active" (their class list
 * contains "is-active"). Mirrors the Python `active_panels` helper, but returns
 * a Locator so callers can use auto-waiting assertions like `toHaveCount(1)`.
 */
export function activePanels(page: Page, selector: string): Locator {
  return page.locator(`${selector}.is-active`);
}

/** Turn a test title into a filesystem-safe string (non-safe chars -> "_"). */
export function safeName(name: string): string {
  return name.replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '');
}
