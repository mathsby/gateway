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

## Claude + Playwright MCP workflow

The repo root has an [`.mcp.json`](../.mcp.json) that registers the
[Playwright MCP server](https://github.com/microsoft/playwright-mcp) for this
project. It gives Claude a *live* browser (navigate, click, snapshot the
accessibility tree, screenshot) separate from the `@playwright/test` runner
above — useful for exploring a page before writing a test, rather than
guessing selectors blind.

The first time you use it in a session, Claude Code will ask you to approve
the project-scoped server (`.mcp.json` is checked in, so every teammate gets
the same config). It launches Chromium at the same 1400×1600 viewport as
`playwright.config.ts`, keeps its profile in memory only (`--isolated`, so no
leftover cookies/storage between sessions), and writes any screenshots it
takes to `playwright/.mcp-output/` (gitignored).

Suggested loop when adding coverage for a page or widget:

1. **Explore** — ask Claude to navigate the MCP browser to the page (e.g. the
   `docsUrl()` target, or a `training-*` fixture) and take a snapshot to see
   the real DOM/accessibility tree instead of guessing at class names.
2. **Locate** — confirm the selectors that identify the element(s) you care
   about (mirrors the `.method-badge`, `.lang-tab[data-lang="curl"]` style
   already used in `tests/pom/AssignmentsPage.ts`).
3. **Encode** — add/extend a page object in `tests/pom/` with those locators
   and any actions, following the existing pattern: locators built in the
   constructor, navigation in `goto()`, one method per user action.
4. **Assert** — write the spec in `tests/*.spec.ts` against the page object,
   then run it for real with the test runner (MCP is for exploration, not for
   asserting — `npx playwright test` is still the source of truth):

   ```bash
   npx playwright test docs-page-assignments
   ```

5. **Debug failures** — if a test fails, prefer `HEADLESS=false npx
   playwright test` or the trace viewer over going back to MCP; MCP is best
   for *first contact* with a page, not for iterating on an existing spec.

## Layout

| File | Purpose |
| --- | --- |
| `playwright.config.ts` | Runner config: Chromium project, 1400×1600 viewport, `HEADLESS` env |
| `tests/helpers.ts` | `docsUrl()`, `activePanels()`, `safeName()` shared helpers |
| `tests/docs-page-assignments.spec.ts` | `docs/index.html` — Assignments reference page |
| `tests/docs-page-workers.spec.ts` | `workers.html` — Workers reference page (records traces) |

These replace the earlier `pytest` + `playwright.sync_api` versions
(`tests/test_docs_page_*.py`).
