"""Tests for the main functionality of the Axilo People action."""
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

import httpx
import pytest
from github import Github

from app.main import (
    get_issues_experts,
    get_discussions_experts,
    get_contributors,
    get_individual_sponsors,
    get_top_users,
    Settings,
    Author,
)


@pytest.fixture
def mock_settings():
    """Create a mock settings object for testing."""
    return Settings(
        input_token="test-token",
        github_repository="khulnasoft/axilo"
    )


def test_get_top_users():
    """Test the get_top_users function."""
    from collections import Counter
    counter = Counter({"user1": 5, "user2": 10, "user3": 3, "user4": 1})
    authors = {
        "user1": Author(login="user1", avatarUrl="url1", url="https://github.com/user1"),
        "user2": Author(login="user2", avatarUrl="url2", url="https://github.com/user2"),
        "user3": Author(login="user3", avatarUrl="url3", url="https://github.com/user3"),
    }
    skip_users = {"user1"}
    
    # Test getting top 2 users, skipping user1
    result = get_top_users(
        counter=counter,
        min_count=0,
        authors=authors,
        skip_users=skip_users,
    )
    
    # Should return user2 and user3 (user1 is skipped, user4 is below min_count)
    assert len(result) == 2
    assert result[0]["login"] == "user2"
    assert result[0]["count"] == 10
    assert result[1]["login"] == "user3"
    assert result[1]["count"] == 3


@patch("app.main.get_graphql_issue_edges")
def test_get_issues_experts(mock_get_issues, mock_settings):
    """Test the get_issues_experts function."""
    # Mock the GraphQL response
    now = datetime.now(timezone.utc)
    mock_issue = {
        "number": 123,
        "title": "Test Issue",
        "createdAt": now.isoformat(),
        "state": "OPEN",
        "author": {"login": "author1"},
        "comments": {
            "nodes": [
                {
                    "createdAt": (now - timedelta(days=1)).isoformat(),
                    "author": {"login": "commenter1"},
                },
                {
                    "createdAt": now.isoformat(),
                    "author": {"login": "commenter2"},
                },
            ]
        },
    }
    
    mock_response = MagicMock()
    mock_response.data.repository.issues.edges = [
        MagicMock(node=mock_issue)
    ]
    mock_get_issues.return_value = [mock_response]
    
    # Call the function
    result = get_issues_experts(mock_settings)
    
    # Verify the result
    assert len(result) == 2  # commenter1 and commenter2
    assert "author1" not in [user["login"] for user in result]  # author should be skipped
    assert result[0]["count"] == 1


@patch("app.main.get_graphql_question_discussion_edges")
def test_get_discussions_experts(mock_get_discussions, mock_settings):
    """Test the get_discussions_experts function."""
    # Mock the GraphQL response
    now = datetime.now(timezone.utc)
    mock_discussion = {
        "number": 456,
        "title": "Test Discussion",
        "createdAt": now.isoformat(),
        "author": {"login": "discussion_author"},
        "comments": {
            "nodes": [
                {
                    "createdAt": (now - timedelta(days=2)).isoformat(),
                    "author": {"login": "responder1"},
                    "isAnswer": True,
                    "replies": {"nodes": []},
                },
                {
                    "createdAt": now.isoformat(),
                    "author": {"login": "responder2"},
                    "isAnswer": False,
                    "replies": {
                        "nodes": [
                            {
                                "createdAt": now.isoformat(),
                                "author": {"login": "replier1"},
                            }
                        ]
                    },
                },
            ]
        },
    }
    
    mock_response = MagicMock()
    mock_response.data.repository.discussions.edges = [
        MagicMock(node=mock_discussion)
    ]
    mock_get_discussions.return_value = [mock_response]
    
    # Call the function
    result = get_discussions_experts(mock_settings)
    
    # Verify the result
    assert len(result) == 2  # responder1 and replier1
    assert "discussion_author" not in [user["login"] for user in result]  # author should be skipped
    assert result[0]["count"] == 1


@patch("app.main.get_graphql_pr_edges")
def test_get_contributors(mock_get_prs, mock_settings):
    """Test the get_contributors function."""
    # Mock the GraphQL response
    now = datetime.now(timezone.utc)
    mock_pr = {
        "number": 789,
        "title": "Test PR",
        "createdAt": now.isoformat(),
        "state": "MERGED",
        "author": {"login": "contributor1"},
        "labels": {"nodes": [{"name": "enhancement"}]},
        "comments": {"nodes": []},
        "reviews": {
            "nodes": [
                {
                    "author": {"login": "reviewer1"},
                    "state": "APPROVED"
                }
            ]
        },
    }
    
    mock_response = MagicMock()
    mock_response.data.repository.pullRequests.edges = [
        MagicMock(node=mock_pr)
    ]
    mock_get_prs.return_value = [mock_response]
    
    # Call the function
    result = get_contributors(mock_settings)
    
    # Verify the result
    assert len(result) == 1
    assert result[0]["login"] == "contributor1"
    assert result[0]["prs_count"] == 1
    assert result[0]["first_contribution"] is not None
