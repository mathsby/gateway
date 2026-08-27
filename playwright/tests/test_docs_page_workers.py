"""Playwright tests for workers.html (the Gateway API "Workers" reference page).

Runs against the live Render static site by default; override with the
DOCS_URL env var to test a local file instead, e.g.:

    DOCS_URL="file:///C:/GITHUB/gateway/docs/workers.html" pytest playwright/tests

Runs headless by default. Set HEADLESS=false to watch it drive a real,
visible Chrome window instead (useful for demos/debugging).

Traceability: every test records a Playwright trace (screenshots + DOM
snapshots + sources) to playwright/traces/<test-name>.zip. Open one with the
CLI from the project venv (do NOT use npx):

    .venv/Scripts/playwright show-trace playwright/traces/test_request_language_tabs_switch_content_curl.zip
"""

import os
import re
from pathlib import Path
from urllib.parse import urlparse

import pytest
from playwright.sync_api import Browser, Page, expect, sync_playwright

DOCS_URL = os.environ.get("DOCS_URL", "https://gateway-api-docs.onrender.com/workers.html")
HEADLESS = os.environ.get("HEADLESS", "true").lower() not in ("false", "0", "no")

TRACE_DIR = Path(__file__).resolve().parent.parent / "traces"


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        br = p.chromium.launch(headless=HEADLESS, args=["--window-size=1400,1600"])
        yield br
        br.close()


@pytest.fixture()
def page(browser: Browser, request):
    context = browser.new_context(viewport={"width": 1400, "height": 1600})
    context.tracing.start(screenshots=True, snapshots=True, sources=True)

    pg = context.new_page()
    pg.goto(DOCS_URL)
    yield pg

    TRACE_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", request.node.name).strip("_")
    trace_path = TRACE_DIR / f"{safe_name}.zip"
    context.tracing.stop(path=str(trace_path))
    context.close()


def active_panels(page: Page, selector):
    return [el for el in page.locator(selector).all() if "is-active" in (el.get_attribute("class") or "")]


def test_page_title(page):
    assert page.title() == "Workers · Gateway API Reference"


def test_endpoint_header_shows_method_and_path(page):
    method = page.locator(".method-badge")
    path = page.locator(".endpoint-path")

    assert method.text_content() == "GET"
    assert "/sites/" in path.text_content()
    assert "/workers" in path.text_content()


def test_sidebar_lists_workers_as_the_active_resource(page):
    active_link = page.locator(".nav-link.active")
    assert "Workers" in active_link.text_content()

    assignments_link = page.locator(".nav-link", has_text="Assignments")
    assert assignments_link.get_attribute("href") == "./index.html"

    disabled_labels = page.locator(".nav-link.disabled").all_text_contents()
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
    ids=["curl", "js", "python"],
)
def test_request_language_tabs_switch_content(page, lang, expected_snippet):
    page.locator(f'.lang-tab[data-lang="{lang}"]').click()

    panels = active_panels(page, ".lang-panel")
    assert len(panels) == 1, "exactly one language panel should be visible at a time"
    assert panels[0].get_attribute("data-lang") == lang
    text = panels[0].inner_text()
    assert expected_snippet in text
    assert "/workers" in text


@pytest.mark.parametrize(
    "status,content_type",
    [
        ("200", "application/json"),
        ("404", "application/problem+json"),
        ("429", "application/problem+json"),
    ],
    ids=["200", "404", "429"],
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
    for field in ["id", "siteId", "name", "role", "status"]:
        assert field in fields_text


def test_404_response_documents_site_not_found(page):
    page.locator('.status-tab[data-status="404"]').click()
    panel = active_panels(page, ".response-panel")[0]
    assert "Site not found" in panel.inner_text()


def test_429_response_documents_retry_after(page):
    page.locator('.status-tab[data-status="429"]').click()
    panel = active_panels(page, ".response-panel")[0]
    assert "Retry-After" in panel.inner_text()


def test_rate_limit_section_documents_the_actual_limit(page):
    section_text = page.locator("#rate-limits").inner_text()
    assert "100" in section_text
    assert "429" in section_text
    assert "Retry-After" in section_text


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


def test_sidebar_anchor_links_resolve_to_real_targets(page):
    anchors = page.locator('.nav-link[href^="#"]')
    hrefs = [a.get_attribute("href") for a in anchors.all()]
    assert hrefs, "expected at least one in-page anchor link in the sidebar"
    for href in hrefs:
        target = page.locator(href)
        assert target.count() == 1, f"sidebar link {href} has no matching element on the page"


@pytest.mark.xfail(
    reason=(
        "Bug: the sidebar 'Errors' link points at #errors, but the element with "
        "id='errors' is the Response section (its heading reads 'Response'). "
        "There is no dedicated Errors section on the page."
    ),
    strict=True,
)
def test_errors_nav_link_points_at_an_errors_section(page):
    errors_link = page.locator(".nav-link", has_text="Errors")
    href = errors_link.get_attribute("href")
    assert href == "#errors"

    target = page.locator(href)
    assert "error" in target.locator("h1, h2, h3").first.inner_text().lower()
