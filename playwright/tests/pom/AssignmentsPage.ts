// Training: Page Object Model for the Gateway "Assignments" API docs page.
//
// A page object owns every locator and action for one page, so tests read as
// intent ("select the curl tab") instead of CSS selectors. If the markup
// changes, this is the only file to update.
//
// Rules followed here:
//   - The constructor is synchronous: it only stores locators (lazy, cheap).
//   - Navigation lives in goto(), not the constructor.
//   - Locator fields are readonly and assigned once.
import { expect, type Page, type Locator } from '@playwright/test';
// Pull in Playwright's assertion helper plus the Page and Locator types for annotations.
import { docsUrl } from '../helpers';
// Import a helper that builds/normalizes the docs site URL (e.g. applies a base URL override).

export class AssignmentsPage {
// Declare the page object class; tests will `new AssignmentsPage(page)` and call its methods.
  readonly page: Page;
  // Holds the Playwright Page (browser tab) this page object drives; readonly so it's set once.
  readonly url: string;
  // The URL this page object loads in goto().

  // Header
  readonly methodBadge: Locator;
  // Locator for the HTTP method badge ("GET") shown in the endpoint header.
  readonly endpointPath: Locator;
  // Locator for the endpoint path text (e.g. "/v1/assignments") in the header.

  // Sidebar
  readonly activeNavLink: Locator;
  // Locator for the currently highlighted sidebar nav link.
  readonly disabledNavLinks: Locator;
  // Locator matching all greyed-out / non-clickable sidebar nav links.

  // Body sections
  readonly paramTable: Locator;
  // Locator for the query/path parameters table.
  readonly fieldList: Locator;
  // Locator for the response fields definition list.
  readonly rateLimits: Locator;
  // Locator for the "Rate limits" section, matched by its id.

  // Tab panels (only one of each is `.is-active` at a time)
  readonly activeLangPanel: Locator;
  // Locator for whichever request-example language panel is currently visible.
  readonly activeResponsePanel: Locator;
  // Locator for whichever response-example panel is currently visible.

  constructor(page: Page) {
  // Runs when a test creates the page object; only stores state, does no async work.
    this.page = page;
    // Keep the passed-in Page for use by every method.
    this.url = docsUrl('https://gateway-api-docs.onrender.com/');
    // Resolve the docs URL once (helper may swap in a local/base URL) and cache it.

    this.methodBadge = page.locator('.method-badge');
    // Build the locator lazily; it isn't queried until a method actually uses it.
    this.endpointPath = page.locator('.endpoint-path');

    this.activeNavLink = page.locator('.nav-link.active');
    // ".active" narrows the nav links to the single selected one.
    this.disabledNavLinks = page.locator('.nav-link.disabled');
    // ".disabled" matches every nav link marked unavailable (can be several).

    this.paramTable = page.locator('.param-table');
    this.fieldList = page.locator('.field-list');
    this.rateLimits = page.locator('#rate-limits');
    // "#" is an id selector, so this matches the one element with id="rate-limits".

    this.activeLangPanel = page.locator('.lang-panel.is-active');
    // ".is-active" picks the one language panel the UI currently shows.
    this.activeResponsePanel = page.locator('.response-panel.is-active');
  }

  /** Load the page. Call this at the start of every test (or in beforeEach). */
  async goto(): Promise<void> {
  // Async because navigation waits for the page to load.
    await this.page.goto(this.url);
    // Actually navigate the browser tab to the cached docs URL.
  }

  /** The request-example tab for a language, e.g. langTab('curl'). */
  langTab(lang: 'curl' | 'js' | 'python'): Locator {
  // Parameterized locator factory; the union type restricts callers to valid tab names.
    return this.page.locator(`.lang-tab[data-lang="${lang}"]`);
    // Interpolate the language into a data-attribute selector to target that specific tab.
  }

  /** The response tab for an HTTP status, e.g. statusTab('429'). */
  statusTab(status: '200' | '404' | '429'): Locator {
    return this.page.locator(`.status-tab[data-status="${status}"]`);
  }

  /** Click a language tab and wait until its panel is the visible one. */
  async selectLanguage(lang: 'curl' | 'js' | 'python'): Promise<void> {
    await this.langTab(lang).click();
    // Click the requested tab (auto-waits for it to be actionable).
    await expect(this.activeLangPanel).toHaveAttribute('data-lang', lang);
    // Assert (and retry until) the now-visible panel matches the language we clicked.
  }

  /** Click a status tab and wait until its panel is the visible one. */
  async selectStatus(status: '200' | '404' | '429'): Promise<void> {
    await this.statusTab(status).click();
    await expect(this.activeResponsePanel).toHaveAttribute('data-status', status);
  }

  /** The "Copy" button inside whichever language panel is currently visible. */
  get copyButton(): Locator {
  // A getter so callers write `page.copyButton`; recomputed each access against the active panel.
    return this.activeLangPanel.locator('.copy-btn');
    // Scope the search to the active panel so we get that panel's copy button, not another's.
  }

  /** Sanity check that the expected page actually loaded. */
  async assertLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle('Gateway API Reference');
    // Fail fast if navigation landed on the wrong page.
    await expect(this.methodBadge).toHaveText('GET');
    // Confirm the endpoint header rendered with the expected method.
  }
}
