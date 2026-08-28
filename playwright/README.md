# Playwright docs-site tests (TypeScript)

UI tests for the Gateway API reference site, written with
[`@playwright/test`](https://playwright.dev/).

## Setup

```bash
cd playwright
npm install          # also runs `playwright install chromium` via postinstall
```

## Run

```bash
npx playwright test                        # headless, against the live Render site
HEADLESS=false npx playwright test          # watch a real Chrome window
npx playwright test docs-page-workers       # a single spec
DOCS_URL="file:///C:/GITHUB/gateway/docs/workers.html" npx playwright test
```

`DOCS_URL` overrides the page under test; `HEADLESS=false` (or `0`/`no`) shows the browser.

## Traces

`docs-page-workers.spec.ts` writes a per-test trace (screenshots + DOM snapshots +
sources) to `playwright/traces/<test-name>.zip`. Open one with:

```bash
npx playwright show-trace playwright/traces/request_language_tabs_switch_content_curl.zip
```

The built-in HTML report (`npx playwright show-report`) also embeds traces for any
failed test.

## Layout

| File | Purpose |
| --- | --- |
| `playwright.config.ts` | Runner config: Chromium project, 1400×1600 viewport, `HEADLESS` env |
| `tests/helpers.ts` | `docsUrl()`, `activePanels()`, `safeName()` shared helpers |
| `tests/docs-page-assignments.spec.ts` | `docs/index.html` — Assignments reference page |
| `tests/docs-page-workers.spec.ts` | `workers.html` — Workers reference page (records traces) |

These replace the earlier `pytest` + `playwright.sync_api` versions
(`tests/test_docs_page_*.py`).
