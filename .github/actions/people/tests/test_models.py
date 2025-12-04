"""Tests for Pydantic models in the Axilo People action."""
from datetime import datetime, timezone

import pytest

from app.main import (
    Author,
    CommentsNode,
    IssuesNode,
    DiscussionsNode,
    PullRequestNode,
    Settings,
)


def test_author_model():
    """Test the Author model."""
    author_data = {
        "login": "testuser",
        "avatarUrl": "https://example.com/avatar.png",
        "url": "https://github.com/testuser",
    }
    author = Author(**author_data)
    assert author.login == "testuser"
    assert "avatar.png" in author.avatarUrl
    assert author.url == "https://github.com/testuser"


def test_comments_node():
    """Test the CommentsNode model."""
    now = datetime.now(timezone.utc)
    comment_data = {
        "createdAt": now.isoformat(),
        "author": {
            "login": "commenter",
            "avatarUrl": "https://example.com/avatar.png",
            "url": "https://github.com/commenter",
        },
    }
    comment = CommentsNode(**comment_data)
    assert comment.createdAt == now
    assert comment.author is not None
    assert comment.author.login == "commenter"


def test_issues_node():
    """Test the IssuesNode model."""
    now = datetime.now(timezone.utc)
    issue_data = {
        "number": 123,
        "title": "Test Issue",
        "createdAt": now.isoformat(),
        "state": "OPEN",
        "author": {
            "login": "issueauthor",
            "avatarUrl": "https://example.com/avatar.png",
            "url": "https://github.com/issueauthor",
        },
        "comments": {
            "nodes": [
                {
                    "createdAt": now.isoformat(),
                    "author": {
                        "login": "commenter1",
                        "avatarUrl": "https://example.com/avatar1.png",
                        "url": "https://github.com/commenter1",
                    },
                }
            ]
        },
    }
    issue = IssuesNode(**issue_data)
    assert issue.number == 123
    assert issue.title == "Test Issue"
    assert issue.state == "OPEN"
    assert issue.author.login == "issueauthor"
    assert len(issue.comments.nodes) == 1
    assert issue.comments.nodes[0].author.login == "commenter1"


def test_settings_model():
    """Test the Settings model."""
    settings = Settings(
        input_token="test-token",
        github_repository="khulnasoft/axilo"
    )
    assert settings.input_token.get_secret_value() == "test-token"
    assert settings.github_repository == "khulnasoft/axilo"
    assert settings.httpx_timeout == 30  # Default value


def test_pull_request_node():
    """Test the PullRequestNode model."""
    now = datetime.now(timezone.utc)
    pr_data = {
        "number": 456,
        "title": "Test PR",
        "createdAt": now.isoformat(),
        "state": "MERGED",
        "author": {
            "login": "prauthor",
            "avatarUrl": "https://example.com/avatar.png",
            "url": "https://github.com/prauthor",
        },
        "labels": {
            "nodes": [
                {"name": "enhancement"},
                {"name": "bug"}
            ]
        },
        "comments": {"nodes": []},
        "reviews": {
            "nodes": [
                {
                    "author": {
                        "login": "reviewer1",
                        "avatarUrl": "https://example.com/avatar1.png",
                        "url": "https://github.com/reviewer1",
                    },
                    "state": "APPROVED"
                }
            ]
        }
    }
    pr = PullRequestNode(**pr_data)
    assert pr.number == 456
    assert pr.state == "MERGED"
    assert len(pr.labels.nodes) == 2
    assert pr.labels.nodes[0].name == "enhancement"
    assert pr.reviews.nodes[0].state == "APPROVED"
    assert pr.reviews.nodes[0].author.login == "reviewer1"
