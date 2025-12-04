"""Tests for GraphQL functionality in the Axilo People action."""
from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.main import (
    get_graphql_response,
    get_graphql_issue_edges,
    get_graphql_question_discussion_edges,
    get_graphql_pr_edges,
    get_graphql_sponsor_edges,
    Settings,
)


@pytest.fixture
def mock_settings():
    """Create a mock settings object for testing."""
    return Settings(
        input_token="test-token",
        github_repository="khulnasoft/axilo"
    )


@patch("app.main.httpx.post")
async def test_get_graphql_response_success(mock_post, mock_settings):
    """Test successful GraphQL response."""
    # Mock the HTTP response
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "data": {"test": "success"},
        "errors": None
    }
    mock_response.raise_for_status.return_value = None
    mock_post.return_value.__aenter__.return_value = mock_response
    
    # Call the function
    query = "query { test }"
    result = get_graphql_response(
        settings=mock_settings,
        query=query
    )
    
    # Verify the result
    assert result == {"data": {"test": "success"}, "errors": None}
    mock_post.assert_called_once()
    
    # Verify the request headers
    headers = mock_post.call_args[1]["headers"]
    assert headers["Authorization"] == "bearer test-token"
    assert "graphql" in headers["Content-Type"]


@patch("app.main.httpx.post")
async def test_get_graphql_response_error(mock_post, mock_settings):
    """Test GraphQL response with errors."""
    # Mock the HTTP response with an error
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "data": None,
        "errors": [{"message": "Test error"}]
    }
    mock_post.return_value.__aenter__.return_value = mock_response
    
    # Call the function and expect an exception
    with pytest.raises(Exception) as exc_info:
        get_graphql_response(
            settings=mock_settings,
            query="query { test }"
        )
    
    assert "Test error" in str(exc_info.value)


@patch("app.main.get_graphql_response")
async def test_get_graphql_issue_edges(mock_graphql, mock_settings):
    """Test getting issue edges from GraphQL."""
    # Mock the GraphQL response
    mock_graphql.return_value = {
        "data": {
            "repository": {
                "issues": {
                    "edges": ["edge1", "edge2"]
                }
            }
        }
    }
    
    # Call the function
    result = get_graphql_issue_edges(settings=mock_settings)
    
    # Verify the result
    assert result == ["edge1", "edge2"]
    mock_graphql.assert_called_once()


@patch("app.main.get_graphql_response")
async def test_get_graphql_question_discussion_edges(mock_graphql, mock_settings):
    """Test getting question discussion edges from GraphQL."""
    # Mock the GraphQL response
    mock_graphql.return_value = {
        "data": {
            "repository": {
                "discussions": {
                    "edges": ["edge1", "edge2"]
                }
            }
        }
    }
    
    # Call the function
    result = get_graphql_question_discussion_edges(settings=mock_settings)
    
    # Verify the result
    assert result == ["edge1", "edge2"]
    mock_graphql.assert_called_once()
    
    # Verify the category ID was passed correctly
    _, kwargs = mock_graphql.call_args
    assert "category_id" in kwargs
    assert kwargs["category_id"] is not None


@patch("app.main.get_graphql_response")
async def test_get_graphql_pr_edges(mock_graphql, mock_settings):
    """Test getting PR edges from GraphQL."""
    # Mock the GraphQL response
    mock_graphql.return_value = {
        "data": {
            "repository": {
                "pullRequests": {
                    "edges": ["pr1", "pr2"]
                }
            }
        }
    }
    
    # Call the function
    result = get_graphql_pr_edges(settings=mock_settings)
    
    # Verify the result
    assert result == ["pr1", "pr2"]
    mock_graphql.assert_called_once()


@patch("app.main.get_graphql_response")
async def test_get_graphql_sponsor_edges(mock_graphql, mock_settings):
    """Test getting sponsor edges from GraphQL."""
    # Mock the GraphQL response
    mock_graphql.return_value = {
        "data": {
            "user": {
                "sponsorshipsAsMaintainer": {
                    "edges": ["sponsor1", "sponsor2"]
                }
            }
        }
    }
    
    # Call the function
    result = get_graphql_sponsor_edges(settings=mock_settings)
    
    # Verify the result
    assert result == ["sponsor1", "sponsor2"]
    mock_graphql.assert_called_once()
