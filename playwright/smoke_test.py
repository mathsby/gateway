"""Verifies the Playwright + Chromium install works end-to-end.

`playwright install chromium` downloads a matching browser binary that
Playwright drives directly (no separate driver executable), so this alone
proves the whole chain (Python -> playwright package -> Chromium) is wired
up correctly.
"""

from playwright.sync_api import sync_playwright


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto("data:text/html,<title>Playwright OK</title><h1>It works</h1>")
            print(f"Page title: {page.title()}")
            assert page.title() == "Playwright OK"
            print("Playwright install verified successfully.")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
