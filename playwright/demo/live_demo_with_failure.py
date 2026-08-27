"""
Second part of the demo: what a FAILING check looks like, and how you'd
debug it — auto-screenshot on failure, which is exactly what you'd show
an interviewer when talking about debugging a flaky/failed test.
"""

import pathlib
from playwright.sync_api import sync_playwright

DOCS_URL = pathlib.Path(__file__).resolve().parent.joinpath("mock_docs.html").as_uri()
SCREENSHOT_PATH = pathlib.Path(__file__).resolve().parent / "failure_screenshot.png"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 800})
        page.goto(DOCS_URL)

        method = page.locator(".method-badge")
        actual = method.text_content()
        expected = "POST"  # deliberately wrong, to simulate a real failure

        try:
            assert actual == expected, (
                f"Expected method badge to read '{expected}' but got '{actual}'"
            )
            print("[PASS] method badge check")
        except AssertionError as e:
            print(f"[FAIL] method badge check: {e}")
            page.screenshot(path=str(SCREENSHOT_PATH))
            print(f"Saved failure screenshot to: {SCREENSHOT_PATH}")

        browser.close()


if __name__ == "__main__":
    main()
