# Axilo People Action

This GitHub Action generates data for the Axilo People page by analyzing repository activity, including issues, pull requests, and discussions.

## Features

- Tracks contributions from repository members
- Identifies experts based on issue and discussion participation
- Generates statistics about community engagement
- Supports both scheduled and manual execution
- Includes dry-run mode for testing

## Inputs

| Name      | Required | Description                               | Default |
| --------- | -------- | ----------------------------------------- | ------- |
| `token`   | Yes      | GitHub token with appropriate permissions | -       |
| `dry_run` | No       | Run in dry-run mode (no changes made)     | `false` |

## Secrets

- `AXILO_PEOPLE`: GitHub token with `repo` scope
- `CODECOV_TOKEN`: (Optional) Token for code coverage reporting
- `SLACK_WEBHOOK`: (Optional) Webhook URL for failure notifications

## Usage

### Basic Usage

```yaml
- uses: ./.github/actions/people
  with:
    token: ${{ secrets.AXILO_PEOPLE }}
```

### Manual Trigger with Debugging

```yaml
on:
  workflow_dispatch:
    inputs:
      debug_enabled:
        description: "Enable tmate debugging"
        required: false
        default: "false"
      dry_run:
        description: "Run in dry-run mode"
        required: false
        default: "false"
```

## Development

### Prerequisites

- Python 3.11+
- Docker
- pip

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Testing

Run the test suite:

```bash
pytest tests/ -v --cov=app --cov-report=term-missing
```

### Linting

```bash
flake8 app/ --count --select=E9,F63,F7,F82 --show-source --statistics
flake8 app/ --count --max-complexity=10 --max-line-length=127 --statistics
```

## License

This project is licensed under the terms of the MIT license.
