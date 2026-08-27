import re
from playwright.sync_api import Playwright, sync_playwright, expect


def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto("https://gateway-api-docs.onrender.com/")
    page.locator('a.nav-link[href="./workers.html"]').click()
    page.locator(".endpoint-path .param").click()
    page.locator(".param-table th", has_text="Name").click()
    page.locator(".param-table td", has_text="siteId").click()
    page.locator('.lang-tab[data-lang="js"]').click()

    # ---------------------
    context.close()
    browser.close()


with sync_playwright() as playwright:
    run(playwright)

