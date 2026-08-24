"""Verifies the Selenium + Chrome install works end-to-end.

Selenium 4.6+ bundles Selenium Manager, which auto-downloads a ChromeDriver
matching the installed Chrome version, so this alone proves the whole chain
(Python -> selenium package -> driver -> Chrome) is wired up correctly.
"""

from selenium import webdriver
from selenium.webdriver.chrome.options import Options


def main() -> None:
    options = Options()
    options.add_argument("--headless=new")

    driver = webdriver.Chrome(options=options)
    try:
        driver.get("data:text/html,<title>Selenium OK</title><h1>It works</h1>")
        print(f"Page title: {driver.title}")
        assert driver.title == "Selenium OK"
        print("Selenium install verified successfully.")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
