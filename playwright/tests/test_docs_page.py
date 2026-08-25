"""Playwright tests for docs/index.html (the Gateway API reference page).

Runs against the live Render static site by default; override with the
DOCS_URL env var to test a local file instead, e.g.:

    DOCS_URL="file:///C:/GITHUB/gateway/docs/index.html" pytest playwright/tests

Runs headless by default. Set HEADLESS=false to watch it drive a real,
visible Chrome window instead (useful for demos/debugging).
"""

import os
from urllib.parse import urlparse

import pytest
from playwright.sync_api import Browser, Page, expect, sync_playwright

DOCS_URL = os.environ.get("DOCS_URL", "https://gateway-api-docs.onrender.com/")
HEADLESS = os.environ.get("HEADLESS", "true").lower() not in ("false", "0", "no")


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        br = p.chromium.launch(headless=HEADLESS, args=["--window-size=1400,1600"])
        yield br
        br.close()


@pytest.fixture()
def page(browser: Browser):
    context = browser.new_context(viewport={"width": 1400, "height": 1600})
    pg = context.new_page()
    pg.goto(DOCS_URL)
    yield pg
    context.close()


def active_panels(page: Page, selector):
    return [el for el in page.locator(selector).all() if "is-active" in (el.get_attribute("class") or "")]


def test_page_title(page):
    assert page.title() == "Gateway API Reference"


def test_endpoint_header_shows_method_and_path(page):
    method = page.locator(".method-badge")
    path = page.locator(".endpoint-path")

    assert method.text_content() == "GET"
    assert "/sites/" in path.text_content()
    assert "/assignments" in path.text_content()


def test_sidebar_lists_assignments_as_the_active_resource(page):
    active_link = page.locator(".nav-link.active")
    assert "Assignments" in active_link.text_content()

    disabled_labels = page.locator(".nav-link.disabled").all_text_contents()
    assert any("Workers" in label for label in disabled_labels)
    assert any("Sites" in label for label in disabled_labels)


def test_path_parameters_table_documents_site_id(page):
    table_text = page.locator(".param-table").inner_text()
    assert "siteId" in table_text
    assert "uuid" in table_text
    assert "REQUIRED" in table_text.upper()


@pytest.mark.parametrize(
    "lang,expected_snippet",
    [
        ("curl", "curl https://client-gateway-api.onrender.com"),
        ("js", "fetch("),
        ("python", "requests.get("),
    ],
)
def test_request_language_tabs_switch_content(page, lang, expected_snippet):
    page.locator(f'.lang-tab[data-lang="{lang}"]').click()

    panels = active_panels(page, ".lang-panel")
    assert len(panels) == 1, "exactly one language panel should be visible at a time"
    assert panels[0].get_attribute("data-lang") == lang
    assert expected_snippet in panels[0].inner_text()


@pytest.mark.parametrize(
    "status,content_type",
    [
        ("200", "application/json"),
        ("404", "application/problem+json"),
        ("429", "application/problem+json"),
    ],
)
def test_response_status_tabs_switch_content(page, status, content_type):
    page.locator(f'.status-tab[data-status="{status}"]').click()

    panels = active_panels(page, ".response-panel")
    assert len(panels) == 1, "exactly one response panel should be visible at a time"
    assert panels[0].get_attribute("data-status") == status
    assert content_type in panels[0].inner_text()


def test_200_response_lists_the_actual_response_fields(page):
    page.locator('.status-tab[data-status="200"]').click()
    fields_text = page.locator(".field-list").inner_text()
    for field in ["id", "siteId", "employeeName", "status", "startDate", "endDate"]:
        assert field in fields_text


def test_429_response_documents_retry_after(page):
    page.locator('.status-tab[data-status="429"]').click()
    panel = active_panels(page, ".response-panel")[0]
    assert "Retry-After" in panel.inner_text()


def test_rate_limit_section_documents_the_actual_limit(page):
    section_text = page.locator("#rate-limits").inner_text()
    assert "100" in section_text
    assert "429" in section_text


def test_copy_button_copies_the_visible_code_to_the_clipboard(page):
    origin = f"{urlparse(page.url).scheme}://{urlparse(page.url).netloc}"
    page.context.grant_permissions(["clipboard-read", "clipboard-write"], origin=origin)

    page.locator('.lang-tab[data-lang="curl"]').click()
    panel = active_panels(page, ".lang-panel")[0]
    code_text = panel.locator("pre").inner_text()
    copy_btn = panel.locator(".copy-btn")

    copy_btn.click()
    expect(copy_btn).to_have_text("Copied", timeout=2000)

    clipboard_text = page.evaluate("navigator.clipboard.readText()")
    assert clipboard_text.strip() == code_text.strip()
