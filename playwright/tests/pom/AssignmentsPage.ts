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
import { docsUrl } from '../helpers';

export class AssignmentsPage {
  readonly page: Page;
  readonly url: string;

  // Header
  readonly methodBadge: Locator;
  readonly endpointPath: Locator;

  // Sidebar
  readonly activeNavLink: Locator;
  readonly disabledNavLinks: Locator;

  // Body sections
  readonly paramTable: Locator;
  readonly fieldList: Locator;
  readonly rateLimits: Locator;

  // Tab panels (only one of each is `.is-active` at a time)
  readonly activeLangPanel: Locator;
  readonly activeResponsePanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.url = docsUrl('https://gateway-api-docs.onrender.com/');

    this.methodBadge = page.locator('.method-badge');
    this.endpointPath = page.locator('.endpoint-path');

    this.activeNavLink = page.locator('.nav-link.active');
    this.disabledNavLinks = page.locator('.nav-link.disabled');

    this.paramTable = page.locator('.param-table');
    this.fieldList = page.locator('.field-list');
    this.rateLimits = page.locator('#rate-limits');

    this.activeLangPanel = page.locator('.lang-panel.is-active');
    this.activeResponsePanel = page.locator('.response-panel.is-active');
  }

  /** Load the page. Call this at the start of every test (or in beforeEach). */
  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  /** The request-example tab for a language, e.g. langTab('curl'). */
  langTab(lang: 'curl' | 'js' | 'python'): Locator {
    return this.page.locator(`.lang-tab[data-lang="${lang}"]`);
  }

  /** The response tab for an HTTP status, e.g. statusTab('429'). */
  statusTab(status: '200' | '404' | '429'): Locator {
    return this.page.locator(`.status-tab[data-status="${status}"]`);
  }

  /** Click a language tab and wait until its panel is the visible one. */
  async selectLanguage(lang: 'curl' | 'js' | 'python'): Promise<void> {
    await this.langTab(lang).click();
    await expect(this.activeLangPanel).toHaveAttribute('data-lang', lang);
  }

  /** Click a status tab and wait until its panel is the visible one. */
  async selectStatus(status: '200' | '404' | '429'): Promise<void> {
    await this.statusTab(status).click();
    await expect(this.activeResponsePanel).toHaveAttribute('data-status', status);
  }

  /** The "Copy" button inside whichever language panel is currently visible. */
  get copyButton(): Locator {
    return this.activeLangPanel.locator('.copy-btn');
  }

  /** Sanity check that the expected page actually loaded. */
  async assertLoaded(): Promise<void> {
    await expect(this.page).toHaveTitle('Gateway API Reference');
    await expect(this.methodBadge).toHaveText('GET');
  }
}
