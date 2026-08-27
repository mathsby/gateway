import re
from playwright.sync_api import Playwright, sync_playwright, expect


def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto("https://gateway-api-docs.onrender.com/")
    page.get_by_role("link", name="Workers").click()
    page.get_by_text("{siteId}", exact=True).click()
    page.get_by_role("columnheader", name="Name").click()
    page.get_by_role("cell", name="siteId required").click()
    page.get_by_role("button", name="JavaScript").click()

    # ---------------------
    context.close()
    browser.close()


with sync_playwright() as playwright:
    run(playwright)

