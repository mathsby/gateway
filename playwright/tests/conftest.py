"""Shared pytest fixtures for the Python Playwright suites.

One session-scoped browser for the whole run. Each test module used to define
its own `browser` fixture, which meant a second sync_playwright() was started
while the first was still open whenever both modules ran in the same pytest
process - Playwright rejects that ("Sync API inside the asyncio loop").

Runs headless by default. Set HEADLESS=false to watch it drive a real,
visible Chrome window instead (useful for demos/debugging).
"""

import os

import pytest
from playwright.sync_api import sync_playwright

HEADLESS = os.environ.get("HEADLESS", "true").lower() not in ("false", "0", "no")


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        br = p.chromium.launch(headless=HEADLESS, args=["--window-size=1400,1600"])
        yield br
        br.close()
