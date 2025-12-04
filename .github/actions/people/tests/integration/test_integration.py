"""Integration tests for the Axilo People action."""
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from github import Github

from app.main import (
    get_issues_experts,
    get_discussions_experts,
    get_contributors,
    get_individual_sponsors,
    Settings,
)


@pytest.fixture
def sample_issues_data():
    """Sample GitHub issues data for testing."""
    now = datetime.now(timezone.utc)
    return [
        {
            "node": {
                "number": 1,
                "title": "Test Issue 1",
                "createdAt": (now - timedelta(days=5)).isoformat(),
                "state": "OPEN",
                "author": {"login": "issue_author"},
                "comments": {
                    "nodes": [
                        {
                            "createdAt": (now - timedelta(days=4)).isoformat(),
                            "author": {"login": "commenter1"},
                        },
                        {
                            "createdAt": (now - timedelta(days=3)).isoformat(),
                            "author": {"login": "commenter2"},
                        },
                    ]
                },
            }
        },
        {
            "node": {
                "number": 2,
                "title": "Test Issue 2",
                "createdAt": (now - timedelta(days=2)).isoformat(),
                "state": "CLOSED",
                "author": {"login": "issue_author"},
                "comments": {
                    "nodes": [
                        {
                            "createdAt": (now - timedelta(days=1)).isoformat(),
                            "author": {"login": "commenter1"},  # Same commenter as above
                        },
                    ]
                },
            }
        }
    ]


@pytest.fixture
def sample_discussions_data():
    """Sample GitHub discussions data for testing."""
    now = datetime.now(timezone.utc)
    return [
        {
            "node": {
                "number": 1,
                "title": "Test Discussion",
                "createdAt": (now - timedelta(days=3)).isoformat(),
                "author": {"login": "discussion_author"},
                "comments": {
                    "nodes": [
                        {
                            "createdAt": (now - timedelta(days=2)).isoformat(),
                            "author": {"login": "responder1"},
                            "isAnswer": True,
                            "replies": {
                                "nodes": [
                                    {
                                        "createdAt": (now - timedelta(days=1)).isoformat(),
                                        "author": {"login": "replier1"},
                                    }
                                ]
                            },
                        }
                    ]
                },
            }
        }
    ]


@pytest.fixture
def sample_prs_data():
    """Sample GitHub PRs data for testing."""
    now = datetime.now(timezone.utc)
    return [
        {
            "node": {
                "number": 1,
                "title": "Test PR",
                "createdAt": (now - timedelta(days=5)).isoformat(),
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
        }
    ]


@pytest.fixture
def sample_sponsors_data():
    """Sample GitHub sponsors data for testing."""
    return [
        {
            "node": {
                "sponsorEntity": {
                    "login": "sponsor1",
                    "avatarUrl": "https://example.com/avatar1.png",
                    "url": "https://github.com/sponsor1"
                },
                "tier": {
                    "name": "Gold Sponsor",
                    "monthlyPriceInDollars": 100
                }
            }
        }
    ]


def test_integration_workflow(
    mock_settings,
    sample_issues_data,
    sample_discussions_data,
    sample_prs_data,
    sample_sponsors_data,
    tmp_path
):
    """Test the complete workflow with mocked data."""
    # Mock all the GraphQL functions
    with patch("app.main.get_graphql_issue_edges") as mock_issues, \
         patch("app.main.get_graphql_question_discussion_edges") as mock_discussions, \
         patch("app.main.get_graphql_pr_edges") as mock_prs, \
         patch("app.main.get_graphql_sponsor_edges") as mock_sponsors:
        
        # Set up mock return values
        mock_issues.return_value = sample_issues_data
        mock_discussions.return_value = sample_discussions_data
        mock_prs.return_value = sample_prs_data
        mock_sponsors.return_value = sample_sponsors_data
        
        # Create a temporary output directory
        output_dir = tmp_path / "output"
        output_dir.mkdir()
        
        # Run the main functions
        issues_experts = get_issues_experts(mock_settings)
        discussions_experts = get_discussions_experts(mock_settings)
        contributors = get_contributors(mock_settings)
        sponsors = get_individual_sponsors(mock_settings)
        
        # Verify the results
        assert len(issues_experts) == 2  # commenter1 and commenter2
        assert len(discussions_experts) == 2  # responder1 and replier1
        assert len(contributors) == 1  # contributor1
        assert len(sponsors) == 1  # sponsor1
        
        # Verify commenter1 appears in issues_experts with count=2 (commented on both issues)
        commenter1 = next((e for e in issues_experts if e["login"] == "commenter1"), None)
        assert commenter1 is not None
        assert commenter1["count"] == 2
        
        # Verify the sponsor data
        assert sponsors[0]["login"] == "sponsor1"
        assert sponsors[0]["tier"] == "Gold Sponsor"
        
        # Verify the contributor data
        assert contributors[0]["login"] == "contributor1"
        assert contributors[0]["prs_count"] == 1


def test_output_generation(tmp_path):
    """Test the generation of output files."""
    from app.main import main
    
    # Mock the data collection functions
    with patch("app.main.get_issues_experts") as mock_issues, \
         patch("app.main.get_discussions_experts") as mock_discussions, \
         patch("app.main.get_contributors") as mock_contributors, \
         patch("app.main.get_individual_sponsors") as mock_sponsors:
        
        # Set up mock return values
        mock_issues.return_value = [{"login": "user1", "count": 5}]
        mock_discussions.return_value = [{"login": "user2", "count": 3}]
        mock_contributors.return_value = [{"login": "user3", "prs_count": 2}]
        mock_sponsors.return_value = [{"login": "sponsor1", "tier": "Gold"}]
        
        # Set up output file
        output_file = tmp_path / "people.json"
        
        # Run the main function
        with patch("sys.argv", ["main.py", "--output", str(output_file)]):
            main()
        
        # Verify the output file was created and contains the expected data
        assert output_file.exists()
        with open(output_file) as f:
            data = json.load(f)
            
        assert "issues_experts" in data
        assert "discussions_experts" in data
        assert "contributors" in data
        assert "sponsors" in data
        
        assert data["issues_experts"][0]["login"] == "user1"
        assert data["discussions_experts"][0]["login"] == "user2"
        assert data["contributors"][0]["login"] == "user3"
        assert data["sponsors"][0]["login"] == "sponsor1"
