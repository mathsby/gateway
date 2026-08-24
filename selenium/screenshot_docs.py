"""One-off script: screenshots docs/index.html for a visual sanity check."""

import pathlib

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS_FILE = REPO_ROOT / "docs" / "index.html"
OUT_FILE = REPO_ROOT / "selenium" / "docs-screenshot.png"


def main() -> None:
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1400,1600")

    driver = webdriver.Chrome(options=options)
    try:
        driver.get(DOCS_FILE.as_uri())
        driver.implicitly_wait(2)
        driver.save_screenshot(str(OUT_FILE))
        print(f"Saved screenshot to {OUT_FILE}")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
