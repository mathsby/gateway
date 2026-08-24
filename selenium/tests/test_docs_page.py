"""Selenium tests for docs/index.html (the Gateway API reference page).

Runs against the live Render static site by default; override with the
DOCS_URL env var to test a local file instead, e.g.:

    DOCS_URL="file:///C:/GITHUB/gateway/docs/index.html" pytest selenium/tests
"""

import os
from urllib.parse import urlparse

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

DOCS_URL = os.environ.get("DOCS_URL", "https://gateway-api-docs.onrender.com/")


@pytest.fixture()
def driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1400,1600")

    drv = webdriver.Chrome(options=options)
    drv.get(DOCS_URL)
    yield drv
    drv.quit()


def active_panels(driver, selector):
    return [el for el in driver.find_elements(By.CSS_SELECTOR, selector) if "is-active" in el.get_attribute("class")]


def test_page_title(driver):
    assert driver.title == "Gateway API Reference"


def test_endpoint_header_shows_method_and_path(driver):
    method = driver.find_element(By.CSS_SELECTOR, ".method-badge")
    path = driver.find_element(By.CSS_SELECTOR, ".endpoint-path")

    assert method.text == "GET"
    assert "/sites/" in path.text
    assert "/assignments" in path.text


def test_sidebar_lists_assignments_as_the_active_resource(driver):
    active_link = driver.find_element(By.CSS_SELECTOR, ".nav-link.active")
    assert "Assignments" in active_link.text

    disabled_labels = [el.text for el in driver.find_elements(By.CSS_SELECTOR, ".nav-link.disabled")]
    assert any("Workers" in label for label in disabled_labels)
    assert any("Sites" in label for label in disabled_labels)


def test_path_parameters_table_documents_site_id(driver):
    table_text = driver.find_element(By.CSS_SELECTOR, ".param-table").text
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
def test_request_language_tabs_switch_content(driver, lang, expected_snippet):
    driver.find_element(By.CSS_SELECTOR, f'.lang-tab[data-lang="{lang}"]').click()

    panels = active_panels(driver, ".lang-panel")
    assert len(panels) == 1, "exactly one language panel should be visible at a time"
    assert panels[0].get_attribute("data-lang") == lang
    assert expected_snippet in panels[0].text


@pytest.mark.parametrize(
    "status,content_type",
    [
        ("200", "application/json"),
        ("404", "application/problem+json"),
        ("429", "application/problem+json"),
    ],
)
def test_response_status_tabs_switch_content(driver, status, content_type):
    driver.find_element(By.CSS_SELECTOR, f'.status-tab[data-status="{status}"]').click()

    panels = active_panels(driver, ".response-panel")
    assert len(panels) == 1, "exactly one response panel should be visible at a time"
    assert panels[0].get_attribute("data-status") == status
    assert content_type in panels[0].text


def test_200_response_lists_the_actual_response_fields(driver):
    driver.find_element(By.CSS_SELECTOR, '.status-tab[data-status="200"]').click()
    fields_text = driver.find_element(By.CSS_SELECTOR, ".field-list").text
    for field in ["id", "siteId", "employeeName", "status", "startDate", "endDate"]:
        assert field in fields_text


def test_429_response_documents_retry_after(driver):
    driver.find_element(By.CSS_SELECTOR, '.status-tab[data-status="429"]').click()
    panel = active_panels(driver, ".response-panel")[0]
    assert "Retry-After" in panel.text


def test_rate_limit_section_documents_the_actual_limit(driver):
    section_text = driver.find_element(By.CSS_SELECTOR, "#rate-limits").text
    assert "100" in section_text
    assert "429" in section_text


def test_copy_button_copies_the_visible_code_to_the_clipboard(driver):
    origin = f"{urlparse(driver.current_url).scheme}://{urlparse(driver.current_url).netloc}"
    driver.execute_cdp_cmd(
        "Browser.grantPermissions",
        {"permissions": ["clipboardReadWrite", "clipboardSanitizedWrite"], "origin": origin},
    )

    driver.find_element(By.CSS_SELECTOR, '.lang-tab[data-lang="curl"]').click()
    panel = active_panels(driver, ".lang-panel")[0]
    code_text = panel.find_element(By.TAG_NAME, "pre").text
    copy_btn = panel.find_element(By.CSS_SELECTOR, ".copy-btn")

    copy_btn.click()
    WebDriverWait(driver, 2).until(lambda d: copy_btn.text == "Copied")

    clipboard_text = driver.execute_script("return navigator.clipboard.readText();")
    assert clipboard_text.strip() == code_text.strip()
