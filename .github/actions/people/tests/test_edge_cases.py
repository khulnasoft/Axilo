"""Tests for edge cases and error handling in the Axilo People action."""
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.main import (
    get_graphql_response,
    get_issues_experts,
    get_discussions_experts,
    get_contributors,
    Settings,
    Author,
)


@pytest.mark.asyncio
async def test_get_graphql_response_rate_limit(httpx_mock):
    """Test handling of rate limiting from GitHub API."""
    # Mock rate limit response
    rate_limit_response = {
        "message": "API rate limit exceeded",
        "documentation_url": "https://docs.github.com/rate-limit"
    }
    
    # First request fails with rate limit
    httpx_mock.add_response(
        status_code=403,
        json=rate_limit_response,
        headers={"Retry-After": "60"}
    )
    
    # Second request succeeds
    success_response = {"data": {"test": "success"}, "errors": None}
    httpx_mock.add_response(status_code=200, json=success_response)
    
    settings = Settings(
        input_token="test-token",
        github_repository="khulnasoft/axilo"
    )
    
    # The function should retry after rate limit
    with patch("time.sleep", return_value=None):  # Don't actually sleep in tests
        result = await get_graphql_response(
            settings=settings,
            query="query { test }"
        )
    
    assert result == success_response
    assert len(httpx_mock.get_requests()) == 2


def test_get_issues_experts_empty_response(mock_settings):
    """Test handling of empty or None responses from GitHub API."""
    with patch("app.main.get_graphql_issue_edges", return_value=[]):
        result = get_issues_experts(mock_settings)
        assert result == []
    
    with patch("app.main.get_graphql_issue_edges", return_value=None):
        result = get_issues_experts(mock_settings)
        assert result == []


def test_get_discussions_experts_missing_fields(mock_settings):
    """Test handling of discussions with missing or malformed data."""
    # Mock a discussion with missing author
    mock_discussion = {
        "number": 1,
        "title": "Test Discussion",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "comments": {
            "nodes": [
                {
                    "createdAt": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
                    "isAnswer": True,
                    "replies": {"nodes": []},
                }
            ]
        },
    }
    
    with patch("app.main.get_graphql_question_discussion_edges") as mock_get_discussions:
        mock_get_discussions.return_value = [MagicMock(node=mock_discussion)]
        result = get_discussions_experts(mock_settings)
        
        # Should handle missing author gracefully
        assert result == []


def test_get_contributors_pagination(mock_settings):
    """Test handling of paginated responses for contributors."""
    # Mock first page with hasNextPage = true
    mock_pr1 = {
        "node": {
            "number": 1,
            "title": "PR 1",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "state": "MERGED",
            "author": {"login": "user1"},
            "labels": {"nodes": []},
            "comments": {"nodes": []},
            "reviews": {"nodes": []},
        },
        "cursor": "cursor1"
    }
    
    # Mock second page with hasNextPage = false
    mock_pr2 = {
        "node": {
            "number": 2,
            "title": "PR 2",
            "createdAt": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "state": "MERGED",
            "author": {"login": "user2"},
            "labels": {"nodes": []},
            "comments": {"nodes": []},
            "reviews": {"nodes": []},
        },
        "cursor": "cursor2"
    }
    
    with patch("app.main.get_graphql_pr_edges") as mock_get_prs:
        # First call returns first page with hasNextPage = true
        mock_get_prs.side_effect = [
            [mock_pr1],
            [mock_pr2]
        ]
        
        result = get_contributors(mock_settings)
        
        # Should return contributors from both pages
        assert len(result) == 2
        assert {c["login"] for c in result} == {"user1", "user2"}
        assert mock_get_prs.call_count == 2


def test_get_top_users_empty_input():
    """Test get_top_users with empty input."""
    from collections import Counter
    from app.main import get_top_users
    
    # Test with empty counter
    result = get_top_users(
        counter=Counter(),
        min_count=0,
        authors={},
        skip_users=set()
    )
    assert result == []
    
    # Test with non-empty counter but no matching authors
    result = get_top_users(
        counter=Counter({"user1": 5}),
        min_count=0,
        authors={},
        skip_users=set()
    )
    assert result == []


def test_github_api_errors(mock_settings):
    """Test handling of GitHub API errors."""
    # Mock a failed API response
    with patch("app.main.get_graphql_response") as mock_graphql:
        mock_graphql.side_effect = httpx.HTTPStatusError(
            "API Error",
            request=MagicMock(),
            response=MagicMock(status_code=500)
        )
        
        with pytest.raises(httpx.HTTPStatusError):
            get_issues_experts(mock_settings)
    
    # Test network errors
    with patch("app.main.get_graphql_response") as mock_graphql:
        mock_graphql.side_effect = httpx.RequestError("Network error")
        
        with pytest.raises(httpx.RequestError):
            get_discussions_experts(mock_settings)
