"""One-off script: screenshots docs/index.html for a visual sanity check."""

import pathlib

from playwright.sync_api import sync_playwright

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS_FILE = REPO_ROOT / "docs" / "index.html"
OUT_FILE = REPO_ROOT / "playwright" / "docs-screenshot.png"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1400, "height": 1600})
            page.goto(DOCS_FILE.as_uri())
            page.wait_for_timeout(2000)
            page.screenshot(path=str(OUT_FILE), full_page=True)
            print(f"Saved screenshot to {OUT_FILE}")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
