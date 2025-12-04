"""Pytest configuration and fixtures for Axilo People tests."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Generator, Optional
from unittest.mock import MagicMock

import pytest
from _pytest.monkeypatch import MonkeyPatch

# Add the app directory to the Python path
TEST_DIR = Path(__file__).parent
PROJECT_ROOT = TEST_DIR.parent
APP_DIR = PROJECT_ROOT / "app"

@pytest.fixture(scope="session", autouse=True)
def add_app_to_path() -> None:
    """Add the app directory to the Python path."""
    import sys
    if str(APP_DIR) not in sys.path:
        sys.path.insert(0, str(APP_DIR))

@pytest.fixture
def mock_env(monkeypatch: MonkeyPatch) -> None:
    """Set up environment variables for testing."""
    monkeypatch.setenv("GITHUB_REPOSITORY", "khulnasoft/axilo")
    monkeypatch.setenv("GITHUB_REF", "refs/heads/main")
    monkeypatch.setenv("GITHUB_SHA", "a" * 40)

@pytest.fixture
def mock_github_token(monkeypatch: MonkeyPatch) -> None:
    """Mock GitHub token for testing."""
    monkeypatch.setenv("INPUT_TOKEN", "test-token")

@pytest.fixture
def test_data_dir() -> Path:
    """Return the path to the test data directory."""
    return TEST_DIR / "data"

@pytest.fixture
def mock_github_api(httpx_mock) -> None:
    """Mock GitHub API responses."""
    # Mock rate limit response
    httpx_mock.add_response(
        url="https://api.github.com/rate_limit",
        json={"resources": {"core": {"limit": 5000, "remaining": 5000, "reset": 0}}},
    )
    
    # Mock repository response
    httpx_mock.add_response(
        url="https://api.github.com/repos/khulnasoft/axilo",
        json={
            "id": 12345678,
            "name": "axilo",
            "full_name": "khulnasoft/axilo",
            "private": False,
            "owner": {
                "login": "khulnasoft",
                "id": 12345,
                "type": "Organization",
            },
        },
    )

@pytest.fixture(autouse=True)
def no_http_requests(monkeypatch: MonkeyPatch) -> None:
    """Prevent any HTTP requests from being made during tests."""
    def urlopen_mock(self, *args, **kwargs):
        raise RuntimeError(f"Unexpected HTTP request to {self.full_url}")

    monkeypatch.setattr("urllib3.connectionpool.HTTPConnectionPool.urlopen", urlopen_mock)
