# Axilo CLI

A powerful command-line interface for interacting with AI models, built with TypeScript and React (via Ink.js).

## Features

- Interactive terminal UI
- AI-powered command generation
- Real-time command execution
- Command history and approval workflows
- Extensible architecture

## Prerequisites

- Node.js 22+ (LTS recommended)
- npm 10+
- Git

## 🚀 Development Workflow

### Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) for Git hooks:

- **pre-commit**: Runs Prettier on staged files
- **commit-msg**: Validates commit message format
- **pre-push**: Runs tests before pushing

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

#### Example Commit Messages:

```
feat(cli): add new command for code generation
fix(core): resolve memory leak in request handler
docs: update README with new installation steps
```

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/axilo-cli.git
cd axilo-cli

# Install dependencies
npm ci

# Build the project
npm run build

# Link the CLI globally
npm link
```

## Development

```bash
# Install dependencies
npm ci

# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Environment Variables

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key
```

## Docker

### Using GitHub Container Registry

After a release is created, the Docker image is automatically published to GitHub Container Registry (GHCR).

#### Pull the Latest Version

```bash
# Authenticate with GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull the image
docker pull ghcr.io/your-org/axilo-cli:latest
```

#### Run the Container

```bash
# Basic usage
docker run -it --rm ghcr.io/your-org/axilo-cli:latest

# With environment variables
docker run -it --rm \
  -e OPENAI_API_KEY=your_api_key \
  ghcr.io/your-org/axilo-cli:latest
```

#### Available Tags

- `latest` - Most recent stable release
- `vX.Y.Z` - Specific version (e.g., v1.0.0)
- `sha-<commit_sha>` - Build from specific commit

#### Run as a CLI Tool

Create an alias to use it as a regular CLI command:

```bash
alias axilo='docker run -it --rm -v $(pwd):/app -w /app ghcr.io/your-org/axilo-cli:latest'
```

Then use it like:

```bash
axilo --help
```

#### GitHub Packages Page

View all available versions and manage the package at:
`https://github.com/your-org/axilo-cli/pkgs/container/axilo-cli`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

Apache-2.0

## Security

For security issues, please see [SECURITY.md](SECURITY.md).
